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
 * @typedef {{ type: 'diary', householdId: string, payload: import('../constants/index.js').DiaryItem, ts: number, idbId?: number }} IDBQueueDiaryItem
 * @typedef {IDBQueueKvItem | IDBQueueTxItem | IDBQueueDiaryItem} IDBQueueItem
 */

/**
 * P0-5: storage quota 체크 — 85% 초과 시 거절
 * @returns {Promise<void>}
 */
async function assertStorageQuota() {
  if (typeof navigator === 'undefined') return;
  const storage = navigator.storage;
  if (!storage || typeof storage.estimate !== 'function') return;
  const { usage = 0, quota = 1 } = await storage.estimate();
  if (quota > 0 && usage / quota > 0.85) {
    throw new Error('STORAGE_QUOTA_EXCEEDED');
  }
}

/**
 * 큐에 항목 추가
 * @param {Omit<IDBQueueItem, 'ts' | 'idbId'>} item
 * @returns {Promise<void>}
 */
export async function idbEnqueue(item) {
  // P0-5: diary 등 크기 큰 페이로드 큐잉 전 quota 가드
  if (item.type === 'diary') {
    await assertStorageQuota();
  }
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

/**
 * IDB 큐의 diary 항목만 추출
 * @returns {Promise<IDBQueueDiaryItem[]>}
 */
export async function idbDequeueDiaries() {
  const all = await idbDequeueAll();
  return /** @type {IDBQueueDiaryItem[]} */ (all.filter(it => it.type === 'diary'));
}

const SNAPSHOT_STORE = 'snapshots';
const SNAP_DB_VERSION = 2;

/**
 * @returns {Promise<IDBDatabase>}
 */
function openSnapshotDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SNAP_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = /** @type {IDBOpenDBRequest} */ (e.target).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { autoIncrement: true, keyPath: 'idbId' });
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'snapshotKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @typedef {Object} DiarySnapshot
 * @property {string} snapshotKey
 * @property {string} householdId
 * @property {import('../constants/index.js').DiaryItem[]} payload
 * @property {number} ts
 */

/**
 * lastKnownGood snapshot 저장 (Hotfix-2)
 * @param {string} householdId
 * @param {import('../constants/index.js').DiaryItem[]} payload
 * @returns {Promise<void>}
 */
export async function idbSaveDiariesSnapshot(householdId, payload) {
  if (!householdId || !Array.isArray(payload)) return;
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
    const store = tx.objectStore(SNAPSHOT_STORE);
    /** @type {DiarySnapshot} */
    const snap = {
      snapshotKey: `diaries_lkg_${householdId}`,
      householdId,
      payload,
      ts: Date.now(),
    };
    store.put(snap);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * lastKnownGood snapshot 로드 (Hotfix-2)
 * @param {string} householdId
 * @returns {Promise<DiarySnapshot|null>}
 */
export async function idbLoadDiariesSnapshot(householdId) {
  if (!householdId) return null;
  const db = await openSnapshotDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
    const req = /** @type {IDBRequest<DiarySnapshot|null>} */ (
      tx.objectStore(SNAPSHOT_STORE).get(`diaries_lkg_${householdId}`)
    );
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

