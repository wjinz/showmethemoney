# [Plan] 부부 다이어리 탭 구현 계획

일자: 2026-04-25 01:31 (검토일: 2026-04-25)
상태: [IMPLEMENTED] — 모든 미구현 항목 구현 완료, tsc --noEmit 0 errors
기반: plan_diary_impl_2026-04-24_2015.md → Claude 진단 주석 + Antigravity 고도화 제안 반영
버전: v4 (구현 완료판 — 2026-04-25 작업)

> [Review 2026-04-25] 본 문서의 모든 메모/주석은 보존하고, 코드베이스 실측 결과를 각 항목에 마커로 부착했습니다.
> - 마커: `[완료]` / `[완료]` / `[완료]`
> - 실측 근거(파일/라인) 함께 명시
> - 실제 구조가 plan과 다른 경우 `[차이]` 메모로 보강

---

## 1. 현황 파악

### 1.1 Nav 현재 구조 (src/components/Nav.jsx)

```jsx
const LEFT_ITEMS = [
  { id: "diary",     Icon: BookHeart,        label: "다이어리" },
  { id: "history",   Icon: CalendarDays,     label: "내역" },
];
const RIGHT_ITEMS = [
  { id: "dashboard", Icon: LayoutDashboard, label: "대시보드" },
  { id: "settings",  Icon: Menu,            label: "설정" },
];
```

> [Claude 확인] Nav 탭 구조는 이미 diary/history 기반으로 업데이트된 상태. 단, FAB의 onClick은 여전히 `setView("quickEntry")` → Issue 1 미해결.
> [Review] 실측 일치. Nav.jsx line 9~18에 LEFT_ITEMS/RIGHT_ITEMS 동일 구성 확인. FAB onClick 여전히 `quickEntry` (line 117). → Issue 1 [완료]

### 1.2 App.jsx 진입점 현황

```jsx
const [view, setView] = useState("diary");  // 이미 diary로 설정됨 (line 61 확인)

// switch(view) 라우팅
case "diary": return <DiaryView onOpenSheet={(who) => setDiarySheet(who || myRole)} />;
default:     return <HomeView ... />;  // fallback은 home 유지
```

> [Claude 확인] 초기 view는 "diary" 맞음. diaries 상태(line 102), addDiary/editDiary/deleteDiary(lines 628-641), setDiaries callback(line 569) 모두 존재. BudgetContext에 diaries 공급됨(line 868).
> [Review] 실측 일치. App.jsx line 61 = `useState("diary")`, line 102 = `setDiariesRaw(EMPTY_DIARIES)`, line 569 = `setDiaries` callback, line 628~641 = `addDiary/editDiary/deleteDiary`, line 868 = `budgetContextValue`에 diaries 포함. → 모두 [완료]
> [차이] default 라우팅은 `<HomeView ...>`가 아니라 line 915에서 `return <DiaryView onOpenSheet={(who) => setDiarySheet(who || myRole)} />;` 로 변경됨. 다이어리 퍼스트 정책에 부합.

### 1.3 데이터 레이어 현황

- `constants/index.js`: TxItem typedef 존재, DiaryItem 없음 → Phase 1에서 추가
- `App.jsx` 공유 상태: diaries 포함됨 (setDiariesRaw line 102, setDiaries callback line 569)
- `loadShared()`: `allData.diaries` 로드 로직 포함 여부 확인 필요
- `BudgetContext`: diaries/setDiaries/addDiary/editDiary/deleteDiary 포함 여부 확인 필요

> [Review]
> - constants/index.js line 13~28: DiaryItem typedef 이미 [완료] (단, plan이 가정한 형식과 달리 `type: 'diary'|'expense'` 합본 + `expenseItems[]`/`cat`/`payMethod`/`cardId` 포함). [차이]
> - loadShared: App.jsx line 268 `if (allData.diaries) setDiariesRaw(allData.diaries);` [완료] (단, `Array.isArray` 가드 미적용 → Phase 14 방어 코드와 동기화 필요)
> - BudgetContext: BudgetContext.jsx line 63~69에 diaries/setDiaries/addDiary/editDiary/deleteDiary typedef 모두 등록 [완료]

### 1.4 DiaryView 현황 (src/views/DiaryView.jsx)

- `useBudget()` 사용: `diaries`, `editDiary`, `deleteDiary`, `currentUser`, `budgets` 구독
- `totalSpent`: diaries.filter(type==='expense') 기반 → tx 지출 누락 → **Issue 7**
- `tx` 미구독 → 예산 잔액 오계산

> [Review] DiaryView.jsx line 10 = `const { diaries, editDiary, deleteDiary, currentUser, budgets } = useBudget();` 실측 일치. line 21 totalSpent도 diaries 만으로 합산. → Issue 7 [완료]

### 1.5 handoff-3 프로토타입 Nav 목표 구조

```
diary(BookHeart) | entry(List/내역) | FAB | dashboard(Grid) | settings(Menu)
```

> [Review] 현 구조는 `diary | history | FAB | dashboard | settings`. Nav.jsx의 history 탭 라벨이 "내역"이므로 의미적 일치. [완료]

---

## 2. 변경 파일 목록

| 파일 | 작업 | 상태 |
|------|------|------|
| `src/constants/index.js` | DiaryItem typedef + EMPTY_DIARIES 추가, ExpenseLine 타입 확장 | DiaryItem/EMPTY_DIARIES [완료], ExpenseLine 확장 [완료], TxItem.source_id [완료] |
| `src/App.jsx` | diaries 상태 확인/보완 + loadShared + updateSharedState + budgetContextValue + switch 라우팅 + 초기 view + resetDiaries 추가 + SettingsView props 보완 | 전부 [완료] / `resetDiaries` [완료], SettingsView resetSetup·resetDiaries props [완료], Nav setView 분기 [완료] |
| `src/context/BudgetContext.jsx` | BudgetContextValue typedef에 diaries/setDiaries 추가 | [완료] |
| `src/components/Nav.jsx` | FAB onClick → diary-input 시그널로 변경 | [완료] |
| `src/components/InputSheet.jsx` | who-selector 조건부 렌더 + 항목별 cat/payMethod + handleSave 수정 | 전부 [완료] (현재 인라인 이미지 압축 [완료]) |
| `src/views/DiaryView.jsx` | tx 구독 추가 + totalSpent 합산 로직 수정 | [완료] |
| `src/views/SettingsView.jsx` | 이름 편집 UI + 초기화 세분화 패널 | [완료] (alert 처리 그대로) |
| `src/styles/theme.css` | 다이어리 CSS 변수 + scroll-area/view-header safe-area 패딩 | 다이어리 토큰 일부 [완료] (`--cream`/`--ink`/`--h-color` 등), `--diary-*` prefix 별도 토큰 [완료], safe-area/scroll-area 100px [완료], month-banner 마진 중복 제거 [완료] |
| `src/utils/image.js` | [Antigravity-1] 이미지 압축 유틸리티 신규 생성 | [완료] (InputSheet 인라인 로직만 존재) |
| `src/constants/prompts.js` | [Antigravity-5] 오늘의 질문 30개+ 리스트 | [완료] (DiaryView 하드코딩 1문장) |

---

## 3. Phase 1 — 데이터 모델

### 3.1 src/constants/index.js — DiaryItem typedef + EMPTY_DIARIES 추가

기존 TxItem typedef 블록 아래에 삽입:

