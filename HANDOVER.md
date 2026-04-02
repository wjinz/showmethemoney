# 가계부 프로젝트 핸드오버 문서
> 작성일: 2026-04-02 | 담당: 안티그래비티 세션

---

## 1. 프로젝트 개요

**커플 가계부 앱** — React 18 + Vite 프론트엔드, Supabase 실시간 동기화, Vercel 배포.
남편/아내 두 사람이 6자리 `householdId`로 연결되어 지출을 공유 관리한다.

- **배포 URL**: Vercel (자동 배포, main 브랜치 push 시 반영)
- **Supabase**: anon key + householdId 기반 행 수준 격리
- **API 키 보안**: `ANTHROPIC_API_KEY`는 Vercel 환경 변수에만 설정 (브라우저 노출 없음)

---

## 2. 기술 스택

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 18 + Vite (JSX 확장자 필수) |
| 데이터베이스 | Supabase (실시간 구독) |
| 차트 | recharts |
| 엑셀 파싱 | xlsx (SheetJS) v0.18.5 |
| AI | Anthropic API (claude-haiku-4-5 / claude-opus-4-5) |
| 서버리스 | Vercel Functions (`/api/` 폴더) |
| 스타일 | CSS-in-JS (inline + globalStyles.js) |

---

## 3. 폴더 구조

```
budget-v2/
├── api/
│   ├── ocr.js             # 영수증 OCR (claude-opus-4-5, 이미지 → {amount, cat, memo})
│   └── budget-ai.js       # AI 예산 자동 배분 (claude-haiku, 급여 → 카테고리별 예산)
├── src/
│   ├── App.jsx            # 루트 컴포넌트, 전역 상태 관리
│   ├── constants/
│   │   └── index.js       # CATS, INIT_BUDGETS, DAY, MONTH, YEAR 등
│   ├── styles/
│   │   └── globalStyles.js
│   ├── utils/
│   │   ├── supabase.js    # db.loadAll / db.save / db.subscribe
│   │   ├── ocr.js         # /api/ocr 호출 래퍼
│   │   ├── helpers.js     # fmtS, toDateStr 등
│   │   └── export.js
│   ├── components/
│   │   ├── Nav.jsx        # 하단 네비게이션
│   │   ├── InputModal.jsx # 지출 입력 모달 (OCR + 날짜 선택 포함)
│   │   ├── TxEditModal.jsx# 지출 수정/삭제 모달 (공유 컴포넌트)
│   │   ├── SliderRow.jsx
│   │   └── UI.jsx         # Card, Ring, Bar, Chip, SectionHeader
│   └── views/
│       ├── HomeView.jsx       # 홈 (예산 현황 + 이 속도면 카드 + 급여/카드한도 카드)
│       ├── EntryView.jsx      # 지출 입력 (OCR, 날짜 선택, 수정 기능)
│       ├── ReportView.jsx     # 리포트 탭 컨테이너 (6개 탭)
│       ├── CalendarView.jsx   # 캘린더 (날짜별 지출, 탭 클릭 수정)
│       ├── DataImportView.jsx # 신용카드 엑셀 업로드 & 분석
│       ├── PlanView.jsx       # 재무계획 5단계 위저드
│       ├── TaxOptimizerView.jsx
│       ├── PredictionView.jsx
│       ├── FixedView.jsx
│       ├── AssetView.jsx
│       └── SettingsView.jsx
```

---

## 4. 전역 상태 구조 (App.jsx)

모든 공유 데이터는 Supabase에 저장되며, 실시간 구독으로 두 기기 간 동기화된다.

```js
// Supabase 동기화 데이터 (plan.salary 포함 모두 공유)
tx        // 지출 내역 배열: [{id, date, who, amount, cat, memo, payMethod, cardId}]
fixed     // 고정비 배열
install   // 할부 배열
cards     // 카드 배열
assets    // 자산 배열
plan      // 재무계획 객체 (하단 참조)
budgets   // 카테고리별 예산 {food, housing, education, transport, medical, culture, clothing, sub, etc}
names     // {husband: "남편", wife: "와이프"}
taxConfig // 연말정산 설정

// 로컬(localStorage)만 저장
sliderCfg // 슬라이더 설정
theme     // "dark" | "light"
householdId
myRole    // "husband" | "wife"
```

