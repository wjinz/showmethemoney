/**
 * Canvas 기반 이미지 압축 유틸리티
 * 다이어리/지출 입력 양쪽에서 공통 사용 (Antigravity-1)
 */

/**
 * @typedef {Object} CompressOptions
 * @property {number=} maxWidth
 * @property {number=} quality
 * @property {string=} format
 */

/**
 * @param {File|Blob} file
 * @param {CompressOptions=} opts
 * @returns {Promise<string>} base64 data URL
 */
export async function compressImage(file, opts) {
  // P1-4: 기본 압축률 강화 (800→600px, 0.82→0.65) — 다이어리 누적 폭증 완화
  const maxWidth = opts && typeof opts.maxWidth === 'number' ? opts.maxWidth : 600;
  const quality = opts && typeof opts.quality === 'number' ? opts.quality : 0.65;
  const format = opts && typeof opts.format === 'string' ? opts.format : 'image/webp';

  if (file && typeof /** @type {File} */(file).type === 'string' && !/** @type {File} */(file).type.startsWith('image/')) {
    throw new Error('Not an image');
  }

  if (typeof window !== 'undefined' && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await window.createImageBitmap(file);
      try {
        return drawToDataUrl(bitmap, bitmap.width, bitmap.height, maxWidth, format, quality);
      } finally {
        if (typeof bitmap.close === 'function') bitmap.close();
      }
    } catch (err) {
      // fall through to FileReader path
    }
  }

  return await fallbackCompress(file, maxWidth, format, quality);
}

/**
 * @param {CanvasImageSource} source
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} maxWidth
 * @param {string} format
 * @param {number} quality
 * @returns {string}
 */
function drawToDataUrl(source, srcW, srcH, maxWidth, format, quality) {
  const scale = Math.min(1, maxWidth / Math.max(1, srcW));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL(format, quality);
}

/**
 * @param {File|Blob} file
 * @param {number} maxWidth
 * @param {string} format
 * @param {number} quality
 * @returns {Promise<string>}
 */
function fallbackCompress(file, maxWidth, format, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.onload = (ev) => {
      const result = ev && ev.target ? ev.target.result : null;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected reader result'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          resolve(drawToDataUrl(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxWidth, format, quality));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
