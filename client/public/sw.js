// Pharma Oasis PWA service worker.
// Safe for a live B2B app: API responses are NEVER cached (prices/orders always fresh).
const VERSION = 'po-v1';
const STATIC_CACHE = `po-static-${VERSION}`;
const OFFLINE_URL = '/portal';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    try { await cache.addAll(['/portal', '/manifest.webmanifest', '/apple-touch-icon.png']); } catch (e) {}
    self.skipWaiting();
  })());
});

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
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // leave cross-origin alone
  if (url.pathname.startsWith('/api/')) return;       // never cache live data

  // Navigations: network-first so HTML is always fresh; fall back to shell offline.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { return await fetch(req); }
      catch (e) {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) || (await cache.match('/portal')) || Response.error();
      }
    })());
    return;
  }

  // Static assets: cache-first for speed, then network (and store).
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') ||
      /\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        if (net && net.ok) cache.put(req, net.clone());
        return net;
      } catch (e) { return cached || Response.error(); }
    })());
  }
});
