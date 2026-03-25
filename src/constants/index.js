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

export const EMPTY_TX      = [];
export const EMPTY_FIXED   = [];
export const EMPTY_INSTALL = [];
export const EMPTY_CARDS   = [];
export const EMPTY_ASSETS  = [];

export const NOW   = new Date();
export const DAYS  = new Date(NOW.getFullYear(),NOW.getMonth()+1,0).getDate();
export const DAY   = NOW.getDate();
export const MONTH = NOW.getMonth()+1;
export const YEAR  = NOW.getFullYear();

export const CARD_PRESETS_COLOR = ["#1c2340","#2d1a3a","#1a3020","#3a1a1a","#2a2a18","#1a2a3a","#3a2a10","#282828"];
export const CARD_ICONS_LIST    = ["💳","🏦","💰","🪙","🎴","⭐","🔵","🔴"];
export const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
export const DNAMES = ["일","월","화","수","목","금","토"];
