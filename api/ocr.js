// Vercel Serverless Function — OCR 프록시
// API 키를 서버 사이드에서만 사용 (브라우저 번들에 포함되지 않음)
// Vercel 환경 변수: GOOGLE_API_KEY (VITE_ 접두사 없이 설정)


/**
 * @param {import('http').IncomingMessage & {body: {image?: string, mediaType?: string, mode?: string}}} req
 * @param {import('http').ServerResponse & {status: (code: number) => {json: (body: object) => void, end: () => void}}} res
 */
export default async function handler(req, res) {
  // CORS 헤더 설정 (같은 도메인 배포지만 명시적으로 허용)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 내부 시크릿 인증 (INTERNAL_API_SECRET 환경 변수로 보호)
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret && req.headers['x-internal-secret'] !== internalSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다. Vercel 환경 변수 GOOGLE_API_KEY를 설정해 주세요.' });
  }

  const { image, mediaType, mode = 'single' } = req.body;
  if (!image || !mediaType) {
    return res.status(400).json({ error: 'image와 mediaType 필드가 필요합니다.' });
  }

  // 서버 사이드 날짜 계산 (안전한 자정 계산 방지)
  const now = new Date();
  const todayDate = now.toISOString().slice(0, 10);
  const currentYear = todayDate.slice(0, 4);
  const today = todayDate; // 하위 호환성 유지 별칭

  now.setDate(now.getDate() - 1);
  const yesterdayDate = now.toISOString().slice(0, 10);

  const CAT_GUIDE = `food, housing, education, transport, medical, culture, clothing, sub, etc`;

  // 1. 시스템 지시문 (행동 지침 격리)
  const systemInstruction = `You are a JSON-only OCR extractor. 
Begin your response immediately with the JSON character ([ or {). 
Never explain, never summarize, never output markdown code blocks unless forced. 
No preamble, no postamble.`;

  let promptText = '';
  if (mode === 'bulk') {
    promptText = `CRITICAL: Output ONLY valid JSON array. Start with [ and end with ].
Extract ALL valid transaction rows from this Korean card app screenshot.
 
Each row format: {"date":"YYYY-MM-DD","amount":number,"cat":"category","memo":"merchant"}
Categories: ${CAT_GUIDE}
 
IGNORE RULES (highest priority — do NOT include these in output):
- Any row containing "거래취소", "취소", "가승인", or negative amounts.
- Rows where merchant name ends with "_가승인".
- Header rows, summary rows, or UI labels.
 
Date conversion rules:
- "오늘" or "TODAY" → ${todayDate}
- "어제" or "YESTERDAY" → ${yesterdayDate}
- "26. 4. 12(일)" or "26. 4. 12" format → 2026-04-12 (Ignore days in parentheses).
- "04/15" or "2026.04.15" → 2026-04-15
- If date is missing, use ${todayDate}. If year is missing, use ${currentYear}.
 
Guide to Korean card app layout:
- The screen MAY be divided into date sections. If a date string (like "어제", "오늘", "26. 4. 12(일)") appears as a section header, ALL transactions below it belong to that date.
- Regardless of layout, extract EVERY valid transaction you see.
- Merchant name is usually the largest text in each row.
- Amount is usually followed by "원".
 
Return ONLY confirmed, non-cancelled transactions as a JSON array.`;
  } else if (mode === 'schedule') {
    promptText = `CRITICAL: Output ONLY valid JSON object. Start with { and end with }.
Extract all names and their work schedules from this image.
Format: {"names":["Name1"],"schedules":{"Name1":[{"date":"YYYY-MM-DD","type":"shift_name"}]}}
Rules:
- Map codes (D,N,E,O) to Day, Night, Evening, Off.
- Use year ${currentYear} if missing.
- IMPORTANT: If scanning in December but the schedule is for January, use ${parseInt(currentYear) + 1}.
- Example: {"names":["홍길동"],"schedules":{"홍길동":[{"date":"2026-04-01","type":"Day"}]}}`;
  } else {
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
  }


  // Fallback 모델 체인 (차세대 전용: Gemma 4 -> Gemini 2.x)
  const models = ['gemma-4-31b-it', 'gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastErrorJson = null;
  let lastStatus = 500;
  let geminiRes = null;

    for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      geminiRes = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        signal: AbortSignal.timeout(model === 'gemma-4-31b-it' ? 12000 : 20000), // Gemma 4: 12초, Gemini: 20초
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: mediaType, data: image } }
            ]
          }],
          generationConfig: {
            temperature: 0.0,
            // [최적화] single 128, bulk 2048 추론 시간 단축
            maxOutputTokens: mode === 'single' ? 128 : (mode === 'bulk' ? 2048 : 512),
            response_mime_type: "application/json"
          }
        }),
      });

      if (geminiRes.ok) {
        break; // 성공 시 루프 탈출
      }
      
      const errText = await geminiRes.text();
      lastStatus = geminiRes.status;
      lastErrorJson = { error: `AI ${model} 오류 (Code: ${geminiRes.status}) - ${errText}` };

      // 429 (Rate Limit) 또는 503 (Service Unavailable)면 다음 모델을 시도
      if (geminiRes.status !== 429 && geminiRes.status !== 503) {
        break;
      }
    } catch (err) {
      console.error(`OCR 처리 오류 (${model}):`, err);
      lastErrorJson = { error: err instanceof Error ? err.message : '요청 실패' };
    }
  }

  if (!geminiRes || !geminiRes.ok) {
    return res.status(lastStatus).json(lastErrorJson || { error: '모든 AI 엔진 요청 실패' });
  }

  let text = '';
  try {
    const data = await geminiRes.json();
    text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // [3단계 견고한 파싱 파이프라인]
    
    // 1단계: 기본적인 클리닝 (트림 및 마크다운 제거)
    let cleaned = text.trim()
      .replace(/^```(?:json)?\s*/, '') // 시작 마크다운 제거
      .replace(/\s*```$/, '');         // 끝 마크다운 제거
    
    // 2단계: 직접 파싱 시도
    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(normalizeOcrData(parsed, mode));
    } catch (e) {
      // 3단계: 정규식 기반 폴백
      const startChar = mode === 'bulk' ? '[' : '{';
      const endChar = mode === 'bulk' ? ']' : '}';
      const startIdx = cleaned.indexOf(startChar);
      const endIdx = cleaned.lastIndexOf(endChar);
      
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          const fallbackParsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
          return res.status(200).json(normalizeOcrData(fallbackParsed, mode));
        } catch (e2) {
          if (mode === 'bulk') {
            const bulkFallback = extractBulkItemsFallback(cleaned);
            if (bulkFallback) return res.status(200).json({ items: bulkFallback });
          }
          throw new Error(`JSON 구조 추출 후 파싱 실패: ${e2.message}`);
        }
      }
      
      if (mode === 'bulk') {
        const bulkFallback = extractBulkItemsFallback(cleaned);
        if (bulkFallback) return res.status(200).json({ items: bulkFallback });
      }
      throw new Error(`응답에서 JSON 구조(${startChar}...${endChar})를 찾을 수 없습니다.`);
    }

  } catch (err) {
    console.error('OCR 파싱 오류:', err);
    // [Antigravity 적용] 폴백 파서: AI가 실패해도 금액만이라도 안전하게 복구
    const fallbackAmount = extractAmountFallback(text);
    if (fallbackAmount) {
      return res.status(200).json({ amount: fallbackAmount, cat: 'etc', memo: '' });
    }
    return res.status(500).json({ 
      error: `OCR 파싱 오류: ${err instanceof Error ? err.message : String(err)}`,
      raw: text.slice(0, 300)
    });
  }
}

