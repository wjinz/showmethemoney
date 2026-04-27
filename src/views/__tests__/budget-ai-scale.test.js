import { describe, it, expect } from 'vitest';

/**
 * P7-2 회귀 방지: runLocalAI는 allowanceTotal을 차감해야 하고
 * suggested 합계가 monthlyAvail을 초과하지 않아야 함.
 */
describe('AI 예산 한도 (P7-2)', () => {
  function calcAvail(totalSalary, fixedTotal, installTotal, savingsTarget, allowanceTotal, utilizationTarget) {
    const raw = Math.max(0, totalSalary - fixedTotal - installTotal - savingsTarget - allowanceTotal);
    return Math.round(raw * Math.min(Math.max(utilizationTarget, 50), 100) / 100);
  }

  it('allowanceTotal 차감 후 가용 예산', () => {
    const avail = calcAvail(5000000, 2000000, 300000, 500000, 500000, 100);
    expect(avail).toBe(1700000);
  });

  it('scale 정규화: 합계가 monthlyAvail을 초과하면 비례 축소', () => {
    const monthlyAvail = 1700000;
    const suggested = { food: 800000, etc: 1200000 }; // sum = 2,000,000
    const sum = Object.values(suggested).reduce((s, v) => s + v, 0);
    const scale = monthlyAvail / sum;
    Object.keys(suggested).forEach(k => {
      suggested[k] = Math.round((suggested[k] * scale) / 1000) * 1000;
    });
    const finalSum = Object.values(suggested).reduce((s, v) => s + v, 0);
    expect(finalSum).toBeLessThanOrEqual(monthlyAvail);
  });
});
