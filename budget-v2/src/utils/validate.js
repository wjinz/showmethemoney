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
 * 저장 전 값의 스키마 일치를 검증합니다.
 * @param {string} key - Supabase key 컬럼 값
 * @param {*} value - 저장할 데이터
 * @returns {boolean} 유효하면 true, 불일치 시 경고 후 true (차단 안 함)
 */
export function validate(key, value) {
  const checker = SCHEMAS[key];
  if (!checker) return true; // 스키마 미정의 키는 통과
  const ok = checker(value);
  if (!ok) {
    console.warn(`[validate] '${key}' 스키마 불일치 감지 — 필수 필드 누락 가능성 있음`, value);
  }
  return ok;
}
