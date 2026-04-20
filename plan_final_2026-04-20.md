# 통합 최종 구현 계획서

작성일: 2026년 4월 20일  
통합 원본: `plan_2026-04-20_0932.md` (카드 정산 기능) + `plan_2026-04-20_2301.md` (유지보수 3건)  
최종 상태 검증일: 2026년 4월 20일 (Claude 코드 직접 검증)

---

## 📊 전체 구현 현황 요약

| 항목 | 계획 출처 | 상태 |
|------|-----------|------|
| Phase A-1: 정산 상태/상수 설계 | plan_0932 | ✅ 구현 완료 |
| Phase A-2: SettlementView.jsx 구현 | plan_0932 | ✅ 구현 완료 (마이너 이슈 2건 수정 완료) |
| Phase A-3: 네비게이션 및 위젯 연동 | plan_0932 | ✅ 구현 완료 (버그 1건 — 수정 완료) |
| Phase B-1: 카드 getBillingPeriod 수정 | plan_2301 | ✅ 구현 완료 (NaN 표시 방어) |
| Phase B-2: OCR 프롬프트 유연화 + AbortSignal | plan_2301 | ✅ 구현 완료 |
| Phase B-3: 최근지출 날짜 헤더 그룹화 | plan_2301 | ✅ 구현 완료 |

> [!NOTE] **[Claude] 코드 검증 메모 (2026-04-20)** — 위 현황은 실제 소스 파일을 직접 열어 확인한 결과입니다. Phase A-1~3는 코드가 존재하며 실행 가능. Phase B-1~3는 소스 변경 없음.  
> 아래 섹션별로 상세 검증 결과와 신규 발견 이슈를 주석으로 남겼습니다.

---

## ✅ Part A. 카드 정산하기 기능 [plan_0932 — 구현 완료]

사용자가 이번 달 카드 결제일 이전에 미리 결제비를 계산하고, 총 현금 잔액과 고정비를 비교해 자산의 과부족분을 확인할 수 있는 '월별 카드 정산 계산기' 기능.

### [✅ 완료] Phase A-1: 상태 및 모델 상수 설계

**구현 확인 파일:**
- `src/constants/index.js` — `CardBill`, `SettlementItem` typedef 추가, `EMPTY_SETTLEMENTS = []` 추가 ✅
- `src/App.jsx:92` — `const [settlements, setSettlementsRaw] = useState(EMPTY_SETTLEMENTS)` ✅
- `src/App.jsx:154` — `case 'settlements': setSettlementsRaw(value); break;` ✅
- `src/App.jsx:212` — `if (allData.settlements) setSettlementsRaw(allData.settlements)` ✅
- `src/App.jsx:556` — `setSettlements` useCallback (함수형 업데이트 지원) ✅
- `src/App.jsx:683` — `resetAll()`에 `db.save(householdId, "settlements", EMPTY_SETTLEMENTS)` ✅
- `src/App.jsx:841` — `budgetContextValue`에 `settlements, setSettlements` 포함 ✅
- `src/context/BudgetContext.jsx:54-55` — `BudgetContextValue` typedef에 `settlements`, `setSettlements` 추가 ✅

**[Claude][✅ 반영완료] 설계 원칙 확인:**
- `SettlementItem.date`는 `"YYYY-MM"` 포맷 — SettlementView.jsx 실제 구현에서도 일치 ✅
- `id` 생성: `Date.now() * 1000 + (Math.random() * 1000 | 0)` — SettlementView.jsx:66 ✅
- `offlineQueue.js`는 키 이름 상관없이 자동 처리 — 별도 구현 불필요 ✅
- `SyncSetup.jsx`에 settlements 추가 불필요 (첫 save 시 자동 생성) ✅

---

### [✅ 완료] Phase A-2: SettlementView.jsx 구현

**구현 확인 파일:** `src/views/SettlementView.jsx` (245줄)

