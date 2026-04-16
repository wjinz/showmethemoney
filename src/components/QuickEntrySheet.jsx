import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { CATS, getYear, getMonth } from "../constants";
import { toDateStr, getContrastText } from "../utils/helpers";
import { NumPad } from "./NumPad";
import { CAT } from "../constants";
import { BottomSheet } from "./BottomSheet.jsx";
import { Camera, AlertCircle, Edit3, X, ChevronRight, FileDigit } from "lucide-react";
import { useOcrScan } from "../hooks/useOcrScan.js";
import { runOCR } from "../utils/ocr.js";

/**
 * 이번 달 자주 사용하는 지출 패턴
 * @typedef {Object} FrequentPattern
 * @property {number} count - 출현 빈도수
 * @property {number} amount - 가장 마지막(최신) 거래 금액
 * @property {string} cat - 카테고리 ID
 * @property {string} memo - 가맹점 이름
 */

/**
 * @param {any[]} tx
 * @returns {FrequentPattern[]}
 */
function getFrequentPatterns(tx) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  /** @type {Record<string, FrequentPattern>} */
  const freq = {};
  
  const filtered = tx.filter(t => t?.date?.startsWith(thisMonth));
  filtered.sort((a, b) => (a.date > b.date ? 1 : -1));
  
  filtered.forEach(t => {
    const key = `${t.cat}:${t.memo}`;
    if (!freq[key]) {
      freq[key] = { count: 0, amount: t.amount, cat: t.cat, memo: t.memo };
    }
    freq[key].count++;
    freq[key].amount = t.amount;
  });
  
  return Object.values(freq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

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

  const { phase: ocrPhase, data: ocrData, error: ocrError, startScan, reset: resetOcr } = useOcrScan(runOCR, 'single');
  const fileInputRef = useRef(null);
  
  const frequentPatterns = useMemo(() => getFrequentPatterns(tx || []), [tx]);

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

  // [Phase 3] OCR 자동 폼 입력 - phase/data 상태에 의존
  useEffect(() => {
    if (ocrPhase === 'review' && ocrData) {
      if (ocrData.amount) setAmount(String(ocrData.amount));
      if (ocrData.cat)    setCat(ocrData.cat);
      if (ocrData.memo)   setMemo(ocrData.memo);
    } else if (ocrPhase === 'idle' && ocrError) {
      alert(`AI 인식 실패: ${ocrError}`);
    }
  }, [ocrPhase, ocrData, ocrError]);

  const handleReceiptFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEntryStep('form');
    startScan(file);
  };

  const handleBulkFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // @ts-ignore
    window.__sharedFile = file;
    onClose();
    onCardScan(); // 상위 컴포넌트(Dashboard 등)에서 처리
  };

  const handleRetake = () => {
    resetOcr();
    setAmount(""); setCat(""); setMemo("");
    if (fileInputRef.current) fileInputRef.current.click();
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
      <BottomSheet isOpen onClose={onClose} title="무엇을 기록할까요?" maxHeight="75dvh">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0 20px' }}>
          
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*" onChange={handleReceiptFile} style={{ display: "none" }} />
            <div style={{
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 18,
              transition: 'transform 0.2s'
            }}>
              <div style={{ 
                width: 50, height: 50, background: '#3B82F6', borderRadius: 16, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 8px 16px rgba(59,130,246,0.3)'
              }}>
                <Camera size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>AI 영수증 스캔</p>
                <p style={{ fontSize: 12, color: '#3B82F6', fontWeight: 500 }}>사진 1장 → 금액·카테고리 자동 입력</p>
              </div>
              <ChevronRight size={20} color="var(--text3)" />
            </div>
          </label>

          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" accept="image/*" onChange={handleBulkFile} style={{ display: "none" }} />
            <div style={{
              background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 18,
              transition: 'transform 0.2s'
            }}>
              <div style={{ 
                width: 50, height: 50, background: '#8B5CF6', borderRadius: 16, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                boxShadow: '0 8px 16px rgba(139,92,246,0.3)'
              }}>
                <FileDigit size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>카드 내역 일괄 입력</p>
                <p style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 500 }}>명세서 스크린샷 → 여러 건 한꺼번에</p>
              </div>
              <ChevronRight size={20} color="var(--text3)" />
            </div>
          </label>

          <div 
            onClick={() => setEntryStep('form')}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 18,
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: 50, height: 50, background: 'var(--gold)', borderRadius: 16, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 8px 16px var(--goldD)'
            }}>
              <Edit3 size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>직접 입력하기</p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>카테고리와 금액을 한 땀 한 땀</p>
            </div>
            <ChevronRight size={18} color="var(--text3)" />
          </div>

          <div 
            onClick={() => { onClose(); onSosRequest(); }}
            style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 24, padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 18,
              cursor: 'pointer'
            }}
          >
            <div style={{ 
              width: 50, height: 50, background: '#EF4444', borderRadius: 16, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              boxShadow: '0 8px 16px rgba(239,68,68,0.25)'
            }}>
              <AlertCircle size={26} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>SOS 긴급 결재</p>
              <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>{partnerName}에게 애교있게 조르기 🥺</p>
            </div>
            <ChevronRight size={20} color="var(--text3)" />
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

        <div style={{ position: "relative" }}>
          {/* [Phase 3] OCR 로딩 오버레이 */}
          {ocrPhase === 'scanning' && (
            <div style={{
              position: 'absolute', inset: -8, zIndex: 10,
              background: 'rgba(var(--bg2-rgb), 0.85)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 12,
              borderRadius: 24, backdropFilter: 'blur(4px)'
            }}>
              <div style={{ fontSize: 40 }}>🧠</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>영수증 분석 중...</div>
            </div>
          )}

          {/* [Phase 3] 다시 스캔 버튼 */}
          {(ocrPhase === 'review' || (ocrPhase === 'idle' && ocrError)) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button type="button" onClick={handleRetake} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                📸 다시 스캔
              </button>
            </div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleReceiptFile} style={{ display: 'none' }} />

          {/* [Phase 6] 최신 금액 우선 빠른 입력 칩 */}
          {frequentPatterns.length > 0 && ocrPhase !== 'scanning' && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4, scrollbarWidth: 'none' }}>
              {frequentPatterns.map(p => {
                const catObj = Object.values(CATS).find(c=>c.id===p.cat);
                return (
                  <button
                    type="button"
                    key={`${p.cat}:${p.memo}`}
                    onClick={() => { setCat(p.cat); setMemo(p.memo); setAmount(String(p.amount)); }}
                    style={{
                      flexShrink: 0, padding: '7px 14px', borderRadius: 99,
                      border: '1px solid var(--border)', background: 'var(--bg3)',
                      fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer',
                    }}
                  >
                    {catObj?.icon} {p.memo || catObj?.label} 
                    <span style={{opacity:0.5, marginLeft: 4}}>{(p.amount||0).toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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

        <div style={{ display: "flex", gap: 8 }}>
          <label style={{
            width: 58, height: 58, borderRadius: 16, flexShrink: 0, cursor: "pointer",
            background: "var(--bg3)", border: "1px solid var(--border)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
            transition: "background 0.2s"
          }}>
            <input type="file" accept="image/*" onChange={handleReceiptFile} style={{ display: "none" }} />
            <span style={{ fontSize: 18, lineHeight: 1 }}>📸</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text2)" }}>AI 스캔</span>
          </label>
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
