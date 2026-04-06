# 💎 Project Handover & Developer Guide (V3)

이 문서는 **'우리집 가계부 v2.0'**의 최신화된 아키텍처와 개발 표준을 정의합니다. 다음 단계의 기능 확장이나 유지보수 시 이 가이드를 제 1원칙으로 삼으십시오.

---

## 1. 최신 시스템 아키텍처 (2026.04.06 기준)

기존 Anthropic 기반에서 **Google Gemini 기반**으로 AI 엔진이 완전히 전환되었습니다.

```mermaid
graph TD
    subgraph "Frontend (React + Vite)"
        App[App.jsx - State & Realtime Sync]
        Theme[theme.css - Data Color Scheme]
        Views[Views - Home/Private/Budget...]
    end

    subgraph "Backend (Vercel Serverless)"
        OCR[/api/ocr.js - Gemini Flash]
        AI[/api/budget-ai.js - Gemini Flash]
        Nudge[/api/nudge.js - Gemini Flash]
    end

    subgraph "Database & Storage (Supabase)"
        HID[(household_data Table)]
        TX[(transactions Table)]
        SOS[(sos_requests Table)]
    end

    App <-->|Realtime Subscribe| HID
    App -->|POST| OCR
    App -->|POST| AI
    Views --> App
```

---

## 2. 핵심 기술 스택 및 환경 설정

- **AI Model**: `gemini-2.5-flash` (또는 `gemini-1.5-flash`). 속도와 이미지 인식 효율 최적화.
- **Environment Variables**:
  - `GOOGLE_API_KEY`: Gemini API 연동용 (Server-side).
  - `INTERNAL_API_SECRET`: API 무단 호출 방지용 시크릿.
  - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`: DB 연동용 (Client-side).
- **Theme System**: 
  - `joint` (공용): **Deep Navy (#0F172A)** 기반 다크 테마.
  - `private` (개인): **Deep Black (#020617)** 기반 프리미엄 테마.
  - `data-color-scheme`: 사용자의 `dark`/`light` 설정을 전역적으로 제어.

---

## 3. 개발 원칙 (Rule Table)

| 항목 | 상세 규칙 | 목적 |
| :--- | :--- | :--- |
| **SRP & Line Limit** | 파일 150라인, 함수 20라인 초과 금지 | 가독성 및 유지보수성 극대화 (핵심!) |
| **Type-First** | JSDoc 또는 TypeScriptInterface 선호 | `any` 타입 방지 및 데이터 무결성 |
| **Immutable State** | 원본 데이터 수정(Mutation) 절대 금지 | 리액트 상태 업데이트 사이드 이펙트 차단 |
| **Guard Clauses** | 함수 초입에서 예외 처리 후 조기 반환 | 중첩 if-else 지옥(Pyramid of Doom) 방지 |

---

## 4. 폴더 정리 및 파일 관리 규정

프로젝트의 지속적인 성장을 위해 루트 폴더의 난잡함을 방지합니다.

- **현재 활성 파일 (Keep in Root)**
  - `/src/`, `/api/`, `/public/`: 소스 코드 및 자산
  - `HANDOVER_V3.md`: 본 문서 (최신)
  - `README.md`: 프로젝트 기본 설명
  - `package.json`, `vercel.json`: 설정 파일
- **아카이브 대상 (Move to /archive/)**
  - 모든 날짜가 포함된 리서치 문서 (`research_YYYYMMDD.md`)
  - 모든 구버전 계획서 및 핸드오버 (`PLAN_...`, `HANDOVER_V2.md` 등)
- **리팩토링 대상** 
  - 150라인을 상회하는 `App.jsx`, `HomeView.jsx`, `BudgetView.jsx` 등은 최우선적으로 컴포넌트 및 훅으로 분리한다.

---

## 5. 핵심 작동 흐름 (Core Flow)

1. **지출 입력**: `QuickEntrySheet`에서 OCR(이미지) 또는 수동 입력 발생.
2. **상태 동기화**: `App.jsx`의 `setShared` 함수가 실행되어 Supabase DB 업데이트.
3. **실시간 반영**: 연결된 모든 기기에서 Supabase Realtime을 통해 즉시 UI 갱신.
4. **AI 피드백**: 홈 화면 진입 시 `/api/nudge.js`가 호출되어 지출 분석 코칭 문구 노출.

---
> **배려의 한 마디**: 이 프로젝트는 '부부의 행복한 재무 생활'을 위해 만들어졌습니다. 코드를 짤 때 항상 '사용자가 이 기능을 썼을 때 얼마나 안심하고 만족할지'를 고민해 주세요!
