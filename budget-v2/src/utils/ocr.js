// OCR 유틸 — /api/ocr 서버리스 함수를 통해 Anthropic API 호출
// API 키는 서버 사이드(Vercel 환경 변수 ANTHROPIC_API_KEY)에서만 사용됨

/**
 * 영수증 이미지 파일을 분석해 지출 정보를 반환합니다.
 * @param {File} imageFile - input[type=file]에서 받은 이미지 파일
 * @returns {Promise<{amount: number|null, cat: string|null, memo: string|null}>}
 */
export async function runOCR(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // base64 데이터 (data:image/...;base64, 접두사 제거)
        const dataUrl = e.target.result;
        const base64Image = dataUrl.split(',')[1];
        const mediaType = dataUrl.match(/data:(image\/[^;]+);/)?.[1] ?? 'image/jpeg';

        /** @type {Record<string, string>} */
        const headers = { 'Content-Type': 'application/json' };
        const secret = import.meta.env.VITE_INTERNAL_API_SECRET;
        if (secret) headers['x-internal-secret'] = secret;

        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers,
          body: JSON.stringify({ image: base64Image, mediaType }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? `서버 오류 (${response.status})`);
        }

        resolve({
          amount: data.amount ?? null,
          cat: data.cat ?? null,
          memo: data.memo ?? null,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(imageFile);
  });
}