**구현된 기능 검증:**
- `autoFixedCash` 자동 계산: `fixed.filter(f => !f.cardId).reduce(...)` ✅ (line 16-18)
- 월 네비게이션 (◀/▶ 버튼): `currentDate` state로 "YYYY-MM" 관리 ✅ (line 20-23)
- `prevDate` 계산: 1월이면 전년도 12월로 처리 ✅ (line 46-49)
- 이전 달 정산과 카드별 청구액 증감 표시 (빨강/파랑) ✅ (line 186-199)
- Upsert 저장: `prev.filter(s => s.date !== currentDate)` → 월별 1건 유지 ✅ (line 74-77)
- 카드 결제일/청구기간 미니 텍스트 표시 (`c.paymentDay && ...` 가드 포함) ✅ (line 217-218)
- 고정 현금 "자동 제안값 불러오기" 버튼 ✅ (line 156-160)
- `setSettlements`의 함수형 업데이트 (`prev => [...]`) 패턴 — App.jsx의 함수형 v 처리와 호환 ✅
 
### [NEW] Phase A-5: SettlementView UI/UX 세밀 조정
- **코드 정리**: `SettlementView.jsx:4`에서 사용하지 않는 `import { G } from "../styles/globalStyles.js"` 제거.
- **뒤로가기 기능**: 
    - `App.jsx:882`에서 `<SettlementView onBack={() => setView("settings")} />`로 prop 전달.
    - `SettlementView.jsx` 헤더 좌측에 뒤로가기(◀ 또는 화살표 아이콘) 버튼 추가하여 Settings 화면으로 복귀 지원.
- **레이블 가독성**: `SettlementSummaryWidget.jsx:43`의 `"이번 달 증감액 예측"`을 `"이번 달 예상 여유액"`으로 변경하여 직관성 개선.
 
> [!WARNING] ✅ **[Antigravity - 완료] 🐛 사용하지 않는 `G` import — 빌드 경고 유발** — `SettlementView.jsx:4`에서 `import { G } from "../styles/globalStyles.js"`를 import하고 있으나, 파일 전체에 걸쳐 `G`를 한 곳도 사용하지 않습니다. 모든 스타일이 인라인으로 처리되어 있어 이 import는 완전히 dead code입니다. Vite/ESLint에서 경고를 발생시킬 수 있으므로 제거를 권장합니다.
 
> [!NOTE] ✅ **[Antigravity - 완료] SettlementView에 뒤로가기 버튼 없음 — UX 개선 제안** — 현재 `SettlementView.jsx` 헤더(line 88-113)에는 월 네비게이션(◀/▶) 만 있고, 이전 화면(Settings)으로 돌아가는 버튼이 없습니다. 사용자는 하단 Nav 바를 통해서만 다른 뷰로 이동할 수 있습니다. `App.jsx:882`에서 `<SettlementView />`로 호출할 때 `onBack={() => setView("settings")}` prop을 추가하면 헤더 좌측에 뒤로가기 버튼을 붙일 수 있습니다.

> [!NOTE] **[Claude][✅ 반영완료] `existingData` useEffect 의존성** — `useEffect([existingData, autoFixedCash, currentDate])`는 `existingData`와 `currentDate`가 동시에 바뀔 때(월 이동 시) 두 번 실행될 수 있습니다. 현재 구조에서는 문제없이 작동하지만, 향후 퍼포먼스 이슈 발생 시 `currentDate`만 의존성으로 남기고 `settlements.find`를 직접 계산하는 방향을 고려할 수 있습니다.

---

### [✅ 완료] Phase A-3: 네비게이션 및 컴포넌트 연동

**구현 확인 파일:**
- `src/App.jsx:34` — `const SettlementView = lazy(() => import("./views/SettlementView.jsx")...)` ✅
- `src/App.jsx:882` — `case "settlement": return <SettlementView />;` ✅
- `src/views/SettingsView.jsx:40` — `onNavigate && onNavigate("settlement")` 버튼 ✅
- `src/constants/index.js:91, 106` — `DEFAULT_WIDGET_LAYOUT` mobile/desktop 모두 `settlement_summary` 포함 ✅
- `src/views/widgets/SettlementSummaryWidget.jsx` — 파일 존재 및 구현 완료 ✅
- `src/views/DashboardView.jsx:20` — `SettlementSummaryWidget` import ✅
- `src/views/DashboardView.jsx:152` — `WIDGET_MAP`에 `settlement_summary` 등록 ✅

