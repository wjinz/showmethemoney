/**
 * @param {string} hexColor
 * @returns {string}
 */
export function getContrastText(hexColor) {
  if (!hexColor || !hexColor.startsWith("#") || hexColor.length < 7) return "#ffffff";
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export const today_str = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
/** @param {number} n */
export const fmt  = n => (Number(n)||0).toLocaleString("ko-KR")+"원";
/** @param {number} n */
export const fmtS = n => {
  if(n>=100000000) return (n/100000000).toFixed(1).toLocaleString()+"억";
  if(n>=10000)     return Math.round(n/10000).toLocaleString()+"만";
  return (Number(n)||0).toLocaleString();
};
/** @param {number} n */
export const fmtC = n => (Number(n)||0).toLocaleString(); // Comma only

/** @param {Date} d */
export function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

/** @param {Date} d */
export function fmtMonthDay(d) {
  return `${d.getMonth()+1}월 ${d.getDate()}일`;
}

/**
 * @param {Date} s
 * @param {Date} e
 */
export function fmtPeriodLabel(s, e) {
  const sm=s.getMonth()+1, sd=s.getDate(), em=e.getMonth()+1, ed=e.getDate();
  return sm===em ? `${sm}월 ${sd}일 ~ ${ed}일` : `${sm}/${sd} ~ ${em}/${ed}`;
}

/**
 * @param {{ billingStartDay: number, billingEndDay: number, billingEndNextMonth: boolean, paymentDay: number }} card
 * @param {Date} [today]
 */
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
  const daysUntilPay = Math.ceil((payDate.getTime() - today.getTime()) / msDay);

  return { cycleStart, cycleEnd, payDate, daysUntilPay };
}

/**
 * 특정 구매일과 카드의 정산 규칙에 따른 1회차 결제일을 반환합니다.
 * @param {{ billingStartDay: number, billingEndDay: number, billingEndNextMonth: boolean, paymentDay: number }} card
 * @param {Date|string} purchaseDate
 * @returns {Date}
 */
export function getInstallmentFirstPayment(card, purchaseDate) {
  const d = typeof purchaseDate === "string" ? new Date(purchaseDate) : purchaseDate;
  const { payDate } = getBillingPeriod(card, d);
  return payDate;
}

/**
 * 배우자 개인 지출 블라인드 처리
 * is_private=true이고 본인 작성이 아닌 거래는 품목명 대신 "용돈 대체: X원"으로 표시
 * @param {import('../constants/index.js').TxItem} tx
 * @param {string} myRole  'husband' | 'wife'
 * @returns {{ label: string, isBlinded: boolean }}
 */
export function blindPartnerTx(tx, myRole) {
  if (tx.is_private && tx.who !== myRole) {
    return { label: `용돈 대체: ${fmtS(tx.amount)}원`, isBlinded: true };
  }
  return { label: tx.memo || tx.cat, isBlinded: false };
}
