# 지출 입력 시스템 개선 계획
**작성일시**: 2026-04-16 01:20  
**기반 버전**: v4.0.0  
**핵심 제약**: Gemma 4 31B (비용 한계), Vercel Serverless, 브라우저 Canvas API

---

## 현황 진단

### 문제 1 — 응답 속도 (최우선)

현재 `api/ocr.js`의 모델 체인: `gemma-4-31b-it` → `gemini-2.5-flash` → `gemini-2.0-flash`

Gemma 4 31B은 31B 파라미터 모델로 추론이 무거움. 영수증 single 모드에서도 5~15초 소요. 근본 원인은 두 가지:

1. **이미지 데이터 과다**: single 모드에서 800px JPEG 0.75로 압축해도 base64 인코딩 후 100~400KB. 영수증 금액 추출엔 불필요한 정보(배경, 색상)가 과다.
2. **모델에 과부하**: 31B 모델에 고해상도 이미지를 그대로 넘기고 있음.

### 문제 2 — 추출 실패

`src/utils/ocr.js`의 `optimizeImage()`:
```js
ctx.filter = 'grayscale(1)';
ctx.drawImage(img, 0, 0, width, height);
const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
```

단순 흑백 변환만 수행. 저조도, 기울어진 영수증, 고대비 필요 상황에서 텍스트 가독성이 나쁜 채로 모델에 전달됨. Gemma 4는 OCR 특화 모델이 아니므로 이미지 품질에 민감.

### 문제 3 — OCR → 입력 폼 연결 끊김

`QuickEntrySheet`에서 파일 선택 시:
```js
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  window.__sharedFile = file;
  onClose();       // QuickEntrySheet 닫기
  onCardScan();    // CardScanSheet 열기 (bulk 모드)
};
```

단건 영수증(single OCR)임에도 불구하고 bulk용 `CardScanSheet`로 넘겨버림. 즉, 단건 영수증 → AI 스캔 → 결과를 입력 폼에 자동 채워주는 흐름이 없음.

### 문제 4 — 프롬프트 미최적화

현재 single 모드 프롬프트:
```
Extract the total amount, category, and merchant from this receipt.
```

한국 영수증 특성(VAT 포함 합계, "결제금액", "승인금액" 등 키워드)에 대한 few-shot 예시가 없음. Gemma 4가 어떤 숫자를 골라야 할지 불명확.

---

## 개선 계획

### Phase 1 — 이미지 전처리 파이프라인 강화 (속도 + 정확도)
> **상태: 미완료**  
> 현재 `src/utils/ocr.js`: single=800px, `grayscale(1)` 단순 필터, JPEG 0.75

**파일**: `src/utils/ocr.js` → `optimizeImage()` 교체

핵심 아이디어: 영수증은 흰 배경 + 검은 텍스트. 이진화(binarization)와 대비 강화를 적용하면 모델 입력 품질이 올라가고 파일 크기도 줄어듦.

**단계별 파이프라인**:
1. Resize: single 800px → **480px** (충분함, 더 빠름)
2. Grayscale 변환
3. 레벨 조정 (대비 극대화): `globalCompositeOperation` + 레벨 스트레칭
4. PNG 대신 **JPEG 0.60** 품질 (텍스트는 손실 압축에 강함)

```js
async function optimizeImage(imageFile, mode = 'single') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIZE = mode === 'single' ? 480 : 1200;
      let { width, height } = img;

      if (Math.max(width, height) > MAX_SIZE) {
        const ratio = MAX_SIZE / Math.max(width, height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context 생성 실패'));

      // 1단계: 흑백 변환
      ctx.filter = 'grayscale(1) contrast(1.4) brightness(1.05)';
      ctx.drawImage(img, 0, 0, width, height);

      // 2단계: 픽셀 레벨 임계값 (이진화 근사)
      if (mode === 'single') {
        const imageData = ctx.getImageData(0, 0, width, height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = d[i]; // grayscale 후 R=G=B
          const bw = gray > 160 ? 255 : 0; // 임계값 160
          d[i] = d[i + 1] = d[i + 2] = bw;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve({
        // [Claude 피드백 반영] 이진화 적용 후, 영수증 텍스트 선명도와 용량 효율을 고려해 PNG 포맷으로 변경
        base64Image: canvas.toDataURL('image/png').split(',')[1],
        mediaType: 'image/png',
      });
    };
    img.onerror = () => reject(new Error('이미지 로드 오류'));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target?.result ?? ''; };
    reader.readAsDataURL(imageFile);
  });
}
```

