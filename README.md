# 💰 가정 경영 가계부

부부가 함께 쓰는 가계부 앱. 지출 내역, 카드 정산, 고정비·할부를 한 곳에서 관리합니다.

## 주요 기능

- **부부 공유** — 6자리 가정 코드로 데이터 공유
- **지출 입력** — 직접 입력 + 영수증 OCR (Claude AI)
- **카드 정산** — 카드사별 정산 기간 설정, 결제일 기준 청구 예정금액 계산
- **고정비·할부** — 월 고정비 납부 체크, 할부 진행률 추적
- **캘린더** — 날짜별 지출 히트맵, 카드 결제일 표시
- **리포트** — 월간 KPI, 전월 대비 분석, 파트너별 비교
- **연간 재무 계획** — 저축 목표, 지출 한도, 큰 지출 이벤트 예고
- **Pace 시나리오** — 남은 일수 기준 월말 예상 지출 시뮬레이션
- **다크/라이트 모드**

## 프로젝트 구조

```
src/
├── App.jsx                    # 루트 컴포넌트 (상태·스토리지 관리)
├── main.jsx
├── constants/
│   └── index.js               # 카테고리, 기본값, 빈 배열 상수
├── utils/
│   └── index.js               # 날짜, 포맷, 카드 정산 알고리즘
├── styles/
│   └── globalStyles.js        # CSS 변수 (다크/라이트)
├── components/
│   ├── shared.jsx             # Ring, Bar, Chip, Card, SliderRow 등
│   ├── Nav.jsx                # 하단 네비게이션
│   └── InputModal.jsx         # 지출 입력 모달
└── views/
    ├── HomeView.jsx           # 홈 대시보드
    ├── EntryView.jsx          # 지출 입력 탭
    ├── ReportView.jsx         # 리포트 + 캘린더 + 계획 탭
    ├── FixedView.jsx          # 고정비 + 할부 + 카드 탭
    ├── SettingsView.jsx       # 설정
    ├── AssetView.jsx          # 자산 관리 (준비 중)
    ├── SyncSetup.jsx          # 온보딩 (가정 코드 생성/참여)
    └── WidgetView.jsx         # 홈 위젯 오버레이
```

## 로컬 실행

```bash
npm install
npm run dev
```

## GitHub Pages 배포

1. 저장소 → **Settings** → **Pages** → Source: **GitHub Actions**
2. `vite.config.js`에서 `base` 값을 저장소 이름으로 변경
   ```js
   base: '/family-budget-app/'   // 본인 저장소 이름으로
   ```
3. `main` 브랜치에 push → 자동 빌드·배포

배포 완료 후: `https://[아이디].github.io/[저장소명]/`

## 기술 스택

- React 18 + Vite
- Recharts (차트)
- Claude API (영수증 OCR)
