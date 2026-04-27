/**
 * ls.js - localStorage 네임스페이스 헬퍼 (smtm_ prefix 표준)
 * Antigravity 결정: 모든 클라이언트 스토리지 키를 smtm_ prefix로 통일
 */

const PREFIX = 'smtm_';

/** @type {Record<string, string>} */
export const LS_KEYS = {
  HOUSEHOLD_ID: `${PREFIX}householdId`,
  MY_ROLE:      `${PREFIX}myRole`,
  SLIDER_CFG:   `${PREFIX}sliderCfg`,
  THEME:        `${PREFIX}theme`,
  IS_ADMIN:     `${PREFIX}isAdmin`,
  KIDS_MODE:    `${PREFIX}kidsMode`,
  OFFLINE_QUEUE:    `${PREFIX}offline_queue`,
  OFFLINE_TX_QUEUE: `${PREFIX}offline_tx_queue`,
  DIARIES:          `${PREFIX}diaries`,
};

/** @type {Record<string, string>} */
const LEGACY_MAP = {
  householdId:          LS_KEYS.HOUSEHOLD_ID,
  myRole:               LS_KEYS.MY_ROLE,
  sliderCfg:            LS_KEYS.SLIDER_CFG,
  theme:                LS_KEYS.THEME,
  isAdmin:              LS_KEYS.IS_ADMIN,
  kidsMode:             LS_KEYS.KIDS_MODE,
  budget_offline_queue: LS_KEYS.OFFLINE_QUEUE,
  budget_offline_tx_queue: LS_KEYS.OFFLINE_TX_QUEUE,
};

/**
 * @template T
 * @param {string} key
 * @param {T | null} [fallback=null]
 * @returns {T | null}
 */
export function lsGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 */
export function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('[ls] set 실패:', key, e);
  }
}

/** @param {string} key */
export function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

export function lsMigrateLegacy() {
  try {
    const flagKey = `${PREFIX}_migrated_v1`;
    if (localStorage.getItem(flagKey) === 'true') return;
    Object.entries(LEGACY_MAP).forEach(([legacy, target]) => {
      const hit = localStorage.getItem(legacy);
      if (hit === null) return;
      if (localStorage.getItem(target) === null) {
        localStorage.setItem(target, hit);
      }
      localStorage.removeItem(legacy);
    });
    localStorage.setItem(flagKey, 'true');
  } catch (e) {
    console.warn('[ls] migrate 실패:', e);
  }
}
