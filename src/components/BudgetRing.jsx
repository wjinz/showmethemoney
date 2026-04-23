import { motion } from "framer-motion";

/**
 * @param {{ pct: number, size?: number, stroke?: number }} props
 */
export function BudgetRing({ pct, size = 128, stroke = 10 }) {
  const r = (size - stroke * 2) / 2 + stroke / 2;
  const circ = 2 * Math.PI * r;
  const safePct = Math.max(0, Math.min(pct, 1));
  const offset = circ * (1 - safePct);
  const color = pct > 0.85 ? "#E8715A" : pct > 0.65 ? "#F59E0B" : "#7A9E87";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  );
}
