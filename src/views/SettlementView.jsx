import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useBudget } from "../context/BudgetContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { getBillingPeriod, parseLocalDate, fmt } from "../utils/helpers.js";

/**
 * @typedef {import('../constants/index.js').CardBill} CardBill
 * @typedef {import('../constants/index.js').SettlementItem} SettlementItem
 * @typedef {import('../constants/index.js').CardItem} CardItem
 * @typedef {import('../constants/index.js').ExtraExpense} ExtraExpense
 */

/** @param {string} d */
function nextMonth(d) {
  const [y, m] = d.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** @param {string} d */
function prevMonthOf(d) {
  const [y, m] = d.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 구버전 currentCash → 신버전 husbandCash/wifeCash 분배.
 * @param {SettlementItem | undefined} item
 * @returns {{ husband: number, wife: number }}
 */
function splitCash(item) {
  if (!item) return { husband: 0, wife: 0 };
  if (typeof item.husbandCash === 'number' || typeof item.wifeCash === 'number') {
    return { husband: item.husbandCash || 0, wife: item.wifeCash || 0 };
  }
  const total = item.salary ?? item.currentCash ?? 0;
  return { husband: Math.floor(total / 2), wife: Math.ceil(total / 2) };
}

/** @param {{ onBack?: () => void }} props */
export function SettlementView({ onBack }) {
  const { settlements, setSettlements, cards, fixed, tx, install, names } = useBudget();
  const { addToast } = useToast();

  const autoFixedCash = useMemo(
    () => fixed.filter(f => !f.cardId).reduce((sum, f) => sum + f.amount, 0),
    [fixed]
  );

  const [currentDate, setCurrentDate] = useState(thisMonth);
  const existingData = useMemo(
    () => settlements.find(s => s.date === currentDate),
    [settlements, currentDate]
  );

  const [husbandCash, setHusbandCash] = useState(0);
  const [wifeCash, setWifeCash] = useState(0);
  const [fixedCash, setFixedCash] = useState(0);
  const [cardBills, setCardBills] = useState(/** @type {Record<string, number>} */ ({}));
  const [extraExpenses, setExtraExpenses] = useState(/** @type {ExtraExpense[]} */ ([]));

  useEffect(() => {
    if (existingData) {
      const { husband, wife } = splitCash(existingData);
      setHusbandCash(husband);
      setWifeCash(wife);
      setFixedCash(typeof existingData.fixedCash === 'number' ? existingData.fixedCash : autoFixedCash);
      /** @type {Record<string, number>} */
      const bMap = {};
      existingData.cardBills.forEach(b => (bMap[b.cardId] = b.expectedAmount));
      setCardBills(bMap);
      setExtraExpenses(Array.isArray(existingData.extraExpenses) ? existingData.extraExpenses : []);
      return;
    }
    setHusbandCash(0);
    setWifeCash(0);
    setFixedCash(autoFixedCash);
    setCardBills({});
    setExtraExpenses([]);
  }, [existingData, autoFixedCash, currentDate]);

  const prevSettlement = useMemo(
    () => settlements.find(s => s.date === prevMonthOf(currentDate)),
    [settlements, currentDate]
  );

  const [yearStr, monthStr] = currentDate.split("-");
  const refDate = useMemo(() => new Date(Number(yearStr), Number(monthStr) - 1, 15), [yearStr, monthStr]);
  /** @type {Record<string, number>} */
  const appCardTotals = useMemo(() => {
    /** @type {Record<string, number>} */
    const acc = {};
    for (const card of cards) {
      const { cycleStart, cycleEnd } = getBillingPeriod(card, refDate);
      let sum = 0;
      for (const t of tx) {
        if (String(t.cardId) !== String(card.id)) continue;
        if (typeof t.date !== 'string') continue;
        const d = parseLocalDate(t.date);
        if (d >= cycleStart && d <= cycleEnd) sum += t.amount || 0;
      }
      for (const ins of install) {
        if (String(ins.cardId) !== String(card.id)) continue;
        sum += ins.monthly || 0;
      }
      for (const fx of fixed) {
        if (String(fx.cardId) !== String(card.id)) continue;
        sum += fx.amount || 0;
      }
      acc[String(card.id)] = sum;
    }
    return acc;
  }, [cards, tx, install, fixed, refDate]);

  const totalCash = (husbandCash || 0) + (wifeCash || 0);
  const totalCardBillsSum = Object.values(cardBills).reduce((s, v) => s + (v || 0), 0);
  const extraTotal = extraExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const calcShortage = totalCash - (fixedCash || 0) - totalCardBillsSum - extraTotal;
  const isSurplus = calcShortage >= 0;

  /** @param {string} cardId @param {string|number} val */
  const handleCardBillChange = (cardId, val) => {
    const num = parseInt(String(val).replace(/,/g, ""), 10) || 0;
    setCardBills(prev => ({ ...prev, [cardId]: num }));
  };

  const addExtra = () => {
    const newId = Date.now() * 1000 + ((Math.random() * 1000) | 0);
    setExtraExpenses(prev => [...prev, { id: newId, label: '', amount: 0 }]);
  };

  /** @param {number} id @param {Partial<ExtraExpense>} updates */
  const updateExtra = (id, updates) => {
    setExtraExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  /** @param {number} id */
  const removeExtra = (id) => {
    setExtraExpenses(prev => prev.filter(e => e.id !== id));
  };

  const copyExtrasFromPrev = () => {
    if (!prevSettlement?.extraExpenses?.length) {
      addToast("지난달에 입력된 일회성 지출이 없어요", "warning");
      return;
    }
    const cloned = prevSettlement.extraExpenses.map((e, i) => ({
      id: Date.now() * 1000 + i,
      label: e.label,
      amount: e.amount,
      cat: e.cat,
    }));
    setExtraExpenses(cloned);
    addToast(`지난달 일회성 지출 ${cloned.length}건을 복사했어요`, "success");
  };

  const handleSave = () => {
    const billsArr = Object.entries(cardBills).map(([cardId, expectedAmount]) => ({
      cardId, expectedAmount: expectedAmount || 0
    }));
    /** @type {SettlementItem} */
    const newItem = {
      id: existingData?.id || Date.now() * 1000 + ((Math.random() * 1000) | 0),
      date: currentDate,
      cardBills: billsArr,
      fixedCash: fixedCash || 0,
      currentCash: totalCash,
      salary: totalCash,
      husbandCash: husbandCash || 0,
      wifeCash: wifeCash || 0,
      extraExpenses: extraExpenses.filter(e => e.label.trim() || (e.amount || 0) > 0),
      expectedShortage: calcShortage,
    };
    setSettlements(prev => {
      const filtered = prev.filter(s => s.date !== currentDate);
      return [...filtered, newItem];
    });
    addToast(`${currentDate} 정산 내역이 저장되었습니다.`, "success");
  };

  return (
    <div className="view" style={{ background: 'var(--bg)' }}>
      <div className="view-header">
        <Header onBack={onBack} date={currentDate} setDate={setCurrentDate} />
      </div>
      <div className="scroll-area" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 16px calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
        <IntroBanner />
        <SummaryCard
          isSurplus={isSurplus}
          shortage={calcShortage}
          currentCash={totalCash}
          fixedCash={fixedCash || 0}
          cardBills={totalCardBillsSum}
          extraTotal={extraTotal}
        />
        <CardBillsSection
          step={1}
          cards={cards} cardBills={cardBills} onChange={handleCardBillChange}
          appCardTotals={appCardTotals}
          onAutoFillAll={() => setCardBills({ ...appCardTotals })}
          prevSettlement={prevSettlement}
        />
        <AssetInputs
          step={2}
          husbandLabel={names.husband || '남편'}
          wifeLabel={names.wife || '와이프'}
          husbandCash={husbandCash} setHusbandCash={setHusbandCash}
          wifeCash={wifeCash} setWifeCash={setWifeCash}
          fixedCash={fixedCash} setFixedCash={setFixedCash}
          autoFixedCash={autoFixedCash}
        />
        <ExtraExpensesSection
          step={3}
          items={extraExpenses}
          onAdd={addExtra}
          onUpdate={updateExtra}
          onRemove={removeExtra}
          onCopyPrev={copyExtrasFromPrev}
          hasPrev={!!prevSettlement?.extraExpenses?.length}
        />
        <SaveButton onClick={handleSave} hasExistingData={!!existingData} />
      </div>
    </div>
  );
}

/** @param {{ onBack?: () => void, date: string, setDate: (d: string) => void }} props */
function Header({ onBack, date, setDate }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: '100%' }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", padding: 4, display: "flex", border: 'none', cursor: 'pointer' }}>
            <ChevronLeft size={22} color="var(--primary)" />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "var(--text)", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>월간 정산 (수기 계산기)</h1>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>모든 항목을 직접 입력하세요</div>
        </div>
      </div>
      <MonthSwitcher date={date} setDate={setDate} />
    </div>
  );
}

/** @param {{ date: string, setDate: (d: string) => void }} props */
function MonthSwitcher({ date, setDate }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "var(--surface)", padding: "4px 6px", borderRadius: 99,
      border: "1px solid var(--border)", flexShrink: 0,
    }}>
      <button onClick={() => setDate(prevMonthOf(date))} style={{ padding: 4, display: "flex", border: 'none', background: 'transparent', cursor: 'pointer' }}>
        <ChevronLeft size={16} color="var(--text-muted)" />
      </button>
      <span style={{ fontSize: 12, fontWeight: 700, minWidth: 56, textAlign: "center", color: "var(--primary)" }}>{date}</span>
      <button onClick={() => setDate(nextMonth(date))} style={{ padding: 4, display: "flex", border: 'none', background: 'transparent', cursor: 'pointer' }}>
        <ChevronRight size={16} color="var(--text-muted)" />
      </button>
    </div>
  );
}