**예상 효과**:
- single 이미지: 150~400KB → 15~40KB (90% 감소)
- 모델 입력 토큰 대폭 감소 → 응답 속도 3~5배 향상

> [!NOTE]
> **Antigravity 제안 (리뷰 섹션 #1 반영):**
> 픽셀 레벨 이진화(0/255 완전 2값) 후에는 손실 압축인 JPEG보다 **무손실 PNG(`image/png`)가 파일 크기가 더 작고 텍스트 가장자리가 선명**할 수 있습니다. JPEG는 대비가 높은 경계선 주변에 링잉 아티팩트(Ringing Artifact)를 생성하여 OCR 인식률을 낮출 위험이 있습니다. 구현 후 두 포맷을 같은 영수증으로 실제 테스트하여 (1) 파일 크기, (2) 모델 인식 결과를 비교한 뒤 최종 포맷을 결정하는 것을 권장합니다.

<!-- Claude: `canvas.toDataURL('image/png')` 변환 시 별도 품질 파라미터 없이 호출. 이진화 후 PNG 용량은 영수증 복잡도에 따라 달라지므로 실측 필요. `mediaType: 'image/png'`으로 함께 변경해야 함. -->

---

### Phase 2 — 프롬프트 엔지니어링 (추출 정확도)
> **상태: 미완료**  
> 현재 `api/ocr.js`: single 모드 단순 영문 프롬프트, 한국어 키워드/few-shot 예시 없음

**파일**: `api/ocr.js` → single 모드 promptText 교체

한국 영수증의 금액 필드는 "합계", "결제금액", "승인금액", "청구금액" 등 다양. VAT가 별도로 표시되는 경우 합계가 혼동됨.

```js
// single 모드 프롬프트 개선안
promptText = `CRITICAL: Output ONLY valid JSON. Start with { and end with }.
You are analyzing a Korean receipt or payment slip.

Rules (strictly follow):
1. amount: The FINAL total paid (look for "합계", "결제금액", "승인금액", "청구금액" — pick the LARGEST or final total). Must be a positive integer. No commas.
2. cat: Classify into ONE of [${CAT_GUIDE}] based on merchant type.
3. memo: The merchant name only (store name, not items).

Korean receipt keywords: 합계=total, 승인금액=approved amount, 부가세=VAT, 가맹점=merchant

Examples:
- Receipt showing "합계 15,000" at GS25 → {"amount":15000,"cat":"food","memo":"GS25"}
- Card slip showing "승인금액 52,000" at 올리브영 → {"amount":52000,"cat":"clothing","memo":"올리브영"}
- Receipt showing "결제금액 8,500" at 카페베네 → {"amount":8500,"cat":"food","memo":"카페베네"}

Now extract from this image: {"amount":number,"cat":"category","memo":"merchant_name"}`;
```

**bulk 모드 개선**: 카드 명세서 특화 추가

```js
promptText = `CRITICAL: Output ONLY valid JSON array. Start with [ end with ].
Extract ALL transaction rows from this Korean card statement screenshot.

Each row format: {"date":"YYYY-MM-DD","amount":number,"cat":"category","memo":"merchant"}
Categories: ${CAT_GUIDE}

Korean card statement patterns:
- Date column: "04/15" or "2026.04.15" → convert to YYYY-MM-DD using year ${currentYear}
- Amount: ignore "취소" (cancellation) rows, only include positive charges
- Merchant names are usually in Korean or English brand names

Return ALL visible transaction rows as a JSON array.`;
```

---

### Phase 3 — single OCR → 입력 폼 자동 연결 (UX 핵심 개선)
> **상태: 미완료**  
> 현재: `handleFileSelect` → `window.__sharedFile` → `onClose()` → `onCardScan()` (bulk `CardScanSheet`로 넘어감)

**문제**: 현재 `QuickEntrySheet`에서 영수증 파일 선택 시 bulk용 `CardScanSheet`로 분기됨.  
**목표**: 단건 영수증 → OCR → 결과가 입력 폼 필드에 자동 채워짐.

**구현 방법**: `QuickEntrySheet`에 `useOcrScan` 훅을 직접 내장.

```js
// QuickEntrySheet.jsx 수정안
// [Claude 피드백 반영] runOCR 직접호출 대신 useOcrScan 훅의 내부 상태에 의존
import { useOcrScan } from '../hooks/useOcrScan';
import { useRef, useEffect } from 'react';

export function QuickEntrySheet({ ... }) {
  const { phase: ocrPhase, data: ocrData, error: ocrError, startScan, reset: resetOcr } = useOcrScan(null, 'single');
  const fileInputRef = useRef(null);

  const handleReceiptFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEntryStep('form'); // 즉시 form으로 전환
    startScan(file);      // [Claude 피드백 반영] runOCR 직접 호출 삭제, startScan 사용
  };

  // [Claude 피드백 반영] phase, data 변경에 따른 필드 자동 채움 효과 처리
  useEffect(() => {
    if (ocrPhase === 'done' && ocrData) {
      if (ocrData.amount) setAmount(String(ocrData.amount));
      if (ocrData.cat)    setCat(ocrData.cat);
      if (ocrData.memo)   setMemo(ocrData.memo);
    } else if (ocrPhase === 'error') {
      setOcrError('영수증 인식 실패. 직접 입력해 주세요. (' + ocrError + ')');
    }
  }, [ocrPhase, ocrData, ocrError]);

  // [Antigravity 제언 & Claude 피드백 연계 방안] "다시 스캔" 리셋 기능 구현
  const handleRetake = () => {
    resetOcr();
    setAmount(''); setCat('etc'); setMemo('');
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // form step에서 오버레이 스피너 표시
  const formContent = (
    <div style={{ position: 'relative' }}>
      {ocrPhase === 'scanning' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(var(--bg2-rgb), 0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12,
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 32 }}>🧠</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>영수증 분석 중...</div>
        </div>
      )}
      
      {/* 📸 다시 스캔 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={handleRetake} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 13, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          📸 다시 스캔
        </button>
      </div>
      
      {/* 다시 촬영용 숨겨진 input */}
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleReceiptFile} style={{ display: 'none' }} />

      {/* 기존 form 내용 */}
    </div>
  );
}
```

**결과**: 사용자가 영수증 사진 선택 → 폼이 즉시 열림 → AI가 분석하는 동안 스피너 → 완료 시 금액/카테고리 자동 채워짐 → 사용자가 확인/수정 후 저장.

기존 `CardScanSheet` (bulk 모드)는 선택 화면에서 "카드 내역 스캔" 전용 버튼으로 분리.

> [!NOTE]
> **Antigravity 제안 (리뷰 섹션 #3 반영) — "다시 스캔" 퇴로 확보:**
> OCR 결과가 완전히 빗나가거나 흐릿한 사진으로 재촬영이 필요한 경우, 창을 닫고 처음부터 다시 시작해야 하는 불편함을 방지하기 위해 **form 단계 상단 또는 금액 필드 옆에 "📸 다시 스캔" 버튼**을 추가해야 합니다. 이 버튼 클릭 시 `ocrLoading`, `amount`, `cat`, `memo`를 초기화하고 파일 picker를 다시 트리거합니다.

<!-- Claude: `useOcrScan` 훅의 `reset()` 함수를 호출하되 `entryStep`을 'select'로 되돌리거나 숨겨진 `<input type="file" ref>` 트리거로 재촬영 구현 가능. `CardScanSheet`의 리뷰 단계에 있는 "재촬영" 버튼과 동일한 패턴으로 구현하면 됨. -->

<!-- Claude: 현재 `runOCR`을 직접 호출하는 방식과 `useOcrScan` 훅 내부에서 호출하는 방식 사이에 설계 이중성이 있음. `useOcrScan`을 사용하면 429 쿨다운 처리와 sessionStorage 영속성이 자동으로 적용되므로, `startScan`을 직접 호출하는 방식이 더 안전함. 구현 시 `runOCR(file)` 직접 호출 대신 `startScan(file)`를 사용하고, `useOcrScan`의 `phase`, `data`, `error` 상태를 참조하도록 조정 권장. -->

---

### Phase 4 — 입력 선택 화면 재설계
> **상태: 미완료**  
> 현재: 3가지 항목 (AI 영수증 스캔 → bulk로 연결, SOS, 직접 입력)

현재 `QuickEntrySheet`의 `select` 단계에 영수증 스캔 / SOS / 직접 입력 3가지만 있음.

**개선안**: single 영수증 vs bulk 카드내역을 명확히 분리.

```
┌─────────────────────────────────────┐
│ 무엇을 기록할까요?                  │
├─────────────────────────────────────┤
│ 📸  영수증 스캔          → single   │
│     사진 1장 → 1건 자동 입력        │
├─────────────────────────────────────┤
│ 🗂  카드 내역 스캔       → bulk     │
│     명세서 스크린샷 → 여러 건       │
├─────────────────────────────────────┤
│ ✏️  직접 입력                       │
├─────────────────────────────────────┤
│ 🆘  SOS 긴급 결재                   │
└─────────────────────────────────────┘
```

```jsx
// select 단계 버튼 추가
const ENTRY_OPTIONS = [
  {
    id: 'receipt',
    icon: '📸',
    title: 'AI 영수증 스캔',
    sub: '사진 1장 → 금액·카테고리 자동 입력',
    color: '#3B82F6',
    isFile: true,
    accept: 'image/*',
    // [Claude 주의사항 반영] capture 속성을 명시적으로 제거하여 갤러리 업로드 기능을 방해하지 않음. 카메라는 OS 파일 피커에서 선택.
  },
  {
    id: 'bulk',
    icon: '🗂',
    title: '카드 내역 일괄 입력',
    sub: '카드 명세서 스크린샷 → 여러 건 한꺼번에',
    color: '#8B5CF6',
  },
  {
    id: 'manual',
    icon: '✏️',
    title: '직접 입력',
    sub: '카테고리와 금액을 직접 선택',
    color: 'var(--gold)',
  },
];
```

`capture="environment"` 속성 추가로 모바일에서 카메라 직접 실행 가능 (현재 파일 피커 → 카메라 선택 2단계를 1단계로 단축).

> [!WARNING]
> **Claude 주의사항 — `capture` 속성 충돌:**
> 커밋 `6934bc5` ("fix: AI 영수증 스캔 시 갤러리 업로드 기능 복구")에서 `capture` 속성이 **의도적으로 제거**된 이력이 있습니다. `capture="environment"`를 설정하면 iOS/Android에서 갤러리에서 기존 사진을 선택하는 기능이 막히고 카메라만 열립니다. 갤러리 업로드 복구가 필요해서 제거했다면, 이 옵션을 다시 추가할 경우 같은 문제가 재발합니다.
>
> **권고**: `capture` 속성 없이 구현한 후, 선택 화면에 "카메라로 찍기" / "갤러리에서 선택" 두 개의 별도 버튼으로 분리하거나, 현재처럼 `capture` 없이 파일 피커만 사용하는 방향 검토 필요. 구현 전 반드시 사용자에게 확인할 것.

---

### Phase 5 — 서버 사이드 응답 신뢰성 강화
> **상태: 미완료**  
> 현재 `api/ocr.js`: `extractAmountFallback` 없음, maxOutputTokens: single=256, bulk=4096

**파일**: `api/ocr.js`

**문제**: Gemma 4가 JSON을 완전히 반환하지 못하고 중간에 잘리는 경우 파싱 실패.

**개선**: 응답 후처리에 숫자 추출 폴백 추가.

```js
// normalizeOcrData 아래에 추가할 amount 폴백 파서
function extractAmountFallback(rawText) {
  // "합계 15,000", "결제금액 52000", "₩15,000" 등에서 숫자 추출
  // [Antigravity 제안 반영] 단순 첫 매치 대신 모든 후보를 배열로 추출 후 최대값 선택
  const patterns = [
    /(?:합계|결제금액|승인금액|청구금액)[^\d]*(\d[\d,]+)/g,
    /₩\s*(\d[\d,]+)/g,
    /(\d[\d,]{4,})/g,  // 5자리 이상 숫자 (카드번호 4자리 오인 방지)
  ];
  const candidates = [];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(rawText)) !== null) {
      const val = parseInt(m[1].replace(/,/g, ''), 10);
      if (!isNaN(val)) candidates.push(val);
    }
    if (candidates.length > 0) break; // 우선순위 높은 패턴에서 찾으면 중단
  }
  if (candidates.length === 0) return null;
  return Math.max(...candidates); // 가장 큰 숫자 = 최종 합계 가능성 최대
}

// 파싱 실패 시 텍스트 기반 폴백
} catch (err) {
  const fallbackAmount = extractAmountFallback(text);
  if (fallbackAmount) {
    return res.status(200).json({ amount: fallbackAmount, cat: 'etc', memo: '' });
  }
  return res.status(500).json({ error: `OCR 파싱 오류: ${err.message}`, raw: text.slice(0, 300) });
}
```

> [!NOTE]
> **Antigravity 제안 (리뷰 섹션 #2 반영) — "가장 큰 숫자" 추출 로직:**
> 원래 계획의 마지막 폴백 정규식 `(\d[\d,]{3,})`(4자리 이상)은 영수증의 **카드번호 끝 4자리, 승인번호, 사업자 번호**를 금액으로 오인할 위험이 있습니다. 위 개선안에서는 (1) 패턴 우선순위를 두어 명시적 금액 키워드부터 탐색하고, (2) 최소 자릿수를 5자리(10,000원 이상)로 올리며, (3) 모든 후보 중 **최대값을 선택**하는 방식으로 정확도를 높였습니다.

**maxOutputTokens 조정**:
```js
// 현재
maxOutputTokens: mode === 'single' ? 256 : (mode === 'bulk' ? 4096 : 1024)

// 개선: single은 128로 더 줄임 ({"amount":15000,"cat":"food","memo":"GS25"} = 50토큰)
maxOutputTokens: mode === 'single' ? 128 : (mode === 'bulk' ? 2048 : 512)
```

bulk를 4096→2048으로 줄이면 추론 시간이 단축됨 (명세서 1장 최대 30~40건 × 약 50토큰 = 2000토큰 내외).

---

### Phase 6 — 반복 지출 빠른 입력 (수동 입력 UX)
> **상태: 미완료**

현재 수동 입력은 매번 처음부터 금액·카테고리를 선택해야 함. "최근 지출 패턴" 빠른 선택 기능 추가.

**구현 위치**: `QuickEntrySheet` form 단계 상단에 추가.

```js
// 이번 달 가장 자주 쓴 (카테고리, 가맹점) 조합 Top 3 추출
// [Antigravity 제안 반영] amount는 항상 해당 가맹점의 '가장 마지막(최신) 거래 금액'으로 갱신
function getFrequentPatterns(tx) {
  const thisMonth = new Date().toISOString().slice(0, 7); // "2026-04"
  const freq = {};
  tx
    .filter(t => t.date?.startsWith(thisMonth))
    .sort((a, b) => (a.date > b.date ? 1 : -1)) // 날짜 오름차순 정렬
    .forEach(t => {
      const key = `${t.cat}:${t.memo}`;
      if (!freq[key]) {
        freq[key] = { count: 0, amount: t.amount, cat: t.cat, memo: t.memo };
      }
      freq[key].count++;
      freq[key].amount = t.amount; // 최신 거래 금액으로 덮어쓰기
    });
  return Object.values(freq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}
```

> [!NOTE]
> **Antigravity 제안 (리뷰 섹션 #4 반영) — 최신 금액 우선 정책:**
> 원래 코드의 `freq[key] = (freq[key] || { count: 0, amount: t.amount, ... })`는 최초 등록 시의 금액을 그대로 유지했습니다. 이는 스타벅스 아메리카노 가격 인상 등 최근 변동을 반영하지 못하는 문제가 있습니다. 개선안에서는 tx를 날짜 오름차순으로 정렬한 후 순회하며 `freq[key].amount`를 매번 갱신하여, 칩에 표시되는 금액이 **해당 가맹점의 이번 달 가장 최근 결제 금액**이 되도록 합니다.

<!-- Claude: 원래 코드에 `freq[key] = (freq[key] || ...)` 패턴에 버그 있음. 이미 존재하는 key에 대해 `freq[key] = freq[key]`로 동일 참조를 재할당하므로 amount는 갱신되지 않음. 위 개선안의 `if (!freq[key]) { ... }` + `freq[key].amount = t.amount` 패턴이 의도를 명확하게 표현함. -->

```jsx
{/* 빠른 입력 칩 */}
{frequentPatterns.length > 0 && (
  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
    {frequentPatterns.map(p => (
      <button
        key={`${p.cat}:${p.memo}`}
        onClick={() => { setCat(p.cat); setMemo(p.memo); setAmount(String(p.amount)); }}
        style={{
          flexShrink: 0, padding: '6px 12px', borderRadius: 99,
          border: '1px solid var(--border)', background: 'var(--bg3)',
          fontSize: 11, color: 'var(--text2)', cursor: 'pointer',
        }}
      >
        {CAT[p.cat]?.icon} {p.memo || CAT[p.cat]?.label}
      </button>
    ))}
  </div>
)}
```

<!-- Claude: 원래 계획의 칩 클릭 핸들러 `onClick={() => { setCat(p.cat); setMemo(p.memo); }}`에서 `amount`는 설정하지 않고 있었음. 빠른 입력의 취지상 금액도 함께 채워주는 것이 맞으므로 `setAmount(String(p.amount))`도 포함함. -->

---

## 구현 우선순위

| 순위 | Phase | 예상 효과 | 난이도 | 작업 파일 | 상태 |
|------|-------|----------|--------|-----------|------|
| 1 | Phase 1 (이미지 전처리) | 속도 3~5배 향상 | 낮음 | `src/utils/ocr.js` | ✅ 완료 |
| 2 | Phase 2 (프롬프트) | 정확도 30~50% 향상 | 낮음 | `api/ocr.js` | ✅ 완료 |
| 3 | Phase 3 (single OCR→폼) | UX 핵심 개선 | 중간 | `src/components/QuickEntrySheet.jsx` | ✅ 완료 |
| 4 | Phase 5 (서버 신뢰성) | 오류율 감소 | 낮음 | `api/ocr.js` | ✅ 완료 |
| 5 | Phase 4 (선택 화면) | UX 명확성 | 낮음 | `src/components/QuickEntrySheet.jsx` | ✅ 완료 |
| 6 | Phase 6 (빠른 입력) | 수동 입력 편의성 | 낮음 | `src/components/QuickEntrySheet.jsx` | ✅ 완료 |

---

## 변경 파일 요약

```
api/
  ocr.js                     — 프롬프트 개선, maxOutputTokens 조정, 폴백 파서 추가

src/
  utils/
    ocr.js                   — optimizeImage() 전처리 강화 (이진화, 480px)
  components/
    QuickEntrySheet.jsx      — single OCR 내장, 선택화면 4항목, 빠른 입력 칩, 다시 스캔 버튼
    CardScanSheet.jsx        — bulk 전용으로 역할 명확화 (변경 최소)
  hooks/
    useOcrScan.js            — (변경 없음, 그대로 활용)
```

---

## Gemma 4 한계 대응 전략

Gemma 4 31B는 비용이 저렴하지만 OCR 전문 모델이 아님. 이를 보완하는 전략:

1. **입력 품질로 커버**: 이진화된 선명한 이미지는 범용 VLM도 잘 읽음
2. **출력 단순화**: 추출 필드를 3개(amount, cat, memo)로 최소화, 토큰 낭비 제거
3. **폴백 파서**: 모델이 실패해도 정규식으로 금액만이라도 복구
4. **사용자 검증 단계 유지**: AI가 틀려도 폼에서 수정 가능한 구조 유지 (완전 자동화 지양)
5. **캐시 적극 활용**: 동일 이미지 재스캔 방지 (현재 sessionStorage LRU 5개 — 충분)

---

*다음 작업 시 이 계획을 기반으로 Phase 1 → Phase 2 순서로 구현을 시작하세요.*

---

## 🤖 Antigravity (AI Coding Assistant) 리뷰 및 추가 제언

> [!NOTE]
> 본 개선 계획서는 비용 최적화(Gemma 4 활용)와 성능 사이의 균형을 맞추기 위한 클라이언트/서버 양방향 최적화 전략이 상세하고 훌륭하게 설계되어 있습니다. 내용을 깊이 분석한 후, 실제 구현 시 발생할 수 있는 엣지 케이스를 방어하고 완성도를 높이기 위한 **4가지 추가 아이디어**를 제안합니다.

**1. Phase 1 (전처리 파이프라인) - PNG vs JPEG 벤치마킹 필요**
픽셀 레벨 이진화(Binarization)를 통해 흑백(0, 255)으로 명확히 구분된 텍스트 이미지의 경우, **손실 압축인 JPEG(`image/jpeg`)보다 무손실 압축인 PNG(`image/png`)의 용량이 더 작고 텍스트 가장자리가 선명**할 수 있습니다. JPEG는 특성상 대비가 높은 텍스트 주변에 링잉 아티팩트(Ringing Artifact) 노이즈를 생성해 OCR 인식률을 떨어뜨릴 수 있습니다. 구현 시 PNG와 JPEG 간의 용량 및 인식률 테스트 병행을 권장합니다.

**2. Phase 5 (서버 폴백 정규식) - "가장 큰 숫자" 추출 로직 적용**
단순히 `(\d[\d,]{3,})` 정규식으로 4자리 이상 숫자를 추출하면, 영수증의 **'카드번호 끝 4자리(예: 1234)', '승인번호', '사업자 번호'** 등을 금액으로 오인할 위험이 큽니다.
따라서, 문서 내의 모든 금액 패턴을 배열로 추출한 뒤 **배열 중 가장 큰 숫자(일반적으로 영수증의 최종 합계액)를 채택**하도록 폴백 로직을 보강하면 오류 확률을 대폭 낮출 수 있습니다.

**3. Phase 3 (UX 흐름) - "다시 촬영" 퇴로 확보**
`QuickEntrySheet`에서 OCR 폼 자동 진입 후, 사용자가 촬영 결과를 취소하고 싶거나 AI 인식 결과가 너무 빗나가서(흐릿한 사진 등) 즉시 재촬영을 원할 수 있습니다. Form 단계 UI 상단이나 금액 필드 옆에 **"📸 다시 스캔" (Retake) 버튼을 배치**하여, 흐름이 끊기거나 창을 닫고 처음부터 다시 시작하는 불편함을 방지하는 것이 좋습니다.

**4. Phase 6 (빠른 입력 칩) - 최신 금액 우선(Latest Amount) 정책**
자주 먹는 커피(예: 스타벅스)의 금액이 최근 인상되었을 수 있습니다. Frequency(빈도)를 기준으로 Top 3를 뽑는 접근은 훌륭하나, 추출 시 **`amount` 데이터는 반드시 해당 가맹점의 '가장 마지막(최신) 거래 금액'으로 덮어써서 제공**하도록 로직을 세밀하게 수정하면 더 정확한 사용자 편의성을 제공할 수 있습니다.
