import { getStore } from "@netlify/blobs";
import { evaluarClima } from "./clima-g-core.mjs";

// CLIMA G — Receptor de observaciones y archivo diario.
// No consulta proveedores externos: recibe exclusivamente datos ya obtenidos
// y mostrados por la aplicación Clima G.
const store = getStore("clima-g-datos-meteorologicos");

const ORIGENES_PERMITIDOS = new Set([
  "https://ciberspar.github.io",
  "https://climag.duckdns.org",
  "https://www.climag.duckdns.org",
  "https://radiant-meringue-1bb8c2.netlify.app"
]);
const MAX_BODY_BYTES = 128 * 1024;
const MAX_HISTORY_DAYS = 35;

function responder(status, data, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (ORIGENES_PERMITIDOS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function claveUbicacion(latitude, longitude) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

function esNumeroFinito(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validarArrayNumerico(value, nombre, max = 10, obligatorio = true) {
  if (!Array.isArray(value)) return !obligatorio;
  if (value.length < 1 || value.length > max) return false;
  return value.every(item => item === null || esNumeroFinito(item));
}

function validarPaquete(data) {
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  const current = data?.weather?.current;
  const daily = data?.weather?.daily;

  if (
    data?.source !== "Clima G" ||
    !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    !current || !daily ||
    !esNumeroFinito(current.temperature_2m) ||
    !esNumeroFinito(current.weather_code) ||
    !esNumeroFinito(current.wind_speed_10m) ||
    !Array.isArray(daily.time) || daily.time.length < 1 || daily.time.length > 10 ||
    !daily.time.every(value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) ||
    !validarArrayNumerico(daily.precipitation_sum, "precipitation_sum") ||
    !validarArrayNumerico(daily.uv_index_max, "uv_index_max", 10, false) ||
    !validarArrayNumerico(daily.temperature_2m_max, "temperature_2m_max", 10, false) ||
    !validarArrayNumerico(daily.temperature_2m_min, "temperature_2m_min", 10, false)
  ) return null;

  return { latitude, longitude, current, daily };
}

export default async function handler(request) {
  const origin = request.headers.get("origin") || "";
  if (!ORIGENES_PERMITIDOS.has(origin)) {
    return responder(403, { success: false, error: "Origen no autorizado." });
  }
  if (request.method === "OPTIONS") return responder(204, {}, origin);
  if (request.method !== "POST") {
    return responder(405, { success: false, error: "Método no permitido." }, origin);
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return responder(413, { success: false, error: "Datos demasiado grandes." }, origin);
    }

    const data = await request.json();
    const validado = validarPaquete(data);
    if (!validado) {
      return responder(400, {
        success: false,
        error: "El paquete meteorológico publicado por Clima G es inválido o está incompleto."
      }, origin);
    }

    const { latitude, longitude, current, daily } = validado;
    const key = `locations/${claveUbicacion(latitude, longitude)}`;
    const anterior = await store.get(key, { type: "json" });
    const now = new Date();
    const receivedAt = now.toISOString();
    const timezoneCandidate = typeof data.weather.timezone === "string"
      ? data.weather.timezone
      : data.timezone;
    let timezone = "UTC";
    if (typeof timezoneCandidate === "string" && timezoneCandidate.length <= 80) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: timezoneCandidate }).format(now);
        timezone = timezoneCandidate;
      } catch {
        timezone = "UTC";
      }
    }
    const date = typeof current.time === "string" && /^\d{4}-\d{2}-\d{2}/.test(current.time)
      ? current.time.slice(0, 10)
      : daily.time[0];
    const dayIndexFound = daily.time.findIndex(value => value.slice(0, 10) === date);
    const dayIndex = dayIndexFound >= 0 ? dayIndexFound : 0;

    const precipitation = daily.precipitation_sum[dayIndex];
    const maximum = daily.temperature_2m_max?.[dayIndex];
    const minimum = daily.temperature_2m_min?.[dayIndex];
    const uv = daily.uv_index_max?.[dayIndex];

    // La evaluación se archiva junto con el registro diario. No se inventan
    // alertas: se calculan usando el mismo motor meteorológico de Clima G.
    const weatherForEvaluation = {
      current: {
        temperature_2m: current.temperature_2m,
        wind_speed_10m: current.wind_speed_10m,
        weather_code: current.weather_code,
        time: current.time || `${date}T12:00`
      },
      daily: {
        time: [date],
        precipitation_sum: [precipitation],
        uv_index_max: [uv]
      }
    };
    const evaluation = evaluarClima(weatherForEvaluation);

    const entry = {
      date,
      observedAt: typeof current.time === "string" ? current.time : receivedAt,
      receivedAt,
      temperature: current.temperature_2m,
      weatherCode: current.weather_code,
      wind: current.wind_speed_10m,
      precipitation: esNumeroFinito(precipitation) ? precipitation : null,
      max: esNumeroFinito(maximum) ? maximum : null,
      min: esNumeroFinito(minimum) ? minimum : null,
      uv: esNumeroFinito(uv) ? uv : null,
      alerts: (evaluation.alerts || []).map(alert => ({
        id: alert.id,
        type: alert.type,
        title: alert.title,
        severity: alert.severity
      }))
    };

    const history = Array.isArray(anterior?.history) ? [...anterior.history] : [];
    const existingIndex = history.findIndex(item => item?.date === date);
    if (existingIndex >= 0) history[existingIndex] = entry;
    else history.push(entry);
    history.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    while (history.length > MAX_HISTORY_DAYS) history.shift();

    await store.setJSON(key, {
      source: "Clima G",
      version: String(data.version || "1.0.0").slice(0, 32),
      latitude,
      longitude,
      name: String(data.name || anterior?.name || "Ubicación").trim().slice(0, 100),
      timezone: timezone.slice(0, 80),
      observedAt: entry.observedAt,
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
          uv_index_max: (daily.uv_index_max || []).slice(0, 10)
        }
      },
      history
    });

    return responder(201, {
      success: true,
      source: "Clima G",
      historyDays: history.length,
      date,
      alertsRecorded: entry.alerts.length
    }, origin);
  } catch (error) {
    console.error("Error guardando datos meteorológicos de Clima G:", error);
    return responder(500, {
      success: false,
      error: "No se pudieron guardar los datos meteorológicos de Clima G."
    }, origin);
  }
}
