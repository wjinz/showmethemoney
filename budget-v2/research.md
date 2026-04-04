# Family Budget App — 코드베이스 심층 분석 보고서

**작성일시:** 2026-04-04 23:21:50
**대상 폴더:** `budget-v2`
**버전:** 4.0.0 (package.json 기준 2.0.0, 앱 내부 표기 4.0.0)

---

## 1. 프로젝트 개요

**Family Budget App**은 부부(또는 1인) 가계부 관리를 위한 모바일 우선(Mobile-First) React SPA다. Supabase를 백엔드 DB 및 실시간 동기화 엔진으로 사용하며, Vercel Serverless Function 2개를 통해 AI 기능(영수증 OCR, AI 예산 배분)을 제공한다. 최대 폭 480px로 제한된 모바일 UI를 가진다.

### 기술 스택

| 영역 | 선택 기술 |
|------|-----------|
| UI 프레임워크 | React 18.2 + Vite 5.1 |
| 백엔드 DB | Supabase (PostgreSQL + Realtime) |
| 배포 | Vercel (SPA + Serverless Functions) |
| AI 연동 | Anthropic API (Claude Opus 4.5 — OCR, Claude Haiku 4.5 — 예산 AI) |
| 차트 | Recharts 2.12 |
| 엑셀 내보내기 | xlsx 0.18 |
| 스타일링 | 인라인 CSS (CSS 변수 기반 테마) |

---

## 2. 폴더 구조

```
budget-v2/
├── api/                     # Vercel Serverless Functions
│   ├── ocr.js               # 영수증 OCR 프록시 (Claude Opus)
│   └── budget-ai.js         # AI 예산 배분 (Claude Haiku)
├── src/
│   ├── App.jsx              # 루트 컴포넌트 — 전역 상태 관리
│   ├── main.jsx             # React DOM 진입점
│   ├── components/          # 공통 UI 컴포넌트
│   │   ├── AdminLoginModal.jsx
│   │   ├── BugReportModal.jsx
│   │   ├── InputModal.jsx
│   │   ├── Nav.jsx
│   │   ├── NumPad.jsx
│   │   ├── QuickEntrySheet.jsx
│   │   ├── SliderRow.jsx
│   │   ├── Toast.jsx
│   │   ├── TxEditModal.jsx
│   │   └── UI.jsx
│   ├── constants/index.js   # 전역 상수 (카테고리, 기본값 등)
│   ├── context/
│   │   └── BudgetContext.jsx # React Context + useBudget 훅
│   ├── styles/
│   │   ├── globalStyles.js  # CSS 변수 + 글로벌 스타일 (G 문자열)
│   │   └── tokens.js        # 디자인 토큰 (THEME_TOKENS)
│   ├── utils/
│   │   ├── export.js        # CSV 내보내기
│   │   ├── helpers.js       # 날짜/금액 포맷 유틸
│   │   ├── ocr.js           # OCR API 클라이언트
│   │   ├── offlineQueue.js  # 오프라인 큐 (localStorage)
│   │   ├── supabase.js      # DB 클라이언트 + 실시간 구독
│   │   └── validate.js      # 경량 스키마 검증
│   └── views/               # 라우팅 단위 View 컴포넌트
│       ├── AdminView.jsx
│       ├── AssetView.jsx
│       ├── BudgetView.jsx
│       ├── CalendarView.jsx
│       ├── CardView.jsx
│       ├── DataImportView.jsx
│       ├── EntryView.jsx
│       ├── FixedView.jsx
│       ├── HomeView.jsx
│       ├── PredictionView.jsx
│       ├── ReportView.jsx
│       ├── SettingsView.jsx
│       ├── SimulatorView.jsx
│       ├── SyncSetup.jsx
│       ├── TaxOptimizerView.jsx
│       └── WidgetView.jsx
├── .env.local               # 환경 변수 (Supabase URL/Key)
├── index.html
├── package.json
└── vite.config.js
```

---

