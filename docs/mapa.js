
/* ==========================================================
   CLIMA G — MOTOR DEL MAPA PROPIO
   Leaflet + Open-Meteo + USGS
   5 capas + pronóstico horario de 24 horas.
   ========================================================== */

(() => {
  'use strict';

  const CONFIG = {
    defaultLat: -31.42,
    defaultLon: -64.18,
    gridSize: 5,
    gridStep: 0.30,
    forecastHours: 24,
    animationSpeed: 900
  };

  const LAYERS = {
    rain: '🌧️ Precipitación',
    temp: '🌡️ Temperatura',
    wind: '🌬️ Viento',
    air: '🌫️ Calidad del aire',
    quakes: '🌎 Sismos'
  };

  const state = {
    map: null,
    layers: {},
    center: null,
    currentLayer: 'rain',
    forecast: [],
    selectedHour: 0,
    playing: false,
    animation: null,
    loading: false,
    lastUpdate: null
  };

  const $ = id => document.getElementById(id);

  // ----------------------------------------------------------
  // UBICACIÓN
  // ----------------------------------------------------------

  function coordinates() {
    if (state.center) {
      return { ...state.center };
    }

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

  // ----------------------------------------------------------
  // ESTADO Y MENSAJES
  // ----------------------------------------------------------

  function status(message, error = false) {
    const element = $('climag-map-status');
    if (!element) return;

    element.textContent = message;
    element.style.color = error ? '#d9534f' : '';
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

  // ----------------------------------------------------------
  // LEAFLET
  // ----------------------------------------------------------

  function loadLeaflet() {
    if (!document.querySelector('[data-climag-css]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.dataset.climagCss = 'true';
      document.head.appendChild(css);
    }

    if (window.L) return Promise.resolve();

    if (window.climagLeafletPromise) {
      return window.climagLeafletPromise;
    }

    window.climagLeafletPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');

      script.src =
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

      script.onload = () => {
        if (window.L) {
          resolve();
        } else {
          reject(new Error('Leaflet no disponible'));
        }
      };

      script.onerror = () => {
        window.climagLeafletPromise = null;
        reject(new Error('No se pudo cargar Leaflet'));
      };

      document.head.appendChild(script);
    });

    return window.climagLeafletPromise;
  }

  // ----------------------------------------------------------
  // INTERFAZ
  // ----------------------------------------------------------

  function prepareInterface() {
    const container = $('map-container');

    if (!container) {
      throw new Error('No existe map-container');
    }

    // No reconstruir el mapa si ya existe.
    if (!$('climag-map')) {
      const mapElement = document.createElement('div');
      mapElement.id = 'climag-map';
      mapElement.style.cssText =
        'height:100%;min-height:360px;width:100%;';

      container.appendChild(mapElement);
    }

    let timeline = $('climag-timeline');

    if (!timeline) {
      timeline = document.createElement('section');
      timeline.id = 'climag-timeline';

      timeline.style.cssText = `
        background:var(--mist, #f3f6fa);
        border:1px solid var(--line, #dce3eb);
        border-radius:16px;
        padding:13px;
        margin:0 0 12px;
        color:var(--ink, #263445);
      `;

      timeline.innerHTML = `
        <div id="climag-timeline-controls">

          <div style="display:flex;justify-content:space-between;
            align-items:center;gap:10px;margin-bottom:10px;">

            <div>
              <div style="font-size:.75rem;
                color:var(--muted, #778494);
                font-weight:600;">
                PRONÓSTICO DEL MAPA
              </div>

              <div id="climag-hour"
                style="font-size:1.35rem;font-weight:800;">
                Cargando...
              </div>
            </div>

            <button id="climag-play" type="button"
              style="border:0;border-radius:12px;
              padding:10px 15px;
              background:var(--sky-800, #3478b9);
              color:white;font-weight:700;">
              ▶ Reproducir
            </button>

          </div>

          <input id="climag-slider" type="range"
            min="0" max="23" value="0" step="1"
            aria-label="Hora del pronóstico"
            style="width:100%;accent-color:var(--sky-800, #3478b9);">

          <div style="display:flex;justify-content:space-between;
            font-size:.7rem;color:var(--muted, #778494);">
            <span id="climag-start">--</span>
            <span id="climag-end">--</span>
          </div>

        </div>

        <div id="climag-map-status"
          style="font-size:.72rem;
          color:var(--muted, #778494);
          text-align:center;margin-top:9px;">
          Preparando mapa...
        </div>
      `;

      container.parentNode.insertBefore(timeline, container);
    }

    // Registrar eventos una sola vez.
    if (timeline.dataset.climagBound !== 'true') {
      $('climag-slider').addEventListener('input', event => {
        stopAnimation();
        state.selectedHour = Number(event.target.value);
        renderSelectedHour();
      });

      $('climag-play').addEventListener('click', () => {
        state.playing
          ? stopAnimation()
          : startAnimation();
      });

      timeline.dataset.climagBound = 'true';
    }
  }

  // ----------------------------------------------------------
  // CREAR MAPA
  // ----------------------------------------------------------

  function createMap() {
    if (state.map) return;

    const { lat, lon } = coordinates();

    state.map = L.map('climag-map', {
      zoomControl: true
    }).setView([lat, lon], 7);

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }
    ).addTo(state.map);

    Object.keys(LAYERS).forEach(key => {
      state.layers[key] = L.layerGroup();
    });

    state.layers[state.currentLayer].addTo(state.map);
  }

  // ----------------------------------------------------------
  // GRILLA METEOROLÓGICA
  // ----------------------------------------------------------

  function makeGrid(lat, lon) {
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

  // ----------------------------------------------------------
  // CONEXIÓN CON APIS
  // ----------------------------------------------------------

  async function fetchJSON(url) {
    const response = await fetch(url, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  }

  function getPointData(data, index) {
    return Array.isArray(data) ? data[index] : data;
  }

  // ----------------------------------------------------------
  // PRONÓSTICO OPEN-METEO
  // ----------------------------------------------------------

  async function loadForecast() {
    const center = coordinates();
    const points = makeGrid(center.lat, center.lon);

    const latitudes = points.map(p => p.lat).join(',');
    const longitudes = points.map(p => p.lon).join(',');

    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${latitudes}` +
      `&longitude=${longitudes}` +
      '&hourly=temperature_2m,precipitation,' +
      'precipitation_probability,wind_speed_10m,' +
      'wind_direction_10m' +
      '&forecast_days=2&timezone=auto';

    const data = await fetchJSON(url);

    const first = getPointData(data, 0);
    const times = first?.hourly?.time;

    if (!times?.length) {
      throw new Error('Pronóstico horario vacío');
    }

    state.forecast = times
      .slice(0, CONFIG.forecastHours)
      .map((time, hour) => ({
        time,
        points: points.map((point, index) => {
          const item = getPointData(data, index);
          const hourly = item?.hourly;

          return {
            ...point,
            temperature: hourly?.temperature_2m?.[hour],
            precipitation: hourly?.precipitation?.[hour],
            probability:
              hourly?.precipitation_probability?.[hour],
            wind: hourly?.wind_speed_10m?.[hour],
            direction: hourly?.wind_direction_10m?.[hour]
          };
        })
      }));

    $('climag-slider').max =
      Math.max(0, state.forecast.length - 1);

    $('climag-start').textContent =
      formatTime(state.forecast[0].time);

    $('climag-end').textContent =
      formatTime(state.forecast[state.forecast.length - 1].time);

    state.selectedHour = 0;
    $('climag-slider').value = 0;
  }

  // ----------------------------------------------------------
  // FORMATO DE FECHAS
  // ----------------------------------------------------------

  function formatTime(value) {
    const time = String(value).split('T')[1];
    return time ? time.slice(0, 5) : '--:--';
  }

  function formatDateTime(value) {
    const [date, time] = String(value).split('T');

    if (!date || !time) return value;

    const [year, month, day] = date.split('-');

    return `${day}/${month} · ${time.slice(0, 5)}`;
  }

  // ----------------------------------------------------------
  // COLORES METEOROLÓGICOS
  // ----------------------------------------------------------

  function temperatureColor(value) {
    if (value < 0) return '#6489ed';
    if (value < 10) return '#55b8e5';
    if (value < 20) return '#55bd9b';
    if (value < 30) return '#efb75c';
    return '#e96e61';
  }

  function rainColor(value) {
    if (value < 0.5) return '#8fc9e9';
    if (value < 2) return '#50a9e1';
    if (value < 5) return '#367ed0';
    if (value < 10) return '#655acb';
    return '#a04fc2';
  }

  function windColor(value) {
    if (value < 10) return '#65c99e';
    if (value < 25) return '#49b8b8';
    if (value < 40) return '#e4b35b';
    return '#e66d65';
  }

  // ----------------------------------------------------------
  // DIBUJAR PRONÓSTICO
  // ----------------------------------------------------------

  function drawForecast() {
    const frame = state.forecast[state.selectedHour];
    if (!frame) return;

    const layer = state.layers[state.currentLayer];
    if (!layer) return;

    layer.clearLayers();

    frame.points.forEach(point => {
      let value;
      let unit;
      let color;
      let label;

      if (state.currentLayer === 'rain') {
        value = point.precipitation;
        unit = 'mm/h';
        color = rainColor(value || 0);
        label = 'Precipitación horaria';
      } else if (state.currentLayer === 'temp') {
        value = point.temperature;
        unit = '°C';
        color = temperatureColor(value ?? 0);
        label = 'Temperatura';
      } else if (state.currentLayer === 'wind') {
        value = point.wind;
        unit = 'km/h';
        color = windColor(value || 0);
        label = 'Velocidad del viento';
      }

      if (!Number.isFinite(value)) return;

      const circle = L.circle(
        [point.lat, point.lon],
        {
          radius: 19000,
          color,
          fillColor: color,
          fillOpacity: 0.38,
          weight: 1
        }
      );

      circle.bindPopup(`
        <strong>${label}</strong><br>
        ${value} ${unit}<br>
        Probabilidad de lluvia:
        ${point.probability ?? 'Sin datos'}%<br>
        Viento: ${point.wind ?? '--'} km/h<br>
        Dirección: ${point.direction ?? '--'}°<br>
        <small>Open-Meteo · ${formatTime(frame.time)}</small>
      `);

      circle.addTo(layer);
    });
  }

  // ----------------------------------------------------------
  // CALIDAD DEL AIRE
  // ----------------------------------------------------------

  async function loadAir() {
    const center = coordinates();
    const points = makeGrid(center.lat, center.lon);

    const latitudes = points.map(p => p.lat).join(',');
    const longitudes = points.map(p => p.lon).join(',');

    const url =
      'https://air-quality-api.open-meteo.com/v1/air-quality' +
      `?latitude=${latitudes}` +
      `&longitude=${longitudes}` +
      '&current=european_aqi,pm2_5,pm10&timezone=auto';

    const data = await fetchJSON(url);
    const layer = state.layers.air;

    layer.clearLayers();

    points.forEach((point, index) => {
      const item = getPointData(data, index);
      const current = item?.current;
      const aqi = current?.european_aqi;

      if (!Number.isFinite(aqi)) return;

      const color = aqi <= 20 ? '#55b98c'
        : aqi <= 40 ? '#a9c85c'
        : aqi <= 60 ? '#e4c35a'
        : aqi <= 80 ? '#e79550'
        : '#d65e5e';

      L.circle([point.lat, point.lon], {
        radius: 19000,
        color,
        fillColor: color,
        fillOpacity: 0.42,
        weight: 1
      }).bindPopup(`
        <strong>Calidad del aire</strong><br>
        Índice europeo: ${aqi}<br>
        PM2.5: ${current.pm2_5 ?? '--'} µg/m³<br>
        PM10: ${current.pm10 ?? '--'} µg/m³<br>
        <small>Open-Meteo Air Quality</small>
      `).addTo(layer);
    });

    status('Calidad del aire · Índice europeo · Open-Meteo');
  }

  // ----------------------------------------------------------
  // SISMOS USGS
  // ----------------------------------------------------------

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

      const color = magnitude >= 5 ? '#d84c4c'
        : magnitude >= 3 ? '#e5a04e'
        : '#e4c35a';

      L.circleMarker([lat, lon], {
        radius: Math.max(5, Math.min(16, magnitude * 2.3)),
        color,
        fillColor: color,
        fillOpacity: 0.78,
        weight: 1
      }).bindPopup(`
        <strong>Sismo M${magnitude.toFixed(1)}</strong><br>
        Lugar: ${escapeHTML(properties.place || 'Desconocido')}<br>
        Profundidad: ${Number(depth).toFixed(1)} km<br>
        Fecha: ${properties.time
          ? new Date(properties.time).toLocaleString()
          : 'Sin fecha'}<br>
        <small>USGS · Últimas 24 horas</small>
      `).addTo(layer);
    });

    status(
      `${(data.features || []).length} eventos · USGS · Últimas 24 horas`
    );
  }

  // ----------------------------------------------------------
  // LÍNEA DE TIEMPO
  // ----------------------------------------------------------

  function renderSelectedHour() {
    const frame = state.forecast[state.selectedHour];
    if (!frame) return;

    $('climag-hour').textContent =
      formatDateTime(frame.time);

    $('climag-slider').value = state.selectedHour;

    if (['rain', 'temp', 'wind'].includes(state.currentLayer)) {
      drawForecast();
    }
  }

  function stopAnimation() {
    state.playing = false;

    if (state.animation) {
      clearInterval(state.animation);
      state.animation = null;
    }

    const button = $('climag-play');

    if (button) {
      button.textContent = '▶ Reproducir';
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

    state.animation = setInterval(() => {
      state.selectedHour++;

      if (state.selectedHour >= state.forecast.length) {
        state.selectedHour = 0;
      }

      renderSelectedHour();
    }, CONFIG.animationSpeed);
  }

  // ----------------------------------------------------------
  // CAMBIAR CAPAS
  // ----------------------------------------------------------

  async function changeLayer(layer) {
    if (!LAYERS[layer] || !state.map) return;

    stopAnimation();

    state.currentLayer = layer;

    Object.keys(state.layers).forEach(key => {
      state.map.removeLayer(state.layers[key]);
    });

    state.layers[layer].addTo(state.map);

    document.querySelectorAll('.map-btn').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.layer === layer ||
        button.getAttribute('onclick')?.includes(`'${layer}'`)
      );
    });

    // Mantener visible el estado incluso en aire y sismos.
    const controls = $('climag-timeline-controls');

    if (controls) {
      controls.style.display =
        layer === 'air' || layer === 'quakes' ? 'none' : '';
    }

    try {
      if (layer === 'air') {
        status('Consultando calidad del aire...');
        await loadAir();

      } else if (layer === 'quakes') {
        status('Consultando sismos...');
        await loadEarthquakes();

      } else {
        if (!state.forecast.length) {
          status('Descargando pronóstico...');
          await loadForecast();
        }

        renderSelectedHour();
        status('Pronóstico horario · Open-Meteo');
      }

    } catch (error) {
      console.error('[Clima G] Error de capa:', error);
      status('No se pudieron cargar los datos de esta capa.', true);
    }
  }

  // ----------------------------------------------------------
  // INICIALIZAR MAPA
  // ----------------------------------------------------------

  async function inicializarMapaClima() {
    if (state.loading) return;

    state.loading = true;

    try {
      prepareInterface();

      status('Iniciando mapa...');

      await loadLeaflet();

      createMap();

      const center = coordinates();

      state.map.setView(
        [center.lat, center.lon],
        7
      );

      if (!state.forecast.length) {
        status('Descargando pronóstico horario...');
        await loadForecast();
      }

      await changeLayer(state.currentLayer);

      setTimeout(() => {
        if (state.map) {
          state.map.invalidateSize();
        }
      }, 250);

      state.lastUpdate = Date.now();

    } catch (error) {
      console.error('[Clima G] Error al iniciar mapa:', error);
      status(
        'No se pudo iniciar el mapa. Revisá la conexión.',
        true
      );

    } finally {
      state.loading = false;
    }
  }

  // ----------------------------------------------------------
  // ACTUALIZAR UBICACIÓN
  // ----------------------------------------------------------

  async function actualizarCentroMapaClima(lat, lon) {
    lat = Number(lat);
    lon = Number(lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return;
    }

    // Guardar la nueva ubicación para todas las capas.
    state.center = { lat, lon };

    state.forecast = [];
    state.selectedHour = 0;

    if (!state.map) return;

    state.map.setView([lat, lon], 7);

    stopAnimation();

    try {
      status('Actualizando ubicación...');

      await loadForecast();

      await changeLayer(state.currentLayer);

      state.lastUpdate = Date.now();

    } catch (error) {
      console.error(
        '[Clima G] Error al cambiar ubicación:',
        error
      );

      status('No se pudo actualizar la ubicación.', true);
    }
  }

  // ----------------------------------------------------------
  // API PÚBLICA
  // ----------------------------------------------------------

  window.inicializarMapaClima =
    inicializarMapaClima;

  window.actualizarCentroMapaClima =
    actualizarCentroMapaClima;

  window.cambiarCapaMapa =
    changeLayer;

})();
