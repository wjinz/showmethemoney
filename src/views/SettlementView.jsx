import React, { useState, useMemo, useEffect, useRef } from "react";
import { useBudget } from "../context/BudgetContext.jsx";
import { useToast } from "../components/Toast.jsx";
 
/**
 * @typedef {import('../constants/index.js').CardBill} CardBill
 * @typedef {import('../constants/index.js').SettlementItem} SettlementItem
 * @typedef {import('../constants/index.js').CardItem} CardItem
 */
 
export function SettlementView({ onBack }) {
  const { settlements, setSettlements, cards, fixed } = useBudget();
  const { addToast } = useToast();
  
  const [isScanning, setIsScanning] = useState(false);
  const scanTargetRef = useRef(null);

  const autoFixedCash = useMemo(() => {
    return fixed.filter(f => !f.cardId).reduce((sum, f) => sum + f.amount, 0);
  }, [fixed]);

  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const existingData = useMemo(() => settlements.find(s => s.date === currentDate), [settlements, currentDate]);

  const [currentCash, setCurrentCash] = useState(0);
  const [fixedCash, setFixedCash] = useState(autoFixedCash);
  const [cardBills, setCardBills] = useState(/** @type {Record<string, number>} */ ({}));

  useEffect(() => {
    if (existingData) {
      setCurrentCash(existingData.currentCash || 0);
      setFixedCash(existingData.fixedCash ?? autoFixedCash);
      /** @type {Record<string, number>} */
      const bMap = {};
      existingData.cardBills.forEach(b => (bMap[b.cardId] = b.expectedAmount));
      setCardBills(bMap);
    } else {
      setCurrentCash(0);
      setFixedCash(autoFixedCash);
      setCardBills({});
    }
  }, [existingData, autoFixedCash, currentDate]);

  const prevDate = useMemo(() => {
    const [y, m] = currentDate.split("-").map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  }, [currentDate]);

  const prevSettlement = useMemo(() => settlements.find(s => s.date === prevDate), [settlements, prevDate]);

  const handleCardBillChange = (cardId, val) => {
    setCardBills(prev => ({ ...prev, [cardId]: parseInt(val.replace(/,/g, ''), 10) || 0 }));
  };

  const handleSave = () => {
    const totalBills = Object.values(cardBills).reduce((sum, val) => sum + (val || 0), 0);
    const expectedShortage = currentCash - fixedCash - totalBills;

    const billsArr = Object.entries(cardBills).map(([cardId, expectedAmount]) => ({
      cardId, expectedAmount: expectedAmount || 0
    }));

    const newItem = {
      id: existingData?.id || Date.now() * 1000 + (Math.random() * 1000 | 0),
      date: currentDate,
      cardBills: billsArr,
      fixedCash: fixedCash || 0,
      currentCash: currentCash || 0,
      expectedShortage
    };

    setSettlements(prev => {
      const filtered = prev.filter(s => s.date !== currentDate);
      return [...filtered, newItem];
    });
    addToast(`${currentDate} 정산 내역이 저장되었습니다.`, "success");
  };

  const totalCardBillsSum = Object.values(cardBills).reduce((sum, val) => sum + (val || 0), 0);
  const calcShortage = (currentCash || 0) - (fixedCash || 0) - totalCardBillsSum;
  const isSurplus = calcShortage >= 0;
 
  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cardId = scanTargetRef.current;
    if (!cardId) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result.split(',')[1];
        try {
          const res = await fetch('/api/ocr?mode=single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, type: file.type })
          });
          const data = await res.json();
          if (data?.amount) {
            handleCardBillChange(cardId, data.amount.toString());
            addToast(`OCR 인식 성공: ${data.amount.toLocaleString()}원`, "success");
          } else {
            addToast("금액을 인식하지 못했습니다.", "error");
          }
        } catch (err) {
          addToast("스캔 오류 발생", "error");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanning(false);
      addToast("파일 읽기 오류", "error");
    }
    e.target.value = '';
  };
 
  return (
    <div style={{ padding: "0 20px 80px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* OCR File Input Hidden */}
      <input type="file" id="settlement-ocr-input" accept="image/*" style={{ display: 'none' }} onChange={handleOcrUpload} />
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {onBack && (
            <button onClick={onBack} style={{ background: "transparent", fontSize: 20, padding: "4px 8px" }}>
              ◀
            </button>
          )}
          <h2 style={{ fontSize: 24, margin: 0 }}>결제 정산기</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", padding: "4px 8px", borderRadius: 8 }}>
          <button 
            style={{ padding: "4px 8px", fontSize: 16, background: "transparent" }}
            onClick={() => {
              const [y, m] = currentDate.split("-").map(Number);
              const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
              setCurrentDate(prev);
            }}
          >
            ◀
          </button>
          <span style={{ fontWeight: 700, minWidth: 60, textAlign: "center" }}>{currentDate}</span>
          <button 
            style={{ padding: "4px 8px", fontSize: 16, background: "transparent" }}
            onClick={() => {
              const [y, m] = currentDate.split("-").map(Number);
              const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
              setCurrentDate(next);
            }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        background: `linear-gradient(135deg, ${isSurplus ? "var(--greenD)" : "var(--redD)"}, var(--card-bg))`,
        padding: 20, borderRadius: 16, border: `1px solid ${isSurplus ? "var(--green)" : "var(--red)"}30`
      }}>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 8 }}>이번 달 예상 여유/부족액</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: isSurplus ? "var(--green)" : "var(--red)" }}>
          {calcShortage < 0 ? "-" : "+"}{Math.abs(calcShortage).toLocaleString()}원
        </div>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text2)" }}>보유 현금</span>
            <span>+{(currentCash || 0).toLocaleString()}원</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text2)" }}>고정 현금 지출</span>
            <span>-{(fixedCash || 0).toLocaleString()}원</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text2)" }}>카드 청구액 합계</span>
            <span>-{totalCardBillsSum.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      {/* Asset Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontSize: 16, margin: 0, color: "var(--text1)" }}>자산 현황</h3>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--text2)" }}>총 보유 현금 입력</span>
          <input 
            type="text" inputMode="numeric" 
            value={currentCash === 0 ? "" : currentCash.toLocaleString()}
            onChange={e => setCurrentCash(parseInt(e.target.value.replace(/,/g, ''), 10) || 0)}
            style={{ padding: "12px", borderRadius: 8, background: "var(--card-bg)", color: "var(--text1)", border: "1px solid var(--border)", fontSize: 16 }}
            placeholder="0"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--text2)" }}>고정 현금 지출</span>
            <button 
              onClick={() => setFixedCash(autoFixedCash)}
              style={{ fontSize: 11, background: "var(--highlight)", color: "white", padding: "2px 6px", borderRadius: 4 }}
            >
              자동 제안값({autoFixedCash.toLocaleString()}) 불러오기
            </button>
          </div>
          <input 
            type="text" inputMode="numeric"
            value={fixedCash === 0 ? "" : fixedCash.toLocaleString()}
            onChange={e => setFixedCash(parseInt(e.target.value.replace(/,/g, ''), 10) || 0)}
            style={{ padding: "12px", borderRadius: 8, background: "var(--card-bg)", color: "var(--text1)", border: "1px solid var(--border)", fontSize: 16 }}
            placeholder="0"
          />
        </label>
      </div>

      {/* Card Bills Inputs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
        <h3 style={{ fontSize: 16, margin: 0, color: "var(--text1)" }}>카드 청구 예정액</h3>
        {cards.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text3)", background: "var(--card-bg)", borderRadius: 12 }}>
            등록된 카드가 없습니다. 자산 설정에서 카드를 추가해주세요.
          </div>
        )}
        {cards.map(c => {
          const expected = cardBills[c.id] || 0;
          let diffStr = null;
          let diffColor = "var(--text3)";
          
          if (prevSettlement) {
            const prevBill = prevSettlement.cardBills.find(b => String(b.cardId) === String(c.id));
            if (prevBill !== undefined) {
              const diff = expected - prevBill.expectedAmount;
              if (diff > 0) {
                diffStr = `▲ +${diff.toLocaleString()}원`;
                diffColor = "var(--red)";
              } else if (diff < 0) {
                diffStr = `▼ ${diff.toLocaleString()}원`;
                diffColor = "var(--blue)";
              } else {
                diffStr = "- 지난달과 동일";
              }
            }
          }

          return (
            <div key={c.id} style={{ background: "var(--card-bg)", padding: 16, borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ background: c.color || "var(--highlight)", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{c.icon || "💳"}</div>
                  <span style={{ fontWeight: 600 }}>{c.label}</span>
                </div>
                {diffStr && (
                  <span style={{ fontSize: 12, color: diffColor, fontWeight: 700 }}>
                    {diffStr}
                  </span>
                )}
              </div>
              
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, display: "flex", gap: 6 }}>
                {c.paymentDay && <span>결제일: 매월 {c.paymentDay}일</span>}
                {c.billingStartDay && <span>(청구기간: {c.billingEndNextMonth ? '전월' : '당월'} {c.billingStartDay}일 ~ 당월 {c.billingEndDay}일)</span>}
              </div>

              <div style={{ position: "relative", display: "flex", gap: 8 }}>
                <button
                  onClick={() => {
                    scanTargetRef.current = String(c.id);
                    document.getElementById('settlement-ocr-input')?.click();
                  }}
                  style={{
                    padding: "12px 14px", borderRadius: 8, background: isScanning && scanTargetRef.current === String(c.id) ? "var(--bg)" : "var(--primary)", color: "white", fontSize: 14, fontWeight: 700, border: "none", flexShrink: 0
                  }}
                  disabled={isScanning}
                >
                  {isScanning && scanTargetRef.current === String(c.id) ? '스캔중...' : '📷 스캔'}
                </button>
                <div style={{ position: "relative", flex: 1 }}>
                  <input 
                    type="text" inputMode="numeric"
                    value={expected === 0 ? "" : expected.toLocaleString()}
                    onChange={e => handleCardBillChange(c.id, e.target.value)}
                    style={{ width: "100%", padding: "12px 30px 12px 12px", borderRadius: 8, background: "var(--bg)", color: "var(--text1)", border: "1px solid var(--border)", fontSize: 16, textAlign: "right", fontWeight: 700 }}
                    placeholder="0"
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text2)", pointerEvents: "none" }}>원</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={handleSave}
        style={{ width: "100%", padding: 16, borderRadius: 12, background: "var(--highlight)", color: "white", fontSize: 16, fontWeight: 700, marginTop: 10, border: "none" }}
      >
        정산 내역 저장하기
      </button>

    </div>
  );
}
