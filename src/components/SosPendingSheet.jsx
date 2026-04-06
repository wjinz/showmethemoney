import { useState } from 'react';
import { fmtS } from '../utils/helpers.js';

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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-end', zIndex: 400,
    }}>
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
        padding: '20px 16px 32px', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>📬 가불 요청</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
        </div>

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
                border: '1px solid var(--border)',
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
      </div>
    </div>
  );
}