function IntroBanner() {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 14,
      background: "var(--surface-alt)", border: "1px solid var(--border)",
      fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
    }}>
      카드 청구액 · 부부 현금 · 고정/일회성 지출을 모두 직접 입력하면 잔액 또는 부족액을 자동 계산합니다.
    </div>
  );
}

/** @param {{ isSurplus: boolean, shortage: number, currentCash: number, fixedCash: number, cardBills: number, extraTotal: number }} props */
function SummaryCard({ isSurplus, shortage, currentCash, fixedCash, cardBills, extraTotal }) {
  const bg = isSurplus
    ? "linear-gradient(135deg, var(--success-bg1), var(--success-bg2))"
    : "linear-gradient(135deg, var(--danger-bg1), var(--danger-bg2))";
  const border = isSurplus ? "var(--success-border)" : "var(--danger-border)";
  const amountColor = isSurplus ? "var(--success)" : "var(--danger)";
  const title = isSurplus ? "이번 달 잔액" : "이번 달 부족액";
  const amount = `${shortage < 0 ? "-" : "+"}${Math.abs(shortage).toLocaleString()}원`;
  return (
    <div style={{ background: bg, padding: 20, borderRadius: 24, border: `1px solid ${border}` }}>
      <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: amountColor, letterSpacing: "-.02em" }}>{amount}</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
        <Row label="총 현금" value={`+${currentCash.toLocaleString()}원`} />
        <Row label="카드 청구액" value={`-${cardBills.toLocaleString()}원`} />
        <Row label="고정 지출" value={`-${fixedCash.toLocaleString()}원`} />
        <Row label="기타 일회성" value={`-${extraTotal.toLocaleString()}원`} />
      </div>
    </div>
  );
}

