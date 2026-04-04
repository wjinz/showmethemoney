export const today_str = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
export const fmt  = n => (Number(n)||0).toLocaleString("ko-KR")+"원";
export const fmtS = n => {
  if(n>=100000000) return (n/100000000).toFixed(1).toLocaleString()+"억";
  if(n>=10000)     return Math.round(n/10000).toLocaleString()+"만";
  return (Number(n)||0).toLocaleString();
};
export const fmtC = n => (Number(n)||0).toLocaleString(); // Comma only

export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function fmtMonthDay(d) {
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}

export function fmtPeriodLabel(s, e) {
  const sm=s.getMonth()+1, sd=s.getDate(), em=e.getMonth()+1, ed=e.getDate();
  return sm===em ? `${sm}월 ${sd}일 ~ ${ed}일` : `${sm}/${sd} ~ ${em}/${ed}`;
}

export function getBillingPeriod(card, today = new Date()) {
  const { billingStartDay, billingEndDay, billingEndNextMonth, paymentDay } = card;
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  const d = today.getDate();

  let sY, sM, eY, eM, pY, pM;

  if (billingEndNextMonth) {
    if (d >= billingStartDay) {
      sY=y; sM=m;
      eY=(m===11?y+1:y); eM=(m===11?0:m+1);
    } else {
      sY=(m===0?y-1:y); sM=(m===0?11:m-1);
      eY=y; eM=m;
    }
    pY=eY; pM=eM;
  } else {
    if (d >= billingStartDay) {
      sY=y; sM=m; eY=y; eM=m;
      pY=(m===11?y+1:y); pM=(m===11?0:m+1);
    } else {
      sY=(m===0?y-1:y); sM=(m===0?11:m-1);
      eY=sY; eM=sM;
      pY=y; pM=m;
    }
  }

  const cycleStart = new Date(sY, sM, billingStartDay);
  const lastDayOfEndMonth = new Date(eY, eM+1, 0).getDate();
  const actualEndDay = Math.min(billingEndDay, lastDayOfEndMonth);
  const cycleEnd  = new Date(eY, eM, actualEndDay);
  const payDate   = new Date(pY, pM, paymentDay);

  const msDay = 1000*60*60*24;
  const daysUntilPay = Math.ceil((payDate - today) / msDay);

  return { cycleStart, cycleEnd, payDate, daysUntilPay };
}

/**
 * 특정 구매일과 카드의 정산 규칙에 따른 1회차 결제일을 반환합니다.
 * @param {object} card - 카드 객체
 * @param {Date|string} purchaseDate - 구매일
 * @returns {Date} 1회차 결제일
 */
export function getInstallmentFirstPayment(card, purchaseDate) {
  const d = typeof purchaseDate === "string" ? new Date(purchaseDate) : purchaseDate;
  const { payDate } = getBillingPeriod(card, d);
  return payDate;
}
