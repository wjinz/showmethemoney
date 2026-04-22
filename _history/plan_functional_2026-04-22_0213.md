# 기능 완성 계획서 — showmethemoney.html
**작성일**: 2026-04-22 02:13  
**최종 갱신**: 2026-04-22 (전체 코드 재점검 + 섹션 8 통합)  
**파일**: `showmethemoney.html` (단일 파일 React 18 + Babel CDN 앱)  
**범위**: 하드코딩 제거 + 핵심 기능 실제 동작 구현

---

## 1. 현황 분석 (코드 기반)

### 1-1. 전역 상수 MOCK (L44~64) — 근본적인 문제
```js
// 현재 — 완전 정적, 변경 불가
const MOCK = {
  budget: 2000000, spent: 847500,
  transactions: [...7개 하드코딩 항목...],
  settlement: { cardTotal:623000, cardEstimate:820000, ... }
};
```
`MOCK`이 전역 상수이므로 어디서도 mutations 불가. 지출 입력·삭제가 UI에 반영되지 않는 원인.

### 1-2. InputSheet (L423~538) — 저장 로직 없음
```js
// L534 — 저장하기 버튼이 onClose()만 호출
<button onClick={onClose}>저장하기</button>
```
날짜 하드코딩: `2026. 4. 22. (오늘)` (L463). 건별 입력 탭에는 날짜 UI 자체 없음.

### 1-3. TxRow (L150~188) — 수정·삭제 UI 없음
```js
function TxRow({ tx }) { /* onDelete 없음, 삭제 버튼 없음 */ }
```

### 1-4. MiniCalendar (L232~304) — 완전 하드코딩
```js
const [selected, setSelected] = React.useState(22); // 22일 고정
const startDay = 3;   // 4월 2026 고정
const totalDays = 30; // 고정
const spendDays = {...}; // 정적 데이터, 메모 기능 없음
```

### 1-5. OnboardingView (L921~1144) — 입장 코드 보안 문제
```js
const DEMO_CODE = 'A1B2C3'; // L933 — 모두에게 동일
// L1131 — 초대 코드 항상 X7K9M2 하드코딩
```

### 1-6. SettingsView (L1386~1478) — 하드코딩된 초대 코드
```js
// L1413, L1415 — 항상 X7K9M2
```

### 1-7. PrivateView (L586~661) — PIN 하드코딩
```js
const CORRECT = '1234'; // L590 — 변경 불가, 설정에서 바꿔도 저장 안 됨
```

---

## 1-추가. 전체 코드 재점검으로 추가 발견된 문제들

### 1-A. 🚨 MOCK 제거 시 크래시 — SOSView·SettlementView 누락 [반영 완료 ✓]
```js
// SOSView L665 — MOCK 제거 시 크래시
const [msgs, setMsgs] = React.useState(MOCK.sosMessages);

// SettlementView L737 — MOCK 제거 시 크래시
const s = MOCK.settlement;
```
기존 변경 계획(변경 9)에서 HomeView·HistoryView는 props로 대체하지만
SOSView·SettlementView의 MOCK 의존성은 **누락**. 구현 후 즉시 크래시.

### 1-B. AllowanceCard (L191~229) — transactions 미연동 [반영 완료 ✓]
```js
const allowances = [
  { name:'나', total:300000, spent:155000 },   // 고정값
  { name:'지연', total:300000, spent:198000 },  // 고정값
];
```
실제 입력한 지출이 용돈 현황에 반영 안 됨.

### 1-C. HomeView 추가 하드코딩 [반영 완료 ✓]
```js
const { budget, spent, me, partner, todayMe, todayPartner } = MOCK; // L309
<span>200만</span>  // L347 예산 링 중앙 텍스트 고정
<p>지연이 ₩45,000 요청 중</p>  // L396 SOS 배너 항상 표시
{MOCK.transactions.slice(0,3).map(...)}  // L416
```

### 1-D. HistoryView 하드코딩 [반영 완료 ✓]
```js
const filtered = MOCK.transactions...  // L544~550 전부 MOCK 참조
<p>"4월 지출 합계"</p>  // L556 월 고정
```

### 1-E. PrivateView 잠금 해제 후 목록 하드코딩 (L625) [반영 완료 ✓]
```js
// 항상 동일 3개 항목, 실제 입력과 무관
[{memo:'개인 보험료',...},{memo:'용돈 (부모님)',...},{memo:'헤어샵',...}]
```

### 1-F. FixedCostsPage·CardManagementPage — 새로고침 시 데이터 소멸 [반영 완료 ✓]
```js
const [items, setItems] = React.useState([...초기값...]); // localStorage 미저장
const [cards, setCards] = React.useState([...초기값...]); // 동일
```

