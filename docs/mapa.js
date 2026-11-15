
/* ============================================================
   CLIMA G — MAPA METEOROLÓGICO
   Leaflet + Leaflet.heat + Open-Meteo + USGS + OpenStreetMap
   ============================================================ */

(() => {
  'use strict';

  const CONFIG = {
    defaultLat: -31.42,
    defaultLon: -64.18,
    gridSize: 7,
    gridStep: 0.18,
    forecastHours: 24,
    animationSpeed: 1100,
    zoom: 7
  };

  const LAYER_NAMES = {
    rain: 'Precipitación',
    temp: 'Temperatura',
    wind: 'Viento',
    air: 'Calidad del aire',
    quakes: 'Sismos'
  };

  const GRADIENTS = {
    rain: {
      0.10: '#d7f4ff',
      0.25: '#83d8f5',
      0.45: '#3eafe9',
      0.65: '#3479df',
      0.82: '#6653cb',
      1: '#a44bb9'
    },
    temp: {
      0: '#4777d9',
      0.20: '#56b7e7',
      0.40: '#55c69b',
      0.60: '#d5d65d',
      0.78: '#eea04e',
      1: '#d9505d'
    },
    wind: {
      0.10: '#65d4b2',
      0.30: '#4bbbc8',
      0.50: '#568edc',
      0.72: '#8d72d1',
      1: '#d95d91'
    },
    air: {
      0.10: '#58bd8b',
      0.30: '#a6c95e',
      0.50: '#e2ca5d',
      0.72: '#e99a52',
      1: '#d85d62'
    }
  };

  const state = {
    map: null,
    layers: {},
    center: null,
    currentLayer: 'rain',
    forecast: [],
    selectedHour: 0,
    playing: false,
    timer: null,
    loading: false,
    requestId: 0,
    selectedMarker: null,
    selectedLocation: null
  };

  const $ = id => document.getElementById(id);

  // ------------------------------------------------------------
  // UBICACIÓN
  // ------------------------------------------------------------

  function getCenter() {
    if (state.center) return { ...state.center };

    const lat = typeof currentLat !== 'undefined'
      ? Number(currentLat)
      : CONFIG.defaultLat;

    const lon = typeof currentLon !== 'undefined'
      ? Number(currentLon)
      : CONFIG.defaultLon;

    return {
      lat: Number.isFinite(lat) ? lat : CONFIG.defaultLat,
      lon: Number.isFinite(lon) ? lon : CONFIG.defaultLon
    };
  }

  function createGrid(lat, lon) {
    const points = [];
    const half = Math.floor(CONFIG.gridSize / 2);

    for (let y = -half; y <= half; y++) {
      for (let x = -half; x <= half; x++) {
        points.push({
          lat: lat + y * CONFIG.gridStep,
          lon: lon + x * CONFIG.gridStep
        });
      }
    }

    return points;
  }

  // ------------------------------------------------------------
  // CARGA DE LIBRERÍAS
  // ------------------------------------------------------------

  function loadScript(src, marker) {
    if (window[marker]) return Promise.resolve();

    if (window[marker + 'Promise']) {
      return window[marker + 'Promise'];
    }

    window[marker + 'Promise'] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      script.onload = () => {
        window[marker] = true;
        resolve();
      };

      script.onerror = () => {
        window[marker + 'Promise'] = null;
        reject(new Error('No se pudo cargar ' + marker));
      };

      document.head.appendChild(script);
    });

    return window[marker + 'Promise'];
  }

  async function loadLibraries() {
    if (!document.querySelector('[data-climag-leaflet-css]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.dataset.climagLeafletCss = 'true';
      document.head.appendChild(css);
    }

    if (!window.L) {
      await loadScript(
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'climagLeafletLoaded'
      );
    }

    if (typeof L.heatLayer !== 'function') {
      await loadScript(
        'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',
        'climagHeatLoaded'
      );
    }

    if (!window.L || typeof L.heatLayer !== 'function') {
      throw new Error('Las librerías del mapa no están disponibles');
    }
  }

  // ------------------------------------------------------------
  // ESTILOS
  // ------------------------------------------------------------

  function installStyles() {
    if ($('climag-map-styles')) return;

    const style = document.createElement('style');
    style.id = 'climag-map-styles';

    style.textContent = `
      #map-container {
        position:relative;
        overflow:hidden;
        border-radius:22px;
        background:#e9f0f5;
        isolation:isolate;
      }

      #climag-map {
        width:100%;
        height:100%;
        min-height:380px;
        background:#e9f0f5;
      }

      #climag-location-info {
        margin:0 0 13px;
        padding:15px;
        border:1px solid var(--line,#dce3eb);
        border-radius:18px;
        background:var(--card,#fff);
        color:var(--ink,#253246);
        box-shadow:0 5px 20px rgba(30,50,75,.055);
      }

      #climag-location-info h3 {
        margin:0 0 5px;
        font-size:1rem;
      }

      #climag-location-info .climag-location-sub {
        color:var(--muted,#7d8997);
        font-size:.75rem;
        margin-bottom:12px;
      }

      #climag-location-info .climag-location-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:8px;
      }

      #climag-location-info .climag-location-stat {
        padding:9px;
        border-radius:12px;
        background:var(--mist,#f1f5f9);
        font-size:.78rem;
      }

      #climag-location-info .climag-location-stat strong {
        display:block;
        font-size:1rem;
        margin-top:3px;
      }

      #climag-timeline {
        margin:0 0 13px;
        padding:15px;
        border:1px solid var(--line,#dce3eb);
        border-radius:20px;
        background:var(--card,#fff);
        color:var(--ink,#253246);
        box-shadow:0 5px 20px rgba(30,50,75,.055);
      }

      #climag-topline {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
      }

      #climag-hour {
        font-size:1.45rem;
        font-weight:800;
        letter-spacing:-.04em;
      }

      #climag-play {
        border:0;
        border-radius:14px;
        padding:10px 15px;
        color:white;
        background:var(--sky-800,#347bb7);
        font-weight:700;
        cursor:pointer;
      }

      #climag-slider {
        width:100%;
        margin:15px 0 5px;
        accent-color:var(--sky-800,#347bb7);
      }

      #climag-time-labels {
        display:flex;
        justify-content:space-between;
        font-size:.72rem;
        color:var(--muted,#7d8997);
      }

      #climag-status {
        text-align:center;
        font-size:.72rem;
        color:var(--muted,#7d8997);
        margin-top:10px;
      }

      #climag-legend {
        display:flex;
        align-items:center;
        gap:8px;
        margin-top:12px;
        font-size:.7rem;
        color:var(--muted,#7d8997);
      }

      #climag-legend-bar {
        flex:1;
        height:7px;
        border-radius:10px;
      }

      .climag-wind-arrow {
        color:#fff;
        font-size:19px;
        font-weight:900;
        text-shadow:0 1px 4px rgba(0,0,0,.65);
        text-align:center;
        line-height:22px;
      }

      .climag-quake-marker {
        border-radius:50%;
        border:2px solid white;
        box-shadow:0 2px 9px rgba(0,0,0,.3);
      }

      .leaflet-popup-content-wrapper {
        border-radius:14px;
      }

      .leaflet-control-zoom a {
        color:#26394b !important;
      }

      @media(max-width:480px) {
        #climag-map { min-height:360px; }
        #climag-timeline { padding:12px; }
      }
    `;

    document.head.appendChild(style);
  }

  // ------------------------------------------------------------
  // INTERFAZ
  // ------------------------------------------------------------

  function prepareInterface() {
    const container = $('map-container');

    if (!container) {
      throw new Error('No existe #map-container');
    }

    installStyles();

    if (!$('climag-map')) {
      const map = document.createElement('div');
      map.id = 'climag-map';
      container.appendChild(map);
    }

    let locationInfo = $('climag-location-info');
    if (!locationInfo) {
      locationInfo = document.createElement('section');
      locationInfo.id = 'climag-location-info';
      locationInfo.innerHTML = `
        <h3 id="climag-location-title">🌍 Explorá el mundo</h3>
        <div class="climag-location-sub" id="climag-location-coords">
          Tocá cualquier punto del mapa para consultar el clima de ese lugar.
        </div>
        <div class="climag-location-grid" id="climag-location-values">
          <div class="climag-location-stat">Temperatura<strong>--</strong></div>
          <div class="climag-location-stat">Sensación térmica<strong>--</strong></div>
          <div class="climag-location-stat">Humedad<strong>--</strong></div>
          <div class="climag-location-stat">Viento<strong>--</strong></div>
        </div>
      `;
      container.parentNode.insertBefore(locationInfo, container.nextSibling);
    }

    let timeline = $('climag-timeline');

    if (!timeline) {
      timeline = document.createElement('section');
      timeline.id = 'climag-timeline';

      timeline.innerHTML = `
        <div id="climag-topline">
          <div>
            <div style="font-size:.7rem;font-weight:700;
              color:var(--muted,#7d8997);">
              PRONÓSTICO POR HORA
            </div>
            <div id="climag-hour">Cargando...</div>
          </div>
          <button id="climag-play" type="button">
            ▶ Reproducir
          </button>
        </div>

        <input id="climag-slider" type="range"
          min="0" max="23" value="0" step="1"
          aria-label="Hora del pronóstico">

        <div id="climag-time-labels">
          <span id="climag-start">--:--</span>
          <span id="climag-end">--:--</span>
        </div>

        <div id="climag-legend">
          <span id="climag-legend-min">Bajo</span>
          <div id="climag-legend-bar"></div>
          <span id="climag-legend-max">Alto</span>
        </div>

        <div id="climag-status">Preparando mapa...</div>
      `;

      container.parentNode.insertBefore(timeline, container);
    }

    if (timeline.dataset.bound !== 'true') {
      $('climag-slider').addEventListener('input', event => {
        stopAnimation();
        state.selectedHour = Number(event.target.value);
        renderHour();
      });

      $('climag-play').addEventListener('click', () => {
        state.playing ? stopAnimation() : startAnimation();
      });

      timeline.dataset.bound = 'true';
    }
  }

  function setStatus(message, error = false) {
    const element = $('climag-status');
    if (!element) return;

    element.textContent = message;
    element.style.color = error ? '#d9534f' : '';
  }

  function updateLegend(layer) {
    const bar = $('climag-legend-bar');
    const min = $('climag-legend-min');
    const max = $('climag-legend-max');

    if (!bar || !min || !max) return;

    if (layer === 'rain') {
      bar.style.background =
        'linear-gradient(90deg,#d7f4ff,#83d8f5,#3eafe9,#3479df,#6653cb,#a44bb9)';
      min.textContent = 'Ligera';
      max.textContent = 'Intensa';
    } else if (layer === 'temp') {
      bar.style.background =
        'linear-gradient(90deg,#4777d9,#56b7e7,#55c69b,#d5d65d,#eea04e,#d9505d)';
      min.textContent = 'Frío';
      max.textContent = 'Calor';
    } else if (layer === 'wind') {
      bar.style.background =
        'linear-gradient(90deg,#65d4b2,#4bbbc8,#568edc,#8d72d1,#d95d91)';
      min.textContent = 'Suave';
      max.textContent = 'Fuerte';
    } else if (layer === 'air') {
      bar.style.background =
        'linear-gradient(90deg,#58bd8b,#a6c95e,#e2ca5d,#e99a52,#d85d62)';
      min.textContent = 'Buena';
      max.textContent = 'Mala';
    } else {
      bar.style.background = 'linear-gradient(90deg,#e2bd58,#dc7a4c,#d85d62)';
      min.textContent = 'Menor';
      max.textContent = 'Mayor';
    }
  }

  // ------------------------------------------------------------
  // CREAR MAPA
  // ------------------------------------------------------------

  function createMap() {
    if (state.map) return;

    const center = getCenter();

    state.map = L.map('climag-map', {
      zoomControl: true,
      preferCanvas: true
    }).setView([15, 0], 2);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(state.map);

    Object.keys(LAYER_NAMES).forEach(name => {
      state.layers[name] = L.layerGroup();
    });

    state.layers[state.currentLayer].addTo(state.map);

    state.map.on('click', event => {
      selectMapLocation(event.latlng.lat, event.latlng.lng);
    });
  }

  // ------------------------------------------------------------
  // PETICIONES
  // ------------------------------------------------------------

  async function fetchJSON(url) {
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status);
    }

    return response.json();
  }

  function itemAt(data, index) {
    return Array.isArray(data) ? data[index] : data;
  }

  // ------------------------------------------------------------
  // OPEN-METEO: PRONÓSTICO
  // ------------------------------------------------------------

  async function loadForecast() {
    const center = getCenter();
    const points = createGrid(center.lat, center.lon);

    const lat = points.map(p => p.lat).join(',');
    const lon = points.map(p => p.lon).join(',');

    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${lat}` +
      `&longitude=${lon}` +
      '&hourly=temperature_2m,precipitation,' +
      'precipitation_probability,wind_speed_10m,' +
      'wind_direction_10m' +
      '&forecast_days=2&timezone=auto';

    const data = await fetchJSON(url);
    const first = itemAt(data, 0);

    if (!first?.hourly?.time) {
      throw new Error('Pronóstico no disponible');
    }

    const hours = Math.min(
      CONFIG.forecastHours,
      first.hourly.time.length
    );

    state.forecast = [];

    for (let hour = 0; hour < hours; hour++) {
      state.forecast.push({
        time: first.hourly.time[hour],
        points: points.map((point, index) => {
          const item = itemAt(data, index);
          const hourly = item?.hourly || {};

          return {
            ...point,
            temperature: hourly.temperature_2m?.[hour],
            precipitation: hourly.precipitation?.[hour],
            probability: hourly.precipitation_probability?.[hour],
            wind: hourly.wind_speed_10m?.[hour],
            direction: hourly.wind_direction_10m?.[hour]
          };
        })
      });
    }

    state.selectedHour = 0;

    $('climag-slider').max = Math.max(0, hours - 1);
    $('climag-slider').value = 0;

    $('climag-start').textContent =
      formatTime(state.forecast[0].time);

    $('climag-end').textContent =
      formatTime(state.forecast[hours - 1].time);
  }

  // ------------------------------------------------------------
  // FORMATO
  // ------------------------------------------------------------

  function formatTime(value) {
    const part = String(value).split('T')[1];
    return part ? part.slice(0, 5) : '--:--';
  }

  function formatDate(value) {
    const parts = String(value).split('T');
    if (parts.length < 2) return value;

    const date = parts[0].split('-');
    return `${date[2]}/${date[1]} · ${parts[1].slice(0, 5)}`;
  }

  // ------------------------------------------------------------
  // CAPAS DE CALOR
  // ------------------------------------------------------------

  function drawHeatLayer(name, points, maximum) {
    const layer = state.layers[name];
    layer.clearLayers();

    const heatPoints = points
      .filter(p => Number.isFinite(p.value))
      .map(p => [
        p.lat,
        p.lon,
        Math.max(0.03, Math.min(1, p.value / maximum))
      ]);

    if (!heatPoints.length) return;

    L.heatLayer(heatPoints, {
      radius: 58,
      blur: 48,
      maxZoom: 11,
      minOpacity: 0.28,
      max: 1,
      gradient: GRADIENTS[name]
    }).addTo(layer);
  }

  // ------------------------------------------------------------
  // FLECHAS DE VIENTO
  // ------------------------------------------------------------

  function drawWindArrows(points) {
    const layer = state.layers.wind;

    points.forEach((point, index) => {
      if (index % 2 !== 0) return;
      if (!Number.isFinite(point.direction)) return;

      const arrow = L.divIcon({
        className: '',
        html: `
          <div class="climag-wind-arrow"
            style="transform:rotate(${point.direction}deg)">
            ↑
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      L.marker([point.lat, point.lon], {
        icon: arrow,
        interactive: false,
        keyboard: false
      }).addTo(layer);
    });
  }

  // ------------------------------------------------------------
  // DIBUJAR PRONÓSTICO
  // ------------------------------------------------------------

  function drawForecast() {
    const frame = state.forecast[state.selectedHour];
    if (!frame) return;

    const name = state.currentLayer;

    if (!['rain', 'temp', 'wind'].includes(name)) return;

    let maximum = 1;

    const points = frame.points.map(point => {
      let value;

      if (name === 'rain') {
        value = point.precipitation;
        maximum = 15;
      } else if (name === 'temp') {
        value = point.temperature;
        maximum = 40;
      } else {
        value = point.wind;
        maximum = 60;
      }

      return { ...point, value };
    });

    drawHeatLayer(name, points, maximum);

    if (name === 'wind') {
      drawWindArrows(frame.points);
    }

    frame.points.forEach(point => {
      const content = `
        <strong>${LAYER_NAMES[name]}</strong><br>
        Temperatura: ${point.temperature ?? '--'} °C<br>
        Precipitación: ${point.precipitation ?? '--'} mm/h<br>
        Probabilidad: ${point.probability ?? '--'}%<br>
        Viento: ${point.wind ?? '--'} km/h<br>
        Dirección: ${point.direction ?? '--'}°<br>
        <small>Open-Meteo · ${formatTime(frame.time)}</small>
      `;

      L.circleMarker([point.lat, point.lon], {
        radius: 2,
        stroke: false,
        fillOpacity: 0
      }).bindPopup(content).addTo(state.layers[name]);
    });
  }

  // ------------------------------------------------------------
  // CALIDAD DEL AIRE
  // ------------------------------------------------------------

  async function loadAir() {
    const center = getCenter();
    const points = createGrid(center.lat, center.lon);

    const lat = points.map(p => p.lat).join(',');
    const lon = points.map(p => p.lon).join(',');

    const url =
      'https://air-quality-api.open-meteo.com/v1/air-quality' +
      `?latitude=${lat}&longitude=${lon}` +
      '&current=european_aqi,pm2_5,pm10&timezone=auto';

    const data = await fetchJSON(url);

    const values = points.map((point, index) => {
      const current = itemAt(data, index)?.current || {};

      return {
        ...point,
        value: current.european_aqi,
        pm25: current.pm2_5,
        pm10: current.pm10
      };
    });

    drawHeatLayer('air', values, 100);

    values.forEach(point => {
      if (!Number.isFinite(point.value)) return;

      L.circleMarker([point.lat, point.lon], {
        radius: 3,
        stroke: false,
        fillOpacity: 0
      }).bindPopup(`
        <strong>Calidad del aire</strong><br>
        Índice europeo: ${point.value}<br>
        PM2.5: ${point.pm25 ?? '--'} µg/m³<br>
        PM10: ${point.pm10 ?? '--'} µg/m³<br>
        <small>Open-Meteo Air Quality</small>
      `).addTo(state.layers.air);
    });

    setStatus('Calidad del aire · Open-Meteo');
  }

  // ------------------------------------------------------------
  // SISMOS
  // ------------------------------------------------------------

  async function loadEarthquakes() {
    const url =
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

    const data = await fetchJSON(url);
    const layer = state.layers.quakes;

    layer.clearLayers();

    (data.features || []).forEach(feature => {
      const coords = feature.geometry?.coordinates;
      const properties = feature.properties || {};

      if (!coords) return;

      const [lon, lat, depth] = coords;
      const magnitude = properties.mag;

      if (!Number.isFinite(magnitude)) return;

      const color = magnitude >= 5
        ? '#d94e4e'
        : magnitude >= 3
          ? '#e69c4e'
          : '#e3c45b';

      const marker = L.circleMarker([lat, lon], {
        radius: Math.max(5, Math.min(17, magnitude * 2.5)),
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9
      });

      marker.bindPopup(`
        <strong>Sismo M${magnitude.toFixed(1)}</strong><br>
        ${escapeHTML(properties.place || 'Lugar desconocido')}<br>
        Profundidad: ${Number(depth).toFixed(1)} km<br>
        Fecha: ${properties.time
          ? new Date(properties.time).toLocaleString()
          : 'Sin fecha'}<br>
        <small>USGS · Últimas 24 horas</small>
      `);

      marker.addTo(layer);
    });

    setStatus(
      `${(data.features || []).length} eventos · USGS · Últimas 24 horas`
    );
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function describeWeatherCode(code) {
    const descriptions = {
      0: 'Despejado',
      1: 'Mayormente despejado',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Niebla',
      48: 'Niebla engelante',
      51: 'Llovizna ligera',
      53: 'Llovizna moderada',
      55: 'Llovizna intensa',
      56: 'Llovizna engelante ligera',
      57: 'Llovizna engelante intensa',
      61: 'Lluvia ligera',
      63: 'Lluvia moderada',
      65: 'Lluvia intensa',
      66: 'Lluvia engelante ligera',
      67: 'Lluvia engelante intensa',
      71: 'Nevada ligera',
      73: 'Nevada moderada',
      75: 'Nevada intensa',
      77: 'Granizo pequeño',
      80: 'Chubascos ligeros',
      81: 'Chubascos moderados',
      82: 'Chubascos fuertes',
      85: 'Chubascos de nieve ligeros',
      86: 'Chubascos de nieve fuertes',
      95: 'Tormenta eléctrica',
      96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo fuerte'
    };
    return descriptions[Number(code)] || 'Estado no disponible';
  }

  // ------------------------------------------------------------
  // SELECCIÓN DE CUALQUIER UBICACIÓN DEL MUNDO
  // ------------------------------------------------------------

  async function selectMapLocation(lat, lon) {
    lat = Number(lat);
    lon = Number(lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    state.center = { lat, lon };
    state.selectedLocation = { lat, lon };
    state.forecast = [];
    state.selectedHour = 0;
    state.requestId++;

    const request = state.requestId;

    if (state.selectedMarker) {
      state.map.removeLayer(state.selectedMarker);
    }

    state.selectedMarker = L.marker([lat, lon], { title: 'Ubicación seleccionada' })
      .addTo(state.map)
      .bindPopup('Consultando el clima de este lugar...')
      .openPopup();

    const title = $('climag-location-title');
    const coords = $('climag-location-coords');
    const values = $('climag-location-values');

    if (title) title.textContent = '📍 Consultando ubicación...';
    if (coords) coords.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    if (values) values.innerHTML = `
      <div class="climag-location-stat">Temperatura<strong>Consultando...</strong></div>
      <div class="climag-location-stat">Sensación térmica<strong>--</strong></div>
      <div class="climag-location-stat">Humedad<strong>--</strong></div>
      <div class="climag-location-stat">Viento<strong>--</strong></div>
    `;

    setStatus('Consultando el clima de la ubicación seleccionada...');

    const weatherUrl =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,' +
      'wind_speed_10m,weather_code,precipitation,pressure_msl,uv_index' +
      '&timezone=auto';

    const placeUrl =
      'https://geocoding-api.open-meteo.com/v1/reverse' +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      '&language=es&format=json';

    try {
      const [weather, placeData] = await Promise.all([
        fetchJSON(weatherUrl),
        fetchJSON(placeUrl).catch(() => ({ results: [] }))
      ]);

      if (request !== state.requestId) return;

      const current = weather.current || {};
      const place = placeData.results?.[0];
      const placeName = place
        ? [place.name, place.admin1, place.country].filter(Boolean).join(', ')
        : 'Ubicación sin nombre';

      if (title) title.textContent = '📍 ' + placeName;
      if (coords) {
        coords.textContent =
          `${lat.toFixed(4)}, ${lon.toFixed(4)} · Datos meteorológicos actuales`;
      }

      if (values) {
        values.innerHTML = `
          <div class="climag-location-stat">🌡️ Temperatura
            <strong>${Number.isFinite(current.temperature_2m) ? current.temperature_2m + ' °C' : '--'}</strong>
          </div>
          <div class="climag-location-stat">🤔 Sensación térmica
            <strong>${Number.isFinite(current.apparent_temperature) ? current.apparent_temperature + ' °C' : '--'}</strong>
          </div>
          <div class="climag-location-stat">💧 Humedad
            <strong>${Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m + '%' : '--'}</strong>
          </div>
          <div class="climag-location-stat">🌬️ Viento
            <strong>${Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m + ' km/h' : '--'}</strong>
          </div>
          <div class="climag-location-stat">🌧️ Precipitación
            <strong>${Number.isFinite(current.precipitation) ? current.precipitation + ' mm' : '--'}</strong>
          </div>
          <div class="climag-location-stat">☀️ Índice UV
            <strong>${Number.isFinite(current.uv_index) ? current.uv_index : '--'}</strong>
          </div>
          <div class="climag-location-stat">🧭 Presión
            <strong>${Number.isFinite(current.pressure_msl) ? current.pressure_msl + ' hPa' : '--'}</strong>
          </div>
          <div class="climag-location-stat">🌤️ Estado del tiempo
            <strong>${escapeHTML(describeWeatherCode(current.weather_code))}</strong>
          </div>
        `;
      }

      const popup = `
        <strong>${escapeHTML(placeName)}</strong><br>
        Temperatura: ${Number.isFinite(current.temperature_2m) ? current.temperature_2m + ' °C' : '--'}<br>
        Sensación: ${Number.isFinite(current.apparent_temperature) ? current.apparent_temperature + ' °C' : '--'}<br>
        Humedad: ${Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m + '%' : '--'}<br>
        Viento: ${Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m + ' km/h' : '--'}<br>
        Estado: ${escapeHTML(describeWeatherCode(current.weather_code))}
      `;
      state.selectedMarker.bindPopup(popup).openPopup();

      await changeLayer(state.currentLayer);
      if (request !== state.requestId) return;

      setStatus(`Clima de ${placeName} · Open-Meteo`);
    } catch (error) {
      console.error('[Clima G] Error al consultar ubicación:', error);
      if (request !== state.requestId) return;
      if (title) title.textContent = 'No se pudo consultar esta ubicación';
      if (coords) coords.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      if (values) {
        values.innerHTML = '<div class="climag-location-stat">No hay datos disponibles en este momento.</div>';
      }
      setStatus('No se pudieron cargar los datos de este punto.', true);
    }
  }

  // ------------------------------------------------------------
  // LÍNEA DE TIEMPO
  // ------------------------------------------------------------

  function renderHour() {
    const frame = state.forecast[state.selectedHour];
    if (!frame) return;

    $('climag-hour').textContent = formatDate(frame.time);
    $('climag-slider').value = state.selectedHour;

    if (['rain', 'temp', 'wind'].includes(state.currentLayer)) {
      drawForecast();
    }
  }

  function stopAnimation() {
    state.playing = false;

    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }

    if ($('climag-play')) {
      $('climag-play').textContent = '▶ Reproducir';
    }
  }

  function startAnimation() {
    if (!state.forecast.length) return;

    if (!['rain', 'temp', 'wind'].includes(state.currentLayer)) {
      return;
    }

    stopAnimation();

    state.playing = true;
    $('climag-play').textContent = 'Ⅱ Pausar';

    state.timer = setInterval(() => {
      state.selectedHour++;

      if (state.selectedHour >= state.forecast.length) {
        state.selectedHour = 0;
      }

      renderHour();
    }, CONFIG.animationSpeed);
  }

  // ------------------------------------------------------------
  // CAMBIO DE CAPAS
  // ------------------------------------------------------------

  async function changeLayer(name) {
    if (!LAYER_NAMES[name] || !state.map) return;

    stopAnimation();

    state.currentLayer = name;

    Object.keys(state.layers).forEach(key => {
      state.map.removeLayer(state.layers[key]);
    });

    state.layers[name].addTo(state.map);

    document.querySelectorAll('.map-btn').forEach(button => {
      const selected =
        button.dataset.layer === name ||
        button.getAttribute('onclick')?.includes(`'${name}'`);

      button.classList.toggle('active', Boolean(selected));
    });

    const timelineControls = $('climag-topline');

    if (timelineControls) {
      timelineControls.style.display =
        name === 'air' || name === 'quakes' ? 'none' : '';
    }

    const slider = $('climag-slider');

    if (slider) {
      slider.style.display =
        name === 'air' || name === 'quakes' ? 'none' : '';
    }

    updateLegend(name);

    try {
      if (name === 'air') {
        setStatus('Consultando calidad del aire...');
        await loadAir();

      } else if (name === 'quakes') {
        setStatus('Consultando sismos...');
        await loadEarthquakes();

      } else {
        if (!state.forecast.length) {
          setStatus('Descargando pronóstico...');
          await loadForecast();
        }

        renderHour();
        setStatus('Pronóstico horario · Open-Meteo');
      }
    } catch (error) {
      console.error('[Clima G] Error de capa:', error);
      setStatus('No se pudieron cargar los datos.', true);
    }
  }

  // ------------------------------------------------------------
  // INICIALIZACIÓN
  // ------------------------------------------------------------

  async function inicializarMapaClima() {
    if (state.loading) return;

    state.loading = true;

    try {
      prepareInterface();
      setStatus('Preparando mapa meteorológico...');

      await loadLibraries();

      createMap();

      // El mapa abre con una vista mundial. El pronóstico inicial se prepara
      // alrededor de la ubicación principal, pero no limita la exploración.
      if (!state.forecast.length) {
        await loadForecast();
      }

      await changeLayer(state.currentLayer);

      setTimeout(() => {
        if (state.map) state.map.invalidateSize();
      }, 250);

    } catch (error) {
      console.error('[Clima G] Error de inicialización:', error);
      setStatus('No se pudo iniciar el mapa. Revisá la conexión.', true);

    } finally {
      state.loading = false;
    }
  }

  // ------------------------------------------------------------
  // ACTUALIZAR UBICACIÓN
  // ------------------------------------------------------------

  async function actualizarCentroMapaClima(lat, lon) {
    lat = Number(lat);
    lon = Number(lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    state.center = { lat, lon };
    state.forecast = [];
    state.selectedHour = 0;
    state.requestId++;

    stopAnimation();

    if (!state.map) return;

    state.map.setView([lat, lon], CONFIG.zoom);

    const request = state.requestId;

    try {
      setStatus('Actualizando ubicación...');

      await loadForecast();

      if (request !== state.requestId) return;

      await changeLayer(state.currentLayer);

    } catch (error) {
      console.error('[Clima G] Error de ubicación:', error);
      setStatus('No se pudo actualizar la ubicación.', true);
    }
  }

  // ------------------------------------------------------------
  // API PÚBLICA
  // ------------------------------------------------------------

  window.inicializarMapaClima = inicializarMapaClima;
  window.actualizarCentroMapaClima = actualizarCentroMapaClima;
  window.cambiarCapaMapa = changeLayer;
  window.seleccionarUbicacionMapaClima = selectMapLocation;

})();
