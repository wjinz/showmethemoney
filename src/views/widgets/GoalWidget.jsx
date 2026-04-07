import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { fmtS, fmtC } from '../../utils/helpers.js';

/**
 * @param {{
 *   plan: { goals?: import('../../constants/index.js').GoalItem[] },
 *   setPlan?: (v: any) => void
 * }} props
 */
export function GoalWidget({ plan, setPlan }) {
  const goals = plan.goals ?? [];
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(-1);
  
  const [newLabel, setNewLabel] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newSaved, setNewSaved] = useState('');

  const openAddModal = () => {
    setEditIndex(-1);
    setNewLabel('');
    setNewTarget('');
    setNewSaved('0');
    setShowModal(true);
  };

  const openEditModal = (idx) => {
    const g = goals[idx];
    setEditIndex(idx);
    setNewLabel(g.label);
    setNewTarget(g.target.toString());
    setNewSaved(g.saved.toString());
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSave = () => {
    const targetNum = Number(newTarget.replace(/[^0-9]/g, ''));
    const savedNum = Number(newSaved.replace(/[^0-9]/g, ''));
    if (!newLabel || targetNum <= 0) return;
    
    if (setPlan) {
      let nextGoals = [...goals];
      if (editIndex !== -1) {
        nextGoals[editIndex] = { label: newLabel, target: targetNum, saved: savedNum };
      } else {
        nextGoals.push({ label: newLabel, target: targetNum, saved: savedNum });
      }
      setPlan({ ...plan, goals: nextGoals });
    }
    closeModal();
  };

  const handleDelete = () => {
    if (setPlan && editIndex !== -1) {
      if (confirm('이 공동 목표를 삭제하시겠습니까?')) {
        let nextGoals = [...goals];
        nextGoals.splice(editIndex, 1);
        setPlan({ ...plan, goals: nextGoals });
        closeModal();
      }
    }
  };

  // Portal 대상이 될 최상단 body (실제 앱에서는 document.body가 무난)
  const renderModal = () => {
    if (!showModal) return null;
    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'var(--bg2)', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative'
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, color: 'var(--text)' }}>
            {editIndex !== -1 ? '공동 목표 수정' : '새 공동 목표 추가'}
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>라벨 (예: 해외여행)</div>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: 12, color: 'var(--text)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>목표 금액</div>
            <input type="text" value={fmtC(newTarget)} onChange={e => setNewTarget(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: 12, color: 'var(--text)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>현재 모은 금액</div>
            <input type="text" value={fmtC(newSaved)} onChange={e => setNewSaved(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', padding: 12, color: 'var(--text)', borderRadius: 8, fontSize: 14, outline: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {editIndex !== -1 && (
              <button onClick={handleDelete} style={{ flex: 1, background: 'rgba(255,100,100,0.1)', border: 'none', color: '#FF6B6B', padding: 14, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                삭제
              </button>
            )}
            <button onClick={closeModal} style={{ flex: 1, background: 'var(--bg3)', border: 'none', color: 'var(--text)', padding: 14, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>취소</button>
            <button onClick={handleSave} style={{ flex: 2, background: 'var(--gold)', border: 'none', color: '#fff', padding: 14, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 800 }}>저장</button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span>🎯 목표 저축</span>
        {setPlan && (
          <button onClick={openAddModal} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>+ 추가</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!goals.length ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            공동 목표를 추가해보세요
          </div>
        ) : (
          goals.map((g, i) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
            return (
              <div key={i} onClick={() => setPlan && openEditModal(i)} style={{ marginBottom: 18, cursor: setPlan ? 'pointer' : 'default' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                    {g.label}
                  </span>
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
      </div>

      {renderModal()}
    </div>
  );
}
