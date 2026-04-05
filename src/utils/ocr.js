// OCR 유틸 — /api/ocr 서버리스 함수를 통해 Anthropic API 호출
// API 키는 서버 사이드(Vercel 환경 변수 ANTHROPIC_API_KEY)에서만 사용됨

/**
 * 이미지를 리사이징하고 JPEG로 변환하여 용량과 포맷을 최적화합니다.
 * @param {File} imageFile 
 * @returns {Promise<{base64Image: string, mediaType: string}>}
 */
async function optimizeImage(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX_SIZE = 1600;

      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context 생성 실패'));
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // JPEG 0.8 품질로 압축 (HEIC 등도 자동 변환됨)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64Image = dataUrl.split(',')[1];
      resolve({ base64Image, mediaType: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('이미지 로드 중 오류 발생'));
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = /** @type {string} */ (e.target?.result ?? '');
    };
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
  const { base64Image, mediaType } = await optimizeImage(imageFile);
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
  const { base64Image, mediaType } = await optimizeImage(imageFile);
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ image: base64Image, mediaType, mode: 'bulk' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? `서버 오류 (${response.status})`);
  return Array.isArray(data.items) ? data.items : [];
}
