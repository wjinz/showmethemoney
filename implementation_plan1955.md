# Gemma 4 응답 최적화 및 JSON 파싱 에러 해결 (v11)

현재 Gemma 4가 요청된 사진 분석 결과(JSON) 대신 **"작업 지침의 요약(Response Preamble)"**을 영문으로 답변하면서 정규식 매칭 및 데이터 인식에 실패하고 있습니다. 이를 해결하기 위해 프롬프트와 API 설정을 전면 개편합니다.

<!-- [Claude] 현재 코드 상태와 플랜 대조 요약:
  - 모델 체인: gemma-4-31b-it → gemini-2.5-flash → gemini-3.1-flash-lite (이미 업데이트됨)
  - generationConfig: temperature 0.1, bulk maxOutputTokens 4096 — response_mime_type 없음
  - 프롬프트: "코드블록, 설명 없이 JSON만" 수준. "No Preamble" 강제 지시 없음
  - 파싱: /\[[\s\S]*\]/ 단순 greedy 정규식 — 마크다운 코드블록 처리 없음
  - system_instruction 필드 미사용
  → 이 플랜의 모든 수정사항이 아직 미구현 상태입니다.
-->

## 🚩 현재 발생한 문제 (Diagnosis)

에로 로그 분석 결과, Gemma 4가 다음과 같은 응답을 보냄으로써 파싱 실패가 발생하고 있습니다.
> `* Input: Image of a card app's transaction history. * Output: JSON array... (후략)`

- **문제점 1**: AI가 지시 사항(Instruction)을 따르지 않고 프롬프트의 구조를 복창(Summarization)함.
- **문제점 2**: 정규식이 기대하는 `[` 기호 대신 `*`로 답변을 시작하여 "형식을 찾지 못함" 오류 발생.
- **문제점 3**: 한국어 지시에도 불구하고 영문 프리앰블(Preamble)을 덧붙임.

<!-- [Claude] 이 증상의 근본 원인 분석:
  Gemma 4 instruction-tuned 모델은 훈련 데이터에서 "Input: ... Output: ..." 형식으로 구조화된
  예시를 많이 학습했습니다. 프롬프트 내에 입력 형식과 출력 형식을 설명하면, 모델이 그 메타 설명을
  실제 작업의 일부로 인식하여 "요약 복창" 행동을 합니다.
  
  핵심 해결 방향 두 가지:
  (A) 프롬프트에서 "Input/Output" 같은 메타 언어를 제거하고, "지금 바로 JSON으로 시작하라"는
      단호한 명령형으로만 구성.
  (B) system_instruction 필드를 사용하여 행동 지침과 실제 작업 지시를 분리.
  
  현재 플랜은 (A)에 집중하고 있으며 (B)는 언급되지 않았습니다. 둘 다 적용하면 효과가 배가됩니다.
-->

## User Review Required

> [!IMPORTANT]
> **API 설정 변경**: Google AI Studio의 **`response_mime_type: "application/json"`** 옵션을 활성화하여 AI가 텍스트 설명을 덧붙이는 것을 원천 차단합니다.
> **프롬프트 강제성**: "No Preamble", "Start response with `[`" 등의 강한 제약 조건을 프롬프트 최상단에 배치합니다.

