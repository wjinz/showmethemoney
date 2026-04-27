import { describe, it, expect } from 'vitest';
import { parseLocalDate, toDateStr, today_str } from '../helpers.js';

describe('helpers date', () => {
  it('parseLocalDate는 로컬 자정 Date 반환 (UTC 변환 없음)', () => {
    const d = parseLocalDate('2026-04-27');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(27);
    expect(d.getHours()).toBe(0);
  });

  it('toDateStr 로컬 yyyy-mm-dd 포맷', () => {
    const d = new Date(2026, 3, 27, 23, 59);
    expect(toDateStr(d)).toBe('2026-04-27');
  });

  it('today_str = parseLocalDate 호환', () => {
    const s = today_str();
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
