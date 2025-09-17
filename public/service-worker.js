// Service Worker for Script Memorization Tool
const swUrl = new URL(self.location.href);
const IS_DEV_MODE = swUrl.searchParams.has('dev-sw');
const CACHE_NAME = 'memorize-tool-v2';
const CORE_ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// In development, Create React App uses Webpack with hot module replacement,
// which means the JS and CSS files have dynamic names with hashes.
// We'll cache these dynamically as they're requested.

// Install event - cache assets
self.addEventListener('install', (event) => {
  if (IS_DEV_MODE) {
    // In development we skip caching to avoid interfering with hot reload
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching core files');

        // Cache each file individually to handle failures gracefully
        const cachePromises = CORE_ASSETS_TO_CACHE.map(url => {
          // Fetch and cache each resource individually
          return fetch(url)
            .then(response => {
              if (!response.ok) {
                throw new Error(`Failed to fetch ${url}`);
              }
              return cache.put(url, response);
            })
            .catch(error => {
              console.error(`Service Worker: Failed to cache ${url}:`, error);
              // Continue even if one file fails
              return Promise.resolve();
            });
        });

        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed:', error);
        // Continue with installation even if caching fails
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  if (IS_DEV_MODE) {
    event.waitUntil(self.clients.claim());
    return;
  }

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  if (IS_DEV_MODE) {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip API requests
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip WebSocket requests
  if (event.request.url.includes('/sockjs-node') ||
      event.request.url.includes('/ws')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();

          // Cache the response
          caches.open(CACHE_NAME)
            .then((cache) => {
              // Only cache assets we want to keep
              const url = new URL(event.request.url);
              const shouldCache =
                // Cache static assets
                url.pathname.startsWith('/static/') ||
                // Cache core assets
                CORE_ASSETS_TO_CACHE.includes(url.pathname);

              if (shouldCache) {
                console.log('Service Worker: Caching new resource:', url.pathname);
                cache.put(event.request, responseToCache);
              }
            })
            .catch(err => {
              console.error('Service Worker: Cache error:', err);
            });

          return response;
        })
        .catch(() => {
          // If fetch fails (offline), try to serve the index page
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
