/**
 * @typedef {{ id: number, date: string, amount: number, cat: string, memo: string, who: string, payMethod: string, type?: string, cardId?: string, is_private?: boolean, kid_id?: string }} TxItem
 * @typedef {{ id: string|number, label: string, amount: number, cat?: string, day?: number, cardId?: string }} FixedItem
 * @typedef {{ id: string|number, label: string, totalAmount: number, months: number, monthly: number, cardId?: string, date?: string }} InstallItem
 * @typedef {{ id: string|number, label: string, type: string, color?: string, icon?: string, paymentDay?: number, billingStartDay?: number, billingEndDay?: number, billingEndNextMonth?: boolean }} CardItem
 * @typedef {{ id: number, household_id: string, requester: string, amount: number, reason: string, repay_plan: string, status: string, created_at: string, resolved_at?: string }} SosRequest
 * @typedef {{ label: string, target: number, saved: number }} GoalItem
 */

export const CATS = [
  {id:"food",     label:"식비",      icon:"🍽", color:"#d4845a"},
  {id:"housing",  label:"주거/관리",  icon:"🏠", color:"#d4b84a"},
  {id:"education",label:"교육",      icon:"📚", color:"#9b7ee0"},
  {id:"transport",label:"교통",      icon:"🚇", color:"#5c8de8"},
  {id:"medical",  label:"의료",      icon:"💊", color:"#4dab87"},
  {id:"culture",  label:"문화/여가", icon:"🎬", color:"#4dccd4"},
  {id:"clothing", label:"의류",      icon:"👗", color:"#d97fa8"},
  {id:"sub",      label:"구독",      icon:"📱", color:"#7dd47a"},
  {id:"etc",      label:"기타",      icon:"📦", color:"#6a6560"},
];

export const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));

export const INIT_BUDGETS = {
  food:500000,transport:150000,medical:200000,education:300000,
  housing:600000,culture:150000,clothing:100000,sub:80000,etc:80000
};

export const DEFAULT_SLIDER_CFG = {
  paceMaxDaily: 300000,
  simInitAmt:   10000000,
  simMonthly:   500000,
  simRate:      5,
  simYears:     20,
  simGoal:      300000000,
  budgetSliderMax: 2000000,
};

/** @type {TxItem[]} */
export const EMPTY_TX      = [];
/** @type {FixedItem[]} */
export const EMPTY_FIXED   = [];
/** @type {InstallItem[]} */
export const EMPTY_INSTALL = [];
/** @type {CardItem[]} */
export const EMPTY_CARDS   = [];
/** @type {object[]} */
export const EMPTY_ASSETS  = [];
export const EMPTY_PLAN    = {
  salary: { husband: 0, wife: 0, savingsTarget: 0 },
  utilizationTarget: 100,
  events: /** @type {object[]} */ ([]),
  goals: /** @type {GoalItem[]} */ ([]),
  privateGoals: {
    husband: /** @type {GoalItem[]} */ ([]),
    wife:    /** @type {GoalItem[]} */ ([]),
  },
  personalAllowancePct: 0.2,
};

export const getNow  = () => new Date();
export const getYear = () => getNow().getFullYear();
export const getMonth= () => getNow().getMonth() + 1;
export const getDay  = () => getNow().getDate();
/** @param {number} y @param {number} m */
export const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate();

// @deprecated 모듈 로드 시점에 고정됩니다. 날짜 계산에는 getYear/getMonth/getDay/getDaysInMonth를 사용하세요.
export const NOW   = new Date();
export const DAYS  = new Date(NOW.getFullYear(),NOW.getMonth()+1,0).getDate();
export const DAY   = NOW.getDate();
export const MONTH = NOW.getMonth()+1;
export const YEAR  = NOW.getFullYear();

