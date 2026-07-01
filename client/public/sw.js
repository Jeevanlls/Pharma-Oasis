// Pharma Oasis PWA service worker (v2).
// Deliberately minimal + safe: it NEVER intercepts page navigations or /api requests,
// so login, sessions and live data behave exactly as a normal browser. It only
// speeds up static assets (JS/CSS/images/fonts/icons) via a cache.
const VERSION = 'po-v2';
const STATIC_CACHE = `po-static-${VERSION}`;

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('po-static-') && k !== STATIC_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') return;               // let the browser handle all page loads/auth
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;    // ignore cross-origin
  if (url.pathname.startsWith('/api/')) return;        // never touch live data

  // Static assets only: cache-first for speed, fall back to network.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') ||
      /\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const net = await fetch(req);
        if (net && net.ok) cache.put(req, net.clone());
        return net;
      } catch (e) { return hit || Response.error(); }
    })());
  }
});
