/**
 * THEME_TOKENS
 * 단일 라이트 팔레트 (showmethemoney handoff-2 기준)
 * CSS 변수는 theme.css에서 정의
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
    sm:   8,
    md:   12,
    lg:   24,
    xl:   32,
    full: 9999,
  },

  shadow: {
    sm:   "0 1px 3px rgba(0,0,0,.07)",
    md:   "0 4px 12px rgba(0,0,0,.12)",
    lg:   "0 8px 24px rgba(0,0,0,.16)",
    fab:  "0 8px 30px rgba(28,43,74,.4)",
    card: "0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.05)",
  },

  color: {
    bg:         "var(--bg)",
    surface:    "var(--surface)",
    surfaceAlt: "var(--surface-alt)",
    primary:    "var(--primary)",
    primaryL:   "var(--primary-l)",
    secondary:  "var(--secondary)",
    secondaryL: "var(--secondary-l)",
    text:       "var(--text)",
    textMuted:  "var(--text-muted)",
    textFaint:  "var(--text-faint)",
    muted:      "var(--muted)",
    border:     "var(--border)",
    borderSolid:"var(--border-solid)",
    danger:     "var(--danger)",
    warning:    "var(--warning)",
    success:    "var(--success)",
  },

  font: {
    xs:   11,
    sm:   12,
    base: 13,
    md:   14,
    lg:   16,
    xl:   20,
    xxl:  24,
    hero: 32,
  },
});
