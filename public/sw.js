const CACHE_NAME = 'vidarix-v25';
const IMAGE_CACHE_NAME = 'vidarix-images-v25';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/brand/vidarix-logo-horizontal.png',
  '/brand/vidarix-symbol.png',
  '/icon-192.png',
  '/providers/netflix.png',
  '/providers/prime-video.png',
  '/providers/disney-plus.png',
  '/providers/max.png',
  '/providers/paramount-plus.png',
  '/providers/apple-tv-plus.png',
  '/providers/globoplay.png',
  '/providers/telecine.png',
  '/providers/mubi.png',
  '/providers/crunchyroll.png',
  '/icon-512.png',
  '/providers/netflix.svg',
  '/providers/prime-video.svg',
  '/providers/prime-video-ads.svg',
  '/providers/disney-plus.svg',
  '/providers/max.svg',
  '/providers/paramount-plus.svg',
  '/providers/apple-tv-plus.svg',
  '/providers/globoplay.svg',
  '/providers/telecine.svg',
  '/providers/mubi.svg',
  '/providers/crunchyroll.svg',
  '/providers/claro-tv-plus.svg',
  '/providers/mgm-plus.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Special handling for external TMDB image resources
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // Serve cached image, update cache in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse);
            }
          }).catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return new Response('', { status: 404, statusText: 'Image Not Found' });
        }
      })
    );
    return;
  }

  // Standard caching strategy for local static assets & app shell
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== 'basic'
          ) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        })
        .catch(() => {
          const acceptHeader = event.request.headers.get('accept') || '';
          if (acceptHeader.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
