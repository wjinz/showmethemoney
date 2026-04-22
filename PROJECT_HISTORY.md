# 📜 프로젝트 마스터 히스토리 (Master Project History)

본 문서는 프로젝트의 탄생부터 현재까지의 분석, 계획 및 구현 이력을 시간 순서대로 요약 정리한 마스터 히스토리 파일입니다.

---

## 🚀 프로젝트 발전 여정 요약

### 1단계: 기반 구축 및 v3.0 설계 (2026.04.06 ~ 04.10)
**"모던 웹 아키텍처와 사용자 경험의 기초 확립"**
- **주요 과제**: React + Supabase + Vercel Serverless 기반의 실시간 동기화 아키텍처 확립.
- **핵심 성과**: 
    - PWA(Progressive Web App) 도입 및 Share Target API 연동 설계.
    - `react-grid-layout` 기반의 모듈형 위젯 대시보드 시스템 구축.
    - Gemini AI를 활용한 초기 OCR(영수증 분석) 및 맞춤형 지출 피드백(Nudge) 로직 구현.
- **관련 문서**:
    - [uiux guide/plan.md](uiux%20guide/plan.md)
    - [_history/research_2026-04-07_103534.md](_history/research_2026-04-07_103534.md)
    - [_history/HANDOVER_V3.md](_history/HANDOVER_V3.md)

---

### 2단계: 시스템 정밀 진단 및 구조 최적화 (2026.04.13)
**"코드베이스의 비대화 해결 및 데이터 무결성 강화"**
- **주요 과제**: 중복 코드 제거 및 RDB 마이그레이션 기반 마련.
- **핵심 성과**: 
    - 프로젝트 전체 소스코드 감사를 통한 불필요한 레거시(`budget-v2`) 및 아카이브 파일 정리 가이드 수립.
    - 기존 JSONB 방식에서 정규화된 `transactions` 테이블로의 데이터 구조 전환 계획 확정.
    - 로컬 오프라인 큐와 Supabase Realtime 간의 동기화 안정성 검증.
- **관련 문서**:
    - [_history/research_2026-04-13_1154.md](_history/research_2026-04-13_1154.md)
    - [_history/research_2026-04-13_1221.md](_history/research_2026-04-13_1221.md)

---

### 3단계: AI 엔진 고도화 및 기능 안정화 (2026.04.14 ~ 04.15)
**"Gemma 4 도입과 엣지 케이스 버그 완전 해결"**
- **주요 과제**: AI 모델 최적화 및 복잡한 입력 로직의 정확도 향상.
- **핵심 성과**: 
    - **AI 최적화**: Gemma 4 31B를 메인 엔진으로 채택, 이미지 흑백 변환 및 리사이즈 전처리를 통해 API 응답 속도 및 비용 대폭 절감.
    - **근무표 파서**: 수기 입력 시 다양한 공백 문자를 지원하는 견고한 파서 개발 및 `M(낮12시)` 근무 코드 정식 반영.
    - **안정성 확보**: 이미지 대량 분석 시 발생하는 브라우저 캐시 및 렌더링 크래시 이슈 해결.
- **관련 문서**:
    - [_history/implementation_plan1955.md](_history/implementation_plan1955.md)
    - [_history/implementation_plan2013.md](_history/implementation_plan2013.md)
    - [_history/implementation_plan2052.md](_history/implementation_plan2052.md)

---

### 4단계: v4.0.0 완성 및 심층 분석 (2026.04.15 ~ 현재)
**"준비된 프리미엄 가계부 솔루션의 최종 검증"**
- **주요 과제**: 프로젝트의 지속 가능한 성장을 위한 지식 창고 구성.
- **핵심 성과**: 
    - **Antigravity 보고서**: 전반적인 아키텍처, 상태 관리 흐름, 동기화 메커니즘을 20여 개 섹션으로 나누어 심층 분석.
    - **보안 및 테마**: 3가지 테마(`dark`, `light`, `oldschool`) 시스템과 관리자 모드, 개인 정보 보호 기능을 비즈니스 로직에 완전 통합.
    - **미래 과제 도출**: 다중 자녀 지원, 데이터 무결성 강화를 위한 트랜잭션 처리 등 향후 고도화 로드맵 제시.
