# 코드베이스 심층 분석 리포트 V2
> 분석일: 2026-04-03 | 대상: budget-v2 (안티그래비티 세션 이후 전체 소스)
> 이전 분석(CODE_ANALYSIS.md)에서 발견된 P0 버그 3건은 이미 수정 완료.
> 본 문서는 신규 추가 코드 포함 전체 재분석 결과.

---

## 1. 세션 간 추가된 기능 목록 (안티그래비티 작업 내역)

| 파일 | 종류 | 설명 |
|:---|:---|:---|
| `src/views/AssetView.jsx` | 신규 | 자산/순자산 관리 (계좌·현금·투자·대출) |
| `src/views/CardView.jsx` | 신규 | 카드 등록 + 결제일/이용기간 설정 |
| `src/views/SimulatorView.jsx` | 신규 | 재무 시뮬레이터 (복리 차트, Recharts) |
| `src/views/PredictionView.jsx` | 신규 | 반복 지출 패턴 기반 예측 |
| `src/views/TaxOptimizerView.jsx` | 신규 | 연말정산 최적화 (문턱값 안내) |
| `src/views/WidgetView.jsx` | 신규 | 포커스 모드 전체화면 위젯 |
| `src/components/InputModal.jsx` | 신규 | 홈에서 띄우는 바텀시트 입력 모달 (OCR 포함) |
| `src/components/SliderRow.jsx` | 신규 | 슬라이더 컴포넌트 추출 (재사용) |
| `api/ocr.js` | 신규 | Vercel 서버리스 OCR (claude-opus-4-5) |
| `src/utils/ocr.js` | 신규 | 클라이언트 OCR 호출 유틸 |
| `src/utils/export.js` | 신규 | CSV 내보내기 유틸 |
| `src/views/EntryView.jsx` | 대폭 수정 | OCR 카메라 + TxEditModal 통합 |
| `src/views/FixedView.jsx` | 수정 | SimulatorView·CardView 탭으로 편입 |
| `src/views/ReportView.jsx` | 수정 | 세금·예측 탭 추가 |
| `src/App.jsx` | 수정 | assets 상태, InputModal, WidgetView 추가 |
| `src/constants/index.js` | 수정 | `getNow()` 등 동적 함수 추가, taxConfig/카드 프리셋 추가 |

---

## 2. 전체 아키텍처 (현재 기준)

```
[App.jsx — 전역 상태]
│
├── 공유 상태 (Supabase 동기화)
│   tx / fixed / install / cards / assets / plan / budgets / names / taxConfig
│
├── 개인 상태 (localStorage)
│   sliderCfg / theme / householdId / myRole
│
├── Nav 탭 구조
│   home    → HomeView
│   entry   → EntryView
│   report  → ReportView
│              ├── 📊 리포트   → ReportContent
│              ├── 📅 캘린더  → CalendarView
│              ├── 📁 데이터  → DataImportView
│              ├── 🎯 계획    → PlanView
│              │               ├── BaselineTab
│              │               ├── IncomeTab
│              │               ├── BudgetTab (AI 예산 배분)
│              │               ├── EventsTab
│              │               └── SummaryTab
│              ├── 💸 연말정산 → TaxOptimizerView
│              └── 🔮 예측    → PredictionView
│   asset   → AssetView
│   fixed   → FixedView
│              ├── 📌 고정비/할부 (내장)
│              ├── 💳 카드    → CardView
│              └── 📈 시뮬레이터 → SimulatorView
│   settings → SettingsView
│
├── 플로팅 레이어
│   InputModal (홈 + 버튼 → onAdd)
│   WidgetView (PACE 버튼 → onWidget)
│   TxEditModal (CalendarView, EntryView 내부)
```

---

## 3. 데이터 모델 실제 필드 목록

### install 객체 (FixedView에서 생성)
```javascript
{
  id:        Date.now(),       // number
  name:      string,           // 할부 항목명
  total:     number,           // 총 결제 금액 (parseInt)
  month:     number,           // 개월 수 (singular!)
  cardId:    string,           // 결제 카드 id
  date:      string,           // 최초 결제일 (YYYY-MM-DD)
  monthly:   number,           // 월 할부금 (Math.round(total/month))
  // paidMonths: 저장 시 없음. 명시적으로 업데이트 시에만 생성
}
```