## 3. 데이터 모델 및 Supabase 스키마

Supabase 테이블은 `household_data` 단일 테이블 구조를 사용한다.

```
household_data
├── id          TEXT   (가계부 고유 HID, 6자리 영숫자)
├── key         TEXT   (데이터 종류 식별자)
├── value       JSONB  (실제 데이터)
└── updated_at  TIMESTAMP
```

key 값 목록:

| key | 타입 | 설명 |
|-----|------|------|
| `tx_YYYY` | Array | 연도별 지출 내역 (예: `tx_2026`) |
| `fixed` | Array | 고정비 목록 |
| `install` | Array | 할부 목록 |
| `cards` | Array | 카드 목록 |
| `assets` | Array | 자산/부채 목록 |
| `budgets` | Object | 카테고리별 월 예산 |
| `names` | Object | `{husband, wife}` 이름 |
| `plan` | Object | 급여/저축 플랜 |
| `taxConfig` | Object | 연말정산 설정 |
| `bug_*` | Object | 버그 리포트 (`id=GLOBAL_SYSTEM`) |

### 주요 데이터 객체 구조

**TxItem (지출 내역)**
```js
{ id: number, who: "husband"|"wife", amount: number, cat: string,
  memo: string, cardId: string, payMethod: "credit"|"debit"|"cash",
  date: "YYYY-MM-DD" }
```

**FixedItem (고정비)**
```js
{ id: number, name: string, amount: number, cat: string, day: number }
```

**InstallItem (할부)**
```js
{ id: number, totalAmount: number, months: number, monthly: number,
  cardId: string, startDate: string, memo: string }
```

**CardItem**
```js
{ id: number, label: string, type: string, color: string, icon: string,
  billingStartDay: number, billingEndDay: number,
  billingEndNextMonth: boolean, paymentDay: number }
```

**Plan (재무 플랜)**
```js
{ salary: { husband: number, wife: number, savingsTarget: number },
  utilizationTarget: number, events: Array, isSolo: boolean }
```

---

## 4. 아키텍처 및 상태 관리

### 4-1. 전역 상태 관리 방식

`App.jsx`가 모든 전역 상태를 소유한다. React Context(`BudgetContext`)를 통해 View 컴포넌트에 배포하며, prop drilling을 최소화하는 구조로 점진적으로 전환 중이다.

```
App.jsx (State Owner)
  └── BudgetContext.Provider
        ├── HomeView
        ├── EntryView
        ├── BudgetView
        ├── ReportView
        ├── SettingsView
        └── AdminView
```

**낙관적 UI 업데이트(Optimistic UI):** 모든 setShared 호출은 로컬 상태를 즉시 반영한 후 비동기로 Supabase에 저장한다.

### 4-2. tx 연도별 분리 (Lazy Loading)

초기 로드 시 현재 연도 tx만 가져오며, 과거 연도 데이터는 CalendarView/ReportView에서 해당 연도 탐색 시 `loadTxYear(year)` 호출로 지연 로드된다. 한 번 로드된 연도는 `loadedTxYears` (ref Set)으로 추적하여 중복 요청을 막는다.

### 4-3. 저장 전략

- **Debounce 필드** (names, budgets, taxConfig): 800ms 지연 후 저장 — 타이핑 중 과도한 API 호출 방지
- **즉시 저장 필드** (tx, fixed, install 등): 저장 실패 시 최대 3회 지수 백오프(1s → 2s) 재시도
- **오프라인 큐** (`offlineQueue.js`): 네트워크 단절 시 localStorage에 큐 보관, `window.online` 이벤트 시 일괄 flush

### 4-4. 실시간 동기화

Supabase Realtime을 통해 같은 HID를 사용하는 파트너 기기에서 발생한 변경사항을 즉시 반영한다. INSERT / UPDATE 이벤트를 구독하며, tx_YYYY 키 변경도 처리한다.

---

## 5. 네비게이션 구조

