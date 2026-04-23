import { motion } from "framer-motion";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   isTotalMode: boolean,
 *   setIsTotalMode: (v: boolean) => void,
 *   totalSpent: number,
 *   variableSpent: number,
 *   ringPct: number,
 *   ringDash: string,
 *   paceStatus: string
 * }} props
 */
export function HomeProgressRingWidget({ isTotalMode, setIsTotalMode, totalSpent, variableSpent, ringPct, ringDash, paceStatus }) {
  const CIRC = 251;
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: T.radius.xl,
        padding: 20,
        border: "1px solid var(--border-solid)",
        boxShadow: T.shadow.sm,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        height: "100%",
        boxSizing: "border-box"
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "var(--fluid-sm, 12px)", color: "var(--text-muted)", fontWeight: 500, marginBottom: 4 }}>
          {isTotalMode ? "총 집행액" : "생활비 집행"}
        </p>
        <p style={{ fontSize: "var(--fluid-lg, 24px)", fontWeight: 700, color: "var(--text)", marginBottom: 8, whiteSpace: "nowrap" }}>
          {fmtS(isTotalMode ? totalSpent : variableSpent)}원
        </p>
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface-alt)",
            borderRadius: T.radius.md,
            padding: 3,
            border: "1px solid var(--border)",
            gap: 2,
          }}
        >
          {[{ v: true, label: "종합" }, { v: false, label: "생활비" }].map(({ v, label }) => (
            <button
              key={label}
              onClick={() => setIsTotalMode(v)}
              style={{
                padding: "4px 10px", borderRadius: T.radius.sm, fontSize: 10,
                fontWeight: 700, cursor: "pointer", border: "none",
                background: isTotalMode === v ? "var(--primary)" : "none",
                color: isTotalMode === v ? "#fff" : "var(--text-muted)",
                transition: "all .2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span
          className="responsive-hide"
          style={{
            display: "inline-block",
            fontSize: 10, fontWeight: 600, color: "var(--primary)",
            background: "rgba(28,43,74,.08)",
            padding: "3px 8px", borderRadius: T.radius.sm,
            marginLeft: 8,
          }}
        >
          {paceStatus}
        </span>
      </div>

      <div style={{ position: "relative", width: "clamp(64px, 25cqw, 96px)", height: "clamp(64px, 25cqw, 96px)", flexShrink: 0 }}>
        <svg
          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
          viewBox="0 0 100 100"
        >
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--surface-alt)" strokeWidth="12" />
          <motion.circle
            cx="50" cy="50" r="40" fill="transparent"
            stroke="var(--primary)" strokeWidth="12"
            strokeDasharray={ringDash}
            initial={{ strokeDasharray: `0 ${CIRC}` }}
            animate={{ strokeDasharray: ringDash }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "clamp(12px, 4cqw, 16px)", fontWeight: 800, color: "var(--text)" }}>{ringPct}%</span>
          <span style={{ fontSize: "clamp(7px, 2cqw, 8px)", color: "var(--text-faint)", marginTop: 1 }}>집행</span>
        </div>
      </div>
    </div>
  );
}