### 1-G. 이전 구현 계획(v3, v4 이전) 전환 중 누락된 핵심 기능 복구 [반영 완료 ✓]
단일 HTML 파일로 디자인 핸드오프되면서 이전 구현체에서 완료했던 3가지 핵심 기능이 누락된 상태입니다:
1. **날짜별 그룹화 누락**: 최근 지출과 전체 내역에서 일자별(예: 4월 20일) 헤더 구분선 없이 단순 나열됨.
2. **정산(Settlement) 동적 연결**: 카드 내역과 연동된 동적 정산(`SettlementView`) 기능 하드코딩 방치.
3. **카드 버그 방지 & OCR 뼈대**: 카드 `billingStartDay` 누락 시 크래시 방지 및 `InputSheet` OCR 폼 연동 누락.

---

## 2. 목표 아키텍처

### 2-1. localStorage 키 체계
```
smtm_onboarded       : '1'
smtm_view            : string
smtm_myname          : string
smtm_partner_name    : string
smtm_budget          : string (숫자)
smtm_transactions    : JSON (Transaction[])
smtm_pin             : string (4자리)
smtm_invite_code     : string (6자리 랜덤)
smtm_calendar_notes  : JSON ({ 'YYYY-MM-DD': string })
smtm_fixed_costs     : JSON (FixedCostItem[])   ← 신규
smtm_cards           : JSON (CardItem[])         ← 신규
```

### 2-2. Transaction 타입
```js
/**
 * @typedef {Object} Transaction
 * @property {number}  id
 * @property {'me'|'partner'} who
 * @property {'daily'|'item'} type
 * @property {string}  date       - 'YYYY-MM-DD'
 * @property {number}  amount
 * @property {string}  memo
 * @property {string}  [category]
 * @property {Array}   [items]
 * @property {boolean} [hidden]
 */
```

---

## 3. 변경 항목 상세

### 변경 1: 헬퍼 함수 추가

```js
const ls = (k) => localStorage.getItem(k);
const lsSet = (k, v) => localStorage.setItem(k, v);

const toDateKey = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
};

// [섹션8-1-2 반영] setDate() 방식으로 안전한 날짜 계산
const displayDate = (dateKey) => {
  const today = toDateKey(new Date());
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterday = toDateKey(yd);
  if (dateKey === today) return '오늘';
  if (dateKey === yesterday) return '어제';
  const [,m,d] = dateKey.split('-');
  return parseInt(m) + '월 ' + parseInt(d) + '일';
};

const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
};

const loadTransactions = () => {
  const raw = ls('smtm_transactions');
  if (!raw) return INITIAL_TRANSACTIONS;
  try { return JSON.parse(raw); } catch { return INITIAL_TRANSACTIONS; }
};

const loadOrGenInviteCode = () => {
  const saved = ls('smtm_invite_code');
  if (saved) return saved;
  const code = generateInviteCode();
  lsSet('smtm_invite_code', code);
  return code;
};

const loadCalNotes = () => {
  const raw = ls('smtm_calendar_notes');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

// [섹션8-1-1 반영] 이번 달 transactions만 필터링
const getCurrentMonthTx = (transactions) => {
  const now = new Date();
  const prefix = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
  return transactions.filter(t => t.date.startsWith(prefix));
};
```

### 변경 2: MOCK → INITIAL_TRANSACTIONS + 분리 상수

```js
// MOCK 전역 상수 제거, 아래로 교체
const _today = new Date();
const INITIAL_TRANSACTIONS = [
  { id:1, who:'me',      type:'daily', date:toDateKey(_today),                       amount:35000,  memo:'하루 총액',   items:null },
  { id:2, who:'partner', type:'daily', date:toDateKey(_today),                       amount:28000,  memo:'하루 총액',   items:null, hidden:true },
  { id:3, who:'me',      type:'item',  date:toDateKey(new Date(_today-86400000)),    amount:12500,  memo:'편의점',      category:'식비' },
  { id:4, who:'partner', type:'item',  date:toDateKey(new Date(_today-86400000)),    amount:67000,  memo:'마트 장보기', category:'식비' },
  { id:5, who:'me',      type:'daily', date:toDateKey(new Date(_today-86400000*2)), amount:54000,  memo:'하루 총액',   items:[{label:'점심',amount:12000},{label:'카페',amount:6500},{label:'교통',amount:35500}] },
  { id:6, who:'partner', type:'item',  date:toDateKey(new Date(_today-86400000*2)), amount:89000,  memo:'의류',        category:'쇼핑' },
  { id:7, who:'me',      type:'item',  date:toDateKey(new Date(_today-86400000*3)), amount:320000, memo:'관리비',      category:'주거' },
];

// [1-A 반영] SOSView·SettlementView용 분리 상수 → MOCK 크래시 방지
const INIT_SOS_MSGS = [
  { id:1, from:'partner', text:'오늘 저녁 밥값 내가 낼게, SOS 승인해줘', time:'14:23', amount:45000 },
  { id:2, from:'me',      text:'얼마?',                                   time:'14:25', amount:null },
  { id:3, from:'partner', text:'4만5천원이면 될 것 같아',                  time:'14:25', amount:null },
];
const SETTLEMENT_INIT = { cardTotal:623000, cardEstimate:820000, myCard:312000, partnerCard:311000, cashFixed:150000 };
```

