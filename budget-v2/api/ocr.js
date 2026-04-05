// Vercel Serverless Function — OCR 프록시
// API 키를 서버 사이드에서만 사용 (브라우저 번들에 포함되지 않음)
// Vercel 환경 변수: ANTHROPIC_API_KEY (VITE_ 접두사 없이 설정)

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다. Vercel 환경 변수 ANTHROPIC_API_KEY를 설정해 주세요.' });
  }

  const { image, mediaType, mode = 'single' } = req.body;
  if (!image || !mediaType) {
    return res.status(400).json({ error: 'image와 mediaType 필드가 필요합니다.' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const CAT_GUIDE = `food, housing, education, transport, medical, culture, clothing, sub, etc`;

  const promptText = mode === 'bulk'
    ? `이 이미지는 카드 앱의 이용내역 화면 캡처입니다.
화면에 보이는 모든 결제 내역을 추출하세요.

아래 JSON 배열 형식으로만 응답하세요 (코드블록, 설명 없이):
[{"date":"YYYY-MM-DD","amount":숫자,"cat":"카테고리","memo":"가맹점명"},...]

날짜가 없는 항목은 오늘(${today})을 사용하세요. 연도가 없으면 ${today.slice(0,4)}년으로 가정하세요.
취소/환불 내역은 제외하세요. 금액은 양수 숫자만(원 기호, 콤마 제거).
카테고리: ${CAT_GUIDE}`
    : `이 영수증 이미지를 분석해서 지출 정보를 추출해주세요.

아래 JSON 형식으로만 응답하세요 (코드블록, 설명 없이 JSON만):
{"amount": 숫자, "cat": "카테고리", "memo": "가게명 또는 설명"}

카테고리는 아래 중 하나만 선택:
- food: 식비, 음식점, 카페, 편의점 식품
- housing: 주거비, 관리비, 인테리어
- education: 교육, 학원, 도서, 문구
- transport: 교통, 주유, 주차, 택시
- medical: 병원, 약국, 의료, 헬스케어
- culture: 영화, 공연, 스포츠, 여행, 레저
- clothing: 의류, 신발, 패션 잡화
- sub: 구독서비스, 앱, 멤버십
- etc: 위 항목에 해당하지 않는 기타 지출

영수증에서 총액(합계)을 amount로 추출하세요. 금액은 숫자만(원 기호, 콤마 제거).`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: mode === 'bulk' ? 1024 : 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
              { type: 'text', text: promptText },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API 오류:', errText);
      return res.status(anthropicRes.status).json({ error: `Anthropic API 오류: ${anthropicRes.status}` });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text ?? '';

    if (mode === 'bulk') {
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (!arrMatch) return res.status(422).json({ error: '거래 내역을 인식하지 못했습니다.' });
      /** @type {Array<{date:string,amount:number,cat:string,memo:string}>} */
      const items = JSON.parse(arrMatch[0]);
      const valid = items.filter(i => typeof i.amount === 'number' && i.amount > 0);
      return res.status(200).json({ items: valid });
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: '영수증에서 정보를 인식하지 못했습니다.' });
    const result = JSON.parse(match[0]);
    if (typeof result.amount !== 'number' || result.amount <= 0) result.amount = null;
    return res.status(200).json(result);

  } catch (err) {
    console.error('OCR 처리 오류:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'OCR 처리 중 오류가 발생했습니다.' });
  }
}
