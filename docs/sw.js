
'use strict';

const CACHE_NAME = 'clima-g-v1.32.0';

// Solo se permiten estos dominios HTTPS.
const DOMINIOS_APIS = [
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'nominatim.openstreetmap.org',
  'windy.com',
  'gdacs.org',
  'usgs.gov'
];

const MAX_TEXTO = 180;

// Comprueba que una URL pertenezca a Clima G.
function esURLLocal(valor) {
  try {
    const url = new URL(valor, self.location.origin);

    return (
      url.origin === self.location.origin &&
      url.protocol === 'https:'
    );
  } catch {
    return false;
  }
}

// Instalación.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación y limpieza.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Caché segura de consultas meteorológicas.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;

  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (
    url.protocol !== 'https:' ||
    !DOMINIOS_APIS.includes(url.hostname)
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const response = await fetch(request);

        if (response.ok && response.type !== 'opaque') {
          try {
            await cache.put(request, response.clone());
          } catch {
            // Un fallo de caché no debe bloquear la consulta.
          }
        }

        return response;
      } catch {
        const cached = await cache.match(request);

        if (cached) return cached;

        return new Response(
          JSON.stringify({
            error: 'Sin conexión y sin datos guardados.'
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    })()
  );
});

// Convierte el contenido Push en datos seguros.
function obtenerDatosPush(event) {
  if (!event.data) return null;

  try {
    const datos = event.data.json();

    if (!datos || typeof datos !== 'object') {
      return null;
    }

    const titulo =
      typeof datos.title === 'string'
        ? datos.title.slice(0, MAX_TEXTO)
        : 'Clima G';

    const cuerpo =
      typeof datos.body === 'string'
        ? datos.body.slice(0, MAX_TEXTO)
        : 'Hay una actualización meteorológica.';

    const destino =
      typeof datos.url === 'string' &&
      esURLLocal(datos.url)
        ? new URL(datos.url, self.location.origin).href
        : self.location.origin + '/';

    return { titulo, cuerpo, destino };
  } catch {
    return null;
  }
}

// Recepción de notificaciones Push.
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const datos = obtenerDatosPush(event);

      if (!datos) return;

      await self.registration.showNotification(
        datos.titulo,
        {
          body: datos.cuerpo,
          icon: './icon-192.png',
          badge: './icon-192.png',
          tag: 'clima-g-alerta',
          renotify: false,
          data: {
            url: datos.destino
          }
        }
      );
    })()
  );
});

// Compatibilidad con el mensaje local del index.html.
self.addEventListener('message', (event) => {
  if (
    !event.data ||
    event.data.type !== 'DISPARAR_NOTIFICACION'
  ) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification('Clima G', {
      body: 'Hay una actualización meteorológica.',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: 'clima-g-local'
    })
  );
});

// Acción al tocar una notificación.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const destino = event.notification.data?.url;

      const url = esURLLocal(destino)
        ? new URL(destino, self.location.origin).href
        : self.location.origin + '/';

      const ventanas = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const ventana of ventanas) {
        if (ventana.url.startsWith(self.location.origin)) {
          await ventana.focus();

          if (ventana.navigate) {
            await ventana.navigate(url);
          }

          return;
        }
      }

      await self.clients.openWindow(url);
    })()
  );
});
