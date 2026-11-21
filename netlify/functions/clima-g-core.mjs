/**
 * CLIMA G CORE
 * Motor meteorológico central de Clima G.
 * No consulta proveedores externos y no envía notificaciones.
 */

export const CLIMA_G_VERSION = "1.0.0";

export const CLIMA_G_CONFIG = Object.freeze({
  thresholds: {
    temperatureHigh: 32,
    temperatureLow: 5,
    uvHigh: 8,
    windHigh: 60,
    heavyRain: 35
  },
  weatherCodes: {
    rain: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82],
    storms: [95, 96, 99]
  },
  colors: {
    none: "#64748b",
    info: "#38bdf8",
    moderate: "#facc15",
    severe: "#f97316",
    critical: "#ef4444"
  }
});

const GRAVEDAD = Object.freeze({
  info: 1,
  moderate: 2,
  severe: 3,
  critical: 4
});

function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : null;
}

function crearAlerta({ id, type, severity, title, message, emoji, value = null }) {
  return {
    id,
    type,
    severity,
    severityLevel: GRAVEDAD[severity],
    title,
    message,
    emoji,
    color: CLIMA_G_CONFIG.colors[severity],
    value
  };
}

export function evaluarClima(datos = {}) {
  const actual = datos.current || {};
  const diario = datos.daily || {};

  const temperatura = numero(actual.temperature_2m);
  const viento = numero(actual.wind_speed_10m);
  const codigo = numero(actual.weather_code);

  const fecha = actual.time ? actual.time.slice(0, 10) : null;
  let indiceDia = fecha && Array.isArray(diario.time)
    ? diario.time.indexOf(fecha)
    : 0;

  if (indiceDia < 0) indiceDia = 0;

  const precipitacion = numero(
    datos.precipitationToday ?? diario.precipitation_sum?.[indiceDia]
  );
  const uv = numero(datos.uvIndex ?? diario.uv_index_max?.[indiceDia]);

  const alertas = [];

  if (codigo !== null && CLIMA_G_CONFIG.weatherCodes.rain.includes(codigo)) {
    alertas.push(crearAlerta({
      id: "lluvia",
      type: "precipitation",
      severity: "moderate",
      title: "Lluvia",
      message: "Se detectaron condiciones de lluvia en tu zona.",
      emoji: "🌧️",
      value: codigo
    }));
  }

  if (codigo !== null && CLIMA_G_CONFIG.weatherCodes.storms.includes(codigo)) {
    alertas.push(crearAlerta({
      id: "tormenta",
      type: "storm",
      severity: "critical",
      title: "Tormenta eléctrica",
      message: "Se detectó actividad de tormenta eléctrica.",
      emoji: "⛈️",
      value: codigo
    }));
  }

  if (temperatura !== null && temperatura >= CLIMA_G_CONFIG.thresholds.temperatureHigh) {
    alertas.push(crearAlerta({
      id: "calor",
      type: "temperature",
      severity: temperatura >= 40 ? "critical" : "severe",
      title: "Temperatura elevada",
      message: `La temperatura alcanzó ${Math.round(temperatura)} °C.`,
      emoji: "🥵",
      value: temperatura
    }));
  }

  if (temperatura !== null && temperatura <= CLIMA_G_CONFIG.thresholds.temperatureLow) {
    alertas.push(crearAlerta({
      id: "frio",
      type: "temperature",
      severity: temperatura <= -5 ? "critical" : "severe",
      title: "Temperatura muy baja",
      message: `La temperatura descendió a ${Math.round(temperatura)} °C.`,
      emoji: "🥶",
      value: temperatura
    }));
  }

  if (uv !== null && uv >= CLIMA_G_CONFIG.thresholds.uvHigh) {
    alertas.push(crearAlerta({
      id: "uv",
      type: "uv",
      severity: uv >= 11 ? "critical" : "severe",
      title: "Índice UV elevado",
      message: `El índice UV alcanzó ${Math.round(uv)}.`,
      emoji: "☀️",
      value: uv
    }));
  }

  if (viento !== null && viento >= CLIMA_G_CONFIG.thresholds.windHigh) {
    alertas.push(crearAlerta({
      id: "viento",
      type: "wind",
      severity: viento >= 90 ? "critical" : "severe",
      title: "Vientos fuertes",
      message: `Se registran vientos de ${Math.round(viento)} km/h.`,
      emoji: "🌬️",
      value: viento
    }));
  }

  if (precipitacion !== null && precipitacion >= CLIMA_G_CONFIG.thresholds.heavyRain) {
    alertas.push(crearAlerta({
      id: "lluvia-intensa",
      type: "precipitation",
      severity: "critical",
      title: "Lluvia intensa",
      message: `La precipitación diaria alcanzó ${Math.round(precipitacion)} mm.`,
      emoji: "🌧️",
      value: precipitacion
    }));
  }

  alertas.sort((a, b) => b.severityLevel - a.severityLevel);
  const principal = alertas[0] || null;

  return {
    source: "Clima G",
    version: CLIMA_G_VERSION,
    evaluatedAt: new Date().toISOString(),
    hasAlerts: alertas.length > 0,
    alertCount: alertas.length,
    highestSeverity: principal ? principal.severity : "none",
    highestSeverityLevel: principal ? principal.severityLevel : 0,
    color: principal ? principal.color : CLIMA_G_CONFIG.colors.none,
    emoji: principal ? principal.emoji : "🌤️",
    alerts
  };
}

export function obtenerAlertas(datos) {
  return evaluarClima(datos).alerts;
}

export function obtenerColorClimaG(datos) {
  return evaluarClima(datos).color;
}

export function obtenerResumenClimaG(datos) {
  const resultado = evaluarClima(datos);

  if (!resultado.hasAlerts) {
    return {
      title: "Clima estable",
      message: "No se detectaron alertas meteorológicas.",
      color: CLIMA_G_CONFIG.colors.none,
      severity: "none"
    };
  }

  const principal = resultado.alerts[0];
  return {
    title: principal.title,
    message: principal.message,
    color: principal.color,
    severity: principal.severity
  };
}

export function compararAlertasClimaG(anterior, actual) {
  const anteriores = new Set((anterior?.alerts || []).map(a => a.id));
  const actuales = new Set((actual?.alerts || []).map(a => a.id));

  return {
    nuevas: [...actuales].filter(id => !anteriores.has(id)),
    finalizadas: [...anteriores].filter(id => !actuales.has(id)),
    sinCambios:
      anterior?.hasAlerts === actual?.hasAlerts &&
      [...actuales].every(id => anteriores.has(id))
  };
}