`App.jsx`의 `view` state가 현재 화면을 결정한다. URL 라우팅이 아닌 상태 기반 라우팅이다.

```
하단 탭바(Nav)
├── 홈         → HomeView
├── 예산       → BudgetView
├── [FAB+입력] → QuickEntrySheet (Bottom Sheet)
├── 리포트     → ReportView
└── 설정       → SettingsView

추가 화면 (모달/오버레이)
├── InputModal       : 빠른 지출 입력 (홈에서 파트너 선택 시)
├── QuickEntrySheet  : Bottom Sheet 형태의 빠른 입력
├── WidgetView       : 위젯 뷰
├── AdminView        : 관리자 전용 (버그 리포트 관리)
└── SyncSetup        : 최초 실행 시 HID 설정 화면
```

ReportView 내부는 자체 탭 UI를 가진다:
- 리포트 / 캘린더 / 데이터 / 연말정산 / 예측 / 자산

---

## 6. 주요 기능 상세

### 6-1. HomeView — 가계 대시보드

두 가지 모드를 토글로 전환한다.

- **종합 모드**: 고정비 + 할부 + 변동비 전체 집행률을 링 차트로 표시
- **생활비 모드**: 변동비(순수 일상 지출)만 집중 표시

주요 지표:
- 이 속도면 월말 예상 잔액 (일평균 지출 × 잔여 일수 기반)
- 시나리오 슬라이더 — 목표 일 지출 조정 시 월말 예상 실시간 반영
- 카드 권장 한도 (급여 - 고정비 - 저축목표 × utilizationTarget%)
- 이달 예상 저축률
- 파트너별 지출 비교 (커플 모드)
- 최근 내역 5건 + 검색

### 6-2. EntryView — 지출 기록

- 숫자 키패드 + 카테고리 선택 + 메모 + 카드/결제수단 선택
- 날짜 선택 가능 (과거 날짜 입력 지원)
- 영수증 OCR: 카메라로 촬영한 이미지를 `/api/ocr` 서버리스 함수로 전송 → Claude Opus로 금액/카테고리/메모 자동 추출
- 해당 날짜의 기존 내역 목록 노출 + 클릭 시 TxEditModal로 수정/삭제

### 6-3. BudgetView — 재무 플랜

6개 서브탭 구조:

1. **수입/저축**: 남편/아내 월급, 저축 목표, 카드 한도 사용률 설정
2. **고정비/할부**: 월 정기 지출 등록 (날짜, 카테고리), 할부 스케줄 관리 (카드별 결제일 기반 1회차 자동 계산)
3. **카테고리 예산**: 9개 카테고리별 월 예산 슬라이더 + AI 자동 배분 기능
4. **연간 이벤트**: 예정된 큰 지출 이벤트 등록
5. **분석 데이터**: 과거 3개월 평균 지출 기반 참고 데이터
6. **플랜 요약**: 수입/고정비/저축/생활비 구조를 한눈에 정리

AI 예산 배분: `/api/budget-ai` (Claude Haiku)를 호출하여 급여, 고정비, 저축 목표, 최근 3개월 지출 패턴을 기반으로 9개 카테고리 예산을 자동 추천한다. API 실패 시 로컬 휴리스틱 알고리즘(`runLocalAI`)으로 폴백한다.

### 6-4. ReportView — 분석/리포트

**리포트 탭:**
- 이번 달 지출 구조 (누적 막대 — 카테고리별 비율)
- 전월 대비 증감 분석
- 카테고리별 예산 대비 실적
- 파트너 기여도 비교

**캘린더 탭:**
- 월별 캘린더 — 일별 지출 강도를 색상으로 시각화
- 카드 결제일 표시 (해당 월 결제 예정일 강조)
- 날짜 클릭 시 해당일 내역 목록 + 수정/삭제
- 과거 연도 탐색 시 tx lazy load 트리거