### cards 객체 (CardView에서 생성)
```javascript
{
  id:                  Date.now(),
  name:                string,     // 카드명
  icon:                string,     // 이모지
  color:               string,     // 16진 색상
  billingStartDay:     number,     // 이용 시작일
  billingEndDay:       number,     // 이용 종료일
  billingEndNextMonth: boolean,    // B타입 여부
  paymentDay:          number,     // 결제일
}
```

### assets 객체 (AssetView에서 생성)
```javascript
{
  id:     Date.now(),
  name:   string,
  type:   "account" | "cash" | "invest" | "loan",
  amount: number,
  info:   string,   // 추가 메모
}
```

---

## 4. 발견된 버그 및 문제점

### 🔴 CRITICAL (즉시 수정 필요)

---

#### BUG-C1: EntryView — 카드 이름 undefined
**파일**: `src/views/EntryView.jsx` line 142
```javascript
// 현재 (버그)
}}>{c.icon} {c.name}</button>

// 수정
}}>{c.icon} {c.label}</button>
```
**현상**: 지출 입력 화면의 카드 선택 버튼에 카드명이 표시되지 않음.
**원인**: cards 데이터 모델의 필드명은 `label`이 아닌 `name`. 앗, 반대다. CardView가 `name`으로 저장하므로 EntryView가 맞고, TxEditModal이 수정됐어야 했다?

> ⚠️ **재확인 필요**: CardView `addCard` 시 `setNewC`의 초기값을 보면 `{name: "", ...}`으로 `name` 필드로 저장한다. **즉 `c.name`이 맞다.** 이전 분석에서 TxEditModal의 `c.name → c.label` 수정이 잘못됐을 가능성 있음. HANDOVER_V2의 cards 데이터 모델도 `id, label, type, color`라고 했는데, 실제 CardView 코드는 `name`으로 저장. 두 곳이 불일치. **TxEditModal의 수정을 되돌리거나 CardView를 `label`로 통일해야 함.**

---

#### BUG-C2: FixedView — 할부 등록 카드 선택 드롭다운
**파일**: `src/views/FixedView.jsx` line 86
```javascript
// 현재 (버그 가능성)
<option key={c.id} value={c.id}>{c.name}</option>

// CardView가 `name`으로 저장하면 정상, `label`이면 버그
```
**연계**: CardView와 동일한 필드명 혼란 문제. CardView 저장 필드 통일 후 확인 필요.

---

#### BUG-C3: FixedView — 할부 목록 카드명 표시
**파일**: `src/views/FixedView.jsx` line 117
```javascript
// 현재
{card?.name || "카드"}

// CardView 필드가 `label`이면 버그
```
**연계**: BUG-C2와 동일 원인.

---

#### BUG-C4: SummaryTab — install 월 고정비 계산 항상 0
**파일**: `src/views/PlanView.jsx` SummaryTab, line 581
```javascript
// 현재 (버그)
.reduce((s, i) => s + Math.round((i.totalAmount || 0) / (i.months || 1)), 0)

// 실제 저장 필드명: i.total (not totalAmount), i.month (not months, singular)
// 수정안 (단순하게 이미 계산된 monthly 사용)
.reduce((s, i) => s + (i.monthly || 0), 0)
```
**현상**: 플랜 요약 탭의 고정비 합산에서 할부금이 항상 0원으로 표시.
**원인**: install 객체의 총액 필드는 `total`이고 개월 수는 `month`(단수)인데 코드가 `totalAmount`와 `months`(복수)를 참조. 이미 `monthly` 필드가 계산되어 저장되어 있으므로 그걸 쓰면 된다.

---

#### BUG-C5: helpers.js — `getBillingPeriod` 기본 파라미터 고정
**파일**: `src/utils/helpers.js` line 24
```javascript
// 현재 (버그)
export function getBillingPeriod(card, today = NOW) {

// 수정
export function getBillingPeriod(card, today = new Date()) {
```
**현상**: CardView에서 `getBillingPeriod(newC)`로 기본값 사용 시 앱 최초 로드 시점의 날짜 기준으로 결제일 미리보기가 계산됨. 오래된 탭에서 날짜가 굳어버리는 문제.
**원인**: `NOW`는 모듈 로드 시점에 고정된 `Date` 객체.

---

### 🟡 WARNING (조만간 수정 권장)

---