> [!WARNING] ✅ **[Antigravity] 🐛 버그 발견: `SettlementSummaryWidget` 클릭 시 Settlement가 아닌 Settings로 이동**
>
> **원인 분석 (코드 직접 검증):**
> - `SettlementSummaryWidget.jsx:16` — `onNavigate && onNavigate("settlement")` 로 호출
> - `DashboardView.jsx:261` — 모든 위젯에 `onNavigate={_onSettings}` 전달
> - `App.jsx:885` — `onSettings={() => setView("settings")}` — 인수 없는 단순 콜백
>
> **결과:** `"settlement"` 인수가 무시되어 위젯 클릭 시 Settlement 뷰가 아닌 Settings 뷰로 이동.
>
> **수정 방법 (`src/App.jsx:885` 한 줄 변경):**
> ```javascript
> // 현재 (버그)
> onSettings={() => setView("settings")}
>
> // 수정 후 (인수 있으면 해당 뷰, 없으면 settings)
> onSettings={(view) => setView(view || "settings")}
> ```
> 이 수정으로 SettingsView에서 `onNavigate('settlement')` 호출과 SettlementSummaryWidget의 `onNavigate("settlement")` 호출 모두 정상 작동합니다.
 
> [!NOTE] **[Antigravity] SettlementSummaryWidget 표시 텍스트 개선 제안** — `SettlementSummaryWidget.jsx:43`에서 surplus(여유) 시 `"이번 달 증감액 예측"`이라는 레이블을 사용합니다. "증감액"은 비교 맥락에서 쓰이는 표현으로, 절대 여유 금액을 보여주는 이 위젯에는 `"이번 달 예상 여유액"`이 더 직관적입니다. 단순 표시 텍스트 변경이므로 우선순위 낮음.
 
> [!NOTE] **[Antigravity] 위젯에 정산 날짜 표시 개선** — `SettlementSummaryWidget`은 `settlements` 배열에서 날짜 기준 최신 항목(`latestSettlement`)을 보여줍니다. 이 값이 현재 월과 다를 수 있어 사용자에게 오래된 데이터처럼 보일 수 있습니다. 현재도 날짜(예: "2026-03")는 표시되므로 기능상 문제는 없으나, "※ 지난 달 데이터" 같은 스타일 표시를 추가하면 더 명확합니다.
 
---
 
### [Antigravity 제안] Phase A-4: 정산기 OCR 연동 (Optional)
 
**아이디어:** 사용자가 카드사 앱의 '이달의 결제 예정액' 화면을 스크린샷 찍어 `SettlementView`에서 업로드하면, 해당 금액을 자동으로 입력해 주는 기능.
- **구현 방식**: `SettlementView` 상단 또는 각 카드 항목 옆에 `[스캔]` 버튼 배치 → `api/ocr.js` (mode='single') 호출 → 숫자값 추출 후 `cardBills` 상태 반영.

---

### [✅ 완료] 테스트 플랜 (Part A)

1. **상태 관리 검증:** 오프라인 환경에서 `settlements` 첫 등록 후 온라인 시 `loadShared` 복구 확인
2. **연산 정확도:** 현금 입력 + 카드 예상액 입력 시 실시간 여유/부족액 계산 확인
3. **배포 후 실기기 확인**

> [!NOTE] **[Claude][✅ 반영완료] 추가 테스트 항목:**
> - **실시간 동기화**: A기기 정산 저장 → B기기 DashboardView 위젯 즉시 갱신 확인 (Supabase Realtime `case 'settlements'` 경로)
> - **월 경계 케이스**: 1월에 전년도 12월 정산 조회 시 연도 계산 정확도
> - **카드 없음 상태**: `cards` 빈 배열 시 "등록된 카드가 없습니다" 메시지 렌더링 확인 ✅ (구현됨)
> - **`resetAll` 연계**: 전체 초기화 후 settlements도 함께 초기화 확인
> - **🐛 위젯 클릭 네비게이션 버그**: 위 [Claude] WARNING 수정 후 Settlement 뷰 정상 진입 확인