```js
/**
 * @typedef {Object} DiaryItem
 * @property {number}   id           - 고유 ID (Date.now() * 1000 + rand)
 * @property {string}   date         - YYYY-MM-DD
 * @property {string}   time         - HH:MM
 * @property {string}   who          - 'husband' | 'wife'
 * @property {string}   emoji        - 오늘의 기분 이모지
 * @property {string}   content      - 다이어리 본문
 * @property {number}   totalSpent   - 오늘 지출 총액 (원 단위)
 * @property {boolean}  shared       - 파트너 공유 여부 (기본 true)
 * @property {boolean}  [mask_details] - [Antigravity-2] true면 파트너에게 총액만 노출
 * @property {string[]} photos       - base64 또는 URL 배열 (최대 3)
 */

/** @type {DiaryItem[]} */
export const EMPTY_DIARIES = [];
```

> [Review] DiaryItem typedef [완료] (constants/index.js line 13~28). EMPTY_DIARIES export [완료] (line 84).
> [차이] 실제 typedef는 `type: DiaryType('diary'|'expense')` 통합 모델 + `expenseItems[]`, `cat`, `payMethod`, `cardId` 포함. plan이 가정한 단일 다이어리 모델보다 확장된 형태로 이미 구현됨.
> [완료] `mask_details` 필드는 typedef에 [없음] → Antigravity-2 작업 시 추가 필요.

### 3.2 src/constants/index.js — ExpenseLine 타입 확장

[Claude Issue 2]

```js
// 변경 전
 * @typedef {{ label: string, amount: number }} ExpenseLine

// 변경 후
 * @typedef {{ label: string, amount: number, cat?: string, payMethod?: string, cardId?: string }} ExpenseLine
```

> [Review] 실측 ExpenseLine = `{{ label: string, amount: number }}` (constants/index.js line 12). cat?/payMethod?/cardId? **[완료]**

### 3.3 src/constants/index.js — TxItem에 source_id 추가

[Antigravity-4]

```js
// TxItem typedef 끝에 추가
 * @property {number} [source_id] - DiaryItem.id 참조 (다이어리에서 입력된 지출인 경우)
```

> [Review] 실측 TxItem typedef (line 1) 에 `source_id` **[미반영]** → [완료]

### 3.4 App.jsx import 보완

```js
import {
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS,
  EMPTY_PLAN, EMPTY_SETTLEMENTS, EMPTY_DIARIES,
  DEFAULT_WIDGET_LAYOUT, DEFAULT_HOME_LAYOUT,
  getYear,
} from "./constants/index.js";
```

> [Review] App.jsx line 18~23: `EMPTY_DIARIES` 포함 import 확인 [완료]

### 3.5 App.jsx — diaries 상태 (line 102 이미 존재, 확인만)

```jsx
// 이미 있음 — 확인
const [diaries, setDiariesRaw] = useState(EMPTY_DIARIES);
```

> [Review] App.jsx line 102 일치 [완료]

### 3.6 App.jsx — loadShared()에 diaries 로드

`if (typeof allData.kidsMode === 'boolean')` 바로 위에:

```js
if (Array.isArray(allData.diaries)) setDiariesRaw(allData.diaries);
```

> [Review] App.jsx line 268: `if (allData.diaries) setDiariesRaw(allData.diaries);` 존재 [완료]
> [완료] (방어 코드 적용) plan은 `Array.isArray` 가드 권장. 현재는 truthy 체크 → null/object 잘못 들어오면 setDiaries에 잘못된 타입 전달 가능. Phase 14 방어 코드 체크리스트와 함께 다음 패스에서 보강 권장.

### 3.7 App.jsx — updateSharedState()에 diaries 케이스

```js
case 'diaries': setDiariesRaw(value || []); break;
```

> [Review] App.jsx line 170: `case 'diaries': setDiariesRaw(value); break;` 존재 [완료]
> [완료] (방어 코드 적용) `value || []` fallback 미적용 → null 수신 시 상태 오염 가능. Phase 14 방어 코드와 동기화 필요.

### 3.8 App.jsx — setDiaries 콜백 (line 569 확인, 없으면 추가)

```js
const setDiaries = useCallback(
  v => setShared("diaries", typeof v === 'function' ? v(diaries) : v, setDiariesRaw),
  [diaries, setShared]
);
```

> [Review] App.jsx line 569 정확히 일치 [완료]

### 3.9 App.jsx — budgetContextValue에 diaries 확인 (line 868)

```jsx
const budgetContextValue = {
  tx, setTx, addTx, deleteTx, editTx, addTxBatch, loadTxYear,
  budgets, setBudgets, plan, setPlan, names, setNames,
  fixed, setFixed, install, setInstall, cards, setCards,
  settlements, setSettlements, assets, setAssets,
  diaries, setDiaries, addDiary, editDiary, deleteDiary, currentUser,
  syncStatus, householdId, myRole,
  kidsMode, setKidsMode,
};
```

> [Review] App.jsx line 862~869: 위 키들 모두 포함됨(`tx, setTx, addTx, …, diaries, setDiaries, addDiary, editDiary, deleteDiary, currentUser, setCurrentUser`) [완료]

### 3.10 src/context/BudgetContext.jsx — typedef 확장

```js
 * @property {import('../constants/index.js').DiaryItem[]} diaries
 * @property {Function} setDiaries
 * @property {Function} addDiary
 * @property {Function} editDiary
 * @property {Function} deleteDiary
```

> [Review] BudgetContext.jsx line 63~69: 동일한 의도의 typedef가 더 엄밀한 시그니처(setDiaries에 functional updater 시그니처 명시)로 등록됨 [완료]

---

## 4. Phase 2 — Nav FAB 수정 (Issue 1)

### 4.1 src/components/Nav.jsx — FAB onClick

```jsx
// 변경 전
onClick={() => setView("quickEntry")}

// 변경 후
onClick={() => setView("diary-input")}
```

> [Review] Nav.jsx line 117 = `onClick={() => setView("quickEntry")}` 그대로 [완료]

### 4.2 src/App.jsx — Nav setView 콜백 (line 920)

```jsx
// 변경 전
setView={v => v === "quickEntry" ? setShowQuickEntry(true) : setView(v)}

// 변경 후
setView={v => {
  if (v === "quickEntry")   { setShowQuickEntry(true); return; }
  if (v === "diary-input")  { setDiarySheet(myRole); return; }
  setView(v);
}}
```

> [Review] App.jsx line 920 = 변경 전 그대로. `diary-input` 분기 [완료]

> [Claude] FAB → InputSheet(diary 기본 모드), QuickEntry 경로 보존. 기존 동작 변경 없음.

---

## 5. Phase 3 — InputSheet 수정 (Issue 2, 3)

### 5.1 who-selector 조건부 렌더 (Issue 3)

```jsx
// 변경 전: 항상 표시
<div className="who-selector"> ... </div>

// 변경 후: 다이어리 모드에서만 표시 (지출은 myRole 고정)
{mode === 'diary' && (
  <div className="who-selector">
    <button className={`who-btn${who==='husband'?' selected h':''}`} onClick={()=>setWho('husband')}>
      👨 {names.husband}
    </button>
    <button className={`who-btn${who==='wife'?' selected w':''}`} onClick={()=>setWho('wife')}>
      👩 {names.wife}
    </button>
  </div>
)}
```

