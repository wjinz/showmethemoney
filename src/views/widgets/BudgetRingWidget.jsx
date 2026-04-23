import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth, getDay, getDaysInMonth } from '../../constants/index.js';

/**
 * @param {{
 *   budgets: Record<string, number>,
 *   tx: import('../../constants/index.js').TxItem[]
 * }} props
 */
export function BudgetRingWidget({ budgets, tx }) {
  const { spent, total, pct, remainingDays } = useMemo(() => {
    const y = getYear(), m = getMonth(), d = getDay();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const s = tx.filter(t => t.date.startsWith(prefix)).reduce((acc, t) => acc + t.amount, 0);
    const tot = Object.values(budgets).reduce((acc, v) => acc + v, 0);
    const remainD = Math.max(1, getDaysInMonth(y, m) - d);
    return { 
      spent: s, 
      total: tot, 
      pct: tot > 0 ? Math.min(100, Math.round((s / tot) * 100)) : 0,
      remainingDays: remainD
    };
  }, [budgets, tx]);

  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);

  const color = pct >= 100 ? '#d95f5f' : pct >= 80 ? '#c8a84b' : '#7A9E87';
  
  const remainingBudget = total - spent;
  const dailyPace = Math.round(remainingBudget / remainingDays);
  const isOver = remainingBudget < 0;

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'flex-start', fontWeight: 600 }}>이번 달 카테고리 예산</div>
      <svg width={110} height={110} style={{ overflow: 'visible', margin: '4px 0' }}>
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
        <text x={55} y={65} textAnchor="middle" fontSize={9} fill="var(--text-muted)">Spent</text>
      </svg>
      <div style={{ fontSize: 12, color: 'var(--text)', textAlign: 'center', fontWeight: 600 }}>
        {fmtS(spent)}원 <span style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 500 }}>/ {fmtS(total)}원</span>
      </div>
      
      <div style={{
        marginTop: 6, padding: '8px 12px', background: isOver ? 'var(--danger-bg1)' : 'var(--surface-alt)', 
        borderRadius: 8, textAlign: 'center', fontSize: 11, color: isOver ? 'var(--danger)' : 'var(--text-muted)',
        width: '100%', boxSizing: 'border-box', lineHeight: 1.4
      }}>
        {isOver ? (
          <>
            예산을 <strong style={{ color: 'var(--danger)' }}>{fmtS(Math.abs(remainingBudget))}원</strong> 초과했어요!<br/>
            다음 달을 위해 지출을 줄여보세요.
          </>
        ) : (
          <>
            전체 예산 중 <strong>{pct}%</strong>를 사용했습니다.<br/>
            하루 평균 <strong style={{ color: 'var(--text)' }}>{fmtS(dailyPace)}원</strong> 이내로 쓴다면 예산 내 방어가 가능합니다.
          </>
        )}
      </div>
    </div>
  );
}
