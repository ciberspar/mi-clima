const CACHE_NAME = 'clima-gps-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg'
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

// 3. Interceptar peticiones (Fetch): Red primero, fallback a caché (omitiendo APIs externas)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('api.open-meteo.com') || 
      event.request.url.includes('air-quality-api.open-meteo.com') ||
      event.request.url.includes('rainviewer.com') ||
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('windy.com') ||
      event.request.url.includes('gdacs.org') ||
      event.request.url.includes('usgs.gov')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// 4. Recibir mensajes desde la PWA para mostrar notificaciones nativas locales
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'DISPARAR_NOTIFICACION') {
    const { titulo, cuerpo } = event.data;
    
    const options = {
      body: cuerpo,
      icon: 'favicon.svg',
      badge: 'favicon.svg',
      vibrate: [200, 100, 200],
      data: { dateOfArrival: Date.now() }
    };

    event.waitUntil(
      self.registration.showNotification(titulo, options)
    );
  }
});

// 5. Manejo de Notificaciones Push Web Estándar
self.addEventListener('push', (event) => {
  let datos = { title: 'Clima G', body: 'Actualización del clima disponible.' };
  
  if (event.data) {
    try {
      datos = event.data.json();
    } catch (e) {
      datos.body = event.data.text();
    }
  }

  const options = {
    body: datos.body || datos.mensaje,
    icon: 'favicon.svg',
    badge: 'favicon.svg',
    vibrate: [200, 100, 200],
    data: { dateOfArrival: Date.now() }
  };

  event.waitUntil(
    self.registration.showNotification(datos.title || datos.titulo || 'Clima G', options)
  );
});

// 6. Abrir la app al hacer clic en la notificación
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
