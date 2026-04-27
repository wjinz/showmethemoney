# AI 사진 분석 서비스 완벽 정상화 플랜 (v6)

겉보기에만 해결하는 것이 아니라, **실제 사진 분석이 성공적으로 수행되도록** 2026년 4월 기준 최신 API 환경에 맞춰 엔진과 로직을 전면 재조정합니다.

<!-- [Claude] 전체 시스템 흐름 요약:
  [프론트] 이미지 파일
    → src/utils/ocr.js (optimizeImage → base64 변환, sessionStorage 캐시 확인)
    → /api/ocr (Vercel Serverless, Gemini 호출 + 모델 폴백)
    → Gemini API (JSON 텍스트 반환)
    → 파싱 후 클라이언트 반환
    → src/hooks/useOcrScan.js (상태 관리: idle/scanning/review, cooldown)
    → CardScanSheet.jsx (UI: 검토·편집·저장)
  별도: api/nudge.js (Gemini로 츤데레 예산 조언, KV 캐시)
-->

## User Review Required

> [!IMPORTANT]
> **API 모델 변경**: 2026년 기준 실질적인 무료 티어 모델인 **Gemini 2.5 Flash** 시리즈로 엔진을 교체합니다. 기존 1.5/2.0 모델의 쿼터 제한이나 404 오류를 우회하기 위함입니다.
> **자동 재시도**: 429(Rate Limit) 발생 시 훅 레벨에서 1~2회 자동 재시도를 수행하여 사용자가 직접 기다리는 고통을 줄입니다.

<!-- [Claude] 현재 상태 확인: api/ocr.js는 아직 gemini-2.0-flash-lite / gemini-2.0-flash를 사용 중.
  이 플랜의 모델 교체(2.5 시리즈)는 아직 미구현 상태입니다. -->

## Proposed Changes

---

### [Component] AI 엔진 서버리스 함수 (api/ocr.js)

#### [MODIFY] [ocr.js](api/ocr.js)
- **최신 모델 적용**: `gemini-2.5-flash-lite`, `gemini-2.5-flash` 순으로 폴백 체인 업데이트.
- **상세 에러 피드백**: Google API가 반환하는 실제 에러 문구를 클라이언트에 그대로 전달하여 '한도 초과' 외의 숨겨진 원인(이미지 형식, 용량 등)이 있는지 투명하게 공개합니다.
- **데이터 검증**: Base64 데이터의 유효성을 체크하는 로직을 추가하여 서버에 빈 이미지가 전송되지 않도록 방지합니다.

<!-- [Claude] api/ocr.js 추가 발견 사항:

  1. [버그 아님, but 주의] 현재 폴백 로직에서 429가 아닌 오류(400, 403 등)는 두 번째 모델을 시도하지 않고
     즉시 break합니다. 이건 의도된 동작이지만, 만약 첫 번째 모델이 일시적인 503을 반환하는 경우에도
     바로 실패합니다. 429 외에 503(Service Unavailable)도 폴백 대상에 포함하는 것을 고려해주세요.
     예: `if (geminiRes.status !== 429 && geminiRes.status !== 503) break;`

  2. [잠재적 버그] bulk 모드의 maxOutputTokens이 2048입니다. 카드 내역이 20건 이상이고
     각 항목 JSON이 60자 내외라면 1200자+이고, 줄바꿈과 공백 포함 시 2048 토큰을 넘길 수 있습니다.
     bulk 모드는 4096으로 늘리는 것을 권장합니다.

  3. [보안 개선] api/nudge.js와 달리 ocr.js는 x-internal-secret 인증이 있습니다.
     그러나 nudge.js에는 인증이 전혀 없습니다 → 아래 nudge.js 섹션 참고.

  4. [개선] schedule 모드의 JSON 파싱 시 match[0]이 중첩된 객체를 포함할 경우
     regex /\{[\s\S]*\}/은 가장 외부 중괄호부터 찾지만, 응답에 앞뒤 설명 텍스트가
     붙을 경우 잘못 파싱될 수 있습니다. JSON.parse 전에 try/catch 래핑이 있어서
     큰 문제는 아니지만, 파싱 실패 시 500 대신 422를 반환하는 것이 더 명확합니다.
-->

---

### [Component] 프론트엔드 연동 훅 (src/hooks/useOcrScan.js)

#### [MODIFY] [useOcrScan.js](src/hooks/useOcrScan.js)
- **자동 재시도 로직**: 429 에러 발생 시 즉시 30초 대기로 들어가는 대신, 2초 간격으로 최대 2회 자동 재시도 로직을 구현합니다.
- **타이머 연동 상태 초기화**: 쿨다운이 0이 되는 순간 `error` 상태를 `''`로 초기화하여 UI 먹통 현상을 해결합니다.
- **에러 표시 고도화**: 서버에서 전달받은 실제 에러 내용을 사용자에게 보여줍니다.

