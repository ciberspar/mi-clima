const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

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

async function enviarNotificacionesGlobales() {
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

  // Recorremos cada suscriptor de forma independiente
  for (let i = 0; i < suscripciones.length; i++) {
    const sub = suscripciones[i];
    
    // Si el suscriptor guardó sus coordenadas, las usamos; si no, usamos Córdoba por defecto
    const lat = sub.lat || -31.42;
    const lon = sub.lon || -64.18;
    const lugar = sub.lugar || 'tu ubicación';

    try {
      // Consultamos el clima específico de ESTE usuario
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
      const data = await res.json();

      const tempActual = Math.round(data.current.temperature_2m);
      const code = data.current.weather_code;
      const tempMax = Math.round(data.daily.temperature_2m_max[0]);
      const tempMin = Math.round(data.daily.temperature_2m_min[0]);

      let titulo = `🌤️ Clima en ${lugar}`;
      let mensaje = `Temperatura actual: ${tempActual}°C (Mín: ${tempMin}° / Máx: ${tempMax}°)`;

      if (code >= 95) {
        titulo = `⚠️ Alerta de Tormenta en ${lugar}`;
        mensaje = `¡Atención! Tormenta eléctrica en la zona. Temperatura: ${tempActual}°C`;
      } else if (code >= 61 && code <= 65) {
        titulo = `🌧️ Lluvia Activa en ${lugar}`;
        mensaje = `Está lloviendo en la zona. Temperatura: ${tempActual}°C`;
      }

      const payload = JSON.stringify({ title: titulo, body: mensaje });

      // Enviamos la notificación push personalizada a este dispositivo
      await webpush.sendNotification(sub, payload);
      console.log(`Notificación global enviada con éxito al dispositivo ${i + 1} (${lugar})`);

    } catch (error) {
      console.error(`Error al procesar el dispositivo ${i + 1}:`, error);
      // Si el token expiró o fue revocado, lo eliminamos de la lista
      if (error.statusCode === 410 || error.statusCode === 404) {
        suscripciones.splice(i, 1);
        i--;
      }
    }
  }

  fs.writeFileSync(archivoSuscripciones, JSON.stringify(suscripciones, null, 2));
}

enviarNotificacionesGlobales();
