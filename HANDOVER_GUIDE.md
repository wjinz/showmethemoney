# [AI Agent Handover] 지능형 공유 가계부 (Smart Family Budget App) 개발 가이드

이 문서는 AI 코딩 어시스턴트(Claude, Antigravity 등)가 '지능형 공유 가계부' 프로젝트의 컨텍스트를 즉시 파악하고, 일관된 디자인 철학과 코드 베이스 위에서 작업을 이어나갈 수 있도록 작성된 핸드오버 가이드입니다.

---

## 1. 프로젝트 개요 (Project Overview)
*   **앱 이름**: 지능형 공유 가계부
*   **대상 사용자**: 부부 (남편/아내 2인 공유 모드)
*   **핵심 철학**: "숨기지 않되 감시하지 않는다" — 투명한 공동 재무 관리와 개인의 프라이버시(비상금)를 동시에 존중합니다.
*   **기술 스택**: React 18, Vite, Tailwind CSS, Framer Motion (애니메이션), Lucide React (아이콘), Google Gemini 2.5 Flash (AI 분석)

---

## 2. 핵심 디자인 철학 및 테마 시스템 (Design System)

이 앱은 **듀얼 테마 시스템(CSS Variables)**을 사용하여 공간의 분리감을 극대화합니다. `index.css`에 정의된 CSS 변수를 활용하세요.

### 2.1. 공동 가계부 (Joint Mode) - `data-theme="joint"`
*   **무드**: 신뢰감, 안정감, 밝고 깔끔함
*   **배경색 (`--theme-bg`)**: `#F4F6F8` (Light Gray)
*   **표면색 (`--theme-surface`)**: `#FFFFFF` (White)
*   **주조색 (`--theme-primary`)**: `#1C2B4A` (Navy)
*   **보조색 (`--theme-secondary`)**: `#7A9E87` (Sage Green)

### 2.2. 프라이빗 월렛 (Private Mode) - `data-theme="private"`
*   **무드**: 은밀함, 개인적, 세련됨
*   **배경색 (`--theme-bg`)**: `#121212` (Dark)
*   **표면색 (`--theme-surface`)**: `#1E1E1E` (Dark Gray)
*   **주조색 (`--theme-primary`)**: `#1A1A1A` (Charcoal)
*   **보조색 (`--theme-secondary`)**: `#E8715A` (Coral)

### 2.3. 타이포그래피 및 애니메이션
*   **폰트**: `Pretendard` (숫자 가독성 극대화)
*   **애니메이션**: `framer-motion` (`motion/react`)을 사용하여 뷰 전환(AnimatePresence), 액션 시트 슬라이드 업, 로딩 스피너 등을 부드럽게 처리합니다.

---

## 3. 주요 기능 및 UI/UX 플로우 (Core Features)

AI 에이전트는 다음 3가지 핵심 플로우의 UI/UX 의도를 훼손하지 않고 기능을 확장해야 합니다.

1.  **AI 영수증/카드 스캔 (Empathetic Intelligence)**
    *   **플로우**: `[+]` 버튼 -> `[영수증 스캔]` -> Gemini 로딩 애니메이션 (2.5초) -> 결과 폼 -> `[저장]`
    *   **디자인 포인트**: AI가 개입하는 영역은 반짝이는 아이콘(`Sparkles`)과 블루 톤을 사용하여 스마트한 느낌을 줍니다.
2.  **프라이빗 월렛 (Seamless Duality)**
    *   **플로우**: 하단 `[개인]` 탭 -> PIN 번호 4자리 입력 (잠금 화면) -> 다크 모드 대시보드 진입
    *   **디자인 포인트**: 공동 가계부와 완전히 다른 공간임을 인지하도록 배경색 크로스페이드와 스케일 애니메이션을 적용합니다.
3.  **SOS 긴급 결재 시스템 (Glanceable Communication)**
    *   **플로우**: `[+]` -> `[SOS 긴급 결재]` -> 사유 작성 후 요청 -> 홈 화면 상단에 붉은색 '결재 대기 카드' 노출 -> 배우자 승인 시 지출 내역 자동 추가
    *   **디자인 포인트**: 돈 문제로 인한 스트레스를 줄이기 위해 '애교있게 조르기 🥺' 등 유쾌한 마이크로 카피를 사용합니다.

---

## 4. 현재 코드 구조 (Code Structure)

현재 프로토타입은 `/src/App.tsx` 단일 파일에 주요 뷰가 모여 있습니다. (추후 컴포넌트 분리 필요)

*   `App`: 전역 상태 관리 (view, activeSheet, sosRequests, jointTx), 테마 전환(`useEffect`), 하단 네비게이션, 액션 시트 오버레이 렌더링
*   `HomeView`: 예산 링(SVG), AI 소비 코치(Nudge), 최근 지출 내역, SOS 결재 대기 카드 렌더링
*   `PrivateView`: PIN 인증 화면, 다크 모드 비상금 대시보드
*   `MainActionSheet`, `AiScanSheet`, `SosRequestSheet`: 하단에서 올라오는 바텀 시트 컴포넌트들

---

## 5. AI 에이전트 작업 지침 (Instructions for AI Agent)

이 문서를 읽은 AI 에이전트는 다음 원칙을 준수하여 코드를 작성하세요.

1.  **스타일링 원칙**: 모든 새로운 컴포넌트는 Tailwind CSS 유틸리티 클래스와 `var(--theme-*)` CSS 변수를 혼합하여 작성하세요. 하드코딩된 색상(예: `bg-blue-500`)은 AI 스캔 로딩 등 특정 포인트에만 제한적으로 사용하세요.
2.  **애니메이션 유지**: 컴포넌트 마운트/언마운트 시 반드시 `framer-motion`의 `<motion.div>`와 `<AnimatePresence>`를 사용하여 부드러운 전환을 유지하세요.
3.  **컴포넌트 분리 (Next Step)**: 현재 `App.tsx`가 비대해졌으므로, 본격적인 백엔드(Supabase) 연동 전에 `HomeView`, `PrivateView`, `ActionSheets` 등을 `/src/components/` 및 `/src/views/` 폴더로 리팩토링하는 작업을 우선적으로 고려하세요.
4.  **데이터 모델링**: 지출 내역(`transactions`)은 반드시 `is_private` (boolean) 플래그를 가져야 하며, 프라이빗 지출은 공동 가계부 뷰에서 절대 노출되지 않도록 필터링 로직을 엄격하게 적용하세요.

**[End of Document]** 이제 위 가이드를 바탕으로 사용자의 다음 지시를 수행하세요.
