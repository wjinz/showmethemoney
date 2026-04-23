import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useBudget } from "../context/BudgetContext.jsx";
import { useToast } from "../components/Toast.jsx";

/**
 * @typedef {import('../constants/index.js').CardBill} CardBill
 * @typedef {import('../constants/index.js').SettlementItem} SettlementItem
 * @typedef {import('../constants/index.js').CardItem} CardItem
 */

function nextMonth(d) {
  const [y, m] = d.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

function prevMonthOf(d) {
  const [y, m] = d.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** @param {{ onBack?: () => void }} props */
export function SettlementView({ onBack }) {
  const { settlements, setSettlements, cards, fixed } = useBudget();
  const { addToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const scanTargetRef = useRef(/** @type {string | null} */ (null));

  const autoFixedCash = useMemo(
    () => fixed.filter(f => !f.cardId).reduce((sum, f) => sum + f.amount, 0),
    [fixed]
  );

  const [currentDate, setCurrentDate] = useState(thisMonth);
  const existingData = useMemo(
    () => settlements.find(s => s.date === currentDate),
    [settlements, currentDate]
  );

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
      return;
    }
    setCurrentCash(0);
    setFixedCash(autoFixedCash);
    setCardBills({});
  }, [existingData, autoFixedCash, currentDate]);

  const prevSettlement = useMemo(
    () => settlements.find(s => s.date === prevMonthOf(currentDate)),
    [settlements, currentDate]
  );

  const totalCardBillsSum = Object.values(cardBills).reduce((s, v) => s + (v || 0), 0);
  const calcShortage = (currentCash || 0) - (fixedCash || 0) - totalCardBillsSum;
  const isSurplus = calcShortage >= 0;

  const handleCardBillChange = (cardId, val) => {
    const num = parseInt(String(val).replace(/,/g, ""), 10) || 0;
    setCardBills(prev => ({ ...prev, [cardId]: num }));
  };

  const handleSave = () => {
    const billsArr = Object.entries(cardBills).map(([cardId, expectedAmount]) => ({
      cardId, expectedAmount: expectedAmount || 0
    }));
    const newItem = {
      id: existingData?.id || Date.now() * 1000 + ((Math.random() * 1000) | 0),
      date: currentDate,
      cardBills: billsArr,
      fixedCash: fixedCash || 0,
      currentCash: currentCash || 0,
      expectedShortage: calcShortage
    };
    setSettlements(prev => {
      const filtered = prev.filter(s => s.date !== currentDate);
      return [...filtered, newItem];
    });
    addToast(`${currentDate} 정산 내역이 저장되었습니다.`, "success");
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files?.[0];
    const cardId = scanTargetRef.current;
    if (!file || !cardId) return;
    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        const base64 = result.split(",")[1];
        try {
          const res = await fetch("/api/ocr?mode=single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, type: file.type })
          });
          const data = await res.json();
          if (data?.amount) {
            handleCardBillChange(cardId, data.amount.toString());
            addToast(`청구액 ${data.amount.toLocaleString()}원을 찾았어요`, "success");
          } else {
            addToast("금액을 찾지 못했어요. 다시 시도해주세요", "error");
          }
        } catch {
          addToast("스캔 중 오류가 발생했어요", "error");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanning(false);
      addToast("파일을 읽을 수 없어요", "error");
    }
    e.target.value = "";
  };

  return (
    <div style={{ padding: "0 20px 96px", display: "flex", flexDirection: "column", gap: 20 }}>
      <input
        type="file" id="settlement-ocr-input"
        accept="image/*" style={{ display: "none" }}
        onChange={handleOcrUpload}
      />
      <Header onBack={onBack} date={currentDate} setDate={setCurrentDate} />
      <SummaryCard
        isSurplus={isSurplus}
        shortage={calcShortage}
        currentCash={currentCash || 0}
        fixedCash={fixedCash || 0}
        cardBills={totalCardBillsSum}
      />
      <AssetInputs
        currentCash={currentCash} setCurrentCash={setCurrentCash}
        fixedCash={fixedCash} setFixedCash={setFixedCash}
        autoFixedCash={autoFixedCash}
      />
      <CardBillsSection
        cards={cards} cardBills={cardBills} onChange={handleCardBillChange}
        prevSettlement={prevSettlement}
        isScanning={isScanning} scanTargetRef={scanTargetRef}
      />
      <SaveButton onClick={handleSave} />
    </div>
  );
}

