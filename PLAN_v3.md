# 💎 budget-v2 추가 개발 계획서 (v3.0)

> 작성일: 2026-04-03
> 기반 문서: PLAN.md (Claude 초안) + plan_v2.md (Antigravity v2 보완)
> v3 변경사항: 두 문서 완전 병합, 구현 상태 갱신, 로드맵 재구성

---

## 목차

1. [현재 코드베이스 상태 요약](#1-현재-코드베이스-상태-요약)
2. [개발 단계 개요 (로드맵)](#2-개발-단계-개요-로드맵)
3. [Phase 0 — 즉시 수정 (버그 패치)](#3-phase-0--즉시-수정-버그-패치)
4. [Phase 1 — 데이터 정합성 확보](#4-phase-1--데이터-정합성-확보)
5. [Phase 2 — 보안 및 안정성 강화](#5-phase-2--보안-및-안정성-강화)
6. [Phase 3 — 아키텍처 및 DX 개선](#6-phase-3--아키텍처-및-dx-개선)
7. [Phase 4 — 성능 최적화](#7-phase-4--성능-최적화)
8. [Phase 5 — UX 기능 확장 및 디자인 고도화](#8-phase-5--ux-기능-확장-및-디자인-고도화)
9. [작업 전 필수 확인사항 (Supabase / Vercel)](#9-작업-전-필수-확인사항)
10. [파일별 수정 체크리스트](#10-파일별-수정-체크리스트)
11. [핵심 패턴 부록](#11-핵심-패턴-부록)

---

## 1. 현재 코드베이스 상태 요약

### 아키텍처 핵심 패턴

```
사용자 액션
  → View 컴포넌트 (setTx 등)
  → App.jsx의 setShared 래퍼
    ├─ rawSetter(value)        즉시 React State 반영 (낙관적 업데이트)
    └─ db.save(hid, key, val)  비동기 Supabase upsert
  → Supabase household_data 테이블
  → Realtime broadcast → 파트너 기기 동기화
```

**핵심 설계 원칙**: `setShared`가 UI 반응성과 DB 동기화를 동시에 처리하는 유일한 통로.
모든 전역 상태 변경은 반드시 이 래퍼를 통해야 한다.

### 전역 상태 키 목록 (Supabase `key` 컬럼 기준)

| key | 타입 | 담당 화면 |
|-----|------|----------|
| `tx` | Array | EntryView, HomeView, CalendarView |
| `fixed` | Array | FixedView |
| `install` | Array | FixedView, PlanView SummaryTab |
| `cards` | Array | FixedView, TxEditModal, EntryView, CalendarView |
| `assets` | Array | AssetView |
| `budgets` | Object | SettingsView, ReportView |
| `names` | Object | SettingsView, 전체 |
| `plan` | Object | HomeView, PlanView, DataImportView |
| `taxConfig` | Object | TaxOptimizerView |

### v2 기준 구현 상태 현황

> Antigravity v2 리서치를 통해 아래 상태로 업데이트됨.

| Task | 상태 | 상세 |
|:-----|:----:|:-----|
| **Task 0-1** (날짜 버그) | ✅ 완료 | `constants/index.js`의 `YEAR`/`MONTH`/`DAY` 정적 상수를 `getYear()`/`getMonth()`/`getDay()` 함수형으로 전환. 모든 View 파일에서 함수 호출로 교체 완료. |
| **Task 0-2** (카드 필드) | ✅ 완료 | `CalendarView.jsx` 내 `cp.card.name` / `cd.name` → `cp.card.label` / `cd.label`로 전체 수정 완료. |
| **Task 0-3** (install.paid) | ✅ 완료 | `PlanView.jsx` SummaryTab `.filter(i => !i.paid)` → `.filter(i => (i.paidMonths||0) < (i.months||1))` 수정 완료. |
| **Task 1-1** (plan.salary) | ✅ 완료 | `App.jsx` 초기 로드 시 `plan.monthlyIncome` → `plan.salary` 마이그레이션 로직 추가. `PlanView` IncomeTab `plan.salary.*`에서 직접 읽도록 전환. |
| **Task 1-2** (monthlyFixedTotal) | ✅ 완료 | `PlanView` IncomeTab에서 `fixed`+`install` props로 `useMemo` 실시간 계산 전환. |
| **Task 1-3** (InputModal plan prop) | ✅ 완료 | `App.jsx`에서 `InputModal`에 `plan` prop 정상 전달 확인. |
| **Task 2-1** (Supabase 자격증명) | ✅ 완료 | `supabase.js` 하드코딩 폴백 제거, env var 미설정 시 에러 throw 추가. |
| **Task 2-4** (validate.js) | ✅ 완료 | `src/utils/validate.js` 신규 생성. cards/tx/fixed/install 스키마 검증. |
| **Task 2-5** (setShared retry) | ✅ 완료 | `App.jsx` `setShared`에 지수 백오프 3회 재시도 + `validate` 호출 추가. |
| **Task 3-1** (BudgetContext) | ✅ 완료 | `src/context/BudgetContext.jsx` 신규 생성 + `App.jsx` Provider 래핑 완료. |
| **Task 3-2** (THEME_TOKENS) | ✅ 완료 | `src/styles/tokens.js` 신규 생성. spacing/radius/shadow/color/font 토큰 정의. |
| **Task 3-3** (NumPad) | ✅ 완료 | `src/components/NumPad.jsx` 신규 생성. THEME_TOKENS 활용. |
| **Task 3-4** (데드코드/keyframe) | ✅ 완료 | `HomeView.jsx` `recent` 데드코드 제거. `globalStyles.jsx`에 `spin`/`fadeIn` keyframe 추가. |
| **Task 4-1** (useMemo) | ✅ 완료 | `HomeView.jsx`, `ReportView.jsx`, `PlanView.jsx` SummaryTab tx 연산에 `useMemo` 적용 완료. |
| **데이터 결합도** | 🟡 진행중 | BudgetContext Provider 도입 완료. 기존 View들의 점진적 전환은 Phase 5에서 계속. |

### 버그 심각도 현황

| 등급 | 건수 | 대표 증상 |
|------|------|----------|
| 🔴 Critical (P0) | ~~2건~~ **0건** | ✅ 모두 해결됨 |
| 🟡 Warning (P1) | ~~3건~~ **0건** | ✅ 모두 해결됨 |
| 🟢 Minor (P2) | ~~2건~~ **0건** | ✅ 모두 해결됨 |

---

## 2. 개발 단계 개요 (로드맵)

> **v3 재구성 방침**: Antigravity v2의 핵심 조언을 반영하여, Phase 3(아키텍처 개선)을 UX 기능 확장보다 선행한다. 기반이 정리된 상태에서 기능을 올리는 것이 장기 개발 속도를 높이는 길이다.

```
Phase 0  ──  버그 패치 (P0 Critical)           즉시, 1~2일
   │
Phase 1  ──  데이터 정합성 확보               Phase 0 완료 후, 2~3일
   │
Phase 2  ──  보안 및 안정성 강화              Phase 1과 병행 가능, 1~2일
   │
Phase 3  ──  아키텍처 및 DX 개선 ★           안정화 후 기능 전에 먼저, 3일
   │
Phase 4  ──  성능 최적화 ★                   Phase 3 완료 후, 2일
   │
Phase 5  ──  UX 기능 확장 및 디자인 고도화    기반 완료 후 진행, 1~2주
```

> ★ Phase 3·4는 기존 초안의 "Phase 3 코드 품질" / "Phase 5 스케일링"을 재분류하여 앞당긴 것.
> 기능 확장(Phase 5)은 반드시 아키텍처 정리(Phase 3) 이후에 진행한다.

---

## 3. Phase 0 — 즉시 수정 (버그 패치)

> 예상 소요: 1~2일

### Task 0-1: 정적 날짜 상수 완전 함수형 전환

**배경**: `CalendarView.jsx`의 `selDate` 초기값은 이미 수정되었으나, 문제의 근본인 `constants/index.js`가 미수정 상태다. `YEAR`, `MONTH`, `DAY`, `today_str()`이 모두 앱 로드 시점의 `NOW = new Date()`에 의존하므로, 자정이 넘어도 값이 변하지 않는다.

**수정 대상**: `src/constants/index.js`

```javascript
// ❌ 기존 — 앱 로드 시점에 고정됨
export const NOW = new Date();
export const YEAR  = NOW.getFullYear();
export const MONTH = NOW.getMonth() + 1;
export const DAY   = NOW.getDate();

// ✅ 변경 — 호출 시점의 값을 반환하는 함수로 전환
export const getYear  = () => new Date().getFullYear();
export const getMonth = () => new Date().getMonth() + 1;
export const getDay   = () => new Date().getDate();
export const toDateStr = (d) => d.toISOString().split("T")[0];
```

**영향 범위**: 프로젝트 전체에서 `YEAR`, `MONTH`, `DAY` 상수 참조를 함수 호출로 교체.

```bash
# 수정 전 영향 범위 파악
grep -rn "\bYEAR\b\|\bMONTH\b\|\bDAY\b\|today_str()" src/
```

주요 대상: `App.jsx`, `ReportView.jsx`, `PlanView.jsx`, `HomeView.jsx`, `CalendarView.jsx`.

**검증**: 시스템 시계를 23:59으로 설정 후 앱 로드 → 자정 경과 후 달력·통계 날짜가 정상 갱신되는지 확인.

---

### Task 0-2: `CalendarView.jsx` 카드 명칭 버그 수정

**배경**: `TxEditModal.jsx`는 `c.label` 수정 완료. 그러나 `CalendarView.jsx` 내 여러 위치에서 여전히 `card.name`을 참조 중.

**수정 위치**: `src/views/CalendarView.jsx` (223·241·266라인 부근)

```javascript
// ❌ 변경 전
cp.card.name   // 223라인 부근
cd.name        // 241라인, 266라인 부근

// ✅ 변경 후
cp.card.label
cd.label
```

**프로젝트 전체 점검**: `card.name` / `c.name` 패턴을 일괄 검색하여 누락 없이 처리.

```bash
grep -rn "card\.name\|c\.name\b" src/
```

**검증**: 카드가 등록된 상태에서 CalendarView의 카드 지출 내역에 카드명이 정상 표시되는지 확인.

---

### Task 0-3: `install.paid` → 실제 완납 여부 계산

**배경**: `install` 데이터 모델에 `paid` Boolean 필드가 없다. 완납 여부는 `paidMonths >= months`로 계산해야 한다.

**수정 위치**: `src/views/PlanView.jsx`, SummaryTab

```javascript
// ❌ 변경 전
.filter(i => !i.paid)   // 'paid' 필드 없음 → 필터 미동작

// ✅ 변경 후
.filter(i => (i.paidMonths || 0) < (i.months || 1))
```

**검증**: 완납된 할부가 있다면 SummaryTab 고정비 합산에서 제외되는지 확인. 수치 변화를 수정 전후 스크린샷으로 기록.

---

## 4. Phase 1 — 데이터 정합성 확보

> 예상 소요: 2~3일

### Task 1-1: `plan.salary`를 단일 진실 공급원으로 통합

**배경**: 급여 데이터가 두 필드에 이중 저장됨.

| 저장 위치 | 설정 화면 | 읽는 화면 |
|----------|----------|----------|
| `plan.salary.husband / wife / savingsTarget` | HomeView | BudgetTab, SummaryTab |
| `plan.monthlyIncome`, `plan.yearSavingGoal` | PlanView IncomeTab | IncomeTab 자체 |

**해결 방향**: `plan.salary.*`를 Single Source of Truth로 채택. `monthlyIncome`은 계산된 값(computed property)으로만 사용.

```javascript
// PlanView IncomeTab — 읽기 방식 전환
const monthlyIncome  = (plan?.salary?.husband || 0) + (plan?.salary?.wife || 0);
const savingsTarget  = plan?.salary?.savingsTarget || 0;

// IncomeTab 입력 시 plan.salary로 직접 저장
const handleIncomeChange = (who, value) => {
  setPlan(prev => ({
    ...prev,
    salary: { ...prev.salary, [who]: value }
  }));
};
```

**마이그레이션 로직** (App.jsx 초기 로드 시 1회 실행):

```javascript
// App.jsx 데이터 로드 useEffect 내부
if (plan?.monthlyIncome && !plan?.salary?.husband) {
  setPlan(prev => ({
    ...prev,
    salary: {
      husband:       prev.monthlyIncome || 0,
      wife:          0,
      savingsTarget: prev.yearSavingGoal || 0,
    }
  }));
}
```

**주의**: `plan.monthlyIncome`, `plan.yearSavingGoal` 필드는 마이그레이션 확인 후 deprecated 처리. 즉시 삭제하지 않는다.

---

### Task 1-2: `plan.monthlyFixedTotal` 실시간 계산으로 전환

**배경**: `plan.monthlyFixedTotal`을 쓰는 코드가 없어 항상 0으로 읽힘. `fixed`와 `install`이 이미 props로 전달되므로 plan에 중복 저장할 필요가 없다.

**수정 위치**: `src/views/PlanView.jsx`, IncomeTab

```javascript
// ✅ props에서 직접 계산 (useMemo로 최적화)
const monthlyFixedTotal = useMemo(() => {
  const fixedSum = (fixed || []).reduce((acc, f) => acc + (f.amount || 0), 0);
  const installSum = (install || [])
    .filter(i => (i.paidMonths || 0) < (i.months || 1)) // Task 0-3과 일관성 유지
    .reduce((acc, i) => acc + Math.round((i.totalAmount || 0) / (i.months || 1)), 0);
  return fixedSum + installSum;
}, [fixed, install]);
```

---

## 5. Phase 2 — 보안 및 안정성 강화

> 예상 소요: 1~2일 | Phase 1과 병행 가능

### Task 2-1: 하드코딩된 Supabase 자격증명 제거

**배경**: `src/utils/supabase.js`에 실제 URL과 anon key가 폴백으로 하드코딩. Git history에 영구 기록됨.

**수정 절차**:

1. Vercel 대시보드에서 환경 변수 설정 확인 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`)

2. `src/utils/supabase.js` 폴백 제거:

```javascript
// ❌ 변경 전
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     || 'https://epspmlslonvkkxorulbg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4Q2Yu0N55fGAcLwXGljgMQ_ayqEaa7q';

// ✅ 변경 후
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요.');
}
```

3. 공개 레포지터리인 경우: BFG Repo Cleaner로 git history에서 자격증명 제거.
4. Supabase 콘솔에서 anon key rotation 고려 (노출 이력 있음).

---

### Task 2-2: Supabase RLS (Row Level Security) 점검 및 강화

**배경**: 6자리 householdId만 알면 다른 가계 데이터에 API로 직접 접근 가능. RLS 미설정 시 테이블 전체 스캔 위험.

**확인**:
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables WHERE tablename = 'household_data';
```

**단기 대안**: householdId를 6자리 숫자에서 UUID v4로 전환하여 브루트포스 공격 가능성을 사실상 제거.

---

### Task 2-3: Vercel Functions 인증/레이트리밋 추가

**배경**: `/api/ocr`, `/api/budget-ai` 엔드포인트에 인증이 없어 URL 노출 시 무제한 Anthropic API 호출 가능.

**단기 방안 (공유 시크릿 헤더)**:

```javascript
// api/budget-ai.js, api/ocr.js 상단 추가
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;
if (req.headers['x-internal-secret'] !== INTERNAL_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**중기 권장 방안**: Vercel KV + Edge Middleware로 IP 기반 레이트리밋 구현.

---

### Task 2-4: 데이터 스키마 검증 (Validation) 추가 ★ 신규

**배경 (Antigravity v2 제안)**: Supabase JSONB는 스키마가 자유롭다. 이것이 `c.name` vs `c.label` 같은 런타임 오류의 구조적 원인이다. 저장 전 필드 검증 레이어를 추가하면 동일 유형의 버그를 사전 차단할 수 있다.

**방안 A — 경량 validate 함수 (빠른 적용)**:

```javascript
// src/utils/validate.js (신규)
const SCHEMAS = {
  cards: (v) => v.every(c => c.id && c.label && c.type),
  tx:    (v) => v.every(t => t.id && t.amount != null && t.date),
  // 필요 시 확장
};

export const validate = (key, value) => {
  if (!SCHEMAS[key]) return true; // 스키마 없는 키는 통과
  const ok = SCHEMAS[key](value);
  if (!ok) console.warn(`[validate] '${key}' 스키마 불일치 감지`);
  return ok;
};
```

```javascript
// App.jsx의 setShared 내부에 추가
const setShared = useCallback(async (key, value, rawSetter) => {
  validate(key, value); // 저장 전 검증 (경고만, 차단 안 함)
  rawSetter(value);
  await db.save(...);
}, [householdId]);
```

**방안 B — Zod 도입 (권장, 점진적 적용)**: `zod` 라이브러리로 타입 스키마를 선언하고 `safeParse`로 검증. 번들 크기 증가를 감안하여 점진적으로 확장.

---

### Task 2-5: `setShared` 재시도(Retry) 로직 추가

**배경**: 현재 DB 저장 실패 시 `syncStatus: "error"` 표시만 하고 재시도 로직이 없다.

```javascript
// App.jsx의 setShared — 지수 백오프 재시도 추가
const setShared = useCallback(async (key, value, rawSetter) => {
  rawSetter(value); // 낙관적 업데이트 유지
  let retries = 0;
  while (retries < 3) {
    try {
      await db.save(householdId, key, value);
      setSyncStatus("ok");
      return;
    } catch (e) {
      retries++;
      if (retries === 3) {
        setSyncStatus("error");
        console.error('[sync] 저장 실패 (3회 시도):', key, e);
      } else {
        await new Promise(r => setTimeout(r, 1000 * retries)); // 1s → 2s 백오프
      }
    }
  }
}, [householdId]);
```

---

## 6. Phase 3 — 아키텍처 및 DX 개선 ★ 신규

> 예상 소요: 3일 | 목표: Prop Drilling 제거, 코드 가독성 향상, 일관된 UI 기반 마련
> **반드시 Phase 5 UX 기능 확장 전에 완료한다.**

### Task 3-1: BudgetContext (Context API) 도입

**배경 (Antigravity v2 제안)**: 현재 `App.jsx`가 모든 View에 수십 개의 props를 전달하고 있다. 컴포넌트 트리가 깊어질수록 prop drilling 비용이 증가하며, 새 기능 추가 시마다 중간 컴포넌트도 함께 수정해야 한다.

**구조안**:

```javascript
// src/context/BudgetContext.jsx (신규)
import { createContext, useContext } from 'react';

export const BudgetContext = createContext(null);

export const useBudget = () => {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('useBudget must be used within BudgetProvider');
  return ctx;
};
```

```javascript
// App.jsx — Provider로 감싸기
<BudgetContext.Provider value={{ tx, setTx, budgets, setBudgets, plan, setPlan, names, fixed, install, cards, assets }}>
  {/* 기존 라우팅 */}
</BudgetContext.Provider>
```

```javascript
// View 컴포넌트 — props 대신 Context에서 가져오기
const { tx, plan } = useBudget();
```

**전환 전략**: 한 번에 모든 View를 변환하지 말고, Phase 3에서 신규 개발하는 컴포넌트부터 Context를 사용하고, 기존 View는 점진적으로 전환한다.

---

### Task 3-2: 디자인 시스템 토큰화 (THEME_TOKENS)

**배경 (Antigravity v2 제안)**: 전체 코드의 약 85%가 인라인 style 객체다. 렌더마다 새 객체가 생성되어 메모리 낭비가 발생하고, 색상·간격·그림자가 파일마다 제각각이라 "Premium Look" 일관성이 무너진다.

**구조안**:

```javascript
// src/styles/tokens.js (신규)
export const THEME_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius:  { sm: 8, md: 12, lg: 16, full: 9999 },
  shadow:  {
    sm: '0 1px 4px rgba(0,0,0,0.08)',
    md: '0 4px 12px rgba(0,0,0,0.12)',
    lg: '0 8px 24px rgba(0,0,0,0.16)',
  },
  color: {
    surface:   'var(--surface)',
    surfaceAlt:'var(--surface-alt)',
    text:      'var(--text)',
    textMuted: 'var(--text-muted)',
    accent:    'var(--accent)',
    danger:    'var(--danger)',
  },
};
```

**전환 전략**: 신규 컴포넌트에서 먼저 사용 → 공통 컴포넌트(NumPad, Modal 등) 전환 → 기존 View 점진 적용.

---

### Task 3-3: NumPad 공통 컴포넌트 추출

**배경**: `InputModal.jsx`, `EntryView.jsx`, `TxEditModal.jsx` 세 파일에 동일한 키패드 코드가 중복.

**신규 파일**: `src/components/NumPad.jsx`

```javascript
// src/components/NumPad.jsx
import { THEME_TOKENS as T } from '../styles/tokens'; // Task 3-2 연계

export function NumPad({ value, onChange, maxLength = 9 }) {
  const press = (v) => {
    if (v === "C")  return onChange("");
    if (v === "⌫") return onChange(value.slice(0, -1));
    if (value.length < maxLength) onChange(value + v);
  };

  const keys = ["1","2","3","4","5","6","7","8","9","C","0","⌫"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: T.spacing.sm }}>
      {keys.map(k => (
        <button key={k} onClick={() => press(k)}
          style={{ padding: T.spacing.md, fontSize: 20, borderRadius: T.radius.md }}>
          {k}
        </button>
      ))}
    </div>
  );
}
```

---

### Task 3-4: 데드 코드 정리 및 스피너 keyframe 보완

**HomeView 데드 코드 제거** (`src/views/HomeView.jsx`, line 18):

```javascript
// ❌ 제거 — 아무 곳에서도 사용되지 않는 정렬 연산
const recent = [...tx].sort((a,b)=>b.id-a.id).slice(0,4);
```

**스피너 keyframe 추가** (`src/styles/globalStyles.js`):

```javascript
export const globalCSS = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
```

`App.jsx`에서 `<style>{globalCSS}</style>` 주입 여부 확인 후 누락 시 추가.

---

## 7. Phase 4 — 성능 최적화 ★ 신규

> 예상 소요: 2일 | Phase 3 완료 후 진행 | 목표: 데이터 증가에도 부드러운 앱 경험 유지

### Task 4-1: `tx` 배열 연산 useMemo 최적화

**배경 (Antigravity v2 발견)**: `ReportView.jsx`와 `HomeView.jsx`에서 렌더링 시마다 `tx.filter()` / `tx.reduce()`를 반복 실행. tx가 수천 건이 되면 UI 버벅임이 발생한다.

**적용 대상**:

```javascript
// HomeView.jsx 예시
const thisMonthTx = useMemo(
  () => tx.filter(t => t.date?.startsWith(`${getYear()}-${String(getMonth()).padStart(2,'0')}`)),
  [tx]  // tx가 변경될 때만 재계산
);

const thisMonthSpend = useMemo(
  () => thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  [thisMonthTx]
);
```

**우선 적용 위치**: `HomeView.jsx` → `ReportView.jsx` → `PlanView.jsx` SummaryTab 순서.

---

### Task 4-2: `tx` Lazy Loading (연도별 분리 로드)

**배경 (Antigravity v2 제안)**: 현재 가구의 모든 거래를 단일 JSON 배열로 로드. 2년+ 사용 시 2,000~4,000건 예상. 초기 로딩 지연과 메모리 증가 우려.

**Supabase 저장 구조 변경안**:

```
key = "tx_2024"   ← 아카이브
key = "tx_2025"   ← 아카이브
key = "tx_2026"   ← 현재 연도 (앱 시작 시 로드)
```

**로딩 전략**:
- 앱 초기화: 현재 연도(`tx_YYYY`) 데이터만 로드
- CalendarView에서 과거 연도 이동 시: 해당 연도 데이터 lazy load
- ReportView 연간 통계: 현재 연도 기본, 과거 연도는 "불러오기" 버튼으로 on-demand

**마이그레이션**: 기존 `"tx"` 키 데이터를 연도별로 분리하는 1회성 마이그레이션 스크립트 필요.

> ⚠️ **주의**: tx 키 구조 변경은 Realtime 채널 구독 방식에도 영향. `db.save` / `db.load` 유틸 함수를 먼저 추상화한 후 작업 시작.

---

## 8. Phase 5 — UX 기능 확장 및 디자인 고도화

> 예상 소요: 1~2주 | Phase 3·4 완료 후 진행

### Task 5-1: 월별 히스토리 뷰

**현황**: `CalendarView.jsx`에 `viewMonth` / `viewYear` state가 이미 구현되어 있어 기반 준비됨.

**구현 포인트**:
- 헤더 `< 2025년 3월 >` 네비게이션 → `viewMonth` / `viewYear` 변경
- 해당 월의 수입·지출·잔액 섹션을 달력 상단에 추가
- Phase 4의 Lazy Loading(Task 4-2)과 연동하여 과거 연도 데이터 자동 로드

---

### Task 5-2: 카드 결제일 캘린더 마커

**현황**: `CalendarView.jsx`에 `getBillingPeriod` 로직이 구현되어 있으나, `cards` 데이터에 `billingStartDay` 등 필드가 없어 미동작.

**카드 데이터 모델 확장**:

```javascript
// cards 항목 구조 확장 (FixedView 카드 등록 UI에 필드 추가)
{
  id:              String,
  label:           String,  // Task 0-2 이후 통일
  type:            String,
  color:           String,
  billingStartDay: Number,  // 결제 기산일 (예: 1)
  billingEndDay:   Number,  // 결제 마감일 (예: 말일 → 0)
  paymentDay:      Number,  // 출금일 (예: 다음달 15)
}
```

**CalendarView 표시**: `paymentDay`에 💳 마커 → 탭 시 "OO카드 결제일 — 예상 청구액: 000원" 표시.

---

### Task 5-3: 오프라인 데이터 큐 ★ 신규

**배경 (Antigravity v2 제안)**: 네트워크 불안정 시에도 지출 입력이 가능해야 한다. 현재는 `setShared` 실패 시 로컬 State 반영만 되고, 앱 재시작 시 데이터가 유실될 수 있다.

**구현 방향**:

```javascript
// src/utils/offlineQueue.js (신규)
const QUEUE_KEY = 'budget_offline_queue';

export const enqueue = (key, value) => {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  q.push({ key, value, ts: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
};

export const flush = async (db, householdId) => {
  const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!q.length) return;
  for (const item of q) {
    await db.save(householdId, item.key, item.value);
  }
  localStorage.removeItem(QUEUE_KEY);
};
```

`App.jsx`에서 온라인 복구 이벤트(`window.addEventListener('online', ...)`) 시 `flush()` 호출.

---

### Task 5-4: 동시 편집 충돌 경고

**배경**: 두 기기가 동시에 `tx`를 수정하면 나중에 저장된 쪽이 앞 데이터를 덮어씀. 병합 로직 없음.

**단기 대안 (경고만)**:

```javascript
const handleRealtimeUpdate = (key, value) => {
  if (key === 'tx' && isEditing) {
    showToast("파트너가 내역을 수정했습니다. 저장 후 동기화됩니다.");
    setPendingRemoteUpdate({ key, value });
    return;
  }
  updateSharedState(key, value);
};
```

**장기 대안**: tx 배열을 ID 기반으로 merge하는 로직 구현 (별도 태스크로 분리).

---

## 9. 작업 전 필수 확인사항

> 개발 시작 전 아래 항목을 확인하고 결과를 기록해둔다.

### Supabase 콘솔

- [ ] `household_data` 테이블 PK: `(id, key)` 복합키인지 확인 → upsert 동작 전제
- [ ] `value` 컬럼 타입: JSONB 확인 (JSON이면 인덱스 성능 차이 있음)
- [ ] RLS 활성화 여부
  ```sql
  SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'household_data';
  ```
- [ ] Realtime 활성화 여부 (콘솔 → Database → Replication)
- [ ] 실제 저장 데이터에서 `plan.monthlyFixedTotal` 값 유무
  ```sql
  SELECT value->'monthlyFixedTotal' FROM household_data WHERE key = 'plan' LIMIT 5;
  ```

### Vercel 환경 변수

- [ ] `VITE_SUPABASE_URL` 설정됨
- [ ] `VITE_SUPABASE_ANON_KEY` 설정됨
- [ ] `ANTHROPIC_API_KEY` 설정됨
- [ ] `INTERNAL_API_SECRET` 설정됨 (Task 2-3 적용 후 추가 필요)

### 로컬 개발 환경

```bash
cat .env.local        # 환경 변수 확인
npm run build         # 정상 빌드 확인
npm run dev           # 로컬 실행
```

---

## 10. 파일별 수정 체크리스트

| 파일 | 수정 내용 | Phase | 완료 |
|------|----------|-------|------|
| `src/constants/index.js` | `YEAR/MONTH/DAY` → `getYear()/getMonth()/getDay()` 함수형 전환 | P0 | ☑ |
| `src/views/CalendarView.jsx` | `cp.card.name` / `cd.name` → `.label` (223·241·266라인) | P0 | ☑ |
| `src/views/PlanView.jsx` (SummaryTab) | `!i.paid` → `(i.paidMonths||0) < (i.months||1)` | P0 | ☑ |
| `src/views/App.jsx`, `ReportView.jsx` 등 | `YEAR`/`MONTH` 상수 참조 → `getYear()`/`getMonth()` 호출로 일괄 교체 | P0 | ☑ |
| `src/views/PlanView.jsx` (IncomeTab) | `plan.monthlyIncome` → `plan.salary` 읽기 전환 | P1 | ☑ |
| `src/views/PlanView.jsx` (IncomeTab) | `monthlyFixedTotal` 실시간 계산 전환 (useMemo) | P1 | ☑ |
| `src/App.jsx` | `plan.salary` 마이그레이션 로직 추가 (1회성) | P1 | ☑ |
| `src/utils/supabase.js` | 하드코딩 자격증명 폴백 제거 | P2 | ☑ |
| `api/budget-ai.js` | 인증 헤더 검증 추가 | P2 | ☑ |
| `api/ocr.js` | 인증 헤더 검증 추가 | P2 | ☑ |
| `src/utils/validate.js` | 신규 생성 — 데이터 스키마 검증 함수 | P2 | ☑ |
| `src/App.jsx` | `setShared` retry 로직 + validate 호출 추가 | P2 | ☑ |
| `src/context/BudgetContext.jsx` | 신규 생성 — Context API 도입 | P3 | ☑ |
| `src/styles/tokens.js` | 신규 생성 — THEME_TOKENS 정의 | P3 | ☑ |
| `src/styles/globalStyles.js` | `@keyframes spin/fadeIn` 확인 및 추가 | P3 | ☑ |
| `src/components/NumPad.jsx` | 신규 생성 — 키패드 공통 컴포넌트 | P3 | ☑ |
| `src/views/HomeView.jsx` | `recent` 데드 코드 제거 | P3 | ☑ |
| `src/views/HomeView.jsx` | `thisMonthTx` 등 useMemo 적용 | P4 | ☑ |
| `src/views/ReportView.jsx` | 월별 필터링 연산 useMemo 적용 | P4 | ☑ |
| `src/utils/supabase.js` + `src/App.jsx` + `src/views/CalendarView.jsx` | tx 연도별 분리 로드: `loadTx`/`saveTx` 추상화, 마이그레이션 로직, lazy 로드 | P4 | ☑ |
| `src/views/CardView.jsx` (+ FixedView, EntryView, DataImportView) | card.name → card.label 완전 통일; 카드 등록 시 `billingStartDay`/`billingEndDay`/`paymentDay` 이미 구현 확인 | P5 | ☑ |
| `src/views/CalendarView.jsx` | 카드 결제일 💳 마커 표시 이미 구현됨 (payDateMap 활용) | P5 | ☑ |
| `src/utils/offlineQueue.js` | 신규 생성 — 오프라인 큐 유틸 (enqueue/flush/clear) | P5 | ☑ |
| `src/App.jsx` | `window.online` 이벤트 핸들러 + offlineQueue flush + 오프라인 시 자동 큐잉 | P5 | ☑ |

---

## 11. 핵심 패턴 부록

### 전역 상태 변경 (항상 이 패턴)

```javascript
// ✅ setShared 래퍼를 통해 변경 — DB 자동 저장
setTx(newTxArray);
setFixed(newFixedArray);

// ❌ rawSetter 직접 호출 — DB 저장 안 됨
setTxRaw(newTxArray);
```

### 거래 추가 / 수정 / 삭제

```javascript
addTx(item)          → setTx([...tx, item])
editTx(id, updates)  → setTx(tx.map(t => t.id === id ? {...t, ...updates} : t))
deleteTx(id)         → setTx(tx.filter(t => t.id !== id))
```

### plan 객체 업데이트

```javascript
// 중첩 객체이므로 스프레드 깊은 복사
setPlan(prev => ({
  ...prev,
  salary: { ...prev.salary, husband: newValue }
}));
```

### 날짜 처리 (Phase 0 수정 이후 기준)

```javascript
// ✅ 올바른 오늘 날짜
const today = toDateStr(new Date());   // "2026-04-03"
const year  = getYear();               // 2026
const month = getMonth();              // 4

// ❌ 앱 로드 시점으로 고정 (Phase 0 이후 사용 금지)
const today = today_str();
const year  = YEAR;
```

### Context 사용 (Phase 3 이후)

```javascript
// ✅ Phase 3 이후 신규 컴포넌트
const { tx, plan, names } = useBudget();

// 기존 View는 점진적 전환 — 전환 전까지는 props 방식 유지
```

---

*이 계획서(v3)는 Claude 초안(PLAN.md)과 Antigravity v2(plan_v2.md)를 완전 병합하고,*
*구현 상태를 최신화하며, 아키텍처 우선 로드맵으로 재구성한 통합본입니다.*
