/* Service worker — Markaz Lughoh Temboro (PWA)
   Strategi: aplikasi di-cache saat pertama dibuka, lalu bisa dipakai offline.
   Naikkan VERSION setiap kali Anda mengganti index.html agar pengguna mendapat versi baru. */
const VERSION = 'v1';
const CACHE = 'markaz-lughoh-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(CORE.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(err => console.warn('SW: gagal cache', url, err))
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('markaz-lughoh-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Halaman utama: cache dulu (cepat & offline), perbarui di latar belakang.
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(
      caches.match('./index.html').then(cached => {
        const refresh = fetch(req).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
          return res;
        }).catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }

  // Font Google & berkas sejenis: simpan saat pertama diakses online.
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isFont || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(cached => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) caches.open(CACHE).then(c => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
  }
});
