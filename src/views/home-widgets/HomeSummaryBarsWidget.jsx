import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   fixedTotal: number,
 *   installTotal: number,
 *   variableSpent: number
 * }} props
 */
export function HomeSummaryBarsWidget({ fixedTotal, installTotal, variableSpent }) {
  const items = [
    { label: "📌 고정비", value: fixedTotal },
    { label: "💳 할부",   value: installTotal },
    { label: "🛒 생활비", value: variableSpent },
  ];

  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8, height: "100%", boxSizing: "border-box"
      }}
    >
      {items.map(({ label, value }) => (
        <div
          key={label}
          style={{
            background: "var(--bg2)",
            borderRadius: T.radius.lg,
            padding: "10px 12px",
            border: "1px solid var(--border-solid)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <p style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>{label}</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>{fmtS(value)}원</p>
        </div>
      ))}
    </div>
  );
}
