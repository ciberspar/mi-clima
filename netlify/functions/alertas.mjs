
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { evaluarClima } from "../../docs/clima-g-core.mjs";

export const config = {
  schedule: "0 * * * *"
};

const store = getStore("clima-g-suscripciones");
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const TAMANO_LOTE = 20;
const CONCURRENCIA_LOTES = 2;
const CONCURRENCIA_PUSH = 4;

function ejecutarConLimite(items, limite, tarea) {
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

function claveUbicacion(dispositivo) {
  const lat = Number(dispositivo.latitude).toFixed(4);
  const lon = Number(dispositivo.longitude).toFixed(4);

  return `${lat},${lon}`;
}

async function consultarClima(grupos) {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set(
    "latitude",
    grupos.map(g => Number(g.latitude).toFixed(4)).join(",")
  );

  url.searchParams.set(
    "longitude",
    grupos.map(g => Number(g.longitude).toFixed(4)).join(",")
  );

  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,weather_code"
  );

  url.searchParams.set(
    "daily",
    "precipitation_sum,uv_index_max"
  );

  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }

  const datos = await response.json();
  const resultados = Array.isArray(datos) ? datos : [datos];

  if (resultados.length !== grupos.length) {
    throw new Error(
      "Open-Meteo devolvió una cantidad inesperada de ubicaciones."
    );
  }

  return resultados;
}

function obtenerIds(alertas) {
  return alertas
    .map(alerta => alerta.id)
    .sort();
}

function crearFirma(ids) {
  return ids.length ? ids.join("|") : null;
}

function obtenerAlertasNuevas(alertas, idsAnteriores) {
  const anteriores = new Set(idsAnteriores);

  return alertas.filter(
    alerta => !anteriores.has(alerta.id)
  );
}

function crearMensaje(alertas) {
  const principales = alertas.slice(0, 3);

  const texto = principales
    .map(alerta => alerta.message)
    .join(" ");

  const adicionales = alertas.length - principales.length;

  return adicionales > 0
    ? `${texto} Y ${adicionales} alertas adicionales.`
    : texto;
}

