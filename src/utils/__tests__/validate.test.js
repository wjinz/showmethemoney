import { describe, it, expect, vi } from 'vitest';
import { validate } from '../validate.js';

describe('validate', () => {
  it('알 수 없는 키는 통과', () => {
    expect(validate('foo', { x: 1 })).toBe(true);
  });

  it('cards 스키마 일치 시 true', () => {
    const ok = [{ id: '1', label: '카드', type: 'credit' }];
    expect(validate('cards', ok)).toBe(true);
  });

  it('cards 스키마 불일치 시 false (strict 아닐 때 throw 안 함)', () => {
    const bad = [{ id: '1', name: '잘못된 키' }];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(validate('cards', bad)).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('tx 스키마 검증', () => {
    expect(validate('tx', [{ id: 1, amount: 1000, date: '2026-04-27' }])).toBe(true);
    expect(validate('tx', 'not array')).toBe(false);
  });
});
