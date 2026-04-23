import { useState } from "react";
import { Card, Chip } from "../components/UI";
import { CAT, CATS } from "../constants";
import { toDateStr, getContrastText, fmtC } from "../utils/helpers";

const nowStr = () => toDateStr(new Date());

// OCR 결과 상태: null | "loading" | "success" | "error"
export function InputModal({ defaultWho, names, plan, cards, onClose, onSave, onCardScan, defaultIsPrivate = false }) {
  const [who, setWho] = useState(defaultWho);
  const [isPrivate] = useState(defaultIsPrivate);
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [memo, setMemo] = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [cardId, setCardId] = useState("");
  const [date, setDate] = useState(nowStr());

  const press = (v, e) => {
    if (e) e.stopPropagation();
    if (v === "C") setAmount("");
    else if (v === "⌫") setAmount(amount.slice(0, -1));
    else if (amount.length < 9) setAmount(amount + v);
  };

  const save = (e) => {
    if (e) e.stopPropagation();
    if (!amount || !cat) return;
    onSave({ who, amount: parseInt(amount), cat, memo, payMethod, date, cardId, is_private: isPrivate });
    onClose();
  };

  const handleFileSelect = (e) => {
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    
    // @ts-ignore
    window.__sharedFile = file;
    
    if (onCardScan) {
      onCardScan();
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <Card
        className="u-slide"
        style={{ width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 40px", animation: "slideUp 0.3s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 바 */}
        <div style={{ width: 40, height: 5, background: "var(--border)", borderRadius: 99, margin: "0 auto 20px" }} />

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="serif" style={{ fontSize: 22 }}>지출 직접 입력</div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: "none", border: "none", fontSize: 20, color: "var(--text-faint)", cursor: "pointer" }}>✕</button>
        </div>

        {/* 날짜 선택 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-alt)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 15 }}>📅</span>
          <input
            type="date"
            value={date}
            onChange={e => { e.stopPropagation(); setDate(e.target.value); }}
            style={{ background: "none", border: "none", color: "var(--text)", fontSize: 14, outline: "none", flex: 1, cursor: "pointer" }}
          />
        </div>

        {/* 누가 쓴 건지 (커플 모드 전용) */}
        {!plan?.isSolo && (
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {["husband", "wife"].map((r) => (
              <button
                key={r}
                onClick={(e) => { e.stopPropagation(); setWho(r); }}
                style={{
                  flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: who === r ? (r === "husband" ? "var(--hD)" : "var(--wD)") : "var(--surface)",
                  border: `1px solid ${who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--border)"}`,
                  color: who === r ? (r === "husband" ? "var(--h)" : "var(--w)") : "var(--text-muted)",
                }}
              >
                {r === "husband" ? names.husband : names.wife}
              </button>
            ))}
          </div>
        )}

        {/* 금액 키패드 */}
        <div style={{ background: "var(--surface-alt)", borderRadius: 16, padding: "20px", marginBottom: 20, border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>금액</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: amount ? "var(--text)" : "var(--text-faint)" }}>
              {amount ? fmtC(amount) : 0}
              <span style={{ fontSize: 18, marginLeft: 4, fontWeight: 500 }}>원</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map((v) => (
              <button
                key={v}
                onClick={(e) => press(String(v), e)}
                style={{ height: 52, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 20, fontWeight: 700, cursor: "pointer" }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 선택 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 0", borderRadius: 14, cursor: "pointer",
                background: cat === c.id ? c.color + "22" : "var(--surface-alt)",
                border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
                color: cat === c.id ? c.color : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <span style={{ fontSize: 11, fontWeight: cat === c.id ? 700 : 400 }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 메모 */}
        <div style={{ background: "var(--surface-alt)", borderRadius: 14, padding: "4px 14px", marginBottom: 20, border: "1px solid var(--border)" }}>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 입력 (선택)"
            style={{ width: "100%", background: "none", border: "none", color: "var(--text)", fontSize: 15, padding: "14px 0", outline: "none" }}
          />
        </div>

        {/* 결제 수단 & 카드 선택 */}
        <div style={{ marginBottom: 24, marginTop: -10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {[
              { id: "credit", l: "신용", i: "💳" },
              { id: "debit",  l: "체크", i: "🏦" },
              { id: "cash",   l: "현금", i: "💵" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); setPayMethod(m.id); if(m.id==="cash") setCardId(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: payMethod === m.id ? "rgba(28,43,74,.08)" : "var(--surface-alt)",
                  border: `1px solid ${payMethod === m.id ? "var(--primary)" : "var(--border)"}`,
                  color: payMethod === m.id ? "var(--primary)" : "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <span>{m.i}</span>{m.l}
              </button>
            ))}
          </div>

          {/* 카드 목록 (신용/체크일 때만 표시) */}
          {payMethod !== "cash" && (cards || []).length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "4px 0", scrollbarWidth: "none" }}>
              {(cards || []).map(c => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); setCardId(cardId === c.id ? "" : c.id); }}
                  style={{
                    flexShrink: 0, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: cardId === c.id ? c.color : "var(--surface-alt)",
                    color: cardId === c.id ? getContrastText(c.color) : "var(--text-muted)",
                    border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
                    boxShadow: cardId === c.id ? `0 4px 12px ${c.color}44` : "none",
                    transition: "all 0.2s"
                  }}
                >
                  {c.icon} {c.label || c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단: 스캔 버튼 + 저장 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{
            width: 55, height: 55, borderRadius: 14,
            background: "var(--surface-alt)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            cursor: "pointer", flexShrink: 0,
            transition: "all 0.2s ease",
          }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <span style={{ fontSize: 18, lineHeight: 1 }}>📸</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)" }}>AI 스캔</span>
          </label>

          <button
            onClick={save}
            disabled={!amount || !cat}
            style={{
              flex: 1, borderRadius: 16, border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer",
              background: (!amount || !cat) ? "var(--surface-alt)" : "var(--primary)",
              color: (!amount || !cat) ? "var(--text-faint)" : "#fff",
              boxShadow: (!amount || !cat) ? "none" : "0 8px 24px rgba(200,168,75,0.3)",
              transition: "all 0.2s ease",
            }}
          >
            지출 저장하기
          </button>
        </div>
      </Card>
    </div>
  );
}
