const CACHE_NAME = 'budget-v1';

// 선캐싱 대상 핵심 에셋
const PRECACHE_URLS = ['/', '/index.html'];

// ① 설치 시 핵심 에셋 선캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ② 구버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ③ fetch 핸들러 — Share Target POST + Cache-First GET
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Share Target POST 처리
  if (url.pathname === '/share-handler' && event.request.method === 'POST') {
    event.respondWith((async () => {
      const data = await event.request.formData();
      const image = data.get('image');
      const text  = data.get('text');

      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        if (image instanceof File) {
          const buf = await image.arrayBuffer();
          client.postMessage({ type: 'SHARE_IMAGE', buf, name: image.name });
        } else if (text) {
          client.postMessage({ type: 'SHARE_TEXT', text });
        }
      }
      return Response.redirect('/', 303);
    })());
    return;
  }

  // GET 요청만 캐싱 (Supabase, API 요청 제외)
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
