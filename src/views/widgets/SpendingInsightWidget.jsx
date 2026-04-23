import { useMemo } from 'react';
import { fmtS } from '../../utils/helpers.js';
import { CAT, CATS } from '../../constants/index.js';
import { THEME_TOKENS as T } from '../../styles/tokens.js';

/** @typedef {import('../../constants/index.js').TxItem} TxItem */

/**
 * @param {{
 *   tx: TxItem[]
 * }} props
 */
export function SpendingInsightWidget({ tx }) {
  const insight = useMemo(() => {
    const today = new Date();
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTx = tx.filter(t => new Date(t.date) >= last7Days);
    
    if (recentTx.length === 0) return { title: "Insight", msg: "최근 지출 내역이 없네요! 텅 빈 지갑이 최고죠 👍" };
    
    const catCounts = recentTx.reduce((acc, t) => {
      acc[t.cat] = (acc[t.cat] || 0) + t.amount;
      return acc;
    }, /** @type {Record<string, number>} */ ({}));
    
    const topCatId = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0][0];
    const topCatName = CAT[topCatId]?.label || CATS[8].label;
    const totalRecent = recentTx.reduce((s, t) => s + t.amount, 0);
    
    return {
      title: "Weekly Insight",
      msg: `최근 7일간 <span style="color:var(--primary); font-weight:800;">${topCatName}</span>에 가장 많은 ${fmtS(catCounts[topCatId])}원을 지출하셨네요.`,
      summary: `총 ${fmtS(totalRecent)}원 지출 중 ${(catCounts[topCatId] / totalRecent * 100).toFixed(0)}% 차지`
    };
  }, [tx]);

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {insight.title}
      </span>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text)', margin: 0 }}>
        <p dangerouslySetInnerHTML={{ __html: insight.msg }} style={{ margin: 0 }} />
      </div>
      {insight.summary && (
        <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0, fontStyle: 'italic' }}>
          {insight.summary}
        </p>
      )}
    </div>
  );
}