<!-- [Claude] response_mime_type 관련 중요 주의사항:

  1. [불확실성] gemma-4-31b-it이 Google AI API에서 response_mime_type: "application/json"을
     지원하는지 공식 문서 기준으로 미확인입니다. Gemma 시리즈는 Gemini와 다른 모델 패밀리이며,
     이 기능은 주로 Gemini 계열에서 동작이 보장됩니다. Open Questions 섹션에서도 이 점을 언급 중.
     
     → 실용적 권장: response_mime_type 추가를 시도하되, 동시에 파싱 로직도 강화하여
       "response_mime_type 없이도 살아남는" 이중 방어 구조를 만드는 것이 안전합니다.

  2. [중요] response_mime_type: "application/json"을 사용할 경우, 응답은 text 필드 대신
     JSON이 직접 올 수도 있습니다. 현재 파싱 코드:
       text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
     이 코드는 여전히 text 필드를 읽습니다. response_mime_type 적용 후에도 일부 API 구현에서는
     text 필드에 JSON 문자열로 담겨 오므로 현재 파싱 방식이 유지되지만, 동작을 확인 후 분기 처리가
     필요할 수 있습니다.

  3. [더 강력한 옵션] response_mime_type과 함께 response_schema를 사용하면 JSON 구조 자체를
     스키마로 제약할 수 있습니다. Gemini에서 지원되며 형식 오류를 API 레벨에서 차단합니다.
     예시 (bulk 모드):
       response_schema: {
         type: "array",
         items: {
           type: "object",
           properties: {
             date: { type: "string" },
             amount: { type: "number" },
             cat: { type: "string" },
             memo: { type: "string" }
           },
           required: ["date", "amount", "cat", "memo"]
         }
       }
     단, Gemma 4에서 지원 여부 확인 필요.
-->

## Proposed Changes

---

### 1. [Server] Gemma 4 전용 프롬프트 및 API 설정 강화

#### [MODIFY] [api/ocr.js](api/ocr.js)
- **JSON 모드 강제**: `generationConfig` 내에 `response_mime_type: "application/json"`를 추가하여 순수 JSON만 반환하도록 유도합니다.
- **프롬프트 재구조화**:
    - "당신은 이미지 분석 전문가입니다" 같은 역할을 부여하여 Gemma 4의 페르소나를 잡습니다.
    - 지시 사항의 최상단과 최하단에 "다른 설명 금지(No preamble, No postamble)", "JSON 배열만 반환(JSON Only)" 지시를 중복 배치합니다.
- **언어 제약**: 영문 요약을 차단하기 위해 "모든 응답은 반드시 지정된 JSON 형식으로만 시작해야 함"을 명시합니다.

<!-- [Claude] 프롬프트 재구조화 상세 권장안:

  현재 bulk 모드 프롬프트 구조 (문제):
    "이 이미지는 카드 앱의 이용내역 화면 캡처입니다. 화면에 보이는 모든 결제 내역을 추출하세요.
     아래 JSON 배열 형식으로만 응답하세요 (코드블록, 설명 없이):
     [{"date":...}]"
  
  → "아래 ... 형식" / "다음 형식" 같은 설명 구조가 Gemma 4의 "복창 행동"을 유발합니다.

  권장 프롬프트 구조 (3-레이어 방식):
  
  [레이어 1 — API system_instruction 필드에 배치]
    "You are an OCR data extractor. You only output valid JSON. Never explain, never summarize.
     Begin your response immediately with the JSON character ([ or {). No other text."
  
  [레이어 2 — 프롬프트 최상단에 배치 (강한 명령)]
    "CRITICAL: Output ONLY valid JSON. No preamble. No explanation. No markdown.
     Start your response with [ and end with ]."
  
  [레이어 3 — 프롬프트 본문 (작업 지시)]
    "Extract all transactions from this card statement screenshot.
     Return a JSON array: [{"date":"YYYY-MM-DD","amount":number,"cat":"category","memo":"merchant"}]
     Rules: exclude refunds, amount must be positive number, today=${today}, year=${today.slice(0,4)}
     Categories: ${CAT_GUIDE}"
  
  핵심 변경점:
  - "아래 형식으로만" → "Start your response with ["로 행동 지시를 구체화
  - 프롬프트에서 Input/Output 메타 언어 완전 제거
  - system_instruction을 별도 필드로 분리
  
  [Few-shot 예시 추가 권장]:
  "Example output: [{"date":"2026-04-01","amount":15000,"cat":"food","memo":"스타벅스"}]"
  1개의 예시만으로도 형식 안정성이 크게 올라갑니다.

  [temperature 조정]:
  현재 0.1이지만 JSON 구조화 작업에는 0.0이 가장 안정적입니다. (Gemma 4 특성상)
-->

<!-- [Claude] system_instruction 필드 사용 방법 (현재 미구현):
  Google AI API는 contents 배열 외에 별도의 system_instruction 필드를 지원합니다.
  
  현재:
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }, { inline_data: {...} }] }],
      generationConfig: { ... }
    })
  
  개선 후:
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: "You are a JSON-only OCR extractor. Never output explanations." }]
      },
      contents: [{ parts: [{ text: promptText }, { inline_data: {...} }] }],
      generationConfig: { ... }
    })
  
  Gemma 4 instruction-tuned 모델은 system_instruction 필드를 특별히 처리하도록 설계되어
  있어, 이 분리가 프리앰블 차단에 효과적입니다. Gemini 모델도 동일하게 지원합니다.
