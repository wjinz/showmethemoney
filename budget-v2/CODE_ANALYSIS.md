# 코드베이스 심층 분석 리포트
> 분석일: 2026-04-03 | 대상: budget-v2 전체 소스 코드
> 핸드오버 문서(HANDOVER_V2.md) + 실제 코드 직접 분석 결합

---

## 1. 전체 아키텍처 실제 동작 흐름

### 데이터 흐름 (실제 코드 기준)

```
[사용자 액션]
     │
     ▼
[View 컴포넌트]
  setTx(v) 호출
     │
     ▼
[App.jsx - setShared 래퍼]
  ① setTxRaw(value)        → React State 즉시 반영 (UI 업데이트)
  ② db.save(hid, key, val) → Supabase upsert (비동기)
     │
     ▼
[Supabase household_data 테이블]
  upsert { id: householdId, key: "tx", value: [...] }
     │
     ▼
[Realtime 채널 broadcast]
  다른 기기의 subscribe 콜백 호출
     │
     ▼
[updateSharedState(key, value)]
  setTxRaw(value) → 파트너 기기 UI 업데이트
```

### Supabase 테이블 실제 스키마

```sql
-- household_data 테이블
id          : TEXT (householdId, 6자리 숫자)
key         : TEXT (tx / fixed / install / cards / assets / budgets / names / plan / taxConfig)
value       : JSONB
updated_at  : TIMESTAMP
-- PRIMARY KEY: (id, key) 복합키로 추정 (upsert 동작 기준)
```

---

## 2. 발견된 버그 및 문제점

### 🔴 Critical — 즉시 수정 필요

#### BUG-01: `today_str()` 날짜 고정 버그
```javascript
// src/utils/helpers.js, line 1-3
import { NOW } from '../constants';
export const today_str = () => NOW.toISOString().split("T")[0];
//                               ^^^^ NOW는 상수 (앱 최초 로드 시 고정됨)
```
`today_str()`는 함수처럼 보이지만, 반환값은 항상 **앱이 켜진 순간의 날짜**다.
자정이 넘어도 날짜가 바뀌지 않는다. CalendarView의 초기 선택 날짜가 잘못될 수 있다.

**핸드오버에 경고가 있음에도 코드에 그대로 존재한다.**

```javascript
// CalendarView.jsx, line 8
const [selDate, setSelDate] = useState(today_str()); // ← 버그
// 올바른 수정:
const [selDate, setSelDate] = useState(toDateStr(new Date()));
```

---

#### BUG-02: 카드 `name` vs `label` 불일치
```javascript
// TxEditModal.jsx, line 152
{c.icon} {c.name}  // ← 'name' 필드 참조

// 실제 cards 데이터 모델 (HANDOVER_V2 기준)
{ id, label, type, color }  // 'name' 필드 없음
```
카드 선택 UI에서 카드 이름이 `undefined`로 표시된다.

---

### 🟡 Warning — 가능한 빨리 수정 권장

#### BUG-03: `plan.salary` vs `plan.monthlyIncome` 이중 진실 공급원
현재 급여 데이터가 두 군데에 분리되어 저장된다:

| 저장 위치 | 설정하는 화면 | 읽는 화면 |
|-----------|--------------|----------|
| `plan.salary.husband/wife/savingsTarget` | HomeView | BudgetTab, SummaryTab |
| `plan.monthlyIncome`, `plan.yearSavingGoal` | PlanView IncomeTab | IncomeTab 자체 |

두 화면에서 각각 다른 값을 입력하면 SummaryTab의 재정 건강 점수가 불일치한다.

---

#### BUG-04: `InputModal`에 `plan` prop 미전달
```javascript
// App.jsx, line 246
{modal && <InputModal defaultWho={modal} names={names} onClose={...} onSave={addTx} />}
//         plan prop 없음!

// InputModal.jsx, line 10
export function InputModal({ defaultWho, names, plan, onClose, onSave }) {
  // line 101
  {!plan?.isSolo && (  // plan은 항상 undefined → isSolo 체크 항상 true
```
현재는 기능적으로 문제없음(항상 커플 모드로 동작). 하지만 미래에 솔로 모드를 구현할 때 이 prop 연결이 누락되어 있음을 인지해야 한다.

---

#### BUG-05: `install.paid` 필드 존재하지 않음
```javascript
// PlanView.jsx SummaryTab, line 581
.filter(i => !i.paid)  // 'paid' 필드 없음

// 실제 install 데이터 모델
{ id, label, totalAmount, months, startMonth, paidMonths }
// 'paid' 불리언 필드 없음 → 모든 할부가 포함됨 (필터 미동작)
```
완납된 할부도 고정비에 포함되어 SummaryTab의 수치가 과대 계상될 수 있다.

