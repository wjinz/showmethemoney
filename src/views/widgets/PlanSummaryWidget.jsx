import { useMemo } from 'react';
import { getYear, getMonth, CATS } from '../../constants';
import { fmtS } from '../../utils/helpers';
import { PieChart } from 'lucide-react';

export function PlanSummaryWidget({ plan, budgets, tx, fixed, install }) {
  const salary     = plan.salary || {};
  const allowance  = plan.allowance || { husband: 0, wife: 0 };
  const income     = (salary.husband || 0) + (salary.wife || 0);
  const savings    = salary.savingsTarget || 0;
  const fixedTotal = (fixed || []).reduce((s, f) => s + (f.amount || 0), 0)
                   + (install || []).reduce((s, i) => s + (i.monthly || 0), 0);
  const allowanceTotal = (allowance.husband || 0) + (allowance.wife || 0);
  const utilTarget = plan.utilizationTarget ?? 100;
  const rawAvail   = Math.max(0, income - savings - fixedTotal - allowanceTotal);
  const avail      = Math.round(rawAvail * utilTarget / 100);
  
  const nowYm      = `${getYear()}-${String(getMonth()).padStart(2, "0")}`;
  const thisMonthTx = tx.filter(t => t.date.startsWith(nowYm) && !t.is_private);
  
  const totalBudget = Object.values(budgets).reduce((s, v) => s + (v || 0), 0);
  const totalSpent  = thisMonthTx.reduce((s, t) => s + t.amount, 0);
  const totalPct    = totalBudget > 0 ? Math.min(Math.round(totalSpent / totalBudget * 100), 100) : 0;
  const isOver      = totalSpent > totalBudget;

  return (
    <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(200,168,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
          <PieChart size={18} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>예산 플랜 요약</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>이번 달 재무 설계 현황</div>
        </div>
      </div>

      <div style={{ background: 'var(--surface-alt)', borderRadius: 14, padding: '16px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: isOver ? 'var(--danger)' : 'var(--text)' }}>
            {totalPct}%
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
            {fmtS(totalSpent)} / {fmtS(totalBudget)}원
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${totalPct}%`, background: isOver ? 'var(--danger)' : 'var(--primary)', transition: 'width .5s ease', borderRadius: 4 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>총 수입 플랜</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>{fmtS(income)}</div>
        </div>
        <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>목표 저축액</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3B82F6' }}>{fmtS(savings)}</div>
        </div>
        <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>고정비/할부 결제</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pink)' }}>{fmtS(fixedTotal)}</div>
        </div>
        <div style={{ padding: '12px', background: 'var(--surface-alt)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginBottom: 4 }}>유동 생활비 한도</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{fmtS(avail)}</div>
        </div>
      </div>
    </div>
  );
}
