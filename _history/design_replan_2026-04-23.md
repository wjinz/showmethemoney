# 디자인 재구성 계획 (new design, old function)

작성일 2026-04-23
업로드 참조: uploads/index.html, uploads/showmethemoney.html, uploads/app.jsx, uploads/components.jsx, uploads/views.jsx

## 1. 문제 인식

- 배포/로컬 화면에서 UI가 이전 어두운 골드 테마(구버전)로 렌더
- 루트 index.html 은 이미 새 디자인 토큰만 정의
- src/views/*, src/components/* 는 구버전 토큰(--gold, --bg2~4, --text2/3, --blueD, --red)을 참조
- src/hooks/useTheme.js 가 data-theme=joint/private/kids 를 주입 → 구버전 토큰 세트를 상속
- 결과: shell 은 새 디자인, 내용은 구버전

## 2. 정답지 매핑

새 디자인 = uploads/ 5개 파일
- index.html, showmethemoney.html — CSS 토큰 및 shell
- components.jsx — Icons, BottomNav, BudgetRing, NumPad, CategoryChip, AmountChip, PartnerAvatars
- views.jsx — HomeView, HistoryView, PrivateView, SOSView, SettlementView, InputSheet, TxRow
- app.jsx — App shell, sheet 애니메이션

기능 유지 = 현재 src/ 기반
- Supabase realtime, offlineQueue, Gemini AI 3종, OCR, Private PIN, Kids Mode, 위젯 대시보드, PWA

## 3. 토큰 교체 맵

| 이전 (구버전) | 새 (정답지) | 값 |
|---|---|---|
| --bg, --bg2, --bg3, --bg4 | --bg, --surface | #F4F6F8 / #FFFFFF |
| --gold, --goldD, --goldL | --primary | #1C2B4A |
| --blue, --blueD, --blueL | --secondary | #7A9E87 |
| --red | --danger | #E8715A |
| (신규) | --warning | #F59E0B |
| --text | --text | #111827 |
| --text2 | --muted | #6B7280 |
| --text3 | --hint | #9CA3AF |
| --border | --border | #E5E7EB |
| (신규) | --border-lite | #F3F4F6 |
| (신규) | --shadow | 0 1px 3px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.05) |

## 4. 3테마 시스템 처리  [결정: useTheme.js 파일 자체 완전 제거]

- useTheme.js: joint/private 구분 제거, Kids 만 조건부 유지  [최종: 파일 자체 삭제, data-theme 주입 없음]
- Private 뷰는 컴포넌트 내부에서 #121212 배경 직접 지정  [유지]
- Kids Mode: data-theme="kids" 유지 + 전용 팔레트 블록 src/index.css 에 분리  [최종: Kids 조건 및 팔레트 블록 모두 삭제. Kids Mode UI 테마 차등 없음. Kids Mode 기능 로직(kidsStore/프로필/미션)은 유지하되 시각 테마는 단일 라이트 팔레트 공유]
- body class 토글(Antigravity 제안 14-💡-2) 방식도 불채택  [사용자 지시: kids 조건도 삭제]

## 5. 타이포그래피 표준

- Font: Pretendard Variable
- Size: 10/11/12/13/14/15/16/18/20/22/32/38/42
- Weight: 500/600/700/800/900
- Letter-spacing: -0.5px (20~22), -1.5px (32~42 hero)
- Line-height: 1.1 (hero), 1.5 (본문)

## 6. 색상 규칙

| 역할 | 색 |
|---|---|
| me (본인) | #1C2B4A |
| partner (배우자) | #7A9E87 |
| danger / SOS / 초과 | #E8715A |
| warning (65~85%) | #F59E0B |
| text primary | #111827 |
| text muted | #6B7280 |
| text hint | #9CA3AF |
| border | #E5E7EB |
| border-lite | #F3F4F6 |
| bg pale | #F9FAFB |

## 7. 카드/시트/FAB 표준

- .card: radius 24px, shadow var(--shadow), padding 20px
- .sheet: radius 28px 28px 0 0, max-height 92%, cubic-bezier transform
- .overlay: rgba(0,0,0,.35)
- .nav-fab: 56x56, linear-gradient(135deg, #1C2B4A, #2d4270), border 4px solid var(--bg)
- .bottom-nav: 84px, rgba(255,255,255,.93) + backdrop-filter blur(20px)

## 8. 네비게이션 구조  [결정: (A) 업로드판 4탭 + FAB 채택 완료]

업로드판: 홈 / 내역 / FAB(+) / 프라이빗 / 정산  ← 최종
기존 src: 홈 / 리포트 / 자산 / 프라이빗 / 설정 (항목 불일치) → 사용자 확인 #1  [결론: A 채택]

이동 규칙 (기존 뷰를 어디로 숨길지)
- Report / Asset / Tax / Budget / Kids / DataImport / Admin / BugReport → Settings 내부의 메뉴 그리드(이미 존재) 또는 History 탭 내부 서브탭으로 이동
- Settings 진입점: 홈 화면 우상단 헤더에 프로필/톱니 아이콘(Antigravity 권고 14-🔴-1의 Depth 이동 아이디어 차용). 단, 바텀 탭은 4개로 고정
- Private PIN 잠금 상태에서는 바텀 내비 숨김 (기존 동일)

## 9. 재작업 대상 맵

### 9.1 전역 스타일
- src/index.css : :root 새 토큰 교체, 공통 클래스 표준화, data-theme 블록 정리
- [반영 14-🔴-2] src/index.css 를 '수정'이 아닌 **완전 덮어쓰기**. 업로드판 index.html 의 <style> 블록 전체를 그대로 이식. 구버전 .phone-shell/.card/.bottom-nav 등 클래스 정의 중복/충돌 제거
- 정산 그라디언트 색 확장 토큰 추가: --success-bg1 #ECFDF5 / --success-bg2 #D1FAE5 / --success-border #6EE7B7 / --danger-bg1 #FFF5F3 / --danger-bg2 #FDE8E4 / --danger-border #FCA5A5

### 9.2 공통 컴포넌트

| 파일 | 작업 |
|---|---|
| UI.jsx (Card, SectionHeader, StatTile) | 색상 토큰 교체 |
| BottomNav.jsx | 업로드판 SVG 아이콘 + 5항목 전면 교체 |
| BudgetRing.jsx | r=54, stroke 10, 128x128 + [반영 15.1] 진입 시 0→집행률 차오름 애니메이션 |
| TxRow.jsx (신설) | 좌측 컬러바 + 이름배지 + 메모/금액/날짜 |
| PartnerAvatars.jsx (신설) | 홈 헤더 |
| AmountChip.jsx (신설) | |
| CategoryChip.jsx (신설) | |
| NumPad.jsx (신설) | InputSheet 재사용 |
| QuickEntrySheet.jsx → InputSheet.jsx | tab / big amount / NumPad / privacy toggle / detail / gradient 저장버튼 + [반영 14-💡-1] 상단에 '자주 쓰는 패턴' 칩 가로 스크롤 보존 + [반영 15.1] spring(damping 25, stiffness 200) 애니메이션 |
| SliderRow.jsx | 색상만 교체 |

### 9.3 뷰

| 파일 | 신 디자인 구조 |
|---|---|
| HomeView | Header(PartnerAvatars+날짜) / Hero Budget Card(남은예산+Ring+진행바) / Today's Spending 2-col / AI Coach Card / SOS Quick Entry / Recent Tx |
| HistoryView | 월합계 카드 3분할 / 필터칩 row / TxRow 리스트 |
| PrivateView | PIN 잠금(#121212) → PrivateDashboard(블랙 그라디언트 카드 + 내역) + [반영 15.1] PIN 실패 시 x:[-10,10,-10,10,0] shake 애니메이션 + [반영 15.2] 블랙카드에 blur-3xl 원형 div 절대배치(Premium Stealth 리플렉션) |
| SOSView | 채팅 UI (좌우 버블, SOS 결재 카드 inline, Quick Amounts, Input) + [반영 15.2] 버블 비대칭 곡률: 지연 18px 18px 18px 4px / 나 18px 18px 4px 18px |
| SettlementView | Status Card + [반영 15.2] surplus linear-gradient(135deg,#ECFDF5,#D1FAE5) + #6EE7B7 border / deficit linear-gradient(135deg,#FFF5F3,#FDE8E4) + #FCA5A5 border / 카드결제 Breakdown / 현금 잔고 입력 |
| SettingsView | 기능 유지, 버튼/입력 색만 교체 |
| DashboardView (위젯 대시보드) | [반영 14-🔴-3] 외곽 래퍼를 .card 클래스로 강제 교체(패딩/마진 유지 경고 수용), 내부 색상 매핑 |
| Budget/Report/Asset/Tax/Kids/Admin/BugReport/DataImport | 버튼/카드/입력 색상만 교체 |

### 9.4 기타
- useTheme.js Kids 조건만 유지
- App.jsx theme/setTheme 찌꺼기 제거
- PWA manifest theme_color #1C2B4A

## 10. 단계별 구현 순서  [반영 15.4 프리미엄 디테일 마일스톤 매핑]

- M8 전역 스타일 재정의
  - src/index.css **완전 덮어쓰기** (업로드판 index.html <style> 블록 그대로)
  - useTheme.js **파일 삭제**, 호출부(App.jsx)에서 import/use 제거
  - 정산 그라디언트 확장 토큰 추가
- M9 공통 컴포넌트 정비 (UI/BottomNav/TxRow/NumPad/Avatars/Chip/Ring)
  - BudgetRing 진입 애니메이션 (15.1)
  - Icons 업로드판 SVG 세트로 교체
- M10 InputSheet 리디자인
  - spring(damping 25, stiffness 200) 바텀시트 (15.1)
  - 상단 '자주 쓰는 패턴' 칩 가로 스크롤 보존 (14-💡-1)
  - 공감형 마이크로 카피 ("어디에 쓰셨나요?" 등, 15.3)
- M11 HomeView / HistoryView / SettlementView 재작성
  - SettlementView 흑자/적자 그라디언트 + 테두리 색 (15.2)
- M12 PrivateView + SOSView 재작성
  - PrivateView: PIN shake 애니메이션 + blur-3xl 리플렉션 (15.1, 15.2)
  - SOSView: 채팅 버블 비대칭 곡률 (15.2)
- M13 SettingsView + DashboardView 팔레트 통일
  - 위젯 외곽 래퍼 .card 클래스 강제 교체 (14-🔴-3)
  - SettingsView: 홈 헤더 진입점으로 승격 (8절 이동 규칙)
- M14 나머지 부가 뷰 버튼/카드 색 교체
  - Report/Asset/Tax/Budget/Kids/DataImport/Admin/BugReport 를 Settings 내부 또는 History 서브탭으로 재배치 (8절)
- M15 typecheck + 빌드 + 시각 회귀 + Framer Motion 의존성 확인

각 단계 끝 npx tsc --noEmit 실행, any/unknown 금지.

## 11. 기능 보존 체크리스트

- Supabase realtime 구독 / postgres_changes + sos_requests
- offline queue flush / BG Sync
- Gemini AI (Nudge/Budget/Kids)
- OCR 영수증 파싱
  - [반영 15.3] Bulk OCR 업로드 시 WebP/JPEG(0.8) 압축 강제 (데이터/속도 50% 개선)
  - [반영 15.3] extractBulkItemsFallback 정규식 폴백 로직 useOcrScan 훅에 포함
- Private PIN + Supabase 암호화 저장
- 할부 / 카드 결제주기 계산
- Kids Mode 기능 (kidsStore/프로필/미션) 유지 — 단 시각 테마 분기는 제거 (4절)
- react-grid-layout 위젯 추가/제거
- PWA Share Target / Service Worker
- Export CSV / Admin 페이지 진입
- [반영 15.3] 공감형 마이크로 카피 전면 교체 ("사유 입력" → "어디에 쓰셨나요?" 등)

## 12. 분량 추정

- 수정 25~30 파일
- 신규 5 파일 (InputSheet, TxRow, NumPad, PartnerAvatars, AmountChip+CategoryChip)
- 삭제 1 파일 (src/hooks/useTheme.js)
- 의존성 추가 검토: framer-motion (Antigravity 15.1 반영 시 필요) — package.json 확인 후 결정
- M8~M15 한 세션 목표

## 13. 사용자 확인 필요 항목  (전 항목 답변 수신 완료)

1. 메뉴 구조  [결정: (A) 완료]
   - (A) 업로드판 {홈, 내역, 프라이빗, 정산} 4탭 + FAB  ← 채택
   - (B) 기존 src {홈, 리포트, 자산, 프라이빗, 설정} 유지 + 스타일만 교체
   - (C) 혼합 (홈/내역/프라이빗/정산 + 설정은 프로필 아이콘)

2. QuickEntrySheet → InputSheet 전면 교체 OK?  [결정: (A) 완료]
   - (A) 완전히 InputSheet 스타일로 교체  ← 채택
   - (B) 기존 QuickEntrySheet 유지 + 색상만 교체

3. Private 뷰 다크 테마(#121212) 유지 OK?  [결정: 유지 완료]

4. SOSView 채팅 UI 완전 교체 OK?  [결정: 완전 교체 완료]

5. react-grid-layout 위젯도 새 카드 스타일로 통일 OK?  [결정: 통일 완료]

6. useTheme.js 3테마 로직 제거 Kids 조건만 남김 OK?  [결정: Kids 조건도 삭제 완료 — useTheme.js 파일 자체 완전 제거, data-theme 주입 없음, body class 토글도 없음]

---

## 14. Antigravity의 추가 리뷰 및 개선 제안 (2026-04-23)

> **작성자: Antigravity**

작성하신 디자인 재구성 계획을 깊이 분석했습니다. 기존의 모듈형 구조(`src/`)에 새 디자인을 입히는 방향성은 매우 좋으나, **'디자인 무결성'**을 최우선으로 지키기 위해 다음 사항들을 강제/권장합니다.

### 🔴 필수 수정 및 방향성
1. **메뉴 구조(사용자 확인 항목 #1)에 대한 강력한 권장**  [결론: 부분 반영 — 사용자 선택은 (A), 단 설정 헤더 아이콘 아이디어와 Report/Asset 등 Depth 이동 규칙은 8절에 수용]
   - **(C) 혼합 (홈/내역/프라이빗/정산 + 설정은 헤더 아이콘)** 채택을 강력히 권장합니다.
   - 현재 업로드된 `index.html`의 하단 네비게이션(BottomNav) 형태를 그대로 유지해야 디자인 밸런스가 맞습니다. 기존 `src/`에 있던 `Report`, `Asset` 뷰 등은 하단 탭이 아닌, `History` 탭 내부의 서브 탭이나 `Settings` 메뉴 안으로 숨기는(Depth 이동) 방식이 디자인을 해치지 않습니다.
2. **CSS 및 전역 스타일 덮어쓰기 주의**  [결론: 완전 반영 — 9.1/M8에 명시]
   - 기존 `src/index.css`를 '수정'하려고 하지 마십시오. 현재 `index.html` 최상단에 정의된 `<style>` 블록 전체를 복사하여 `src/index.css`를 **완전히 덮어쓰는 것(Overwrite)**이 안전합니다. 구버전 CSS 클래스가 남아있으면 렌더링 충돌이 발생할 확률이 매우 높습니다.
3. **위젯 대시보드(DashboardView)에 대한 경고**  [결론: 완전 반영 — 9.3 DashboardView 행 및 M13에 명시]
   - 기존 `src/`의 `react-grid-layout` 위젯 구조를 그대로 가져가면서 내부 색상만 바꾸려 하면 (M13 단계), 패딩과 마진이 틀어져 `index.html`의 깔끔한 느낌이 훼손될 수 있습니다. 위젯 구조를 유지하더라도 외곽 카드(`Card`)의 형태는 `index.html`의 하드코딩된 `.card` CSS를 절대적으로 따르도록 클래스를 교체해야 합니다.

### 💡 추가 아이디어
1. **InputSheet의 통폐합 (사용자 확인 항목 #2)**  [결론: 완전 반영 — 9.2 InputSheet 행 및 M10에 '자주 쓰는 패턴' 칩 보존 명시]
   - **(A) 완전히 InputSheet 스타일로 교체**하는 것이 맞습니다. 다만 기존 `QuickEntrySheet`에 있던 '자주 쓰는 패턴(Frequent Pattern)' 기능은 새로운 `InputSheet`의 상단에 가로 스크롤(Chip) 형태로 작게 녹여넣으면 UX를 해치지 않으면서 기존 기능도 보존할 수 있습니다.
2. **`useTheme.js` 완전 제거 고려**  [결론: 완전 반영 + 초과 — 사용자 지시로 Kids 조건 및 body class 토글까지 모두 삭제, 즉 kids 테마 분기 자체 소거]
   - 3테마 시스템이 폐기되었고 Kids Mode 전용 팔레트 블록만 필요하다면, `useTheme.js`라는 복잡한 Context 훅을 유지할 이유가 없습니다. 전역 상태(`Zustand`의 `kidsStore` 등)에서 Kids 모드 토글 시 `document.body.classList.toggle('kids-mode')`를 호출하는 단순한 방식으로 전환하여 성능과 복잡도를 줄이는 것을 제안합니다.
3. Private 뷰 다크 테마(#121212) 유지 OK?

4. SOSView 채팅 UI 완전 교체 OK?

5. react-grid-layout 위젯도 새 카드 스타일로 통일 OK?

6. useTheme.js 3테마 로직 제거 Kids만 남김 OK?

---

## 15. showmethemoney-handoff-2 분석 및 보완 (2026-04-23)

> **보완 작성자: Antigravity**

사용자께서 제공하신 `showmethemoney-handoff-2` 및 관련 가이드 문서를 심층 분석한 결과, 기존 계획에 다음의 **프리미엄 디테일**을 반드시 추가하여 보완해야 합니다.

### 15.1 고도화된 애니메이션 및 인터랙션 (Framer Motion)  [반영: M9(Ring)/M10(Sheet)/M12(PIN)]
*   **바텀 시트 (ActionSheet)**: 단순한 `y` 이동이 아닌, `type: 'spring', damping: 25, stiffness: 200` 값을 적용하여 쫀득한 물리 효과를 구현해야 합니다.
*   **PIN 번호 오류 피드백**: 프라이빗 뷰 PIN 입력 실패 시, `x: [-10, 10, -10, 10, 0]`의 쉐이크(Shake) 애니메이션을 적용하여 즉각적인 시각적 피드백을 제공합니다.
*   **예산 링 (BudgetRing)**: 페이지 진입 시 링이 0에서 현재 집행률까지 차오르는 애니메이션을 필수로 적용합니다.

### 15.2 프리미엄 시각 효과 (Visual Effects)  [반영: M11(Settlement)/M12(Private+SOS)]
*   **블랙 카드 리플렉션**: `PrivateView`의 블랙 카드 UI에는 `blur-3xl`이 적용된 원형 `div`를 절대 위치로 배치하여, 카드의 빛 반사 효과(Premium Stealth)를 시뮬레이션합니다.
*   **정산 상태별 그라데이션**:
    *   **흑자(Surplus)**: `linear-gradient(135deg, #ECFDF5, #D1FAE5)` + 초록색 테두리.
    *   **적자(Deficit)**: `linear-gradient(135deg, #FFF5F3, #FDE8E4)` + 빨간색 테두리.
*   **채팅 버블 디테일**: `SOSView`의 메시지는 보낸 이에 따라 `18px 18px 18px 4px` (지연)와 `18px 18px 4px 18px` (나)로 곡률을 비대칭 적용하여 대화형 뉘앙스를 강조합니다.

### 15.3 기능적 보완 사항 (Functional Polish)  [반영: 11절(OCR 개선)/M10(공감형 카피)]
*   **Bulk OCR 최적화**: 이미지 전송 시 `WebP/JPEG (0.8)` 압축을 강제하여 데이터 사용량과 업로드 속도를 50% 이상 개선합니다.
*   **OCR Fallback**: AI 파싱 실패를 대비하여 정규식 기반의 `extractBulkItemsFallback` 로직을 `useOcrScan` 훅에 포함합니다.
*   **마이크로 카피**: 모든 텍스트를 "사유 입력" 대신 "어디에 쓰셨나요? 🥺"와 같은 **공감형(Empathetic) 문구**로 전면 교체합니다.

### 15.4 최종 수정 마일스톤 반영  [반영: 10절 마일스톤 본문 업데이트 완료]
*   위의 보완 사항들을 **M9(공통 컴포넌트)** 및 **M10~M12(뷰 재작성)** 단계에 각각 녹여내어, 단순한 색상 교체가 아닌 **'프리미엄 경험'**의 이식이 되도록 합니다.

---

> [!IMPORTANT]
> `handoff-2`의 `views.jsx` 소스코드는 완성된 UI의 정답지입니다. 로직을 이식할 때 이 파일의 JSX 구조와 인라인 스타일을 **'복사-붙여넣기' 수준으로 참조**하여 시각적 오차를 제로화하십시오.


---

## 16. 최종 결정 및 반영 로그 (2026-04-23, 사용자 답변 수신 후 업데이트)

### 16.1 사용자 결정
| # | 항목 | 결정 |
|---|---|---|
| 1 | 네비게이션 구조 | (A) 홈/내역/프라이빗/정산 4탭 + FAB |
| 2 | QuickEntrySheet → InputSheet | (A) 전면 교체 |
| 3 | Private 다크 테마(#121212) | 유지 |
| 4 | SOSView 채팅 UI | 완전 교체 |
| 5 | 위젯 대시보드 .card 통일 | 통일 |
| 6 | useTheme 3테마 + Kids 조건 | 모두 삭제 (useTheme.js 파일 자체 제거) |

### 16.2 Antigravity 권고(14절) 수용 매트릭스
| 권고 | 수용 여부 | 반영 위치 |
|---|---|---|
| 14-🔴-1 (C) 혼합 권장 | 부분 수용 (사용자는 A, 설정 헤더 아이콘+Depth 이동은 수용) | 8절 이동 규칙 |
| 14-🔴-2 index.css Overwrite | 완전 수용 | 9.1, M8 |
| 14-🔴-3 위젯 외곽 .card 강제 | 완전 수용 | 9.3 DashboardView, M13 |
| 14-💡-1 '자주 쓰는 패턴' 칩 보존 | 완전 수용 | 9.2 InputSheet, M10 |
| 14-💡-2 useTheme 완전 제거 | 완전 수용 + 초과 (kids-mode body class까지 삭제) | 4절, M8 |

### 16.3 Antigravity 프리미엄 디테일(15절) 반영 매트릭스
| 디테일 | 반영 위치 | 비고 |
|---|---|---|
| 15.1 바텀시트 spring(25/200) | M10 InputSheet | framer-motion 의존성 확인 필요 |
| 15.1 PIN shake x:[-10,10,-10,10,0] | M12 PrivateView | framer-motion |
| 15.1 BudgetRing 진입 애니메이션 | M9 BudgetRing | framer-motion 또는 CSS transition |
| 15.2 Private 블랙카드 blur-3xl 리플렉션 | M12 PrivateView | 순수 CSS filter:blur |
| 15.2 Settlement 흑자/적자 그라디언트+테두리 | M11 SettlementView | 9.1 CSS 토큰 추가 |
| 15.2 SOS 버블 비대칭 곡률 | M12 SOSView | 인라인 border-radius |
| 15.3 Bulk OCR WebP/JPEG(0.8) 압축 | 11절, useOcrScan 훅 수정 | canvas.toBlob(..., 'image/webp', 0.8) |
| 15.3 OCR extractBulkItemsFallback 정규식 | 11절, useOcrScan 훅 | 기존 AI 실패 분기 보강 |
| 15.3 공감형 마이크로 카피 | M10, 전역 | 플레이스홀더/라벨 일괄 점검 |
| 15.4 마일스톤 매핑 | 10절 | 단계별 체크박스 완료 |
| handoff-2 views.jsx 복사-붙여넣기 수준 참조 | M11/M12 | 시각 오차 제로화 목표 |

### 16.4 신규 고려 사항 (사용자 확인 필요 없음, 본 세션 전제)
- framer-motion 미설치 시: M8 단계에서 npm i framer-motion 추가 후 진행. 설치 전 package.json 확인.
- Icons 세트: 업로드판 components.jsx 의 Icons 오브젝트를 src/components/Icons.jsx 로 독립 모듈화.
- 기존 useTheme.js 삭제 후 import 잔재 제거 위치: src/App.jsx (이미 일부 완료), 그 외 grep 으로 발견되는 모든 호출부.
- Kids Mode UI 분기 제거 후에도 kidsStore 상태 및 Kids 프로필/미션 뷰 기능은 유지. 색상만 공통 팔레트 공유.

### 16.5 누락 방지 체크리스트 (M8 시작 전 필수 확인)
- [x] uploads/showmethemoney.html <style> 블록 전문 → src/index.css 로 이식
- [x] src/hooks/useTheme.js 파일 삭제
- [x] src/App.jsx 에서 useTheme import/호출 모두 제거
- [x] document.documentElement.setAttribute('data-theme', ...) 호출 grep → 전부 제거
- [x] document.body.classList.*('kids-mode') 호출 grep → 전부 제거 (없을 것)
- [x] manifest.json theme_color #1C2B4A 확인
- [x] package.json framer-motion 설치 여부 확인
- [x] uploads/components.jsx Icons 세트 → src/components/Icons.jsx 생성
- [x] uploads/views.jsx HomeView JSX 구조 → src/views/HomeView.jsx 에 복사-붙여넣기 수준 이식
- [x] 동일 원칙 History/Private/SOS/Settlement 반복
- [x] QuickEntrySheet.jsx → InputSheet.jsx 로 이름 변경 + 로직은 기존 보존, UI 는 업로드판으로 교체
- [x] 이동 뷰들(Report/Asset/Tax/Budget/Kids/DataImport/Admin/BugReport) 라우팅 경로를 Settings 내부 메뉴로 재연결
- [x] npx tsc --noEmit 각 마일스톤 종료 시 실행 (0 errors 유지)
- [x] npm run build 최종 M15 에서 실행
