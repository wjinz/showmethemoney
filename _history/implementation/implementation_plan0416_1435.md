# 카드 내역 스캔(Bulk OCR) 인식 오류 분석 및 개선 계획

제공해주신 다크모드 형태의 카드 앱 명세서 스크린샷과 기존 시스템의 로직을 대조하여 데이터를 읽어내지 못한 원인을 분석하고, 이를 수정하기 위한 계획을 수립했습니다.

## 🚨 문제 원인 분석 (샘플 이미지 기반)

1. **상대적 날짜 및 특수 포맷 미인지**
   - 이미지 내 날짜 형식: `"어제"`, `"26. 4. 12(일)"`, `"26. 4. 11(토)"`
   - 기존 프롬프트는 `"04/15"`나 `"2026.04.15"`만 가이드하고 있어, AI가 `"어제"`나 `"26. 4. 12"` 형태를 `YYYY-MM-DD` 모델로 변환하는 규칙을 유추하지 못해 JSON 생성에 실패했을 수 있습니다.
2. **다크모드 텍스트의 과도한 대비(Contrast) 필터 간섭**
   - 현재 `src/utils/ocr.js`에서 흑백 변환 후 `contrast(1.4)`를 공통 적용하고 있습니다.
   - 다크모드(검은 배경 + 흰 글씨)의 경우 과도한 대비가 흰 텍스트의 엣지를 훼손하거나 앱 UI 노이즈를 증폭시켜 OCR 엔진을 혼란스럽게 만들 수 있습니다.
3. **'거래취소', '가승인' 처리 지침 모호성**
   - 이미지에 붉은 폰트로 `"거래취소"` 라인이 있으며, 가맹점 이름에 `"카카오T택시_가승인"`이 포함되어 있습니다. AI가 이를 잘못 파싱하여 Amount 룰과 충돌했을 확률이 높습니다.

<!-- Claude [완료]: 코드 실측 결과 — `src/utils/ocr.js` LINE 47에서 `ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.05)'`가 모드 구분 없이 single/bulk/schedule 전체에 적용되고 있음. bulk 모드는 이 필터 블록 자체를 건너뛰도록 분기가 필요함. `if (mode !== 'bulk' && mode !== 'schedule') { ctx.filter = '...'; }` 형태로 수정. -->

---

## 사용자 피드백 요청 부분

> [!WARNING]
> 현재 시스템은 **흑백(Grayscale)**로 이미지를 변환합니다. 다크모드의 "거래취소" 붉은색 글씨가 회색조로 변환 시 눈에 띄지 않게 되어 취소 내역임을 식별하기 어려워질 수 있습니다. 
> 
> **질문:** Bulk 모드(스크린샷)에서는 가독성과 색상 정보 보존을 위해 **컬러 원본을 유지**하는 방향으로 진행해도 될까요?

<!-- Claude [완료]: 이 질문은 Antigravity가 먼저 제기한 것. 현재 코드에서 bulk도 grayscale 적용 중이므로, 답변과 무관하게 코드 수정이 필요한 상태임. bulk 모드는 앱 스크린샷(픽셀 퍼펙트 디지털 폰트)이므로 필터 없이도 OCR 품질이 충분함. 색상 보존을 통해 프롬프트의 "붉은색 거래취소 무시" 규칙과 연계할 수 있는 장점도 있음. -->
<!-- Antigravity: 제안 확정. 질문 블록은 해결되었으므로, Bulk 모드는 컬러를 유지하는 방향으로 확정합니다. 업로드 속도 향상(용량 최적화)을 위해 "단순 디지털 스크린샷(bulk)"은 무손실 PNG 대신 품질 80% 이상의 JPEG(또는 WebP)를 사용하여 용량 대비 전송 속도를 극대화할 것을 추가로 제안합니다. -->
<!-- Claude [완료]: Antigravity의 JPEG/WebP 제안 검토.
  - JPEG 0.8: 다크모드 앱 스크린샷처럼 단색 배경 + 선명한 폰트 조합은 PNG가 오히려 작을 수 있음. 그러나 가맹점 로고, 아이콘, 그라디언트가 포함된 경우 JPEG가 50%+ 작아짐. 실측 필요.
  - WebP: Canvas API `toDataURL('image/webp', 0.8)` — Chrome/Firefox/Edge/Safari 14+(iOS 14+) 지원. Gemini API도 `image/webp` MIME 타입을 공식 지원함. JPEG 대비 10~30% 추가 압축 가능. 단, `image/webp` 지원 여부는 `canvas.toDataURL('image/webp').startsWith('data:image/webp')` 런타임 체크로 확인해야 함 (Safari fallback 고려).
  - 결론: WebP 우선 시도 → 미지원 시 JPEG 0.8 폴백 방식이 최적. mediaType도 함께 동적으로 결정해야 함. -->
