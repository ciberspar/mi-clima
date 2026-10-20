const webpush = require('web-push');
const https = require('https');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

if (!publicVapidKey || !privateVapidKey) {
  console.log("Faltan configurar las VAPID keys.");
  process.exit(0);
}

webpush.setVapidDetails(
  'mailto:geronimo@climag.duckdns.org',
  publicVapidKey,
  privateVapidKey
);

// Consultar Open-Meteo para Córdoba
const url = 'https://api.open-meteo.com/v1/forecast?latitude=-31.42&longitude=-64.18&current=temperature_2m,weather_code,uv_index_max&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const weather = JSON.parse(data);
      const temp = weather.current.temperature_2m;
      const code = weather.current.weather_code;
      
      const horaActual = new Date().getHours();
      const esResumenMatutino = (horaActual === 10);
      const esLluvia = [51,53,55,61,63,65,80,81,82,95,96,99].includes(code);

      let titulo = "";
      let cuerpo = "";

      if (esResumenMatutino) {
        const tMax = weather.daily.temperature_2m_max[0];
        const tMin = weather.daily.temperature_2m_min[0];
        titulo = "☀️ Resumen Diario de Baco";
        cuerpo = `Temperatura: ${temp}°C. Máx: ${tMax}°C / Mín: ${tMin}°C. Baco en el balcón.`;
      } else if (esLluvia) {
        titulo = "🌧️ Alerta de Lluvia - Baco";
        cuerpo = `Precipitaciones detectadas en la zona (${temp}°C). ¡Resguardo táctico!`;
      }

      // Si hay alerta o resumen, se puede transmitir al canal o endpoints activos
      if (titulo) {
        console.log("Disparando alerta:", titulo, "-", cuerpo);
      }
    } catch (e) {
      console.error("Error:", e);
    }
  });
});
