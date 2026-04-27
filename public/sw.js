const CACHE_NAME = 'budget-v1';

// 선캐싱 대상 핵심 에셋
const PRECACHE_URLS = ['/', '/index.html'];

// Supabase 환경변수 — 빌드 시 vite.config.js define으로 주입
// eslint-disable-next-line no-undef
const SUPABASE_URL = typeof __SUPABASE_URL__ !== 'undefined' ? __SUPABASE_URL__ : '';
// eslint-disable-next-line no-undef
const SUPABASE_KEY = typeof __SUPABASE_KEY__ !== 'undefined' ? __SUPABASE_KEY__ : '';

// ── IndexedDB 헬퍼 (SW 내부 전용) ───────────────────────────────────────────
const IDB_NAME = 'budget-offline-db';
const IDB_STORE = 'queue';
const IDB_VERSION = 1;

function swOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { autoIncrement: true, keyPath: 'idbId' });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function swDequeueAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = (e) => resolve(e.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function swRemove(db, ids) {
  if (!ids.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    ids.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
  });
}

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

// ③ Background Sync — IndexedDB에서 직접 읽어 Supabase REST 호출
self.addEventListener('sync', (event) => {
  if (event.tag !== 'offline-queue-flush') return;

  event.waitUntil((async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn('[SW] Supabase 환경변수 미설정 — Background Sync 건너뜀');
      return;
    }

    const db = await swOpenDB();
    const items = await swDequeueAll(db);
    if (!items.length) return;

    const succeeded = [];

    for (const item of items) {
      try {
        if (item.type === 'kv') {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/household_data`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              id: item.householdId,
              key: item.key,
              value: item.value,
              updated_at: new Date().toISOString(),
            }),
          });
          if (resp.ok) succeeded.push(item.idbId);
        } else if (item.type === 'tx') {
          const resp = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.rows),
          });
          if (resp.ok) succeeded.push(item.idbId);
        } else if (item.type === 'diary') {
          // P0-3: SW에서는 diary를 큐에 그대로 유지.
          // 사진 base64 머지는 read-modify-write race condition 위험이 있으므로
          // App 활성화 시 flushIdbDiaries가 처리하도록 위임.
          console.log('[SW] diary 항목은 App에 위임 (큐 유지)');
        }
      } catch (e) {
        // 실패 항목은 큐에 유지 — 다음 sync 이벤트에서 재시도
        console.warn('[SW] Background Sync 항목 실패:', e);
      }
    }

    if (succeeded.length) {
      await swRemove(db, succeeded);
      console.log(`[SW] Background Sync 완료: ${succeeded.length}건`);
    }
  })());
});

// ④ fetch 핸들러 — Share Target POST + Cache-First GET
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
