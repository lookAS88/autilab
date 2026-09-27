/* Offline režim (tablet, inštalácia z https adresy).
   Aplikácia sa vždy načíta okamžite z uloženej kópie – aj keď je Wi-Fi bez internetu.
   Nová verzia sa stiahne celá naraz na pozadí (pri zmene CACHE nižšie) a použije sa pri ďalšom spustení,
   takže sa nikdy nepomiešajú staré a nové súbory. */
const CACHE = 'autilab-v4'; // pri každej novej verzii aplikácie zvýšiť
const PREFIX = 'autilab-';  // mažeme len svoje kópie (na github.io môžu byť aj iné aplikácie toho istého účtu)
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'css/app.css',
  'js/core.js', 'js/db.js', 'js/store.js', 'js/art.js', 'js/audio.js', 'js/ui.js',
  'js/modules/pecs.js', 'js/modules/routines.js', 'js/modules/timer.js', 'js/modules/sensory.js', 'js/modules/faces.js', 'js/modules/show.js',
  'js/parent.js', 'js/app.js',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' → obísť HTTP cache servera, aby sa naozaj stiahla nová verzia všetkých súborov
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch (err) {
      // bez siete a bez kópie: pri otvorení stránky aspoň uložená aplikácia
      if (req.mode === 'navigate') {
        const index = await cache.match('index.html');
        if (index) return index;
      }
      throw err;
    }
  })());
});