<!-- [Claude] useOcrScan.js 추가 발견 사항:

  1. [확인된 버그] 쿨다운 타이머(useEffect)에서 cooldown이 1 → 0이 될 때 clearInterval을 호출하지만,
     error 상태는 여기서 초기화되지 않습니다. 이 플랜에서 언급된 "UI 먹통" 버그가 맞습니다.
     수정 방법:
       setCooldown(prev => {
         if (prev <= 1) {
           clearInterval(timer);
           setError(''); // ← 이 줄 추가
           return 0;
         }
         return prev - 1;
       });

  2. [설계 개선] cooldown은 sessionStorage 기반이라 탭 새로고침 후에도 유지됩니다.
     그런데 data(스캔 결과)는 메모리에만 있어서 새로고침 시 사라집니다.
     사용자가 review 단계에서 실수로 새로고침하면 결과를 잃습니다.
     → 스캔 결과도 sessionStorage에 임시 저장하는 것을 고려해주세요.

  3. [잠재적 문제] ocrFn이 useCallback 없이 전달되면 startScan의 deps 배열이 매 렌더마다
     갱신되어 불필요한 재생성이 발생합니다. 현재 CardScanSheet에서 runBulkOCR을 직접
     전달하는데 이 함수는 모듈 레벨 함수라 안정적입니다. 하지만 향후 인라인 함수를 전달할 경우
     useCallback 래핑 없이는 무한 루프 위험이 있습니다. 문서화 권장.
-->

---

### [Component] 컴포넌트 레이어 (CardScanSheet.jsx 등)

- **재시도 안내 UI**: 자동 재시도가 진행 중일 때 '재시도 중...' 메시지를 표시하여 사용자가 기다릴 수 있게 합니다.

<!-- [Claude] CardScanSheet.jsx 추가 발견 사항:

  1. [UX 개선] 이미지를 선택한 후 scanning phase로 전환되는데, 사용자는 자신이 올린 이미지를
     확인할 수 없습니다. scanning 화면에 업로드된 이미지 썸네일을 작게 보여주면 "내가 올린 게 맞나?"
     하는 불안감을 줄일 수 있습니다.

  2. [잠재적 버그] processedRef는 컴포넌트 마운트당 한 번만 초기화됩니다.
     CardScanSheet가 언마운트 후 재마운트되면 processedRef.current는 false로 리셋되므로
     이 자체는 괜찮습니다. 단, window.__sharedFile이 이미 null로 지워졌다면
     두 번째 마운트에서 PWA Share가 처리되지 않습니다. 앱 라우팅 방식에 따라 문제가 될 수 있습니다.

  3. [UX 개선] handleSaveAll에서 amount가 0인 항목이 선택된 채로 저장될 수 있습니다.
     사용자가 실수로 금액을 지웠을 경우를 대비해 amount <= 0인 항목은 경고 표시 또는
     저장 버튼 비활성화를 고려해주세요.

  4. [UX 개선] '공동/개인 분류' 버튼은 선택된 항목이 없으면 disabled 처리되어 있는데,
     disabled 상태에서도 border 색상이 '#E8715A'(붉은색)로 강조되어 있어 혼란스럽습니다.
     disabled 상태에서는 var(--border) 색상으로 변경하는 것이 자연스럽습니다.

  5. [성능] items 배열이 클 때 selectedCount, allSelected를 매 렌더마다 재계산합니다.
     현재는 useMemo 없이 계산 중이며, 항목 수가 적어서 문제없지만 useMemo 적용 여지가 있습니다.
     (useMemo import는 이미 되어 있어서 바로 적용 가능)
-->

---

### [Component] OCR 유틸 (src/utils/ocr.js)

<!-- [Claude] src/utils/ocr.js 추가 발견 사항:

  1. [버그] manageCache 함수에서 결과 저장 여부를 `if (result)`로 판별합니다.
     result가 빈 배열 `[]`이거나 falsy 값이면 저장 대신 조회로 분기합니다.
     runBulkOCR의 결과가 빈 배열일 경우 캐시에 저장되지 않고 매번 API를 다시 호출하게 됩니다.
     수정: `if (result !== undefined)` 또는 `if (result !== null && result !== undefined)`

  2. [개선] 이미지 최적화 MAX_SIZE가 1024px입니다. bulk 모드(카드 내역 스크린샷)는
     세로로 긴 이미지에 작은 텍스트가 밀집되어 있어 1024px에서 글씨가 너무 작아질 수 있습니다.
     mode 파라미터를 optimizeImage에 전달해 bulk/schedule 모드에서는 MAX_SIZE를 1536으로
     늘리는 것을 고려해주세요.

  3. [개선] 캐시 키가 `${file.name}_${file.size}` 기반입니다. 동명이파일 + 동일 용량이지만
     다른 내용인 경우(거의 없지만 이론상 가능) 잘못된 캐시를 반환합니다.
     file.lastModified도 키에 포함하면 충돌 가능성이 사실상 0에 가깝습니다.
     예: `${mode}_${file.name}_${file.size}_${file.lastModified}`

  4. [참고] runOCR(single 모드)은 현재 어떤 컴포넌트에서도 호출되지 않는 것으로 보입니다.
     CardScanSheet은 runBulkOCR만 사용합니다. 레거시 함수인지 확인 후 불필요하면 제거를 고려하세요.