export const CARD_PRESETS_COLOR = ["#1c2340","#2d1a3a","#1a3020","#3a1a1a","#2a2a18","#1a2a3a","#3a2a10","#282828"];
export const CARD_ICONS_LIST    = ["💳","🏦","💰","🪙","🎴","⭐","🔵","🔴"];
export const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
export const DNAMES = ["일","월","화","수","목","금","토"];

/**
 * @typedef {{ i: string, x: number, y: number, w: number, h: number, minW?: number, minH?: number }} WidgetLayoutItem
 * @type {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }}
 */
export const DEFAULT_WIDGET_LAYOUT = {
  mobile: [
    { i: 'sos_status',       x: 0, y: 0,  w: 1, h: 4, minW: 1, minH: 2 },
    { i: 'today_status',     x: 0, y: 4,  w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'allowance_insight', x: 0, y: 8,  w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'spending_insight', x: 0, y: 13, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'budget_ring',      x: 0, y: 17, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'goal',             x: 0, y: 22, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'tax_guide',        x: 0, y: 25, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'ai_nudge',         x: 0, y: 29, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'income_savings',   x: 0, y: 32, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'fixed_list',       x: 0, y: 36, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'plan_summary',     x: 0, y: 41, w: 1, h: 5, minW: 1, minH: 5 },
    { i: 'calendar_schedule',x: 0, y: 46, w: 1, h: 7, minW: 1, minH: 6 },
  ],
  desktop: [
    { i: 'sos_status',       x: 0, y: 0, w: 2, h: 4, minW: 1, minH: 2 },
    { i: 'today_status',     x: 0, y: 4, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'spending_insight', x: 1, y: 4, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'allowance_insight', x: 0, y: 8, w: 2, h: 5, minW: 1, minH: 3 },
    { i: 'budget_ring',      x: 0, y: 13, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'goal',             x: 1, y: 13, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'tax_guide',        x: 0, y: 18, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'ai_nudge',         x: 1, y: 16, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'income_savings',   x: 0, y: 22, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'fixed_list',       x: 1, y: 19, w: 1, h: 5, minW: 1, minH: 3 },
    { i: 'plan_summary',     x: 0, y: 26, w: 2, h: 5, minW: 1, minH: 5 },
    { i: 'calendar_schedule',x: 0, y: 31, w: 2, h: 7, minW: 1, minH: 6 },
  ],
};

export const DEFAULT_HOME_LAYOUT = {
  mobile: [
    { i: 'hero',              x: 0, y: 0,  w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'execution_summary', x: 0, y: 3,  w: 1, h: 7, minW: 1, minH: 5 },
    { i: 'ai_nudge',          x: 0, y: 10, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'sos_pending',       x: 0, y: 13, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'pace_predictor',    x: 0, y: 16, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'scenario_slider',   x: 0, y: 20, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'limit_status',      x: 0, y: 25, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'recent_tx',         x: 0, y: 30, w: 1, h: 9, minW: 1, minH: 6 },
  ],
  desktop: [
    { i: 'hero',              x: 0, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'execution_summary', x: 0, y: 3, w: 2, h: 6, minW: 1, minH: 5 },
    { i: 'ai_nudge',          x: 1, y: 9, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'sos_pending',       x: 0, y: 9, w: 1, h: 3, minW: 1, minH: 2 },
    { i: 'pace_predictor',    x: 0, y: 12, w: 1, h: 4, minW: 1, minH: 3 },
    { i: 'scenario_slider',   x: 1, y: 12, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'limit_status',      x: 0, y: 17, w: 1, h: 5, minW: 1, minH: 4 },
    { i: 'recent_tx',         x: 0, y: 22, w: 2, h: 9, minW: 1, minH: 6 },
  ],
};

export const PAY_METHODS = [
  {id:"credit", label:"신용카드"},
  {id:"debit",  label:"체크카드"},
  {id:"cash",   label:"현금/기타"}
];

export const DEFAULT_TAX_CONFIG = {
  husbandIncome: 50000000,
  wifeIncome: 50000000
};