#### BUG-W1: TxEditModal — 이전 BUG-02 수정 재검토 필요
**파일**: `src/components/TxEditModal.jsx` line 151
이전 분석에서 `c.name → c.label`로 수정했으나, **CardView가 `name` 필드로 저장하므로 원래 `c.name`이 맞았을 가능성이 높다.** 실제 Supabase에 저장된 데이터의 필드명을 확인해야 함.
- 만약 Supabase에 `name`으로 저장되어 있다면 TxEditModal을 `c.name`으로 되돌려야 함.
- 카드 데이터를 `label`로 통일하려면 CardView의 newC 초기값과 저장 로직도 변경 필요.

---

#### BUG-W2: TaxOptimizerView — 잘못된 데이터 범위
**파일**: `src/views/TaxOptimizerView.jsx` line 9
```javascript
// 현재: 전체 tx 합산 (연도 필터 없음)
const totalSpent = tx.reduce((s,t) => s + t.amount, 0);

// 수정: 올해 데이터만 필터링
const curYear = new Date().getFullYear();
const totalSpent = tx.filter(t => t.date.startsWith(`${curYear}`)).reduce((s,t) => s + t.amount, 0);
```
**현상**: 연말정산 화면에서 올해뿐 아니라 전체 연도의 지출이 합산되어 왜곡된 소득공제 분석 제공.

---

#### BUG-W3: TaxOptimizerView — 잘못된 저장 안내 문구
**파일**: `src/views/TaxOptimizerView.jsx` line 83
```javascript
// 현재 (사실 오류)
* 입력하신 정보는 본인 기기에만 저장됩니다.
```
**현상**: `taxConfig`는 실제로 `setShared("taxConfig", ...)` 패턴으로 Supabase에 동기화됨. 파트너도 볼 수 있음. 사용자를 오해시킬 수 있는 문구.

---

#### BUG-W4: ReportView — 동결된 날짜 상수 사용
**파일**: `src/views/ReportView.jsx` line 35 외 다수
```javascript
// 현재: DAY, DAYS, MONTH, YEAR — 모두 모듈 로드 시 고정
const projected = DAY > 0 ? Math.round(totalSpent / DAY * DAYS) : 0;
```
**영향**: 모든 뷰에서 날짜 관련 계산이 앱 최초 시작 시각 기준으로 고정. 탭을 며칠 뒤에 열어도 날짜가 업데이트되지 않음.
**현황**: `constants/index.js`에 `getYear()`, `getMonth()`, `getDay()`, `getDaysInMonth()` 동적 함수가 추가되어 있으나, 실제 View들은 아직 아무것도 마이그레이션하지 않음.

---

### 🔵 MINOR (개선 사항)

---

#### BUG-M1: plan.isSolo — UI 없는 미완성 기능
**현상**: `HomeView`, `SettingsView`, `InputModal`, `EntryView`, `PlanView(IncomeTab)` 총 5개 파일에서 `plan?.isSolo` 조건부 렌더링이 있으나, 이 값을 `true`로 설정하는 UI가 어디에도 없음.
**영향**: 싱글 모드는 절대 활성화되지 않음. 코드는 있지만 기능이 작동 안 함.
**해결**: SyncSetup에서 가입 시 "혼자 쓰기 / 파트너와 함께" 선택 UI 추가 필요.

---

#### BUG-M2: SimulatorView — 슬라이더 값 저장 불가
**파일**: `src/views/SimulatorView.jsx`
`onUpdateSimCfg` prop이 시그니처에 있지만 FixedView에서 전달되지 않음. 시뮬레이터에서 조정한 값이 `sliderCfg`에 저장되지 않고, 탭 이동 시 초기화됨.

---

#### BUG-M3: FixedView — 할부 등록 폼 month vs months 불일치
**파일**: `src/views/FixedView.jsx` line 22-23
```javascript
setInstall(p => [...p, { ...newI, id: Date.now(), total: parseInt(newI.total), monthly: Math.round(newI.total / newI.month) }]);
```
newI 상태의 개월 수 필드는 `month`이지만, 저장 시 `...newI`로 펼치면 `month` 키가 그대로 남음. SummaryTab은 이를 `months`(복수)로 읽으려 하여 BUG-C4 발생.

---

