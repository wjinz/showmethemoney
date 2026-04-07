import { Settings } from "lucide-react";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   remaining: number,
 *   YEAR: number,
 *   MONTH: number,
 *   DAY: number,
 *   daysLeft: number,
 *   onSettings: (v: string) => void
 * }} props
 */
export function HomeHeroWidget({ remaining, YEAR, MONTH, DAY, daysLeft, onSettings }) {
  return (
    <div style={{ padding: "4px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>
          이번 달 남은 공동 예산
        </p>
        <h1
          style={{
            fontSize: T.font.hero,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text)",
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {fmtS(remaining)}
          <span style={{ fontSize: T.font.xxl, fontWeight: 700, marginLeft: 4 }}>원</span>
        </h1>
        <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
          {YEAR}년 {MONTH}월 · {DAY}일차 · 잔여 {daysLeft}일
        </p>
      </div>
      <button
        onClick={() => onSettings("settings")}
        style={{
          marginTop: 4,
          width: 36, height: 36, borderRadius: T.radius.full,
          background: "var(--bg2)", border: "1px solid var(--border-solid)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text2)",
        }}
      >
        <Settings size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