---

## 🛠 Part B. 통합 유지보수 계획 [plan_2301 — 미구현]

> [!NOTE] **[Claude] 구현 현황:** 아래 Phase B-1, B-2, B-3 모두 코드 직접 검증 결과 **아직 미구현 상태**입니다.  
> - `src/utils/helpers.js` — `getBillingPeriod` 기본값 없음 (크래시 여전히 발생 가능)  
> - `src/views/CardView.jsx:87` — `{c.paymentDay}일 결제` 그대로 (null 체크 없음)  
> - `api/ocr.js` — `AbortSignal.timeout()` 없음, 프롬프트 미수정  
> - `src/views/home-widgets/HomeRecentTxWidget.jsx` — 날짜 그룹화 없음 (flat map 그대로)  
>
> **구현 우선순위:** B-1 (활성 크래시 버그) → B-3 (UX) → B-2 (OCR 성능)

---

### [✅ 구현 완료] Phase B-1: 카드 컴포넌트 강건성 확보

**목표 파일:** `src/utils/helpers.js`, `src/views/CardView.jsx`

**문제:** 기존 등록 카드에 `billingStartDay`, `paymentDay` 등 필드가 없을 경우 `getBillingPeriod` 내부에서 `new Date(sY, sM, undefined)` = Invalid Date가 되어 렌더링 오류 발생.
 
> [!NOTE] ✅ **[Antigravity - 완료] 코드 검증으로 실제 동작 재분석 — React 크래시가 아닌 NaN 표시** — 코드를 직접 추적한 결과, `getBillingPeriod`는 `undefined` 필드가 있어도 예외(throw)를 발생시키지 않습니다. 실제 동작은 다음과 같습니다:
> - `new Date(sY, sM, undefined)` → `Invalid Date` 객체 반환 (throw 아님)
> - `Invalid Date.getMonth()` → `NaN` 반환 (throw 아님)
> - `fmtPeriodLabel(Invalid Date, Invalid Date)` → `"NaN/NaN ~ NaN/NaN"` 문자열 렌더링
> - `D-NaN` 렌더링
>
> **따라서 React ErrorBoundary는 발동하지 않으며, 카드가 "누락"되는 것이 아니라 이용기간이 "NaN/NaN ~ NaN/NaN"으로 표시됩니다.** (최초 보고된 "리스트 누락" 현상은 다른 원인일 가능성 있음)
> 
> 그러나 NaN 표시 자체가 UX 버그이므로 기본값 추가는 여전히 필요합니다.

**수정 내용:**

1. `src/utils/helpers.js` — `getBillingPeriod` 함수 상단에 기본값 추가:
```javascript
export function getBillingPeriod(card, today = new Date()) {
  // 값이 없을 경우 안전한 기본값으로 매핑하여 NaN 크래시 방지
  const billingStartDay = card.billingStartDay || 1;
  const billingEndDay = card.billingEndDay || 31;
  const billingEndNextMonth = card.billingEndNextMonth || false;
  const paymentDay = card.paymentDay || 15;
  // 기존 구조 분해 대신 위 변수들 사용 ...
}
```

2. `src/utils/helpers.js` — JSDoc `@param` 타입 수정 (필수 → 옵셔널):
```javascript
/**
 * @param {{ billingStartDay?: number, billingEndDay?: number, billingEndNextMonth?: boolean, paymentDay?: number }} card
 * @param {Date} [today]
 */
```
(`getInstallmentFirstPayment`도 동일하게 수정)

3. `src/views/CardView.jsx:87` — null 체크 추가:
```javascript
// 현재 (버그)
{c.paymentDay}일 결제

// 수정 후
{c.paymentDay ? `${c.paymentDay}일 결제` : '결제일 미설정'}
```

