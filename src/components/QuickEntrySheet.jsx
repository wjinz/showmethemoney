import { useState, useCallback, useMemo, useEffect } from "react";
import { CATS, getYear, getMonth } from "../constants";
import { toDateStr, getContrastText } from "../utils/helpers";
import { NumPad } from "./NumPad";
import { runOCR } from "../utils/ocr";
import { CardScanSheet } from "./CardScanSheet";
import { CAT } from "../constants";
import { BottomSheet } from "./BottomSheet.jsx";
import { Camera, AlertCircle, Edit3, X, ChevronRight } from "lucide-react";

/**
 * @param {{ 
 *   names: Record<string, string>, 
 *   plan: any, 
 *   cards: any[], 
 *   tx: any[], 
 *   onSave: (v: any) => void, 
 *   onClose: () => void, 
 *   onCardScan: () => void,
 *   onSosRequest: () => void,
 *   myRole: string
 * }} props
 */
export function QuickEntrySheet({ names, plan, cards, tx, onSave, onClose, onCardScan, onSosRequest, myRole }) {
  const [entryStep,  setEntryStep]  = useState('select'); // 'select' | 'form'
  const [who,        setWho]        = useState(myRole || "husband");
  const [amount,    setAmount]    = useState("");
  const [cat,       setCat]       = useState("");
  const [memo,      setMemo]      = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [date,      setDate]      = useState(toDateStr(new Date()));
  const [cardId,    setCardId]    = useState("");
  const [expanded,  setExpanded]  = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [isOCR,        setIsOCR]        = useState(false);
  const [ocrStatus,    setOcrStatus]    = useState(/** @type {'success'|'error'|null} */ (null));
  const [ocrMsg,       setOcrMsg]       = useState('');

  const partnerName = myRole === 'husband' ? (names.wife || '와이프') : (names.husband || '남편');
  
  // PWA Share Target 텍스트 처리
  useEffect(() => {
    // @ts-ignore
    const sharedText = window.__sharedText;
    if (sharedText) {
      setMemo(prev => prev ? prev + ' ' + sharedText : sharedText);
      setEntryStep('form');
      // @ts-ignore
      window.__sharedText = null;
    }
  }, []);

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsOCR(true); setOcrStatus(null);
    setEntryStep('form');
    try {
      const res = await runOCR(file);
      let filled = 0;
      if (res.amount && res.amount > 0) { setAmount(String(res.amount)); filled++; }
      if (res.cat && CAT[res.cat])      { setCat(res.cat);              filled++; }
      if (res.memo)                     { setMemo(res.memo);            filled++; }
      setOcrStatus(filled > 0 ? "success" : "error");
      setOcrMsg(filled > 0 ? `${filled}개 항목 자동 입력` : "인식 실패");
    } catch (err) {
      setOcrStatus("error"); setOcrMsg(err.message ?? "OCR 오류");
    } finally {
      setIsOCR(false);
      setTimeout(() => { setOcrStatus(null); setOcrMsg(""); }, 2500);
    }
  };

  const handleSave = () => {
    if (!amount || !cat) return;
    onSave({ who, amount: parseInt(amount), cat, memo, payMethod, date, cardId, type: "expense" });
    setSaved(true);
    setTimeout(() => onClose(), 700);
  };

  const SORTED_CATS = useMemo(() => {
    const curYear = getYear();
    const curMonth = getMonth();
    const prefix = `${curYear}-${String(curMonth).padStart(2,'0')}`;
    const freqs = {};
    tx.forEach(t => {
      if(t.date && t.date.startsWith(prefix)) {
        freqs[t.cat] = (freqs[t.cat] || 0) + 1;
      }
    });
    return [...CATS].sort((a,b) => (freqs[b.id] || 0) - (freqs[a.id] || 0));
  }, [tx]);

  if (entryStep === 'select') {
    return (
      <BottomSheet isOpen onClose={onClose} title="무엇을 기록할까요?" maxHeight="70dvh">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0 20px' }}>
          
          {/* AI 영수증 스캔 */}
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*" capture="environment" onChange={handleOCR} style={{ display: "none" }} disabled={isOCR} />
            <div style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 24, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 18,
              transition: 'transform 0.2s'
            }}>
              <div style={{ 
                width: 56, height: 56, background: '#3B82F6', borderRadius: 16, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 8px 16px rgba(59,130,246,0.3)'
              }}>
                <Camera size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>AI 영수증 스캔</p>
                <p style={{ fontSize: 13, color: '#3B82F6', fontWeight: 500 }}>사진 한 장으로 자동 입력</p>
              </div>
              <ChevronRight size={20} color="var(--text3)" />
            </div>
          </label>

          {/* SOS 긴급 결재 */}
          <div 
            onClick={() => { onClose(); onSosRequest(); }}
            style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 24, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 18,
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: 56, height: 56, background: '#EF4444', borderRadius: 16, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 8px 16px rgba(239,68,68,0.25)'
            }}>
              <AlertCircle size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>SOS 긴급 결재</p>
              <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 500 }}>{partnerName}에게 애교있게 조르기 🥺</p>
            </div>
            <ChevronRight size={20} color="var(--text3)" />
          </div>

          {/* 직접 입력하기 */}
          <div 
            onClick={() => setEntryStep('form')}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 18,
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: 56, height: 56, background: 'var(--gold)', borderRadius: 16, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 8px 16px var(--goldD)'
            }}>
              <Edit3 size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>직접 입력하기</p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>카테고리와 금액을 한 땀 한 땀</p>
            </div>
            <ChevronRight size={18} color="var(--text3)" />
          </div>

        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet isOpen onClose={onClose} title={saved ? "✓ 저장됨" : "직접 입력"} maxHeight="92dvh">
      <div>
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

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[
              { id: "credit", l: "신용", i: "💳" },
              { id: "debit",  l: "체크", i: "🏦" },
              { id: "cash",   l: "현금", i: "💵" },
            ].map(m => (
              <button
                key={m.id}
                onClick={(e) => { e.stopPropagation(); setPayMethod(m.id); if(m.id==="cash") setCardId(""); }}
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

          {payMethod !== "cash" && (cards || []).length > 0 && (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
              {(cards || []).map(c => (
                <button
                  key={c.id}
                  onClick={(e) => { e.stopPropagation(); setCardId(cardId === c.id ? "" : c.id); }}
                  style={{
                    flexShrink: 0, padding: "7px 14px",
                    borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    background: cardId === c.id ? c.color : "var(--bg3)",
                    color: cardId === c.id ? getContrastText(c.color) : "var(--text2)",
                    border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
                    boxShadow: cardId === c.id ? `0 4px 12px ${c.color}44` : "none",
                    transition: "all 0.2s"
                  }}
                >{c.icon} {c.label ?? c.name}</button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: "100%", background: "var(--bg3)",
            border: "1px solid var(--border)", borderRadius: 12,
            padding: "10px", fontSize: 11, color: "var(--text2)",
            cursor: "pointer", marginBottom: 16,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
            opacity: 0.8
          }}
        >
          <span>{expanded ? "▲ 상세 입력 닫기" : "▼ 날짜 · 메모 추가"}</span>
        </button>

        {expanded && (
          <div style={{ marginBottom: 14, animation: "fadeIn 0.2s ease" }}>
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
                  outline: "none", flex: 1,
                }}
              />
            </div>
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
          </div>
        )}

        {ocrStatus && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, borderRadius: 10, padding: "8px 14px", marginBottom: 12, fontSize: 12,
            background: ocrStatus === "success" ? "#1a3a1a" : "#3a1a1a",
            border: `1px solid ${ocrStatus === "success" ? "#4dab87" : "#d97f7f"}`,
          }}>
            <span>{ocrStatus === "success" ? "✓" : "!"}</span>
            <span>{ocrMsg}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <label style={{
            width: 58, height: 58, borderRadius: 16, background: "var(--bg3)", border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 22, flexShrink: 0,
          }}>
            <input type="file" accept="image/*" capture="environment" onChange={handleOCR} style={{ display: "none" }} disabled={isOCR} />
            {isOCR ? <OCRSpinner /> : <Camera size={24} color="var(--text2)" />}
          </label>
          <button
            onClick={onCardScan}
            style={{
              width: 58, height: 58, borderRadius: 16, flexShrink: 0, cursor: "pointer",
              background: "var(--bg3)", border: "1px solid var(--border)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>🪪</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text2)" }}>카드</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!amount || !cat || saved}
            style={{
              flex: 1, padding: "17px",
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
              ? "저장"
              : `${parseInt(amount).toLocaleString()}원 저장`}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

function OCRSpinner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
    </svg>
  );
}
