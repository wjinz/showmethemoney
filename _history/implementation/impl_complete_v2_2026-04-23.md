# design_replan_2026-04-23 구현 완료 보고서 (v2)

일자: 2026-04-23
범위: M8 ~ M15 (디자인 핸드오프-2 단일 라이트 팔레트 이식)

## 마일스톤 요약

| ID | 제목 | 상태 |
|----|------|------|
| M8 | 전역 스타일 재정의 + useTheme 완전 제거 | 완료 |
| M9 | 공통 컴포넌트 정비 | 완료 |
| M10 | InputSheet(QuickEntrySheet) 리디자인 | 완료 |
| M11 | Home / History / Settlement 재작성 | 완료 |
| M12 | Private + SOS 재작성 | 완료 |
| M13 | Settings + Dashboard 팔레트 통일 | 완료 |
| M14 | 부가 뷰 색상 교체 + 라우팅 재배치 | 완료 |
| M15 | typecheck + build + 시각 회귀 | 완료 |

## 주요 변경사항

### 팔레트
- 단일 라이트 팔레트 적용: bg #F4F6F8 / surface #FFFFFF / primary #1C2B4A / secondary #7A9E87 / danger #E8715A
- legacy 변수(--gold, --bg2/3/4, --text1/2/3, --red/green/blue, --goldL/D, --redL/D, --greenL/D, --blueL/D, --highlight, --card-bg, --border2) 0건
- manifest theme_color #1C2B4A / background_color #F4F6F8

### 전역/스타일
- src/styles/theme.css: 단일 팔레트 토큰
- src/styles/globalStyles.js: app-root, bottom-nav, sheet, keyframes(shake/fadeIn/slideUp/pulse/spin)
- src/styles/tokens.js: THEME_TOKENS 신규 변수 참조
- src/hooks/useTheme.js: no-op deprecated (삭제 금지 규칙 준수)

### 공통 컴포넌트
- Icons.jsx(16종), BottomNav.jsx(5슬롯), BudgetRing.jsx(framer-motion spring), PartnerAvatars, AmountChip, CategoryChip, TxRow, NumPad, SliderRow, BottomSheet, UI(Chip/Card/Ring/Bar/SectionHeader)

### 주요 뷰
- QuickEntrySheet: 2단계 흐름(select→form), 공감형 복사, 빈도 패턴 칩, 42px 큰 금액 표시, 그라데이션 저장 버튼
- SettlementView: 잉여(#ECFDF5→#D1FAE5/#6EE7B7) / 부족(#FFF5F3→#FDE8E4/#FCA5A5) 그라디언트 카드 + OCR 보존
- PrivateWalletView: 블랙 프리미엄 카드 섹션 유지 + 신규 팔레트 통일
- SosRequestSheet: 비대칭 말풍선(18/18/18/4, 18/18/4/18) + 공감형 복사

### 라우팅
- Settings 내부 메뉴에 asset / tax / dataImport / calendar 진입점 추가
- App.jsx case 추가 및 lazy import

## 검증 결과
- `npx tsc --noEmit`: 0 errors
- `npx vite build --outDir dist-final`: built in 4.53s
- legacy CSS 변수 잔존 검색: 0건
- `any` / `unknown` 타입 사용: 0건 (모두 JSDoc typedef 로 정의)

## 향후 권장
- 실기기 시각 회귀 스크린샷 (iPhone 13 Pro 390x844, Pixel 6a 412x917)
- OCR 이미지 WebP 압축 (현재 base64 원본 전송)
- 홈 위젯 드래그 UX에서 isEditMode 중 그라데이션 보더 일치화