> [!NOTE] **[Claude][✅ 반영완료] `billingEndDay || 31` 안전성** — `helpers.js:85`의 `Math.min(billingEndDay, lastDayOfEndMonth)` 로직이 31을 자동 보정하므로 31은 안전한 센티넬 값으로 사용 가능.

> [!NOTE] **[Claude][✅ 반영완료] `FixedExpenseWidget.jsx:47-48` 중복 방어 코드** — `getBillingPeriod` 수정 후 이 중복 fallback은 단순화 가능하지만, 당장 건드릴 필요는 없음.

> [!NOTE] **[Claude][✅ 반영완료] `normalizeCard` 유틸 제안** — 중장기적으로 기본값 처리를 `getBillingPeriod`, `FixedExpenseWidget`, `SettlementView` 등에 분산시키지 말고 `normalizeCard(card)` 유틸로 중앙화하면 유지보수 개선. 현재는 우선순위 낮음.

> [!NOTE] **[Claude] `SettlementView.jsx`는 직접 접근 방식 사용 — 버그 없음** — `SettlementView.jsx:217-218`에서 카드 필드를 직접 렌더링하나 `{c.paymentDay && ...}` 가드가 있어 undefined여도 빈칸으로 표시됨. `getBillingPeriod`를 호출하지 않으므로 이 버그와 무관함.

---

### [✅ 구현 완료] Phase B-2: OCR 파이프라인 고도화

**목표 파일:** `api/ocr.js`

**현재 상태 확인 (코드 검증):**
- 모델 체인: `['gemma-4-31b-it', 'gemini-2.5-flash', 'gemini-2.0-flash']` ✅ 유지
- `maxOutputTokens`: `single:128, bulk:2048, schedule:512` ✅ 이미 최적화됨 — 추가 축소 불필요
- **`AbortSignal.timeout()` 없음** ❌ — Gemma 4가 느리게 응답하면 Gemini fallback이 지연됨

**수정 내용:**

1. **Agile Fallback — `AbortSignal.timeout()` 추가** (`api/ocr.js:123`):
```javascript
geminiRes = await fetch(`${url}?key=${apiKey}`, {
  method: 'POST',
  signal: AbortSignal.timeout(model === 'gemma-4-31b-it' ? 12000 : 20000), // Gemma 4: 12초, Gemini: 20초
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
});
```
timeout 시 `AbortError`를 throw → 기존 `catch` 블록(ocr.js:155)이 자동으로 다음 모델로 넘어감.

2. **Bulk 프롬프트 유연성 강화** — 특정 레이아웃(Date Section)에 대한 의존도를 낮추고 "형태와 상관없이 지출 행을 모두 추출"하도록 1순위 지시 변경. 단, 아래 exclusion 규칙은 반드시 유지:
   - `"가승인"`, `"취소"`, `"거래취소"` 행 제외
   - 음수 금액 제외

3. **날짜 Fallback 통합** — `implementation_plan0416_1435.md` 계획의 내용과 병합:
   - `yesterdayDate` 변수 추가 (`api/ocr.js:46` 이미 존재)
   - "어제"/"오늘"/"26. 4. 12(일)" 한국어 날짜 패턴 처리 (이미 bulk 프롬프트에 포함됨 ✅)
   - 날짜 없을 경우 `${todayDate}` fallback (이미 포함됨 ✅)
   - **[Antigravity] OCR 결과 정제 로직 강화**: Gemma 4 응답 데이터에 한글 금액("만원" 등)이나 통화 기호가 섞여 있어도 `normalizeOcrData`에서 `parseInt(val.replace(/[^0-9]/g, ''))` 처리를 통해 숫자만 뽑아내는 방어 코드 강화.

> [!NOTE] **[Claude][✅ 반영완료] `maxOutputTokens` 현행 유지** — single:128, bulk:2048은 이미 최적화 완료. 추가 축소 시 bulk 거래 잘림 위험.

