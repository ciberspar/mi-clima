import { getStore } from "@netlify/blobs";
import webpush from "web-push";

// CLIMA G — Resumen semanal personal por ubicación.
// Se ejecuta cada hora y genera el resumen al llegar al domingo a las 23:xx
// según la zona horaria guardada para cada dispositivo.
export const config = { schedule: "0 * * * *" };

const subscriptionsStore = getStore("clima-g-suscripciones");
const weatherStore = getStore("clima-g-datos-meteorologicos");
const summariesStore = getStore("clima-g-resumenes-semanales");

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_MS = 7 * DAY_MS;
const ORIGENES_PERMITIDOS = new Set([
  "https://ciberspar.github.io/mi-clima",
  "https://climag.duckdns.org",
  "https://www.climag.duckdns.org",
  "https://radiant-meringue-1bb8c2.netlify.app"
]);
const CONCURRENCIA = 6;

function responder(status, data, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (ORIGENES_PERMITIDOS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function claveUbicacion(ubicacion) {
  return `${Number(ubicacion.latitude).toFixed(4)},${Number(ubicacion.longitude).toFixed(4)}`;
}

function partesLocales(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  return Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
}

function obtenerSemanaCerrada(now, timeZone) {
  let local;
  try { local = partesLocales(now, timeZone); }
  catch { local = partesLocales(now, "UTC"); timeZone = "UTC"; }

  const hoy = `${local.year}-${local.month}-${local.day}`;
  const dias = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const diaSemana = dias[local.weekday] || 1;
  const domingo = new Date(`${hoy}T12:00:00.000Z`);
  domingo.setUTCDate(domingo.getUTCDate() + (7 - diaSemana));
  const domingoKey = domingo.toISOString().slice(0, 10);
  const lunes = new Date(`${domingoKey}T12:00:00.000Z`);
  lunes.setUTCDate(lunes.getUTCDate() - 6);

  const keys = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(lunes);
    date.setUTCDate(date.getUTCDate() + i);
    keys.push(date.toISOString().slice(0, 10));
  }

  return {
    keys,
    weekLabel: `${keys[0]} al ${keys[6]}`,
    weekId: keys[0],
    isSundayAtEleven: local.weekday === "Sun" && Number(local.hour) === 23
  };
}

function numeroValido(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function crearResumen(nombre, filas, semana) {
  const dias = filas.length;
  if (!dias) {
    return {
      locationName: nombre,
      weekLabel: semana.weekLabel,
      daysCollected: 0,
      text: `Resumen semanal de ${nombre}: no se recopilaron registros meteorológicos durante esta semana. No hay datos suficientes para calcular temperaturas, precipitaciones ni condiciones.`,
      metrics: null,
      alertDays: 0,
      alertCount: 0
    };
  }

  const temperaturas = filas.map(row => row.temperature).filter(numeroValido);
  const maximas = filas.map(row => row.max).filter(numeroValido);
  const minimas = filas.map(row => row.min).filter(numeroValido);
  const vientos = filas.map(row => row.wind).filter(numeroValido);
  const lluvias = filas.map(row => row.precipitation).filter(numeroValido);

  // La máxima y mínima se identifican como valores previstos archivados por
  // Clima G, no como mediciones observadas de todo el día.
  const maxSemana = maximas.length ? Math.max(...maximas) : null;
  const minSemana = minimas.length ? Math.min(...minimas) : null;
  const lluviaAcumulada = lluvias.length ? lluvias.reduce((sum, value) => sum + value, 0) : null;
  const vientoMaximo = vientos.length ? Math.max(...vientos) : null;
  const diasConLluvia = lluvias.filter(value => value >= 1).length;
  const diasConAlertas = filas.filter(row => Array.isArray(row.alerts) && row.alerts.length > 0).length;
  const alertas = filas.flatMap(row => Array.isArray(row.alerts) ? row.alerts : []);
  const alertasPorTipo = {};
  for (const alerta of alertas) {
    const tipo = String(alerta.title || alerta.type || "Condición meteorológica");
    alertasPorTipo[tipo] = (alertasPorTipo[tipo] || 0) + 1;
  }

  const partes = [`Resumen semanal de ${nombre}. Se recopilaron ${dias} de 7 días.`];
  if (maxSemana !== null) partes.push(`La máxima prevista más alta registrada fue de ${Math.round(maxSemana)} grados.`);
  if (minSemana !== null) partes.push(`La mínima prevista más baja registrada fue de ${Math.round(minSemana)} grados.`);
  if (lluviaAcumulada !== null) partes.push(`La suma de precipitaciones previstas en los registros diarios fue de ${lluviaAcumulada.toFixed(1)} milímetros.`);
  if (lluvias.length) partes.push(`Se registraron ${diasConLluvia} días con al menos un milímetro de precipitación prevista.`);
  if (vientoMaximo !== null) partes.push(`La mayor velocidad de viento guardada fue de ${Math.round(vientoMaximo)} kilómetros por hora.`);
  partes.push(`Clima G registró condiciones de alerta en ${diasConAlertas} días, con ${alertas.length} evaluaciones de alerta en total.`);

  return {
    locationName: nombre,
    weekLabel: semana.weekLabel,
    daysCollected: dias,
    text: partes.join(" "),
    metrics: {
      forecastMaximumC: maxSemana,
      forecastMinimumC: minSemana,
      recordedPrecipitationSumMm: lluviaAcumulada,
      daysWithAtLeast1mmForecast: lluvias.length ? diasConLluvia : null,
      maximumWindKmh: vientoMaximo,
      daysWithAlerts: diasConAlertas,
      alertEvaluations: alertas.length,
      alertTypes: alertasPorTipo
    },
    alertDays: diasConAlertas,
    alertCount: alertas.length
  };
}

async function limpiarResumenesVencidos(now = Date.now()) {
  let eliminados = 0;
  const listado = await summariesStore.list({ prefix: "devices/" });
  for (const item of listado.blobs) {
    const summary = await summariesStore.get(item.key, { type: "json" });
    const expires = Date.parse(summary?.expiresAt || "");
    if (!summary || !Number.isFinite(expires) || expires <= now) {
      await summariesStore.delete(item.key);
      eliminados++;
    }
  }
  return eliminados;
}

async function ejecutarConLimite(items, limit, task) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await task(items[current]);
    }
  }));
}

