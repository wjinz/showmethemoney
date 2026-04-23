import { IcoDel } from "./Icons.jsx";

/**
 * @typedef {{ value: string, onChange: (v: string) => void, style?: React.CSSProperties }} NumPadProps
 * @param {NumPadProps} props
 */
export function NumPad({ value, onChange, style = {} }) {
  const keys = ["1","2","3","4","5","6","7","8","9","00","0","⌫"];
  const handleKey = (k) => {
    if (k === "⌫") { onChange(value.slice(0, -1) || "0"); return; }
    if (value === "0" || value === "") { onChange(k === "00" ? "0" : k); return; }
    if (value.length >= 9) return;
    onChange(value + k);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, ...style }}>
      {keys.map(k => <KeyButton key={k} k={k} onTap={handleKey} />)}
    </div>
  );
}

/**
 * @param {{ k: string, onTap: (k: string) => void }} props
 */
function KeyButton({ k, onTap }) {
  const bg = k === "⌫" ? "#F3F4F6" : "transparent";
  return (
    <button
      onClick={() => onTap(k)}
      onMouseDown={(e) => { e.currentTarget.style.background = "#E5E7EB"; }}
      onMouseUp={(e) => { e.currentTarget.style.background = bg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bg; }}
      style={{
        height: 52, borderRadius: 14,
        background: bg,
        fontSize: k === "⌫" ? 13 : 20,
        fontWeight: 600, color: "#111827",
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background .1s",
        fontFamily: "inherit",
      }}
    >
      {k === "⌫" ? <IcoDel /> : k}
    </button>
  );
}
