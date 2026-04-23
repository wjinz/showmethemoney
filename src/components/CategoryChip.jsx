/**
 * @param {{ label: string, selected: boolean, onClick: () => void }} props
 */
export function CategoryChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
      background: selected ? "#1C2B4A" : "#F3F4F6",
      color: selected ? "white" : "#374151",
      border: "none",
      cursor: "pointer",
      transition: "all .15s",
      whiteSpace: "nowrap",
      fontFamily: "inherit",
    }}>{label}</button>
  );
}
