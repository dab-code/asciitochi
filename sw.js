const CACHE_NAME = 'asciitochi-v6';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/pet.js',
  './js/personality.js',
  './js/renderer.js',
  './js/sprites.js',
  './js/species.js',
  './js/actions.js',
  './js/minigames.js',
  './js/clock.js',
  './js/save.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