---

#### BUG-06: Supabase 인증 정보 하드코딩
```javascript
// src/utils/supabase.js, line 3-4
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || 'https://epspmlslonvkkxorulbg.supabase.co';  // ← 실제 URL 노출
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'sb_publishable_4Q2Yu0N55fGAcLwXGljgMQ_ayqEaa7q';  // ← 실제 키 노출
```
anon key 자체는 공개 설계지만, 프로덕션 DB URL이 GitHub 소스 코드에 노출된다.
환경 변수가 Vercel에 제대로 설정되어 있으면 실제로는 이 폴백이 사용되지 않지만, git history에 기록된다.

---

### 🟢 Minor — 알고 있으면 충분

#### BUG-07: `HomeView`의 `recent` 변수 데드 코드
```javascript
// HomeView.jsx, line 18
const recent = [...tx].sort((a,b)=>b.id-a.id).slice(0,4);
// 이후 어디서도 사용되지 않음. 매 렌더마다 불필요한 정렬 연산.
```

#### BUG-08: AI 예산 결과의 로딩 스피너 애니메이션 의존성
```javascript
// PlanView.jsx BudgetTab
<svg style={{ animation: "spin 1s linear infinite" }}>
// @keyframes spin 정의가 globalStyles.js에 있다고 가정.
// globalStyles.js에 해당 keyframe이 없으면 애니메이션이 동작하지 않는다.
```

---

## 3. 코드 품질 분석

### 잘 구현된 패턴들

#### ✅ `setShared` 래퍼 패턴
낙관적 업데이트(즉시 로컬 반영) + 비동기 DB 저장의 조합이 깔끔하다.
```javascript
const setShared = useCallback(async (key, value, rawSetter) => {
  rawSetter(value);     // 즉시 UI 반영
  await db.save(...);   // 백그라운드 저장
}, [householdId]);
```

#### ✅ `useCallback` 메모이제이션
App.jsx 전체에서 `useCallback`으로 함수 참조를 안정화시켜 불필요한 자식 리렌더링을 방지한다.

#### ✅ TxEditModal 2단계 삭제 확인
```javascript
const handleDelete = () => {
  if (!confirmDel) { setConfirmDel(true); return; }  // 1단계
  onDelete(tx.id);  // 2단계
};
```
모바일에서 실수로 삭제하는 UX 문제를 잘 해결했다.

#### ✅ DataImportView 컬럼 자동 감지
한국 카드사 공통 패턴 정규식으로 자동 감지하되, `mapping` 스테이지에서 사용자가 수동 보정 가능한 구조가 탄탄하다.

#### ✅ budget-ai.js 합계 오차 자동 보정
```javascript
const diff = available - sum;
if (Math.abs(diff) <= 50000) {
  result.budgets.etc = (result.budgets.etc || 0) + diff;
}
```
AI의 반올림 오차를 서버에서 자동 보정하는 실용적인 처리.

---

### 개선이 필요한 패턴들

#### 코드 중복: 키패드 UI
`InputModal`, `EntryView`, `TxEditModal` 세 군데에 동일한 키패드 코드가 복붙되어 있다.
```javascript
// 세 파일 모두 동일한 패턴
const press = (v) => {
  if (v === "C") setAmount("");
  else if (v === "⌫") setAmount(amount.slice(0, -1));
  else if (amount.length < 9) setAmount(amount + v);
};
// + 동일한 키패드 JSX 렌더링
```
`<NumPad value={amount} onChange={setAmount} />` 공통 컴포넌트로 추출하면 좋다.

#### 인라인 스타일 과다
전체 코드의 약 85%가 인라인 style 객체다. 렌더마다 새 객체가 생성되어 메모리에 부담을 준다.
`globalStyles.js`로 공통 스타일 클래스를 확장하거나 CSS 모듈 도입을 권장한다.

#### 에러 핸들링 부재
대부분의 비동기 호출에 try/catch가 없거나, catch에서 `console.error`만 호출한다.
사용자에게 에러 상태를 명시적으로 보여주는 UI가 API 호출 위주로만 존재한다.

---

## 4. 아키텍처 리스크

### 성능: `tx` 배열 무제한 성장
모든 거래 내역이 단일 JSON 배열로 Supabase에 저장된다. 1년 사용 시 1,000~2,000건이 예상되며, 이 전체를 매번 로드하고 React 메모리에 유지한다.
- **단기**: 문제없음
- **중장기 (2년+)**: 초기 로딩 느려짐, 필터링 연산 증가

