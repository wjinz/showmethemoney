// Vercel Serverless Function — 아이 전용 AI 응원 코치 (Gemini)
import { kv } from '@vercel/kv';

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

/**
 * @param {import('http').IncomingMessage & { body: { kidName?: string, goalPct?: number, goalLabel?: string, kidId?: string } }} req
 * @param {import('http').ServerResponse & { status: (code: number) => { json: (body: object) => void, end: () => void } }} res
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return res.status(500).json({ error: 'API 키 없음' });

  const { kidName = '친구', goalPct = 0, goalLabel = '목표', kidId = '' } = req.body;

  // pct를 5% 단위로 버림 → 캐시 히트율 향상
  const pctBucket = Math.floor(goalPct / 5) * 5;
  const cacheKey = `kids:${kidId || kidName}:${pctBucket}`;

  // 1. 캐시 히트 확인 (TTL 30분)
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return res.status(200).json({ message: cached, fromCache: true });
  } catch {
    // KV 실패 시 캐시 건너뜀
  }

  const tone =
    goalPct <= 30 ? '격려: 시작이 반이야, 응원해주는 친구처럼' :
    goalPct <= 70 ? '칭찬: 잘 모으고 있어, 자랑스럽게' :
    goalPct <= 99 ? '흥분: 거의 다 됐어! 흥분되게' :
    '축하: 목표 달성! 신나게 축하해줘';

  const prompt = `당신은 어린이(5~8세) 친구인 따뜻한 AI 코치입니다.
아이 이름: ${kidName}
현재 목표 달성률: ${goalPct}%
목표: ${goalLabel}
톤: ${tone}

지시사항:
1. 아이가 이해할 수 있는 쉬운 단어로 20자 이내 응원 한 문장을 써주세요.
2. 이모지 1개를 문장 끝에 붙이세요.
3. 순수 텍스트만 반환하세요. (따옴표, JSON 형식 금지)`;

  try {
    const resp = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 40 },
      }),
    });

    if (!resp.ok) {
      // Fallback 메시지
      const fallback = getFallbackMessage(goalPct, kidName);
      return res.status(200).json({ message: fallback, fromFallback: true });
    }

    const data = await resp.json();
    const message = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? getFallbackMessage(goalPct, kidName)).trim();

    // 2. 캐시 저장 (TTL 30분)
    try {
      await kv.set(cacheKey, message, { ex: 1800 });
    } catch {
      // KV 실패 시 무시
    }

    return res.status(200).json({ message });
  } catch (err) {
    console.error('[kids-coach]', err);
    return res.status(200).json({ message: getFallbackMessage(goalPct, kidName), fromFallback: true });
  }
}

/**
 * @param {number} pct
 * @param {string} name
 * @returns {string}
 */
function getFallbackMessage(pct, name) {
  if (pct >= 100) return `${name}, 목표 달성! 정말 대단해! 🎉`;
  if (pct >= 70) return `거의 다 왔어! 조금만 더 힘내! ⭐`;
  if (pct >= 30) return `잘 모으고 있어, ${name}! 계속 해봐! 💪`;
  return `${name}, 시작이 반이야! 같이 모아보자! 🌟`;
}