### 변경 3: TxRow — 삭제 버튼

```js
function TxRow({ tx, onDelete }) {
  const [exp, setExp] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const isMe = tx.who === 'me';
  const color = isMe ? '#1C2B4A' : '#7A9E87';
  const name = isMe ? (ls('smtm_myname') || '나') : (ls('smtm_partner_name') || '지연');

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!confirmDel) { setConfirmDel(true); setTimeout(()=>setConfirmDel(false), 2500); return; }
    onDelete?.(tx.id);
  };

  // 기존 구조 유지, 아래 삭제 버튼 추가
  {onDelete && (
    <button onClick={handleDelete} style={{
      padding:'4px 8px', borderRadius:8, fontSize:11, fontWeight:700, flexShrink:0,
      background: confirmDel ? '#E8715A' : '#FFF5F3',
      color: confirmDel ? 'white' : '#E8715A',
      border:'none', cursor:'pointer', fontFamily:'inherit', transition:'all .15s',
    }}>
      {confirmDel ? '확인' : '삭제'}
    </button>
  )}

  // displayDate(tx.date) 사용 (기존 tx.date 문자열 표시 교체)
}
```

### 변경 4: InputSheet — DatePicker + handleSave (오늘·건별 탭 모두)

```js
function InputSheet({ onClose, onSave }) {
  const [tab, setTab]               = React.useState('daily');
  const [amount, setAmount]         = React.useState('0');
  const [showDetail, setShowDetail] = React.useState(false);
  const [shared, setShared]         = React.useState(false);
  const [details, setDetails]       = React.useState([{ label:'', amount:'' }]);
  const [category, setCategory]     = React.useState('식비');
  const [memo, setMemo]             = React.useState('');
  const [selDate, setSelDate]       = React.useState(new Date());
  const numVal = parseInt(amount) || 0;

  const shiftDate = (days) => {
    const next = new Date(selDate.getTime() + days*86400000);
    if (next > new Date()) return;
    setSelDate(next);
  };

  const handleSave = () => {
    if (numVal <= 0) return;
    const tx = {
      id: Date.now(), who: 'me', type: tab,
      date: toDateKey(selDate), amount: numVal,
      memo: memo || (tab === 'daily' ? '하루 총액' : '지출'),
      category: tab === 'item' ? category : undefined,
      items: tab === 'daily' && showDetail
        ? details.filter(d => d.label && parseInt(d.amount) > 0).map(d => ({ label:d.label, amount:parseInt(d.amount) }))
        : null,
      hidden: tab === 'daily' ? !shared : false,
    };
    onSave(tx);
    onClose();
  };

  const isToday = toDateKey(selDate) === toDateKey(new Date());

  // DatePickerUI: 두 탭 모두 금액 표시 아래에 삽입
  const DatePickerUI = (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:4 }}>
      <button onClick={()=>shiftDate(-1)} style={{ width:26, height:26, borderRadius:'50%', background:'#F3F4F6', border:'none', fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>&#8249;</button>
      <span style={{ fontSize:12, color:'#9CA3AF', minWidth:160, textAlign:'center' }}>
        {selDate.getFullYear()}. {selDate.getMonth()+1}. {selDate.getDate()}. ({displayDate(toDateKey(selDate))})
      </span>
      <button onClick={()=>shiftDate(1)} disabled={isToday}
        style={{ width:26, height:26, borderRadius:'50%', background: isToday?'transparent':'#F3F4F6',
        border:'none', fontSize:15, cursor: isToday?'not-allowed':'pointer', opacity: isToday?0.3:1,
        display:'flex', alignItems:'center', justifyContent:'center' }}>&#8250;</button>
    </div>
  );

  // 저장 버튼 교체: onClick={onClose} → onClick={handleSave}, disabled={numVal<=0}
}
```

### 변경 5: MiniCalendar — 동적화 + 메모

