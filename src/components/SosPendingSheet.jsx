import { useState } from 'react';
import { fmtS } from '../utils/helpers.js';
import { BottomSheet } from './BottomSheet.jsx';

/**
 * @param {{
 *   requests: import('../constants/index.js').SosRequest[],
 *   names: Record<string, string>,
 *   onResolve: (id: number, status: 'approved'|'rejected') => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export function SosPendingSheet({ requests, names, onResolve, onClose }) {
  const [loadingId, setLoadingId] = useState(/** @type {number|null} */ (null));

  /**
   * @param {number} id
   * @param {'approved'|'rejected'} status
   */
  const handleResolve = async (id, status) => {
    setLoadingId(id);
    try {
      await onResolve(id, status);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <BottomSheet isOpen onClose={onClose} title="📬 가불 요청" maxHeight="70dvh">
      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)', fontSize: 13 }}>
          대기 중인 요청이 없습니다
        </div>
      ) : (
        requests.map(r => {
          const requesterName = names[r.requester] ?? r.requester;
          const isLoading = loadingId === r.id;
          return (
            <div key={r.id} style={{
              padding: 14, background: 'var(--bg3)', borderRadius: 12, marginBottom: 10,
              border: '1px solid var(--border-solid)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>
                {requesterName} · {fmtS(r.amount)}원
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>
                사유: {r.reason}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                상환: {r.repay_plan}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleResolve(r.id, 'approved')}
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, border: 'none',
                    background: isLoading ? 'var(--bg4)' : 'var(--green)',
                    color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {isLoading ? '처리 중...' : '✓ 승인'}
                </button>
                <button
                  onClick={() => handleResolve(r.id, 'rejected')}
                  disabled={isLoading}
                  style={{
                    flex: 1, padding: 10, borderRadius: 10, border: 'none',
                    background: 'var(--bg4)', color: 'var(--red)',
                    fontWeight: 700, cursor: 'pointer', fontSize: 13,
                  }}
                >
                  ✕ 거절
                </button>
              </div>
            </div>
          );
        })
      )}
    </BottomSheet>
  );
}
