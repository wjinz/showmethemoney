import { formatKRW } from "../utils/formatKRW.js";

/**
 * @param {{ amount: number, color?: string }} props
 */
export function AmountChip({ amount, color = "#1C2B4A" }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      background: color + "18",
      color,
    }}>
      {formatKRW(amount)}
    </span>
  );
}
