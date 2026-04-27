# [AI Agent Handover] 지능형 공유 가계부 UI/UX 디자인 시스템 및 구현 가이드

이 문서는 AI 코딩 어시스턴트(Claude, Antigravity 등)가 '지능형 공유 가계부'의 고도화된 UI/UX 디자인 시스템을 명확하게 이해하고, 향후 백엔드 연동(RDB 마이그레이션) 및 기능 확장 시 일관된 디자인 철학을 유지할 수 있도록 작성된 세부 가이드입니다.

---

## 1. 핵심 디자인 철학 (Design Philosophy)

본 애플리케이션은 3가지 성공적인 앱의 디자인 패턴을 차용하여 설계되었습니다.

1. **Toss (토스) 스타일 - "Effortless Clear" (공동 가계부)**
   * **목표**: 극단적인 단순함과 직관성.
   * **특징**: 핵심 숫자(남은 예산)를 거대한 타이포그래피로 강조. 복잡한 정보는 숨기고 직관적인 카드 레이아웃 사용.
2. **Apple Wallet / 현대카드 스타일 - "Premium Stealth" (프라이빗 월렛)**
   * **목표**: 프리미엄 감성과 보안에 대한 심리적 안정감.
   * **특징**: 딥 다크 그레이와 블랙의 깊이감, 네온 포인트 컬러, 고급스러운 그라데이션 블랙 카드 UI.
3. **Honeydue 스타일 - "Empathetic Interaction" (AI & SOS 결재)**
   * **목표**: 부부 간의 돈 문제로 인한 스트레스 완화.
   * **특징**: 딱딱한 폼 대신 대화형(Conversational) 마이크로 카피 사용("얼마가 필요한가요? 🥺"). 부드럽고 쫀득한 애니메이션.

---

## 2. 테마 및 컬러 시스템 (CSS Variables)

앱은 `data-theme` 속성을 통해 뷰에 따라 동적으로 테마가 전환됩니다. **새로운 UI 컴포넌트 작성 시 반드시 하드코딩된 색상 대신 아래의 CSS 변수를 사용해야 합니다.**

### 2.1. Joint Theme (공동 가계부 - Light)
* `--theme-bg`: `#F4F6F8` (배경 - 옅은 회색)
* `--theme-surface`: `#FFFFFF` (카드 표면 - 흰색)
* `--theme-primary`: `#1C2B4A` (주조색 - 네이비, 텍스트 강조용)
* `--theme-secondary`: `#7A9E87` (보조색 - 세이지 그린, 긍정/안전 상태용)
* `--theme-text`: `#111827` (기본 텍스트)
* `--theme-text-muted`: `#6B7280` (보조 텍스트)
* `--theme-border`: `#E5E7EB` (경계선)

### 2.2. Private Theme (프라이빗 월렛 - Dark)
* `--theme-bg`: `#121212` (배경 - 완전한 다크)
* `--theme-surface`: `#1E1E1E` (카드 표면 - 다크 그레이)
* `--theme-primary`: `#1A1A1A` (주조색 - 차콜)
* `--theme-secondary`: `#E8715A` (보조색 - 코랄, 비밀/경고 상태용)
* `--theme-text`: `#F9FAFB` (기본 텍스트 - 흰색 계열)
* `--theme-text-muted`: `#9CA3AF` (보조 텍스트)
* `--theme-border`: `#374151` (경계선)

---

## 3. 타이포그래피 및 쉐이프 (Typography & Shape)

* **폰트**: `Pretendard` (숫자 가독성 극대화).
* **강조**: 핵심 금액이나 타이틀은 `font-extrabold` (800) 및 `tracking-tight` (자간 축소) 적용.
* **모서리 곡률 (Border Radius)**:
  * 메인 카드 및 바텀 시트: `rounded-3xl` (24px) 또는 `rounded-[2rem]` (32px) 사용하여 부드럽고 모던한 느낌 강조.
  * 작은 버튼 및 칩: `rounded-2xl` (16px).
