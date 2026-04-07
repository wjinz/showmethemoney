import { useMemo } from 'react';
import { fmtS } from '../../utils/helpers.js';

/**
 * @typedef {import('../../constants/index.js').TxItem} TxItem
 * @typedef {import('../../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../../constants/index.js').InstallItem} InstallItem
 */

/**
 * @param {{
 *   plan: any,
 *   tx: TxItem[],
 *   fixed: FixedItem[],
 *   install: InstallItem[]
 * }} props
 */
export function IncomeSavingsWidget({ plan, tx, fixed, install }) {
  const { totalSalary, savingsTarget, isSolo } = useMemo(() => {
    const s = plan?.salary || { husband: 0, wife: 0, savingsTarget: 0 };
    const tot = (s.husband || 0) + (s.wife || 0);
    return {
      totalSalary: tot,
      savingsTarget: s.savingsTarget || 0,
      isSolo: !!plan?.isSolo
    };
  }, [plan]);

  const { fixedTotal, installTotal, variableSpent } = useMemo(() => {
    // 당월 지출 누적
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // 이번 달 생활비(변동비) 지출
    const vSpent = tx.filter(t => t.date.startsWith(prefix)).reduce((sum, t) => sum + t.amount, 0);
    
    // 고정비 총합
    const fTotal = fixed.reduce((sum, item) => sum + item.amount, 0);
    
    // 할부월납 총합
    const iTotal = install.reduce((sum, item) => sum + (item.monthly || 0), 0);

    return { fixedTotal: fTotal, installTotal: iTotal, variableSpent: vSpent };
  }, [tx, fixed, install]);

  // 잔여 여유 자금 계산 = 총 수입 - 필수지출(고정비+할부) - 목표저축 - 이달생활비지출
  const remainingCash = totalSalary - fixedTotal - installTotal - savingsTarget - variableSpent;
  // 목표 저축률
  const targetPct = totalSalary > 0 ? Math.round((savingsTarget / totalSalary) * 100) : 0;
  // 현재 여유율
  const remainingPct = totalSalary > 0 ? Math.round((Math.max(0, remainingCash) / totalSalary) * 100) : 0;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>💰 수입 및 저축 목표</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', background: 'var(--goldD)', padding: '2px 8px', borderRadius: 12 }}>
          {targetPct}% 저축 목표
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--text3)' }}>
          {isSolo ? '나의 수입' : '부부 합산 수입'}
        </p>
        <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
          {fmtS(totalSalary)}<span style={{ fontSize: 14 }}>원</span>
        </p>
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>목표 저축액</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{fmtS(savingsTarget)}원</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>현재 잉여 자금</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: remainingCash < 0 ? 'var(--red)' : '#7A9E87' }}>
            {fmtS(remainingCash)}원
          </span>
        </div>

        {/* 2단 게이지 */}
        <div style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
            <span>수입 대비 비율</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, display: 'flex', overflow: 'hidden' }}>
            {/* 고정비 등 이미 나간 돈 영역 (회색) */}
            <div style={{ width: `${Math.max(0, 100 - targetPct - remainingPct)}%`, background: 'var(--text3)', opacity: 0.3 }} />
            {/* 저축 목표 영역 (파란색) */}
            <div style={{ width: `${targetPct}%`, background: 'var(--gold)' }} />
            {/* 여유 자금 영역 (초록색) */}
            <div style={{ width: `${remainingPct}%`, background: '#7A9E87' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
            <span>지출 {100 - targetPct - remainingPct}%</span>
            <span>목표 {targetPct}%</span>
            <span>여유 {remainingPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
