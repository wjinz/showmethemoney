# 대시보드 지출내역 + 캘린더 정리 작업 계획
**작업 일시:** 2026-05-02

## 1. 문제 정의
1) 대쉬보드에 지출내역이 제대로 표시되지 않거나, 매일의 모든 항목이 펼쳐져 있어 가계부로서 한눈에 파악이 어렵다. 하루의 총액만 노출하되, 각자 서로의 세부 내역을 보고 수정할 수 있어야 한다.
2) 내역 탭이 다이어리 내용까지 노출하여 캘린더 본연 기능에 집중하지 못한다. 라벨도 "내역"보다는 "캘린더"가 직관적이다.

## 2. COT 분석
### Dashboard 지출내역
- 기존: `myRecords = listItems.filter(d => d.who === currentUser)` 후 일자 그룹 + 모든 항목 자동 펼침. 일자 행 자체가 단순 헤더로만 동작.
- 누락 원인: `listItems`가 `diaryExpenses`와 `orphanTx(!source_id)`만 합치므로, source_id가 있어도 부모 다이어리가 type='diary'로 잘못 저장되거나 매칭이 깨지면 화면에서 사라짐.
- 개선: `tx`를 단일 소스로 일자별 총액을 산출(`dailyTotals`). 행을 클릭해야만 세부 항목이 펼쳐지고, 항목 클릭 시 diary는 `DetailSheet`, 순수 tx는 `TxEditModal`로 편집한다. 토글로 본인/배우자 모두 조회·수정 가능.

### 캘린더 (HistoryView)
- 기존: 캘린더 + 일정 + 지출 + 다이어리 카드 + Top5 + 감정 통계. "다이어리"가 두 곳에서 노출되어 중복.
- 개선: 다이어리 카드/요약을 모두 제거. 선택일에 부부 각자의 일일 총액 + 합계만 노출. 일정은 인라인 추가/수정/삭제. Nav 라벨 "내역" → "캘린더".

## 3. 작업 항목
| ID | 작업 | 상태 |
|---|---|---|
| T1 | Nav.jsx 라벨 "내역" → "캘린더" | [x] |
| T2 | HistoryView 재작성 — 캘린더 + 일일 총액 + 일정 CRUD/수정 | [x] |
| T3 | DashboardView 재작성 — 일자 총액 collapsed + 클릭 시 세부, diary/tx 모두 편집 | [x] |
| T4 | tx 단일 소스 합산 (orphan/source_id 모두 포함) | [x] |
| T5 | tsc --noEmit 0 errors | [x] |
| T6 | vitest 11/11 통과 | [x] |
| T7 | vite build 성공(outputs 경로) | [x] |
| T8 | Vercel 프로덕션 배포 | [ ] (사용자 환경에서 `npx vercel --prod` 실행 필요 — 본 sandbox에 인증 부재) |

## 4. 변경 파일
- src/components/Nav.jsx — 라벨 한 줄 변경.
- src/views/HistoryView.jsx — 다이어리 카드/Top5/감정 통계 제거. 일일 총액 카드 + 일정 인라인 수정.
- src/views/DashboardView.jsx — `dailyTotals`(currentUser tx 단일 소스). 일자 행 collapse/expand. diary/tx 모두 편집 진입.

## 5. 검증
- `npx tsc --noEmit` 0 errors. any/unknown 미사용.
- `npx vitest run` 4 files / 11 tests 통과.
- `npx vite build --outDir <외부>` 성공 (3098 modules).