/** @param {{ label: string, value: string }} props */
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

/**
 * @param {{ step: number, husbandLabel: string, wifeLabel: string, husbandCash: number, setHusbandCash: (n: number) => void, wifeCash: number, setWifeCash: (n: number) => void, fixedCash: number, setFixedCash: (n: number) => void, autoFixedCash: number }} props
 */
function AssetInputs({ step, husbandLabel, wifeLabel, husbandCash, setHusbandCash, wifeCash, setWifeCash, fixedCash, setFixedCash, autoFixedCash }) {
  const total = (husbandCash || 0) + (wifeCash || 0);
  return (
    <div style={{ background: "var(--surface)", padding: 18, borderRadius: 20, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionTitle step={step} title="부부 현금 + 고정 지출" hint="실수령 현금을 각자 입력, 고정 지출도 직접 수정 가능" />
      <LabeledInput label={`${husbandLabel} 현금`} value={husbandCash} onChange={setHusbandCash} />
      <LabeledInput label={`${wifeLabel} 현금`} value={wifeCash} onChange={setWifeCash} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-alt)", borderRadius: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>총 현금 (자동 합산)</span>
        <span style={{ fontSize: 14, color: "var(--text)", fontWeight: 800 }}>{total.toLocaleString()}원</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>고정 지출 (반복)</span>
          {autoFixedCash > 0 && (
            <button
              onClick={() => setFixedCash(autoFixedCash)}
              style={{ fontSize: 11, background: "var(--primary)", color: "white", padding: "3px 8px", borderRadius: 99, fontWeight: 600, border: "none", cursor: 'pointer' }}
            >
              자동 ({autoFixedCash.toLocaleString()})
            </button>
          )}
        </div>
        <AmountInput value={fixedCash} onChange={setFixedCash} />
      </div>
    </div>
  );
}

/** @param {{ label: string, value: number, onChange: (n: number) => void }} props */
function LabeledInput({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{label}</span>
      <AmountInput value={value} onChange={onChange} />
    </div>
  );
}

/** @param {{ value: number, onChange: (n: number) => void }} props */
function AmountInput({ value, onChange }) {
  return (
    <input
      type="text" inputMode="numeric"
      value={value === 0 ? "" : value.toLocaleString()}
      onChange={e => onChange(parseInt(e.target.value.replace(/,/g, ""), 10) || 0)}
      placeholder="0"
      style={{
        padding: "12px 14px", borderRadius: 12,
        background: "var(--surface-alt)", color: "var(--text)",
        border: "1px solid var(--border)", fontSize: 15, fontWeight: 700,
        textAlign: "right", outline: "none", fontFamily: "inherit",
        width: "100%", boxSizing: 'border-box',
      }}
    />
  );
}

/**
 * @param {{
 *   step: number,
 *   cards: CardItem[],
 *   cardBills: Record<string, number>,
 *   onChange: (cardId: string, val: string|number) => void,
 *   appCardTotals: Record<string, number>,
 *   onAutoFillAll: () => void,
 *   prevSettlement: SettlementItem | undefined
 * }} props
 */
function CardBillsSection({ step, cards, cardBills, onChange, appCardTotals, onAutoFillAll, prevSettlement }) {
  if (cards.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-faint)", background: "var(--surface)", borderRadius: 20, border: "1px dashed var(--border)" }}>
        등록된 카드가 없어요. 설정 → 카드 관리에서 카드를 먼저 추가해주세요
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface)", padding: 18, borderRadius: 20, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <SectionTitle step={step} title="카드 청구 확정금액" hint={`등록된 카드 ${cards.length}장 모두 표시 · 직접 입력`} />
        <button
          onClick={onAutoFillAll}
          style={{ fontSize: 11, padding: "6px 10px", borderRadius: 99, border: "1px solid var(--primary)", background: "var(--surface)", color: "var(--primary)", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >앱 기록값 채우기</button>
      </div>
      {cards.map(c => (
        <CardBillRow
          key={c.id} card={c}
          expected={cardBills[String(c.id)] || 0}
          appTotal={appCardTotals[String(c.id)] || 0}
          onChange={(v) => onChange(String(c.id), v)}
          prevSettlement={prevSettlement}
        />
      ))}
    </div>
  );
}

/**
 * @param {{
 *   card: CardItem,
 *   expected: number,
 *   appTotal: number,
 *   onChange: (val: string|number) => void,
 *   prevSettlement: SettlementItem | undefined
 * }} props
 */
function CardBillRow({ card, expected, appTotal, onChange, prevSettlement }) {
  const prevBill = prevSettlement?.cardBills.find(b => String(b.cardId) === String(card.id));
  const diff = prevBill ? expected - prevBill.expectedAmount : null;
  const appDiff = expected > 0 && appTotal > 0 ? expected - appTotal : 0;
  const appDiffPct = appTotal > 0 && expected > 0 ? Math.abs(appDiff / appTotal) * 100 : 0;
  const isLargeDiff = appDiffPct > 10;
  return (
    <div style={{ background: "var(--surface-alt)", padding: 12, borderRadius: 14, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            background: card.color || "var(--primary)",
            width: 28, height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "white"
          }}>{card.icon || "카"}</div>
          <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>{card.label}</span>
        </div>
        <DiffBadge diff={diff} />
      </div>
      <BillingHint card={card} />
      {appTotal > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
          <span>앱 기록: <strong style={{ color: "var(--primary)" }}>{fmt(appTotal)}</strong></span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {expected > 0 && isLargeDiff && (
              <span style={{ color: "var(--danger)", fontWeight: 700 }}>차이 {appDiffPct.toFixed(0)}%</span>
            )}
            <button
              onClick={() => onChange(String(appTotal))}
              style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, border: "1px solid var(--primary)", background: "var(--surface)", color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            >이 값으로</button>
          </div>
        </div>
      )}
      <AmountInput value={expected} onChange={onChange} />
    </div>
  );
}

