import { useState, useMemo } from 'react';
import { fmtS } from '../../utils/helpers.js';
import { getYear, getMonth, getDay, getDaysInMonth, CAT } from '../../constants/index.js';

/**
 * @param {{
 *   budgets: Record<string, number>,
 *   tx: import('../../constants/index.js').TxItem[]
 * }} props
 */
export function AiNudgeWidget({ budgets, tx }) {
  const [nudgeMsg, setNudgeMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { spent, total, pct, dailyLeft, prefix } = useMemo(() => {
    const YEAR = getYear(), MONTH = getMonth(), DAY = getDay();
    const pfx = `${YEAR}-${String(MONTH).padStart(2, '0')}`;
    const s = tx.filter(t => t.date.startsWith(pfx)).reduce((acc, t) => acc + t.amount, 0);
    const tot = Object.values(budgets).reduce((acc, v) => acc + v, 0);
    const p = tot > 0 ? Math.round(s / tot * 100) : 0;
    const dLeft = Math.max(getDaysInMonth(YEAR, MONTH) - DAY, 1);
    const dl = Math.round((tot - s) / dLeft);
    return { spent: s, total: tot, pct: p, dailyLeft: dl, prefix: pfx };
  }, [budgets, tx]);

  const defaultMsg = pct >= 100 
    ? `예산 초과! ${fmtS(spent - total)}원 넘었어요.` 
    : pct >= 80 ? `위험! 식비 등 예산 80% 소진.` 
    : pct >= 60 ? `이달 ${pct}% 소진. 하루 ${fmtS(dailyLeft)}원 페이스.` 
    : `예산 여유 충분. 하루 ${fmtS(dailyLeft)}원 가능.`;
  const defaultIcon = pct >= 100 ? '🚨' : pct >= 80 ? '⚠️' : pct >= 60 ? '💡' : '✅';
  const defaultColor = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--gold)' : pct >= 60 ? 'var(--blue)' : 'var(--green)';

  const fetchNudge = async () => {
    setIsLoading(true);
    try {
      const recentTx = tx.filter(t => t.date.startsWith(prefix)).slice(0, 10);
      const txSummary = recentTx.map(t => `${t.date} ${CAT[t.cat]?.label || t.cat}: ${t.amount}원`).join("\n");
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spent, total, txSummary })
      });
      const data = await res.json();
      if (data.message) setNudgeMsg(data.message);
      else setNudgeMsg("AI 조언을 생성하지 못했습니다.");
    } catch (e) {
      setNudgeMsg("네트워크 오류로 생성 실패");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>AI Nudge</div>
        <button onClick={fetchNudge} disabled={isLoading} style={{
          background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", cursor: isLoading ? "not-allowed" : "pointer", fontSize: 10, padding: "4px 8px"
        }}>
          {isLoading ? "분석 중..." : "새로고침 ↻"}
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 24 }}>{nudgeMsg ? '🤖' : defaultIcon}</span>
        <span style={{ fontSize: 12, color: nudgeMsg ? 'var(--gold)' : defaultColor, fontWeight: 600, lineHeight: 1.4 }}>
          {nudgeMsg || defaultMsg}
        </span>
      </div>
    </div>
  );
}
