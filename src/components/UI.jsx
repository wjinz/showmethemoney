/**
 * @param {{ pct?: number, size?: number, stroke?: number, children?: React.ReactNode, color?: string, trackColor?: string }} props
 */
export function Ring({ pct = 0, size = 104, stroke = 6, children, color, trackColor }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = (Math.min(pct, 100) / 100) * c;
  const resolved = color ?? (pct > 100 ? "var(--danger)" : pct > 85 ? "#F59E0B" : "var(--secondary)");
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor ?? "var(--border)"} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={resolved} strokeWidth={stroke}
          strokeDasharray={`${p} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray .7s" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * @param {{ pct?: number, color?: string, h?: number }} props
 */
export function Bar({ pct = 0, color = "var(--secondary)", h = 5 }) {
  return (
    <div style={{ background: "var(--border)", borderRadius: 99, height: h, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`, height: "100%",
        background: pct > 100 ? "var(--danger)" : color,
        borderRadius: 99, transition: "width .7s ease",
        minWidth: pct > 0 ? 2 : 0,
      }} />
    </div>
  );
}

/**
 * @param {{ who: string, names: Record<string, string> }} props
 */
export function Chip({ who, names }) {
  const isH = who === "husband";
  const color = isH ? "#1C2B4A" : "#7A9E87";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700,
      background: color + "18", color,
      padding: "2px 7px", borderRadius: 99, flexShrink: 0,
    }}>{isH ? names.husband : names.wife}</span>
  );
}

/**
 * @param {{ children: React.ReactNode, style?: React.CSSProperties, className?: string, onClick?: () => void }} props
 */
export function Card({ children, style = {}, className = "", onClick }) {
  const cls = ["card", className].filter(Boolean).join(" ");
  return (
    <div className={cls} onClick={onClick} style={style}>
      {children}
    </div>
  );
}

/**
 * @param {{ sub?: string, title: string }} props
 */
export function SectionHeader({ sub, title }) {
  return (
    <div style={{ padding: "22px 0 14px" }}>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 3 }}>{sub}</div>}
      <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text)" }}>{title}</div>
    </div>
  );
}
