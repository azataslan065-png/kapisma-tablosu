/* Kapışma Tablosu — Service Worker
   Sürüm değiştirilince eski önbellek silinir. Uygulamayı güncelledikten sonra
   CACHE_VERSION'ı artır, yoksa cihazlarda eski dosya kalabilir. */
const CACHE_VERSION = 'kapisma-2026-09-07-F';

/* Yalnızca kabuk dosyaları. Firestore verisi ASLA önbelleğe alınmaz. */
const SHELL = [
  './futbol-kapisma-tablosu.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './admin-icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  /* GET dışındaki her şey doğrudan ağa gider */
  if(req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Firestore, Firebase CDN ve diğer dış istekler önbelleğe girmez —
     gerçek zamanlı veri bayatlamasın */
  if(url.origin !== self.location.origin) return;
  if(url.pathname.includes('firestore') || url.pathname.includes('googleapis')) return;

  const isShellDoc = req.mode === 'navigate' || url.pathname.endsWith('.html');

  if(isShellDoc){
    /* HTML için önce ağ: yeni sürüm çıktıysa hemen gelsin, çevrimdışıysa önbellek */
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./futbol-kapisma-tablosu.html')))
    );
    return;
  }

  /* İkon ve manifest için önce önbellek */
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit))
  );
});
