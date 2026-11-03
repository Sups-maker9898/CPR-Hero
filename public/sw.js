const CACHE_NAME = 'cpr-hero-v9';
const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/leaderboard.js',
  '/js/rhythm.js',
  '/js/trivia.js',
  '/js/coach.js',
  '/js/sprites.js',
  '/js/scenario.js',
  '/js/game.js',
  '/img/street.png',
  '/img/close.png',
  '/img/fx.png',
  '/img/hero.png',
  '/img/hero-cpr.png',
  '/img/rick.png',
  '/img/maya.png',
  '/img/medic.png',
  '/img/patient.png',
  '/img/coach.png',
  '/img/props.png',
  '/img/ambulance.png',
  '/data/trivia.json',
  '/data/story.json',
  '/data/coach.json',
  '/data/scenarios.json',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
  );
});