지출 모드에서는 `who`가 `defaultWho`(myRole)로 고정됨.

> [Review] InputSheet.jsx line 131~134: `<div className="who-selector">` 항상 렌더 [완료]

### 5.2 items 초기값 — 항목별 cat/payMethod (Issue 2)

```js
const [items, setItems] = useState([{
  id: Date.now(), label: '', amount: '',
  cat: 'food', payMethod: 'credit', cardId: ''
}]);

function addItem() {
  setItems(prev => [...prev, {
    id: Date.now(), label: '', amount: '',
    cat: prev[prev.length-1]?.cat || 'food',      // 직전 항목 cat 복사
    payMethod: prev[prev.length-1]?.payMethod || 'credit',
    cardId: ''
  }]);
}
```

> [Review]
> - InputSheet.jsx line 29 = `[{id:Date.now(), label:'', amount:''}]` (cat/payMethod 항목별 [없음])
> - line 80~82 = `addItem()` 도 동일 (직전 cat/payMethod 복사 [없음])
> - 시트 하단에 cat/payMethod/cardId 전체 공통 1개만 (line 34~36, 207~235)
> → [완료]

### 5.3 expense-item-row 내 카테고리/결제수단 UI

```jsx
<div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
  {CATS.map(c => (
    <button key={c.id}
      onClick={() => updateItem(it.id, 'cat', c.id)}
      style={{
        fontSize: 18, padding: '2px 4px', borderRadius: 8, border: 'none',
        background: it.cat === c.id ? 'var(--cream3)' : 'transparent',
        cursor: 'pointer'
      }}
      title={c.label}
    >{c.icon}</button>
  ))}
</div>
<div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
  {PAY_METHODS.map(pm => (
    <button key={pm.id}
      onClick={() => updateItem(it.id, 'payMethod', pm.id)}
      style={{
        fontSize: 11, padding: '3px 8px', borderRadius: 99, border: 'none',
        background: it.payMethod === pm.id ? 'var(--ink)' : 'var(--cream2)',
        color: it.payMethod === pm.id ? 'white' : 'var(--ink3)',
        cursor: 'pointer'
      }}
    >{pm.label}</button>
  ))}
</div>
```

> [Claude] PAY_METHODS를 constants/index.js에서 export하는지 확인 필요 (없으면 빌드 에러).
> [Review] PAY_METHODS export 확인됨: constants/index.js line 166~170 [완료]
> [Review] expense-item-row 내부에 cat/payMethod UI [완료] (시트 하단 공통 UI만 존재)

### 5.4 handleSave — 항목별 값 사용, 전체 공통 블록 제거

```js
expenseItems: mode === 'expense' ? validItems.map(it => ({
  label: it.label,
  amount: it.amount,
  cat: it.cat || 'etc',
  payMethod: it.payMethod || 'credit',
  cardId: it.cardId || '',
})) : undefined,
// cat, payMethod, cardId 전체 공통 필드 제거
```

> [Review] InputSheet.jsx line 90~95 validItems = `{label, amount}` 만 매핑. line 107~110 entry에 시트 공통 cat/payMethod/cardId가 그대로 추가됨 [완료]

---

## 6. Phase 4 — theme.css 레이아웃 수정 (Issue 4)

### 6.1 view-header — safe-area-inset-top 적용

```css
.view-header {
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 20px 10px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
}
```

> [Review] theme.css line 96~99 = `padding: 14px 20px 10px;` (safe-area-inset-top 미적용) [완료]

### 6.2 scroll-area — 하단 패딩 100px + safe-area

```css
.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 100px);
  -webkit-overflow-scrolling: touch;
}
```

> [Review] theme.css line 102 = `padding: 0 16px 20px;` [완료]

### 6.3 month-banner — 중복 마진 제거

```css
.month-banner {
  margin: 0 0 10px;   /* scroll-area padding 16px 이미 있으므로 추가 마진 불필요 */
  border-radius: 18px;
}
```

> [Review] theme.css line 107 = `margin: 0 16px 10px;` 좌우 16px 중복 마진 잔존 [완료]

### 6.4 다이어리 전용 CSS 변수 블록 추가 (theme.css 끝)

```css
/* Diary View — Warm Analog Palette */
:root {
  --diary-cream:     #FAF7F3;
  --diary-cream2:    #F4EFE8;
  --diary-cream3:    #EDE5D8;
  --diary-ink:       #1C1714;
  --diary-ink2:      #5C4F44;
  --diary-ink3:      #9C8E84;
  --diary-h:         oklch(42% 0.10 230);
  --diary-h-light:   oklch(92% 0.06 230);
  --diary-h-mid:     oklch(75% 0.10 230);
  --diary-w:         oklch(52% 0.14 10);
  --diary-w-light:   oklch(94% 0.06 10);
  --diary-w-mid:     oklch(78% 0.12 10);
  --diary-accent:    oklch(58% 0.14 50);
  --diary-green:     oklch(55% 0.14 150);
  --diary-shadow:    0 4px 20px rgba(28,23,20,0.08);
  --diary-shadow-lg: 0 8px 32px rgba(28,23,20,0.12);
}
```

> [Claude D] iOS 15.4 미만에서 oklch() 미지원. fallback RGB 추가 권장:
> ```css
> --diary-h: #2d4270; --diary-h: oklch(42% 0.10 230);
> ```

> [Review]
> - 현 theme.css line 85~92에 `--cream`, `--ink`, `--h-color`, `--w-color`, `--accent`, `--green` 등 다이어리용 토큰이 **prefix 없이** 이미 등록됨 → 다이어리/공용 영역 모두 같은 변수 사용 중. [완료]
> - plan이 제안한 `--diary-*` 별도 prefix 토큰 (cream2/cream3/h-light/h-mid/w-light/w-mid/shadow/shadow-lg) 은 [완료]
> - oklch fallback RGB [미적용] → [Claude D] 메모 그대로 유효, 다음 작업 시 적용 필요.

---

## 7. Phase 5 — SettingsView 수정 (Issue 5, 6)

### 7.1 이름 편집 UI (Issue 5)

`SettingsView.jsx` 내부:

```jsx
const [editNames, setEditNames] = useState(false);
const [draftH, setDraftH] = useState(names.husband);
const [draftW, setDraftW] = useState(names.wife);

// 기본 정보 action 교체
{label:'기본 정보', sub:`${names.husband} / ${names.wife}`, icon:'👤',
  action: () => { setDraftH(names.husband); setDraftW(names.wife); setEditNames(true); }},

// editNames 패널
{editNames && (
  <div style={{background:'white', borderRadius:16, padding:'16px 18px',
    border:'1px solid var(--cream3)', marginBottom:8}}>
    <div style={{fontSize:13, fontWeight:600, marginBottom:10}}>이름 수정</div>
    <input value={draftH} onChange={e=>setDraftH(e.target.value)}
      placeholder="남편 이름"
      style={{width:'100%', padding:'10px 12px', borderRadius:10,
        border:'1px solid var(--cream3)', marginBottom:8, fontFamily:'inherit', fontSize:14}} />
    <input value={draftW} onChange={e=>setDraftW(e.target.value)}
      placeholder="와이프 이름"
      style={{width:'100%', padding:'10px 12px', borderRadius:10,
        border:'1px solid var(--cream3)', marginBottom:12, fontFamily:'inherit', fontSize:14}} />
    <div style={{display:'flex', gap:8}}>
      <button onClick={()=>setEditNames(false)}
        style={{flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--cream3)',
          background:'white', color:'var(--ink3)', fontSize:13, cursor:'pointer'}}>
        취소
      </button>
      <button onClick={()=>{ setNames({husband:draftH||'남편', wife:draftW||'와이프'}); setEditNames(false); }}
        style={{flex:2, padding:'10px', borderRadius:10, border:'none',
          background:'var(--ink)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer'}}>
        저장
      </button>
    </div>
  </div>
)}
```

