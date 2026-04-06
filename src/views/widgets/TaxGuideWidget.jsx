import { useMemo } from 'react';

/**
 * @param {{
 *   tx: import('../../constants/index.js').TxItem[],
 *   plan: { salary?: { husband: number, wife: number } },
 *   names: Record<string, string>
 * }} props
 */
export function TaxGuideWidget({ tx, plan, names }) {
  const guide = useMemo(() => {
    const hSalary = plan.salary?.husband ?? 0;
    const wSalary = plan.salary?.wife ?? 0;
    const totalSalary = hSalary + wSalary;
    if (totalSalary === 0) return null;

    const now = new Date();
    const year = now.getFullYear();
    const prefix = `${year}-`;

    // 연간 카드 지출 (신용+체크)
    const yearTx = tx.filter(t => t.date.startsWith(prefix));
    const hSpend = yearTx.filter(t => t.who === 'husband').reduce((s, t) => s + t.amount, 0);
    const wSpend = yearTx.filter(t => t.who === 'wife').reduce((s, t) => s + t.amount, 0);

    // 소득공제 임계값: 총급여의 25%
    const threshold = totalSalary * 0.25;
    const totalSpend = hSpend + wSpend;
    const remaining = Math.max(threshold - totalSpend, 0);

    if (remaining > 0) {
      return {
        icon: '💳',
        msg: `소득공제 임계값까지 ${Math.round(remaining / 10000)}만원 남았습니다.`,
        tip: null,
      };
    }

    // 임계값 초과 시 체크카드 우선 권고
    const hPct = hSalary / totalSalary;
    const wPct = wSalary / totalSalary;
    const recommendWho = hSpend / (hSalary || 1) < wSpend / (wSalary || 1) ? 'husband' : 'wife';
    const name = names[recommendWho] ?? recommendWho;

    return {
      icon: '💡',
      msg: `${name}의 체크카드 사용으로 공제율을 높이세요.`,
      tip: `소득 비율: ${names.husband ?? '남편'} ${Math.round(hPct * 100)}% / ${names.wife ?? '와이프'} ${Math.round(wPct * 100)}%`,
    };
  }, [tx, plan, names]);

  if (!guide) {
    return (
      <div style={{ padding: 16, color: 'var(--text3)', fontSize: 12 }}>
        급여 정보를 입력하면 세금 가이드를 볼 수 있어요
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{guide.icon}</span>
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 700 }}>Tax Guide</span>
        <span style={{ fontSize: 18, marginLeft: 'auto' }}>💳</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, fontWeight: 600 }}>
        {guide.msg}
      </div>
      {guide.tip && (
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{guide.tip}</div>
      )}
    </div>
  );
}
