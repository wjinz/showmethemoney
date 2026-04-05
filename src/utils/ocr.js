// OCR 유틸 — /api/ocr 서버리스 함수를 통해 Anthropic API 호출
// API 키는 서버 사이드(Vercel 환경 변수 ANTHROPIC_API_KEY)에서만 사용됨

/**
 * @param {File} imageFile
 * @returns {Promise<{base64Image: string, mediaType: string}>}
 */
function readImageAsBase64(imageFile) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = /** @type {string} */ (e.target?.result ?? '');
      const base64Image = dataUrl.split(',')[1] ?? '';
      const mediaType = dataUrl.match(/data:(image\/[^;]+);/)?.[1] ?? 'image/jpeg';
      resolve({ base64Image, mediaType });
    };
    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * @returns {Record<string, string>}
 */
function buildHeaders() {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  const secret = import.meta.env.VITE_INTERNAL_API_SECRET;
  if (secret) headers['x-internal-secret'] = secret;
  return headers;
}

/**
 * 영수증 이미지 파일을 분석해 지출 정보를 반환합니다.
 * @param {File} imageFile - input[type=file]에서 받은 이미지 파일
 * @returns {Promise<{amount: number|null, cat: string|null, memo: string|null}>}
 */
export async function runOCR(imageFile) {
  const { base64Image, mediaType } = await readImageAsBase64(imageFile);
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ image: base64Image, mediaType }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `서버 오류 (${response.status})`);
  return {
    amount: typeof data.amount === 'number' ? data.amount : null,
    cat:    typeof data.cat    === 'string' ? data.cat    : null,
    memo:   typeof data.memo   === 'string' ? data.memo   : null,
  };
}

/**
 * 카드앱 이용내역 스크린샷을 분석해 복수 거래 목록을 반환합니다.
 * @param {File} imageFile
 * @returns {Promise<Array<{date:string, amount:number, cat:string, memo:string}>>}
 */
export async function runBulkOCR(imageFile) {
  const { base64Image, mediaType } = await readImageAsBase64(imageFile);
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ image: base64Image, mediaType, mode: 'bulk' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `서버 오류 (${response.status})`);
  return Array.isArray(data.items) ? data.items : [];
}
