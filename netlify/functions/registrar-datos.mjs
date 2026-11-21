import { getStore } from "@netlify/blobs";

const store = getStore("clima-g-datos-meteorologicos");

const ORIGENES_PERMITIDOS = new Set([
  "https://ciberspar.github.io",
  "https://climag.duckdns.org",
  "https://www.climag.duckdns.org"
]);

const MAX_BODY_BYTES = 128 * 1024;

function responder(status, data, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (ORIGENES_PERMITIDOS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers
  });
}

function claveUbicacion(latitude, longitude) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function esNumeroFinito(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validarArrayNumerico(value, max = 10) {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.length <= max &&
    value.every(item => item === null || esNumeroFinito(item));
}

export default async request => {
  const origin = request.headers.get("origin") || "";

  if (!ORIGENES_PERMITIDOS.has(origin)) {
    return responder(403, { success: false, error: "Origen no autorizado." });
  }

  if (request.method === "OPTIONS") {
    return responder(204, {}, origin);
  }

  if (request.method !== "POST") {
    return responder(405, { success: false, error: "Método no permitido." }, origin);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_BODY_BYTES) {
      return responder(413, { success: false, error: "Datos demasiado grandes." }, origin);
    }

    const data = await request.json();
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);
    const weather = data?.weather;
    const current = weather?.current;
    const daily = weather?.daily;

    if (
      data?.source !== "Clima G" ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !current || !daily ||
      !esNumeroFinito(current.temperature_2m) ||
      !esNumeroFinito(current.weather_code) ||
      !esNumeroFinito(current.wind_speed_10m) ||
      !validarArrayNumerico(daily.precipitation_sum) ||
      !validarArrayNumerico(daily.uv_index_max) ||
      !Array.isArray(daily.time) ||
      daily.time.length === 0 ||
      daily.time.length > 10 ||
      !daily.time.every(value => typeof value === "string")
    ) {
      return responder(400, {
        success: false,
        error: "El paquete meteorológico publicado por Clima G es inválido o está incompleto."
      }, origin);
    }

    // La hora de recepción la genera Netlify. El cliente no puede hacer
    // pasar datos antiguos por datos recién recibidos cambiando observedAt.
    const receivedAt = new Date().toISOString();
    const key = `locations/${claveUbicacion(latitude, longitude)}`;

    await store.setJSON(key, {
      source: "Clima G",
      version: String(data.version || "1.0.0").slice(0, 32),
      latitude,
      longitude,
      observedAt: typeof current.time === "string" ? current.time : null,
      receivedAt,
      weather: {
        current: {
          temperature_2m: current.temperature_2m,
          wind_speed_10m: current.wind_speed_10m,
          weather_code: current.weather_code,
          time: typeof current.time === "string" ? current.time : null
        },
        daily: {
          time: daily.time.slice(0, 10),
          precipitation_sum: daily.precipitation_sum.slice(0, 10),
          uv_index_max: daily.uv_index_max.slice(0, 10)
        }
      }
    });

    return responder(201, {
      success: true,
      source: "Clima G",
      message: "Datos meteorológicos de Clima G recibidos."
    }, origin);
  } catch (error) {
    console.error("Error guardando datos meteorológicos de Clima G:", error);

    return responder(500, {
      success: false,
      error: "No se pudieron guardar los datos meteorológicos de Clima G."
    }, origin);
  }
};
