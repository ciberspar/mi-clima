import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";

const store = getStore("clima-g-suscripciones");

function respuesta(statusCode, data, origin = "*") {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin"
    },
    body: JSON.stringify(data)
  };
}

function origenPermitido(origin) {
  const permitidos = [
    "https://ciberspar.github.io",
    "https://climag.duckdns.org"
  ];

  return permitidos.includes(origin);
}

export default async (request) => {
  const origin = request.headers.get("origin") || "";

  if (!origenPermitido(origin)) {
    return respuesta(403, { error: "Origen no autorizado." });
  }

  if (request.method === "OPTIONS") {
    return respuesta(204, {}, origin);
  }

  if (request.method === "GET") {
    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      return respuesta(503, {
        error: "Falta configurar VAPID_PUBLIC_KEY."
      }, origin);
    }

    return respuesta(200, { publicKey }, origin);
  }

  if (request.method !== "POST") {
    return respuesta(405, { error: "Método no permitido." }, origin);
  }

  try {
    const data = await request.json();

    const subscription = data.subscription;
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return respuesta(400, {
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
      return respuesta(400, {
        error: "Coordenadas inválidas."
      }, origin);
    }

    const id = createHash("sha256")
      .update(subscription.endpoint)
      .digest("hex");

    const anterior = await store.get(`devices/${id}`, {
      type: "json"
    });

    await store.setJSON(`devices/${id}`, {
      subscription,
      latitude,
      longitude,
      lastAlertSignature: anterior?.lastAlertSignature || null,
      updatedAt: new Date().toISOString()
    });

    return respuesta(201, {
      success: true,
      message: "Dispositivo registrado correctamente."
    }, origin);

  } catch (error) {
    console.error("Error registrando suscripción:", error);

    return respuesta(500, {
      error: "No se pudo registrar el dispositivo."
    }, origin);
  }
};
