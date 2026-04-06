import { useMemo } from 'react';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth, getDay, getDaysInMonth } from '../../constants/index.js';

/**
 * @param {{
 *   budgets: Record<string, number>,
 *   tx: import('../../constants/index.js').TxItem[]
 * }} props
 */
export function AiNudgeWidget({ budgets, tx }) {
  const nudge = useMemo(() => {
    const YEAR = getYear(), MONTH = getMonth(), DAY = getDay();
    const prefix = `${YEAR}-${String(MONTH).padStart(2, '0')}`;
    const spent = tx.filter(t => t.date.startsWith(prefix)).reduce((s, t) => s + t.amount, 0);
    const total = Object.values(budgets).reduce((s, v) => s + v, 0);
    const pct = total > 0 ? Math.round(spent / total * 100) : 0;
    const daysLeft = Math.max(getDaysInMonth(YEAR, MONTH) - DAY, 1);
    const dailyLeft = Math.round((total - spent) / daysLeft);

    // 80% 구간: 행동 지침 메시지 로테이션 (DAY seed — 같은 날 동일 메시지)
    const actionHints = [
      '이번 주말엔 냉장고 파먹기 어때요?',
      '외식 대신 배달 한 번만 줄이면 돼요.',
      '할인마트 주말 행사 노려보세요.',
    ];
    const hint80 = actionHints[DAY % actionHints.length];

    if (pct >= 100) return { icon: '🚨', msg: `예산 초과! ${fmtS(spent - total)}원 넘었어요.`, color: 'var(--red)' };
    if (pct >= 80)  return { icon: '⚠️', msg: `식비 예산 80% 소진. ${hint80}`, color: 'var(--gold)' };
    if (pct >= 60)  return { icon: '💡', msg: `이달 ${pct}% 소진. 하루 ${fmtS(dailyLeft)}원 페이스.`, color: 'var(--blue)' };
    return { icon: '✅', msg: `예산 여유 충분. 하루 ${fmtS(dailyLeft)}원 가능.`, color: 'var(--green)' };
  }, [budgets, tx]);

  return (
    <div style={{ padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ fontSize: 24 }}>{nudge.icon}</span>
      <div>
        <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 3 }}>AI Nudge</div>
        <span style={{ fontSize: 12, color: nudge.color, fontWeight: 600, lineHeight: 1.5 }}>
          {nudge.msg}
        </span>
      </div>
    </div>
  );
}