**연말정산 탭:**
- 총 소득의 25% (소득공제 문턱값) 달성률 표시
- 신용카드(15%) vs 체크/현금(30%) 공제율 비교
- 문턱값 초과 여부에 따른 결제 수단 추천

**예측 탭:**
- 최근 2개월 이상 반복 패턴을 지출 내역에서 자동 감지
- 반복 지출 항목별 월평균 금액 예측 표시

**자산 탭:**
- 계좌/현금/투자/대출 등 자산 등록 및 순자산 계산

### 6-5. SettingsView — 설정

- 파트너 이름 변경
- 테마 선택: dark / light / oldschool (Win 3.1 / 386 DOS 스타일)
- HID 복사 및 가계부 연결 해제
- 지출 내역 CSV 내보내기
- 버그 리포트 제출
- 세분화 초기화: 지출만 / 고정비만 / 예산만 / 전체

### 6-6. QuickEntrySheet — 빠른 입력

하단 Bottom Sheet 형태. FAB(플로팅 버튼) 클릭 시 활성화. 최근 1개월 기준 카테고리 사용 빈도순으로 카테고리를 정렬하여 자주 쓰는 카테고리를 상단에 배치한다.

---

## 7. AI 기능 상세

### 7-1. 영수증 OCR (`/api/ocr`)

- 모델: `claude-opus-4-5`
- 입력: base64 인코딩 이미지
- 출력: `{amount, cat, memo}` JSON
- 보안: `INTERNAL_API_SECRET` 헤더로 외부 직접 호출 차단
- 클라이언트: `src/utils/ocr.js`가 이미지를 FileReader로 읽어 base64 변환 후 POST

### 7-2. AI 예산 배분 (`/api/budget-ai`)

- 모델: `claude-haiku-4-5-20251001`
- 입력: 총 급여, 고정비, 할부, 저축 목표, 최근 3개월 카테고리별 평균 지출
- 출력: 9개 카테고리 예산 + 이유 + 전체 조언
- 합계 보정: AI가 반환한 합계가 배분 가능액과 5만원 이내 오차 시 `etc` 카테고리에 자동 보정
- 폴백: API 실패 시 `runLocalAI()` 로컬 휴리스틱 알고리즘 실행

---

## 8. 데이터 마이그레이션 처리

코드 곳곳에 데이터 스키마 변경에 대응하는 마이그레이션 로직이 있다.

| 마이그레이션 | 처리 위치 | 내용 |
|---|---|---|
| `tx` → `tx_YYYY` | `App.jsx` loadShared | 레거시 단일 tx 키를 연도별 분리 키로 이전 |
| `plan.monthlyIncome` → `plan.salary` | `App.jsx` loadShared | 1회성 플랜 구조 변경 |
| `card.name` → `card.label` | `App.jsx` loadShared | 카드 필드명 변경 |

---

## 9. 데이터 무결성 및 방어 로직

### 9-1. validate.js

저장 전 4개 주요 키에 대해 경량 스키마 검증을 수행한다. 불일치 시 `console.warn` 출력 (저장 차단 없음 — 소프트 경고).

검증 대상: `cards`, `tx`, `fixed`, `install`

### 9-2. 재시도 로직

즉시 저장 대상 필드는 최대 3회 지수 백오프 재시도. 3회 실패 시 `offlineQueue`에 보관.

### 9-3. 오프라인 큐

`budget_offline_queue` localStorage 키에 `[{key, value, ts}]` 배열로 보관. 동일 key의 이전 항목은 최신으로 교체(dedup). 온라인 복구 시 성공 항목만 큐에서 제거, 실패 항목은 유지.

---

## 10. 인증 및 보안

### 가계부 접근

URL 기반 인증 없이 HID(6자리 코드)만으로 접근한다. HID를 아는 사람은 누구나 해당 가계부 데이터를 읽고 쓸 수 있는 구조다. 개인 식별 인증(로그인)은 없으며, 가족 내 공유 코드 방식으로 설계되었다.

### 관리자 기능