-->

---

### [Component] Nudge 서버리스 함수 (api/nudge.js)

<!-- [Claude] api/nudge.js — 이 플랜에 언급되지 않았지만 중요한 이슈 발견:

  1. [보안 취약점] ocr.js는 x-internal-secret 헤더로 인증을 하지만, nudge.js에는 인증이 전혀 없습니다.
     외부에서 /api/nudge로 임의 POST 요청을 반복하면 Google API 쿼터를 소진시킬 수 있습니다.
     ocr.js와 동일한 INTERNAL_API_SECRET 검증 로직을 추가하기를 강력히 권장합니다.

  2. [신뢰성] nudge.js는 모델 폴백이 없습니다. gemini-2.0-flash-lite가 429를 반환하면
     그냥 오류를 반환합니다. ocr.js처럼 fallback 모델을 추가하거나, 실패 시 하드코딩된
     기본 메시지("이번 달 지출, 잘 관리하고 있어요!")를 반환하는 것이 사용자 경험에 좋습니다.

  3. [개선 아이디어] 현재 nudge 메시지는 "츤데레" 페르소나로 고정되어 있습니다.
     사용자 설정에서 페르소나를 선택할 수 있게 하면 재미있을 것 같습니다.
     (e.g., 엄격한 회계사 / 응원하는 친구 / 현재: 츤데레 AI)
-->

---

## Open Questions

> [!CAUTION]
> **Vercel 환경 변수 재점검**: 현재 `INTERNAL_API_SECRET`과 프론트엔드의 `VITE_INTERNAL_API_SECRET`이 일치하는지, 그리고 `GOOGLE_API_KEY`가 Vercel 대시보드에 **VITE_ 접두사 없이** 올바르게 등록되어 있는지 반드시 확인 부탁드립니다. (일치하지 않으면 AI 분석 자체가 차단됩니다.)

<!-- [Claude] 추가 Open Questions:

  Q1. bulk 모드로 스캔 후 저장된 거래들은 항상 `payMethod: 'credit'`으로 고정됩니다.
      카드 내역이 아닌 계좌이체나 현금 영수증을 스캔하는 경우도 있을 수 있습니다.
      저장 전 결제 수단을 선택할 수 있는 옵션을 제공하는 게 맞는지 기획 확인이 필요합니다.

  Q2. schedule 모드(근무표 스캔)는 ScheduleScanSheet.jsx에서 사용될 것으로 보이는데,
      해당 컴포넌트가 현재 구현되어 있는지, 어떤 화면에서 진입하는지 확인이 필요합니다.
      (git status에서 src/components/ScheduleScanSheet.jsx가 untracked 상태로 보입니다)
-->

## Verification Plan

### Automated Tests
1. **모델 가용성 확인**: 배포 후 각 모델이 200 OK를 반환하는지 체크.
2. **쿨다운 종료 체크**: 30초 대기 후 자동으로 에러 문구가 사라지고 업로드 버튼이 활성화되는지 확인.

<!-- [Claude] 추가 검증 시나리오:
  3. **캐시 동작 확인**: 같은 이미지를 두 번 업로드했을 때 두 번째에는 API 호출 없이 즉시 결과가 나오는지 확인. (Network 탭에서 /api/ocr 요청이 한 번만 발생해야 함)
  4. **빈 결과 처리**: OCR이 아무 내역도 인식하지 못했을 때 "인식된 항목이 없습니다" 같은 안내가 제대로 나오는지 확인. (현재 items가 빈 배열일 때 review phase의 UI가 어색할 수 있음)
  5. **대용량 이미지**: 고해상도 사진(4000px 이상)을 업로드해도 optimizeImage가 1024px로 정상 축소되는지 확인.
-->

### Manual Verification
1. **실제 사진 업로드**: 카드 내역 혹은 영수증 사진을 올려 실제 데이터(JSON)가 추출되는지 확인.
2. **재시도 트리거**: 고의적으로 연속 클릭하여 자동 재시도 로직이 작동하는지 확인.
