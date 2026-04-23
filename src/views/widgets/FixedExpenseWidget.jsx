import { useMemo } from 'react';
import { fmtS, getInstallmentFirstPayment } from '../../utils/helpers.js';
import { getYear, getMonth, getDay, getDaysInMonth } from '../../constants/index.js';

/**
 * @typedef {import('../../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../../constants/index.js').InstallItem} InstallItem
 * @typedef {import('../../constants/index.js').CardItem} CardItem
 */

/**
 * @param {{
 *   fixed: FixedItem[],
 *   install: InstallItem[],
 *   cards: CardItem[]
 * }} props
 */
export function FixedExpenseWidget({ fixed = [], install = [], cards = [] }) {
  const { paymentItems, todayDay } = useMemo(() => {
    const today = new Date();
    const todayD = getDay();
    const currY = getYear();
    const currM = getMonth();

    const items = [];

    // 고정비 항목 추가
    fixed.forEach(f => {
      if (!f.day) return;
      const day = Number(f.day);
      const isPast = day < todayD;
      const daysLeft = isPast ? (getDaysInMonth(currY, currM) - todayD + day) : (day - todayD);
      items.push({
        id: `f_${f.id}`,
        type: 'fixed',
        label: f.label,
        amount: f.amount,
        day,
        daysLeft,
        isPast
      });
    });

    // 할부 항목 추가
    install.forEach(i => {
      let card = cards.find(c => c.id === i.cardId);
      if (!card || !card.billingStartDay || !card.billingEndDay || card.billingEndNextMonth === undefined || !card.paymentDay) {
        card = { id: 'fallback', label: 'Fallback', type: 'fallback', paymentDay: 14, billingStartDay: 1, billingEndDay: 30, billingEndNextMonth: false };
      }
      const payDay = card.paymentDay || 14;
      
      // 납입 회차 계산 로직 (추정치)
      let elapsedMonths = 0;
      if (i.date && card.billingStartDay) {
        const _cardForCalc = /** @type {{ billingStartDay: number, billingEndDay: number, billingEndNextMonth: boolean, paymentDay: number }} */ (card);
        const firstPayDate = getInstallmentFirstPayment(_cardForCalc, i.date);
        if (today > firstPayDate) {
          const mDiff = (currY - firstPayDate.getFullYear()) * 12 + (currM - (firstPayDate.getMonth() + 1));
          elapsedMonths = Math.max(0, mDiff) + (todayD >= payDay ? 1 : 0);
        }
      } else {
        elapsedMonths = 1; // 기본 1회차
      }
      
      // 이미 납부 끝났으면 제외
      if (elapsedMonths >= i.months) return;

      const isPast = payDay < todayD;
      const daysLeft = isPast ? (getDaysInMonth(currY, currM) - todayD + payDay) : (payDay - todayD);

      items.push({
        id: `i_${i.id}`,
        type: 'install',
        label: i.label,
        amount: i.monthly,
        day: payDay,
        daysLeft,
        isPast,
        currentMonth: elapsedMonths + 1,
        totalMonths: i.months
      });
    });

    // 결제일 임박(daysLeft 오름차순)으로 정렬
    items.sort((a, b) => a.daysLeft - b.daysLeft);

    return { paymentItems: items, todayDay: todayD };
  }, [fixed, install, cards]);

  if (!paymentItems.length) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
        등록된 고정비나 할부가 없습니다.
      </div>
    );
  }

  // 상위 5개만 노출
  const displayItems = paymentItems.slice(0, 5);

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>📌 다가오는 결제일</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>총 {paymentItems.length}건</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {displayItems.map((item) => {
          const isUrgent = !item.isPast && item.daysLeft <= 3;
          
          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ 
                    fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: item.type === 'fixed' ? 'var(--surface-alt)' : 'rgba(59, 130, 246, 0.1)',
                    color: item.type === 'fixed' ? 'var(--text-muted)' : '#3B82F6'
                  }}>
                    {item.day}일
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {item.label}
                  </span>
                  {isUrgent && (
                    <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700 }}>
                      D-{item.daysLeft}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                  {fmtS(item.amount)}원
                </div>
              </div>
              
              {item.type === 'install' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <div style={{ flex: 1, height: 4, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.max(0, (item.currentMonth / item.totalMonths) * 100))}%`, 
                      height: '100%', background: '#3B82F6', borderRadius: 2 
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    {item.currentMonth}/{item.totalMonths}회차
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {paymentItems.length > 5 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>
          외 {paymentItems.length - 5}건 대기 중
        </div>
      )}
    </div>
  );
}
