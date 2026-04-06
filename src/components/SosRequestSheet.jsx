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
 *   onClose: () => void,
 *   names: Record<string, string>
 * }} props
 */
export function SosRequestSheet({ myRole, allowance, spentPct, onSubmit, onClose, names }) {
  const [amountStr, setAmountStr] = useState('');
  const [reason,    setReason]    = useState('');
  const [repayPlan, setRepayPlan] = useState(REPAYS[0]);
  const [loading,   setLoading]   = useState(false);

  const partnerName = myRole === 'husband' ? (names?.wife || '와이프') : (names?.husband || '남편');

  const maxAmount = Math.round(allowance * 0.3) || 500000; // 최대 가불 (데이터 없을 시 기본값 50만)

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
        boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>🆘 {partnerName}에게 긴급 가불 요청</span>
          <button onClick={onClose} style={{ background: 'var(--bg4)', border: 'none', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }}>✕</button>
        </div>

        {/* 용돈 현황 */}
        <div style={{ padding: '12px 14px', background: 'var(--bg3)', borderRadius: 12, fontSize: 12, color: 'var(--text2)', border: '1px solid var(--border)' }}>
          최대 가불 가능 금액 <strong style={{ color: 'var(--text)', marginLeft: 4 }}>{fmtS(maxAmount)}원</strong>
        </div>

        {/* 금액 입력 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, marginLeft: 4 }}>가불 금액</div>
          <input
            type="text" inputMode="numeric"
            value={amountStr}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              border: `1px solid ${amount > maxAmount ? '#EF4444' : 'var(--border)'}`,
              background: 'var(--bg3)', color: 'var(--text)',
              fontSize: 20, fontWeight: 800, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {amount > maxAmount && (
            <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6, marginLeft: 4 }}>
              최대 {fmtS(maxAmount)}원까지 신청 가능합니다
            </div>
          )}
        </div>

        {/* 사유 선택 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, marginLeft: 4 }}>사유 선택</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)} style={{
                padding: '8px 16px', borderRadius: 99, border: `1px solid ${reason === r ? '#EF4444' : 'var(--border)'}`,
                background: reason === r ? 'rgba(239,68,68,0.1)' : 'var(--bg3)',
                color: reason === r ? '#EF4444' : 'var(--text2)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* 상환 방법 */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8, marginLeft: 4 }}>상환 방법</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {REPAYS.map(r => (
              <button key={r} onClick={() => setRepayPlan(r)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 10,
                border: `1px solid ${repayPlan === r ? '#EF4444' : 'var(--border)'}`,
                background: repayPlan === r ? 'rgba(239,68,68,0.1)' : 'var(--bg3)',
                color: repayPlan === r ? '#EF4444' : 'var(--text2)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}>{r}</button>
            ))}
          </div>
        </div>

        {/* 제출 버튼 */}
        <button 
          onClick={handleSubmit} 
          disabled={loading || !isValid} 
          style={{
            width: '100%', padding: 18, borderRadius: 16, border: 'none',
            background: isValid ? '#EF4444' : 'var(--bg4)',
            color: isValid ? '#fff' : 'var(--text3)',
            fontWeight: 800, fontSize: 16, cursor: isValid ? 'pointer' : 'default',
            marginTop: 8, boxShadow: isValid ? '0 8px 24px rgba(239,68,68,0.3)' : 'none',
            transition: 'all .25s',
          }}
        >
          {loading ? '심사 요청 중...' : `${partnerName}에게 SOS 보내기 🥺`}
        </button>
      </div>
    </div>
  );
}
