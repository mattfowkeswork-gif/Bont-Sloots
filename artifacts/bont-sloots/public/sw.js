const CACHE_NAME = 'bont-sloots-v5';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Clear ALL old caches immediately on install
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Never intercept API calls
  if (event.request.url.includes('/api/')) return;

  // Navigation requests (HTML pages) — always go straight to network, no caching
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Versioned JS/CSS assets — cache-first (hashes guarantee freshness)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
