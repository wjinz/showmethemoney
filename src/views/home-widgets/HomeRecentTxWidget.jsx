import { Chip } from "../../components/UI";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtC } from "../../utils/helpers.js";

/**
 * @param {{
 *   searchTerm: string,
 *   setSearchTerm: (v: string) => void,
 *   showFull: boolean,
 *   setShowFull: (v: boolean) => void,
 *   filteredTx: import('../../constants/index.js').TxItem[],
 *   setEditItem: (v: import('../../constants/index.js').TxItem) => void,
 *   CAT: Record<string, any>,
 *   CATS: any[],
 *   cards: import('../../constants/index.js').CardItem[],
 *   plan: any,
 *   names: Record<string, string>
 * }} props
 */
export function HomeRecentTxWidget({
  searchTerm, setSearchTerm, showFull, setShowFull,
  filteredTx, setEditItem, CAT, CATS, cards, plan, names
}) {
  const displayList = showFull ? filteredTx : filteredTx.slice(0, 5);

  return (
    <div
      style={{
        background: "var(--bg2)",
        borderRadius: T.radius.xl,
        border: "1px solid var(--border-solid)",
        boxShadow: T.shadow.sm,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          padding: "14px 16px 10px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border-solid)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
          {searchTerm ? "검색 결과" : "최근 지출"}
        </span>
        <button
          onClick={() => setShowFull(!showFull)}
          style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          {showFull ? "간략히" : "전체보기"}
        </button>
      </div>

      <div style={{ padding: "10px 16px" }}>
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔎 지출 처 또는 카테고리 검색"
          style={{
            width: "100%", background: "var(--bg3)", border: "1px solid var(--border-solid)",
            borderRadius: T.radius.md, padding: "8px 12px",
            color: "var(--text)", fontSize: 12, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {displayList.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text2)" }}>내역이 없습니다.</div>
          </div>
        ) : (
          displayList.map((t, idx) => {
            const c    = CAT[t.cat] || CATS[8];
            const card = t.cardId ? (cards || []).find(cc => cc.id === t.cardId) : null;
            const pmI  = t.payMethod === "credit" ? "💳" : t.payMethod === "debit" ? "🏦" : "💵";
            const pmL  = card ? card.label : (t.payMethod === "credit" ? "신용" : t.payMethod === "debit" ? "체크" : "현금");
            return (
              <div
                key={t.id}
                onClick={() => setEditItem(t)}
                style={{
                  padding: "12px 16px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--border-solid)",
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", transition: "background .15s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "var(--bg3)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "none"; }}
              >
                <div
                  style={{
                    width: 44, height: 44,
                    borderRadius: T.radius.md,
                    background: c.color + "1a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{c.label}</span>
                    {!plan?.isSolo && <Chip who={t.who} names={names} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text3)" }}>
                    <span style={{ color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.memo || "—"}
                    </span>
                    <span>·</span>
                    <span
                      style={{
                        background: "var(--bg3)", padding: "1px 4px", borderRadius: 4,
                        fontSize: 9, display: "flex", alignItems: "center", gap: 2,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span>{pmI}</span>
                      <span>{pmL}</span>
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", flexShrink: 0 }}>
                  -{fmtC(t.amount)}원
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
