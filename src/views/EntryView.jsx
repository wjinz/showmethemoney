import { useState } from "react";
import { Card, Chip } from "../components/UI";
import { CAT, CATS } from "../constants";
import { fmtS, toDateStr } from "../utils/helpers";
import { runOCR } from "../utils/ocr";

const nowStr = () => toDateStr(new Date());

export function EntryView({ names, onSave, onDelete, onEdit, tx, cards }) {
  const [who, setWho] = useState("husband");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [memo, setMemo] = useState("");
  const [cardId, setCardId] = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [date, setDate] = useState(nowStr());
  const [saved, setSaved] = useState(false);
  const [isOCR, setIsOCR] = useState(false);
  const [ocrStatus, setOcrStatus] = useState(null);  // null | "success" | "error"
  const [ocrMsg, setOcrMsg] = useState("");
  const [editingId, setEditingId] = useState(null);  // null = 신규, id = 수정 중

  const press = (v) => {
    if (v === "C") setAmount("");
    else if (v === "⌫") setAmount(amount.slice(0, -1));
    else if (amount.length < 9) setAmount(amount + v);
  };

  const resetForm = (keepDate = false) => {
    setAmount(""); setCat(""); setMemo(""); setCardId(""); setPayMethod("credit");
    if (!keepDate) setDate(nowStr());
    setEditingId(null);
  };

  const save = () => {
    if (!amount || !cat) return;
    const payload = { who, amount: parseInt(amount), cat, memo, cardId, payMethod, date };
    if (editingId) {
      onEdit(editingId, payload);
    } else {
      onSave(payload);
    }
    setSaved(true);
    setTimeout(() => { setSaved(false); resetForm(); }, 900);
  };

  // 수정 모드 시작: 기존 항목 데이터로 폼 채우기
  const startEdit = (t) => {
    setWho(t.who);
    setAmount(String(t.amount));
    setCat(t.cat);
    setMemo(t.memo || "");
    setCardId(t.cardId || "");
    setPayMethod(t.payMethod || "credit");
    setDate(t.date);
    setEditingId(t.id);
    // 폼 상단으로 스크롤
    document.querySelector(".entry-scroll-top")?.scrollIntoView({ behavior: "smooth" });
  };

  const cancelEdit = () => resetForm();

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsOCR(true); setOcrStatus(null);
    try {
      const res = await runOCR(file);
      let filled = 0;
      if (res.amount && res.amount > 0) { setAmount(String(res.amount)); filled++; }
      if (res.cat && CAT[res.cat])      { setCat(res.cat);              filled++; }
      if (res.memo)                     { setMemo(res.memo);            filled++; }
      if (filled > 0) { setOcrStatus("success"); setOcrMsg(`${filled}개 항목 자동 입력`); }
      else            { setOcrStatus("error");   setOcrMsg("인식 실패"); }
    } catch (err) {
      setOcrStatus("error"); setOcrMsg(err.message ?? "OCR 오류");
    } finally {
      setIsOCR(false);
      setTimeout(() => { setOcrStatus(null); setOcrMsg(""); }, 2500);
    }
  };

  // 선택한 날짜의 내역 목록
  const dateTx = tx.filter(t => t.date === date).sort((a, b) => b.id - a.id);

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>

      {/* 헤더 */}
      <div className="entry-scroll-top u1" style={{ padding: "22px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div className="serif" style={{ fontSize: 21 }}>{editingId ? "내역 수정" : "지출 기록"}</div>
        {/* 날짜 피커 */}
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); if (editingId) cancelEdit(); }}
          style={{
            background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9,
            color: "var(--text)", fontSize: 12, padding: "5px 10px", outline: "none",
            colorScheme: "dark", cursor: "pointer",
          }}
        />
      </div>

      {/* 수정 모드 배너 */}
      {editingId && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "var(--goldD)", border: "1px solid var(--gold)",
          borderRadius: 10, padding: "9px 14px", marginBottom: 10, fontSize: 12, color: "var(--gold)",
        }}>
          <span>✏️ 내역 수정 중</span>
          <button onClick={cancelEdit} style={{
            background: "none", border: "1px solid var(--gold)", borderRadius: 7,
            color: "var(--gold)", cursor: "pointer", fontSize: 11, padding: "2px 9px",
          }}>취소</button>
        </div>
      )}

      {/* 누가 쓴 건지 */}
      <div className="u2" style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {["husband", "wife"].map(r => (
          <button key={r} onClick={() => setWho(r)} style={{
            flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
            background: who === r ? (r === "husband" ? "var(--hD)" : "var(--wD)") : "var(--bg2)",
            border: `1px solid ${who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--border)"}`,
            color: who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--text2)",
            transition: "all .2s",
          }}>{r === "husband" ? names.husband : names.wife}</button>
        ))}
      </div>

      {/* 금액 키패드 */}
      <Card className="u2" style={{ padding: "14px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
          <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 700 }}>AMOUNT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: amount ? "var(--text)" : "var(--text3)" }}>
            {amount ? parseInt(amount).toLocaleString() : 0}
            <span style={{ fontSize: 16, marginLeft: 4 }}>원</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map(v => (
            <button key={v} onClick={() => press(v)} style={{
              height: 48, borderRadius: 10, border: "1px solid var(--border)",
              background: "var(--bg3)", fontSize: 18, fontWeight: 700, cursor: "pointer",
              color: v === "C" ? "var(--red)" : v === "⌫" ? "var(--gold)" : "var(--text)",
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
            background: cat === c.id ? c.color + "22" : "var(--bg2)",
            border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
            color: cat === c.id ? c.color : "var(--text2)",
          }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <span style={{ fontSize: 11, fontWeight: cat === c.id ? 700 : 400 }}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* 메모 + 카드 */}
      <Card className="u4" style={{ padding: 12, marginBottom: 12 }}>
        <input value={memo} onChange={e => setMemo(e.target.value)}
          placeholder="어디에 쓰셨나요? (선택)"
          style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: 14, outline: "none", marginBottom: 10, padding: "4px" }} />
        {cards.length > 0 && (
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 10, borderTop: "1px solid var(--border2)", marginTop: 10 }}>
            {cards.map(c => (
              <button key={c.id} onClick={() => setCardId(cardId === c.id ? "" : c.id)} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                background: cardId === c.id ? c.color : "var(--bg3)",
                color: cardId === c.id ? "#fff" : "var(--text3)",
                border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
              }}>{c.icon} {c.name}</button>
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
            background: payMethod === m.id ? "var(--goldD)" : "var(--bg3)",
            border: `1px solid ${payMethod === m.id ? "var(--gold)" : "var(--border)"}`,
            color: payMethod === m.id ? "var(--gold)" : "var(--text2)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}><span>{m.i}</span>{m.l}</button>
        ))}
      </div>

      {/* OCR 피드백 */}
      {ocrStatus && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: ocrStatus === "success" ? "#1a3a1a" : "#3a1a1a",
          border: `1px solid ${ocrStatus === "success" ? "#4dab87" : "#d97f7f"}`,
          borderRadius: 10, padding: "8px 14px", marginBottom: 10, fontSize: 12,
        }}>
          <span>{ocrStatus === "success" ? "✓" : "!"}</span>
          <span>{ocrMsg}</span>
        </div>
      )}

      {/* 카메라 + 저장 */}
      <div className="u5" style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <label style={{
          width: 52, height: 52, borderRadius: 13, background: "var(--bg3)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, flexShrink: 0,
        }}>
          <input type="file" accept="image/*" capture="environment" onChange={handleOCR} style={{ display: "none" }} disabled={isOCR} />
          {isOCR ? <OCRSpinner /> : "📷"}
        </label>
        <button onClick={save} disabled={!amount || !cat} style={{
          flex: 1, padding: "15px",
          background: saved ? "var(--greenD)" : (!amount || !cat) ? "var(--bg3)" : editingId ? "var(--blueD,#1a2a4a)" : "var(--gold)",
          border: `1px solid ${saved ? "var(--green)" : (!amount || !cat) ? "var(--border)" : editingId ? "var(--blue,#5c8de8)" : "transparent"}`,
          borderRadius: 13,
          color: saved ? "var(--green)" : (!amount || !cat) ? "var(--text3)" : editingId ? "var(--blue,#5c8de8)" : "#fff",
          fontWeight: 700, fontSize: 15, cursor: (!amount || !cat) ? "default" : "pointer",
          boxShadow: (!amount || !cat) || saved ? "none" : editingId ? "0 4px 20px rgba(92,141,232,.3)" : "0 4px 24px rgba(200,168,75,.3)",
          transition: "all .2s",
        }}>
          {saved
            ? (editingId ? "✓ 수정됨" : "✓ 저장됨")
            : (!amount || !cat)
              ? "금액과 카테고리 선택"
              : editingId
                ? `수정 완료 · ${parseInt(amount).toLocaleString()}원`
                : `저장 · ${parseInt(amount).toLocaleString()}원`}
        </button>
      </div>

      {/* 해당 날짜 내역 */}
      <Card className="u5" style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 14px 8px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {date === nowStr() ? "오늘 내역" : `${date} 내역`}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>
            {fmtS(dateTx.reduce((s, t) => s + t.amount, 0))}원
          </span>
        </div>
        {dateTx.length === 0 ? (
          <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
            {date === nowStr() ? "오늘 입력된 내역이 없어요" : "해당 날짜에 내역이 없어요"}
          </div>
        ) : dateTx.map(t => {
          const c = CAT[t.cat] || CATS[8];
          const isEditing = editingId === t.id;
          return (
            <div key={t.id} style={{
              padding: "9px 14px", borderTop: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 10,
              background: isEditing ? "var(--goldD)" : "transparent",
              transition: "background .2s",
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: c.color + "1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{c.label}</span>
                  <Chip who={t.who} names={names} />
                </div>
                <div style={{ fontSize: 10, color: "var(--text2)" }}>{t.memo || "—"}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
                -{fmtS(t.amount)}원
              </span>
              {/* 수정 버튼 */}
              <button
                onClick={() => isEditing ? cancelEdit() : startEdit(t)}
                style={{
                  width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer",
                  background: isEditing ? "var(--gold)" : "var(--goldD)",
                  color: isEditing ? "#fff" : "var(--gold)",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
                title={isEditing ? "수정 취소" : "수정"}
              >✎</button>
              {/* 삭제 버튼 */}
              <button onClick={() => { if (isEditing) cancelEdit(); onDelete(t.id); }} style={{
                width: 26, height: 26, borderRadius: 7, border: "none", cursor: "pointer",
                background: "var(--redD)", color: "var(--red)", fontSize: 13,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>✕</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function OCRSpinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
    </svg>
  );
}