#### BUG-M4: helpers.js — `today_str()` 여전히 레거시
```javascript
export const today_str = () => NOW.toISOString().split("T")[0];
```
CalendarView에서는 이미 `toDateStr(new Date())`로 수정했으나, `today_str` 함수 자체는 여전히 `NOW`를 참조. 외부에서 호출 시 동결값 반환. 함수 내부를 `() => toDateStr(new Date())`로 수정하거나 완전히 제거 권장.

---

## 5. 컴포넌트 Props 의존성 맵 (최신)

```
App.jsx
├── HomeView       {tx, budgets, fixed, install, names, onAdd, sliderCfg, onWidget, plan, setPlan}
├── EntryView      {names, onSave, onDelete, onEdit, tx, cards}
├── ReportView     {tx, budgets, setBudgets, fixed, install, names, cards, plan, setPlan, taxConfig, setTaxConfig, onEdit, onDelete}
│   ├── ReportContent   {tx, budgets, fixed, install, names, plan}
│   ├── CalendarView    {tx, cards, names, budgets, onEdit, onDelete}
│   ├── DataImportView  {plan, setPlan, onGoToPlan}
│   ├── PlanView        {plan, setPlan, tx, budgets, setBudgets, fixed, install, onGoToImport}
│   ├── TaxOptimizerView {tx, names, taxConfig, setTaxConfig}
│   └── PredictionView  {tx, fixed}
├── AssetView      {assets, setAssets}
├── FixedView      {fixed, setFixed, install, setInstall, cards, setCards, tx, names, sliderCfg}
│   ├── CardView        {cards, setCards}
│   └── SimulatorView   {sliderCfg}   ← onUpdateSimCfg 전달 안 됨 (BUG-M2)
├── SettingsView   {names, setNames, budgets, setBudgets, sliderCfg, setSliderCfg, theme, setTheme, resetAll, householdId, myRole, leaveHousehold, tx, plan}
├── InputModal     {defaultWho, names, plan, onClose, onSave}   ← modal 상태 기반
└── WidgetView     {tx, budgets, names, onClose}                 ← showWidget 상태 기반
```

---

## 6. plan 객체 필드 전체 목록

```javascript
plan = {
  // 급여 (HomeView + PlanView/IncomeTab 에서 설정)
  salary: {
    husband:       number,  // 남편 월 실수령액
    wife:          number,  // 아내 월 실수령액
    savingsTarget: number,  // 월 저축 목표
  },

  // 연간 이벤트 목록 (PlanView/EventsTab)
  events: [
    { id, title, month, amount, cat }
  ],

  // 카드 데이터 분석 결과 (DataImportView 업로드 시)
  importedAnalysis: {
    total:                number,
    avgMonthly:           number,
    count:                number,
    months:               string[],
    byCat:                { [catId]: number },
    catBudgetSuggestions: { [catId]: number },
  },

  // 연간 지출 한도 (PlanView/IncomeTab)
  yearSpendLimit: number,

  // 혼자 쓰기 모드 (설정 UI 없음 — BUG-M1)
  isSolo: boolean,

  // 이전 세션 잔재 (현재 사용 안 됨)
  monthlyIncome:     number,   // plan.salary로 통합 완료 여부 확인 필요
  monthlyFixedTotal: number,   // 현재 어디서도 write하지 않음 → 항상 0
}
```

> ⚠️ `plan.monthlyFixedTotal`은 PlanView/IncomeTab에서 `plan.monthlyFixedTotal || 0`으로 읽지만 어디서도 저장하지 않음. 항상 0. FixedView의 실제 fixed 데이터를 직접 계산해서 사용 중.

---

## 7. API 엔드포인트 현황

| 엔드포인트 | 모델 | 입력 | 출력 |
|:---|:---|:---|:---|
| `POST /api/ocr` | claude-opus-4-5 | `{image: base64, mediaType}` | `{amount, cat, memo}` |
| `POST /api/budget-ai` | claude-haiku-4-5 | `{totalSalary, fixedTotal, installTotal, savingsTarget, catHistory}` | `{budgets, reasons, tip}` |

**OCR 주의사항**:
- 영수증 인식 실패 시 HTTP 200으로 `{amount: null, cat: null, memo: null}` 반환 (422 아님)
- `filled === 0` 체크는 클라이언트에서 수행

---

## 8. 수정 우선순위 (P0/P1/P2)

