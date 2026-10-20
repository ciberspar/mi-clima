const webpush = require('web-push');
const fs = require('fs');

// Configura tus credenciales VAPID desde las variables de entorno de GitHub Actions
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:tu-correo@gmail.com',
  publicVapidKey,
  privateVapidKey
);

async function enviarNotificaciones() {
  // Archivo donde se guardarán las suscripciones de los usuarios
  const archivoSuscripciones = 'suscripciones.json';
  
  if (!fs.existsSync(archivoSuscripciones)) {
    console.log("No hay suscripciones registradas todavía.");
    return;
  }

  let suscripciones = [];
  try {
    suscripciones = JSON.parse(fs.readFileSync(archivoSuscripciones, 'utf8'));
  } catch (e) {
    console.log("Error al leer el archivo de suscripciones.");
    return;
  }

  if (suscripciones.length === 0) {
    console.log("La lista de suscripciones está vacía.");
    return;
  }

  // Obtenemos el clima actual de Córdoba (o de la ubicación dinámica) usando Open-Meteo
  const lat = -31.42;
  const lon = -64.18;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FArgentina%2FCordoba`);
  const data = await res.json();

  const tempActual = Math.round(data.current.temperature_2m);
  const code = data.current.weather_code;
  const tempMax = Math.round(data.daily.temperature_2m_max[0]);
  const tempMin = Math.round(data.daily.temperature_2m_min[0]);

  let titulo = "🌤️ Clima G";
  let mensaje = `Temperatura actual: ${tempActual}°C (Máx: ${tempMax}° / Mín: ${tempMin}°)`;

  if (code >= 95) {
    titulo = "⚠️ Alerta de Tormenta";
    mensaje = `¡Atención! Tormenta eléctrica en la zona. Temperatura: ${tempActual}°C`;
  } else if (code >= 61 && code <= 65) {
    titulo = "🌧️ Lluvia Activa";
    mensaje = `Está lloviendo en la zona. Temperatura: ${tempActual}°C`;
  }

  const payload = JSON.stringify({ title: titulo, body: mensaje });

  // Enviamos la notificación a cada dispositivo suscripto
  for (let i = 0; i < suscripciones.length; i++) {
    const sub = suscripciones.get ? suscripciones[i] : suscripciones[i];
    try {
      await webpush.sendNotification(sub, payload);
      console.log(`Notificación enviada con éxito al dispositivo ${i + 1}`);
    } catch (error) {
      console.error(`Error al enviar al dispositivo ${i + 1}:`, error);
      // Si la suscripción expiró o el usuario bloqueó las notificaciones, la podemos remover
      if (error.statusCode === 410 || error.statusCode === 404) {
        suscripciones.splice(i, 1);
        i--;
      }
    }
  }

  // Actualizamos el archivo de suscripciones limpiando las inactivas
  fs.writeFileSync(archivoSuscripciones, JSON.stringify(suscripciones, null, 2));
}

enviarNotificaciones();
