import { useEffect } from 'react';

/**
 * 현재 뷰에 따라 data-theme 속성을 document.documentElement에 적용
 * @param {string} view
 */
export function useTheme(view) {
  useEffect(() => {
    const theme = view === 'private' ? 'private' : 'joint';
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      // cleanup: 기본 joint로 복원
      document.documentElement.setAttribute('data-theme', 'joint');
    };
  }, [view]);
}
