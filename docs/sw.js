const CACHE_NAME = 'clima-gps-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg'
];

// Instalación y caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activación y limpieza
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar peticiones omitiendo APIs externas
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('api.open-meteo.com') || 
      event.request.url.includes('air-quality-api.open-meteo.com') ||
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('windy.com') ||
      event.request.url.includes('gdacs.org') ||
      event.request.url.includes('usgs.gov')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 🔔 RECEPCIÓN DE WEB PUSH NATIVO (Desde la nube / GitHub Actions)
self.addEventListener('push', (event) => {
  let data = { title: '🐢 Clima G - Imperio de Baco', body: 'Actualización meteorológica.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './favicon.svg',
    badge: './favicon.svg',
    vibrate: [200, 100, 200],
    data: { url: './' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Abrir la PWA al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('./');
    })
  );
});