- **관련 문서**:
    - [_history/research_2026-04-15_1500.md](_history/research_2026-04-15_1500.md)
    - [PROJECT_HISTORY.md](PROJECT_HISTORY.md) (본 문서)

---

### 5단계: 지출 입력 시스템 완성과 Bulk OCR 고도화 (2026.04.16)
**"다크모드 완벽 대응 및 네트워크 속도 최적화"**
- **주요 과제**: 카드 앱 스크린샷 인식 실패 해결 및 대용량 이미지 전송 병목 제거.
- **핵심 성과**: 
    - **Bulk OCR 혁신**: 다크모드 인식률 저해 요소(흑백 필터) 제거 및 컬러 보존 로직 적용. 요일("(일)", "(월)") 및 상대적 날짜("어제", "오늘") 변환 규칙 완성.
    - **네트워크 최적화**: 무손실 PNG 대신 WebP/JPEG(0.8) 가변 압축 도입으로 업로드 용량 50~70% 절감.
    - **데이터 복원력**: AI 파싱 실패 시에도 정규식을 통해 유효한 항목을 긁어내는 `extractBulkItemsFallback` 방어 레이어 구축.
    - **UX 자동화**: 영수증 스탬프 촬영 즉시 폼으로 진입, 최근 패턴 기반 '빠른 입력 칩' 연동으로 입력 피로도 최소화.
- **관련 문서**:
    - [_history/plan_expense-entry_2026-04-16_0120.md](_history/plan_expense-entry_2026-04-16_0120.md)
    - [_history/implementation_plan0416_1435.md](_history/implementation_plan0416_1435.md)

---

### 6단계: 자산 통합 관리망 및 모바일 친화적 카드 정산 시스템 완비 (2026.04.20)
**"오프라인 큐가 지원되는 월간 결제 대금 정산기 구축(Settlement)"**
- **주요 과제**: 이번 달 예상 카드값과 보유 현금을 기반으로 초과 및 부족액을 사용자에게 직관적으로 제시.
- **핵심 성과**: 
    - **통합 설계**: `household_data` 생태계를 파괴하지 않고 `settlements` 상태를 추가하여 오프라인 동기화, 실시간 Realtime 동기화를 단번에 이룩함(App.jsx 의존성 추가).
    - **가시성**: 과거 달을 비교해 증감액 표기(예: `▲ +15,000원`), 부족 및 흑자 상태 시 UI 백그라운드를 다이내믹하게 교체. 
    - **UX 자동화**: 고정 지출 내역에서 `cardId`가 없는 현금 고정비용을 산출해 자동 제안값으로 노출시키는 편의성 제공.
    - **접근성 확장**: `SettingsView` 진입점 버튼 구성 및 `DashboardView` 메인 요약 위젯(`SettlementSummaryWidget`)으로 진입 장벽 완화.
- **관련 문서**:
    - [_history/plan_2026-04-20_0932.md](_history/plan_2026-04-20_0932.md)
    - [_history/plan_2026-04-20_2301.md](_history/plan_2026-04-20_2301.md)
    - [_history/plan_final_2026-04-20.md](_history/plan_final_2026-04-20.md)

---

### 7단계: v4.0 디자인 핸드오프 구현 및 배포 (2026.04.22)
**"Claude Design 핸드오프 → 단일 HTML 앱으로 즉시 배포"**
- **주요 과제**: 디자인 도구에서 내보낸 HTML 프로토타입을 검토·수정하고 프로덕션 URL에 배포.
- **핵심 성과**:
    - **디자인 구현**: `showmethemoney-handoff.zip` 수령 후 `showmethemoney.html` 추출 및 JSX 문법 버그(잉여 `}`) 수정.
    - **앱 구조**: CDN React 18 + Babel 기반 단일 HTML 파일 — 빌드 없이 동작. 6개 화면(홈/내역/프라이빗/SOS/정산/설정) + 공통 컴포넌트(BudgetRing, NumPad, TxRow, InputSheet 등) 완비.
    - **배포 방식**: `.vercel/output/static/index.html` 구조 생성 후 `npx vercel deploy --prebuilt --prod` 실행.
    - **현재 상태**: Mock 데이터 기반 정적 앱. Supabase 실연동은 차기 단계.
