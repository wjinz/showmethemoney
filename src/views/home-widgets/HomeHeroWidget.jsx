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
  const isNegative = remaining < 0;

  return (
    <div style={{ padding: "4px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: "var(--fluid-sm, 13px)", color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>
          이번 달 남은 공동 예산
        </p>
        <h1
          style={{
            fontSize: "var(--fluid-hero, 36px)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: isNegative ? "var(--danger)" : "var(--text)",
            lineHeight: 1.1,
            margin: 0,
            whiteSpace: "nowrap"
          }}
        >
          {fmtS(remaining)}
          <span style={{ fontSize: "var(--fluid-lg, 24px)", fontWeight: 700, marginLeft: 4 }}>원</span>
        </h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
          <p style={{ fontSize: 10, color: "var(--text-faint)", fontWeight: 500 }}>
            (카테고리 예산 총합 - 이번 달 생활비 지출)
          </p>
          <p style={{ fontSize: "var(--fluid-sm, 11px)", color: "var(--text-muted)", opacity: 0.8 }}>
            {YEAR}년 {MONTH}월 · {DAY}일차 · 잔여 {daysLeft}일
          </p>
        </div>
      </div>
      <button
        onClick={() => onSettings("budget")}
        style={{
          marginTop: 4,
          width: "clamp(28px, 8cqw, 36px)", height: "clamp(28px, 8cqw, 36px)", borderRadius: T.radius.full,
          background: "var(--surface)", border: "1px solid var(--border-solid)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--primary)",
          flexShrink: 0
        }}
        title="예산 관리로 이동"
      >
        <Settings size={18} strokeWidth={2} />
      </button>
    </div>
  );
}
