import { useState } from "react";
import { Card, Chip } from "../components/UI";
import { TxEditModal } from "../components/TxEditModal";
import { CardScanSheet } from "../components/CardScanSheet";
import { CAT, CATS } from "../constants";
import { fmtS, toDateStr, getContrastText } from "../utils/helpers";

const nowStr = () => toDateStr(new Date());

export function EntryView({ names, plan, onSave, onDelete, onEdit, tx, cards }) {
  const [who,       setWho]       = useState("husband");
  const [amount,    setAmount]    = useState("");
  const [cat,       setCat]       = useState("");
  const [memo,      setMemo]      = useState("");
  const [cardId,    setCardId]    = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [date,      setDate]      = useState(nowStr());
  const [saved,     setSaved]     = useState(false);
  const [showCardScan, setShowCardScan] = useState(false);

  // 수정 모달: null 이면 닫힘, tx 객체면 해당 항목 편집 중
  const [editingTx, setEditingTx] = useState(null);

  const press = (v) => {
    if (v === "C") setAmount("");
    else if (v === "⌫") setAmount(amount.slice(0, -1));
    else if (amount.length < 9) setAmount(amount + v);
  };

  const save = () => {
    if (!amount || !cat) return;
    onSave({ who, amount: parseInt(amount), cat, memo, cardId, payMethod, date });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setAmount(""); setCat(""); setMemo(""); setCardId(""); setPayMethod("credit");
    }, 900);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // @ts-ignore
    window.__sharedFile = file;
    setShowCardScan(true);
  };

  // 선택한 날짜의 내역
  const dateTx = tx.filter(t => t.date === date).sort((a, b) => b.id - a.id);

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>

      {/* 헤더 + 날짜 피커 */}
      <div style={{ padding: "22px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="serif" style={{ fontSize: 21 }}>지출 기록</div>
        <input
          type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{
            background: "var(--surface-alt)", border: "1px solid var(--border)", borderRadius: 9,
            color: "var(--text)", fontSize: 12, padding: "5px 10px", outline: "none",
            cursor: "pointer",
          }}
        />
      </div>

      {/* 누가 (솔로 모드에서는 미표시) */}
      {!plan?.isSolo && (
        <div className="u2" style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {["husband", "wife"].map(r => (
            <button key={r} onClick={() => setWho(r)} style={{
              flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: who === r ? (r === "husband" ? "var(--hD)" : "var(--wD)") : "var(--surface)",
              border: `1px solid ${who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--border)"}`,
              color: who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--text-muted)",
              transition: "all .2s",
            }}>{r === "husband" ? names.husband : names.wife}</button>
          ))}
        </div>
      )}

      {/* 금액 키패드 */}
      <Card className="u2" style={{ padding: "14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
          <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>AMOUNT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: amount ? "var(--text)" : "var(--text-faint)" }}>
            {amount ? parseInt(amount).toLocaleString() : 0}
            <span style={{ fontSize: 16, marginLeft: 4 }}>원</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v => (
            <button key={v} onClick={() => press(v)} style={{
              height: 48, borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--surface-alt)", fontSize: 18, fontWeight: 700, cursor: "pointer",
              color: v === "C" ? "var(--danger)" : v === "⌫" ? "var(--primary)" : "var(--text)",
            }}>{v}</button>
          ))}
        </div>
      </Card>

      {/* 카테고리 */}
      <div className="u3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => setCat(c.id)} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 0",
            borderRadius: 12, cursor: "pointer", transition: "all .2s",
            background: cat === c.id ? c.color + "22" : "var(--surface)",
            border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
            color: cat === c.id ? c.color : "var(--text-muted)",
          }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <span style={{ fontSize: 11, fontWeight: cat === c.id ? 700 : 400 }}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* 메모 + 카드 */}
      <Card className="u4" style={{ padding: 12, marginBottom: 12 }}>
        <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="어디에 쓰셨나요? (선택)"
          style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: 14, outline: "none", padding: "4px" }} />
        {cards.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 10 }}>
            {cards.map(c => (
              <button key={c.id} onClick={() => setCardId(cardId === c.id ? "" : c.id)} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: cardId === c.id ? c.color : "var(--surface-alt)",
                color: cardId === c.id ? getContrastText(c.color) : "var(--text-faint)",
                border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
              }}>{c.icon} {c.label}</button>
            ))}
          </div>
        )}
      </Card>

      {/* 결제 수단 */}
      <div className="u4" style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          { id: "credit", l: "신용카드", i: "💳" },
          { id: "debit",  l: "체크/현금", i: "🏦" },
          { id: "cash",   l: "현금영수증", i: "💵" },
        ].map(m => (
          <button key={m.id} onClick={() => setPayMethod(m.id)} style={{
            flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: payMethod === m.id ? "rgba(28,43,74,.08)" : "var(--surface-alt)",
            border: `1px solid ${payMethod === m.id ? "var(--primary)" : "var(--border)"}`,
            color: payMethod === m.id ? "var(--primary)" : "var(--text-muted)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><span>{m.i}</span>{m.l}</button>
        ))}
      </div>

      {/* 카메라 + 카드스캔 + 저장 */}
      <div className="u5" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {/* 통합 AI 스캔 */}
        <label style={{
          width: 52, height: 52, borderRadius: 13, flexShrink: 0, cursor: "pointer",
          background: "var(--surface-alt)", border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          transition: "background 0.2s"
        }}>
          <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
          <span style={{ fontSize: 17, lineHeight: 1 }}>📸</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)" }}>AI 스캔</span>
        </label>
        <button onClick={save} disabled={!amount || !cat} style={{
          flex: 1, padding: "15px",
          background: saved ? "var(--success-bg1)" : (!amount || !cat) ? "var(--surface-alt)" : "var(--primary)",
          border: `1px solid ${saved ? "var(--success)" : (!amount || !cat) ? "var(--border)" : "transparent"}`,
          borderRadius: 13,
          color: saved ? "var(--success)" : (!amount || !cat) ? "var(--text-faint)" : "#fff",
          fontWeight: 700, fontSize: 15, cursor: (!amount || !cat) ? "default" : "pointer",
          boxShadow: (!amount || !cat) || saved ? "none" : "0 4px 24px rgba(200,168,75,.3)",
          transition: "all .2s",
        }}>
          {saved ? "✓ 저장됨" : (!amount || !cat) ? "금액과 카테고리 선택" : `저장 · ${parseInt(amount).toLocaleString()}원`}
        </button>
      </div>

      {/* 해당 날짜 내역 목록 */}
      <Card className="u5" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 14px 8px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {date === nowStr() ? "오늘 내역" : `${date.replace(/-/g, ".")} 내역`}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
            {fmtS(dateTx.reduce((s, t) => s + t.amount, 0))}원
          </span>
        </div>

        {dateTx.length === 0 ? (
          <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--text-faint)", fontSize: 12 }}>
            {date === nowStr() ? "오늘 입력된 내역이 없어요" : "해당 날짜에 내역이 없어요"}
          </div>
        ) : dateTx.map(t => {
          const c = CAT[t.cat] || CATS[8];
          const card = t.cardId ? (cards || []).find(cc => cc.id === t.cardId) : null;
          const pmI = t.payMethod === "credit" ? "💳" : t.payMethod === "debit" ? "🏦" : "💵";
          const pmL = card ? card.label : (t.payMethod === "credit" ? "신용" : t.payMethod === "debit" ? "체크" : "현금");

          return (
            <div
              key={t.id}
              onClick={(e) => { e.stopPropagation(); setEditingTx(t); }}
              style={{
                padding: "11px 14px", borderTop: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", transition: "background .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-alt)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, background: c.color + "1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                  <Chip who={t.who} names={names} />
                </div>
                <div style={{display:"flex", alignItems:"center", gap:4, fontSize:10, color:"var(--text-faint)"}}>
                  <span style={{color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.memo||"—"}</span>
                  <span>·</span>
                  <span style={{background:"var(--surface)", padding:"0 4px", borderRadius:4, fontSize:9, display:"flex", alignItems:"center", gap:2, border:"1px solid var(--border)"}}>
                    <span>{pmI}</span>
                    <span>{pmL}</span>
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: "var(--text)" }}>-{fmtS(t.amount)}원</span>
              <span style={{ fontSize: 13, color: "var(--text-faint)", flexShrink: 0 }}>✎</span>
            </div>
          );
        })}
      </Card>

      {/* 카드 이용내역 스캔 시트 */}
      {showCardScan && (
        <CardScanSheet
          who={who}
          onSave={onSave}
          onClose={() => setShowCardScan(false)}
        />
      )}

      {/* 수정 모달 */}
      {editingTx && (
        <TxEditModal
          tx={editingTx}
          names={names}
          cards={cards}
          onClose={() => setEditingTx(null)}
          onEdit={(id, updates) => { onEdit(id, updates); setEditingTx(null); }}
          onDelete={(id) => { onDelete(id); setEditingTx(null); }}
        />
      )}
    </div>
  );
}