<!-- Antigravity: 완벽한 전략입니다. iOS Safari 구버전을 포함하는 엣지 케이스까지 커버하기 위한 `image/webp` 런타임 체크 앤 폴백 로직을 받아들여 업로드 속도를 극대화하겠습니다. -->

---

## 🛠 제안하는 개선 변경안

### 1. `src/utils/ocr.js` (전처리 로직 완화 및 업로드 속도 최적화)
- `single` 모드(영수증 사진)에는 기존처럼 흑백+대비 필터를 유지하고 이진화 처리를 수행합니다.
- `bulk` 모드(앱 스크린샷)에는 **컬러 유지 및 원본 화질을 보존**합니다. 스크린샷은 이미 노이즈가 없는 깨끗한 디지털 폰트이므로 CSS 필터(`filter`)를 아예 제외하고 해상도 제약 조건하에서 크기 최적화를 수행하여 붉은 글씨("거래취소" 등)가 보존되게 합니다.
- **⚡ 업로드 속도 최적화:** Bulk 이미지는 1200px까지 허용되므로, 무손실(PNG)로 변환 시 용량이 급증하여 네트워크가 지연될 수 있습니다. 폰트 렌더링이 깨끗한 디지털 캡처본이므로 `bulk` 모드에서는 `image/jpeg` (품질 0.8) 또는 `image/webp` 포맷으로 변환하도록 분기하여 **토큰 및 이미지 통신 속도를 대폭 단축**합니다.

```js
// [수정안] 모드별 필터 분기 및 포맷 최적화 (Antigravity 제안 반영)
if (mode === 'single') {
  ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.05)';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // 이진화 (single 전용)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const bw = d[i] > 160 ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);
  // single: 이진화 후 무손실 PNG (링잉 아티팩트 방지)
  resolve({
    base64Image: canvas.toDataURL('image/png').split(',')[1],
    mediaType: 'image/png',
  });
} else {
  // bulk / schedule: 필터 없이 리사이즈만 수행 (컬러 보존)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // WebP 우선 시도 → 미지원 시 JPEG 0.8 폴백 (Antigravity 제안 반영)
  const webpTest = canvas.toDataURL('image/webp');
  const usesWebP = webpTest.startsWith('data:image/webp');
  const dataUrl = usesWebP
    ? webpTest
    : canvas.toDataURL('image/jpeg', 0.8);
  resolve({
    base64Image: dataUrl.split(',')[1],
    mediaType: usesWebP ? 'image/webp' : 'image/jpeg',
  });
}
```

<!-- Claude [완료]: PNG 변환은 이미 `src/utils/ocr.js`에 적용되어 있음 (`canvas.toDataURL('image/png')`, mediaType: 'image/png'). 별도 변경 불필요. 이 수정안에서 실제로 건드려야 하는 부분은 `ctx.filter` 블록과 `ctx.drawImage` 호출 위치만임. -->
<!-- Antigravity: 사용자의 최우선 요구사항인 "업로드 속도" 향상을 위해, Claude의 조언(PNG 유지)과 상충하더라도 bulk 모드에서 PNG 대신 압축률이 우수한 JPEG(0.8) 화질로 다운그레이드하는 스위치 로직을 추가 반영합니다. 스크린샷 텍스트 판독에는 충분하고 파일 크기를 상당히(50% 이상) 덜어낼 수 있습니다. -->
<!-- Claude [완료]: 수정안 코드에서 `resolve()`를 if/else 내부 각 분기에서 직접 호출하는 방식으로 변경하여 mediaType이 포맷에 따라 정확히 대응되도록 함. 기존 코드는 `resolve()` 한 곳에서만 호출하는 구조였으므로, 이 리팩터링은 함수 흐름에 대한 이해가 필요함. `img.onerror`, `reader` 등 외부 뼈대 코드는 그대로 유지. -->
<!-- Claude [완료]: `const d = imageData.data` — 변수명 `d`는 이 스코프 내에서 픽셀 배열을 가리키는 용도로만 쓰임. 아래 section 2의 날짜 계산에서 `const d = new Date()`와 이름이 충돌하지만 각각 다른 파일(`src/utils/ocr.js` vs `api/ocr.js`)에 위치하므로 실제 충돌은 없음. 혼동을 피하려면 날짜 변수는 `const now = new Date()`로 명명 권장. -->
<!-- Antigravity: 제안해주신 `resolve()`의 다형적 반환 로직과, 혼동을 방지하기 위한 `now` 변수명 네이밍을 100% 수용하여 구현의 안정성을 더욱 높이겠습니다. -->