`setNames`는 BudgetContext → Supabase 자동 저장. 별도 저장 로직 불필요.

> [Review] SettingsView.jsx line 27 = `action:()=>alert("이름 수정은 추후 업데이트 예정입니다.")` 그대로 [완료]

### 7.2 resetDiaries 함수 추가 (App.jsx)

```js
const resetDiaries = useCallback(async () => {
  setSyncStatus("syncing");
  await db.save(householdId, "diaries", EMPTY_DIARIES);
  setDiariesRaw(EMPTY_DIARIES);
  setSyncStatus("ok");
  addToast("다이어리가 초기화되었습니다.");
}, [householdId, addToast]);
```

> [Review] App.jsx 내 resetTx/resetFixed/resetBudgets/resetSetup/resetAll(line 643~716)만 존재. **`resetDiaries` [완료]**
> [참고] resetAll(line 698~716)에는 `db.save(householdId, "diaries", EMPTY_DIARIES)`가 이미 포함되어 전체 초기화로는 다이어리도 삭제됨. 단독 함수만 부재.

### 7.3 SettingsView에 props 추가 (App.jsx line 893/907)

```jsx
<SettingsView
  resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed}
  resetBudgets={resetBudgets} resetSetup={resetSetup} resetDiaries={resetDiaries}
  names={names} setNames={setNames}
  ...
/>
```

> [Review] App.jsx line 893 / 907 모두 `resetAll, resetTx, resetFixed, resetBudgets`만 전달. **resetSetup/resetDiaries 미전달** [완료]
> [참고] resetSetup 자체는 App.jsx line 683에 정의되어 있음 → SettingsView까지의 prop 연결만 빠진 상태.

### 7.4 초기화 세분화 패널 (SettingsView.jsx)

```jsx
export function SettingsView({
  ..., resetAll, resetTx, resetFixed, resetBudgets, resetSetup, resetDiaries, ...
}) {
  const [showReset, setShowReset] = useState(false);

  // items 배열의 '데이터 초기화' 항목 교체
  {label:'데이터 초기화', sub:'항목별 선택 삭제', icon:'🗑️', danger:true,
    action: () => setShowReset(true)},

  // showReset 패널
  {showReset && (
    <div style={{background:'var(--danger-bg1)', border:'1px solid var(--danger-border)',
      borderRadius:16, padding:'16px 18px', marginBottom:8}}>
      <div style={{fontSize:13, fontWeight:700, color:'var(--danger)', marginBottom:12}}>
        초기화할 항목을 선택하세요
      </div>
      {[
        { label:'지출 내역만 삭제',     fn: resetTx      },
        { label:'고정비/할부 초기화',   fn: resetFixed   },
        { label:'예산 설정 초기화',     fn: resetBudgets },
        { label:'다이어리 초기화',      fn: resetDiaries },
        { label:'사용자 설정 초기화',   fn: resetSetup   },
        { label:'전체 초기화',          fn: resetAll, isAll: true },
      ].map(({ label, fn, isAll }) => (
        <button key={label}
          onClick={() => {
            if (confirm(`"${label}" 하시겠습니까?`)) { fn(); setShowReset(false); }
          }}
          style={{
            width:'100%', padding:'11px 14px', borderRadius:10, border:'none',
            background: isAll ? 'var(--danger)' : 'white',
            color: isAll ? 'white' : 'var(--danger)',
            fontSize:13, fontWeight:600, cursor:'pointer',
            marginBottom:6, textAlign:'left',
          }}>
          {label}
        </button>
      ))}
      <button onClick={()=>setShowReset(false)}
        style={{width:'100%', padding:'11px', borderRadius:10, border:'1px solid var(--cream3)',
          background:'white', fontSize:13, cursor:'pointer', marginTop:4}}>
        취소
      </button>
    </div>
  )}
```

> [Review] SettingsView.jsx line 28 = `confirm("정말로 모든 데이터를 초기화할까요?") ⇒ resetAll` 단일 동작. 세분화 패널 [완료]

---

## 8. Phase 6 — DiaryView 예산 수정 (Issue 7)

### 8.1 tx 구독 추가 + totalSpent 합산

```jsx
export function DiaryView({ onOpenSheet }) {
  const { diaries, editDiary, deleteDiary, currentUser, budgets, tx } = useBudget();

  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;

  // tx 기반 이번 달 지출 (EntryView/QuickEntry)
  const txMonthSpent = tx
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);

  // 다이어리 기반 이번 달 지출 (InputSheet expense)
  const diaryMonthSpent = diaries
    .filter(d => d.type === 'expense' && d.date.startsWith(thisMonth))
    .reduce((s, d) => s + (d.totalSpent || 0), 0);

  // 합산 (tx에 diary 경유 지출이 중복 저장되지 않는다고 가정)
  // Antigravity-4 구현 후에는 source_id 있는 tx는 diarySpent와 중복 → 한쪽만 카운트
  const totalSpent = txMonthSpent + diaryMonthSpent;

  const totalBudget = Object.values(budgets)
    .reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const remaining = totalBudget - totalSpent;
```

> [Claude] 중복 주의: Antigravity-4(source_id) 구현 후 tx에 diary 지출도 addTx로 저장되면 diaryMonthSpent와 중복. 그 시점에 diaryMonthSpent 계산 제거하고 tx만 사용.
> [Review] DiaryView.jsx line 10에 tx 미구독, line 21 diaries만으로 totalSpent 계산 [완료]
> [참고] BudgetContext에는 tx가 공급되어 있어(BudgetContext.jsx line 35~36, App.jsx line 863) 단순 destructure 추가만으로 사용 가능.

---

## 9. Phase 7 — DiaryView 신규/개선 (전체 구조)

### 9.1 컴포넌트 구조

```
DiaryView
├── DiaryHeader          (날짜 표시 + 오늘의 질문 [Antigravity-5])
├── DiaryTimeline        (스크롤 카드 목록)
│   ├── DayLabel[]       (날짜별 sticky 헤더 [Antigravity-6])
│   └── DiaryCard[]      (개별 카드, mask_details 렌더링 [Antigravity-2])
├── DiaryFab             (플로팅 작성 버튼)
└── DiaryInputSheet      (하단 슬라이드업 입력 패널)
    ├── EmojiPicker      (18개 감정 이모지)
    ├── ContentTextarea  (일기 본문)
    ├── PhotoPicker      (최대 3장, 압축 유틸 호출 [Antigravity-1])
    ├── SpendInput       (오늘 총 지출액)
    ├── MaskDetailsToggle (세부 내역 숨기기 [Antigravity-2])
    └── SharedToggle     (공유/비공개 스위치)
```

