import { useState, useMemo, useEffect, useRef } from "react";
import { CATS, getYear, getMonth } from "../constants";
import { toDateStr } from "../utils/helpers";
import { NumPad } from "./NumPad";
import { BottomSheet } from "./BottomSheet.jsx";
import { Camera, AlertCircle, Edit3, ChevronRight, FileDigit } from "lucide-react";
import { useOcrScan } from "../hooks/useOcrScan.js";
import { runOCR } from "../utils/ocr.js";
import { CategoryChip } from "./CategoryChip.jsx";
import { IcoAdd } from "./Icons.jsx";

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').Plan} Plan
 * @typedef {import('../constants/index.js').CardItem} CardItem
 * @typedef {{
 *   names: Record<string, string>,
 *   plan: Plan,
 *   cards: CardItem[],
 *   tx: TxItem[],
 *   onSave: (v: Omit<TxItem, 'id'>) => void,
 *   onClose: () => void,
 *   onCardScan: () => void,
 *   onSosRequest: () => void,
 *   myRole: string,
 * }} Props
 */

/**
 * 이번 달 자주 사용하는 지출 패턴
 * @typedef {{ count: number, amount: number, cat: string, memo: string }} FrequentPattern
 * @param {TxItem[]} tx
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
    if (!freq[key]) freq[key] = { count: 0, amount: t.amount, cat: t.cat, memo: t.memo };
    freq[key].count++;
    freq[key].amount = t.amount;
  });
  return Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 3);
}

/** @param {Props} props */
export function QuickEntrySheet({ names, plan, cards, tx, onSave, onClose, onCardScan, onSosRequest, myRole }) {
  const [step, setStep] = useState(/** @type {'select'|'form'} */ ('select'));
  const partnerName = myRole === "husband" ? (names.wife || "와이프") : (names.husband || "남편");

  useEffect(() => {
    const w = /** @type {Window & { __sharedText?: string | null }} */ (window);
    const sharedText = w.__sharedText;
    if (sharedText) {
      w.__sharedText = null;
      setStep("form");
    }
  }, []);

  if (step === "select") {
    return (
      <BottomSheet isOpen onClose={onClose} title="무엇을 기록할까요?" maxHeight="75dvh">
        <SelectMenu
          partnerName={partnerName}
          onDirect={() => setStep("form")}
          onReceipt={() => setStep("form")}
          onBulk={onCardScan}
          onSos={onSosRequest}
          onClose={onClose}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet isOpen onClose={onClose} title="지출 입력" maxHeight="92dvh">
      <EntryForm
        names={names} plan={plan} cards={cards} tx={tx}
        myRole={myRole} onSave={onSave} onClose={onClose}
      />
    </BottomSheet>
  );
}

/**
 * @param {{
 *   partnerName: string,
 *   onDirect: () => void,
 *   onReceipt: () => void,
 *   onBulk: () => void,
 *   onSos: () => void,
 *   onClose: () => void,
 * }} props
 */
function SelectMenu({ partnerName, onDirect, onReceipt, onBulk, onSos, onClose }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 0 12px" }}>
      <SelectCard
        bg="#EEF4FF" border="#C7D2FE" iconBg="#3B82F6" Icon={Camera}
        title="AI 영수증 스캔" sub="사진 1장으로 금액과 카테고리를 자동 입력해드릴게요"
        subColor="#3B82F6" onClick={onReceipt}
      />
      <SelectCard
        bg="#F5F0FF" border="#D8C8F5" iconBg="#8B5CF6" Icon={FileDigit}
        title="카드 내역 일괄 입력" sub="명세서 스크린샷으로 여러 건을 한 번에"
        subColor="#8B5CF6" onClick={() => { onClose(); onBulk(); }}
      />
      <SelectCard
        bg="#F9FAFB" border="#E5E7EB" iconBg="#1C2B4A" Icon={Edit3}
        title="직접 입력하기" sub="카테고리와 금액을 한 땀 한 땀"
        subColor="#6B7280" onClick={onDirect}
      />
      <SelectCard
        bg="#FFF5F3" border="#FDE8E4" iconBg="#E8715A" Icon={AlertCircle}
        title="SOS 긴급 결재" sub={`${partnerName}에게 부드럽게 부탁해보세요`}
        subColor="#E8715A" onClick={() => { onClose(); onSos(); }}
      />
    </div>
  );
}

/**
 * @param {{
 *   bg: string, border: string, iconBg: string,
 *   Icon: import('lucide-react').LucideIcon,
 *   title: string, sub: string, subColor: string, onClick: () => void,
 * }} props
 */