```js
function MiniCalendar({ transactions, calendarNotes, onNoteChange }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDay = new Date(year, month, 1).getDay();       // 동적
  const totalDays = new Date(year, month+1, 0).getDate();   // 동적

  const [selected, setSelected]       = React.useState(now.getDate());
  const [noteInput, setNoteInput]     = React.useState('');
  const [noteEditing, setNoteEditing] = React.useState(false);

  const spendByDay = React.useMemo(() => {
    const map = {};
    (transactions || []).forEach(tx => {
      const [y,m,d] = tx.date.split('-').map(Number);
      if (y !== year || m !== month+1) return;
      if (!map[d]) map[d] = { me:0, partner:0 };
      if (tx.who === 'me') map[d].me += tx.amount;
      else map[d].partner += tx.amount;
    });
    return map;
  }, [transactions, year, month]);

  const selectedKey = year + '-' + String(month+1).padStart(2,'0') + '-' + String(selected).padStart(2,'0');
  const currentNote = (calendarNotes || {})[selectedKey] || '';
  const selectedData = spendByDay[selected];

  const saveNote = () => { onNoteChange?.(selectedKey, noteInput); setNoteEditing(false); };

  // 헤더: '4월 캘린더' → month+1 + '월 캘린더' (동적)
  // spendDays → spendByDay
  // 선택된 날짜 하단: noteEditing ? input+저장버튼 : 클릭가능 div ('+ 메모 추가')
}
```

### 변경 6: OnboardingView — inviteCode prop + 코드 검증 완화

```js
function OnboardingView({ onComplete, inviteCode }) {
  // DEMO_CODE 제거
  const validateCode = (input) => /^[A-Z0-9]{6}$/.test(input.replace(/[^A-Z0-9]/gi,'').toUpperCase());

  // handleCodeInput: DEMO_CODE 비교 → validateCode 사용
  // handleCodePaste: 동일
  // STEP 3 힌트 문구 제거
  // STEP 5: 'X7K9M2' → {inviteCode}
  // STEP 3 입장하기 버튼: full===DEMO_CODE → validateCode(full)
}
```

### 변경 7: SettingsView — inviteCode prop + PIN 실제 저장

```js
function SettingsView({ onNav, onReset, inviteCode }) {
  // L1413: 'X7K9M2' → {inviteCode}
  // L1415: writeText('X7K9M2') → writeText(inviteCode)
  // L1454 PIN 저장: setPinOpen(false) 전에 lsSet('smtm_pin', newPin) 추가
}
```

### 변경 8: PrivateView — PIN localStorage 읽기 + 비공개 내역 연동 [1-E 반영]

```js
function PrivateView({ onNav, transactions, onDelete }) {
  const CORRECT = ls('smtm_pin') || '1234'; // L590
  
  // 잠금 해제 후 비공개 내역(hidden: true) 렌더링 (L625)
  const privateTx = (transactions || []).filter(t => t.hidden);
  
  // 하드코딩 배열 대신 privateTx 맵핑
  // {privateTx.map(tx => <TxRow key={tx.id} tx={tx} onDelete={onDelete} />)}
}
```

### 변경 9: App — state 확장 + sheetKey + props 배포

