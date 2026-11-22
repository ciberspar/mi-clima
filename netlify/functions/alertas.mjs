import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { evaluarClima } from "./clima-g-core.mjs";

// Netlify revisa cada 30 minutos los últimos datos publicados por Clima G.
// No consulta Open-Meteo ni ningún proveedor meteorológico desde el servidor.
export const config = { schedule: "*/30 * * * *" };

const subscriptionsStore = getStore("clima-g-suscripciones");
const weatherStore = getStore("clima-g-datos-meteorologicos");
const EDAD_MAXIMA_DATOS_MS = 45 * 60 * 1000;
const CONCURRENCIA = 8;

function claveUbicacion(ubicacion) {
  return `${Number(ubicacion.latitude).toFixed(4)},${Number(ubicacion.longitude).toFixed(4)}`;
}

function obtenerUbicaciones(dispositivo) {
  if (Array.isArray(dispositivo.locations) && dispositivo.locations.length) {
    return dispositivo.locations;
  }
  // Compatibilidad temporal con dispositivos registrados por la versión anterior.
  if (Number.isFinite(dispositivo.latitude) && Number.isFinite(dispositivo.longitude)) {
    return [{
      name: "Ubicación actual",
      latitude: dispositivo.latitude,
      longitude: dispositivo.longitude,
      type: "current"
    }];
  }
  return [];
}

async function ejecutarConLimite(items, limite, tarea) {
  let indice = 0;
  const trabajadores = Array.from(
    { length: Math.min(limite, items.length) },
    async () => {
      while (indice < items.length) {
        const actual = indice++;
        await tarea(items[actual], actual);
      }
    }
  );
  await Promise.all(trabajadores);
}

async function procesarUbicacion(item, dispositivo, ubicacion, contadores) {
  const key = claveUbicacion(ubicacion);
  const registro = await weatherStore.get(`locations/${key}`, { type: "json" });

  if (!registro || registro.source !== "Clima G" || !registro.weather) {
    contadores.datosAusentes++;
    return null;
  }

  const recibido = Date.parse(registro.receivedAt || "");
  const edad = Date.now() - recibido;
  if (!Number.isFinite(recibido) || edad < -5 * 60 * 1000 || edad > EDAD_MAXIMA_DATOS_MS) {
    contadores.datosVencidos++;
    return null;
  }

  const evaluacion = evaluarClima(registro.weather);
  const alertas = evaluacion.alerts || [];
  const estado = dispositivo.alertState && typeof dispositivo.alertState === "object"
    ? dispositivo.alertState
    : {};
  const idsAnteriores = Array.isArray(estado[key]) ? estado[key] : [];
  contadores.ubicacionesConDatos++;
  contadores.alertasEvaluadas += evaluacion.alertCount;
  const idsActuales = alertas.map(alerta => alerta.id).sort();

  if (alertas.length === 0) {
    if (idsAnteriores.length) {
      estado[key] = [];
      dispositivo.alertState = estado;
      dispositivo.updatedAt = new Date().toISOString();
      await subscriptionsStore.setJSON(item.key, dispositivo);
    }
    return evaluacion.alertCount;
  }

  const anteriores = new Set(idsAnteriores);
  const nuevas = alertas.filter(alerta => !anteriores.has(alerta.id));
  if (!nuevas.length) return evaluacion.alertCount;

  const principal = nuevas[0];
  const nombre = String(ubicacion.name || registro.name || "tu ubicación").slice(0, 100);
  const mensaje = nuevas.slice(0, 3).map(alerta => alerta.message).join(" ");
  const adicionales = nuevas.length - Math.min(nuevas.length, 3);
  const payload = {
    title: `${principal.emoji} ${principal.title} · ${nombre}`,
    body: adicionales > 0
      ? `${mensaje} Y ${adicionales} alertas adicionales.`
      : mensaje,
    url: "./",
    tag: `clima-g-${key}-${idsActuales.join("-")}`.slice(0, 120),
    source: "Clima G",
    location: nombre,
    severity: principal.severity,
    alerts: nuevas.map(alerta => ({
      id: alerta.id,
      type: alerta.type,
      severity: alerta.severity,
      title: alerta.title,
      message: alerta.message,
      emoji: alerta.emoji
    }))
  };

  try {
    await webpush.sendNotification(
      dispositivo.subscription,
      JSON.stringify(payload),
      { TTL: 3600 }
    );
    estado[key] = idsActuales;
    dispositivo.alertState = estado;
    dispositivo.updatedAt = new Date().toISOString();
    await subscriptionsStore.setJSON(item.key, dispositivo);
    contadores.notificacionesEnviadas++;
    return evaluacion.alertCount;
  } catch (error) {
    const status = Number(error?.statusCode);
    if (status === 404 || status === 410) {
      await subscriptionsStore.delete(item.key);
      contadores.suscripcionesEliminadas++;
      throw Object.assign(new Error("Suscripción Push vencida."), { subscriptionRemoved: true });
    }
    contadores.errores++;
    console.error(`Error enviando Push a ${item.key}:`, status || "sin código", error?.message || error);
  }
}

export default async function handler() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return new Response(JSON.stringify({ success: false, error: "Configuración VAPID incompleta." }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const contadores = {
    dispositivosRevisados: 0,
    ubicacionesRevisadas: 0,
    ubicacionesConDatos: 0,
    alertasEvaluadas: 0,
    notificacionesEnviadas: 0,
    datosAusentes: 0,
    datosVencidos: 0,
    suscripcionesEliminadas: 0,
    errores: 0
  };

  try {
    const listado = await subscriptionsStore.list({ prefix: "devices/" });
    await ejecutarConLimite(listado.blobs, CONCURRENCIA, async item => {
      try {
        const dispositivo = await subscriptionsStore.get(item.key, { type: "json" });
        if (!dispositivo?.subscription) {
          contadores.errores++;
          return;
        }
        const ubicaciones = obtenerUbicaciones(dispositivo);
        if (!ubicaciones.length) {
          contadores.errores++;
          return;
        }
        contadores.dispositivosRevisados++;

        for (const ubicacion of ubicaciones) {
          if (!Number.isFinite(Number(ubicacion.latitude)) || !Number.isFinite(Number(ubicacion.longitude))) {
            contadores.errores++;
            continue;
          }
          contadores.ubicacionesRevisadas++;
          try {
            await procesarUbicacion(item, dispositivo, ubicacion, contadores);
          } catch (error) {
            if (error?.subscriptionRemoved) break;
            contadores.errores++;
            console.error("Error procesando ubicación:", keyLocationSafe(ubicacion), error?.message || error);
          }
        }
      } catch (error) {
        contadores.errores++;
        console.error("Error procesando dispositivo:", item.key, error?.message || error);
      }
    });

    console.log("Resumen de alertas Clima G:", contadores);
    return new Response(JSON.stringify({ success: true, source: "Clima G", version: "2.1.0", ...contadores }), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    console.error("Error general en alertas Clima G:", error);
    return new Response(JSON.stringify({ success: false, error: "No se pudo completar la revisión de alertas.", ...contadores }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
}

function keyLocationSafe(ubicacion) {
  try { return claveUbicacion(ubicacion); } catch { return "ubicación desconocida"; }
}