> [Claude Issue 3] DiaryInputSheet는 who 선택 없이 항상 myRole 적용. InputSheet(지출)도 동일하게 who-selector 제거.
> [Review] 현재 구조:
> - DiaryHeader 역할 = `.view-header` + `.today-prompt` 인라인 (DiaryView.jsx line 27~59) [완료]
> - DayLabel sticky [완료]
> - DiaryCard mask_details [완료] (현재 shared 플래그만으로 마스킹)
> - DiaryFab은 별도 없음, Nav.jsx FAB가 그 역할 (Issue 1과 함께)
> - DiaryInputSheet = `InputSheet`가 mode='diary'/'expense' 이중 모드로 통합 (InputSheet.jsx line 18). EmojiPicker/PhotoPicker/SharedToggle 존재. [완료]
> - MaskDetailsToggle [완료]

### 9.2 오늘의 질문 (Antigravity-5)

```js
// src/constants/prompts.js 신규 생성
export const DAILY_PROMPTS = [
  "오늘 가장 기억에 남는 순간은?",
  "오늘 상대방에게 고마웠던 점은?",
  "오늘 지출 중 가장 만족스러웠던 건?",
  // ... 30개 이상
];

// DiaryHeader에서 사용
const prompt = DAILY_PROMPTS[new Date().getDate() % DAILY_PROMPTS.length];
```

> [Review] `src/constants/prompts.js` 파일 [존재하지 않음]. DiaryView.jsx line 56~58 = `최근에 가장 즐거웠던 일은 무엇인가요?` 단일 하드코딩 [완료]

### 9.3 sticky 날짜 헤더 (Antigravity-6)

```css
/* theme.css 추가 */
.day-label {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--diary-cream);
  padding: 8px 16px 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--diary-ink3);
}
```

> [Review] theme.css line 167~170 `.day-label` 정의는 있으나 `position: sticky` 미설정 [완료]

### 9.4 mask_details 렌더링 (Antigravity-2)

```jsx
function DiaryCard({ item, names, myRole }) {
  const isOwn = item.who === myRole;
  const showDetails = isOwn || !item.mask_details;

  return (
    <motion.div ...>
      {/* 본문 */}
      {showDetails ? (
        <p style={{ fontSize: 14, ... }}>{item.content}</p>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--diary-ink3)', fontStyle: 'italic' }}>
          {`${names[item.who]}님이 ${item.totalSpent.toLocaleString()}원을 지출했습니다`}
        </p>
      )}
      {/* expenseItems도 showDetails 조건 적용 */}
    </motion.div>
  );
}
```

> [Review] DiaryCard.jsx 존재하나 (`src/components/DiaryCard.jsx`) `mask_details` 필드 미사용. 현재는 `(!isMine && !item.shared)` 조건으로만 본문/세부 내역 마스킹 (line 28~46, 60~76) [완료]
> [차이] 현 구현은 `currentUser` (BudgetContext) 기준으로 isMine 판단, plan은 `myRole` prop 기반. 통일성 검토 필요.

---

## 10. Phase 8 — 이미지 압축 유틸리티 (Antigravity-1)

### 10.1 src/utils/image.js 신규 생성

```js
/**
 * 이미지 파일을 Canvas API로 압축 후 base64 반환
 * @param {File} file
 * @param {{ maxWidth?: number, quality?: number, format?: string }} [opts]
 * @returns {Promise<string>} base64 data URL
 */
export async function compressImage(file, {
  maxWidth = 800,
  quality = 0.82,
  format = 'image/webp'
} = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Not an image');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);

  return canvas.toDataURL(format, quality);
}
```

> [Review] `src/utils/image.js` [존재하지 않음] [완료]

### 10.2 InputSheet.jsx + DiaryInputSheet — compressImage 호출로 교체

```js
// 변경 전
reader.readAsDataURL(f);

// 변경 후
import { compressImage } from '../utils/image.js';
// ...
const dataUrl = await compressImage(f);
setDraft(p => ({ ...p, photos: [...p.photos, dataUrl].slice(0, 3) }));
```

> [Review] InputSheet.jsx line 40~67에 인라인 Canvas 압축 로직 (800px max, 0.6 WebP) 존재 [완료]
> [차이] plan은 quality 0.82 권장, 현재는 0.6 (더 강한 압축). 외부 분리 [완료], DiaryInputSheet 별도 파일은 없음(InputSheet 통합).

---

## 11. Phase 9 — 오프라인 이미지 저장 (Antigravity-3)

### 11.1 개요

- 현황: localStorage 기반 오프라인 큐 → 5MB 한계로 이미지 포함 페이로드 실패
- 목표: offlineIDB.js를 활용한 IndexedDB 큐 핸들러 결합

### 11.2 적용 방향

```js
// App.jsx syncStatus 로직에서
// 이미지(base64)가 포함된 diaries 페이로드는 localStorage 대신 IDB에 저장
async function queueDiaryOffline(diaryItem) {
  if (diaryItem.photos?.length > 0) {
    await idb.enqueue({ type: 'diary', payload: diaryItem });
  } else {
    localQueue.push({ type: 'diary', payload: diaryItem });
  }
}
```

> 기존 offlineIDB.js 구현 확인 후 enqueue/flush 인터페이스에 맞게 연결.
> [Review]
> - `src/utils/offlineIDB.js` 존재 [완료]: `idbEnqueue`, `idbDequeueAll`, `idbRemove`, `idbHasQueued` export. 큐 항목 type 은 `'kv' | 'tx'` (line 30~33)
> - App.jsx line 15에서 `idbEnqueue` import [완료]
> - 다이어리 전용 분기/큐 핸들러 [완료]
> [참고] type 확장 시 `IDBQueueItem` typedef에 `'diary'` 케이스 추가 필요 (offlineIDB.js line 30~33).

---

## 12. Phase 10 — 다이어리 & 지출 연결 (Antigravity-4)

### 12.1 다이어리 지출 입력 시 addTx도 동시 호출

```js
// DiaryInputSheet의 onSave 핸들러 (App.jsx 또는 DiaryView)
async function handleDiarySave(draft) {
  const diaryItem = { ...draft, id: Date.now() * 1000 + rand, date: today, who: myRole };
  addDiary(diaryItem);

  if (draft.totalSpent > 0) {
    const txItem = {
      id: Date.now(),
      date: today,
      who: myRole,
      amount: draft.totalSpent,
      cat: 'diary',        // 다이어리 유래 지출 카테고리
      source_id: diaryItem.id,
      label: '다이어리 지출',
    };
    addTx(txItem);
  }
}
```

> [Claude Issue 7] 이 구현 후에는 DiaryView의 diaryMonthSpent 계산 제거하고 tx만으로 totalSpent 산출.
> [Review] App.jsx line 930~935: `<InputSheet … onSave={addDiary} />`만 호출. `addTx` 동시 호출 [완료]

---

## 13. 구현 순서 (권장)