async function obtenerUbicaciones(dispositivo) {
  if (Array.isArray(dispositivo.locations) && dispositivo.locations.length) return dispositivo.locations;
  if (Number.isFinite(dispositivo.latitude) && Number.isFinite(dispositivo.longitude)) {
    return [{ name: "Ubicación actual", latitude: dispositivo.latitude, longitude: dispositivo.longitude }];
  }
  return [];
}

async function procesarDispositivo(item, dispositivo, now, contadores) {
  if (!dispositivo?.subscription || !/^[a-f0-9]{64}$/.test(dispositivo.accessToken || "")) return;
  const ubicaciones = await obtenerUbicaciones(dispositivo);
  for (const ubicacion of ubicaciones) {
    const lat = Number(ubicacion.latitude), lon = Number(ubicacion.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const key = claveUbicacion({ latitude: lat, longitude: lon });
    const registro = await weatherStore.get(`locations/${key}`, { type: "json" });
    // Cada ciudad usa su zona horaria meteorológica; si todavía no hay
    // un registro, se utiliza la zona horaria del dispositivo.
    const timeZone = registro?.timezone || dispositivo.timezone || "UTC";
    const semana = obtenerSemanaCerrada(now, timeZone);
    if (!semana.isSundayAtEleven) continue;

    const history = Array.isArray(registro?.history) ? registro.history : [];
    const filas = history
      .filter(row => semana.keys.includes(row.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    const nombre = String(ubicacion.name || registro?.name || "Ubicación").slice(0, 100);
    const summaryKey = `devices/${dispositivo.accessToken}/${semana.weekId}/${key.replace(",", "_")}`;
    const existente = await summariesStore.get(summaryKey, { type: "json" });
    if (existente && Date.parse(existente.expiresAt || "") > now.getTime()) continue;

    const resultado = crearResumen(nombre, filas, semana);
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + RETENTION_MS).toISOString();
    const summary = {
      ...resultado,
      createdAt,
      expiresAt,
      source: "Clima G",
      retentionDays: 7,
      locationKey: key
    };
    await summariesStore.setJSON(summaryKey, summary);
    contadores.resumenesCreados++;

    try {
      await webpush.sendNotification(dispositivo.subscription, JSON.stringify({
        title: `📅 Resumen semanal · ${nombre}`,
        body: resultado.text.slice(0, 170),
        url: "./#tab-resumen",
        tag: `clima-g-week-${semana.weekId}-${key}`.slice(0, 120),
        source: "Clima G",
        location: nombre
      }), { TTL: 7 * 24 * 60 * 60 });
      contadores.notificacionesEnviadas++;
    } catch (error) {
      const status = Number(error?.statusCode);
      if (status === 404 || status === 410) {
        await subscriptionsStore.delete(item.key);
        contadores.suscripcionesEliminadas++;
        throw Object.assign(new Error("Suscripción Push vencida."), { subscriptionRemoved: true });
      }
      contadores.erroresPush++;
      console.error("Error enviando resumen semanal:", error?.message || error);
    }
  }
}

export default async function handler(request) {
  const origin = request?.headers?.get?.("origin") || "";

  // Endpoint de lectura para que el dispositivo recupere solamente sus propios resúmenes.
  if (request?.method === "OPTIONS") {
    return ORIGENES_PERMITIDOS.has(origin)
      ? responder(204, {}, origin)
      : responder(403, { success: false, error: "Origen no autorizado." });
  }
  if (request?.method === "GET") {
    if (!ORIGENES_PERMITIDOS.has(origin)) return responder(403, { success: false, error: "Origen no autorizado." });
    const token = new URL(request.url).searchParams.get("token") || "";
    if (!/^[a-f0-9]{64}$/.test(token)) return responder(401, { success: false, error: "Token inválido." }, origin);

    const listado = await summariesStore.list({ prefix: `devices/${token}/` });
    const summaries = [];
    for (const item of listado.blobs) {
      const summary = await summariesStore.get(item.key, { type: "json" });
      if (summary && Date.parse(summary.expiresAt || "") > Date.now()) summaries.push(summary);
    }
    summaries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return responder(200, { success: true, summaries }, origin);
  }

  // Netlify Scheduled Functions invoca el handler sin un método HTTP normal.
  if (request?.method && request.method !== "POST") {
    return responder(405, { success: false, error: "Método no permitido." }, origin);
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  const now = new Date();
  const contadores = {
    resumenesCreados: 0,
    notificacionesEnviadas: 0,
    dispositivosRevisados: 0,
    ubicacionesRevisadas: 0,
    resumenesEliminados: 0,
    suscripcionesEliminadas: 0,
    erroresPush: 0,
    errores: 0
  };

  try {
    // La limpieza de expirados se ejecuta incluso si VAPID está mal configurado.
    contadores.resumenesEliminados = await limpiarResumenesVencidos(now.getTime());
    if (!publicKey || !privateKey || !subject) {
      return responder(500, {
        success: false,
        error: "Configuración VAPID incompleta.",
        resumenesEliminados: contadores.resumenesEliminados
      }, origin);
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const listado = await subscriptionsStore.list({ prefix: "devices/" });
    await ejecutarConLimite(listado.blobs, CONCURRENCIA, async item => {
      try {
        const dispositivo = await subscriptionsStore.get(item.key, { type: "json" });
        if (!dispositivo) return;
        contadores.dispositivosRevisados++;
        const ubicaciones = await obtenerUbicaciones(dispositivo);
        contadores.ubicacionesRevisadas += ubicaciones.length;
        await procesarDispositivo(item, dispositivo, now, contadores);
      } catch (error) {
        if (error?.subscriptionRemoved) return;
        contadores.errores++;
        console.error("Error procesando resumen de dispositivo:", item.key, error?.message || error);
      }
    });

    return responder(200, {
      success: true,
      source: "Clima G",
      retentionDays: 7,
      ...contadores
    }, origin);
  } catch (error) {
    console.error("Error general en resumen semanal Clima G:", error);
    return responder(500, { success: false, error: "No se pudo procesar el resumen semanal.", ...contadores }, origin);
  }
}
