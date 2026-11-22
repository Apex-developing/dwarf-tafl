// Simple Cache-first Service Worker for Dwarf Tafl PWA

const CACHE_NAME = 'dwarf-tafl-v2';
const STATIC_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'assets/board/board.png',
  'assets/board/main-tail.png',
  'assets/board/gate-tile.png',
  'assets/board/tron-tile.png',
  'assets/board/border-sprite.png',
  'assets/tokens/king.png',
  'assets/tokens/guard.png',
  'assets/tokens/orc.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