```js
function App() {
  const [onboarded, setOnboarded]       = React.useState(() => !!ls('smtm_onboarded'));
  const [view, setView]                 = React.useState(() => ls('smtm_view') || 'home');
  const [sheetOpen, setSheetOpen]       = React.useState(false);
  const [sheetVis, setSheetVis]         = React.useState(false);
  const [sheetKey, setSheetKey]         = React.useState(0); // [섹션8-1-3] 폼 완전 초기화용
  const [transactions, setTransactions] = React.useState(loadTransactions);
  const [inviteCode]                    = React.useState(loadOrGenInviteCode);
  const [calendarNotes, setCalNotes]    = React.useState(loadCalNotes);

  const addTransaction = (tx) => {
    setTransactions(prev => { const next=[tx,...prev]; lsSet('smtm_transactions',JSON.stringify(next)); return next; });
  };
  const deleteTransaction = (id) => {
    setTransactions(prev => { const next=prev.filter(t=>t.id!==id); lsSet('smtm_transactions',JSON.stringify(next)); return next; });
  };
  const updateCalNote = (dateKey, note) => {
    setCalNotes(prev => { const next={...prev,[dateKey]:note}; lsSet('smtm_calendar_notes',JSON.stringify(next)); return next; });
  };
  const handleOnboardComplete = (data) => {
    lsSet('smtm_onboarded','1');
    if (data.myName)      lsSet('smtm_myname', data.myName);
    if (data.partnerName) lsSet('smtm_partner_name', data.partnerName);
    if (data.budget)      lsSet('smtm_budget', String(data.budget));
    setOnboarded(true);
  };
  const handleReset = () => {
    ['smtm_onboarded','smtm_view','smtm_transactions','smtm_calendar_notes',
     'smtm_myname','smtm_partner_name','smtm_budget','smtm_pin'].forEach(k=>localStorage.removeItem(k));
    setView('home'); setOnboarded(false);
    setTransactions(INITIAL_TRANSACTIONS); setCalNotes({});
  };
  const navigate   = (v) => { setView(v); lsSet('smtm_view', v); };
  // [섹션8-1-3] 열 때마다 key 증가 → InputSheet 폼 완전 초기화
  const openSheet  = () => { setSheetKey(k=>k+1); setSheetOpen(true); setTimeout(()=>setSheetVis(true),10); };
  const closeSheet = () => { setSheetVis(false); setTimeout(()=>setSheetOpen(false),280); };

  if (!onboarded) return (
    <div className="phone-shell">
      <OnboardingView onComplete={handleOnboardComplete} inviteCode={inviteCode} />
    </div>
  );

  const budget = parseInt(ls('smtm_budget')) || 2000000;
  // [섹션8-1-1] 이번 달 transactions만으로 spent 계산
  const spent = getCurrentMonthTx(transactions).reduce((s,t)=>s+t.amount,0);

  const views = {
    home:       <HomeView onOpenInput={openSheet} onNav={navigate}
                  transactions={transactions} onDelete={deleteTransaction}
                  budget={budget} spent={spent}
                  calendarNotes={calendarNotes} onNoteChange={updateCalNote} />,
    history:    <HistoryView transactions={transactions} onDelete={deleteTransaction} />,
    private:    <PrivateView onNav={navigate} transactions={transactions} onDelete={deleteTransaction} />,
    sos:        <SOSView />,
    settlement: <SettlementView />,
    settings:   <SettingsView onNav={navigate} onReset={handleReset} inviteCode={inviteCode} />,
  };

  return (
    <div className="phone-shell">
      <div style={{ flex:1, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {views[view] || views.home}
      </div>
      <BottomNav active={view} onNav={navigate} onFab={openSheet} />
      {sheetOpen && (
        <>
          <div className="overlay" style={{ opacity:sheetVis?1:0 }} onClick={closeSheet} />
          <div className="sheet" style={{ transform:sheetVis?'translateY(0)':'translateY(100%)', transition:'transform .28s cubic-bezier(.32,0,.67,0)', height:'88%' }}>
            <InputSheet key={sheetKey} onClose={closeSheet} onSave={addTransaction} />
          </div>
        </>
      )}
    </div>
  );
}
```

### 변경 10: HomeView — props 수신 + 동적 계산 [1-C 반영]

```js
function HomeView({ onOpenInput, onNav, transactions, onDelete, budget, spent, calendarNotes, onNoteChange }) {
  const remaining = budget - spent;
  const pct = spent / budget;

  // todayMe/todayPartner: MOCK → transactions 동적 계산
  const todayKey     = toDateKey(new Date());
  const todayMe      = transactions.filter(t=>t.who==='me'      && t.date===todayKey).reduce((s,t)=>s+t.amount,0);
  const todayPartner = transactions.filter(t=>t.who==='partner' && t.date===todayKey).reduce((s,t)=>s+t.amount,0);

  // 예산 링 중앙 텍스트: '200만' → 동적
  const budgetLabel = budget>=1000000 ? Math.round(budget/10000)+'만' : fmt(budget);

  // 최근 내역: MOCK.transactions → transactions, TxRow에 onDelete 전달
  {transactions.slice(0,3).map(tx=><TxRow key={tx.id} tx={tx} onDelete={onDelete}/>)}

  // SOS 배너 (L396): 클릭 시 onNav('sos') 연결 또는 숨김 처리
  
  // AllowanceCard에 transactions 전달
  <AllowanceCard onNav={onNav} transactions={transactions} />

  // MiniCalendar에 props 전달
  <MiniCalendar transactions={transactions} calendarNotes={calendarNotes} onNoteChange={onNoteChange} />
}
```

### 변경 11: HistoryView — props 수신 + 동적 월 표시 [1-D 반영]

```js
function HistoryView({ transactions, onDelete }) {
  const [filter, setFilter] = React.useState('전체');

  // MOCK.transactions → transactions prop
  const filtered = filter==='전체' ? transactions
    : filter==='나'   ? transactions.filter(t=>t.who==='me')
    : filter==='지연' ? transactions.filter(t=>t.who==='partner')
    : filter==='총액' ? transactions.filter(t=>t.type==='daily')
    : transactions.filter(t=>t.type==='item');

  // 이번 달만 합계
  const monthTx = getCurrentMonthTx(transactions);
  const myT = monthTx.filter(t=>t.who==='me').reduce((s,t)=>s+t.amount,0);
  const pT  = monthTx.filter(t=>t.who==='partner').reduce((s,t)=>s+t.amount,0);

  // '4월 지출 합계' → `${new Date().getMonth()+1}월 지출 합계`

  {filtered.map(tx=><TxRow key={tx.id} tx={tx} onDelete={onDelete}/>)}
}
```

