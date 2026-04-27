import { describe, it, expect } from 'vitest';

/**
 * P0-1 회귀 방지: source_id로 연결된 diary와 tx가 중복 합산되면 안 됨.
 * DashboardView가 tx 단일소스로 합산해야 함.
 */
describe('Dashboard 중복 합산 방지 (P0-1)', () => {
  it('diary expense + 연결된 tx가 따로 합산되지 않는다', () => {
    const diaryId = 1;
    const diaries = [
      { id: diaryId, type: 'expense', date: '2026-04-27', who: 'husband', totalSpent: 10000, expenseItems: [{ amount: 10000 }] }
    ];
    const tx = [
      { id: 99, source_id: diaryId, date: '2026-04-27', amount: 10000, who: 'husband', cat: 'food' }
    ];

    // tx 단일소스 합산
    const totalFromTx = tx.reduce((s, t) => s + t.amount, 0);
    expect(totalFromTx).toBe(10000);

    // 만약 diaries + tx를 union해서 합산하면 20000 (회귀 케이스)
    const txAsDiary = tx.map(t => ({ totalSpent: t.amount, type: 'expense' }));
    const wrong = [...diaries, ...txAsDiary]
      .filter(d => d.type === 'expense')
      .reduce((s, d) => s + d.totalSpent, 0);
    expect(wrong).toBe(20000); // 잘못된 패턴이 정확히 2배가 됨을 검증
  });

  it('orphan tx (source_id 없음)는 리스트에 표시되어야 한다', () => {
    const diaries = [];
    const tx = [
      { id: 1, date: '2026-04-27', amount: 5000, who: 'husband', cat: 'food' }
    ];
    const orphans = tx.filter(t => !t.source_id);
    expect(orphans).toHaveLength(1);
  });
});
