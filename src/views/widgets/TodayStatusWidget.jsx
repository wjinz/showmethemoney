import { useMemo } from 'react';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth } from '../../constants/index.js';
import { THEME_TOKENS as T } from '../../styles/tokens.js';

/**
 * @param {{
 *   budgets: Record<string, number>,
 *   tx: import('../../constants/index.js').TxItem[]
 * }} props
 */
export function TodayStatusWidget({ budgets, tx }) {
  const { dailySafe, leftAmt, daysLeft } = useMemo(() => {
    const y = getYear(), m = getMonth();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const spent = tx.filter(t => t.date.startsWith(prefix)).reduce((acc, t) => acc + t.amount, 0);
    const total = Object.values(budgets).reduce((acc, v) => acc + v, 0);
    const left = Math.max(total - spent, 0);
    
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date().getDate();
    const dLeft = Math.max(lastDay - today + 1, 1);
    
    return { 
      dailySafe: Math.floor(left / dLeft), 
      leftAmt: left, 
      daysLeft: dLeft 
    };
  }, [budgets, tx]);

  const isOver = dailySafe <= 0;

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Daily Guide
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>D-{daysLeft}</span>
      </div>
      
      <div>
        <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>
          오늘 하루 <span style={{ color: isOver ? 'var(--danger)' : 'var(--primary)', fontWeight: 800 }}>{fmtS(dailySafe)}원</span> 이내로
        </h3>
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          {isOver ? "지출을 멈춰야 해요! 🛑" : "쓰면 안전해요 ✅"}
        </p>
      </div>

      <div style={{ padding: '10px 14px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text-faint)' }}>남은 예산</span>
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>{fmtS(leftAmt)}원</span>
        </div>
      </div>
    </div>
  );
}
