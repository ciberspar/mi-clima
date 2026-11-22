import { getStore } from "@netlify/blobs";
import { createHash, randomBytes } from "node:crypto";

// CLIMA G — Registro de dispositivos Push y ubicaciones personales.
// Cada suscripción conserva únicamente las ubicaciones de ese dispositivo.
const store = getStore("clima-g-suscripciones");

const ORIGENES_PERMITIDOS = new Set([
  "https://ciberspar.github.io",
  "https://climag.duckdns.org",
  "https://www.climag.duckdns.org",
  "https://radiant-meringue-1bb8c2.netlify.app"
]);
const MAX_BODY_BYTES = 32 * 1024;
const MAX_UBICACIONES = 25;

function responder(status, data, origin = "") {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (ORIGENES_PERMITIDOS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function validarSuscripcion(subscription) {
  return Boolean(
    subscription &&
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.startsWith("https://") &&
    subscription.endpoint.length <= 4096 &&
    typeof subscription.keys?.p256dh === "string" &&
    subscription.keys.p256dh.length > 0 &&
    subscription.keys.p256dh.length <= 512 &&
    typeof subscription.keys?.auth === "string" &&
    subscription.keys.auth.length > 0 &&
    subscription.keys.auth.length <= 512
  );
}

function validarUbicaciones(entrada, anterior) {
  // Compatibilidad: si un cliente antiguo envía latitude/longitude,
  // se conserva esa ubicación como ubicación actual.
  let lista = entrada;
  if (!Array.isArray(lista) || lista.length === 0) {
    if (anterior && Number.isFinite(anterior.latitude) && Number.isFinite(anterior.longitude)) {
      lista = [{
        name: "Ubicación actual",
        latitude: anterior.latitude,
        longitude: anterior.longitude,
        type: "current"
      }];
    }
  }
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > MAX_UBICACIONES) {
    throw new Error(`Se requiere entre 1 y ${MAX_UBICACIONES} ubicaciones válidas.`);
  }

  const unicas = new Map();
  for (const item of lista) {
    const latitude = Number(item?.latitude);
    const longitude = Number(item?.longitude);
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) throw new Error("Hay coordenadas inválidas en las ubicaciones.");

    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (!unicas.has(key)) {
      unicas.set(key, {
        name: String(item?.name || "Ubicación").trim().slice(0, 100) || "Ubicación",
        latitude,
        longitude,
        type: ["gps", "current", "favorite"].includes(item?.type) ? item.type : "favorite"
      });
    }
  }
  return [...unicas.values()];
}

function validarZonaHoraria(value) {
  if (typeof value !== "string" || value.length > 80) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "UTC";
  }
}

export default async function handler(request) {
  const origin = request.headers.get("origin") || "";

  if (origin && !ORIGENES_PERMITIDOS.has(origin)) {
    return responder(403, { success: false, error: "Origen no autorizado." });
  }
  if (request.method === "OPTIONS") {
    return ORIGENES_PERMITIDOS.has(origin)
      ? responder(204, {}, origin)
      : responder(403, { success: false, error: "Origen no autorizado." });
  }

  if (request.method === "GET") {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return responder(503, { success: false, error: "Falta configurar VAPID_PUBLIC_KEY en Netlify." }, origin);
    }
    return responder(200, { success: true, publicKey }, origin);
  }

  if (request.method !== "POST") {
    return responder(405, { success: false, error: "Método no permitido." }, origin);
  }
  if (!ORIGENES_PERMITIDOS.has(origin)) {
    return responder(403, { success: false, error: "Origen no autorizado." });
  }

  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return responder(413, { success: false, error: "La solicitud es demasiado grande." }, origin);
    }

    const data = await request.json();
    const subscription = data?.subscription;
    if (!validarSuscripcion(subscription)) {
      return responder(400, { success: false, error: "Suscripción Push inválida." }, origin);
    }

    const id = createHash("sha256").update(subscription.endpoint).digest("hex");
    const key = `devices/${id}`;
    const anterior = await store.get(key, { type: "json" });
    const locations = validarUbicaciones(data.locations, anterior);
    const timezone = validarZonaHoraria(data.timezone);
    const accessToken = /^[a-f0-9]{64}$/.test(anterior?.accessToken || "")
      ? anterior.accessToken
      : randomBytes(32).toString("hex");

    // Conserva el estado previo de alertas y migra registros antiguos.
    const alertState = anterior?.alertState && typeof anterior.alertState === "object"
      ? anterior.alertState
      : {};
    if (Array.isArray(anterior?.lastAlertIds) && anterior.latitude != null && anterior.longitude != null) {
      const oldKey = `${Number(anterior.latitude).toFixed(4)},${Number(anterior.longitude).toFixed(4)}`;
      if (!alertState[oldKey]) alertState[oldKey] = anterior.lastAlertIds;
    }

    await store.setJSON(key, {
      subscription,
      locations,
      timezone,
      accessToken,
      alertState,
      // Campos antiguos se mantienen durante la transición para no romper
      // dispositivos que todavía no hayan actualizado su cliente.
      latitude: locations[0].latitude,
      longitude: locations[0].longitude,
      lastAlertSignature: anterior?.lastAlertSignature || null,
      lastAlertIds: Array.isArray(anterior?.lastAlertIds) ? anterior.lastAlertIds : [],
      createdAt: anterior?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return responder(201, {
      success: true,
      accessToken,
      locationsRegistered: locations.length,
      message: "Dispositivo y ubicaciones registrados correctamente."
    }, origin);
  } catch (error) {
    console.error("Error registrando suscripción Push de Clima G:", error);
    return responder(400, {
      success: false,
      error: error.message || "No se pudo registrar el dispositivo."
    }, origin);
  }
}