async function procesarDispositivo(
  item,
  dispositivo,
  evaluacion,
  contadores
) {
  const key = item.key;
  const alertas = evaluacion.alerts || [];

  const idsActuales = obtenerIds(alertas);
  const firmaActual = crearFirma(idsActuales);

  if (alertas.length === 0) {
    if (
      dispositivo.lastAlertSignature != null ||
      Array.isArray(dispositivo.lastAlertIds)
    ) {
      dispositivo.lastAlertSignature = null;
      dispositivo.lastAlertIds = [];
      dispositivo.updatedAt = new Date().toISOString();

      await store.setJSON(key, dispositivo);
    }

    return;
  }

  // Compatibilidad con registros anteriores.
  const idsAnteriores = Array.isArray(dispositivo.lastAlertIds)
    ? dispositivo.lastAlertIds
    : dispositivo.lastAlertSignature
      ? [dispositivo.lastAlertSignature]
      : [];

  const alertasNuevas = obtenerAlertasNuevas(
    alertas,
    idsAnteriores
  );

  // No repetir notificaciones de alertas que ya estaban activas.
  if (alertasNuevas.length === 0) {
    if (firmaActual !== dispositivo.lastAlertSignature) {
      dispositivo.lastAlertSignature = firmaActual;
      dispositivo.lastAlertIds = idsActuales;
      dispositivo.updatedAt = new Date().toISOString();

      await store.setJSON(key, dispositivo);
    }

    return;
  }

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
      {
        TTL: 3600
      }
    );

    dispositivo.lastAlertSignature = firmaActual;
    dispositivo.lastAlertIds = idsActuales;
    dispositivo.updatedAt = new Date().toISOString();

    await store.setJSON(key, dispositivo);

    contadores.enviados++;

  } catch (error) {
    const status = Number(error?.statusCode);

    if (status === 404 || status === 410) {
      await store.delete(key);

      contadores.suscripcionesEliminadas++;
      return;
    }

    contadores.errores++;

    console.error(
      `Error enviando Push a ${key}:`,
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
    console.error("Faltan las variables VAPID.");

    return new Response(
      JSON.stringify({
        success: false,
        error: "Configuración VAPID incompleta."
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  webpush.setVapidDetails(
    subject,
    publicKey,
    privateKey
  );

  const contadores = {
    dispositivosRevisados: 0,
    ubicacionesConsultadas: 0,
    alertasEvaluadas: 0,
    enviados: 0,
    suscripcionesEliminadas: 0,
    errores: 0
  };

  try {
    const listado = await store.list({
      prefix: "devices/"
    });

    const dispositivos = [];

    await ejecutarConLimite(
      listado.blobs,
      8,
      async item => {
        try {
          const dispositivo = await store.get(
            item.key,
            { type: "json" }
          );

          if (
            !dispositivo?.subscription ||
            !Number.isFinite(dispositivo.latitude) ||
            !Number.isFinite(dispositivo.longitude) ||
            dispositivo.latitude < -90 ||
            dispositivo.latitude > 90 ||
            dispositivo.longitude < -180 ||
            dispositivo.longitude > 180
          ) {
            contadores.errores++;

            console.error(
              "Registro de dispositivo inválido:",
              item.key
            );

            return;
          }

          dispositivos.push({
            item,
            dispositivo
          });

        } catch (error) {
          contadores.errores++;

          console.error(
            "No se pudo leer el dispositivo:",
            item.key,
            error?.message || error
          );
        }
      }
    );

    // Agrupar dispositivos que comparten ubicación.
    const gruposPorUbicacion = new Map();

    for (const registro of dispositivos) {
      const id = claveUbicacion(registro.dispositivo);

      if (!gruposPorUbicacion.has(id)) {
        gruposPorUbicacion.set(id, {
          latitude: registro.dispositivo.latitude,
          longitude: registro.dispositivo.longitude,
          dispositivos: []
        });
      }

      gruposPorUbicacion
        .get(id)
        .dispositivos
        .push(registro);
    }

    const grupos = Array.from(
      gruposPorUbicacion.values()
    );

    const lotes = [];

    for (let i = 0; i < grupos.length; i += TAMANO_LOTE) {
      lotes.push(
        grupos.slice(i, i + TAMANO_LOTE)
      );
    }

    await ejecutarConLimite(
      lotes,
      CONCURRENCIA_LOTES,
      async lote => {
        let climas;

        try {
          climas = await consultarClima(lote);

          contadores.ubicacionesConsultadas += lote.length;

        } catch (error) {
          contadores.errores += lote.length;

          console.error(
            "Error consultando datos meteorológicos:",
            error?.message || error
          );

          return;
        }

        for (let i = 0; i < lote.length; i++) {
          const grupo = lote[i];
          const clima = climas[i];

          // ÚNICO motor que decide las alertas.
          const evaluacion = evaluarClima(clima);

          contadores.alertasEvaluadas +=
            evaluacion.alertCount;

          await ejecutarConLimite(
            grupo.dispositivos,
            CONCURRENCIA_PUSH,
            async registro => {
              contadores.dispositivosRevisados++;

              try {
                await procesarDispositivo(
                  registro.item,
                  registro.dispositivo,
                  evaluacion,
                  contadores
                );

              } catch (error) {
                contadores.errores++;

                console.error(
                  "Error procesando dispositivo:",
                  registro.item.key,
                  error?.message || error
                );
              }
            }
          );
        }
      }
    );

    console.log(
      "Resumen de alertas Clima G:",
      contadores
    );

    return new Response(
      JSON.stringify({
        success: true,
        version: "1.0.0",
        ...contadores
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error(
      "Error general en alertas Clima G:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: "No se pudo completar la revisión de alertas.",
        ...contadores
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
