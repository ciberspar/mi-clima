const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// Claves VAPID desde GitHub Secrets
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.error("Faltan las claves VAPID en las variables de entorno.");
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:tu-correo@gmail.com',
  publicVapidKey,
  privateVapidKey
);

async function enviarNotificaciones() {
  // Ruta absoluta al archivo dentro de la carpeta docs
  const archivoSuscripciones = path.join(__dirname, 'suscripciones.json');
  
  if (!fs.existsSync(archivoSuscripciones)) {
    console.log("No existe el archivo suscripciones.json en docs.");
    return;
  }

  let suscripciones = [];
  try {
    const contenido = fs.readFileSync(archivoSuscripciones, 'utf8');
    suscripciones = JSON.parse(contenido);
  } catch (e) {
    console.log("Error al leer el archivo de suscripciones.");
    return;
  }

  if (!Array.isArray(suscripciones) || suscripciones.length === 0) {
    console.log("La lista de suscripciones está vacía.");
    return;
  }

  // Clima de Córdoba con Open-Meteo
  const lat = -31.42;
  const lon = -64.18;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FArgentina%2FCordoba`);
  const data = await res.json();

  const tempActual = Math.round(data.current.temperature_2m);
  const code = data.current.weather_code;
  const tempMax = Math.round(data.daily.temperature_2m_max[0]);
  const tempMin = Math.round(data.daily.temperature_2m_min[0]);

  let titulo = "🌤️ Clima G";
  let mensaje = `Temperatura actual: ${tempActual}°C (Mín: ${tempMin}° / Máx: ${tempMax}°)`;

  if (code >= 95) {
    titulo = "⚠️ Alerta de Tormenta";
    mensaje = `¡Atención! Tormenta eléctrica en la zona. Temperatura: ${tempActual}°C`;
  } else if (code >= 61 && code <= 65) {
    titulo = "🌧️ Lluvia Activa";
    mensaje = `Está lloviendo en la zona. Temperatura: ${tempActual}°C`;
  }

  const payload = JSON.stringify({ title: titulo, body: mensaje });

  for (let i = 0; i < suscripciones.length; i++) {
    const sub = suscripciones[i];
    try {
      await webpush.sendNotification(sub, payload);
      console.log(`Notificación enviada con éxito al dispositivo ${i + 1}`);
    } catch (error) {
      console.error(`Error al enviar al dispositivo ${i + 1}:`, error);
      if (error.statusCode === 410 || error.statusCode === 404) {
        suscripciones.splice(i, 1);
        i--;
      }
    }
  }

  fs.writeFileSync(archivoSuscripciones, JSON.stringify(suscripciones, null, 2));
}

enviarNotificaciones();
