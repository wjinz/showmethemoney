// Vercel Serverless Function — AI 지출 패턴 조언 (Nudge)
import { kv } from '@vercel/kv';

const GEMINI_MODEL = 'gemini-2.0-flash-lite';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * @param {import('http').IncomingMessage & {body: { spent: number, total: number, txSummary: string, householdId?: string }}} req
 * @param {import('http').ServerResponse & {status: (code: number) => {json: (body: object) => void, end: () => void}}} res
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { spent, total, txSummary, householdId = '' } = req.body;

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다.' });

  // 내부 시크릿 인증
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret && req.headers['x-internal-secret'] !== internalSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pct = total > 0 ? Math.round((spent / total) * 100) : 0;

  // pct를 5% 단위로 버림 → 캐시 히트율 향상 (TTL 1h)
  const pctBucket = Math.floor(pct / 5) * 5;
  const yearMonth = new Date().toISOString().slice(0, 7);
  const cacheKey = `nudge:${householdId}:${yearMonth}:${pctBucket}`;

  try {
    const cached = await kv.get(cacheKey);
    if (cached) return res.status(200).json({ message: cached, fromCache: true });
  } catch {
    // KV 실패 시 캐시 건너뜀
  }

  const prompt = `당신은 까칠하지만 츤데레인 가계부 관리 AI입니다.
이번 달 예산 총액: ${total.toLocaleString()}원
현재까지 지출액: ${spent.toLocaleString()}원 (예산의 ${pct}%)
주요 지출 내역 요약: 
${txSummary || '지출 내역 없음'}

지시사항:
1. 위 지출 내역을 바탕으로 사용자의 소비 습관을 짧게 지적하거나 칭찬하세요.
2. 메시지는 반드시 40자 이내의 한 문장으로 매우 짧고 굵게 작성하세요. ("~요" 톤 사용)
3. 예산 소진율(${pct}%)에 걸맞는 톤앤매너를 유지하세요. (90% 이상이면 잔소리, 50% 미만이면 응원 등)
4. 응답은 순수 텍스트로만 반환하세요 (따옴표나 JSON 형식 금지).`;

  // Fallback 모델 체인 (1순위 gemma-4-31b-it)
  const models = ['gemma-4-31b-it', 'gemini-2.5-flash-lite'];
  let lastError = 'Nudge 생성 실패';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    try {
      const resp = await fetch(`${url}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) {
          text = text.trim().replace(/^"|"$/g, '');
          // 캐시 저장 (TTL 24시간)
          try { await kv.set(cacheKey, text, { ex: 86400 }); } catch {}
          return res.status(200).json({ message: text });
        }
      } else {
        lastError = await resp.text();
      }
    } catch (err) {
      console.error(`Nudge API 에러 (${model}):`, err);
      lastError = err instanceof Error ? err.message : '요청 실패';
    }
  }

  // 모든 모델 실패 시 기본 메시지
  return res.status(200).json({ message: '이번 달 지출, 꼼꼼히 관리해 봅시다!', error: lastError });
}