function SelectCard({ bg, border, iconBg, Icon, title, sub, subColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 20, padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: "pointer", transition: "transform 0.15s",
      }}
    >
      <div style={{
        width: 44, height: 44, background: iconBg, borderRadius: 14,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", flexShrink: 0,
      }}>
        <Icon size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: subColor, fontWeight: 500, lineHeight: 1.4 }}>{sub}</p>
      </div>
      <ChevronRight size={18} color="#9CA3AF" />
    </div>
  );
}

/** @param {Omit<Props,'onCardScan'|'onSosRequest'>} props */
function EntryForm({ names, plan, cards, tx, myRole, onSave, onClose }) {
  const [tab, setTab] = useState(/** @type {'daily'|'item'} */ ('item'));
  const [who, setWho] = useState(myRole || "husband");
  const [amount, setAmount] = useState("0");
  const [cat, setCat] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [shared, setShared] = useState(true);
  const [cardId, setCardId] = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [details, setDetails] = useState(/** @type {{label: string, amount: string}[]} */ ([{ label: "", amount: "0" }]));
  const [showMore, setShowMore] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const patterns = useMemo(() => getFrequentPatterns(tx || []), [tx]);
  const sortedCats = useMemo(() => sortCatsByFreq(tx), [tx]);
  const numVal = parseInt(amount) || 0;

  const handleSave = () => {
    if (!numVal) return;
    if (tab === "item" && !cat) return;
    onSave({
      who, amount: numVal,
      cat: tab === "daily" ? "daily" : cat,
      memo: tab === "daily" ? (memo || "하루 총액") : memo,
      payMethod, date, cardId,
      type: "expense",
      is_private: !shared,
    });
    setTimeout(onClose, 300);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {!plan?.isSolo && <WhoToggle who={who} setWho={setWho} names={names} />}
      <TabToggle tab={tab} setTab={setTab} />
      {patterns.length > 0 && (
        <FrequentChips patterns={patterns} onPick={(p) => { setCat(p.cat); setMemo(p.memo); setAmount(String(p.amount)); setTab("item"); }} />
      )}
      <AmountDisplay value={numVal} />
      <NumPad value={amount} onChange={setAmount} style={{ marginBottom: 16 }} />
      {tab === "daily" ? (
        <DailyOptions shared={shared} setShared={setShared} showDetail={showDetail} setShowDetail={setShowDetail} details={details} setDetails={setDetails} />
      ) : (
        <ItemOptions cat={cat} setCat={setCat} memo={memo} setMemo={setMemo} sortedCats={sortedCats} />
      )}
      <MoreOptions
        expanded={showMore} setExpanded={setShowMore}
        date={date} setDate={setDate}
        payMethod={payMethod} setPayMethod={setPayMethod}
        cardId={cardId} setCardId={setCardId}
        cards={cards || []}
      />
      <SaveButton disabled={!numVal || (tab === "item" && !cat)} onClick={handleSave} />
    </div>
  );
}

/**
 * @param {TxItem[]} tx
 */
function sortCatsByFreq(tx) {
  const prefix = `${getYear()}-${String(getMonth()).padStart(2, "0")}`;
  /** @type {Record<string, number>} */
  const freqs = {};
  (tx || []).forEach(t => {
    if (t.date && t.date.startsWith(prefix)) freqs[t.cat] = (freqs[t.cat] || 0) + 1;
  });
  return [...CATS].sort((a, b) => (freqs[b.id] || 0) - (freqs[a.id] || 0));
}

/**
 * @param {{ who: string, setWho: (v: string) => void, names: Record<string, string> }} props
 */
function WhoToggle({ who, setWho, names }) {
  return (
    <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 12, padding: 4, marginBottom: 12 }}>
      {["husband", "wife"].map(r => {
        const active = who === r;
        const color = r === "husband" ? "#1C2B4A" : "#7A9E87";
        return (
          <button
            key={r} onClick={() => setWho(r)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 10,
              background: active ? "white" : "transparent",
              color: active ? color : "#9CA3AF",
              fontWeight: active ? 700 : 500, fontSize: 13,
              boxShadow: active ? "0 1px 4px rgba(0,0,0,.08)" : "none",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >{r === "husband" ? names.husband : names.wife}</button>
        );
      })}
    </div>
  );
}

/**
 * @param {{ tab: 'daily'|'item', setTab: (v: 'daily'|'item') => void }} props
 */
function TabToggle({ tab, setTab }) {
  const tabs = /** @type {const} */ ([{ id: "daily", label: "오늘 총액" }, { id: "item", label: "건별 입력" }]);
  return (
    <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 14, padding: 4, marginBottom: 16 }}>
      {tabs.map(t => {
        const active = tab === t.id;
        return (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10,
              background: active ? "white" : "transparent",
              color: active ? "#1C2B4A" : "#9CA3AF",
              fontWeight: active ? 700 : 500, fontSize: 14,
              boxShadow: active ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              border: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >{t.label}</button>
        );
      })}
    </div>
  );
}

