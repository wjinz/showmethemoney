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

  const today = new Date().toISOString().slice(0, 10);
  const currentYear = today.slice(0, 4);
  const CAT_GUIDE = `food, housing, education, transport, medical, culture, clothing, sub, etc`;

  // 1. 시스템 지시문 (행동 지침 격리)
  const systemInstruction = `You are a JSON-only OCR extractor. 
Begin your response immediately with the JSON character ([ or {). 
Never explain, never summarize, never output markdown code blocks unless forced. 
No preamble, no postamble.`;

  let promptText = '';
  if (mode === 'bulk') {
    promptText = `CRITICAL: Output ONLY valid JSON array. Start with [ and end with ].
Extract all transactions from this card statement screenshot.
Format: [{"date":"YYYY-MM-DD","amount":number,"cat":"category","memo":"merchant"}]
Rules:
- Category must be one of: ${CAT_GUIDE}
- Amount must be a positive number (no commas, no currency signs)
- If date is missing, use ${today}. If year is missing, use ${currentYear}.
- Example: [{"date":"2026-04-01","amount":15000,"cat":"food","memo":"스타벅스"}]`;
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
    promptText = `CRITICAL: Output ONLY valid JSON object. Start with { and end with }.
Extract the total amount, category, and merchant from this receipt.
Format: {"amount":number,"cat":"category","memo":"merchant"}
- Category: one of [${CAT_GUIDE}]
- Example: {"amount":12000,"cat":"food","memo":"김밥천국"}`;
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
            // [최적화] single 모드는 256 토큰이면 충분함 (추론 시간 단축)
            maxOutputTokens: mode === 'single' ? 256 : (mode === 'bulk' ? 4096 : 1024),
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
          throw new Error(`JSON 구조 추출 후 파싱 실패: ${e2.message}`);
        }
      }
      throw new Error(`응답에서 JSON 구조(${startChar}...${endChar})를 찾을 수 없습니다.`);
    }

  } catch (err) {
    console.error('OCR 파싱 오류:', err);
    return res.status(500).json({ 
      error: `OCR 파싱 오류: ${err.message}`,
      raw: text.slice(0, 300)
    });
  }
}

/**
 * AI 응답 데이터를 모드별로 정규화하여 프런트엔드 크래시를 방지합니다.
 */
function normalizeOcrData(parsed, mode) {
  if (mode === 'bulk') {
    // 배열이 아니면 배열로 감싸기
    if (!Array.isArray(parsed)) return { items: [parsed] };
    return { items: parsed };
  }

  return parsed;
}
