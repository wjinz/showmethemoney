# 스케줄 스캔 크래시 해결 및 데이터 안정화 (v15)

"근무표 스캔"을 누르자마자 발생하는 오류의 원인을 분석하고, 비정상적인 데이터 구조로 인한 컴포넌트 크래시를 방지하기 위한 긴급 수리 플랜입니다.

## 🚩 현재 발생한 문제 (Diagnosis)

- **현상**: "근무표 스캔" 버튼 클릭 시 즉시 화면이 멈추거나 에러가 발생함.
- **원인**: `useOcrScan` 훅이 사용하는 **세션 저장소 키(`ocr_last_scan_data`)가 모든 스캔 기능(지출, 근무표)에서 공유**되어 발생한 데이터 충돌입니다.
  - 지출 내역 스캔 성공 시: 저장소에 **배열**(`[...]`)이 저장됨.
  - 근무표 스캔 실행 시: 저장소의 **배열**을 읽어옴 → 근무표 UI는 **객체**(`{ names: [...] }`) 기대 → `.names.map()` 호출 시 **undefined 에러**로 크래시.

<!-- [Claude] 정확한 crash 지점 추가:
  - ScheduleScanSheet.jsx:141 — `{scannedData.names.map(n => ...)}` : 가드 없음. scannedData가 배열이면 .names는 undefined → 즉시 크래시.
  - ScheduleScanSheet.jsx:158 — `scannedData.schedules[selPersonName]?.length` : schedules가 undefined면 TypeError.
  - useOcrScan.js:26-35 — 세션 복구 로직이 데이터를 OCR 함수를 거치지 않고 직접 setState로 주입.
    즉 runScheduleOCR의 정규화 로직(src/utils/ocr.js:158-163)은 새로 스캔할 때만 실행되고,
    세션 복구 시에는 실행되지 않아 오염된 배열 데이터가 그대로 컴포넌트에 전달됨.
-->

## User Review Required

> [!IMPORTANT]
> **캐시 키 고유화**: `useOcrScan` 훅에 `scanKey` 인자를 추가하여 각 기능(지출, 근무표)이 독립적인 저장소를 사용하도록 분리합니다.
> **구조적 방어**: 컴포넌트 레벨에서 데이터가 기대하는 형식이 아닐 경우(예: 배열인데 객체 프로퍼티 접근)를 대비한 가드 클로즈(Guard Clauses)를 추가합니다.

## Proposed Changes

---

### 1. [Hook] useOcrScan 캐시 로직 고도화

#### [MODIFY] [src/hooks/useOcrScan.js](src/hooks/useOcrScan.js)
- `useOcrScan` 함수에 `scanKey` (예: "bulk", "schedule") 매개변수를 추가합니다.
- `sessionStorage` 키를 `ocr_last_scan_data_${scanKey}` 형식으로 변경하여 데이터 간섭을 차단합니다.

<!-- [Claude] 추가 수정 필요 — 쿨다운 키도 공유됨:
  useOcrScan.js:13 — `COOLDOWN_KEY = 'ocr_cooldown_until'` 도 현재 전역 공유.
  지출 스캔에서 429 Rate Limit이 걸리면, 근무표 스캔도 동일한 30초 잠금에 걸림.
  `ocr_cooldown_until_${scanKey}` 형식으로 함께 분리해야 완전한 독립이 됨.

  수정 예시 (useOcrScan.js):
  ```js
  export function useOcrScan(ocrFn, scanKey = 'default') {
    const COOLDOWN_KEY = `ocr_cooldown_until_${scanKey}`;
    const PERSIST_LAST_DATA = `ocr_last_scan_data_${scanKey}`;
    // ...
  }
  ```
  호출부:
  - CardScanSheet.jsx:15    → useOcrScan(runBulkOCR, 'bulk')
  - ScheduleScanSheet.jsx:10 → useOcrScan(runScheduleOCR, 'schedule')