/** @param {{ patterns: FrequentPattern[], onPick: (p: FrequentPattern) => void }} props */
function FrequentChips({ patterns, onPick }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
      {patterns.map(p => {
        const cat = CATS.find(c => c.id === p.cat);
        return (
          <button
            key={`${p.cat}:${p.memo}`}
            onClick={() => onPick(p)}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 99,
              border: "1px solid #E5E7EB", background: "white",
              fontSize: 12, fontWeight: 600, color: "#374151",
              cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            {cat?.icon} {p.memo || cat?.label}{" "}
            <span style={{ opacity: 0.5, marginLeft: 4 }}>{(p.amount || 0).toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}

/** @param {{ value: number }} props */
function AmountDisplay({ value }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <p style={{ fontSize: 42, fontWeight: 900, color: "#1C2B4A", letterSpacing: "-2px", lineHeight: 1.1 }}>
        {value === 0 ? "₩0" : "₩" + value.toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

/**
 * @param {{
 *   shared: boolean, setShared: (v: boolean) => void,
 *   showDetail: boolean, setShowDetail: (v: boolean) => void,
 *   details: {label: string, amount: string}[], setDetails: (v: {label: string, amount: string}[]) => void,
 * }} props
 */
function DailyOptions({ shared, setShared, showDetail, setShowDetail, details, setDetails }) {
  return (
    <>
      <PrivacyToggle shared={shared} setShared={setShared} />
      <button
        onClick={() => setShowDetail(!showDetail)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "10px 0", borderRadius: 12,
          border: "1.5px dashed #D1D5DB", background: "transparent",
          color: "#7A9E87", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 12,
          transition: "all .15s",
        }}
      >
        <IcoAdd /> {showDetail ? "세부 내역 숨기기" : "세부 내역 추가하기 (선택)"}
      </button>
      {showDetail && <DetailItems details={details} setDetails={setDetails} />}
    </>
  );
}

/** @param {{ shared: boolean, setShared: (v: boolean) => void }} props */
function PrivacyToggle({ shared, setShared }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", background: "#F9FAFB", borderRadius: 14, marginBottom: 12,
    }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>세부 내역 공개</p>
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
          {shared ? "파트너에게 세부 내역을 보여줄게요" : "총액만 공유하고 세부 내역은 감춰요"}
        </p>
      </div>
      <div
        onClick={() => setShared(!shared)}
        role="switch"
        aria-checked={shared}
        style={{
          width: 44, height: 26, borderRadius: 13,
          background: shared ? "#7A9E87" : "#D1D5DB",
          position: "relative", cursor: "pointer", transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%", background: "white",
          position: "absolute", top: 3, left: shared ? 21 : 3,
          transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
    </div>
  );
}

/**
 * @param {{ details: {label: string, amount: string}[], setDetails: (v: {label: string, amount: string}[]) => void }} props
 */
function DetailItems({ details, setDetails }) {
  const update = (i, key, v) => {
    const next = details.map((d, idx) => idx === i ? { ...d, [key]: v } : d);
    setDetails(next);
  };
  return (
    <div style={{ background: "#F9FAFB", borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <p style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 10 }}>어디에 썼나요? (나만 볼 수 있어요)</p>
      {details.map((d, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            placeholder="항목 이름" value={d.label}
            onChange={(e) => update(i, "label", e.target.value)}
            style={detailInputStyle(1, "100%")}
          />
          <input
            placeholder="금액" value={d.amount === "0" ? "" : d.amount}
            onChange={(e) => update(i, "amount", e.target.value.replace(/\D/g, ""))}
            style={detailInputStyle(0, 90)}
          />
        </div>
      ))}
      <button
        onClick={() => setDetails([...details, { label: "", amount: "0" }])}
        style={{
          fontSize: 12, color: "#7A9E87", fontWeight: 600,
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
        }}
      >+ 항목 추가</button>
    </div>
  );
}

/**
 * @param {number} flex
 * @param {string|number} width
 * @returns {React.CSSProperties}
 */
function detailInputStyle(flex, width) {
  return {
    flex: flex || undefined,
    width: flex ? undefined : /** @type {string | number} */ (width),
    padding: "9px 12px", borderRadius: 10,
    border: "1px solid #E5E7EB", fontSize: 13,
    fontFamily: "inherit", outline: "none", background: "white",
  };
}

/**
 * @param {{
 *   cat: string, setCat: (v: string) => void,
 *   memo: string, setMemo: (v: string) => void,
 *   sortedCats: { id: string, label: string, icon: string, color: string }[],
 * }} props
 */
function ItemOptions({ cat, setCat, memo, setMemo, sortedCats }) {
  return (
    <>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 8 }}>카테고리</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {sortedCats.map(c => (
          <CategoryChip key={c.id} label={`${c.icon} ${c.label}`} selected={cat === c.id} onClick={() => setCat(c.id)} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#9CA3AF", fontWeight: 600, marginBottom: 6 }}>메모</p>
      <input
        placeholder="어디에 쓰셨나요?"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 14,
          border: "1.5px solid #E5E7EB", fontSize: 14,
          fontFamily: "inherit", outline: "none", background: "white",
          transition: "border-color .15s", marginBottom: 12,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#1C2B4A"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
      />
    </>
  );
}

/**
 * @param {{
 *   expanded: boolean, setExpanded: (v: boolean) => void,
 *   date: string, setDate: (v: string) => void,
 *   payMethod: string, setPayMethod: (v: string) => void,
 *   cardId: string, setCardId: (v: string) => void,
 *   cards: import('../constants/index.js').CardItem[],
 * }} props
 */
function MoreOptions({ expanded, setExpanded, date, setDate, payMethod, setPayMethod, cardId, setCardId, cards }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 12,
          background: "transparent", border: "none",
          color: "#6B7280", fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >{expanded ? "상세 옵션 닫기" : "날짜·결제수단 설정"}</button>
      {expanded && (
        <div style={{ background: "#F9FAFB", borderRadius: 14, padding: 14, marginTop: 4 }}>
          <DateInput date={date} setDate={setDate} />
          <PayMethodRow payMethod={payMethod} setPayMethod={setPayMethod} setCardId={setCardId} />
          {payMethod !== "cash" && cards.length > 0 && (
            <CardPicker cards={cards} cardId={cardId} setCardId={setCardId} />
          )}
        </div>
      )}
    </div>
  );
}

/** @param {{ date: string, setDate: (v: string) => void }} props */
function DateInput({ date, setDate }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "white", borderRadius: 12,
      padding: "10px 14px", marginBottom: 8,
      border: "1px solid #E5E7EB",
    }}>
      <span style={{ fontSize: 14, color: "#6B7280" }}>날짜</span>
      <input
        type="date" value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ background: "none", border: "none", color: "#111827", fontSize: 14, outline: "none", flex: 1, fontFamily: "inherit" }}
      />
    </div>
  );
}

/**
 * @param {{ payMethod: string, setPayMethod: (v: string) => void, setCardId: (v: string) => void }} props
 */
function PayMethodRow({ payMethod, setPayMethod, setCardId }) {
  const methods = /** @type {const} */ ([
    { id: "credit", l: "신용" },
    { id: "debit",  l: "체크" },
    { id: "cash",   l: "현금" },
  ]);
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
      {methods.map(m => {
        const active = payMethod === m.id;
        return (
          <button
            key={m.id}
            onClick={() => { setPayMethod(m.id); if (m.id === "cash") setCardId(""); }}
            style={{
              flex: 1, padding: "8px", borderRadius: 10,
              background: active ? "#1C2B4A" : "white",
              color: active ? "white" : "#6B7280",
              border: `1px solid ${active ? "#1C2B4A" : "#E5E7EB"}`,
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >{m.l}</button>
        );
      })}
    </div>
  );
}

/**
 * @param {{
 *   cards: import('../constants/index.js').CardItem[],
 *   cardId: string, setCardId: (v: string) => void,
 * }} props
 */
function CardPicker({ cards, cardId, setCardId }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
      {cards.map(c => {
        const active = cardId === String(c.id);
        return (
          <button
            key={c.id}
            onClick={() => setCardId(active ? "" : String(c.id))}
            style={{
              flexShrink: 0, padding: "7px 12px", borderRadius: 10,
              background: active ? c.color : "white",
              color: active ? "white" : "#6B7280",
              border: `1px solid ${active ? c.color : "#E5E7EB"}`,
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >{c.icon} {c.label}</button>
        );
      })}
    </div>
  );
}

/** @param {{ disabled: boolean, onClick: () => void }} props */
function SaveButton({ disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "16px 0",
        background: disabled ? "#E5E7EB" : "linear-gradient(135deg, #1C2B4A 0%, #2d4270 100%)",
        color: disabled ? "#9CA3AF" : "white",
        borderRadius: 16,
        fontSize: 16, fontWeight: 700,
        border: "none", cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(28,43,74,.35)",
        transition: "all .2s ease",
      }}
    >저장하기</button>
  );
}
