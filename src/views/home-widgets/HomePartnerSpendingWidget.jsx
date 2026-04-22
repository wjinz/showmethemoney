import { Card } from "../../components/UI";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   plan: import('../../constants/index.js').Plan,
 *   totalSpent: number,
 *   hSpent: number,
 *   wSpent: number,
 *   names: Record<string, string>,
 *   onAdd: (who: string) => void
 * }} props
 */
export function HomePartnerSpendingWidget({ plan, totalSpent, hSpent, wSpent, names, onAdd }) {
  if (plan?.isSolo) {
    return (
      <div style={{ height: "100%", display: "flex", alignItems: "center", boxSizing: "border-box" }}>
        <button
          onClick={() => onAdd("husband")}
          style={{
            width: "100%", background: "var(--gold)", border: "none", borderRadius: T.radius.lg, padding: "16px",
            color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 12px rgba(200,168,75,0.2)",
          }}
        >
          + 지출 추가하기
        </button>
      </div>
    );
  }

  return (
    <Card className="u5" style={{ padding: "14px", marginBottom: 0, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 10 }}>파트너별 지출</div>
        <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ width: `${totalSpent > 0 ? hSpent / totalSpent * 100 : 50}%`, background: "var(--h)", transition: "width .7s ease" }} />
          <div style={{ flex: 1, background: "var(--w)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[{ w: "husband", a: hSpent }, { w: "wife", a: wSpent }].map(p => (
            <div key={p.w} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.w === "husband" ? "var(--h)" : "var(--w)" }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis" }}>{names[p.w]}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtS(p.a)}원</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {["husband", "wife"].map(w => (
          <button
            key={w}
            onClick={() => onAdd(w)}
            style={{
              background: w === "husband" ? "var(--hD)" : "var(--wD)",
              border: `1px solid ${w === "husband" ? "rgba(92,141,232,.25)" : "rgba(217,127,168,.25)"}`,
              borderRadius: 11, padding: "11px", cursor: "pointer",
              color: w === "husband" ? "var(--h)" : "var(--w)", fontWeight: 700, fontSize: 13,
              display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
            {names[w]}
          </button>
        ))}
      </div>
    </Card>
  );
}
