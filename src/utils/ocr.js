// OCR 유틸 — /api/ocr 서버리스 함수를 통해 Anthropic API 호출
// API 키는 서버 사이드(Vercel 환경 변수 ANTHROPIC_API_KEY)에서만 사용됨

/**
 * 이미지를 리사이징하고 JPEG로 변환하여 용량과 포맷을 최적화합니다.
 * @param {File} imageFile 
 * @returns {Promise<{base64Image: string, mediaType: string}>}
 */
async function optimizeImage(imageFile, mode = 'single') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // bulk/schedule 모드(텍스트 밀집)는 해상도를 더 높게 설정
      // [최적화] single 모드는 800px로 하향하여 전송 속도 개선
      const MAX_SIZE = (mode === 'bulk' || mode === 'schedule') ? 1536 : 800;

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
      
      // [최적화] 흑백 처리를 통해 데이터량 감소 및 텍스트 명암비 확보
      ctx.filter = 'grayscale(1)';
      ctx.drawImage(img, 0, 0, width, height);
      
      // JPEG 0.75 품질로 압축 (용량 최적화)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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
 * 캐시 관리 헬퍼: sessionStorage에서 OCR 결과를 읽거나 씁니다 (최대 5개 유지).
 * [개선] 알파벳 순서가 아닌 타임스탬프 기반 LRU 방식으로 오래된 캐시 삭제.
 * @param {File} file 
 * @param {string} mode 
 * @param {any} [result] - 결과가 있으면 저장, 없으면 조회
 * @returns {any|null}
 */
function manageCache(file, mode, result) {
  const cachePrefix = 'ocr_cache_';
  const key = `${cachePrefix}${mode}_${file.name}_${file.size}_${file.lastModified}`;
  try {
    if (result !== undefined && result !== null) {
      const entry = {
        data: result,
        _ts: Date.now() // 타임스탬프 추가
      };
      
      // 저장 로직: 현재 'ocr_cache_'로 시작하는 모든 키 추출 및 타임스탬프 기준 정렬
      const items = Object.keys(sessionStorage)
        .filter(k => k.startsWith(cachePrefix))
        .map(k => {
          try {
            const val = sessionStorage.getItem(k);
            return { key: k, ts: val ? JSON.parse(val)._ts : 0 };
          } catch(e) { return { key: k, ts: 0 }; }
        })
        .sort((a, b) => a.ts - b.ts);
      
      // 최대 5개 유지 (기존 3개에서 확장)
      if (items.length >= 5) {
        sessionStorage.removeItem(items[0].key);
      }
      sessionStorage.setItem(key, JSON.stringify(entry));
      return result;
    } else {
      // 조회 로직
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      // 조회 시 타임스탬프 갱신 (LRU 정책 강화)
      parsed._ts = Date.now();
      sessionStorage.setItem(key, JSON.stringify(parsed));
      return parsed.data;
    }
  } catch (e) {
    return null;
  }
}

/**
 * 전역적인 OCR API 호출 헬퍼
 * @param {File} imageFile 
 * @param {string} mode 
 * @returns {Promise<any>}
 */
async function callOcrApi(imageFile, mode) {
  // 1. 캐시 확인
  const cached = manageCache(imageFile, mode);
  if (cached) return cached;

  // 2. 이미지 최적화 및 호출
  const { base64Image, mediaType } = await optimizeImage(imageFile, mode);
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ image: base64Image, mediaType, mode }),
  });

  const data = await response.json();
  if (!response.ok) {
    /** @type {any} */
    const err = new Error(data.error ?? `서버 오류 (${response.status})`);
    err.status = response.status; // 컴포넌트에서 429 감지용
    throw err;
  }

  // 3. 결과 캐싱 및 반환
  return manageCache(imageFile, mode, data);
}

/**
 * 영수증 이미지 파일을 분석해 지출 정보를 반환합니다.
 * @param {File} imageFile - input[type=file]에서 받은 이미지 파일
 * @returns {Promise<{amount: number|null, cat: string|null, memo: string|null}>}
 */
export async function runOCR(imageFile) {
  const data = await callOcrApi(imageFile, 'single');
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
  const data = await callOcrApi(imageFile, 'bulk');
  return Array.isArray(data.items) ? data.items : [];
}