-->

---

### 2. [Server] Gemma 4 스케줄 응답 구조 정밀화

#### [MODIFY] [api/ocr.js](api/ocr.js)
- `schedule` 모드의 프롬프트를 더 강력한 지시형(Imperative)으로 수정합니다.
- Gemma 4가 종종 배열만 뱉는 실수를 대비해, 서버단에서 항상 `{ names: [], schedules: {} }` 구조를 갖춰 응답하도록 후처리 로직을 보강합니다.

<!-- [Claude] 서버 후처리 로직 구체적 제안:
  api/ocr.js:142 근처 — bulk 모드는 이미 `!Array.isArray(parsed) ? { items: [parsed] } : { items: parsed }` 보정이 있음.
  schedule 모드에는 동일한 보정 없음. 추가 예시:

  ```js
  if (mode === 'schedule') {
    // AI가 배열만 반환했을 경우 (예: [{"date":...,"type":...}])
    if (Array.isArray(parsed)) {
      return res.status(200).json({ names: [], schedules: {}, _raw_fallback: parsed });
    }
    // names 또는 schedules 누락 시 기본값 보정
    return res.status(200).json({
      names: Array.isArray(parsed.names) ? parsed.names : [],
      schedules: parsed.schedules && typeof parsed.schedules === 'object' ? parsed.schedules : {}
    });
  }
  ```

  [Claude] 참고: src/utils/ocr.js:158-163의 runScheduleOCR에 클라이언트 정규화가 이미 있으나,
  이것은 신규 스캔 경로에서만 실행됨. 서버 보정이 더 근본적인 해결책.
-->

<!-- [Claude] 추가 발견 — 연도 엣지 케이스 (api/ocr.js:40-41):
  `currentYear = today.slice(0, 4)` 를 사용해 연도를 보정하는데,
  4월 말에 5월 근무표를 스캔하면 정상이지만, 12월 말에 1월 근무표를 스캔하면
  1월 날짜에 올해 연도가 붙어 과거 날짜로 저장됨.
  프롬프트에 다음달 처리 힌트를 추가하는 것을 고려할 것:
  `- If the schedule covers dates that are in the past (e.g. January scanned in December), use next year.`
-->

---

### 3. [Component] 근무표 UI 안정성 확보

#### [MODIFY] [src/components/ScheduleScanSheet.jsx](src/components/ScheduleScanSheet.jsx)
- `scannedData`가 객체이며 `names` 속성이 배열인지 확인하는 방어 로직을 강화합니다.
- 에러 박스 UI를 `CardScanSheet`와 동일한 고성능 스타일(스크롤, 상세 로깅)로 교체합니다.

<!-- [Claude] 가드 클로즈 구체적 위치:
  현재 ScheduleScanSheet.jsx:136 — `{phase === 'review' && scannedData && (...)}`
  scannedData가 truthy이어도 배열이면 내부에서 크래시. 아래처럼 강화:

  ```jsx
  {phase === 'review' && scannedData && !Array.isArray(scannedData) && scannedData.names && (
    ...
  )}
  ```
  또는 더 명확하게:
  ```jsx
  const isValidScheduleData = scannedData &&
    typeof scannedData === 'object' &&
    !Array.isArray(scannedData) &&
    Array.isArray(scannedData.names);
  ```

  [Claude] 빈 결과 UX 고려:
  scannedData.names가 빈 배열(`[]`)인 경우, "분석 대상자 선택" 버튼이 아무것도 없이
  빈 박스만 렌더됨. "이름을 인식하지 못했습니다. 다시 시도해주세요." 안내 UI가 필요.
-->

<!-- [Claude] 추가 발견 — 재촬영 시 selPersonName 미초기화:
  ScheduleScanSheet.jsx:170 — reset() 호출 시 훅 상태는 초기화되지만
  컴포넌트 로컬 state인 `selPersonName`은 이전 값 유지.
  새 스캔 결과에 이전 이름이 없으면 데이터가 0건으로 표시됨.
  `reset()` 호출 시 `setSelPersonName("")` 도 함께 호출해야 함.