-->

---

### 2. [Frontend] 유연한 파싱 로직 도입

#### [MODIFY] [api/ocr.js](api/ocr.js)
- **클리닝 로직 강화**: AI가 마크다운 코드 블록(```json ... ```)을 포함하더라도 문제없이 데이터를 추출하도록 정규식을 보완합니다.

<!-- [Claude] 파싱 로직 개선 상세 분석:

  현재 파싱 코드의 문제점:
  
  (A) /\[[\s\S]*\]/ — greedy 매칭 위험
    만약 AI 응답이 "Here are the results: * Input: [...] * Output: [actual data]" 형태라면,
    첫 번째 [ 부터 마지막 ] 까지를 통째로 잡아버립니다. 이 경우 JSON.parse가 실패합니다.
    
  (B) 마크다운 코드블록 미처리
    Gemma 4는 JSON을 ```json\n[...]\n``` 형태로 감싸는 경향이 있습니다.
    현재 코드는 이를 처리하지 않아 ` `` ` 문자가 포함된 채로 JSON.parse를 시도합니다.
  
  권장 클리닝 파이프라인 (3단계):
  
    function cleanAndParseJSON(text, expectArray = false) {
      let cleaned = text.trim();
      
      // 1단계: 마크다운 코드블록 제거
      cleaned = cleaned.replace(/```(?:json)?\s*\n?/g, '').replace(/\n?```/g, '').trim();
      
      // 2단계: 직접 파싱 시도 (response_mime_type이 효과적으로 작동할 때)
      try { return JSON.parse(cleaned); } catch {}
      
      // 3단계: 정규식으로 JSON 부분 추출 (lazy 매칭으로 첫 번째 완전한 구조만 추출)
      const pattern = expectArray ? /\[[\s\S]*?\](?=\s*$|\s*[^,\]])/ : /\{[\s\S]*?\}(?=\s*$)/;
      // 더 안전하게: 앞뒤 쓰레기 문자를 건너뛰고 JSON 시작 찾기
      const startIdx = expectArray ? cleaned.indexOf('[') : cleaned.indexOf('{');
      if (startIdx === -1) return null;
      try { return JSON.parse(cleaned.slice(startIdx)); } catch {}
      
      return null;
    }
  
  핵심: JSON.parse를 먼저 시도하고, 실패 시 정규식으로 폴백하는 체계적 구조.
  현재처럼 무조건 정규식 → JSON.parse 순서가 아닌, 직접 파싱을 우선시.

  [추가 방어] JSON.parse 오류 시 에러 메시지에 AI 응답 앞부분(최대 200자)을 포함하면
  디버깅이 매우 편해집니다. 현재는 150자로 잘라서 로그에 남기고 있어 양호합니다.
-->

<!-- [Claude] gemini-3.1-flash-lite 모델명 의심:
  현재 폴백 체인: gemma-4-31b-it → gemini-2.5-flash → gemini-3.1-flash-lite
  
  2026년 4월 기준으로 "gemini-3.1-flash-lite" 모델이 실제 존재하는지 확인이 필요합니다.
  Google AI의 공식 릴리즈 패턴은 1.0, 1.5, 2.0, 2.5 순서이며 "3.1"은 생소합니다.
  만약 이 모델명이 잘못됐다면 폴백 체인 마지막 단계가 항상 404를 반환하게 됩니다.
  
  → Vercel 로그에서 "gemini-3.1-flash-lite" 요청이 404를 반환하는지 확인 권장.
  → 확인 전까지 안전한 폴백: gemini-2.5-flash-lite 또는 gemini-2.0-flash-lite 사용.
