const CACHE_VERSION = 'v2';
const CACHE_NAME = `sam-companion-cache-${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;400;700&display=swap'
];

self.addEventListener('install', (event) => {
  console.log('🔧 Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((error) => {
      console.error('❌ Cache error:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✨ Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('sam-companion-cache-')) {
            console.log('🗑️ Cleaning old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // Network-first for APIs
  if (url.hostname.includes('script.google.com') || url.hostname.includes('pollinations.ai')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 Offline cache:', request.url);
              return cachedResponse;
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('📦 Cache hit:', request.url);
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME);
  }
});