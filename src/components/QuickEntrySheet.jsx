import { useState, useCallback, useMemo } from "react";
import { CATS, getYear, getMonth } from "../constants";
import { toDateStr } from "../utils/helpers";
import { NumPad } from "./NumPad";

export function QuickEntrySheet({ names, plan, cards, tx, onSave, onClose }) {
  const [who,       setWho]       = useState("husband");
  const [amount,    setAmount]    = useState("");
  const [cat,       setCat]       = useState("");
  const [memo,      setMemo]      = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [date,      setDate]      = useState(toDateStr(new Date()));
  const [cardId,    setCardId]    = useState("");
  const [expanded,  setExpanded]  = useState(false);
  const [saved,     setSaved]     = useState(false);

  const handleSave = () => {
    if (!amount || !cat) return;
    onSave({ who, amount: parseInt(amount), cat, memo, payMethod, date, cardId, type: "expense" });
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  // 최근 1개월 기준 tx로 카테고리 빈도순 정렬
  const SORTED_CATS = useMemo(() => {
    const curYear = getYear();
    const curMonth = getMonth();
    const prefix = `${curYear}-${String(curMonth).padStart(2,'0')}`;
    
    const freqs = {};
    tx.forEach(t => {
      // 대충 최근 내역만 카운트 (간소화를 위해 앞자리 일치 확인)
      if(t.date && t.date.startsWith(prefix)) {
        freqs[t.cat] = (freqs[t.cat] || 0) + 1;
      }
    });
    
    return [...CATS].sort((a,b) => (freqs[b.id] || 0) - (freqs[a.id] || 0));
  }, [tx]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--bg2)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border)",
          padding: "20px 20px 40px",
          animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "92dvh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          width: 40, height: 5,
          background: "var(--border2)", borderRadius: 99,
          margin: "0 auto 20px",
        }} />

        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div className="serif" style={{ fontSize: 20 }}>
            {saved ? "✓ 저장됨" : "지출 입력"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              fontSize: 20, color: "var(--text3)", cursor: "pointer",
            }}
          >✕</button>
        </div>

        {!plan?.isSolo && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["husband", "wife"].map(r => (
              <button
                key={r}
                onClick={() => setWho(r)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: who === r
                    ? (r === "husband" ? "var(--hD)" : "var(--wD)")
                    : "var(--bg3)",
                  border: `1px solid ${who === r
                    ? (r === "husband" ? "var(--h)" : "var(--w)")
                    : "var(--border)"}`,
                  color: who === r
                    ? (r === "husband" ? "var(--h)" : "var(--w)")
                    : "var(--text2)",
                  transition: "all .15s",
                }}
              >
                {r === "husband" ? names.husband : names.wife}
              </button>
            ))}
          </div>
        )}

        <div style={{
          background: "var(--bg3)", borderRadius: 18,
          padding: "18px", marginBottom: 16,
          border: "1px solid var(--border2)",
        }}>
          <div style={{
            display: "flex", justifyContent: "flex-end",
            alignItems: "baseline", marginBottom: 14, gap: 4,
          }}>
            <span style={{
              fontSize: 36, fontWeight: 800,
              color: amount ? "var(--text)" : "var(--text3)",
              letterSpacing: "-.02em", lineHeight: 1,
            }}>
              {amount ? parseInt(amount).toLocaleString() : "0"}
            </span>
            <span style={{ fontSize: 16, color: "var(--text2)", fontWeight: 400 }}>원</span>
          </div>

          <NumPad value={amount} onChange={setAmount} />

          <div style={{
            display: "flex", gap: 6, marginTop: 10, overflowX: "auto",
            paddingBottom: 2,
          }}>
            {[10000, 30000, 50000, 100000].map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(String(amount ? parseInt(amount) + amt : amt))}
                style={{
                  flexShrink: 0, padding: "5px 12px",
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                  background: "var(--goldD)",
                  border: "1px solid rgba(200,168,75,0.3)",
                  color: "var(--gold)", cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >+{(amt / 10000).toFixed(0)}만</button>
            ))}
          </div>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          gap: 7, marginBottom: 14,
        }}>
          {SORTED_CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5, padding: "12px 0",
                borderRadius: 14, cursor: "pointer",
                background: cat === c.id ? c.color + "22" : "var(--bg3)",
                border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
                color: cat === c.id ? c.color : "var(--text2)",
                transition: "all .15s ease",
                transform: cat === c.id ? "scale(1.02)" : "scale(1)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <span style={{
                fontSize: 11,
                fontWeight: cat === c.id ? 700 : 400,
              }}>{c.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: "100%", background: "var(--bg3)",
            border: "1px solid var(--border)", borderRadius: 12,
            padding: "10px", fontSize: 12, color: "var(--text2)",
            cursor: "pointer", marginBottom: 12,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
        >
          <span>📝</span>
          <span>{expanded ? "▲ 닫기" : "메모 · 날짜 · 카드 추가"}</span>
        </button>

        {expanded && (
          <div style={{ marginBottom: 14, animation: "fadeIn 0.2s ease" }}>
            {/* 날짜 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg3)", borderRadius: 12,
              padding: "10px 14px", marginBottom: 8,
              border: "1px solid var(--border)",
            }}>
              <span>📅</span>
              <input
                type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text)", fontSize: 14,
                  outline: "none", flex: 1, colorScheme: "dark",
                }}
              />
            </div>

            {/* 메모 */}
            <div style={{
              background: "var(--bg3)", borderRadius: 12,
              padding: "4px 14px", marginBottom: 8,
              border: "1px solid var(--border)",
            }}>
              <input
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="메모 입력 (선택)"
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "var(--text)", fontSize: 14,
                  padding: "12px 0", outline: "none",
                }}
              />
            </div>

            {/* 결제 수단 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[
                { id: "credit", l: "신용", i: "💳" },
                { id: "debit",  l: "체크", i: "🏦" },
                { id: "cash",   l: "현금", i: "💵" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPayMethod(m.id)}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 11,
                    cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: payMethod === m.id ? "var(--goldD)" : "var(--bg3)",
                    border: `1px solid ${payMethod === m.id ? "var(--gold)" : "var(--border)"}`,
                    color: payMethod === m.id ? "var(--gold)" : "var(--text2)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 5,
                  }}
                ><span>{m.i}</span>{m.l}</button>
              ))}
            </div>

            {/* 카드 선택 */}
            {cards.length > 0 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {cards.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCardId(cardId === c.id ? "" : c.id)}
                    style={{
                      flexShrink: 0, padding: "6px 12px",
                      borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: cardId === c.id ? c.color : "var(--bg3)",
                      color: cardId === c.id ? "#fff" : "var(--text3)",
                      border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
                    }}
                  >{c.icon} {c.label ?? c.name}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!amount || !cat || saved}
          style={{
            width: "100%", padding: "17px",
            borderRadius: 16,
            fontSize: 16, fontWeight: 700,
            cursor: (!amount || !cat) ? "default" : "pointer",
            background: saved
              ? "var(--greenD)"
              : (!amount || !cat)
              ? "var(--bg3)"
              : "var(--gold)",
            color: saved
              ? "var(--green)"
              : (!amount || !cat)
              ? "var(--text3)"
              : "#fff",
            border: saved
              ? "1px solid var(--green)"
              : "none",
            boxShadow: (!amount || !cat) || saved
              ? "none"
              : "0 8px 28px rgba(200,168,75,.35)",
            transition: "all .2s ease",
          }}
        >
          {saved
            ? "✓ 저장 완료"
            : (!amount || !cat)
            ? "금액과 카테고리를 선택해주세요"
            : `${parseInt(amount).toLocaleString()}원 저장하기`}
        </button>
      </div>
    </div>
  );
}