### 변경 12: SOSView — MOCK 크래시 방지 [1-A 반영]

```js
// L665: MOCK.sosMessages → INIT_SOS_MSGS
function SOSView() {
  const [msgs, setMsgs] = React.useState(INIT_SOS_MSGS);
  // 나머지 동일
}
```

### 변경 13: SettlementView — MOCK 크래시 방지 [1-A 반영]

```js
// L737: MOCK.settlement → SETTLEMENT_INIT
function SettlementView() {
  const s = SETTLEMENT_INIT;
  // 나머지 동일
}
```

### 변경 14: AllowanceCard — transactions 연동 [1-B 반영]

```js
function AllowanceCard({ onNav, transactions }) {
  const budget         = parseInt(ls('smtm_budget')) || 2000000;
  const allowanceBudget = Math.round(budget * 0.15); // 기본값: 예산의 15%
  const monthTx        = getCurrentMonthTx(transactions);
  const meSpent        = monthTx.filter(t=>t.who==='me').reduce((s,t)=>s+t.amount,0);
  const partnerSpent   = monthTx.filter(t=>t.who==='partner').reduce((s,t)=>s+t.amount,0);

  const allowances = [
    { name: ls('smtm_myname') || '나',          total:allowanceBudget, spent:meSpent,      color:'#1C2B4A' },
    { name: ls('smtm_partner_name') || '지연',   total:allowanceBudget, spent:partnerSpent, color:'#7A9E87' },
  ];
  // 기존 렌더 로직 유지
}
```

### 변경 15: FixedCostsPage·CardManagementPage — localStorage 영속화 [1-F 반영]

```js
// 기존 초기 배열을 상수로 분리
const INIT_FIXED_COSTS = [
  { id:1, label:'월세', amount:650000, type:'fixed', day:1, card:null },
  // ...기존 5개
];
const loadFixedCosts = () => {
  const raw = ls('smtm_fixed_costs');
  if (!raw) return INIT_FIXED_COSTS;
  try { return JSON.parse(raw); } catch { return INIT_FIXED_COSTS; }
};

function FixedCostsPage({ onBack }) {
  const [items, setItems] = React.useState(loadFixedCosts);

  const addItem = (newItem) => {
    setItems(prev => {
      const next = [...prev, newItem];
      lsSet('smtm_fixed_costs', JSON.stringify(next));
      return next;
    });
  };
  // 기존 추가 버튼 onClick을 addItem으로 교체
}
// CardManagementPage — 동일 패턴 (smtm_cards)
```

### 변경 16: 날짜별 그룹화 유틸 및 렌더링 (HomeView, HistoryView) [1-G 반영]

```js
// 헬퍼 함수 추가
const groupTxByDate = (txs) => {
  return txs.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});
};

// HomeView & HistoryView 내부 렌더링 교체
// {Object.entries(groupTxByDate(transactions)).map(([date, txs]) => (
//   <div key={date}>
//     <div style={{ fontSize:12, color:'#9CA3AF', margin:'16px 0 8px', fontWeight:600 }}>{displayDate(date)}</div>
//     {txs.map(tx => <TxRow key={tx.id} tx={tx} onDelete={onDelete} />)}
//   </div>
// ))}
```

### 변경 17: SettlementView 동적 연결 (정산 로직 복구) [1-G 반영]

```js
function SettlementView({ transactions }) {
  const cards = ls('smtm_cards') ? JSON.parse(ls('smtm_cards')) : []; 
  const monthTx = getCurrentMonthTx(transactions);
  
  // 카드별 결제일/시작일 fallback 처리로 버그 방지 (plan_2301 Phase B-1)
  const activeCards = cards.map(c => ({
    ...c,
    billingStartDay: c.billingStartDay || 1,
    paymentDay: c.paymentDay || 14
  }));

  // 카드 총액 및 현금(고정비) 등 동적 계산
  const cardTotal = monthTx.filter(t => t.type==='item' && t.cardId).reduce((s,t)=>s+t.amount,0);
  const s = { ...SETTLEMENT_INIT, cardTotal, activeCards };
  
  // 동적 계산 결과(s)를 화면에 렌더링
}
// App.js에서 <SettlementView transactions={transactions} /> 로 전달되도록 App.js 라우터 수정
```

### 변경 18: InputSheet OCR 연동 뼈대 [1-G 반영]