### plan 객체 주요 필드

```js
plan = {
  // HomeView에서 설정하는 급여
  salary: {
    husband: 3000000,      // 남편 월 실수령액
    wife: 2800000,         // 아내 월 실수령액
    savingsTarget: 500000, // 월 저축 목표
  },

  // PlanView IncomeTab에서 설정 (plan.salary와 중복될 수 있음 — 향후 통합 필요)
  monthlyIncome: 5800000,
  yearSavingGoal: 6000000,
  monthlyFixedTotal: 1200000,

  // DataImportView에서 카드 분석 후 저장
  importedAnalysis: {
    total, count, byMonth, byCat, avgMonthly, topMerchants, months,
    catBudgetSuggestions: { food: 450000, ... }
  },

  // PlanView EventsTab
  events: [{ title, amount, month, cat }],
}
```

---

## 5. 카테고리 정의

```js
// src/constants/index.js
CATS = [
  { id:"food",      label:"식비",      icon:"🍽", color:"#d4845a" },
  { id:"housing",   label:"주거/관리",  icon:"🏠", color:"#d4b84a" },
  { id:"education", label:"교육",      icon:"📚", color:"#9b7ee0" },
  { id:"transport", label:"교통",      icon:"🚇", color:"#5c8de8" },
  { id:"medical",   label:"의료",      icon:"💊", color:"#4dab87" },
  { id:"culture",   label:"문화/여가", icon:"🎬", color:"#4dccd4" },
  { id:"clothing",  label:"의류",      icon:"👗", color:"#d97fa8" },
  { id:"sub",       label:"구독",      icon:"📱", color:"#7dd47a" },
  { id:"etc",       label:"기타",      icon:"📦", color:"#6a6560" },
]
```

---

## 6. 이번 세션에서 추가/변경된 기능

### 6-1. HomeView — "이 속도면 월말에?" 카드
- 현재 일평균 지출 페이스로 월말 잔여 예산 예측
- 진행 게이지 (초록/노랑/빨강 색상)
- 슬라이더 시나리오 카드와 함께 표시

### 6-2. HomeView — 급여 & 카드 한도 카드
- `plan.salary` 에 저장 (husband, wife, savingsTarget)
- **핵심 지표**: 이번달 카드 사용 가능액 = 급여 - 고정비 - 할부 - 저축목표
- 게이지 바 (70% 미만 초록 / 90% 미만 노랑 / 초과 빨강)
- 저축률 % 추정 (월말 페이스 기반)
- 다음달 카드 청구 예정액 (이번달 `payMethod: "card"` 합계)
- 급여 미입력 시 안내 화면 → 입력 폼 팝업

### 6-3. ReportView — 📁 데이터 탭 추가
- `DataImportView` 연결
- 탭 순서: 📊 리포트 | 📅 캘린더 | 📁 데이터 | 🎯 계획 | 💸 연말정산 | 🔮 예측

### 6-4. DataImportView (신규)
- 신용카드 엑셀/CSV 드래그앤드롭 업로드
- SheetJS로 파싱, 한국 카드사 컬럼 자동 감지 (일자/이용금액/가맹점)
- 카드사별 안내 (KB, 신한, 삼성, 현대)
- 분석 결과: 월별 BarChart, 카테고리별 비율, 상위 가맹점
- "재무계획에 반영하기" → `plan.importedAnalysis` 저장

### 6-5. PlanView — 5단계 재무계획 위저드 (전면 재설계)
1. **기준 데이터**: 카드 분석 결과 표시 (없으면 데이터 탭 안내)
2. **수입/저축**: 월 실수령액 + 연간 저축 목표 → 월 가용 예산 계산
3. **카테고리 예산**: AI 추천 + 카드 데이터 기반 자동 채우기 + 수동 조정
4. **연간 이벤트**: 큰 지출 계획 (여행, 경조사 등)
5. **플랜 요약**: 재정 건강 점수(0~100) + 개인화 조언

