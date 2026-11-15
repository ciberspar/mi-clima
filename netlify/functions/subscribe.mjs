
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const store = getStore("clima-g-suscripciones");

const ORIGENES_PERMITIDOS = new Set([
  "https://ciberspar.github.io",
  "https://climag.duckdns.org"
]);

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

  return new Response(
    status === 204 ? null : JSON.stringify(data),
    { status, headers }
  );
}

export default async (request) => {
  const origin = request.headers.get("origin") || "";

  if (!ORIGENES_PERMITIDOS.has(origin)) {
    return responder(403, { error: "Origen no autorizado." });
  }

  if (request.method === "OPTIONS") {
    return responder(204, {}, origin);
  }

  if (request.method === "GET") {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return responder(503, {
        error: "Falta configurar VAPID_PUBLIC_KEY en Netlify."
      }, origin);
    }

    return responder(200, { publicKey }, origin);
  }

  if (request.method !== "POST") {
    return responder(405, { error: "Método no permitido." }, origin);
  }

  try {
    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (contentLength > 32768) {
      return responder(413, {
        error: "La solicitud es demasiado grande."
      }, origin);
    }

    const data = await request.json();
    const subscription = data?.subscription;
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.endpoint.startsWith("https://") ||
      typeof subscription.keys?.p256dh !== "string" ||
      typeof subscription.keys?.auth !== "string" ||
      subscription.keys.p256dh.length > 512 ||
      subscription.keys.auth.length > 512
    ) {
      return responder(400, {
        error: "Suscripción Push inválida."
      }, origin);
    }

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return responder(400, {
        error: "Coordenadas inválidas."
      }, origin);
    }

    const id = createHash("sha256")
      .update(subscription.endpoint)
      .digest("hex");

    const key = `devices/${id}`;

    const anterior = await store.get(key, {
      type: "json"
    });

    await store.setJSON(key, {
      subscription,
      latitude,
      longitude,
      lastAlertSignature:
        anterior?.lastAlertSignature || null,
      updatedAt: new Date().toISOString()
    });

    return responder(201, {
      success: true,
      message: "Dispositivo registrado correctamente."
    }, origin);

  } catch (error) {
    console.error("Error registrando suscripción Push:", error);

    return responder(500, {
      error: "No se pudo registrar el dispositivo. Revisá la configuración de Netlify Blobs."
    }, origin);
  }
};