- **배포 URL**: https://showmethemoney-eta.vercel.app
- **관련 문서**:
    - [_history/HANDOVER_V4_2026-04-22.md](_history/HANDOVER_V4_2026-04-22.md)

---

### 8단계: v4.0 상태 연동 및 기능 동적화 (2026.04.22)
**"MOCK 데이터 제거 및 localStorage 기반 앱 로직 완성"**
- **주요 과제**: 정적 HTML 디자인의 하드코딩된 MOCK 데이터를 걷어내고 실제 동작 가능한 가계부 시스템 구현.
- **핵심 성과**:
    - **상태 아키텍처 확립**: localStorage 기반으로 `smtm_transactions`, `smtm_budget` 등 전역 상태 관리 체계 도입 및 `loadTransactions` 등의 헬퍼 함수 구현.
    - **크리티컬 버그 수정**: 과거 기간 통합 지출 합산 버그(`getCurrentMonthTx` 도입으로 당월 계산), `InputSheet` 폼 상태 초기화 누락, 날짜 계산 오차 해결.
    - **주요 뷰 동적화**: `PrivateView` 내 시크릿 지출 동적 연동, `HomeView` 예산 링 동적 계산, `AllowanceCard` 및 `MiniCalendar`의 트랜잭션 실시간 동기화 연동.
    - **안정성 강화**: `SOSView`, `SettlementView` 크래시 방지 및 설정(`FixedCostsPage`, `CardManagementPage`) 영속화 도입.
- **관련 문서**:
    - [_history/plan_functional_2026-04-22_0213.md](_history/plan_functional_2026-04-22_0213.md)

---

---

### 9단계: v4.0 실시간 동기화 및 편의 기능 고도화 (2026.04.22)
**"Supabase Realtime 기반 파트너 동기화 및 유연한 예산 관리 적용"**
- **주요 과제**: 단일 기기 데모 수준의 한계를 넘어 실제 멀티 기기(파트너 간) 실시간 동기화 환경을 구축하고, 하드코딩되었던 예산 및 날짜 조회 기능을 동적으로 확장.
- **핵심 성과**:
    - **실시간 데이터 동기화**: `@supabase/supabase-js` CDN을 `showmethemoney.html`에 연동하고, `Channel Broadcast`를 통해 데이터베이스 수정 없이도 파트너 기기 간 실시간 지출 내역 동기화(sync_tx) 구현 완료.
    - **유연한 시점 조회(Month Toggle)**: `MiniCalendar`와 `HistoryView` 내부에 각각의 기준월(viewDate) 상태를 관리하는 컨트롤(이전 달/다음 달 이동)을 추가하여 과거 지출 이력을 손쉽게 추적 가능.
    - **가족 예산 편집**: `SettingsView` 내에 설정된 예산을 동적으로 수정하고 `localStorage`와 전역 앱 상태에 즉각 연동하는 폼(Form) 구축 완료.
    - **타입 안정성 준수**: 모든 신규 데이터 로직을 추가하며 `any`나 `unknown` 사용 없이 엄격한 JSDoc 타입 원칙을 고수하여 버그 발생 원천 차단.
- **핫픽스 (v4.0.1)**: 
    - **버그 수정**: `SettingsView` 호출 시 `inviteCode` props 수신 누락으로 인한 설정창 진입 크래시 해결.
    - **배포 최적화**: Vercel 빌드 시 기존 Vite 설정과의 충돌로 인한 404 에러를 방지하기 위해 `package.json` 빌드 스크립트를 단일 HTML 추출 방식으로 변경하여 배포 안정성 확보.