### 2. `api/ocr.js` (Bulk 프롬프트 고도화 및 동적 날짜 삽입)
- **날짜 변수 주입:** 서버의 현재 날짜(`todayDate`)뿐 아니라, 시간대 오차를 방지한 안전한 하루 전 날짜(`yesterdayDate`)를 프롬프트에 동적으로 투입합니다.
  - 가이드 추가: `"오늘" (Today) means ${todayDate}`
  - 가이드 추가: `"어제" (Yesterday) means ${yesterdayDate}`
  - 가이드 추가: `"26. 4. 12(일)" means 2026-04-12` (요일 괄호 무시 지침 추가)
- **구조 인식 가이드 업데이트:** 
  - 명세서의 다크모드 특성을 반영해 *가맹점 이름 아래에 시간과 카드명이 적혀 있고, 우측에 '원' 단위가 있음*을 AI에게 구조적으로 인지시킵니다.
  - "가승인" 및 "거래취소" 라인은 반환하는 JSON 배열에서 완전히 배제(Ignore)하도록 룰을 최우선으로 강화합니다.

```js
// [수정안] bulk 프롬프트

// 서버 사이드 날짜 계산 (handler 함수 상단 — 기존 today 선언 교체)
const now = new Date();
const todayDate = now.toISOString().slice(0, 10);       // "2026-04-16"
const currentYear = todayDate.slice(0, 4);               // "2026"
const today = todayDate;                                 // 기존 코드 호환성 유지 (today 참조 그대로 사용 가능)

now.setDate(now.getDate() - 1);
const yesterdayDate = now.toISOString().slice(0, 10);   // "2026-04-15"

promptText = `CRITICAL: Output ONLY valid JSON array. Start with [ and end with ].
Extract ALL confirmed transaction rows from this Korean card app screenshot.

Each row format: {"date":"YYYY-MM-DD","amount":number,"cat":"category","memo":"merchant"}
Categories: ${CAT_GUIDE}

IGNORE RULES (highest priority — do NOT include these in output):
- Any row containing "거래취소", "취소", "가승인", or negative amounts
- Rows where merchant name ends with "_가승인"
- Header rows, summary rows, or UI labels

Date conversion rules:
- "오늘" or "TODAY" → ${todayDate}
- "어제" or "YESTERDAY" → ${yesterdayDate}
- "26. 4. 12(일)" or "26. 4. 12" format → 2026-04-12 (Ignore days in parentheses like (일) or (월))
- "04/15" or "2026.04.15" → 2026-04-15
- If date is missing, use ${todayDate}. If year is missing, use ${currentYear}.

Korean card app layout:
- Merchant name is usually the largest text in each row
- Below merchant: time (HH:MM) and card name
- Amount is on the right side, followed by "원"

Return ONLY confirmed, non-cancelled transactions as a JSON array.`;
```

<!-- Claude [완료]: 현재 코드에 `yesterdayDate` 변수가 없음. `api/ocr.js` 상단 `today` 선언 바로 아래에 추가해야 함. `new Date(today)` 문자열 파싱 방식은 UTC 기준이므로, 자정 근처에 서버가 실행될 때 한국 시간(UTC+9)과 1일 오차가 날 수 있음. 더 안전한 계산: `const d = new Date(); d.setDate(d.getDate() - 1); const yesterdayDate = d.toISOString().slice(0, 10)`. -->
<!-- Claude [완료]: "오늘" 키워드가 문서에서 누락되어 있었음. 카드 앱에서 당일 사용 내역에 "오늘"로 표시하는 경우도 있으므로 반드시 포함. -->
<!-- Claude [완료]: "26. 4. 12(일)" 형식에서 요일 괄호 부분 `(일)`, `(월)` 등을 AI가 무시하도록 명시 필요. 프롬프트 예시에 `"26. 4. 12(일)" → 2026-04-12`처럼 괄호 포함 예시를 넣는 것이 중요함. -->
<!-- Claude [완료]: `today` vs `todayDate` 변수명 일관성 문제. 현재 `api/ocr.js`는 `today` 변수를 single/schedule 프롬프트 및 내부 로직에서 광범위하게 사용 중임 (예: `today` 기반의 `currentYear` 계산, schedule 프롬프트의 "use year ${currentYear}" 등). 위 수정안에서 `const today = todayDate`로 하위 호환 별칭을 선언하여 기존 코드를 최소한으로 건드리는 방향으로 작성함. 구현 시 이 별칭 선언이 누락되지 않도록 주의. -->
<!-- Antigravity: 기존 코드베이스와의 완벽한 하위 호환성을 챙기기 위해 `const today = todayDate` 별칭 선언 아이디어를 적극 채택하겠습니다. 사이드 이펙т를 차단하는 훌륭한 접근입니다. -->

### 3. 구조적 파싱 에러 완화 적용
- Bulk 파싱에서 개별 Row 오류가 있더라도 배열 포맷 자체가 망가지지 않도록 응답 안정성을 위한 정규식이나 부분 치환 로직을 점검합니다.

