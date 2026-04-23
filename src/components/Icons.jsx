/**
 * 단일 라이트 팔레트용 SVG 아이콘 모듈 (showmethemoney handoff-2 기준).
 * 모든 아이콘은 색상을 prop으로 덮어쓸 수 있도록 currentColor 또는 명시 색상 사용.
 * @typedef {{ size?: number, color?: string }} IconProps
 */

/** @param {IconProps} p */
export const IcoHome = ({ size = 22, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" fill={color} />
    <path d="M9 21V12h6v9" fill={color} />
  </svg>
);

/** @param {IconProps} p */
export const IcoHistory = ({ size = 22, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" fill={color} />
    <path d="M7 9h10M7 13h7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoLock = ({ size = 22, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="5" y="11" width="14" height="10" rx="2" fill={color} />
    <path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoSOS = ({ size = 22, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M20 2H4a2 2 0 00-2 2v14a2 2 0 002 2h3l3 3 3-3h7a2 2 0 002-2V4a2 2 0 00-2-2z" fill={color} />
    <circle cx="9" cy="11" r="1.2" fill="white" />
    <circle cx="12" cy="11" r="1.2" fill="white" />
    <circle cx="15" cy="11" r="1.2" fill="white" />
  </svg>
);

/** @param {IconProps} p */
export const IcoSettle = ({ size = 22, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="5" width="20" height="14" rx="3" fill={color} />
    <path d="M2 9h20" stroke="white" strokeWidth="1.5" />
    <rect x="5" y="13" width="4" height="2" rx="1" fill="white" />
  </svg>
);

/** @param {{ size?: number }} p */
export const IcoPlus = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoChevR = ({ size = 14, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M9 6l6 6-6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoChevD = ({ size = 14, color = "#9CA3AF" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoChevLeft = ({ size = 20, color = "#111827" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M15 18l-6-6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** @param {{ size?: number }} p */
export const IcoSend = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoEye = ({ size = 16, color = "#6B7280" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
  </svg>
);

/** @param {IconProps} p */
export const IcoEyeOff = ({ size = 16, color = "#6B7280" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M1 1l22 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoDel = ({ size = 22, color = "#374151" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** @param {{ size?: number }} p */
export const IcoAdd = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/** @param {IconProps} p */
export const IcoGear = ({ size = 20, color = "#6B7280" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="1.8" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="1.8" />
  </svg>
);

/** @param {{ size?: number }} p */
export const IcoCamera = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" />
  </svg>
);
