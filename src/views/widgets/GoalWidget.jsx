import { useState } from 'react';
import { motion } from 'framer-motion';
import { fmtS } from '../../utils/helpers.js';

/**
 * @param {{
 *   plan: { goals?: import('../../constants/index.js').GoalItem[] },
 *   setPlan?: (v: any) => void
 * }} props
 */
export function GoalWidget({ plan, setPlan }) {
  const goals = plan.goals ?? [];
  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState(0);

  const handleAddGoal = () => {
    if (!newLabel || newTarget <= 0) return;
    const newGoal = { label: newLabel, target: newTarget, saved: 0 };
    if (setPlan) {
      setPlan({ ...plan, goals: [...goals, newGoal] });
    }
    setShowModal(false);
    setNewLabel('');
    setNewTarget(0);
  };

  return (
    <div style={{ padding: '14px 16px', position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
        <span>🎯 목표 저축</span>
        {setPlan && (
          <button onClick={() => setShowModal(true)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ 추가</button>
        )}
      </div>

      {!goals.length ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
          공동 목표를 추가해보세요
        </div>
      ) : (
        goals.map((g, i) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          return (
            <div key={i} style={{ marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{g.label}</span>
                <span style={{ fontSize: 12, color: '#7A9E87', fontWeight: 800 }}>{pct}%</span>
              </div>
              <div style={{ position: 'relative', height: 12, background: 'var(--bg4)', borderRadius: 6, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  style={{
                    height: '100%', background: 'linear-gradient(90deg, #7A9E87, #4dab87)',
                    borderRadius: 6, position: 'relative', overflow: 'hidden',
                  }}
                >
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    style={{
                      position: 'absolute', top: 0, left: 0,
                      width: '50%', height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    }}
                  />
                </motion.div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, fontWeight: 600 }}>
                {fmtS(g.saved)}원 / {fmtS(g.target)}원
              </div>
            </div>
          );
        })
      )}

      {showModal && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'var(--bg2)', zIndex: 10, padding: 16, display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>새 공동 목표 추가</div>
          <input type="text" placeholder="예: 해외여행" value={newLabel} onChange={e => setNewLabel(e.target.value)}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: 8, color: 'var(--text)', borderRadius: 6, marginBottom: 8, fontSize: 12 }} />
          <input type="number" placeholder="목표 금액 (원)" value={newTarget || ''} onChange={e => setNewTarget(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: 8, color: 'var(--text)', borderRadius: 6, marginBottom: 12, fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowModal(false)} style={{ flex: 1, background: 'var(--bg3)', border: 'none', color: 'var(--text2)', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>취소</button>
            <button onClick={handleAddGoal} style={{ flex: 1, background: 'var(--gold)', border: 'none', color: '#fff', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>저장</button>
          </div>
        </div>
      )}
    </div>
  );
}