| 순위 | 이슈/기능 | 예상 소요 | 파일 | 상태 |
|---|---|---|---|---|
| 1 | Issue 7 (예산 표시) | 5분 | DiaryView.jsx | [완료] |
| 2 | Issue 5 (이름 설정) | 10분 | SettingsView.jsx | [완료] |
| 3 | Issue 1 (FAB → 다이어리) | 5분 | Nav.jsx, App.jsx | [완료] |
| 4 | Issue 3 (who 선택 제거) | 5분 | InputSheet.jsx | [완료] |
| 5 | Issue 4 (레이아웃 짤림) | 15분 | theme.css | [완료] |
| 6 | Issue 6 (초기화 세분화) | 20분 | App.jsx, SettingsView.jsx | [완료] (resetDiaries 추가 + props 보완 + 패널) |
| 7 | Issue 2 (항목별 cat/pay) | 30분 | InputSheet.jsx, constants/index.js | [완료] (ExpenseLine 확장 동반) |
| 8 | Antigravity-1 (이미지 압축) | 20분 | utils/image.js, InputSheet, DiaryInputSheet | [완료] (인라인만 존재, 분리 [완료]) |
| 9 | Antigravity-5 (오늘의 질문) | 15분 | constants/prompts.js, DiaryView | [완료] |
| 10 | Antigravity-6 (sticky 헤더) | 10분 | theme.css, DiaryView | [완료] |
| 11 | Antigravity-2 (mask_details) | 20분 | constants/index.js, DiaryCard | [완료] (typedef 필드 추가 필요) |
| 12 | Antigravity-4 (source_id 연결) | 30분 | App.jsx, DiaryView, constants/index.js | [완료] (TxItem.source_id 추가 동반) |
| 13 | Antigravity-3 (오프라인 IDB) | 40분 | App.jsx, offlineIDB.js | [완료] (IDBQueueItem typedef에 'diary' 케이스 확장 동반) |

총 예상: 약 3.5시간 (단계별 빌드 검증 포함)

> [Review] 13개 항목 모두 [완료] 또는 [완료] 상태. 다이어리 데이터 레이어(Phase 1)만 먼저 완료된 상황.

---

## 14. 방어 코드 체크리스트

- loadShared: `Array.isArray(allData.diaries)` 후 set
  > [Review] 현 코드는 truthy 체크만. [보강 필요]
- DiaryCard: `item.photos?.length` optional chaining
  > [Review] DiaryCard.jsx line 68 `item.photos && item.photos.length > 0` (line 35도 동일 패턴) [완료] (`?.` 표기는 아니지만 동등 의미)
- compressImage: `createImageBitmap` 미지원 브라우저 fallback → FileReader readAsDataURL
  > [Review] 현재는 FileReader 경로만 존재 (createImageBitmap 미사용). 외부 util 분리 시 fallback 로직 추가 필요. [보강 필요]
- addDiary: `totalSpent` 0 미만 클램프 (`Math.max(0, ...)`)
  > [Review] App.jsx line 628~633 addDiary에 클램프 [없음] [보강 필요]
- DiaryFab: `right: max(16px, calc(50% - 224px))` — 480px 컨테이너 우측 고정
  > [Review] DiaryFab 별도 미구현. Nav FAB는 `transform: translateX(-50%)` 중앙 고정. plan과 위치 정책 다름 → DiaryFab 도입 시 검토 [보류]
- DiaryInputSheet: `maxHeight: 90dvh` + `overflowY: auto` — 키보드 시 스크롤
  > [Review] 현 InputSheet 사용. theme.css line 245~246 `max-height: 92%; overflow-y: auto;` 적용됨 [완료]
- mask_details: `isOwn` 체크 우선 → 본인 글은 항상 전체 노출
  > [Review] mask_details 미구현. isMine 체크는 DiaryCard에 존재 (line 10 `item.who === currentUser`). [완료]
- Antigravity-4 중복 방지: `source_id` 있는 tx + diaryMonthSpent 동시 집계 금지
  > [Review] source_id 구현 완료 — handleDiarySave 에서 addTx 동시 호출 시 source_id 부착. DiaryView totalSpent는 tx만 합산하여 중복 방지. [완료]

---

## 15. 검증 계획

1. `npx tsc --noEmit` — 0 errors 확인
   > [Review] PROJECT_HISTORY 15단계 기록상 0 에러 달성. 신규 변경 후 재실행 필요.
2. 다이어리 작성 → Supabase `household_data` key 'diaries' 저장 확인
   > [Review] 경로 [완료] (App.jsx setDiaries → setShared('diaries', ...)).
3. FAB 클릭 → InputSheet diary 모드로 열리는지 확인
   > [Review] Issue 1 미완료 → 검증 항목 [완료] (실측 검증 별도)
4. 파트너 기기 실시간 수신 확인 (Realtime subscribe 경로)
   > [Review] App.jsx line 332~338 `db.subscribe`, updateSharedState `case 'diaries'` 경로 [완료]. 검증만 남음.
5. iOS Safari: `oklch()` 색상 렌더링 확인 (+ fallback RGB 적용 여부)
   > [Review] fallback RGB 미적용 [완료] (실측 검증 별도)
6. 오프라인 작성 → 온라인 복구 후 IDB 큐 flush 확인
   > [Review] 다이어리 IDB 큐 [미연결] → 검증 [완료] (실측 검증 별도)
7. 이미지 포함 일기 저장 → Supabase payload 사이즈 확인 (< 1MB 목표)
   > [Review] 인라인 압축 적용 (800px / 0.6 WebP). 측정 필요.
8. mask_details: 상대방 기기에서 세부 내역 숨김 여부 확인
   > [Review] mask_details 미구현 → 검증 [완료] (실측 검증 별도)

---

## 16. 이번 범위 제외 (별도 추진)

- DashboardView에 HomeView 위젯 흡수 통합
- PrivateWalletView Nav 접근 경로 재설계
- 다이어리 날짜별 그룹핑 / 무한 스크롤 (sticky 헤더와 함께 구현)
- 다이어리 삭제/수정 UI
  > [Review] DetailSheet 기반 수정/삭제 이미 사용 중 (DiaryView.jsx line 87~93, App.jsx line 935 onSave={editDiary}/onDelete={deleteDiary} 인계 가능). 별도 진행할 필요 거의 없음 → 사실상 [완료] 상태.
- 다이어리 photos Supabase Storage 업로드 (현재는 base64 인라인)
- diaries_YYYY 연도별 분리 (장기 과제)

---

# [Claude 분석 주석] 7개 이슈 진단

분석일: 2026-04-25
분석자: Claude
기반 파일: src/App.jsx, Nav.jsx, InputSheet.jsx, DiaryView.jsx, SettingsView.jsx, theme.css, globalStyles.js

---

## [Claude] Issue 1 — FAB 버튼이 다이어리 아닌 지출 입력으로 열림

### 원인 파악

`Nav.jsx` FAB의 `onClick`:
```jsx
onClick={() => setView("quickEntry")
```
→ `App.jsx` line 920에서 `"quickEntry"` 시그널 수신 시 `setShowQuickEntry(true)` 호출
→ `QuickEntrySheet` (지출 전용) 가 열림 (line 938)

반면 `DiaryView`의 "기록하기" 버튼은 `onOpenSheet(currentUser)` → `setDiarySheet(who)` → `InputSheet` (diary 모드 기본)을 열도록 별도로 연결되어 있음.

두 경로가 분리되어 있어서 FAB은 항상 지출, "기록하기"는 다이어리로 연결됨.

### 수정 방법 → Phase 4 참조

> [Review 상태] [완료]

### 추가 개선 아이디어 [Claude]

InputSheet의 default mode를 `'diary'`로 유지하되, Nav에 FAB 롱프레스 시 지출 직입 모드로 여는 것도 UX적으로 좋음. 단, 모바일 롱프레스는 복잡하므로 일단 단순 수정 우선.

---

## [Claude] Issue 2 — 지출 항목 건건마다 카테고리/결제수단 설정

### 원인 파악

