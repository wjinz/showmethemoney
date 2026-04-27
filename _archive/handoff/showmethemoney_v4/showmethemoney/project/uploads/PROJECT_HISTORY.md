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
    - [uiux guide/plan.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/uiux%20guide/plan.md)
    - [_history/research_2026-04-07_103534.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/research_2026-04-07_103534.md)
    - [_history/HANDOVER_V3.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/HANDOVER_V3.md)

---

### 2단계: 시스템 정밀 진단 및 구조 최적화 (2026.04.13)
**"코드베이스의 비대화 해결 및 데이터 무결성 강화"**
- **주요 과제**: 중복 코드 제거 및 RDB 마이그레이션 기반 마련.
- **핵심 성과**: 
    - 프로젝트 전체 소스코드 감사를 통한 불필요한 레거시(`budget-v2`) 및 아카이브 파일 정리 가이드 수립.
    - 기존 JSONB 방식에서 정규화된 `transactions` 테이블로의 데이터 구조 전환 계획 확정.
    - 로컬 오프라인 큐와 Supabase Realtime 간의 동기화 안정성 검증.
- **관련 문서**:
    - [_history/research_2026-04-13_1154.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/research_2026-04-13_1154.md)
    - [_history/research_2026-04-13_1221.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/research_2026-04-13_1221.md)

---

### 3단계: AI 엔진 고도화 및 기능 안정화 (2026.04.14 ~ 04.15)
**"Gemma 4 도입과 엣지 케이스 버그 완전 해결"**
- **주요 과제**: AI 모델 최적화 및 복잡한 입력 로직의 정확도 향상.
- **핵심 성과**: 
    - **AI 최적화**: Gemma 4 31B를 메인 엔진으로 채택, 이미지 흑백 변환 및 리사이즈 전처리를 통해 API 응답 속도 및 비용 대폭 절감.
    - **근무표 파서**: 수기 입력 시 다양한 공백 문자를 지원하는 견고한 파서 개발 및 `M(낮12시)` 근무 코드 정식 반영.
    - **안정성 확보**: 이미지 대량 분석 시 발생하는 브라우저 캐시 및 렌더링 크래시 이슈 해결.
- **관련 문서**:
    - [_history/implementation_plan1955.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/implementation_plan1955.md)
    - [_history/implementation_plan2013.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/implementation_plan2013.md)
    - [_history/implementation_plan2052.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/implementation_plan2052.md)

---

### 4단계: v4.0.0 완성 및 심층 분석 (2026.04.15 ~ 현재)
**"준비된 프리미엄 가계부 솔루션의 최종 검증"**
- **주요 과제**: 프로젝트의 지속 가능한 성장을 위한 지식 창고 구성.
- **핵심 성과**: 
    - **Antigravity 보고서**: 전반적인 아키텍처, 상태 관리 흐름, 동기화 메커니즘을 20여 개 섹션으로 나누어 심층 분석.
    - **보안 및 테마**: 3가지 테마(`dark`, `light`, `oldschool`) 시스템과 관리자 모드, 개인 정보 보호 기능을 비즈니스 로직에 완전 통합.
    - **미래 과제 도출**: 다중 자녀 지원, 데이터 무결성 강화를 위한 트랜잭션 처리 등 향후 고도화 로드맵 제시.
- **관련 문서**:
    - [_history/research_2026-04-15_1500.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/research_2026-04-15_1500.md)
    - [PROJECT_HISTORY.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/PROJECT_HISTORY.md) (본 문서)

---

### 5단계: 지출 입력 시스템 완성과 Bulk OCR 고도화 (2026.04.16)
**"다크모드 완벽 대응 및 네트워크 속도 최적화"**
- **주요 과제**: 카드 앱 스크린샷 인식 실패 해결 및 대용량 이미지 전송 병목 제거.
- **핵심 성과**: 
    - **Bulk OCR 혁신**: 다크모드 인식률 저해 요소(흑백 필터) 제거 및 컬러 보존 로직 적용. 요일("(일)", "(월)") 및 상대적 날짜("어제", "오늘") 변환 규칙 완성.
    - **네트워크 최적화**: 무손실 PNG 대신 WebP/JPEG(0.8) 가변 압축 도입으로 업로드 용량 50~70% 절감.
    - **데이터 복원력**: AI 파싱 실패 시에도 정규식을 통해 유효한 항목을 긁어내는 `extractBulkItemsFallback` 방어 레이어 구축.
    - **UX 자동화**: 영수증 스탬프 촬영 즉시 폼으로 진입, 최근 패턴 기반 '빠른 입력 칩' 연동으로 입력 피로도 최소화.
    - [_history/plan_expense-entry_2026-04-16_0120.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/plan_expense-entry_2026-04-16_0120.md)
    - [_history/implementation_plan0416_1435.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/_history/implementation_plan0416_1435.md)

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
    - [plan_2026-04-20_0932.md](file:///Users/dongpayuk/wjin_forwork/%EC%96%B4%ED%94%8C%EA%B0%9C%EB%B0%9C_%EC%9A%B0%EC%A7%84%EC%A7%80%EC%97%B0%20budget/plan_2026-04-20_0932.md)

---

## 📂 문서 분류 가이드 (Quick Reference)

| 분류 | 내용 | 위치 |
|---|---|---|
| **분석 (Research)** | 프로젝트 아키텍처, 기술 스택, 코드 리뷰 결과 | `research_*.md` |
| **계획 (Plan)** | 신규 기능 설계, 마일스톤, UI/UX 디자인 가이드 | `plan_*.md`, `uiux guide/` |
| **구현 (Implementation)** | 특정 기능의 상세 구현 내역 및 기술적 난제 해결 과정 | `implementation_plan*.md` |
| **운영 (Management)** | 인계 문서, 배포 가이드, 메인 이력 기록 | `HANDOVER_*.md`, `DEPLOYMENT.md`, `README.md` |

---
*본 마스터 히스토리는 신규 기술적 성취가 있을 때마다 최신화됩니다.*
