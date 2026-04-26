const CACHE_NAME = 'return-app-v30';

const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/tracking.js',
  '/data/watchlist.json',
  '/data/watchlist-manresa.json',
  '/data/watchlist-san-juan.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar: cachear archivos locales principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS))
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

// Fetch: cache-first para assets locales, network-first para APIs y watchlists
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // APIs externas: siempre red
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('openai.com') ||
      url.hostname.includes('anthropic.com') ||
      url.hostname.includes('generativelanguage.google') ||
      url.hostname.includes('accounts.google.com')) {
    return;
  }

  // Watchlists base: red primero para recibir cambios nuevos
  if (url.pathname.includes('/data/watchlist') && url.pathname.endsWith('.json')) {
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
        if (response && response.status === 200 && response.type === 'basic') {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache));
        }
        return response;
      }).catch(() => {
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
