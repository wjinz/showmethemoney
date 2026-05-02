# 대시보드 지출내역 + 캘린더 정리 작업 계획
**작업 일시:** 2026-05-02

## 1. 문제 정의
1) 대쉬보드에 지출내역이 제대로 표시되지 않거나, 매일의 모든 항목이 펼쳐져 있어 한눈에 파악이 어렵다. 하루의 총액만 노출하되, 각자 서로의 세부 내역을 보고 수정할 수 있어야 한다.
2) 내역 탭이 다이어리 내용까지 노출하여 캘린더 본연 기능에 집중하지 못한다. 라벨도 "내역"보다는 "캘린더"가 직관적이다.
3) **재발견(2026-05-02 PM)**: 대쉬보드가 항상 현재 달(today_str)만 필터하므로, 직전 달에만 데이터가 있는 경우 "기록 없음"으로 보임. 또한 currentUser 토글 한쪽만 노출되어 파트너 데이터가 가려짐.

## 2. COT 분석
### Dashboard 지출내역
- 1차 개선: `tx` 단일 소스, 일자별 총액 collapse/expand, diary/tx 양쪽 편집 진입.
- 2차 개선(현재): `selectedMonth` 상태 도입(◀/▶ 월 이동, "이번 달로" 복귀, 과거 연도 자동 lazy-load). 일자 행에 부부 합산 + 각자 split badge. 펼침 시 양쪽 항목을 한 화면에 표시(👨/👩 칩으로 구분). 빈 상태 시 ◀ ▶로 다른 달 안내.

### 캘린더 (HistoryView)
- 다이어리 카드/Top5/감정 통계 제거. 선택일에 부부 각자 일일 총액 + 합계만, 일정 인라인 추가/수정/삭제.

## 3. 작업 항목
| ID | 작업 | 상태 |
|---|---|---|
| T1 | Nav.jsx 라벨 "내역" → "캘린더" | [x] |
| T2 | HistoryView 재작성 — 캘린더 + 일일 총액 + 일정 CRUD/수정 | [x] |
| T3 | DashboardView 1차 — 일자 총액 collapsed + diary/tx 모두 편집 | [x] |
| T4 | DashboardView 2차 — 월 셀렉터 + 부부 합산 + 양쪽 펼침 + lazy-load | [x] |
| T5 | tsc --noEmit 0 errors | [x] |
| T6 | vitest 11/11 통과 | [x] |
| T7 | vite build 성공(외부 outDir) | [x] |
| T8 | Vercel 프로덕션 배포 | [ ] (사용자 환경에서 실행 필요) |

## 4. 변경 파일
- src/components/Nav.jsx — 라벨 한 줄 변경.
- src/views/HistoryView.jsx — 다이어리 카드/Top5/감정 통계 제거. 일일 총액 카드 + 일정 인라인 수정.
- src/views/DashboardView.jsx — `selectedMonth` 상태(prev/next/오늘 복귀), `dailyTotals`(부부 합산 + 각자 split), 펼침 시 양쪽 항목, 과거 연도 lazy-load 트리거.

## 5. 검증
- `npx tsc --noEmit` 0 errors. any/unknown 미사용.
- `npx vitest run` 4 files / 11 tests 통과.
- `npx vite build --outDir <외부>` 성공 (3098 modules, gzip index.js 181KB).
