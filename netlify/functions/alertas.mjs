
import { getStore } from "@netlify/blobs";
import webpush from "web-push";

export const config = {
  schedule: "0 * * * *"
};

const store = getStore("clima-g-suscripciones");
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const TAMANO_LOTE = 20;
const CONCURRENCIA_LOTES = 2;
const CONCURRENCIA_PUSH = 4;

function obtenerAlerta(clima) {
  const actual = clima?.current;
  if (!actual) return null;

  const codigo = Number(actual.weather_code);
  const viento = Number(actual.wind_speed_10m);
  const temperatura = Number(actual.temperature_2m);

  if ([95, 96, 99].includes(codigo)) {
    return {
      id: `tormenta-${codigo}`,
      title: "⛈️ Alerta meteorológica - Clima G",
      body: "Se detectó una tormenta eléctrica en tu zona."
    };
  }

  if (Number.isFinite(viento) && viento >= 60) {
    return {
      id: "viento-fuerte",
      title: "🌬️ Alerta meteorológica - Clima G",
      body: `Se detectó viento fuerte: ${Math.round(viento)} km/h.`
    };
  }

  if (Number.isFinite(temperatura) && temperatura >= 40) {
    return {
      id: "temperatura-alta",
      title: "🌡️ Alerta meteorológica - Clima G",
      body: `Temperatura elevada: ${Math.round(temperatura)} °C.`
    };
  }

  if (Number.isFinite(temperatura) && temperatura <= -5) {
    return {
      id: "temperatura-baja",
      title: "❄️ Alerta meteorológica - Clima G",
      body: `Temperatura muy baja: ${Math.round(temperatura)} °C.`
    };
  }

  return null;
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

  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    headers: { "Accept": "application/json" }
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

async function procesarDispositivo(
  item,
  dispositivo,
  alerta,
  contadores
) {
  const key = item.key;

  if (!alerta) {
    if (dispositivo.lastAlertSignature != null) {
      dispositivo.lastAlertSignature = null;
      dispositivo.updatedAt = new Date().toISOString();
      await store.setJSON(key, dispositivo);
    }
    return;
  }

  if (dispositivo.lastAlertSignature === alerta.id) {
    return;
  }

  try {
    await webpush.sendNotification(
      dispositivo.subscription,
      JSON.stringify({
        title: alerta.title,
        body: alerta.body,
        url: "https://climag.duckdns.org/"
      }),
      { TTL: 3600 }
    );

    dispositivo.lastAlertSignature = alerta.id;
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
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const contadores = {
    dispositivosRevisados: 0,
    ubicacionesConsultadas: 0,
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

          dispositivos.push({ item, dispositivo });

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
        .dispositivos.push(registro);
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
            "Error consultando un lote meteorológico:",
            error?.message || error
          );

          return;
        }

        for (let i = 0; i < lote.length; i++) {
          const grupo = lote[i];
          const alerta = obtenerAlerta(climas[i]);

          await ejecutarConLimite(
            grupo.dispositivos,
            CONCURRENCIA_PUSH,
            async registro => {
              contadores.dispositivosRevisados++;

              try {
                await procesarDispositivo(
                  registro.item,
                  registro.dispositivo,
                  alerta,
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
        ...contadores
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
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
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
