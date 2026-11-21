import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { evaluarClima } from "./clima-g-core.mjs";

// Netlify revisa los datos que Clima G publicó cada 30 minutos.
// Esta función NO consulta Open-Meteo ni ningún proveedor meteorológico.
export const config = {
  schedule: "*/30 * * * *"
};

const subscriptionsStore = getStore("clima-g-suscripciones");
const weatherStore = getStore("clima-g-datos-meteorologicos");

const EDAD_MAXIMA_DATOS_MS = 45 * 60 * 1000;
const CONCURRENCIA = 8;

function claveUbicacion(dispositivo) {
  return `${Number(dispositivo.latitude).toFixed(4)},${Number(dispositivo.longitude).toFixed(4)}`;
}

function obtenerIds(alertas) {
  return alertas.map(alerta => alerta.id).sort();
}

function obtenerAlertasNuevas(alertas, idsAnteriores) {
  const anteriores = new Set(idsAnteriores);
  return alertas.filter(alerta => !anteriores.has(alerta.id));
}

function crearMensaje(alertas) {
  const principales = alertas.slice(0, 3);
  const texto = principales.map(alerta => alerta.message).join(" ");
  const adicionales = alertas.length - principales.length;
  return adicionales > 0 ? `${texto} Y ${adicionales} alertas adicionales.` : texto;
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

  return Promise.all(trabajadores);
}

async function procesarDispositivo(item, dispositivo, registroClima, contadores) {
  const evaluacion = evaluarClima(registroClima.weather);
  const alertas = evaluacion.alerts || [];
  const idsActuales = obtenerIds(alertas);

  if (alertas.length === 0) {
    if (
      dispositivo.lastAlertSignature != null ||
      (Array.isArray(dispositivo.lastAlertIds) && dispositivo.lastAlertIds.length > 0)
    ) {
      dispositivo.lastAlertSignature = null;
      dispositivo.lastAlertIds = [];
      dispositivo.updatedAt = new Date().toISOString();
      await subscriptionsStore.setJSON(item.key, dispositivo);
    }
    return;
  }

  const idsAnteriores = Array.isArray(dispositivo.lastAlertIds)
    ? dispositivo.lastAlertIds
    : dispositivo.lastAlertSignature
      ? [dispositivo.lastAlertSignature]
      : [];

  const alertasNuevas = obtenerAlertasNuevas(alertas, idsAnteriores);

  if (alertasNuevas.length === 0) return;

  const principal = alertasNuevas[0];

  const payload = {
    title: `${principal.emoji} ${principal.title} - Clima G`,
    body: crearMensaje(alertasNuevas),
    url: "/",
    source: "Clima G",
    version: evaluacion.version,
    severity: principal.severity,
    color: principal.color,
    alerts: alertasNuevas.map(alerta => ({
      id: alerta.id,
      type: alerta.type,
      severity: alerta.severity,
      title: alerta.title,
      message: alerta.message,
      emoji: alerta.emoji,
      color: alerta.color
    }))
  };

  try {
    await webpush.sendNotification(
      dispositivo.subscription,
      JSON.stringify(payload),
      { TTL: 3600 }
    );

    dispositivo.lastAlertSignature = idsActuales.join("|");
    dispositivo.lastAlertIds = idsActuales;
    dispositivo.updatedAt = new Date().toISOString();

    await subscriptionsStore.setJSON(item.key, dispositivo);
    contadores.enviados++;
  } catch (error) {
    const status = Number(error?.statusCode);

    if (status === 404 || status === 410) {
      await subscriptionsStore.delete(item.key);
      contadores.suscripcionesEliminadas++;
      return;
    }

    contadores.errores++;
    console.error(
      `Error enviando Push a ${item.key}:`,
      status || "sin código",
      error?.message || error
    );
  }
}

export default async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return new Response(JSON.stringify({
      success: false,
      error: "Configuración VAPID incompleta."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const contadores = {
    dispositivosRevisados: 0,
    ubicacionesConDatosClimaG: 0,
    alertasEvaluadas: 0,
    enviados: 0,
    datosAusentesOVencidos: 0,
    suscripcionesEliminadas: 0,
    errores: 0
  };

  try {
    const listado = await subscriptionsStore.list({ prefix: "devices/" });

    await ejecutarConLimite(listado.blobs, CONCURRENCIA, async item => {
      try {
        const dispositivo = await subscriptionsStore.get(item.key, { type: "json" });

        if (
          !dispositivo?.subscription ||
          !Number.isFinite(dispositivo.latitude) ||
          !Number.isFinite(dispositivo.longitude) ||
          dispositivo.latitude < -90 || dispositivo.latitude > 90 ||
          dispositivo.longitude < -180 || dispositivo.longitude > 180
        ) {
          contadores.errores++;
          return;
        }

        const weatherKey = `locations/${claveUbicacion(dispositivo)}`;
        const registro = await weatherStore.get(weatherKey, { type: "json" });

        if (!registro || registro.source !== "Clima G" || !registro.weather) {
          contadores.datosAusentesOVencidos++;
          return;
        }

        const recibido = Date.parse(registro.receivedAt || "");
        const edad = Date.now() - recibido;

        // Si Clima G no publicó datos recientes, no se inventa una alerta
        // ni se usa una lectura antigua como si fuera actual.
        if (
          !Number.isFinite(recibido) ||
          edad < -5 * 60 * 1000 ||
          edad > EDAD_MAXIMA_DATOS_MS
        ) {
          contadores.datosAusentesOVencidos++;
          return;
        }

        const evaluacion = evaluarClima(registro.weather);
        contadores.ubicacionesConDatosClimaG++;
        contadores.dispositivosRevisados++;
        contadores.alertasEvaluadas += evaluacion.alertCount;

        await procesarDispositivo(item, dispositivo, registro, contadores);
      } catch (error) {
        contadores.errores++;
        console.error("Error procesando dispositivo:", item.key, error?.message || error);
      }
    });

    console.log("Resumen de alertas Clima G:", contadores);

    return new Response(JSON.stringify({
      success: true,
      version: "2.0.0",
      source: "Clima G",
      ...contadores
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error general en alertas Clima G:", error);

    return new Response(JSON.stringify({
      success: false,
      error: "No se pudo completar la revisión de alertas.",
      ...contadores
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
