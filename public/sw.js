const SHELL_CACHE = 'vidarix-shell-v26';
const IMAGE_CACHE = 'vidarix-images-v26';

// O HTML principal não é pré-cacheado. Assim, cada novo deploy busca
// o index.html mais recente e evita carregar chunks antigos do Vite.
const STATIC_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/brand/vidarix-logo-horizontal.png',
  '/brand/vidarix-symbol.png',
  '/icon-192.png',
  '/icon-512.png',
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
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });

    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/index.html', response.clone());
    }

    return response;
  } catch {
    const cachedIndex = await caches.match('/index.html');

    return (
      cachedIndex ||
      new Response(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VIDARIX offline</title></head><body style="margin:0;background:#05060b;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px"><main><h1>Você está offline</h1><p>Conecte-se à internet e tente novamente.</p></main></body></html>',
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      )
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || new Response('', { status: 404 });
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Navegações sempre tentam a rede primeiro para evitar index.html antigo.
  if (
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  // Imagens do TMDB: mostra rápido do cache e atualiza em segundo plano.
  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(staleWhileRevalidate(event.request, IMAGE_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // O próprio service worker nunca deve vir de um cache antigo.
  if (url.pathname === '/sw.js') {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // Chunks do Vite possuem hash no nome e podem ser armazenados com segurança.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirstAsset(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
});
