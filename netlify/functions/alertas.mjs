import { getStore } from "@netlify/blobs";
import webpush from "web-push";

export const config = {
  schedule: "0 * * * *"
};

const store = getStore("clima-g-suscripciones");

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

  if (viento >= 60) {
    return {
      id: "viento-fuerte",
      title: "🌬️ Alerta meteorológica - Clima G",
      body: `Se detectó viento fuerte: ${Math.round(viento)} km/h.`
    };
  }

  if (temperatura >= 40) {
    return {
      id: "temperatura-alta",
      title: "🌡️ Alerta meteorológica - Clima G",
      body: `Temperatura elevada: ${Math.round(temperatura)} °C.`
    };
  }

  if (temperatura <= -5) {
    return {
      id: "temperatura-baja",
      title: "❄️ Alerta meteorológica - Clima G",
      body: `Temperatura muy baja: ${Math.round(temperatura)} °C.`
    };
  }

  return null;
}

export default async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.error("Faltan las variables VAPID.");
    return new Response("Configuración VAPID incompleta.", {
      status: 500
    });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const listado = await store.list({ prefix: "devices/" });

  let revisados = 0;
  let enviados = 0;

  for (const item of listado.blobs) {
    const key = item.key;

    try {
      const dispositivo = await store.get(key, { type: "json" });

      if (
        !dispositivo?.subscription ||
        !Number.isFinite(dispositivo.latitude) ||
        !Number.isFinite(dispositivo.longitude)
      ) {
        continue;
      }

      const url = new URL("https://api.open-meteo.com/v1/forecast");

      url.searchParams.set("latitude", dispositivo.latitude);
      url.searchParams.set("longitude", dispositivo.longitude);
      url.searchParams.set(
        "current",
        "temperature_2m,wind_speed_10m,weather_code"
      );

      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`Open-Meteo HTTP ${response.status}`);
      }

      const clima = await response.json();
      const alerta = obtenerAlerta(clima);

      revisados++;

      if (!alerta) {
        if (dispositivo.lastAlertSignature !== null) {
          dispositivo.lastAlertSignature = null;
          await store.setJSON(key, dispositivo);
        }
        continue;
      }

      if (dispositivo.lastAlertSignature === alerta.id) {
        continue;
      }

      try {
        await webpush.sendNotification(
          dispositivo.subscription,
          JSON.stringify({
            title: alerta.title,
            body: alerta.body,
            url: "https://climag.duckdns.org/"
          })
        );

        dispositivo.lastAlertSignature = alerta.id;
        dispositivo.updatedAt = new Date().toISOString();

        await store.setJSON(key, dispositivo);
        enviados++;

      } catch (error) {
        const status = error.statusCode;

        if (status === 404 || status === 410) {
          await store.delete(key);
        } else {
          console.error("Error enviando Push:", status, error.message);
        }
      }

    } catch (error) {
      console.error(`Error revisando ${key}:`, error.message);
    }
  }

  return new Response(
    JSON.stringify({ revisados, enviados }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
};