/** @param {{ diff: number | null }} props */
function DiffBadge({ diff }) {
  if (diff === null || diff === undefined) return null;
  if (diff === 0) return <span style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 600 }}>지난달과 같음</span>;
  const up = diff > 0;
  const color = up ? "var(--danger)" : "var(--success)";
  const arrow = up ? "+" : "";
  return (
    <span style={{ fontSize: 11, color, fontWeight: 700 }}>
      {up ? "▲" : "▼"} {arrow}{diff.toLocaleString()}원
    </span>
  );
}

/** @param {{ card: CardItem }} props */
function BillingHint({ card }) {
  if (!card.paymentDay && !card.billingStartDay) return null;
  return (
    <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 8, display: "flex", gap: 6, flexWrap: 'wrap' }}>
      {card.paymentDay && <span>결제 매월 {card.paymentDay}일</span>}
      {card.billingStartDay && (
        <span>({card.billingEndNextMonth ? "전월" : "당월"} {card.billingStartDay}~당월 {card.billingEndDay}일)</span>
      )}
    </div>
  );
}

/**
 * @param {{
 *   step: number,
 *   items: ExtraExpense[],
 *   onAdd: () => void,
 *   onUpdate: (id: number, updates: Partial<ExtraExpense>) => void,
 *   onRemove: (id: number) => void,
 *   onCopyPrev: () => void,
 *   hasPrev: boolean
 * }} props
 */
