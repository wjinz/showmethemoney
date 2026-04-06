/**
 * THEME_TOKENS — 디자인 시스템 토큰 (Task 3-2)
 *
 * 목적: 전체 코드에 흩어진 인라인 스타일 수치를 중앙 집중화.
 *       렌더마다 새 객체 생성을 방지하고, "Premium Look" 일관성 확보.
 *
 * 전환 전략: 신규 컴포넌트에서 먼저 사용 →
 *            공통 컴포넌트(NumPad, Modal 등) 전환 →
 *            기존 View 점진 적용.
 */

export const THEME_TOKENS = /** @type {const} */ ({
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
  },

  radius: {
    sm:   8,    // 뱃지, 작은 요소
    md:   12,   // 버튼, 칩
    lg:   16,   // 모달 버튼, CTA
    xl:   24,   // 메인 카드 (rounded-3xl)
    xxl:  32,   // 바텀시트, 프리미엄 카드 (rounded-[2rem])
    full: 9999, // FAB, PIN 버튼, 아이콘
  },

  shadow: {
    sm:   "0 1px 4px rgba(0,0,0,0.08)",
    md:   "0 4px 12px rgba(0,0,0,0.12)",
    lg:   "0 8px 24px rgba(0,0,0,0.16)",
    fab:  "0 8px 30px rgba(28,43,74,0.4)",
    glow: "0 0 10px var(--gold)",
  },

  /** CSS 변수 참조 — 실제 값은 theme.css에서 결정됨 */
  color: {
    surface:    "var(--bg2)",
    surfaceAlt: "var(--bg3)",
    bg:         "var(--bg)",
    text:       "var(--text)",
    textMuted:  "var(--text2)",
    textFaint:  "var(--text3)",
    accent:     "var(--gold)",
    accentDim:  "var(--goldD)",
    danger:     "var(--red)",
    success:    "var(--green)",
    border:     "var(--border)",
    borderSolid:"var(--border-solid)",
  },

  font: {
    xs:   9,
    sm:   10,
    base: 12,
    md:   14,
    lg:   16,
    xl:   20,
    xxl:  24,
    hero: 32,
  },
});
