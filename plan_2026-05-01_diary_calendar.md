# 다이어리 데이터 손실 + 캘린더 월이동/일정 기능 작업 계획
**작업 일시:** 2026-05-01 14:20 ~ 15:10

## 1. 문제 정의
1) 다이어리 작성/사진 첨부 도중 내용이 사라짐. 가계부 탭 갔다 돌아오면 복구되지만 다시 작성 시작하면 또 사라짐.
2) 내역탭 캘린더가 한 달치만 보이고 월 이동 불가. 지출 내역 미표시. 날짜별 일정 기록 기능 부재.

## 2. COT 분석 — 다이어리
### 데이터 흐름
InputSheet.handleSave -> onSave(entry) -> App.handleDiarySave(draft) -> size guard -> setDiaries(...) -> _makeSetter -> setShared('diaries', ...) -> debounce 300ms -> db.save -> realtime broadcast -> updateSharedState('diaries', value)

### 발견된 버그
- B1 Critical: InputSheet.handleSave가 onSave 직후 onClose를 무조건 호출. 220KB 사이즈 가드(handleDiarySave)에 막혀 early return해도 시트가 닫혀 사용자 입력이 휘발 -> 사용자에겐 "내용이 사라졌다"로 보임.
- B2 Critical: 220KB 한도가 너무 빡빡. 사진 1~2장만으로도 도달 -> 신규 저장 차단 + 입력 휘발.
- B3 High: InputSheet 입력값(텍스트/사진/항목) 자동 백업 없음 -> 시트 닫힘 = 입력 휘발.
- B4 Medium: realtime self-echo로 list가 잠시 흔들릴 수 있음.
- B5 Medium: DetailSheet 사진 압축이 옛 로직(800px/0.6q) -> 편집 시 다시 부풀어 한도 초과.
- B6 Medium: 사진 첨부 직후 누적 사이즈 사전검사 부재 -> 사용자가 다 쓴 뒤에야 막힘.

## 3. COT 분석 — 캘린더
- HistoryView -> MiniCalendar 사용. prev/next 없음, 지출 미표시, 일정 미표시.
- MiniCalendar getDots가 toISOString 사용 -> timezone 위험.
- plan.schedules 모델이 이미 존재(CalendarWidget). 내역탭에서도 활용해야 함.

## 4. 작업 항목
| ID | 작업 | 상태 |
|---|---|---|
| T1 | InputSheet.handleSave: onSave 결과로 닫기 결정(false면 시트 유지) | [x] |
| T2 | handleDiarySave: boolean 반환 + 한도 380KB 상향 + 메시지 개선 + 80% 사전 경고 | [x] |
| T3 | InputSheet sessionStorage 자동 백업/복구 (smtm_diary_draft_v1) | [x] |
| T4 | InputSheet 사진 첨부 직후 누적 사이즈 사전 검사 + 360px/0.55q 강화 | [x] |
| T5 | DetailSheet 사진 압축 compressImage 공통화 + 200KB 가드 | [x] |
| T6 | MiniCalendar prev/next + 지출/일정 점 + toDateStr + '오늘' 버튼 | [x] |
| T7 | HistoryView 선택일 지출/일정/다이어리 통합 + 일정 입력 UI | [x] |
| T8 | typecheck 0건 유지 | [x] |
| T9 | vitest 회귀 통과(11/11) | [x] |
| T10 | 빌드 검증 | [x] |
| T11 | 문서 정리 | [x] |

## 5. 변경 파일
- src/App.jsx — handleDiarySave가 boolean 반환, 한도 220 -> 380KB, 메시지 강화.
- src/components/InputSheet.jsx — sessionStorage draft, compressOnce/fitsBudget, handleSave 결과 처리, handleBackdropClose 추가.
- src/components/DetailSheet.jsx — compressImage 공통화.
- src/components/MiniCalendar.jsx — prev/next/today, viewYear/viewMonth, 지출 합계/점, schedules 점, toDateStr 사용.
- src/views/HistoryView.jsx — 선택일 지출 리스트, 일정 입력/삭제 UI, 통합 카운트.
- src/styles/theme.css — .cal-dot.event 스타일 추가.

## 6. 검증 결과
- tsc --noEmit 0 errors.
- vitest run: 4 files / 11 tests passed.
- vite build (외부 outDir): 성공, 모듈 3098개 변환.

## 7. 진행 로그
- 2026-05-01 14:20 - 분석 완료, 작업 시작.
- 2026-05-01 14:30 - App.handleDiarySave 사이즈 가드 강화 + boolean 반환.
- 2026-05-01 14:40 - InputSheet draft/사이즈 가드/handleSave 분기 적용.
- 2026-05-01 14:50 - DetailSheet 사진 압축 공통화.
- 2026-05-01 15:00 - MiniCalendar 월 이동 + 지출/일정 표시 리라이트.
- 2026-05-01 15:05 - HistoryView 일정 입력/지출 통합 리라이트.
- 2026-05-01 15:10 - typecheck/vitest/build 모두 통과.