-->

---

## Open Questions

> [!CAUTION]
> **Gemma 4의 JSON Mode 지원 여부**: `gemma-4-31b-it` 모델이 Google AI Studio API에서 `response_mime_type` 설정을 완벽하게 지원하는지 실시간 확인이 필요합니다. 지원하지 않을 경우, 프롬프트의 "Few-shot" 예시를 강화하여 대응해야 합니다.

<!-- [Claude] 추가 Open Questions:

  Q1. [모델 전략] Gemma 4를 1순위로 둔 이유가 무엇인가요?
      Gemma 4는 오픈소스 계열 모델로 multimodal(이미지 처리)이 Gemini보다 제한적일 수 있습니다.
      이미지를 포함한 멀티모달 요청에서 Gemma 4의 성능이 Gemini 2.5 Flash보다 우수한지
      실제 테스트 비교가 필요합니다. 만약 Gemma 4가 무료 쿼터 때문에 1순위라면,
      이미지 인식 정확도 트레이드오프를 인지하고 있어야 합니다.

  Q2. [비용 vs 정확도] Gemma 4의 프리앰블 문제가 반복된다면, 장기적으로 Gemini 2.5 Flash를
      1순위로 올리고 Gemma 4를 2순위 폴백으로 내리는 것이 사용자 경험상 유리할 수 있습니다.

  Q3. [모델 가용성] gemma-4-31b-it이 Google AI Studio의 /v1beta/ API를 통해
      이미지 첨부(inline_data) 요청을 지원하는지 확인 필요.
      일부 Gemma 모델은 텍스트 전용으로만 서비스되거나 별도 엔드포인트를 사용합니다.
-->

## Verification Plan

### Automated Tests
1. **Raw Response 확인**: 수정 후 다시 사진을 올려, 에러 로그에 더 이상 `* Input` 같은 텍스트가 나타나지 않는지 확인.
2. **JSON 유효성 확인**: 반환된 텍스트가 유효한 JSON 배열 형식을 갖추고 있는지 로컬 테스트.

<!-- [Claude] 추가 검증 시나리오:

  3. [response_mime_type 효과 검증]
     console.log로 Gemini 응답 raw text를 먼저 찍어보세요:
       const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
       console.log('[OCR Raw]', rawText.slice(0, 300));
     이렇게 하면 response_mime_type 적용 전후 응답 형식 변화를 직접 확인할 수 있습니다.

  4. [폴백 체인 검증]
     각 모델의 응답 상태를 로그로 남겨서 어떤 모델이 실제로 성공하고 있는지 파악하세요:
       console.log(`[OCR] 모델 ${model} 시도 → 상태 ${geminiRes.status}`);

  5. [파싱 실패 재현 테스트]
     `* Input: ... * Output: [{"date":...}]` 형태의 가짜 응답 문자열을 만들어
     개선된 파싱 함수가 올바르게 JSON 부분만 추출하는지 단위 테스트.

  6. [system_instruction 효과 검증]
     system_instruction 필드 유무에 따른 응답 비교 테스트.
     A/B 형식으로 같은 이미지에 두 가지 방식으로 각각 요청해보고 프리앰블 발생률 비교.
-->

### Manual Verification
1. **실제 카드 내역 분석**: 카드사 앱의 복합 이미지를 다시 업로드하여 Gemma 4의 인식 성공 여부 최종 확인.

<!-- [Claude] 수동 검증 추가:

  2. [경계 케이스] 내역이 1건만 있는 이미지 (최소), 15건 이상인 이미지 (최대) 각각 테스트.
     4096 토큰 한계에서 내역이 잘리지 않는지 확인.

  3. [언어 혼용 이미지] 영문 카드사 앱(예: 해외 카드) 캡처를 넣었을 때도 한국어 카테고리가
     올바르게 분류되는지 확인.

  4. [에러 메시지 품질] 파싱 실패 시 사용자에게 보여지는 에러 메시지가 "AI 응답 앞부분"을
     포함한 디버깅 정보를 담고 있는지 확인. 현재 코드는 text.slice(0, 150)으로 포함 중 (양호).
-->
