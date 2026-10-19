const CACHE_NAME = 'clima-gps-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// 1. Instalación: Guarda los recursos clave en el caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Abriendo caché y guardando recursos de Clima G');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activación: Limpia cachés antiguas
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

// 3. Interceptar peticiones (Fetch): Red primero, fallback a caché (omitiendo APIs externas de clima)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('api.open-meteo.com') || 
      event.request.url.includes('air-quality-api.open-meteo.com') ||
      event.request.url.includes('rainviewer.com') ||
      event.request.url.includes('nominatim.openstreetmap.org')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// 4. Manejo de Notificaciones Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Clima G', body: 'Actualización del clima disponible.' };
  
  const options = {
    body: data.body,
    icon: 'https://img.icons8.com/color/192/partly-cloudy-day--v1.png',
    badge: 'https://img.icons8.com/color/192/partly-cloudy-day--v1.png',
    vibrate: [200, 100, 200],
    data: { dateOfArrival: Date.now() }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 5. Abrir la app al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('./');
    })
  );
});
