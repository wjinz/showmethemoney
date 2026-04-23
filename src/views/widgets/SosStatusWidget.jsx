import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Heart, Edit2, Trash2, X } from 'lucide-react';
import { fmtS, fmtC } from '../../utils/helpers.js';
import { THEME_TOKENS as T } from '../../styles/tokens.js';

/**
 * @typedef {import('../../constants/index.js').SosRequest} SosRequest
 * @param {{ 
 *   mySosPending: SosRequest[], 
 *   names: Record<string, string>, 
 *   myRole: string,
 *   onSosUpdate?: (id: number, updates: Partial<SosRequest>) => void,
 *   onSosCancel?: (id: number) => void
 * }} props
 */
export function SosStatusWidget({ mySosPending = [], names, myRole, onSosUpdate, onSosCancel }) {
  const [editingReq, setEditingReq] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  const partnerName = myRole === 'husband' ? (names.wife || '와이프') : (names.husband || '남편');

  const openEdit = (req) => {
    setEditingReq(req);
    setEditAmount(req.amount.toString());
    setEditReason(req.reason);
  };

  const closeEdit = () => {
    setEditingReq(null);
  };

  const handleUpdate = () => {
    if (!editingReq || !onSosUpdate) return;
    const amount = Number(editAmount.replace(/[^0-9]/g, ''));
    if (amount <= 0 || !editReason) return;
    
    onSosUpdate(editingReq.id, { amount, reason: editReason });
    closeEdit();
  };

  const renderModal = () => {
    if (!editingReq) return null;
    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, boxSizing: 'border-box'
      }}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: 'var(--surface)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>SOS 요청 수정</h3>
            <button onClick={closeEdit} style={{ background: 'none', border: 'none', color: 'var(--text-faint)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>요청 금액</label>
            <input 
              type="text" 
              value={fmtC(editAmount)} 
              onChange={e => setEditAmount(e.target.value.replace(/[^0-9]/g, ''))}
              style={{ width: '100%', background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: 14, borderRadius: 10, color: 'var(--text)', fontSize: 16, fontWeight: 700, outline: 'none' }} 
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>사유</label>
            <input 
              type="text" 
              value={editReason} 
              onChange={e => setEditReason(e.target.value)}
              placeholder="예: 경조사비 부족"
              style={{ width: '100%', background: 'var(--surface-alt)', border: '1px solid var(--border)', padding: 14, borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none' }} 
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeEdit} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: 'var(--surface-alt)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer' }}>
              취소
            </button>
            <button onClick={handleUpdate} style={{ flex: 2, padding: 14, borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
              수정 완료
            </button>
          </div>
        </motion.div>
      </div>,
      document.body
    );
  };

  return (
    <div style={{ padding: '16px 12px 12px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Clock size={13} color="var(--primary)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.02em' }}>
          SOS 진행 현황
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {mySosPending.length === 0 ? (
          <div style={{ padding: '20px 10px', textAlign: 'center', background: 'var(--surface-alt)', borderRadius: T.radius.md, border: '1px dashed var(--border)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              현재 진행 중인 가불 요청이 없습니다.<br/>
              <span style={{ fontSize: 11, opacity: 0.7 }}>급할 땐 파트너에게 SOS를 쳐보세요!</span>
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {mySosPending.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  background: 'var(--surface-alt)',
                  borderRadius: T.radius.md,
                  padding: '14px',
                  border: '1px solid rgba(200,168,75,0.2)',
                  marginBottom: 10,
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                       <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{fmtS(req.amount)}원</span>
                       <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, background: 'rgba(200,168,75,0.1)', padding: '1px 5px', borderRadius: 4 }}>가불 중</span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, margin: 0, opacity: 0.9 }}>
                      "{req.reason}"
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(req)} style={{ background: '#F3F4F6', border: 'none', padding: 6, borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => onSosCancel?.(req.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: 6, borderRadius: 6, color: 'var(--danger)', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                    <motion.div
                      animate={{ x: [-150, 250] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                      style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--primary), transparent)', opacity: 0.6 }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>
                    {partnerName}님이 확인 중...
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {renderModal()}
    </div>
  );
}
