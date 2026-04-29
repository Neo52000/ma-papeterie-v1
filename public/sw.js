// Minimal service worker — caches the static shell (logo, fonts, favicon,
// PWA icons, offline fallback) so the site stays partially usable when the
// connection drops mid-browse. Strategy:
//
//   - Static assets (logo, icons, fonts, favicons) → cache-first
//   - Navigation requests (HTML pages) → network-first with offline fallback
//   - Everything else → bypass (let the browser handle Shopify/Supabase/CDN)
//
// Versioned cache name so a deploy invalidates old shell. Bump CACHE_VERSION
// when changing the precache list.

const CACHE_VERSION = 'mapap-shell-v1';
const SHELL = [
  '/',
  '/offline.html',
  '/logo-ma-papeterie.png',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon-180x180.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/site.webmanifest',
  '/placeholder-product.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((c) => c.addAll(SHELL))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Same-origin static assets we precached → cache-first.
  if (url.origin === self.location.origin && SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
    return;
  }

  // Same-origin font / favicon-like assets → cache-first opportunistic.
  if (
    url.origin === self.location.origin &&
    /\.(woff2?|ttf|eot|ico|svg|png|jpg|webp|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches
              .open(CACHE_VERSION)
              .then((c) => c.put(req, clone))
              .catch(() => undefined);
          }
          return res;
        });
      }),
    );
    return;
  }

  // HTML navigations → network-first with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('/offline.html').then((c) => c || new Response('Offline', { status: 503 })),
      ),
    );
    return;
  }

  // Everything else (Shopify Storefront, Supabase, Sentry, CDN images) →
  // bypass. The browser cache + edge cache handle it; we don't want to
  // double-cache and risk stale data.
});
