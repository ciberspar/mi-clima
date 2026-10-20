const CACHE_NAME = 'clima-g-v1.31.0';

// Lista blanca de dominios permitidos para las APIs (Validación estricta de hostname)
const DOMINIOS_APIS = [
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'nominatim.openstreetmap.org',
  'windy.com',
  'gdacs.org',
  'usgs.gov'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones de red con seguridad mejorada
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Validación robusta contra falsificaciones de URL (Soluciona alerta de CodeQL)
  if (DOMINIOS_APIS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            // Actualizamos la caché con la respuesta fresca de la red
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => {
            // Si no hay conexión, recurrimos a lo que tengamos en caché
            return cache.match(event.request);
          });
      })
    );
  }
});