function ExtraExpensesSection({ step, items, onAdd, onUpdate, onRemove, onCopyPrev, hasPrev }) {
  return (
    <div style={{ background: "var(--surface)", padding: 18, borderRadius: 20, boxShadow: "var(--shadow)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <SectionTitle step={step} title="추가 기타 비용" hint="경조사·명절비 등 카드/고정비에 없는 추가 지출" />
        {hasPrev && (
          <button
            onClick={onCopyPrev}
            style={{ fontSize: 11, padding: "6px 10px", borderRadius: 99, border: "1px solid var(--primary)", background: "var(--surface)", color: "var(--primary)", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
          >지난달 복사</button>
        )}
      </div>
      {items.length === 0 && (
        <div style={{ padding: 14, textAlign: "center", color: "var(--text-faint)", fontSize: 12, background: "var(--surface-alt)", borderRadius: 10 }}>
          항목 없음 — 아래 버튼으로 추가
        </div>
      )}
      {items.map(item => (
        <ExtraExpenseRow key={item.id} item={item} onUpdate={onUpdate} onRemove={onRemove} />
      ))}
      <button
        onClick={onAdd}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "11px", borderRadius: 12,
          background: "var(--surface-alt)", color: "var(--primary)",
          border: "1px dashed var(--border-solid)",
          fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <Plus size={16} /> 항목 추가
      </button>
    </div>
  );
}

/**
 * @param {{
 *   item: ExtraExpense,
 *   onUpdate: (id: number, updates: Partial<ExtraExpense>) => void,
 *   onRemove: (id: number) => void
 * }} props
 */
function ExtraExpenseRow({ item, onUpdate, onRemove }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="text"
        value={item.label}
        placeholder="항목명 (예: 부모님 용돈)"
        onChange={e => onUpdate(item.id, { label: e.target.value })}
        style={{
          flex: 1, padding: "10px 12px", borderRadius: 10,
          background: "var(--surface-alt)", color: "var(--text)",
          border: "1px solid var(--border)", fontSize: 13, fontWeight: 600,
          outline: "none", fontFamily: "inherit", minWidth: 0,
        }}
      />
      <input
        type="text" inputMode="numeric"
        value={item.amount === 0 ? "" : item.amount.toLocaleString()}
        placeholder="금액"
        onChange={e => onUpdate(item.id, { amount: parseInt(e.target.value.replace(/,/g, ""), 10) || 0 })}
        style={{
          width: 100, padding: "10px 10px", borderRadius: 10,
          background: "var(--surface-alt)", color: "var(--text)",
          border: "1px solid var(--border)", fontSize: 13, fontWeight: 700,
          textAlign: "right", outline: "none", fontFamily: "inherit",
        }}
      />
      <button
        onClick={() => onRemove(item.id)}
        style={{
          padding: 8, borderRadius: 8, border: "none",
          background: "transparent", color: "var(--text-faint)",
          display: "flex", cursor: "pointer", flexShrink: 0,
        }}
        aria-label="삭제"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

/** @param {{ step: number, title: string, hint: string }} props */
function SectionTitle({ step, title, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1, minWidth: 0 }}>
      <span style={{
        flexShrink: 0,
        width: 22, height: 22, borderRadius: 99,
        background: "var(--primary)", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 800,
      }}>{step}</span>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 14, margin: 0, color: "var(--primary)", fontWeight: 800, lineHeight: 1.3 }}>{title}</h3>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{hint}</div>
      </div>
    </div>
  );
}

/** @param {{ onClick: () => void, hasExistingData: boolean }} props */
function SaveButton({ onClick, hasExistingData }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: 16, borderRadius: 16,
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-l) 100%)",
        color: "white", fontSize: 15, fontWeight: 800,
        border: "none", boxShadow: "var(--shadow-fab)",
        marginTop: 8, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      {hasExistingData ? '이번 달 정산 업데이트' : '이번 달 정산 저장'}
    </button>
  );
}
