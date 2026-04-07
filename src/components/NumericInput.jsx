import React from 'react';

/**
 * NumericInput - 실시간 콤마(,) 서식이 적용되는 숫자 입력 컴포넌트
 * 
 * @param {{
 *   value: number | string,
 *   onChange: (v: number) => void,
 *   placeholder?: string,
 *   style?: React.CSSProperties,
 *   className?: string,
 *   autoFocus?: boolean,
 *   onKeyDown?: (e: React.KeyboardEvent) => void
 * }} props
 */
export function NumericInput({ value, onChange, placeholder, style, className, autoFocus, onKeyDown }) {
  // 숫자를 콤마 포맷으로 변환 (예: 1000 -> "1,000")
  const format = (val) => {
    if (!val && val !== 0) return '';
    const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : val.toString();
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleChange = (e) => {
    const rawValue = e.target.value.replace(/,/g, '');
    const numValue = Number(rawValue);
    
    // 숫자가 아니면 무시 (빈 칸은 0 처리)
    if (isNaN(numValue)) return;
    
    onChange(numValue);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={format(value)}
      onChange={handleChange}
      placeholder={placeholder}
      style={{
        ...style,
        textAlign: 'right', // 금액 입력이므로 우측 정렬 권장
      }}
      className={className}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
    />
  );
}