권장: 연도별 아카이빙 로직 또는 Supabase에서 연도 파티셔닝 고려.

### 보안: householdId 기반 접근 제어
6자리 숫자 ID만으로 가계부에 접근한다. Row Level Security(RLS)가 설정되어 있지 않다면, Supabase에 직접 API 호출로 다른 가계부 데이터에 접근 가능하다.

권장: Supabase RLS 정책 확인 및 강화.

### 보안: Vercel Functions 인증 없음
`/api/ocr`와 `/api/budget-ai`에 인증/레이트리밋이 없다. URL이 노출되면 무제한 Anthropic API 호출이 가능하다.

---

## 5. 화면별 상태 및 Props 의존성 맵

```
App.jsx (전역 상태)
├── HomeView
│   props: tx, budgets, fixed, install, names, onAdd, sliderCfg, onWidget, plan, setPlan
│   내부 state: paceDaily, searchTerm, showFull, showSalaryEdit, editH, editW, editS
│
├── EntryView
│   props: names, onSave, onDelete, onEdit, tx, cards
│   내부 state: who, amount, cat, memo, cardId, payMethod, date, saved, isOCR, editingTx
│   자식: TxEditModal
│
├── ReportView
│   props: tx, budgets, setBudgets, fixed, install, names, cards, plan, setPlan, taxConfig, setTaxConfig, onEdit, onDelete
│   내부 state: tab
│   자식들:
│   ├── CalendarView (onEdit, onDelete 전달됨)
│   │   자식: TxEditModal
│   ├── DataImportView (plan, setPlan 전달됨)
│   ├── PlanView (plan, setPlan, tx, budgets, setBudgets, fixed, install 전달됨)
│   │   자식탭: BaselineTab, IncomeTab, BudgetTab, EventsTab, SummaryTab
│   ├── TaxOptimizerView
│   └── PredictionView
│
├── AssetView
│   props: assets, setAssets
│
├── FixedView
│   props: fixed, setFixed, install, setInstall, cards, setCards, tx, names, sliderCfg
│
└── SettingsView
    props: names, setNames, budgets, setBudgets, sliderCfg, setSliderCfg, theme, setTheme, resetAll, householdId, myRole, leaveHousehold, tx
```

---

## 6. `plan` 객체 실제 필드 전체 목록

코드 분석을 통해 실제로 사용되는 `plan` 필드들:

```javascript
plan = {
  // ── HomeView에서 읽고 씀 ──
  salary: {
    husband: Number,       // 남편 월 실수령액
    wife: Number,          // 아내 월 실수령액
    savingsTarget: Number, // 월 저축 목표
  },

  // ── PlanView IncomeTab에서 읽고 씀 (salary와 중복) ──
  monthlyIncome: Number,
  yearSavingGoal: Number,
  monthlyFixedTotal: Number,  // FixedView 합산값 (어디서 설정되는지 불명확)

  // ── DataImportView → PlanView로 전달 ──
  importedAnalysis: {
    total: Number,
    count: Number,
    byMonth: { "YYYY-MM": Number },
    byCat: { catId: Number },
    avgMonthly: Number,
    topMerchants: [[name, amount]],
    months: ["YYYY-MM"],
    importedAt: ISOString,
    catBudgetSuggestions: { catId: Number },
  },

  // ── PlanView EventsTab ──
  events: [{
    id: Number,    // Date.now()
    title: String,
    amount: Number,
    month: Number, // 1-12
    cat: String,   // CATS id
  }],

  // ── PlanView BudgetTab (월별 개별 예산 override) ──
  [`monthPlan_${YEAR}_${MONTH}_${catId}`]: Number,  // 동적 키
}
```

**주의**: `monthlyFixedTotal`이 plan에 저장되는 위치를 코드에서 찾지 못했다.
PlanView IncomeTab에서 읽기만 하고 쓰는 곳이 없어 항상 0일 가능성이 있다.

---

## 7. 데이터 무결성 위험 시나리오

| 시나리오 | 결과 | 대응 방안 |
|---------|------|----------|
| 네트워크 끊김 중 두 기기에서 동시에 지출 추가 | 나중에 저장된 기기의 tx 배열이 앞 기기 데이터를 덮어씀 | 배열 병합(merge) 로직 필요 |
| `setShared`의 Supabase 저장 실패 | 로컬 State는 업데이트, DB에는 반영 안 됨 | 현재 `syncStatus: "error"` 표시만 함. 재시도 로직 없음 |
| plan 객체가 너무 커짐 | importedAnalysis에 수천 건 데이터 포함 가능 | applyToPlan에서 원시 데이터 제거, 집계값만 저장하는 게 좋음 |

