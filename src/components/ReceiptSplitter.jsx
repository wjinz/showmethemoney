import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CAT } from '../constants/index.js';
import { fmtS } from '../utils/helpers.js';

/**
 * @typedef {{ id: string, date: string, amount: number, cat: string, memo: string }} ScannedItem
 */

/**
 * ReceiptSplitter — OCR 결과 N개 항목을 공동/개인으로 분류 (Coral 형광펜 UI)
 * @param {{
 *   items: ScannedItem[],
 *   onConfirm: (shared: ScannedItem[], priv: ScannedItem[]) => void,
 *   onClose: () => void
 * }} props
 */
export function ReceiptSplitter({ items, onConfirm, onClose }) {
  /** @type {[Record<string,'shared'|'private'>, React.Dispatch<React.SetStateAction<Record<string,'shared'|'private'>>>]} */
  const [groups, setGroups] = useState(
    () => Object.fromEntries(items.map(i => [i.id, /** @type {'shared'|'private'} */ ('shared')]))
  );

  /** @param {string} id */
  const toggle = (id) =>
    setGroups(g => ({ ...g, [id]: g[id] === 'shared' ? 'private' : 'shared' }));

  const sharedTotal  = items.filter(i => groups[i.id] === 'shared').reduce((s, i) => s + i.amount, 0);
  const privateTotal = items.filter(i => groups[i.id] === 'private').reduce((s, i) => s + i.amount, 0);

  const handleConfirm = () => {
    onConfirm(
      items.filter(i => groups[i.id] === 'shared'),
      items.filter(i => groups[i.id] === 'private'),
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', zIndex: 300,
    }}>
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--surface)', borderRadius: '20px 20px 0 0',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>영수증 항목 분류</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
            color: 'var(--text-muted)', padding: '0 4px',
          }}>✕</button>
        </div>

        {/* 실시간 합계 요약 바 (Roll-up) */}
        <div style={{ display: 'flex', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
          <SplitBadge label="공동 생활비" amount={sharedTotal} color="#7A9E87" />
          <SplitBadge label="개인 용돈" amount={privateTotal} color="#E8715A" />
        </div>

        {/* 항목 리스트 — 탭 시 Coral 형광펜 효과 */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {items.map(item => {
            const isPrivate = groups[item.id] === 'private';
            const catInfo = CAT[item.cat];
            return (
              <div key={item.id} style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Coral 형광펜 오버레이 */}
                <AnimatePresence>
                  {isPrivate && (
                    <motion.div
                      key="highlighter"
                      initial={{ scaleX: 0, originX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'var(--theme-accent-soft)',
                        borderLeft: '3px solid var(--theme-accent)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </AnimatePresence>

                <div
                  onClick={() => toggle(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 16px', cursor: 'pointer',
                    borderLeft: isPrivate ? 'none' : '3px solid var(--border)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                      {item.memo || catInfo?.label || item.cat}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.date} · {catInfo?.icon} {catInfo?.label}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    {fmtS(item.amount)}원
                  </div>
                  <motion.div
                    animate={{ background: isPrivate ? '#E8715A' : '#7A9E87' }}
                    transition={{ duration: 0.2 }}
                    style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, color: '#fff' }}
                  >
                    {isPrivate ? '개인' : '공동'}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 분할 요약 */}
        <div style={{ padding: '8px 16px 4px', fontSize: 11, color: 'var(--text-muted)' }}>
          Splitting:{' '}
          <strong style={{ color: '#E8715A' }}>{fmtS(privateTotal)}원</strong> → 개인,{' '}
          <strong style={{ color: '#7A9E87' }}>{fmtS(sharedTotal)}원</strong> → 공동
        </div>

        {/* 확정 버튼 */}
        <button onClick={handleConfirm} style={{
          margin: '8px 16px 12px', padding: 14, borderRadius: 12, border: 'none',
          background: 'var(--theme-accent)', color: '#fff', fontWeight: 800, fontSize: 14,
          cursor: 'pointer',
        }}>
          Split &amp; Save ({items.length}건)
        </button>
      </div>
    </div>
  );
}

/**
 * @param {{ label: string, amount: number, color: string }} props
 */
function SplitBadge({ label, amount, color }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '6px 0',
      borderRadius: 8, background: 'var(--surface-alt)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{fmtS(amount)}원</div>
    </div>
  );
}
