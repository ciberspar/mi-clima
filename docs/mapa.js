
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
    requestId: 0
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
    }).setView([center.lat, center.lon], CONFIG.zoom);

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

      const center = getCenter();
      state.map.setView([center.lat, center.lon], CONFIG.zoom);

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

})();
