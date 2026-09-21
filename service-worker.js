/**
 * MAISYA-TRANS - Service Worker
 * Pondok Pesantren Imam Syafi'i Brebes
 */

const CACHE_NAME = 'maisya-trans-v1.0.4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/components.css',
  './css/responsive.css',
  './js/config.js',
  './js/utils.js',
  './js/api.js',
  './js/auth.js',
  './js/store.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/vehicles.js',
  './js/booking.js',
  './js/trips.js',
  './js/maintenance.js',
  './js/statistics.js',
  './js/admin.js',
  './js/app.js',
  './assets/logo/logo.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg'
];

// Install Event - Cache Static App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache prefetch error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request API Google Apps Script (karena butuh data realtime / internet)
  if (url.origin.includes('script.google.com') || url.pathname.includes('/exec')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Koneksi internet terputus. Data transaksi memerlukan akses online ke Google Spreadsheet.'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Network First for Navigation HTML, Cache First for Static Assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Stale-While-Revalidate for CSS, JS, SVG, Fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch((err) => {
        // Fallback or ignore
      });

      return cachedResponse || fetchPromise;
    })
  );
});
