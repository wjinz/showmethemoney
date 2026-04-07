/**
 * offlineQueue.js — 네트워크 오프라인 시 변경사항을 localStorage에 임시 저장하고,
 * 온라인 복구 시 Supabase로 일괄 재전송하는 큐 유틸리티.
 *
 * Task 5-3 구현
 */

const QUEUE_KEY = 'budget_offline_queue';

/**
 * 오프라인 상태일 때 저장 요청을 큐에 쌓습니다.
 * @param {string} key - Supabase 저장 키 (예: 'tx_2026', 'plan')
 * @param {*} value - 저장할 데이터
 */
export const enqueue = (key, value) => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    /** @type {Array<{key: string, value: *, ts: number}>} */
    const q = raw ? JSON.parse(raw) : [];
    // 동일 키의 이전 항목은 최신으로 교체 (중복 저장 방지)
    const filtered = q.filter(item => item.key !== key);
    filtered.push({ key, value, ts: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('[offlineQueue] enqueue 실패:', e);
  }
};

/**
 * 큐에 쌓인 항목이 있는지 확인합니다.
 * @returns {boolean}
 */
export const hasQueued = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    return q.length > 0;
  } catch {
    return false;
  }
};

/**
 * 큐에 저장된 모든 항목을 Supabase로 재전송합니다.
 * 성공 시 큐를 비웁니다. 실패 시 큐를 유지합니다.
 * @param {import('./supabase').db} db - db 유틸 객체
 * @param {string} householdId - 가계부 ID
 * @returns {Promise<number>} - 성공적으로 전송된 항목 수
 */
export const flush = async (db, householdId) => {
  if (!householdId) return 0;
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    /** @type {Array<{key: string, value: *, ts: number}>} */
    const q = raw ? JSON.parse(raw) : [];
    if (!q.length) return 0;

    let successCount = 0;
    /** @type {Array<{key: string, value: *, ts: number}>} */
    const remaining = [];

    for (const item of q) {
      try {
        // tx_YYYY 키는 saveTx로, 나머지는 save로 처리
        if (item.key.startsWith('tx_')) {
          const year = Number(item.key.slice(3));
          if (!isNaN(year)) {
            await db.saveTx(householdId, year, item.value);
          } else {
            await db.save(householdId, item.key, item.value);
          }
        } else {
          await db.save(householdId, item.key, item.value);
        }
        successCount++;
      } catch (e) {
        console.warn(`[offlineQueue] flush 실패 (key=${item.key}):`, e);
        remaining.push(item);
      }
    }

    // 전송 성공한 항목은 제거, 실패한 항목은 유지
    if (remaining.length > 0) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(QUEUE_KEY);
    }

    console.log(`[offlineQueue] ${successCount}/${q.length}개 항목 전송 완료`);
    return successCount;
  } catch (e) {
    console.error('[offlineQueue] flush 전체 실패:', e);
    return 0;
  }
};

/**
 * 큐를 강제로 비웁니다 (로그아웃 등 시 사용).
 */
export const clear = () => {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch (e) {
    console.error('[offlineQueue] clear 실패:', e);
  }
};

// ── tx 단건/다건 큐 ───────────────────────────────────────────────────────────

const TX_QUEUE_KEY = 'budget_offline_tx_queue';

/**
 * 오프라인 중 insertTx 단건 큐 등록
 * @param {import('../constants/index.js').TxItem & { is_private?: boolean }} tx
 */
export const enqueueTx = (tx) => {
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    /** @type {Array<import('../constants/index.js').TxItem & { is_private?: boolean, _ts: number }>} */
    const q = raw ? JSON.parse(raw) : [];
    q.push({ ...tx, _ts: Date.now() });
    localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(q));
  } catch (e) {
    console.error('[offlineQueue] enqueueTx 실패:', e);
  }
};

/**
 * 오프라인 tx 큐에 쌓인 항목이 있는지 확인
 * @returns {boolean}
 */
export const hasTxQueued = () => {
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    return q.length > 0;
  } catch {
    return false;
  }
};

/**
 * 오프라인 tx 큐를 transactions 테이블로 flush
 * @param {{ insertTxBatch: (hid: string, rows: object[]) => Promise<void> }} db
 * @param {string} householdId
 * @returns {Promise<number>}
 */
export const flushTxQueue = async (db, householdId) => {
  if (!householdId) return 0;
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    /** @type {Array<import('../constants/index.js').TxItem & { is_private?: boolean, _ts: number }>} */
    const q = raw ? JSON.parse(raw) : [];
    if (!q.length) return 0;
    await db.insertTxBatch(householdId, q);
    localStorage.removeItem(TX_QUEUE_KEY);
    return q.length;
  } catch (e) {
    console.error('[offlineQueue] flushTxQueue 실패:', e);
    return 0;
  }
};
