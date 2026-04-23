/**
 * @typedef {{ name: string, role?: string }} Person
 * @param {{ me: Person, partner: Person, onPartnerClick?: () => void }} props
 */
export function PartnerAvatars({ me, partner, onPartnerClick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <AvatarItem name={me.name} color="#1C2B4A" />
      <div style={{ color: "#D1D5DB", fontSize: 12 }}>•</div>
      <AvatarItem name={partner.name} color="#7A9E87" onClick={onPartnerClick} />
    </div>
  );
}

/**
 * @param {{ name: string, color: string, onClick?: () => void }} props
 */
function AvatarItem({ name, color, onClick }) {
  const initial = (name || "?")[0];
  return (
    <div
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 6, cursor: onClick ? "pointer" : "default" }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 14, fontWeight: 700,
        border: "2px solid white", boxShadow: `0 0 0 2px ${color}`,
      }}>{initial}</div>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{name}</span>
    </div>
  );
}
