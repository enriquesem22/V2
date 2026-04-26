const CACHE_NAME = 'return-app-v34';

const LOCAL_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

const APP_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/geo-data.js',
  '/finance.js',
  '/app.js',
  '/market.js',
  '/portfolio.js',
  '/storage.js',
  '/tracking-hotfix-v214.js',
  '/tracking.js',
  '/state-patch.js',
  '/import.js',
  '/data/watchlist.json',
  '/data/watchlist-manresa.json',
  '/data/watchlist-san-juan.json',
  '/data/watchlist-solvia.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_ASSETS.concat(APP_ASSETS))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

function shouldPassThrough(url) {
  return url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('api.github.com');
}

function isAppCode(url) {
  return url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    (url.pathname.includes('/data/watchlist') && url.pathname.endsWith('.json'));
}

function networkFirst(request) {
  return fetch(request).then(response => {
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')));
}

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  });
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (shouldPassThrough(url)) return;
  if (event.request.method !== 'GET') return;

  if (isAppCode(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