별도 ID/PW 기반 AdminLoginModal이 있으며, 설정 화면의 버전 텍스트를 5회 연속 클릭하면 관리자 로그인 모달이 활성화되는 숨겨진 트리거가 있다. 관리자 권한은 localStorage에 `isAdmin` 플래그로 보관된다.

### API 보안

서버리스 함수는 `INTERNAL_API_SECRET` 환경 변수로 추가 인증을 적용할 수 있다. Anthropic API 키는 서버 사이드에서만 사용되며 프론트 번들에 포함되지 않는다.

---

## 11. 테마 시스템

CSS 변수 기반 3가지 테마를 지원한다. `globalStyles.js`의 G 문자열에 정의된 CSS 변수가 `:root`에 적용되며, `.light` / `.oldschool` 클래스로 오버라이드된다.

| 변수명 | 용도 |
|--------|------|
| `--bg`, `--bg2`, `--bg3`, `--bg4` | 배경 단계 |
| `--text`, `--text2`, `--text3` | 텍스트 단계 |
| `--gold`, `--goldD`, `--goldL` | 주 포인트 색 |
| `--h`, `--hD` | 남편 색상 |
| `--w`, `--wD` | 아내 색상 |
| `--red`, `--green`, `--blue` | 상태 색상 |
| `--border`, `--border2` | 테두리 |
| `--nav-bg` | 네비게이션 배경 (blur 효과) |

`tokens.js`의 `THEME_TOKENS`는 신규 컴포넌트를 위한 구조화된 토큰 객체지만, 기존 코드 대부분은 아직 인라인 CSS를 직접 사용한다.

---

## 12. 빌드 및 배포

- **빌드**: `vite build` → `dist/` 폴더 생성
- **로컬 개발**: `vite` (HMR 포함)
- **배포 대상**: Vercel (SPA + `/api/*` Serverless Functions 자동 처리)
- **Supabase URL/Key**: Vite 빌드 시 환경 변수로 번들에 포함됨
- `vite.config.js`의 `base: './'`는 GitHub Pages 배포를 고려한 설정

---

## 13. 알려진 기술 부채 및 특이점

1. **인라인 스타일 다수**: 대부분의 View가 인라인 CSS를 직접 사용. `tokens.js`로 점진적 전환 예정이나 미완.
2. **단일 테이블 JSONB 구조**: 데이터 타입별 별도 테이블이 아닌 key-value JSONB 방식 — 간단하지만 쿼리 최적화 제한.
3. **Context 전환 진행 중**: 일부 View는 props로, 일부는 Context로 데이터를 받는 혼용 상태.
4. **유일한 접근 통제가 HID**: 보안 강도가 낮으며 코드 추측 공격에 취약할 수 있음.
5. **PredictionView 미완성**: "고정비 바로 등록" 버튼이 곧 추가될 예정이라는 메시지가 하드코딩되어 있음.
6. **localStorage 관리자 인증**: `isAdmin` 플래그를 localStorage에 저장하는 방식은 조작 가능성 있음.

---

## 14. 최근 커밋 이력 (주요)

| 커밋 | 내용 |
|------|------|
| 6101463 | UI 개선 및 버그 수정 (콤마 표기, 예산 다이어그램, 블랙스크린) |
| c3b2dac | 모달 닫힘 방지 수정 + 거래 목록 결제수단 표시 |
| e110437 | 홈 차트 단일 링으로 단순화 + 입력 모달 카드 선택 복원 |
| 5c58f87 | Win 3.1/386 DOS 테마 구현, 차트 정렬 수정, 동기화 UI 리팩터 |
| 4bda71e | 버그 리포트 시스템 + 관리자 대시보드 구현 |
| c8d91e5 | 카드별 할부 결제일 스케줄링 로직 구현 |
| 559e38d | 데이터 리셋 및 트랜잭션 삭제 동기화 수정 + 세분화 리셋 UI |

---

*보고서 생성 완료: 2026-04-04 23:21:50*
