const CACHE_NAME = 'clima-gps-v1';
// Archivos esenciales de tu app que se guardarán para funcionar offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// 1. Instalación: Guarda los recursos clave en el caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Abriendo caché y guardando recursos de Clima GPS');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpia cachés antiguas si actualizas la app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptar peticiones (Fetch): Intenta ir a la red, si falla usa el caché
self.addEventListener('fetch', (event) => {
  // Omitimos peticiones a la API del clima (Open-Meteo) para que siempre busque datos frescos en vivo
  if (event.request.url.includes('api.open-meteo.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la red responde bien, clonamos la respuesta y la guardamos
        return response;
      })
      .catch(() => {
        // Si no hay internet, devolvemos lo que tengamos en el caché local
        return caches.match(event.request);
      })
  );
});