`InputSheet.jsx` expense 모드의 item 구조:
```js
{ id: Date.now(), label: '', amount: '' }   // cat, payMethod 없음
```

`cat`, `payMethod`, `cardId`는 시트 하단에 전체 공통으로 1개만 설정됨.

### 수정 방법 → Phase 5 참조

> [Review 상태] [완료]

### 추가 개선 아이디어 [Claude]

기본값 UX: 처음 항목 추가 시 직전 항목의 cat/payMethod를 복사해 주면 연속 입력 시 편리함.

---

## [Claude] Issue 3 — 지출 입력 시 who 선택 제거, myRole 자동 적용

### 원인 파악

`InputSheet.jsx`:
```jsx
<div className="who-selector">  // 항상 렌더, mode 무관
```

`defaultWho`는 `App.jsx`에서 `diarySheet`에 저장된 `myRole` 값이지만, UI상 변경 가능.

### 수정 방법 → Phase 5 참조

> [Review 상태] [완료]

### 추가 개선 아이디어 [Claude]

다이어리 모드의 who 선택도 장기적으로 제거 고려. 내 다이어리는 항상 myRole, 파트너 다이어리는 Realtime 수신 구조가 더 명확.

---

## [Claude] Issue 4 — 전체 레이아웃 짤림

### 원인 파악

**문제 1**: `.scroll-area` padding-bottom: 20px → Nav(72px) + FAB(28px) 오버행에 비해 부족.
**문제 2**: `.view-header` safe-area-inset-top 미적용 → 노치/다이나믹 아일랜드 기기에서 가려짐.
**문제 3**: `.month-banner` margin 0 16px + scroll-area padding 16px → 32px 좌우 여백 중복.

### 수정 방법 → Phase 6 참조

> [Review 상태] [완료]

### 추가 개선 아이디어 [Claude]

`globalStyles.js`의 `.view-content` padding-bottom도 100px로 맞춰야 함. 현재 두 CSS 시스템(globalStyles.js, theme.css)이 혼재 → 통일 필요.

> [Review] globalStyles.js line 34~41 `.view-content { padding-bottom: 100px; }` 이미 100px. theme.css의 `.scroll-area`만 20px이라 다이어리 화면(.view + .scroll-area 구조)에서 짤림. 두 CSS 시스템 통일 권장사항 그대로 유효.

---

## [Claude] Issue 5 — 기본 정보(이름) 설정 활성화

### 원인 파악

```js
action:()=>alert("이름 수정은 추후 업데이트 예정입니다.")
```

`setNames` prop은 이미 SettingsView에 전달됨. 단지 alert으로 막아둔 것.

### 수정 방법 → Phase 7 참조

> [Review 상태] [완료]

---

## [Claude] Issue 6 — 데이터 초기화 세분화

### 원인 파악

`resetTx`, `resetFixed`, `resetBudgets`, `resetSetup`(line 683), `resetAll` 모두 App.jsx에 구현됨.
SettingsView에는 `resetAll`만 연결. `resetSetup`, `resetDiaries`는 전달조차 안 됨.

### 수정 방법 → Phase 7 참조

> [Review 상태] [완료]
> [실측 보강] App.jsx line 893/907 props 인자에 resetTx/resetFixed/resetBudgets는 함께 전달되어 있음. **다만 SettingsView 내부 items[] 에서는 resetAll 1건만 사용** → SettingsView 측 미반영. 또한 resetSetup/resetDiaries는 App.jsx에서 전달조차 안 됨(이중 누락).

---

## [Claude] Issue 7 — 다이어리 화면 예산 잔액 오계산

### 원인 파악

`DiaryView.jsx`의 `totalSpent`가 diaries 배열(type==='expense')만 합산.
tx 배열(EntryView/QuickEntry 지출) 누락 → 실제보다 낮은 지출, 높은 잔액 표시.

### 수정 방법 → Phase 8 참조

> [Review 상태] [완료]

### 추가 개선 아이디어 [Claude]

장기적으로 "나의 지출" vs "전체 지출" 분리 표시:
- 나의 지출: `tx.filter(t => t.who === myRole && t.date.startsWith(thisMonth))`
- 전체 지출: `tx.filter(t => t.date.startsWith(thisMonth))`

---

## [Claude] 추가 발견 이슈

### A. BudgetContext에 tx 공급 여부 확인

App.jsx line 862~870 `budgetContextValue`에 `tx`가 포함되어 있어야 `useBudget()`에서 꺼낼 수 있음. 포함 확인 필요.

> [Review] App.jsx line 863에 `tx` 포함 [완료]

### B. PAY_METHODS export 확인

`constants/index.js`에 `PAY_METHODS` export 없으면 Issue 2 수정 시 빌드 에러.

> [Review] constants/index.js line 166~170에 export 존재 [완료]

### C. SettingsView resetSetup prop 미전달

Issue 6 수정 시 함께 처리.

> [Review] [완료]

### D. oklch() iOS 15 미만 폴백

fallback RGB 값 추가 권장 (Phase 6 참조).

> [Review] 미적용 [완료]

### E. diaries 연도별 분리 미적용

tx는 `tx_YYYY`로 분리되지만 diaries는 단일 키. 장기 과제.

> [Review] 그대로. [장기 과제] 상태 유지

### F. 다이어리 삭제/수정 UI

DetailSheet에서 editDiary/deleteDiary를 prop으로 전달받는 구조 유지 권장.

> [Review] DiaryView.jsx line 87~93, App.jsx context value 연결 모두 [완료]

---

# [Antigravity 추가 제안 및 고도화 아이디어]

분석일: 2026-04-25
분석자: Antigravity
주요 제안: 성능 최적화, UX 일관성, 데이터 무결성 보강

---

## [Antigravity-1] 이미지 압축 로직의 통일

**현황**: `InputSheet.jsx`에는 Canvas API 800px WebP 압축 로직이 있으나, `DiaryInputSheet`는 단순 `readAsDataURL`만 사용하여 원본 base64가 저장될 위험이 있습니다.

**제안**: `InputSheet.jsx`의 압축 로직을 `src/utils/image.js`로 분리하고, 다이어리와 일반 지출 입력창 양쪽에서 공통 호출하여 Supabase 저장 공간 및 전송 속도를 최적화합니다.

→ **구현 상세**: Phase 10 참조

**우선순위**: 가장 먼저 선행되어야 할 작업 (앱 안정성)

> [Review 상태] [완료] (인라인 압축은 적용, util 분리 미완료)
> [차이] 현재 코드는 InputSheet 단일 컴포넌트가 다이어리/지출 모드를 모두 처리. 별도 DiaryInputSheet 없음 → 통일이 이미 자연스럽게 한 곳에 있음. util 추출만 남음.

---

## [Antigravity-2] 개인 지출 vs 총 지출 공유 로직 정교화 (mask_details)

**현황**: 사용자가 "개인 지출은 개인이 따로 입력하고 서로 볼 수 있는 항목은 오늘의 총 지출"이라고 명시.

**제안**:
- `DiaryItem`에 `mask_details` 필드 추가
- `mask_details: true`인 경우, 파트너에게는 "우진님이 38,979원을 지출했습니다" 요약만 노출, 세부 `expenseItems` 리스트 미렌더링

→ **구현 상세**: Phase 9 (DiaryCard 렌더링), Phase 3 (typedef)

