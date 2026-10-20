const webpush = require('web-push');
const fs = require('fs');
const https = require('https');

// Configurar llaves VAPID desde los secrets de GitHub
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.log("Faltan configurar las VAPID keys en los secrets.");
  process.exit(0);
}

webpush.setVapidDetails(
  'mailto:geronimo@climag.duckdns.org',
  publicVapidKey,
  privateVapidKey
);

// Consultar Open-Meteo para Córdoba (-31.42, -64.18)
const url = 'https://api.open-meteo.com/v1/forecast?latitude=-31.42&longitude=-64.18&current=temperature_2m,weather_code,uv_index_max&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const weather = JSON.parse(data);
      const temp = weather.current.temperature_2m;
      const code = weather.current.weather_code;
      
      const horaActual = new Date().getHours();
      const esResumenMatutino = (horaActual === 10); // A las 10:00 AM hora servidor
      const esLluvia = [51,53,55,61,63,65,80,81,82,95,96,99].includes(code);

      let titulo = "";
      let cuerpo = "";

      if (esResumenMatutino) {
        const tMax = weather.daily.temperature_2m_max[0];
        const tMin = weather.daily.temperature_2m_min[0];
        titulo = "☀️ Resumen Diario del Imperio de Baco";
        cuerpo = `Temperatura actual: ${temp}°C. Máx: ${tMax}°C / Mín: ${tMin}°C. Baco inspecciona el balcón.`;
      } else if (esLluvia) {
        titulo = "🌧️ Alerta de Lluvia - Baco";
        cuerpo = `Se detectaron precipitaciones activas en la zona (${temp}°C). ¡Resguardo táctico!`;
      }

      if (titulo && fs.existsSync('subscriptions.json')) {
        const subscriptions = JSON.parse(fs.readFileSync('subscriptions.json', 'utf8'));
        
        for (const sub of subscriptions) {
          const payload = JSON.stringify({ title: titulo, body: cuerpo });
          await webpush.sendNotification(sub, payload).catch(err => console.error("Error enviando push:", err));
        }
        console.log("Notificaciones web push enviadas con éxito.");
      }
    } catch (e) {
      console.error("Error procesando clima:", e);
    }
  });
});