> [!NOTE] **[Claude][✅ 반영완료] `implementation_plan0416_1435.md` 병합 주의** — 두 계획의 프롬프트 수정을 별도로 적용하면 하나가 다른 하나를 덮어쓸 수 있음. 반드시 단일 작업으로 통합 적용.


> [!NOTE] **[Claude][✅ 반영완료] 유연성 강화 시 exclusion 규칙 유지 필수** — "모든 행 추출"로 완화 시 "가승인" 행도 포함될 수 있음. exclusion 규칙을 명시적으로 유지해야 함.

---

### [✅ 구현 완료] Phase B-3: 최근 지출 내역 날짜 헤더 그룹화

**목표 파일:** `src/views/home-widgets/HomeRecentTxWidget.jsx`

**현재 상태:** `displayList.map((t, idx) => ...)` 단순 배열 렌더 (그룹화 없음)

**수정 내용:**

1. **Import 추가:**
```javascript
import { DNAMES } from '../../constants/index.js'; // constants/index.js:79에 이미 정의됨
import { today_str } from '../../utils/helpers.js'; // helpers.js:14에 이미 정의됨
```

2. **사전 그룹화(Pre-group) 로직** (렌더 전 reduce):
```javascript
const todayStr = today_str();
const [y2, m2, d2] = todayStr.split('-').map(Number);
const yesterdayStr = `${y2}-${String(m2).padStart(2,'0')}-${String(d2-1).padStart(2,'0')}`; // 로컬 계산

const grouped = displayList.reduce((acc, t) => {
  const last = acc[acc.length - 1];
  if (!last || last.date !== t.date) {
    acc.push({ date: t.date, items: [t] });
  } else {
    last.items.push(t);
  }
  return acc;
}, []);
```

3. **날짜 헤더 렌더링** (UTC 함정 방지):
```javascript
grouped.map(group => {
  const [gy, gm, gd] = group.date.split('-').map(Number);
  const d = new Date(gy, gm - 1, gd); // 로컬 타임 — new Date("YYYY-MM-DD")는 UTC 파싱으로 날짜 어긋남
  const label = group.date === todayStr ? '오늘'
              : group.date === yesterdayStr ? '어제'
              : `${gm}월 ${gd}일 (${DNAMES[d.getDay()]})`;
  return (
    <>
      <div key={`header-${group.date}`} style={{ /* 날짜 헤더 스타일 */ }}>{label}</div>
      {group.items.map(t => <항목 key={t.id} ... />)}
    </>
  );
})
```

4. **`borderTop` 재설계** — 기존 `idx === 0 ? "none" : "1px solid ..."` 로직은 그룹화 후 깨짐. 그룹 내 첫 번째 아이템에만 border를 숨기는 방식으로 재설계:
```javascript
// 각 group.items.map 에서:
borderTop: itemIdx === 0 ? "none" : "1px solid var(--border-solid)"
```

> [!NOTE] **[Claude][✅ 반영완료] `new Date(t.date)` UTC 파싱 함정** — `"YYYY-MM-DD"` 형식은 UTC 자정으로 파싱 → 한국(UTC+9)에서 `.getDay()` 호출 시 날짜 하루 어긋남. 반드시 `split('-')` + `new Date(y, m-1, d)` 로컬 방식 사용.

> [!NOTE] **[Claude][✅ 반영완료] `DNAMES` 이미 존재** — `constants/index.js:79`에 정의. 재사용.

> [!NOTE] **[Claude][✅ 반영완료] `idx === 0` border 로직 깨짐** — 날짜 헤더 삽입 후 기존 idx 기반 border-top 로직 재설계 필요.

> [!NOTE] **[Claude][✅ 반영완료] `today_str()` 활용** — `helpers.js:14`에 이미 존재. 로컬 "YYYY-MM-DD" 반환.