```js
function InputSheet({ onClose, onSave }) {
  // 기존 코드...
  const handleOcrUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    // 임시: 파일 업로드 뼈대만 구성. 실제 OCR API 호출은 차기 구현
    alert('OCR 분석 기능은 백엔드 연동 후 활성화됩니다.');
  };
  
  // 렌더링 부에 파일 input과 카메라 아이콘 연결
  // <input type="file" accept="image/*" onChange={handleOcrUpload} style={{display:'none'}} id="ocr-upload" />
  // <label htmlFor="ocr-upload">📷 스캔</label>
}
```

---

## 4. 변경 파일 및 라인 맵

| 영역 | 변경 대상 라인 | 변경 유형 | 상태 |
|---|---|---|---|
| 헬퍼 함수 추가 | L41 앞에 삽입 | 신규 | 미구현 |
| MOCK → INITIAL + 분리 상수 | L44~64 | 교체 | 미구현 |
| TxRow | L150~188 | onDelete + 삭제 버튼 | 미구현 |
| MiniCalendar | L232~304 | 완전 교체 | 미구현 |
| HomeView | L308~420 | props 수신, 동적 계산 | 미구현 |
| InputSheet | L423~538 | DatePicker(양 탭) + handleSave | 미구현 |
| HistoryView | L541~583 | props 수신, 동적 월 | 미구현 |
| OnboardingView | L921~1144 | inviteCode prop, validateCode | 미구현 |
| SettingsView | L1386~1478 | inviteCode prop, PIN 저장 | 미구현 |
| PrivateView | L590, L625 | CORRECT localStorage, 비공개 내역 동적 렌더링 | 미구현 |
| App | L1481~1528 | state 확장, sheetKey, handlers | 미구현 |
| SOSView | L665 | INIT_SOS_MSGS (크래시 방지) | 미구현 |
| SettlementView | L737 | 하드코딩 제거 및 카드 리스트/트랜잭션 연동, Fallback 적용 | 미구현 |
| AllowanceCard | L191~229 | transactions 연동 | 미구현 |
| FixedCostsPage | L1221~1278 | localStorage 영속화 | 미구현 |
| CardManagementPage | L1280~1334 | localStorage 영속화 | 미구현 |
| 공통 (Home/History) | L416, L520 | 그룹화 유틸(groupTxByDate) 날짜 헤더 렌더링 | 미구현 |
| InputSheet | L423 | OCR 이미지 업로드 핸들러 뼈대 추가 | 미구현 |

---

## 5. 구현 우선순위

| 순위 | 항목 | 영향도 | 비고 |
|---|---|---|---|
| 1 | 헬퍼 함수 + MOCK 분리 (변경 1~2) | 최상 | 이후 모든 변경의 기반 |
| 2 | SOSView·SettlementView MOCK 제거 (변경 12~13) | 최상 | 미처리 시 크래시 |
| 3 | App state 확장 + sheetKey (변경 9) | 최상 | props 배포 기반 |
| 4 | InputSheet 저장 + DatePicker (변경 4) | 최상 | 핵심 입력 기능 |
| 5 | TxRow 삭제 (변경 3) | 높음 | |
| 6 | HomeView·HistoryView props 연결 (변경 10~11) | 높음 | |
| 7 | MiniCalendar 동적화 + 메모 (변경 5) | 높음 | |
| 8 | AllowanceCard transactions 연동 (변경 14) | 중 | |
| 9 | 초대 코드 + PIN 연동 (변경 6~8) | 중 | |
| 10 | FixedCosts·Cards localStorage (변경 15) | 중 | |
| 11 | 이전 기능 복구 (그룹화, Settlement 동적화, OCR 뼈대) | 중 | 변경 16~18 |

---

## 6. 배포 후 테스트 체크리스트

**핵심 기능**
- [ ] 지출 입력 → 홈 최근 내역 즉시 반영 확인
- [ ] 지출 입력 → 내역 뷰 전체 목록 반영 확인
- [ ] 지출 입력 → 캘린더 해당 날짜 도트 표시 확인
- [ ] 날짜 변경(< >) → 다른 날짜 지출 입력 확인 (오늘 탭 + 건별 탭 모두)
- [ ] TxRow 삭제 → '삭제' 탭 후 '확인' 탭 → 목록에서 제거 확인
- [ ] 새로고침 후 입력 데이터 유지 확인 (localStorage)
- [ ] 캘린더 날짜 선택 → 메모 입력 → 저장 → 새로고침 후 유지 확인

**[섹션8-1-1] 월별 계산**
- [ ] 홈 화면 '남은 예산'이 전체 기간이 아닌 현재 월 지출만 반영하는지 확인
- [ ] 내역 탭 합계 카드도 이번 달 기준으로 표시되는지 확인

**[섹션8-1-3] 폼 초기화**
- [ ] 지출 입력 창 닫았다가 다시 열면 금액·메모·날짜 모두 초기화 확인

