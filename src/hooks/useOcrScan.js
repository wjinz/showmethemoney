import { useState, useEffect, useCallback } from 'react';

/**
 * AI 사진 스캔을 위한 공통 로직 훅
 * @param {(file: File) => Promise<any>} ocrFn - 실행할 OCR 유틸 함수 (runBulkOCR, runScheduleOCR 등)
 * @param {string} scanKey - 스캔 인스턴스를 구분할 고유 키 (예: 'bulk', 'schedule')
 */
export function useOcrScan(ocrFn, scanKey = 'default') {
  const [phase, setPhase] = useState(/** @type {'idle'|'scanning'|'review'} */ ('idle'));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const COOLDOWN_KEY = `ocr_cooldown_until_${scanKey}`;
  const PERSIST_LAST_DATA = `ocr_last_scan_data_${scanKey}`;

  // 1. 초기 로드 시 기존 상태(쿨다운, 데이터) 확인
  useEffect(() => {
    // 쿨다운 복구
    const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
    const now = Date.now();
    if (until > now) {
      setCooldown(Math.ceil((until - now) / 1000));
    }

    // 마지막 성공 데이터 복구 (새로고침 대응)
    const saved = sessionStorage.getItem(PERSIST_LAST_DATA);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData(parsed);
        setPhase('review');
      } catch (e) {
        sessionStorage.removeItem(PERSIST_LAST_DATA);
      }
    }
  }, [COOLDOWN_KEY, PERSIST_LAST_DATA]);

  // 2. 쿨다운 타이머 가동
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(e => e.includes('한도') || e.includes('잠시 후') ? '' : e); // 쿨다운 관련 에러만 선별적 제거
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const startScan = useCallback(async (file) => {
    const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
    if (until > Date.now()) {
      setError(`시스템이 바쁩니다. 잠시 후 다시 시도해주세요.`);
      return;
    }

    setPhase('scanning');
    setError('');
    try {
      const result = await ocrFn(file);
      setData(result);
      // 데이터 영속성 저장
      sessionStorage.setItem(PERSIST_LAST_DATA, JSON.stringify(result));
      setPhase('review');
    } catch (err) {
      console.error('OCR Scan Error:', err);
      // @ts-ignore
      if (err.status === 429) {
        const cooldownSec = 30;
        sessionStorage.setItem(COOLDOWN_KEY, (Date.now() + cooldownSec * 1000).toString());
        setCooldown(cooldownSec);
        setError(`AI 요청 한도에 도달했습니다. ${cooldownSec}초 후 자동으로 잠금이 해제됩니다.`);
      } else {
        setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      }
      setPhase('idle');
    }
  }, [ocrFn, COOLDOWN_KEY, PERSIST_LAST_DATA]);

  const reset = useCallback(() => {
    setPhase('idle');
    setData(null);
    setError('');
    sessionStorage.removeItem(PERSIST_LAST_DATA);
  }, [PERSIST_LAST_DATA]);

  return {
    phase,
    data,
    error,
    cooldown, // 0보다 크면 쿨다운 중
    startScan,
    reset
  };
}
