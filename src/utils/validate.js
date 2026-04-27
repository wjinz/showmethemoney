/**
 * 경량 데이터 스키마 검증 유틸 (Task 2-4)
 *
 * Supabase JSONB는 자유 스키마이므로, setShared 저장 전에 필드 일치를 확인하여
 * card.name vs card.label 같은 런타임 버그를 사전 감지합니다.
 * 현재는 경고만 출력하고 저장을 차단하지는 않습니다.
 */

/** @typedef {{ id: string, label: string, type: string }} CardItem */
/** @typedef {{ id: number, amount: number, date: string }} TxItem */

/**
 * @type {Record<string, (value: *) => boolean>}
 */
const SCHEMAS = {
  cards: (v) => {
    if (!Array.isArray(v)) return false;
    return /** @type {*[]} */ (v).every(
      (c) => typeof c === 'object' && c !== null &&
        'id' in c && 'label' in c && 'type' in c
    );
  },
  tx: (v) => {
    if (!Array.isArray(v)) return false;
    return /** @type {*[]} */ (v).every(
      (t) => typeof t === 'object' && t !== null &&
        'id' in t && 'amount' in t && 'date' in t
    );
  },
  fixed: (v) => {
    if (!Array.isArray(v)) return false;
    return /** @type {*[]} */ (v).every(
      (f) => typeof f === 'object' && f !== null &&
        'id' in f && 'amount' in f
    );
  },
  install: (v) => {
    if (!Array.isArray(v)) return false;
    return /** @type {*[]} */ (v).every(
      (i) => typeof i === 'object' && i !== null &&
        'id' in i && 'totalAmount' in i && 'months' in i
    );
  },
};

/**
 * @typedef {{ strict?: boolean }} ValidateOpts
 */

/**
 * 저장 전 값의 스키마 일치를 검증합니다 (P2-2).
 * dev 환경에서는 throw, prod에서는 console.error만.
 * @param {string} key - Supabase key 컬럼 값
 * @param {*} value - 저장할 데이터
 * @param {ValidateOpts=} opts
 * @returns {boolean} 유효하면 true
 */
export function validate(key, value, opts) {
  const checker = SCHEMAS[key];
  if (!checker) return true;
  const ok = checker(value);
  if (ok) return true;
  const msg = `[validate] '${key}' 스키마 불일치 — 필수 필드 누락 가능성`;
  // P2-2 [claude]: dev = throw, prod = console.error
  /** @type {boolean} */
  const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env && import.meta.env.DEV);
  if (opts && opts.strict) {
    if (isDev) throw new Error(msg);
    console.error(msg, value);
  } else {
    console.warn(msg, value);
  }
  return false;
}
