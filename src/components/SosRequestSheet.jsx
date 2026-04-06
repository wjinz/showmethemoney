import { useState } from 'react';
import { fmtS } from '../utils/helpers.js';

const REASONS = ['아이 장난감/교구', '개인 취미', '경조사', '의류/신발', '기타 개인 목적'];
const REPAYS  = ['다음달 차감', '2개월 분할', '상여금 차감'];

/**
 * @param {{
 *   myRole: string,
 *   allowance: number,
 *   spentPct: number,
 *   onSubmit: (req: { requester: string, amount: number, reason: string, repay_plan: string }) => Promise<void>,
 *   onClose: () => void
 * }} props
 */
export function SosRequestSheet({ myRole, allowance, spentPct, onSubmit, onClose }) {
  const [amountStr, setAmountStr] = useState('');
  const [reason,    setReason]    = useState('');
  const [repayPlan, setRepayPlan] = useState(REPAYS[0]);
  const [loading,   setLoading]   = useState(false);

  const maxAmount = Math.round(allowance * 0.3); // 최대 30% 가불

  const handleAmountChange = (/** @type {string} */ raw) => {
    const digits = raw.replace(/[^0-9]/g, '');
    setAmountStr(digits ? Number(digits).toLocaleString() : '');
  };

  const amount = parseInt(amountStr.replace(/,/g, ''), 10) || 0;
  const isValid = amount > 0 && amount <= maxAmount && reason.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onSubmit({ requester: myRole, amount, reason, repay_plan: repayPlan });
      onClose();
    } finally {
      setLoading(false);
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
        padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>🆘 용돈 가불 신청</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
        </div>

        {/* 용돈 현황 */}
        <div style={{ padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10, fontSize: 12, color: 'var(--text2)' }}>
          이번 달 용돈 <strong style={{ color: '#E8715A' }}>{spentPct}%</strong> 소진 ·
          최대 가불 <strong style={{ color: 'var(--text)' }}>{fmtS(maxAmount)}원</strong>
        </div>

        {/* 금액 입력 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>가불 금액</div>
          <input
            type="text" inputMode="numeric"
            value={amountStr}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 10,
              border: `1px solid ${amount > maxAmount ? '#E8715A' : 'var(--border)'}`,
              background: 'var(--bg3)', color: 'var(--text)',
              fontSize: 16, fontWeight: 700, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {amount > maxAmount && (
            <div style={{ fontSize: 10, color: '#E8715A', marginTop: 4 }}>
              최대 {fmtS(maxAmount)}원까지 신청 가능합니다
            </div>
          )}
        </div>

        {/* 사유 선택 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>사유</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{
                padding: '6px 12px', borderRadius: 99, border: `1px solid ${reason === r ? '#E8715A' : 'var(--border)'}`,
                background: reason === r ? 'rgba(232,113,90,0.15)' : 'var(--bg3)',
                color: reason === r ? '#E8715A' : 'var(--text2)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* 상환 방법 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>상환 방법</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {REPAYS.map(r => (
              <button key={r} onClick={() => setRepayPlan(r)} style={{
                flex: 1, padding: '8px 4px', borderRadius: 8,
                border: `1px solid ${repayPlan === r ? '#E8715A' : 'var(--border)'}`,
                background: repayPlan === r ? 'rgba(232,113,90,0.15)' : 'var(--bg3)',
                color: repayPlan === r ? '#E8715A' : 'var(--text2)',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* 제출 버튼 */}
        <button onClick={handleSubmit} disabled={loading || !isValid} style={{
          width: '100%', padding: 14, borderRadius: 12, border: 'none',
          background: isValid ? '#E8715A' : 'var(--bg4)',
          color: isValid ? '#fff' : 'var(--text3)',
          fontWeight: 800, fontSize: 14, cursor: isValid ? 'pointer' : 'default',
          transition: 'all .2s',
        }}>
          {loading ? '전송 중...' : '파트너에게 요청 보내기'}
        </button>
      </div>
    </div>
  );
}
