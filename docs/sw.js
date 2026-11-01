
'use strict';

// ==========================================
// CLIMA G — SERVICE WORKER OFFLINE ENGINE
// Version 1.33.0
// ==========================================

const VERSION = '1.33.0';

const CACHE_APP = `clima-g-app-v${VERSION}`;

// Esta caché se conserva entre actualizaciones.
const CACHE_DATOS = 'clima-g-weather-data-v1';

const MAX_TEXTO = 180;

const DOMINIOS_APIS = [
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'nominatim.openstreetmap.org',
  'windy.com',
  'gdacs.org',
  'usgs.gov'
];

const ARCHIVOS_APP = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ==========================================
// UTILIDADES
// ==========================================

function esURLLocal(valor) {
  try {
    const url = new URL(valor, self.location.origin);

    return (
      url.origin === self.location.origin &&
      (
        url.protocol === 'https:' ||
        url.hostname === 'localhost'
      )
    );
  } catch {
    return false;
  }
}

function esAPIpermitida(url) {
  return (
    url.protocol === 'https:' &&
    DOMINIOS_APIS.includes(url.hostname)
  );
}

function esRespuestaValida(response) {
  return (
    response &&
    response.ok &&
    response.type !== 'opaque'
  );
}

// Agrega información sobre el origen de los datos.
function marcarRespuesta(response, origen) {
  const headers = new Headers(response.headers);

  headers.set('X-Clima-G-Source', origen);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// ==========================================
// INSTALACIÓN
// ==========================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_APP);

      // Guarda individualmente los archivos existentes.
      // Un archivo ausente no cancela toda la instalación.
      await Promise.all(
        ARCHIVOS_APP.map(async (archivo) => {
          try {
            const url = new URL(archivo, self.registration.scope);

            const response = await fetch(url);

            if (esRespuestaValida(response)) {
              await cache.put(url, response);
            }
          } catch {
            // Se intentará recuperar cuando haya conexión.
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

// ==========================================
// ACTIVACIÓN
// ==========================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map(async (key) => {
          // Elimina versiones anteriores de la app,
          // pero conserva los datos meteorológicos.
          if (
            key.startsWith('clima-g-app-') &&
            key !== CACHE_APP
          ) {
            await caches.delete(key);
          }
        })
      );

      await self.clients.claim();
    })()
  );
});

// ==========================================
// 1. DATOS METEOROLÓGICOS OFFLINE
// ==========================================

async function obtenerDatosAPI(request) {
  const cache = await caches.open(CACHE_DATOS);

  try {
    // Primero intenta conseguir datos nuevos.
    const response = await fetch(request);

    if (esRespuestaValida(response)) {
      try {
        // Guarda la última respuesta correcta.
        await cache.put(request, response.clone());
      } catch {
        // Si falla el almacenamiento, conserva la respuesta.
      }

      return marcarRespuesta(response, 'online');
    }

    // Si el servidor responde con error,
    // intenta recuperar la última consulta guardada.
    const anterior = await cache.match(request);

    if (anterior) {
      return marcarRespuesta(anterior, 'offline-cache');
    }

    return response;

  } catch {
    // Sin conexión: recupera datos anteriores.
    const anterior = await cache.match(request);

    if (anterior) {
      return marcarRespuesta(anterior, 'offline-cache');
    }

    return new Response(
      JSON.stringify({
        error: 'Sin conexión y sin datos guardados.',
        offline: true,
        source: 'none'
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Clima-G-Source': 'offline-empty'
        }
      }
    );
  }
}

// ==========================================
// 2. INTERFAZ OFFLINE
// ==========================================

async function obtenerPagina(request) {
  const cache = await caches.open(CACHE_APP);

  try {
    const response = await fetch(request);

    if (esRespuestaValida(response)) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // No bloquear la navegación.
      }

      return response;
    }

    const anterior = await cache.match(request);

    if (anterior) return anterior;

    throw new Error('Página no disponible');

  } catch {
    const anterior = await cache.match(request);

    if (anterior) return anterior;

    const inicio = await cache.match(
      new URL('./index.html', self.registration.scope)
    );

    if (inicio) return inicio;

    return new Response(
      '<h1>Clima G</h1><p>Sin conexión. Intentá nuevamente.</p>',
      {
        status: 503,
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      }
    );
  }
}

// ==========================================
// 3. RECURSOS DE LA APLICACIÓN
// ==========================================

async function obtenerRecurso(request) {
  const cache = await caches.open(CACHE_APP);

  const anterior = await cache.match(request);

  // Devuelve inmediatamente el archivo guardado.
  // Actualiza la caché cuando hay conexión.
  const actualizacion = (async () => {
    try {
      const response = await fetch(request);

      if (esRespuestaValida(response)) {
        await cache.put(request, response.clone());
      }
    } catch {
      // Se conserva el archivo anterior.
    }
  })();

  if (anterior) {
    // No es necesario esperar la actualización.
    return anterior;
  }

  await actualizacion;

  const nuevo = await cache.match(request);

  if (nuevo) return nuevo;

  return new Response('Recurso no disponible sin conexión.', {
    status: 503
  });
}

// ==========================================
// 4. INTERCEPTOR PRINCIPAL
// ==========================================

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  let url;

  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Consultas meteorológicas externas.
  if (esAPIpermitida(url)) {
    event.respondWith(obtenerDatosAPI(request));
    return;
  }

  // Solo administra recursos del propio sitio.
  if (url.origin !== self.location.origin) return;

  // Navegación HTML.
  if (request.mode === 'navigate') {
    event.respondWith(obtenerPagina(request));
    return;
  }

  // Archivos CSS, JS, imágenes y otros recursos.
  event.respondWith(obtenerRecurso(request));
});

// ==========================================
// 5. NOTIFICACIONES PUSH
// ==========================================

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
        : self.registration.scope;

    return { titulo, cuerpo, destino };

  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      const datos = obtenerDatosPush(event);

      if (!datos) return;

      const icono = new URL(
        './icon-192.png',
        self.registration.scope
      ).href;

      await self.registration.showNotification(
        datos.titulo,
        {
          body: datos.cuerpo,
          icon: icono,
          badge: icono,
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

// ==========================================
// 6. NOTIFICACIÓN LOCAL
// ==========================================

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
      icon: new URL(
        './icon-192.png',
        self.registration.scope
      ).href,
      tag: 'clima-g-local'
    })
  );
});

// ==========================================
// 7. ABRIR NOTIFICACIONES
// ==========================================

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const destino = event.notification.data?.url;

      const url = esURLLocal(destino)
        ? new URL(destino, self.location.origin).href
        : self.registration.scope;

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