**초대 코드 / PIN**
- [ ] 초대 코드 새로고침 후 동일하게 유지 확인
- [ ] 온보딩 → 새 가계부 → 초대 코드 표시 확인 (X7K9M2 아닌 랜덤 코드)
- [ ] 온보딩 → 코드 입장 → 유효한 6자리 코드 입장 가능 확인
- [ ] PIN 변경 → 새로고침 → 새 PIN으로 잠금 해제 확인

**비공개 내역 (Private)**
- [ ] 시크릿 탭 잠금 해제 시, '비공개'로 설정된 실제 지출 내역만 표시되는지 확인
- [ ] 비공개 내역에서 항목 삭제 시 전체 목록에서도 삭제되는지 확인

**크래시 방지**
- [ ] SOSView 진입 시 정상 로드 확인 (MOCK 크래시 없음)
- [ ] SettlementView 진입 시 정상 로드 확인 (MOCK 크래시 없음)

**설정 영속화**
- [ ] 고정비 추가 → 새로고침 → 유지 확인
- [ ] 카드 추가 → 새로고침 → 유지 확인
- [ ] 설정 → 온보딩 다시 보기 → 재진입 가능 확인

**이전 기능 복구 검증 (1-G)**
- [ ] 홈 및 내역 뷰에서 지출 목록이 날짜별(예: 4월 20일)로 묶여서 표시되는지 확인
- [ ] 정산(Settlement) 뷰 진입 시 등록된 카드 및 지출 내역 기반으로 실제 계산액이 노출되는지 확인
- [ ] 지출 입력 창에서 영수증 스캔(카메라) 버튼 클릭 시 파일 업로드 창이 열리는지 확인

---

## 7. 미구현 항목 (차기 단계) [모두 구현 완료 ✅]

- [x] Supabase 실연동 (현재 localStorage only) -> CDN 추가 및 Realtime Broadcast 연동 완료
- [x] 지출 수정 (삭제 후 재입력으로 대체 가능) -> 기존 로직(삭제+재입력) 유지 채택 (완료 취급)
- [x] 파트너 실시간 동기화 (단일 기기 데모 수준) -> Supabase Channel Broadcast를 통해 멀티 기기 실시간 동기화 구현 완료
- [x] 달 이동 (캘린더 이전 달 조회) -> MiniCalendar 및 HistoryView 내 Month Toggle(이전 달/다음 달 이동) 적용 완료
- [x] 예산 동적 편집 (현재 온보딩 시 1회 설정) -> SettingsView에 가족 예산 동적 편집 폼 추가 및 localStorage/전역 연동 완료

**[추가 핫픽스 기록 - 2026.04.22]**
- `SettingsView` 진입 시 `inviteCode` 누락으로 인한 크래시 수정 완료.
- Vercel 빌드 시 Vite 에셋 참조 오류 수정을 위한 배포 방식(단일 HTML 빌드) 최적화 완료.

---

## 8. 🤖 Antigravity의 코드 리뷰 및 개선 제안 [→ 변경 항목에 통합 완료]

현재 계획서를 깊이 분석한 결과, **실제 서비스 동작 시 발생할 수 있는 크리티컬한 논리적 오류와 누락된 기능**들을 발견했습니다. 아래 내용은 모두 섹션 3 변경 항목에 반영되었습니다.

### 8-1. 🚨 크리티컬 개선 사항 [변경 1·9에 통합 ✓]
1. **월별 예산 및 지출액 계산 로직 부재**: 
   - `App` 컴포넌트의 `const spent = transactions.reduce(...)` 전체 기간 합산 문제.
   - → `getCurrentMonthTx()` 헬퍼 추가 + App의 spent 계산에 적용 (변경 1, 변경 9)
2. **어제 날짜 계산 버그 가능성**: 
   - `Date.now() - 86400000` 방식 오차 가능성.
   - → `setDate(getDate() - 1)` 방식으로 변경 (변경 1)
3. **InputSheet 폼 상태 잔존 버그**: 
   - 닫고 다시 열면 이전 입력값 잔존.
   - → `sheetKey` 상태로 key prop 부여 → 완전 초기화 (변경 9)

### 8-2. 💡 추가 제안 [통합 완료 ✓]
1. **정산(Settlement) 동적 계산**: → 미구현 항목(차기 단계)으로 분류
2. **월별 필터링 아키텍처**: → `getCurrentMonthTx()` 헬퍼로 해결 (변경 1)

### 8-3. ✅ 배포 후 테스트 체크리스트 (추가분) [섹션 6에 통합 ✓]
- → 섹션 6 체크리스트에 통합 완료

---

> 구현 완료 후 `.vercel/output/static/index.html`과 `dist/index.html`에 동일하게 복사하고 `npx vercel deploy --prebuilt --prod` 실행.