/**
 * 텍스트 기반 폴백 파서: AI 구조 실패 시 모든 금액 후보군을 추출하여 최대값을 반환
 * @param {string} rawText 
 * @returns {number|null}
 */
function extractAmountFallback(rawText) {
  // "합계 15,000", "결제금액 52000", "₩15,000" 등에서 숫자 추출
  // 단순 첫 매치 대신 모든 후보를 배열로 추출 후 최대값 선택
  const patterns = [
    /(?:합계|결제금액|승인금액|청구금액|total)[^\d]*(\d[\d,]+)/gi,
    /₩\s*(\d[\d,]+)/g,
    /(\d[\d,]{4,})/g,  // 5자리 이상 숫자 (카드번호 4자리 오인 방지)
  ];
  /** @type {number[]} */
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

/**
 * bulk 배열 파싱 최종 폴백 — 개별 객체 추출 (순서 무관 및 필수 키 매칭 적용)
 * @param {string} text 
 * @returns {any[] | null}
 */
function extractBulkItemsFallback(text) {
  // date 필수 포함 (순서 무관한 키 배열일 경우도 대처)
  const itemPattern = /\{[^{}]*"date"\s*:[^{}]+\}/g;
  const matches = text.match(itemPattern) || [];
  const items = [];
  for (const m of matches) {
    try { items.push(JSON.parse(m)); } catch {}
  }
  return items.length > 0 ? items : null;
}

/**
 * AI 응답 데이터를 모드별로 정규화하여 프런트엔드 크래시를 방지합니다.
 */
function normalizeOcrData(parsed, mode) {
  const sanitizeNumber = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  if (mode === 'bulk') {
    let arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : [parsed]);
    arr = arr.map(item => ({
      ...item,
      amount: sanitizeNumber(item.amount)
    }));
    return { items: arr };
  }

  return {
    ...parsed,
    amount: sanitizeNumber(parsed.amount)
  };
}
