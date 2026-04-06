import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, User, Heart } from 'lucide-react';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth } from '../../constants/index.js';
import { THEME_TOKENS as T } from '../../styles/tokens.js';

/**
 * @typedef {import('../../constants/index.js').TxItem} TxItem
 * @typedef {import('../../constants/index.js').GoalItem} GoalItem
 */

/**
 * @param {{
 *   plan: {
 *     salary?: { husband: number, wife: number },
 *     personalAllowancePct?: number,
 *   },
 *   tx: TxItem[],
 *   names: Record<string, string>,
 *   myRole: string
 * }} props
 */
export function AllowanceInsightWidget({ plan, tx, names, myRole }) {
  const currentMonth = useMemo(() => {
    const y = getYear(), m = getMonth();
    return `${y}-${String(m).padStart(2, '0')}`;
  }, []);

  const calculateAllowance = (/** @type {string} */ role) => {
    const allw = (plan.salary?.[role] ?? 0) * (plan.personalAllowancePct ?? 0.2);
    const spent = tx
      .filter(t => t.who === role && t.is_private && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);
    const pct = allw > 0 ? Math.min(100, Math.round(spent / allw * 100)) : 0;
    const left = Math.max(allw - spent, 0);
    return { allw, spent, pct, left };
  };

  const h = useMemo(() => calculateAllowance('husband'), [plan.salary, plan.personalAllowancePct, tx, currentMonth]);
  const w = useMemo(() => calculateAllowance('wife'), [plan.salary, plan.personalAllowancePct, tx, currentMonth]);

  const stats = [
    { role: 'husband', name: names.husband || '남편', color: 'var(--h)', data: h },
    { role: 'wife', name: names.wife || '와이프', color: 'var(--w)', data: w },
  ];

  return (
    <div style={{ padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <PiggyBank size={14} color="var(--gold)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.04em' }}>
          부부 용돈 현황
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {stats.map((s, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                  {s.name} {s.role === myRole && ' (나)'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>
                  {s.data.pct}%
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: s.data.pct > 90 ? 'var(--red)' : 'var(--text2)' }}>
                {fmtS(s.data.left)}원 남음
              </span>
            </div>
            
            <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.data.pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ 
                  height: '100%', 
                  background: s.data.pct > 90 ? 'var(--red)' : s.color, 
                  borderRadius: 4,
                  opacity: 0.8
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <p style={{ marginTop: 10, fontSize: 9, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center', opacity: 0.7 }}>
        * 개인별 비밀 용돈 지출 기반 🤫
      </p>
    </div>
  );
}