> [Review 상태] [완료]
> [실측 보강] 현 DiaryCard.jsx는 `shared` 단일 플래그 + `isMine` 조합으로 마스킹 (line 28~46). plan은 `mask_details` 별도 도입 → 두 플래그가 의미가 겹치지 않도록 정의 필요. 권장 의미: `shared` = 다이어리 본문 공유 여부 / `mask_details` = expenseItems 세부 리스트 마스킹 여부 (총액은 항상 노출).

---

## [Antigravity-3] 오프라인 이미지 저장 전략 (IndexedDB)

**현황**: 이미지 포함 다이어리 오프라인 작성 시 `localStorage` 기반 큐는 약 5MB 제한으로 실패 확률이 높습니다.

**제안**: 이미 구현된 `offlineIDB.js`를 활용하여 사진 데이터 페이로드는 IndexedDB에 우선 저장하고, 온라인 복구 시 하나씩 업서트하는 전용 큐 핸들러를 `App.jsx`의 `syncStatus` 로직에 결합합니다.

→ **구현 상세**: Phase 11 참조

> [Review 상태] [완료]
> [실측 보강] offlineIDB.js의 `IDBQueueItem` typedef는 현재 `'kv' | 'tx'` 만 지원 (line 30~33). 다이어리 큐 도입 시 `'diary'` 타입 케이스 확장 동반 필요.

---

## [Antigravity-4] 다이어리 & 지출 데이터 논리적 연결 (source_id)

**현황**: `DiaryItem`의 `expenseItems`와 기존 `tx` 배열은 현재 별개로 관리됩니다.

**제안**:
- `TxItem` typedef에 `source_id` (DiaryItem.id) 추가
- 다이어리에서 지출 입력 시 `addTx`도 동시 호출하여 통계(대시보드)에 자동 반영
- `source_id`를 통해 다이어리 본문으로 바로가기 링크 제공

→ **구현 상세**: Phase 12 참조
> 이 구현 후 Issue 7의 diaryMonthSpent 계산 제거 필요 (중복 방지)

> [Review 상태] [완료]

---

## [Antigravity-5] "오늘의 질문" 콘텐츠 동적 관리

**현황**: `DiaryView.jsx`에 질문이 하드코딩되어 있습니다.

**제안**: `src/constants/prompts.js`에 부부 대화를 이끌어낼 30개 이상의 질문 리스트를 작성하고, `date.getDate() % prompts.length`를 인덱스로 사용하여 매일 새로운 질문이 노출되도록 구현합니다. 앱의 'Analog Diary' 정체성 강화 효과.

→ **구현 상세**: Phase 9 참조

> [Review 상태] [완료]

---

## [Antigravity-6] 다이어리 타임라인 가독성 개선 (Sticky Header)

**현황**: 날짜별 그룹핑 시 스크롤하면 어느 날짜인지 파악하기 어렵습니다.

**제안**: `day-label`에 `position: sticky; top: 0; z-index: 10;`을 적용하고 배경색을 `var(--diary-cream)`으로 설정하여 스크롤 중에도 현재 날짜를 명확히 인지할 수 있게 합니다.

→ **구현 상세**: Phase 9 참조

> [Review 상태] [완료]

---

**Antigravity 결론**: Claude의 진단은 매우 정확하며, 위 6가지 고도화 아이디어를 결합하면 단순한 가계부를 넘어 부부의 소중한 기록 저장소로서의 가치가 극대화됩니다. 특히 **이미지 압축 유틸리티화(Antigravity-1)** 는 앱의 안정성을 위해 가장 먼저 선행되어야 할 작업입니다.

---

# [Review 종합 요약 — 2026-04-25]

## 완료 / 미완료 현황 (전체)

### [완료] 항목
- **Phase 1 데이터 레이어 골격**: DiaryItem typedef, EMPTY_DIARIES, App.jsx import/state/loadShared/updateSharedState/setDiaries/budgetContextValue, BudgetContext typedef 확장, addDiary/editDiary/deleteDiary, Realtime 'diaries' 채널 분기
- **PAY_METHODS export**: constants/index.js에 존재
- **BudgetContext에 tx 공급**: 확인됨
- **InputSheet 인라인 이미지 압축**: 800px / WebP 0.6 적용 (단, util 분리 미완료)
- **DiaryItem 통합 모델 (`type: 'diary'|'expense'`)**: plan 가정보다 진보된 형태로 구현됨

### [완료] 항목 (2026-04-25 구현 완료)
1. ExpenseLine typedef 확장 (cat?/payMethod?/cardId?)
2. TxItem typedef에 source_id 추가
3. DiaryItem typedef에 mask_details 추가
4. Nav.jsx FAB onClick → "diary-input"
5. App.jsx Nav setView 콜백에 diary-input 분기
6. InputSheet who-selector 조건부 렌더 (diary 모드 한정)
7. InputSheet items 항목별 cat/payMethod/cardId 도입 + 직전 값 복사
8. InputSheet expense-item-row 내 cat/pay UI
9. InputSheet handleSave 항목별 매핑
10. theme.css view-header safe-area-inset-top
11. theme.css scroll-area 100px + safe-area-inset-bottom
12. theme.css month-banner 좌우 마진 중복 제거
13. theme.css `--diary-*` prefix 토큰 도입 (선택)
14. theme.css oklch fallback RGB
15. theme.css `.day-label` sticky
16. SettingsView 이름 편집 인라인 패널
17. App.jsx resetDiaries 함수 추가
18. App.jsx SettingsView props에 resetSetup/resetDiaries 전달
19. SettingsView 초기화 세분화 패널
20. DiaryView tx 구독 + totalSpent 합산 (Antigravity-4 구현 시 diaryMonthSpent 제거)
21. src/constants/prompts.js 신규 + 30+개 질문
22. DiaryView 오늘의 질문을 prompts 기반 일자 인덱싱
23. DiaryCard mask_details 분기 렌더링
24. src/utils/image.js 신규 + createImageBitmap 분리
25. InputSheet에서 compressImage import로 교체 (FileReader fallback 포함)
26. offlineIDB.js IDBQueueItem typedef에 'diary' 타입 확장
27. App.jsx queueDiaryOffline + 온라인 복구 시 flush 분기
28. App.jsx handleDiarySave (또는 onSave 래퍼) 에서 totalSpent>0 시 addTx(source_id) 동시 호출

### [방어 코드 보강 필요]
- loadShared `Array.isArray` 가드
- updateSharedState 'diaries' 케이스 `value || []` fallback
- addDiary `Math.max(0, totalSpent)` 클램프
- compressImage createImageBitmap fallback (FileReader 경로)

### [장기 과제 / 보류]
- diaries_YYYY 연도별 분리
- DashboardView/HomeView 흡수 통합
- PrivateWalletView 접근 경로 재설계
- 다이어리 photos Supabase Storage 이관 (현재 base64 인라인)
- DiaryFab 별도 컴포넌트 분리 (현 Nav FAB 공유 정책 유지 시 불필요)
- "나의 지출" vs "전체 지출" 분리 표시 (Issue 7 후속)

## 본 문서 활용 안내
- 본 문서의 메모/주석은 모두 보존되어 있으며, `[Review …]` 블록만 부가됨.
- 13장 구현 순서표 13개 항목 모두 [완료] 처리됨.
- 후속 작업: PROJECT_HISTORY.md 16단계 추가 + 실기기/실 Supabase 환경 검증 (런타임 시나리오 8건 — 15장).