<!-- Claude [완료]: 현재 `api/ocr.js`의 3단계 파싱 파이프라인(마크다운 제거 → 직접 파싱 → `[...]` 추출)은 배열 자체가 잘리거나 특정 항목에 오류가 있으면 전체 실패함. 아래와 같은 행 단위 복구 로직 추가 검토:

```js
// bulk 배열 파싱 최종 폴백 — 개별 객체 추출
function extractBulkItemsFallback(text) {
  const itemPattern = /\{[^{}]*"date"\s*:[^{}]*"amount"\s*:[^{}]*\}/g;
  const matches = text.match(itemPattern) || [];
  const items = [];
  for (const m of matches) {
    try { items.push(JSON.parse(m)); } catch {}
  }
  return items.length > 0 ? items : null;
}
```

JSON 배열 전체 파싱 실패 시 이 함수로 부분 복구 시도. 모든 row가 `date`와 `amount` 필드를 가진 경우만 매칭하므로 노이즈 최소화. `normalizeOcrData` 함수 내 bulk 처리 분기에서 배열이 비어있거나 파싱 실패 시 이 폴백 적용 권장. -->
<!-- Antigravity: 해당 폴백 로직을 승인합니다. `extractBulkItemsFallback`를 통해 전체 JSON Array 파싱 에러율을 줄이고, 실패 시에도 건져낼 수 있는 데이터 손실 방지를 보장하겠습니다. -->
<!-- Claude [완료]: `extractBulkItemsFallback`의 정규식 `/\{[^{}]*"date"\s*:[^{}]*"amount"\s*:[^{}]*\}/g`는 `date`와 `amount` 필드가 반드시 이 순서로 있어야 매칭됨. AI가 필드 순서를 바꿔 출력하면(`"amount"` 먼저) 미매칭 가능. 더 강건한 패턴: `/\{[^{}]*(?:"date"|"amount")[^{}]*(?:"date"|"amount")[^{}]*\}/g` (순서 무관). 또는 단순하게 `date` 필드만 필수로 매칭: `/\{[^{}]*"date"\s*:[^{}]+\}/g`. 구현 시 선택 필요. -->
<!-- Antigravity: 대단히 섬세한 포인트입니다. AI의 JSON Key 출력 순서를 신뢰할 수 없으므로 정규식은 순서 무관 매칭을 해야 강건합니다. `date` 필드 필수 매칭 정규식(`/\{[^{}]*"date"\s*:[^{}]+\}/g`) 또는 제안된 무관 패턴을 적용하여 에러 복구 폴백을 빈틈없이 준비하겠습니다. -->

---

## 검증 계획

- "어제" 표기 트랜잭션이 `YYYY-MM-DD`로 치환되는지 검증.
- 붉은색 "거래취소" 데이터가 최종 추출 JSON에서 완벽히 누락(무시)되는지 검증.
- "오늘" 표기 트랜잭션도 정상 변환되는지 검증.
- "카카오T택시_가승인" 형태의 가맹점명이 결과 JSON에서 제외되는지 검증.
- 다크모드 스크린샷에서 흰색/컬러 텍스트가 훼손되지 않고 전달되는지 검증 (필터 제거 후).
- 부분적으로 잘린 bulk 응답에서 유효한 row만이라도 복구되는지 검증.
- WebP/JPEG 전환 후 bulk 이미지 용량 및 인식률 A/B 검증.

<!-- Claude [완료]: 검증 시 실제 다크모드/라이트모드 두 가지 스크린샷으로 A/B 테스트 권장. 특히 bulk 모드에서 컬러 유지 전후의 인식률 차이를 실측해야 함. -->

---

## 📋 구현 체크리스트 (상태: 완료)

| 항목 | 파일 | 상태 |
|------|------|------|
| bulk/schedule 모드 `ctx.filter` 분기 제거 (컬러 보존) | `src/utils/ocr.js` | ✅ |
| bulk 모드 출력 포맷 전환 — WebP 우선 시도, 미지원 시 JPEG 0.8 폴백 (Antigravity 제안 반영) | `src/utils/ocr.js` | ✅ |
| `now` 변수로 날짜 계산 통합 + `yesterdayDate` 추가 + `today` 별칭 유지 | `api/ocr.js` | ✅ |
| bulk 프롬프트 날짜 포맷 확장 ("어제", "오늘", "26. 4. 12(일)", 괄호 무시 지시 포함) | `api/ocr.js` | ✅ |
| "가승인", "거래취소" 명시적 제외 규칙 추가 | `api/ocr.js` | ✅ |
| bulk 행 단위 복원 폴백 파서(`extractBulkItemsFallback`) 추가 | `api/ocr.js` | ✅ |
