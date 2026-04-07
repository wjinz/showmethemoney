import { useEffect } from 'react';

/**
 * 현재 뷰와 kidsMode에 따라 data-theme 속성을 .app-root에 적용
 * @param {string} view
 * @param {boolean} [kidsMode]
 */
export function useTheme(view, kidsMode) {
  useEffect(() => {
    const theme = kidsMode ? 'kids' : view === 'private' ? 'private' : 'joint';
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.setAttribute('data-theme', 'joint');
    };
  }, [view, kidsMode]);
}
