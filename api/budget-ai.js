// Vercel Serverless Function — AI 예산 자동 배분
// Claude Haiku를 사용해 급여 기반 카테고리별 예산을 추천

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // 내부 시크릿 인증 (INTERNAL_API_SECRET 환경 변수로 보호)
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret && req.headers['x-internal-secret'] !== internalSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API 키가 서버에 설정되지 않았습니다. Vercel 환경 변수 GOOGLE_API_KEY를 설정해 주세요.' });

  const { totalSalary, fixedTotal, installTotal, savingsTarget, catHistory, utilizationTarget } = req.body;

  if (!totalSalary || totalSalary <= 0) {
    return res.status(400).json({ error: '급여 정보가 없습니다. 먼저 급여를 입력해주세요.' });
  }

  const utilPct = Math.min(Math.max(utilizationTarget || 100, 50), 100) / 100;
  const rawAvailable = Math.max(totalSalary - (fixedTotal || 0) - (installTotal || 0) - (savingsTarget || 0), 0);
  const available = Math.round(rawAvailable * utilPct);

  // 최근 지출 패턴 컨텍스트 구성
  let historyCtx = '';
  if (catHistory && Object.keys(catHistory).length > 0) {
    const lines = Object.entries(catHistory)
      .filter(([, v]) => v > 0)
      .map(([cat, amt]) => `  - ${cat}: 월 평균 ${Math.round(amt).toLocaleString()}원`)
      .join('\n');
    if (lines) historyCtx = `\n\n최근 3개월 실제 지출 패턴 (참고용):\n${lines}`;
  }

  const prompt = `당신은 한국 가계 재무 전문가입니다. 아래 정보를 바탕으로 카테고리별 월 예산을 추천해주세요.

## 가계 재무 정보
- 월 실수령 합계: ${totalSalary.toLocaleString()}원
- 고정비 (임대료, 보험 등 자동 지출): ${(fixedTotal || 0).toLocaleString()}원
- 할부금: ${(installTotal || 0).toLocaleString()}원
- 월 저축 목표: ${(savingsTarget || 0).toLocaleString()}원
- **이번달 변동비 배분 가능액: ${available.toLocaleString()}원**${historyCtx}

## 배분할 9개 카테고리
food(식비), housing(주거/관리비), education(교육), transport(교통), medical(의료/건강), culture(문화/여가), clothing(의류/쇼핑), sub(구독서비스), etc(기타)

## 지시사항
1. 배분 가능액(${available.toLocaleString()}원)을 9개 카테고리에 나눠주세요
2. 모든 카테고리 금액의 합이 정확히 ${available.toLocaleString()}원이어야 합니다 (매우 중요)
3. 최근 지출 패턴이 있다면 그것을 기반으로, 없다면 한국 평균 가계 지출 비율을 참고하세요
4. 금액은 1만원 단위로 반올림하세요
5. 각 카테고리 추천 이유를 8자 이내로 적어주세요
6. 전체 예산 운영 조언을 40자 이내로 적어주세요

## 응답 형식 (JSON만, 설명 없이)
{"budgets":{"food":숫자,"housing":숫자,"education":숫자,"transport":숫자,"medical":숫자,"culture":숫자,"clothing":숫자,"sub":숫자,"etc":숫자},"reasons":{"food":"이유","housing":"이유","education":"이유","transport":"이유","medical":"이유","culture":"이유","clothing":"이유","sub":"이유","etc":"이유"},"tip":"전체 조언 한마디"}`;

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini API 오류:', errText);
      try {
        const errJson = JSON.parse(errText);
        const detail = errJson.error?.message || 'Unknown Gemini error';
        return res.status(resp.status).json({ error: `Gemini API 오류: ${detail} (Code: ${resp.status})` });
      } catch (e) {
        return res.status(resp.status).json({ error: `Gemini API 오류: ${resp.status}` });
      }
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: '응답 파싱 실패' });

    const result = JSON.parse(match[0]);

    // 합계 검증 및 보정 (반올림 오차 보정)
    if (result.budgets) {
      const sum = Object.values(result.budgets).reduce((s, v) => s + (v || 0), 0);
      const diff = available - sum;
      if (Math.abs(diff) > 0 && Math.abs(diff) <= 100000) {
        // 오차가 10만원 이내면 etc에 보정 (Gemini는 가끔 오차가 발생할 수 있음)
        result.budgets.etc = (result.budgets.etc || 0) + diff;
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('budget-ai 오류:', err);
    return res.status(500).json({ error: err.message ?? '처리 중 오류가 발생했습니다.' });
  }
}