### 6-6. AI 예산 자동 배분 (`api/budget-ai.js`)
- 모델: `claude-haiku-4-5-20251001` (비용 효율)
- 입력: 총급여, 고정비, 할부, 저축목표, 최근 3개월 카테고리별 평균 지출
- 출력: `{budgets: {food:..., ...}, reasons: {food:"이유",...}, tip:"전체 조언"}`
- BudgetTab에서 "추천받기" → 결과 비교 화면 → "전체 적용"

### 6-7. 지출 수정 기능 (TxEditModal)
- EntryView, CalendarView 양쪽에서 지출 항목 클릭 → 수정 모달
- 2단계 삭제 확인 (정말 삭제? → 확인)

---

## 7. 알려진 이슈 및 TODO

### 우선 해결 필요
| 항목 | 내용 |
|------|------|
| `plan.salary` vs `plan.monthlyIncome` 중복 | HomeView는 `plan.salary`를 쓰고 PlanView IncomeTab은 `plan.monthlyIncome`을 별도 사용. 두 값이 다를 수 있어 통합 필요. 권장: `plan.salary`를 단일 소스로 통일하고 IncomeTab을 plan.salary 읽도록 수정 |
| DataImportView 카드 취소 거래 필터링 | 현재 `cancelIdx` 컬럼 감지로 처리하나 카드사마다 취소 표기 방식이 달라 일부 누락 가능 |

### 향후 개선 아이디어 (우선순위 순)
1. **월별 급여 이력** — 매월 급여가 다를 수 있으므로 월별 급여 기록 기능
2. **카드 결제일 설정** — 카드별 결제일 입력 → "N일 후 X만원 청구 예정" 알림
3. **예산 초과 알림** — 카테고리별 80% 도달 시 앱 내 경고
4. **홈 위젯 강화** — 카드 한도 잔여액을 위젯에 표시
5. **연월 전환** — 현재 이번달만 표시. 과거 달 조회 기능

---

## 8. Vercel 환경 변수 설정 (필수)

Vercel 대시보드 → Settings → Environment Variables:

| 변수명 | 값 | 비고 |
|--------|-----|------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | VITE_ 접두사 없이 설정 (서버 전용) |
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 브라우저 노출 OK |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 브라우저 노출 OK |

---

## 9. 개발 & 배포 가이드

```bash
# 로컬 개발
npm run dev

# 배포 (Vercel 자동 배포)
git add .
git commit -m "커밋 메시지"
git push
```

> ⚠️ `npm run build`는 VM 환경(ARM64)에서 rollup 오류 발생 가능. Vercel 서버에서는 정상 빌드됨.

---

## 10. 주요 패턴 & 코딩 컨벤션

```jsx
// 날짜: 항상 동적 계산 (모듈 로드 시점 고정 금지)
const nowStr = () => toDateStr(new Date()); // ✅
const today  = TODAY_STR;                   // ❌ 모듈 로드 시 고정됨

// Supabase 저장: setShared 래퍼 사용
const setTx = useCallback(v => setShared("tx", typeof v === 'function' ? v(tx) : v, setTxRaw), [tx, setShared]);

// 지출 수정 패턴
const editTx = useCallback((id, updates) =>
  setTx(ts => ts.map(t => t.id === id ? {...t, ...updates} : t)), [setTx]);

// Vercel API 호출 (항상 /api/ 경로로)
const resp = await fetch("/api/budget-ai", { method: "POST", ... });

// JSX 파일 확장자는 반드시 .jsx (vite 설정)
```

---

## 11. 사용자 컨텍스트

- **사용자**: 부부 (남편 + 아내), 한국어 UI
- **지출 패턴**: 신용카드 중심 (현금 거의 없음)
- **카드 정산 흐름**: 이번달 카드 사용 → 다음달 급여에서 결제
- **개발 숙련도**: 초보 — 항상 단계별로 명확한 가이드 제공 필요
- **배포**: git push만 하면 자동 배포 (Vercel)
