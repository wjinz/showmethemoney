import { useState } from "react";
import { Card } from "./UI";
import { CAT, CATS } from "../constants";
import { toDateStr, getContrastText } from "../utils/helpers";

/**
 * 기존 지출 내역 수정/삭제 바텀 시트 모달
 * props:
 *   tx       - 수정할 트랜잭션 객체
 *   names    - { husband, wife }
 *   cards    - 카드 목록 (선택)
 *   onClose  - 모달 닫기
 *   onEdit   - (id, updates) => void
 *   onDelete - (id) => void
 */
export function TxEditModal({ tx, names, cards = [], onClose, onEdit, onDelete, plan: _plan=undefined }) {
  const [who,       setWho]       = useState(tx.who);
  const [amount,    setAmount]    = useState(String(tx.amount));
  const [cat,       setCat]       = useState(tx.cat);
  const [memo,      setMemo]      = useState(tx.memo || "");
  const [payMethod, setPayMethod] = useState(tx.payMethod || "credit");
  const [date,      setDate]      = useState(tx.date);
  const [cardId,    setCardId]    = useState(tx.cardId || "");
  const [confirmDel, setConfirmDel] = useState(false);

  const press = (v, e) => {
    e.stopPropagation();
    if (v === "C") setAmount("");
    else if (v === "⌫") setAmount(amount.slice(0, -1));
    else if (amount.length < 9) setAmount(amount + v);
  };

  const save = () => {
    if (!amount || !cat) return;
    onEdit(tx.id, { who, amount: parseInt(amount), cat, memo, payMethod, date, cardId });
    onClose();
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDel) { setConfirmDel(true); return; }
    onDelete(tx.id);
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <Card
        style={{ width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "20px 20px 40px", animation: "slideUp 0.25s ease-out", maxHeight: "92dvh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div style={{ width: 40, height: 5, background: "var(--border)", borderRadius: 99, margin: "0 auto 18px" }} />

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 20 }}>내역 수정</div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", fontSize: 20, color: "var(--text-faint)", cursor: "pointer" }}>✕</button>
        </div>

        {/* 날짜 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-alt)", borderRadius: 12, padding: "9px 14px", marginBottom: 14, border: "1px solid var(--border)" }}>
          <span>📅</span>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 14, outline: "none", flex: 1, cursor: "pointer" }}
          />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["husband", "wife"].map(r => (
            <button key={r} onClick={(e) => { e.stopPropagation(); setWho(r); }} style={{
              flex: 1, padding: "11px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: who === r ? (r === "husband" ? "var(--hD)" : "var(--wD)") : "var(--surface)",
              border: `1px solid ${who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--border)"}`,
              color: who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--text-muted)",
            }}>{r === "husband" ? names.husband : names.wife}</button>
          ))}
        </div>

        {/* 금액 키패드 */}
        <div style={{ background: "var(--surface-alt)", borderRadius: 16, padding: "16px", marginBottom: 14, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>금액</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: amount ? "var(--text)" : "var(--text-faint)" }}>
              {amount ? parseInt(amount).toLocaleString() : 0}
              <span style={{ fontSize: 16, marginLeft: 4, fontWeight: 500 }}>원</span>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
            {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v => (
              <button key={v} onClick={(e) => press(String(v), e)} style={{
                height: 48, borderRadius: 11, border: "1px solid var(--border)",
                background: "var(--surface)", fontSize: 18, fontWeight: 700, cursor: "pointer",
                color: v === "C" ? "var(--danger)" : v === "⌫" ? "var(--primary)" : "var(--text)",
              }}>{v}</button>
            ))}
          </div>
        </div>

        {/* 카테고리 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginBottom: 14 }}>
          {CATS.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 0",
              borderRadius: 13, cursor: "pointer", transition: "all .15s",
              background: cat === c.id ? c.color + "22" : "var(--surface-alt)",
              border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
              color: cat === c.id ? c.color : "var(--text-muted)",
            }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ fontSize: 11, fontWeight: cat === c.id ? 700 : 400 }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 메모 */}
        <div style={{ background: "var(--surface-alt)", borderRadius: 13, padding: "4px 14px", marginBottom: 14, border: "1px solid var(--border)" }}>
          <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="메모 (선택)"
            style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: 14, padding: "12px 0", outline: "none" }} />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[
            { id: "credit", l: "신용카드", i: "💳" },
            { id: "debit",  l: "체크/현금", i: "🏦" },
            { id: "cash",   l: "현금영수증", i: "💵" },
          ].map(m => (
            <button key={m.id} onClick={(e) => { e.stopPropagation(); setPayMethod(m.id); }} style={{
              flex: 1, padding: "9px", borderRadius: 12, cursor: "pointer", fontSize: 11, fontWeight: 700,
              background: payMethod === m.id ? "rgba(28,43,74,.08)" : "var(--surface-alt)",
              border: `1px solid ${payMethod === m.id ? "var(--primary)" : "var(--border)"}`,
              color: payMethod === m.id ? "var(--primary)" : "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}><span>{m.i}</span>{m.l}</button>
          ))}
        </div>

        {cards.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
            {cards.map(c => (
              <button key={c.id} onClick={(e) => { e.stopPropagation(); setCardId(cardId === c.id ? "" : c.id); }} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: cardId === c.id ? c.color : "var(--surface-alt)",
                color: cardId === c.id ? getContrastText(c.color) : "var(--text-faint)",
                border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
        )}

        {/* 삭제 + 저장 */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDelete}
            style={{
              width: confirmDel ? "auto" : 52, flexShrink: 0,
              padding: confirmDel ? "0 16px" : "0",
              height: 52, borderRadius: 14, border: `1px solid ${confirmDel ? "var(--danger)" : "var(--border)"}`,
              background: confirmDel ? "var(--danger-bg1)" : "var(--surface-alt)",
              color: confirmDel ? "var(--danger)" : "var(--text-faint)",
              cursor: "pointer", fontSize: confirmDel ? 12 : 18, fontWeight: 700,
              transition: "all .2s", whiteSpace: "nowrap",
            }}
          >
            {confirmDel ? "정말 삭제?" : "🗑️"}
          </button>

          {/* 확인 삭제 시 취소 버튼 */}
          {confirmDel && (
            <button onClick={() => setConfirmDel(false)} style={{
              flexShrink: 0, padding: "0 12px", height: 52, borderRadius: 14,
              border: "1px solid var(--border)", background: "var(--surface-alt)",
              color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 700,
            }}>취소</button>
          )}

          <button onClick={save} disabled={!amount || !cat} style={{
            flex: 1, height: 52, borderRadius: 14, border: "none", fontSize: 15, fontWeight: 700,
            background: (!amount || !cat) ? "var(--surface-alt)" : "var(--primary)",
            color: (!amount || !cat) ? "var(--text-faint)" : "#fff",
            cursor: (!amount || !cat) ? "default" : "pointer",
            boxShadow: (!amount || !cat) ? "none" : "0 6px 20px rgba(200,168,75,.3)",
            transition: "all .2s",
          }}>수정 완료</button>
        </div>
      </Card>
    </div>
  );
}
