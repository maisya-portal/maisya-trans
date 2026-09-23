/**
 * MAISYA-TRANS - Service Worker
 * Pondok Pesantren Imam Syafi'i Brebes
 * Version: 2.0.0 (Public Vehicle Lending System)
 */

const CACHE_NAME = 'maisya-trans-v2.0.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
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
  './js/history.js',
  './js/maintenance.js',
  './js/statistics.js',
  './js/admin.js',
  './js/notifications.js',
  './js/profile.js',
  './js/app.js',
  './assets/logo/logo.png',
  './assets/logo/logo.svg',
  './assets/icons/icon.png',
  './assets/icons/icon.svg',
  './assets/icons/icon-32.png',
  './assets/icons/icon-48.png',
  './assets/icons/icon-72.png',
  './assets/icons/icon-96.png',
  './assets/icons/icon-128.png',
  './assets/icons/icon-144.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-256.png',
  './assets/icons/icon-384.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/favicon.png',
  './assets/icons/favicon.ico'
];

// Install Event - Force Skip Waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW v2.0.0] Caching app shell assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache prefetch error:', err);
      });
    })
  );
});

// Activate Event - Clean all older caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting obsolete cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First for HTML & Scripts to ensure instant updates
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request API Google Apps Script
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

  // Network First for Navigation and scripts
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Stale-While-Revalidate for images, fonts, icons
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});