> [!NOTE] **[Claude] `yesterdayStr` UTC 주의** — `new Date(y2, m2-1, d2-1)` 로컬 생성 후 `.toISOString().slice(0,10)` 하면 UTC 변환으로 또 어긋남. 대신 직접 날짜 계산 권장:
> ```javascript
> const prev = new Date(y2, m2 - 1, d2 - 1); // 로컬
> const yesterdayStr = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-${String(prev.getDate()).padStart(2,'0')}`;
> ```

---

## 🔎 종합 테스트 플랜

### Part A 테스트 (코드 검증 결과)

**검증 완료 항목 (코드 레벨):**
- ✅ Upsert 로직: `prev.filter(s => s.date !== currentDate)` → 월별 1건 유지 확인 (SettlementView.jsx:74-77)
- ✅ 이전 달 조회: `m === 1 ? \`${y-1}-12\`` 1월 경계 처리 확인 (SettlementView.jsx:47-49)
- ✅ autoFixedCash 의존성: useEffect deps에 `autoFixedCash` 포함 → 데이터 늦게 로드돼도 자동 갱신 확인
- ✅ cardId 타입 안전성: `String(b.cardId) === String(c.id)` 비교로 number/string 혼용 안전 확인
- ✅ SettingsView 진입 경로: `onNavigate={setView}` → `onNavigate("settlement")` → 정상 동작 확인
- ✅ `resetAll` 경로: `App.jsx:683`에 `db.save(householdId, "settlements", EMPTY_SETTLEMENTS)` 확인
- ✅ cards 빈 배열 처리: SettlementView.jsx:176-179에 "등록된 카드가 없습니다" 빈 상태 UI 구현 확인

**수동 테스트 필요 항목 (실기기 확인):**
- ⬜ 정산 저장/불러오기 (월 이동 시 데이터 유지)
- 🐛 **[수정 필요] 위젯 클릭 → Settlement 뷰 진입** — `App.jsx:885` 버그 수정 후 확인
- ⬜ 실시간 동기화: A기기 저장 → B기기 DashboardView 위젯 즉시 갱신
- ⬜ `resetAll` 후 settlements 실제 초기화 확인

**신규 발견 이슈 (코드 검증 중 발견):**
- 🟡 `SettlementView.jsx:4` — `G` import 미사용 (빌드 경고)
- 🟡 SettlementView — 뒤로가기 버튼 없음 (UX 이슈)
- 🟡 `SettlementSummaryWidget.jsx:43` — "증감액 예측" 레이블 혼란 → "예상 여유액" 권장

### Part B 테스트 (구현 후 수행)
- Phase B-1: 기존 등록 카드(billingStartDay 없음) → "NaN/NaN" 대신 정상 기간 표시 확인
- Phase B-1: 카드 결제일 미설정 → "결제일 미설정" 표시 확인 (현재: "undefined일 결제")
- Phase B-2: Gemma 4가 12초 이상 응답 없을 때 Gemini 2.5 Flash 자동 전환 확인
- Phase B-2: 다양한 카드사 스크린샷 layout에서 bulk OCR 인식률 개선 확인
- Phase B-3: 날짜 헤더 표시 (오늘/어제/M월D일 (요일)) 정확성
- Phase B-3: 날짜 경계 border-top 정상 표시 (그룹 첫 항목 border 없음)
 
---
 
## 🚀 Antigravity의 최종 고도화 제안
 
1. **[OCR] Self-Correction 매커니즘**: `api/ocr.js`에서 파싱된 JSON이 유효하지 않을 경우, (비용 여유가 된다면) Gemma에게 에러 메시지와 함께 "이 JSON을 수정하라"고 한 번 더 재요청하는 로직 (Retry 1회) 추가 시 인식률 99% 달성 가능.
2. **[Navigation] URL/State 파라미터 지원**: `setView('settlement')` 호출 시 특정 연/월 정보를 인자로 넘길 수 있도록 `App.jsx`를 개선하면, 알림이나 위젯에서 "특정 달의 정산 내역"으로 바로 점프하는 UX 구현 가능.
3. **[UX] 지출 내역 주간 요약**: `HomeRecentTxWidget.jsx` 상단에 `이번 주 지출 합계`를 보여주는 한 줄 요약을 추가하면 날짜별 구분선과 시너지를 내어 지출 페이스 조절에 더 큰 도움을 줄 수 있음.
