/**
 * offlineIDB.js — IndexedDB 기반 오프라인 큐 헬퍼
 *
 * localStorage 대비 Service Worker에서 직접 접근 가능 → Background Sync 지원.
 * DB 버전 변경 시 반드시 onupgradeneeded에서 마이그레이션 처리.
 */

const DB_NAME = 'budget-offline-db';
const STORE   = 'queue';
const DB_VERSION = 1;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = /** @type {IDBOpenDBRequest} */ (e.target).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { autoIncrement: true, keyPath: 'idbId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * @typedef {{ type: 'kv', householdId: string, key: string, value: import('../constants/index.js').TxItem[] | object | boolean | string | number, ts: number, idbId?: number }} IDBQueueKvItem
 * @typedef {{ type: 'tx', householdId: string, rows: object[], ts: number, idbId?: number }} IDBQueueTxItem
 * @typedef {IDBQueueKvItem | IDBQueueTxItem} IDBQueueItem
 */

/**
 * 큐에 항목 추가
 * @param {Omit<IDBQueueItem, 'ts' | 'idbId'>} item
 * @returns {Promise<void>}
 */
export async function idbEnqueue(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...item, ts: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * 큐 전체 조회
 * @returns {Promise<IDBQueueItem[]>}
 */
export async function idbDequeueAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = /** @type {IDBRequest<IDBQueueItem[]>} */ (tx.objectStore(STORE).getAll());
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * 지정된 idbId 항목들 삭제
 * @param {number[]} ids
 * @returns {Promise<void>}
 */
export async function idbRemove(ids) {
  if (!ids.length) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    ids.forEach(id => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * 큐가 비어 있지 않은지 확인
 * @returns {Promise<boolean>}
 */
export async function idbHasQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = /** @type {IDBRequest<number>} */ (tx.objectStore(STORE).count());
    req.onsuccess = () => resolve(req.result > 0);
    req.onerror   = () => reject(req.error);
  });
}