---

## 8. 즉시 실행 가능한 개선 항목 (우선순위 순)

### P0 — 버그 수정

1. **`today_str()` 수정** (`CalendarView.jsx` line 8)
   ```javascript
   // 변경 전
   const [selDate, setSelDate] = useState(today_str());
   // 변경 후
   const [selDate, setSelDate] = useState(toDateStr(new Date()));
   ```

2. **카드 `label` 필드 통일** (`TxEditModal.jsx` line 152, `EntryView.jsx` 카드 렌더)
   ```javascript
   // 변경 전: c.name
   // 변경 후: c.label
   ```

3. **`install.paid` → 실제 완납 여부 계산** (`PlanView.jsx` SummaryTab)
   ```javascript
   // 변경 전: .filter(i => !i.paid)
   // 변경 후: .filter(i => (i.paidMonths || 0) < (i.months || 1))
   ```

### P1 — 데이터 통합

4. **`plan.salary`를 단일 진실 공급원으로 통합**
   - IncomeTab에서 `plan.monthlyIncome` 대신 `plan.salary.husband + plan.salary.wife` 읽기
   - 저축 목표도 `plan.salary.savingsTarget`으로 통일
   - `plan.monthlyIncome`, `plan.yearSavingGoal` 필드 deprecated 처리

5. **`plan.monthlyFixedTotal` 자동 계산 또는 제거**
   - `fixed`와 `install`이 이미 App.jsx에서 관리되므로 plan에 중복 저장 불필요
   - IncomeTab에서 props로 받은 `fixed`/`install`로 직접 계산

### P2 — UX 개선

6. **월별 히스토리 뷰**: 지난 달 내역 조회 기능 (CalendarView는 이미 `viewMonth`/`viewYear` state가 있어 기반 준비됨)

7. **카드 결제일 로직**: `cards` 배열에 `billingStartDay`, `billingEndDay`, `paymentDay` 필드 추가 후 CalendarView에서 카드 결제일 마커 표시 (CalendarView에 `getBillingPeriod` 로직이 이미 구현되어 있으나 카드 데이터에 해당 필드가 없을 때 오류 처리 필요)

8. **키패드 공통 컴포넌트화**: `InputModal`, `EntryView`, `TxEditModal`의 중복 코드 제거

---

## 9. 핵심 이해도 체크포인트

새 개발자가 코드베이스를 이해했는지 검증할 수 있는 질문들:

1. `editTx(id, updates)`를 호출하면 실제로 어떤 경로로 Supabase에 저장되나?
   → App.jsx의 `editTx` → `setTx` (useCallback) → `setShared("tx", ...)` → `db.save()`

2. 지출 데이터(`tx`)에 `payMethod: "card"`로 저장된 것과 카드 결제일(청구일)의 관계는?
   → `payMethod: "card"` = 이번달 카드로 결제한 것. 청구는 다음달. HomeView의 `thisMonthCardSpend`가 이를 집계.

3. `plan.importedAnalysis`는 언제 생성되고, 어느 화면들이 읽는가?
   → DataImportView에서 엑셀 업로드 후 "재무계획에 반영" 클릭 시 생성. BaselineTab, BudgetTab에서 읽음.

4. 두 기기가 동시에 데이터를 수정하면 어떻게 되는가?
   → 나중에 `db.save()`가 완료된 쪽이 이김. 선착순 덮어쓰기. 충돌 감지/병합 로직 없음.

5. `constants/index.js`의 `DAY`, `MONTH`, `YEAR`는 언제 계산되는가?
   → 앱 최초 로드 시 한 번만. `NOW = new Date()`도 모듈 로드 시 고정. 자정 이후에도 변하지 않는 잠재적 버그 존재.

---

## 10. 추가로 확인이 필요한 항목

아래 내용은 코드만으로 확인이 불가능하며, 실제 Supabase 설정 또는 Vercel 환경에서 확인이 필요하다:

- [ ] Supabase `household_data` 테이블의 실제 컬럼 타입 및 RLS 정책 활성화 여부
- [ ] Vercel 환경 변수 `ANTHROPIC_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 정상 설정 여부
- [ ] `household_data` 테이블의 복합 PK 설정 (`id` + `key` 로 upsert가 작동해야 함)
- [ ] Supabase Realtime이 해당 테이블에 활성화되어 있는지 여부
- [ ] 현재 Supabase에 저장된 실제 데이터에서 `plan.monthlyFixedTotal` 필드에 값이 있는지

---

*이 문서는 실제 소스 코드(`.jsx`, `.js` 파일 전체) 직접 분석을 통해 작성되었습니다.*
