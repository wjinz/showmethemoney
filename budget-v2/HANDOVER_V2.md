# 💎 Deep-Dive Handover: Budget-V2 Project

이 문서는 차기 개발자가 프로젝트의 철학, 구조, 그리고 핵심 로직을 깊이 있게 이해하고 즉시 업무에 투입될 수 있도록 돕기 위해 작성되었습니다.

---

## 1. 프로젝트 에센스 (Vision)
본 서비스는 **'부부의 경제적 투명성과 효율적인 자산 관리'**를 목표로 합니다. 
단순한 가계부를 넘어, 두 사용자가 실시간으로 연결되어 지출을 공유하고, AI가 예산 계획을 돕는 '재무 파트너' 역할을 지향합니다.

---

## 2. 시스템 아키텍처 (System Architecture)

전체 시스템은 **Serverless + Realtime DB** 조합으로 구성되어 있어 인프라 관리가 최소화되어 있습니다.

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        App[App.jsx - Global State]
        Views[Views - Home/Plan/Report...]
        UI[UI Components]
    end

    subgraph "Backend (Vercel Functions)"
        OCR[/api/ocr.js - Claude Opus]
        AI[/api/budget-ai.js - Claude Haiku]
    end

    subgraph "Realtime Layer (Supabase)"
        DB[(household_data Table)]
        Sync[Realtime Channels]
    end

    App <-->|Sync| Sync
    Sync <--> DB
    App -->|JSON POST| OCR
    App -->|JSON POST| AI
    Views --> App
```

### 핵심 동기화 매커니즘
- **Data Persistence**: 모든 공유 데이터는 Supabase의 `household_data` 테이블에 `key-value` 형태로 저장됩니다. (JSONB 타입 활용)
- **Realtime Sync**: 한 쪽에서 데이터를 `upsert`하면, Supabase Realtime 채널을 통해 다른 쪽 기기의 React State가 즉시 업데이트됩니다. (`db.subscribe` in `utils/supabase.js`)

---

## 3. 상세 데이터 모델 (Data Model)

Supabase의 `household_data` 테이블에는 다음과 같은 키(`key`)들이 JSON 형태로 저장됩니다.

| Key | Description | Type | 주요 필드 |
|:---|:---|:---|:---|
| `tx` | 지출 내역 | `Array` | `id, date, amount, cat, memo, who, payMethod, cardId` |
| `budgets` | 카테고리별 예산 | `Object` | `{ food: 500000, housing: 1000000, ... }` |
| `plan` | 종합 재무 계획 | `Object` | `salary (husband/wife/target)`, `events`, `importedAnalysis` |
| `fixed` | 고정비 목록 | `Array` | `id, label, amount, date(day), cardId` |
| `install` | 할부 목록 | `Array` | `id, label, totalAmount, months, startMonth, paidMonths` |
| `cards` | 카드 정보 | `Array` | `id, label, type(credit/debit), color` |
| `names` | 사용자 별칭 | `Object` | `{ husband: "우진", wife: "지연" }` |

---

## 4. AI 서비스 로직 (AI Services)

### 4-1. OCR 영수증 분석 (`/api/ocr.js`)
- **Model**: `claude-opus-4-5` (이미지 인식 정확도가 가장 높음)
- **Flow**: 이미지(Base64) 전송 → 프롬프트 기반 JSON 추출 → `{amount, cat, memo}` 반환.
- **Fail-safe**: 인식 실패 시 사용자가 직접 입력할 수 있는 `InputModal`로 폴백.

### 4-2. AI 예산 배분 (`/api/budget-ai.js`)
- **Model**: `claude-haiku-4-5` (속도와 비용 최적화)
- **Input**: 실수령액, 고정비, 저축 목표, 최근 3개월 평균 지출 내역.
- **Output**: 추천 예산안과 그 이유(`reasons`), 전반적인 재무 조언(`tip`).

---

## 5. 핵심 개발 패턴 (Coding Patterns)

### 5-1. `setShared` 패턴
Supabase와 로컬 State를 동시에 업데이트하는 래퍼 함수입니다. `App.js`에서 정의되어 각 View에 전달됩니다.
```javascript
const setTx = useCallback(v => 
  setShared("tx", typeof v === 'function' ? v(tx) : v, setTxRaw), 
[tx, setShared]);
```

### 5-2. 동적 날짜 관리
Vite의 모듈 캐싱 문제로 인해 `TODAY`와 같은 상수를 모듈 최상단에 두지 않고, 반드시 호출 시점에 계산하는 함수를 사용합니다.
- ✅ `const now = () => new Date();`
- ❌ `const today = new Date(); // 모듈 로딩 시점에 고정됨`

---

## 6. 운영 및 배포 (Ops)

- **배포**: Vercel (main 브랜치 push 시 자동 빌드/배포)
- **환경 변수**:
    - `ANTHROPIC_API_KEY`: 서버 사이드 전용 (VITE_ 접두사 없음)
    - `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`: 클라이언트 노출 허용
- **주의사항**: `npm run build` 시 로컬 환경(ARM64)에 따라 Rollup 에러가 날 수 있으나, Vercel 서버에서는 정상 작동합니다.

---

## 7. 향후 로드맵 (Roadmap)

1.  **데이터 무결성**: `plan.salary`와 `plan.monthlyIncome`이 파편화되어 있음. `plan.salary`를 단일 진실 공급원(SSOT)으로 통합 필요.
2.  **월별 히스토리**: 현재는 '이번 달' 예산만 지원함. `tx` 데이터를 기반으로 지난 달 예산/지출 스냅샷을 저장하는 기능 필요.
3.  **카드 결제일 로직**: 카드별 결제일을 등록하여 다음 달 청구 예상액을 정교하게 예측.

---

## 8. 빠른 온보딩을 위한 제안 (Understanding Verification)

### [Task 1] 환경 설정 확인
- `.env.local`에 Supabase 키를 넣고 `npm run dev`를 실행해서 데이터가 실시간으로 동기화되는지 두 개의 브라우저 창을 띄워 확인해보세요.

### [Task 2] 가벼운 코드 수정
- `src/constants/index.js`의 `CATS` 배열에 새로운 카테고리(예: '반려동물' 🐕)를 추가하고, 전체 앱(예산 탭, 입력 모달)에 정상적으로 반영되는지 확인해보세요.

### [이해도 체크 리스트]
- [ ] 왜 `App.jsx`에서 `updateSharedState`가 필요한가요? (답: 실시간 구독으로 들어온 외부 업데이트를 반영하기 위해)
- [ ] `plan` 객체 내의 `importedAnalysis`는 어떤 화면에서 생성되나요? (답: DataImportView의 엑셀 업로드 시)

---
> **배려의 한 마디**: 코드가 다소 인라인 스타일로 작성된 부분이 많습니다. 이는 빠른 프로토타이핑을 위한 선택이었으며, 향후 `globalStyles.js`로의 점진적인 리팩토링을 환영합니다!
