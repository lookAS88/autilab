/* Offline režim pri spustení cez http(s) (napr. na tablete). Najprv sieť, pri výpadku uložená kópia. */
const CACHE = 'autilab-v3'; // pri každej novej verzii zvýšiť, aby tablet stiahol nové súbory
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'css/app.css',
  'js/core.js', 'js/db.js', 'js/store.js', 'js/art.js', 'js/audio.js', 'js/ui.js',
  'js/modules/pecs.js', 'js/modules/routines.js', 'js/modules/timer.js', 'js/modules/sensory.js', 'js/modules/faces.js', 'js/modules/show.js',
  'js/parent.js', 'js/app.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request)
    .then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
