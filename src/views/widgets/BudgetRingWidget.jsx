import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth } from '../../constants/index.js';

/**
 * @param {{
 *   budgets: Record<string, number>,
 *   tx: import('../../constants/index.js').TxItem[]
 * }} props
 */
export function BudgetRingWidget({ budgets, tx }) {
  const { spent, total, pct } = useMemo(() => {
    const y = getYear(), m = getMonth();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const s = tx.filter(t => t.date.startsWith(prefix)).reduce((acc, t) => acc + t.amount, 0);
    const tot = Object.values(budgets).reduce((acc, v) => acc + v, 0);
    return { spent: s, total: tot, pct: tot > 0 ? Math.min(100, Math.round(s / tot * 100)) : 0 };
  }, [budgets, tx]);

  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);

  const color = pct >= 100 ? '#d95f5f' : pct >= 80 ? '#c8a84b' : '#7A9E87';

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', alignSelf: 'flex-start' }}>Monthly Budget</div>
      <svg width={110} height={110} style={{ overflow: 'visible' }}>
        <circle cx={55} cy={55} r={r} fill="none" stroke="var(--border)" strokeWidth={8} />
        <motion.circle
          cx={55} cy={55} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: dash }}
          transition={{ duration: 1, ease: 'easeOut' }}
          transform="rotate(-90 55 55)"
        />
        <text x={55} y={50} textAnchor="middle" fontSize={18} fontWeight={800} fill="var(--text)">{pct}%</text>
        <text x={55} y={65} textAnchor="middle" fontSize={9} fill="var(--text2)">Spent</text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center' }}>
        {fmtS(spent)}원 / {fmtS(total)}원
      </div>
    </div>
  );
}