### P0 — 즉시 수정 (화면 깨짐 또는 데이터 왜곡)

| ID | 파일 | 수정 내용 |
|:---|:---|:---|
| BUG-C4 | PlanView.jsx SummaryTab | `i.totalAmount → i.total`, `i.months → i.monthly` |
| BUG-C5 | helpers.js | `getBillingPeriod` 기본값 `NOW → new Date()` |
| BUG-W2 | TaxOptimizerView.jsx | `totalSpent` 연도 필터 추가 |
| BUG-W1 | TxEditModal.jsx | `c.label` 수정 검토 — CardView `name` 필드 확인 후 결정 |

### P1 — 조만간 수정 (UX 손상)

| ID | 파일 | 수정 내용 |
|:---|:---|:---|
| BUG-W4 | 전체 뷰 | 동결 상수 `DAY/DAYS/MONTH/YEAR` → `getDay()` 등 동적 함수로 교체 |
| BUG-W3 | TaxOptimizerView.jsx | "본인 기기만 저장" 문구 수정 |
| BUG-M1 | SyncSetup.jsx | isSolo 토글 UI 추가 |

### P2 — 장기 개선

| ID | 파일 | 수정 내용 |
|:---|:---|:---|
| BUG-M2 | FixedView + SimulatorView | `onUpdateSimCfg` 연결 또는 제거 |
| BUG-M4 | helpers.js | `today_str` 내부 동적화 |
| — | PlanView | `plan.monthlyFixedTotal` 제거 또는 write 로직 추가 |
| — | EntryView | handleOCR 로직 중복 (InputModal과 동일) → 공통 hook 추출 |
| — | constants.js | 레거시 `NOW/DAY/DAYS/MONTH/YEAR` export 제거 |

---

## 9. cards 데이터 모델 혼란 — 최종 정리

현재 카드 데이터 모델 정의가 두 곳에서 불일치하고 있다.

**CardView.jsx** (실제 저장 코드)
```javascript
const [newC, setNewC] = useState({
  name: "",    // ← "name" 사용
  icon: "💳",
  color: "#1c2340",
  billingStartDay: 1, billingEndDay: 25,
  billingEndNextMonth: false, paymentDay: 10
});
```

**HANDOVER_V2.md** 데이터 모델 명세
```
cards: { id, label, type(credit/debit), color }  // ← "label" 명시
```

**EntryView.jsx** line 142: `{c.icon} {c.name}` — `name` 참조
**TxEditModal.jsx** line 151: `{c.icon} {c.label}` — **수정됨(잘못된 수정 가능성)**
**FixedView.jsx** line 86: `{c.name}` — `name` 참조
**FixedView.jsx** line 117: `{card?.name}` — `name` 참조

> **결론**: 실제 코드가 `name`으로 일관되게 사용하고 있으며, HANDOVER_V2 문서의 `label` 명세가 구버전이거나 오류. **이전 세션에서 TxEditModal의 `c.name → c.label` 수정을 되돌려야 할 가능성이 높다.** Supabase에 실제 저장된 데이터 확인 필요.

---

## 10. 검증 항목 (배포 전 확인)

1. **카드 필드명 통일**: Supabase `household_data`의 `cards` 키 값에서 실제 필드가 `name`인지 `label`인지 확인 → TxEditModal 수정 방향 결정
2. **OCR 동작**: `ANTHROPIC_API_KEY` Vercel 환경 변수 설정 여부 확인
3. **assets RLS**: `household_data` 테이블 RLS가 `assets` 키도 허용하는지 확인 (기존 키들만 허용하는 정책이면 추가 필요)
4. **taxConfig 동기화**: 두 파트너가 서로 다른 연봉을 입력하면 마지막 저장자 값으로 덮어쓰임 — 의도된 동작인지 확인
5. **isSolo 활성화 방법**: 현재 코드상 `plan.isSolo = true`가 없어 싱글 모드 진입 불가 — 기획 방향 확인

---

> 분석자 메모: 전체적으로 기능 추가 속도가 빠르고 코드 구조는 일관적. 주요 리스크는 (1) 날짜 동결 상수의 광범위한 사용, (2) install 필드명 혼란(`month` vs `months`, `total` vs `totalAmount`), (3) cards `name` vs `label` 혼선. 이 세 가지만 정리하면 안정성이 크게 올라감.
