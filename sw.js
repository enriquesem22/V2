const CACHE_NAME = 'return-app-v29';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tracking.js',
  '/data/watchlist.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://apis.google.com/js/api.js',
  'https://accounts.google.com/gsi/client'
];

// Instalar: cachear archivos principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cachear assets locales (los externos pueden fallar, no pasa nada)
      return cache.addAll([
        '/index.html',
        '/manifest.json',
        '/tracking.js',
        '/data/watchlist.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activar: limpiar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets locales, network-first para APIs
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // APIs externas (Google Drive, OpenAI, Gemini): siempre red
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('openai.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('generativelanguage.google') ||
      url.hostname.includes('accounts.google.com')) {
    return; // Dejar pasar sin interceptar
  }

  // Watchlist base: intentar red primero para recibir cambios nuevos
  if (url.pathname.endsWith('/data/watchlist.json')) {
    e.respondWith(
      fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache));
        }
        return response;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets locales: cache-first con fallback a red
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cachear si es una respuesta válida
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache));
        }
        return response;
      }).catch(() => {
        // Sin red y sin caché: devolver el HTML principal
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Mensaje para forzar actualización
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