- **배포 URL**: https://showmethemoney-eta.vercel.app
- **관련 문서**:
    - [_history/plan_functional_2026-04-22_0213.md](_history/plan_functional_2026-04-22_0213.md) (완료 마킹)

---

### 10단계: 데이터 초기화 기능 고도화 및 세분화 (2026.04.22)
**"사용자 선택형 데이터 삭제 및 안전한 초기화 시스템 구축"**
- **주요 과제**: 기존에 동작하지 않던 '앱 초기화' 기능을 구현하고, 전체 삭제 외에 특정 범주의 데이터만 선택하여 삭제할 수 있는 세분화된 관리 기능 도입.
- **핵심 성과**:
    - **ResetSheet 도입**: 하단 시트(Bottom Sheet) 인터페이스를 통해 지출 기록, 가족 설정, 결제 수단, 보안 설정 등 4가지 범주를 개별 선택할 수 있는 UI 구현.
    - **범주별 정밀 삭제**: `localStorage`의 수십 개 키값을 범주별로 매핑하여 의도한 데이터만 정확히 제거하는 로직(`handleResetAction`) 완성.
    - **안전 장치**: 삭제 전 최종 컨펌 팝업 및 초기화 후 자동 앱 리로드(`window.location.reload()`) 처리를 통해 데이터 정합성 유지.
    - **UX 최적화**: PIN 초기화 시 시스템 기본값(1234)으로의 자동 복구 로직 연동.
    - **버그 수정**: 지출 초기화 후에도 MOCK 데이터가 다시 로드되던 현상 수정 (`loadTransactions` 로직 보완).
- **배포 URL**: https://showmethemoney-eta.vercel.app
- **관련 문서**:
    - [plan_reset_2026-04-22_1345.md](file:///Users/dongpayuk/.gemini/antigravity/brain/c2b55a4c-038c-4771-b7e8-79705e64d3ac/plan_reset_2026-04-22_1345.md)

---

### 11단계: 캘린더 일정 관리 고도화 및 실시간 동기화 (2026.04.22)
**"지출 내역과 별개로 작동하는 독립적 일정 등록 시스템 구축"**
- **주요 과제**: 단순 메모 기능을 넘어선 다중 일정 등록, 수정, 삭제 및 상태 관리 기능 도입.
- **핵심 성과**:
    - **데이터 구조 확장**: `smtm_calendar_notes`를 단순 문자열에서 객체 배열(`Array<{id, text, done}>`)로 확장하고 하위 호환 마이그레이션 적용.
    - **일정 관리 UI**: 캘린더 하단에 일정 목록(ToDo List)을 렌더링하고, 인라인 추가/삭제/체크 및 클릭 수정 기능을 구현.
    - **전역 상태화 및 동기화**: 일정을 `App` 전역 상태로 관리하고 Supabase Channel을 통한 실시간 동기화(`sync_notes`)를 적용하여 부부 간 실시간 공유 가능.
    - **UX 디테일**: 일정이 있는 날짜에 노란색 점 표시 및 주말/오늘 날짜 강조 유지.
- **배포 URL**: https://showmethemoney-eta.vercel.app

---

## 📂 문서 분류 가이드 (Quick Reference)

| 분류 | 내용 | 위치 |
|---|---|---|
| **분석 (Research)** | 프로젝트 아키텍처, 기술 스택, 코드 리뷰 결과 | `_history/research_*.md` |
| **계획 (Plan)** | 신규 기능 설계, 마일스톤, UI/UX 디자인 가이드 | `_history/plan_*.md`, `uiux guide/` |
| **구현 (Implementation)** | 특정 기능의 상세 구현 내역 및 기술적 난제 해결 과정 | `_history/implementation_plan*.md` |
| **운영 (Management)** | 인계 문서, 배포 가이드, 메인 이력 기록 | `_history/HANDOVER_*.md`, `DEPLOYMENT.md`, `PROJECT_HISTORY.md` |

---
*본 마스터 히스토리는 신규 기술적 성취가 있을 때마다 최신화됩니다.*

