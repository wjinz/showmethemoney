import { useState, useRef } from "react";
import { formatKRW } from "../utils/formatKRW.js";
import { IcoChevD, IcoDel } from "./Icons.jsx";

/**
 * @typedef {{
 *   id: string | number,
 *   who: 'husband' | 'wife' | 'me' | 'partner',
 *   type?: 'daily' | 'item',
 *   date: string,
 *   amount: number,
 *   memo?: string,
 *   category?: string,
 *   hidden?: boolean,
 *   items?: Array<{ label: string, amount: number }> | null,
 * }} Tx
 *
 * @typedef {{
 *   tx: Tx,
 *   myRole: 'husband' | 'wife',
 *   names: { husband: string, wife: string },
 *   onDelete?: (id: string | number) => void,
 * }} TxRowProps
 *
 * @param {TxRowProps} props
 */
export function TxRow({ tx, myRole, names, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const pressTimer = useRef(/** @type {number | null} */ (null));

  const isMe = tx.who === myRole || tx.who === "me";
  const color = isMe ? "#1C2B4A" : "#7A9E87";
  const name = resolveName(tx.who, myRole, names, isMe);
  const canExpand = tx.type === "daily" && Array.isArray(tx.items) && tx.items.length > 0;

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setShowDel(v => !v), 500);
  };
  const endPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => canExpand && setExpanded(e => !e)}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        onMouseDown={startPress}
        onMouseUp={endPress}
        style={{
          background: "white", borderRadius: 16,
          padding: "12px 14px",
          boxShadow: "0 1px 3px rgba(0,0,0,.06)",
          display: "flex", alignItems: "center", gap: 12,
          cursor: canExpand ? "pointer" : "default",
        }}
      >
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <TxHeader name={name} color={color} type={tx.type} hidden={tx.hidden} />
          <TxBody memo={tx.memo} amount={tx.amount} canExpand={canExpand} />
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{tx.date}</span>
        </div>
        {showDel && onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
            style={{ padding: 6, borderRadius: 8, background: "#FEE2E2", border: "none", cursor: "pointer" }}
            aria-label="삭제"
          >
            <IcoDel color="#E8715A" size={18} />
          </button>
        )}
      </div>
      {expanded && canExpand && tx.items && (
        <div style={{ background: "#F9FAFB", borderRadius: "0 0 16px 16px", padding: "12px 14px 12px 28px", marginTop: -8 }}>
          {tx.items.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 12, color: "#6B7280" }}>· {item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{formatKRW(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {string | undefined} who
 * @param {'husband' | 'wife'} myRole
 * @param {{ husband: string, wife: string }} names
 * @param {boolean} isMe
 */
function resolveName(who, myRole, names, isMe) {
  if (isMe) return myRole === "husband" ? names.husband : names.wife;
  if (who === "husband") return names.husband;
  if (who === "wife") return names.wife;
  return myRole === "husband" ? names.wife : names.husband;
}

/**
 * @param {{ name: string, color: string, type?: 'daily' | 'item', hidden?: boolean }} props
 */
function TxHeader({ name, color, type, hidden }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color }}>{name}</span>
      {type === "daily" && (
        <span style={{ fontSize: 10, background: color + "18", color, padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>총액</span>
      )}
      {hidden && (
        <span style={{ fontSize: 10, background: "#F3F4F6", color: "#9CA3AF", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>비공개</span>
      )}
    </div>
  );
}

/**
 * @param {{ memo?: string, amount: number, canExpand: boolean }} props
 */
function TxBody({ memo, amount, canExpand }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
      <span style={{ fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{memo || ""}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: "#111827" }}>{formatKRW(amount)}</span>
        {canExpand && <IcoChevD />}
      </div>
    </div>
  );
}
