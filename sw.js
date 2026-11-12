/* Softra service worker: caches the app shell so it works offline.
   Bump CACHE when you change files so users get the update. */
const CACHE = 'neutype-v10';
const SHELL = ['./', './index.html', './style.css', './app.js', './config.js', './multiplayer.js', './languages.js', './achievements.js', './cards.js', './manifest.webmanifest', './logo.js', './practice.js', './practice-words.js', './favicon.png', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: answer from cache fast, refresh in the background. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const network = fetch(e.request).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
        return res;
      }).catch(() => cached || (e.request.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
      return cached || network;
    })
  );
});