function Header({ onBack, date, setDate }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", padding: 4, display: "flex" }}>
            <ChevronLeft size={22} color="#1C2B4A" />
          </button>
        )}
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#111827" }}>이번 달 정산</h2>
      </div>
      <MonthSwitcher date={date} setDate={setDate} />
    </div>
  );
}

function MonthSwitcher({ date, setDate }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "white", padding: "4px 6px", borderRadius: 99,
      border: "1px solid #E5E7EB"
    }}>
      <button onClick={() => setDate(prevMonthOf(date))} style={{ padding: 4, display: "flex" }}>
        <ChevronLeft size={16} color="#6B7280" />
      </button>
      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: "center", color: "#1C2B4A" }}>{date}</span>
      <button onClick={() => setDate(nextMonth(date))} style={{ padding: 4, display: "flex" }}>
        <ChevronRight size={16} color="#6B7280" />
      </button>
    </div>
  );
}

function SummaryCard({ isSurplus, shortage, currentCash, fixedCash, cardBills }) {
  const bg = isSurplus
    ? "linear-gradient(135deg, #ECFDF5, #D1FAE5)"
    : "linear-gradient(135deg, #FFF5F3, #FDE8E4)";
  const border = isSurplus ? "#6EE7B7" : "#FCA5A5";
  const amountColor = isSurplus ? "#10B981" : "#E8715A";
  const title = isSurplus ? "이번 달 여유가 있으실 것 같아요" : "조금 빠듯할 수 있어요";
  const amount = `${shortage < 0 ? "-" : "+"}${Math.abs(shortage).toLocaleString()}원`;
  return (
    <div style={{ background: bg, padding: 24, borderRadius: 24, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 13, color: "#6B7280", fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 34, fontWeight: 900, color: amountColor, letterSpacing: "-.02em" }}>{amount}</div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
        <Row label="보유 현금" value={`+${currentCash.toLocaleString()}원`} />
        <Row label="고정 지출" value={`-${fixedCash.toLocaleString()}원`} />
        <Row label="카드 청구액" value={`-${cardBills.toLocaleString()}원`} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: "#374151" }}>
      <span style={{ color: "#6B7280" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function AssetInputs({ currentCash, setCurrentCash, fixedCash, setFixedCash, autoFixedCash }) {
  return (
    <div style={{ background: "white", padding: 20, borderRadius: 24, boxShadow: "0 1px 3px rgba(0,0,0,.07)", display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 style={{ fontSize: 15, margin: 0, color: "#1C2B4A", fontWeight: 800 }}>자산 현황</h3>
      <LabeledInput label="지금 가진 현금" value={currentCash} onChange={setCurrentCash} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>이번 달 고정 현금 지출</span>
          <button
            onClick={() => setFixedCash(autoFixedCash)}
            style={{ fontSize: 11, background: "#1C2B4A", color: "white", padding: "3px 8px", borderRadius: 99, fontWeight: 600, border: "none" }}
          >
            자동 ({autoFixedCash.toLocaleString()})
          </button>
        </div>
        <AmountInput value={fixedCash} onChange={setFixedCash} />
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>{label}</span>
      <AmountInput value={value} onChange={onChange} />
    </div>
  );
}

function AmountInput({ value, onChange }) {
  return (
    <input
      type="text" inputMode="numeric"
      value={value === 0 ? "" : value.toLocaleString()}
      onChange={e => onChange(parseInt(e.target.value.replace(/,/g, ""), 10) || 0)}
      placeholder="0"
      style={{
        padding: "14px 16px", borderRadius: 16,
        background: "#F9FAFB", color: "#111827",
        border: "1px solid #E5E7EB", fontSize: 16, fontWeight: 700,
        textAlign: "right", outline: "none", fontFamily: "inherit",
        width: "100%",
      }}
    />
  );
}

function CardBillsSection({ cards, cardBills, onChange, prevSettlement, isScanning, scanTargetRef }) {
  if (cards.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", background: "white", borderRadius: 24, border: "1px dashed #E5E7EB" }}>
        등록된 카드가 없어요. 자산 설정에서 카드를 추가해주세요
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 4px", color: "#1C2B4A", fontWeight: 800 }}>카드 청구 예정액</h3>
      {cards.map(c => (
        <CardBillRow
          key={c.id} card={c}
          expected={cardBills[c.id] || 0}
          onChange={(v) => onChange(c.id, v)}
          prevSettlement={prevSettlement}
          isScanning={isScanning} scanTargetRef={scanTargetRef}
        />
      ))}
    </div>
  );
}

function CardBillRow({ card, expected, onChange, prevSettlement, isScanning, scanTargetRef }) {
  const prevBill = prevSettlement?.cardBills.find(b => String(b.cardId) === String(card.id));
  const diff = prevBill ? expected - prevBill.expectedAmount : null;
  const scanning = isScanning && scanTargetRef.current === String(card.id);
  return (
    <div style={{ background: "white", padding: 16, borderRadius: 20, border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: card.color || "#1C2B4A",
            width: 32, height: 32, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, color: "white"
          }}>{card.icon || "카"}</div>
          <span style={{ fontWeight: 700, color: "#111827" }}>{card.label}</span>
        </div>
        <DiffBadge diff={diff} />
      </div>
      <BillingHint card={card} />
      <div style={{ display: "flex", gap: 8 }}>
        <ScanButton
          scanning={scanning}
          onClick={() => {
            scanTargetRef.current = String(card.id);
            document.getElementById("settlement-ocr-input")?.click();
          }}
        />
        <AmountInput value={expected} onChange={onChange} />
      </div>
    </div>
  );
}

function DiffBadge({ diff }) {
  if (diff === null || diff === undefined) return null;
  if (diff === 0) return <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>지난달과 같음</span>;
  const up = diff > 0;
  const color = up ? "#E8715A" : "#10B981";
  const arrow = up ? "+" : "";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 700 }}>
      {up ? "▲" : "▼"} {arrow}{diff.toLocaleString()}원
    </span>
  );
}

function BillingHint({ card }) {
  if (!card.paymentDay && !card.billingStartDay) return null;
  return (
    <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10, display: "flex", gap: 8 }}>
      {card.paymentDay && <span>결제일 매월 {card.paymentDay}일</span>}
      {card.billingStartDay && (
        <span>({card.billingEndNextMonth ? "전월" : "당월"} {card.billingStartDay}일 ~ 당월 {card.billingEndDay}일)</span>
      )}
    </div>
  );
}

function ScanButton({ scanning, onClick }) {
  return (
    <button
      onClick={onClick} disabled={scanning}
      style={{
        padding: "12px 14px", borderRadius: 14,
        background: scanning ? "#E5E7EB" : "#1C2B4A",
        color: scanning ? "#6B7280" : "white",
        fontSize: 13, fontWeight: 700, border: "none",
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
      }}
    >
      <Camera size={16} />
      {scanning ? "스캔중" : "스캔"}
    </button>
  );
}

function SaveButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: 18, borderRadius: 20,
        background: "linear-gradient(135deg, #1C2B4A 0%, #2d4270 100%)",
        color: "white", fontSize: 16, fontWeight: 800,
        border: "none", boxShadow: "0 4px 16px rgba(28,43,74,.3)",
        marginTop: 4,
      }}
    >
      정산 내역 저장하기
    </button>
  );
}