* **그림자 (Shadow)**: `shadow-sm`을 기본으로 사용하되, 플로팅 액션 버튼(FAB)이나 블랙 카드 대시보드에는 `shadow-2xl` 또는 컬러가 들어간 글로우 효과(예: `shadow-black/50`)를 사용하여 깊이감 부여.

---

## 4. 주요 뷰 및 컴포넌트 구현 명세

### 4.1. HomeView (`/src/views/HomeView.tsx`)
* **헤더**: `text-4xl font-extrabold`로 남은 예산을 화면 최상단에 거대하게 배치.
* **예산 링**: SVG와 `framer-motion`을 결합하여 마운트 시 0에서 목표치까지 차오르는 애니메이션 적용.
* **AI 소비 코치**: 말풍선 형태의 UI. `bg-gradient-to-r`을 사용하여 은은한 블루/인디고 그라데이션 적용.
* **SOS 결재 카드**: 좌측에 붉은색 띠(`w-1 bg-red-400`)를 두어 티켓(Ticket) 형태의 디자인 구현.

### 4.2. PrivateView (`/src/views/PrivateView.tsx`)
* **PIN 패드**: iOS 잠금화면 스타일. 둥근 버튼(`rounded-full w-20 h-20`). 오류 시 `framer-motion`의 x축 keyframes(`x: [-10, 10, -10, 10, 0]`)를 사용하여 흔들림(Shake) 애니메이션 구현.
* **블랙 카드 대시보드**: `bg-gradient-to-br from-gray-800 via-gray-900 to-black` 적용. 내부에 `blur-3xl`이 적용된 원형 div를 절대 위치(`absolute`)로 배치하여 프리미엄 카드의 빛 반사 효과 시뮬레이션.

### 4.3. ActionSheets (`/src/components/ActionSheets.tsx`)
* **바텀 시트**: `y: '100%'`에서 `0`으로 올라오는 스프링 애니메이션(`type: 'spring', damping: 25, stiffness: 200`).
* **드래그 핸들**: 시트 상단 중앙에 `w-12 h-1.5 rounded-full` 형태의 핸들 바 추가.
* **입력 폼**: `focus-within:ring-2`를 사용하여 입력 창 활성화 시 시각적 피드백 제공.

### 4.4. BottomNav (`/src/components/BottomNav.tsx`)
* **글래스모피즘**: `bg-[var(--theme-surface)]/90 backdrop-blur-xl` 적용.
* **FAB (Floating Action Button)**: 중앙 `[+]` 버튼은 `transform -translate-y-6`로 위로 띄우고, 그라데이션 배경과 두꺼운 테두리(`border-4 border-[var(--theme-bg)]`)를 주어 배경과 분리.

---

## 5. AI 에이전트 행동 지침 (Strict Guidelines for AI)

이 프로젝트의 코드를 수정하거나 새로운 기능을 추가할 때 다음 원칙을 절대적으로 준수하십시오.

1. **테마 변수 강제 사용**: `bg-white`, `text-gray-900` 등의 하드코딩된 Tailwind 색상 클래스 사용을 금지합니다. 반드시 `bg-[var(--theme-surface)]`, `text-[var(--theme-text)]` 형태를 사용하십시오. (단, AI 스캔의 파란색, SOS의 빨간색 등 특정 기능의 포인트 컬러는 예외적으로 허용)
2. **애니메이션 보존**: 컴포넌트가 조건부로 렌더링될 때는 반드시 `<AnimatePresence>`로 감싸고, `<motion.div>`를 사용하여 `initial`, `animate`, `exit` 속성을 부여하십시오. 팝업/모달은 뚝 끊기며 나타나서는 안 됩니다.
3. **대화형 마이크로 카피**: 폼 라벨이나 안내 문구를 작성할 때 기계적인 텍스트("금액 입력", "사유") 대신 사용자 친화적인 텍스트("얼마가 필요한가요?", "어디에 쓸 건가요? 🥺")를 유지하십시오.
4. **RDB 마이그레이션 시 주의점**: Supabase 등 실제 DB를 연동할 때, UI 컴포넌트의 시각적 구조(클래스명, 모션 속성)를 건드리지 말고 데이터 페칭 로직(useEffect, 상태 관리)만 교체하십시오.

**[End of Document]**