-->

<!-- [Claude] 메모리 누수 위험:
  ScheduleScanSheet.jsx:130, CardScanSheet.jsx:195 — `URL.createObjectURL(scanFile)` 이
  렌더링 함수 내에서 호출됨. 리렌더마다 새 Blob URL이 생성되고 해제되지 않음.
  useEffect + URL.revokeObjectURL 로 정리하거나, useMemo로 URL을 한 번만 생성해야 함.

  ```jsx
  const previewUrl = useMemo(() => scanFile ? URL.createObjectURL(scanFile) : null, [scanFile]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  ```
-->

<!-- [Claude] 저장 후 세션 미정리:
  ScheduleScanSheet.jsx:30-45 — handleSave() 에서 onSave/onClose 호출 후 reset()을 호출하지 않음.
  CardScanSheet는 handleSaveAll 후 setScanFile(null)을 호출하지만 reset()은 미호출.
  저장 성공 후 세션 데이터가 남아있어, 다음에 같은 시트를 열면 이전 데이터가 복원됨.
  저장 완료 시 reset()을 호출해 세션 정리 권장.
-->

---

## Verification Plan

### Automated Tests
1. **데이터 간섭 테스트**: 지출 스캔 완료 후 바로 근무표 스캔 창을 열었을 때 크래시가 발생하지 않는지 확인.
2. **Gemma 4 응답 유효성**: 근무표 분석 시 `names`와 `schedules`가 올바르게 매칭되어 오는지 확인.

### Manual Verification
1. **복합 내역 테스트**: 여러 명의 이름이 섞인 근무표 이미지를 분석하여 "분석 대상자 선택" 버튼들이 정상 노출되는지 확인.
2. **저장 기능 테스트**: 선택한 근무가 캘린더에 정확한 연/월/일로 저장되는지 확인.

<!-- [Claude] 추가 검증 시나리오:
3. **빈 names 응답 테스트**: AI가 이름을 인식 못했을 때 (names: []) UI가 안내 메시지를 보여주는지 확인.
4. **쿨다운 독립 테스트**: 지출 스캔에서 429 에러 발생 후 근무표 스캔 버튼이 잠기지 않는지 확인.
5. **재촬영 후 이름 초기화 테스트**: 재촬영 후 새 근무표 스캔 시 이전 이름이 선택되어 있지 않은지 확인.
6. **저장 후 재오픈 테스트**: 저장 완료 후 같은 시트를 다시 열면 빈 상태(idle)로 시작하는지 확인.
-->

---

## 수정 우선순위 요약 [Claude]

| 우선순위 | 파일 | 수정 내용 | 크래시 방지 여부 |
|---------|------|-----------|----------------|
| 🔴 긴급 | `useOcrScan.js` | `scanKey` 추가, PERSIST_LAST_DATA + COOLDOWN_KEY 분리 | ✅ 근본 원인 해결 |
| 🔴 긴급 | `ScheduleScanSheet.jsx` | review phase에 isValidScheduleData 가드 추가 | ✅ 크래시 방어막 |
| 🟡 중요 | `api/ocr.js` | schedule 모드 서버 후처리 보강 | 🔶 데이터 정합성 |
| 🟡 중요 | `ScheduleScanSheet.jsx` | 빈 names 배열 시 안내 UI | 🔶 UX |
| 🟡 중요 | `ScheduleScanSheet.jsx` | 재촬영/저장 시 `selPersonName` 초기화 + `reset()` 호출 | 🔶 상태 일관성 |
| 🟢 권장 | `ScheduleScanSheet.jsx` + `CardScanSheet.jsx` | Blob URL 메모리 누수 수정 | 🔶 장기 안정성 |
