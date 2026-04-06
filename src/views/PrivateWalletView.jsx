import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { fmtS } from '../utils/helpers.js';
import { getYear, getMonth, CAT, CATS } from '../constants/index.js';
import { THEME_TOKENS as T } from '../styles/tokens.js';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').GoalItem} GoalItem
 */

/**
 * @param {{
 *   plan: {
 *     salary?: { husband: number, wife: number },
 *     personalAllowancePct?: number,
 *     allowance?: { husband: number, wife: number },
 *     privateGoals?: { husband: GoalItem[], wife: GoalItem[] }
 *   },
 *   tx: TxItem[],
 *   myRole: string,
 *   names: Record<string, string>,
 *   householdId: string,
 *   onSosSubmit: (req: { requester: string, amount: number, reason: string, repay_plan: string }) => Promise<void>,
 *   onSettings: () => void,
 *   onAdd: () => void,
 *   onSosRequest: () => void
 * }} props
 */
export function PrivateWalletView({ plan, tx, myRole, names, householdId: _householdId, onSettings, onAdd, onSosRequest }) {
  const name = names?.[myRole] ?? myRole;
  const partnerName = myRole === 'husband' ? (names.wife || '와이프') : (names.husband || '남편');

  const { allowance, leftAmt, pct } = useMemo(() => {
    const y = getYear(), m = getMonth();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const allw = (plan.allowance?.[/** @type {'husband'|'wife'} */ (myRole)] ?? 0) || 
                 (plan.salary?.[/** @type {'husband'|'wife'} */ (myRole)] ?? 0) * (plan.personalAllowancePct ?? 0.2);
    const spent = tx
      .filter(t => t.who === myRole && t.is_private && t.date.startsWith(prefix))
      .reduce((s, t) => s + t.amount, 0);
    const left = Math.max(allw - spent, 0);
    const p = allw > 0 ? Math.min(100, Math.round(spent / allw * 100)) : 0;
    return { allowance: allw, leftAmt: left, pct: p };
  }, [tx, myRole, plan]);

  const privateTx    = tx.filter(t => t.who === myRole && t.is_private);
  const privateTxTotal = privateTx.reduce((s, t) => s + t.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ 
        padding: '16px 16px 120px', 
        overflowY: 'auto', height: '100%',
        background: 'var(--bg)'
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8, marginBottom: 20 }}>
        <div>
          <h1
            style={{
              fontSize: T.font.xxl, fontWeight: 800, letterSpacing: '-0.02em',
              color: 'var(--gold)', margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            나만의 비상금 <EyeOff size={20} strokeWidth={2} />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, fontWeight: 500 }}>
            {name}님만 볼 수 있는 프라이빗 지갑
          </p>
        </div>
        <button
          onClick={onSettings}
          style={{
            padding: 10, borderRadius: T.radius.full,
            background: 'var(--bg3)', border: '1px solid var(--border-solid)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text2)',
          }}
        >
          ⚙️
        </button>
      </div>

      {/* 프리미엄 블랙카드 */}
      <div
        style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #1F2937, #111827, #000000)',
          padding: 28, borderRadius: T.radius.xxl,
          border: '1px solid #374151',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          marginBottom: 16,
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <ShieldCheck size={28} color='var(--gold)' strokeWidth={1.5} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#6B7280' }}>PRIVATE WALLET</span>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>이번 달 비밀 지출 합계</p>
          <p
            style={{
              fontSize: T.font.hero, fontWeight: 800,
              letterSpacing: '-0.03em', color: '#fff', margin: 0,
            }}
          >
            {fmtS(privateTxTotal)}
            <span style={{ fontSize: T.font.xxl, marginLeft: 4 }}>원</span>
          </p>
        </div>
      </div>

      {/* 예산 게이지 가이드 */}
      {allowance > 0 && (
        <div style={{ background: 'var(--bg2)', borderRadius: T.radius.xl, padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>남은 예산</p>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: leftAmt < 0 ? '#EF4444' : 'var(--text)' }}>{fmtS(leftAmt)}원</h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>{pct}% 소진</p>
            </div>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              style={{ height: '100%', background: pct > 90 ? '#EF4444' : 'var(--gold)', borderRadius: 3 }}
            />
          </div>
        </div>
      )}

      {/* 개인 지출 입력 버튼 */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onAdd}
          style={{
            width: '100%', background: 'var(--gold)', border: 'none',
            borderRadius: T.radius.lg, padding: '16px',
            color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
            boxShadow: '0 8px 24px var(--goldD)',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          + 내 개인 지출 입력하기
        </button>
      </div>

      {/* SOS 버튼 */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onSosRequest}
          style={{
            width: '100%', padding: 16, borderRadius: T.radius.lg,
            background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
            fontWeight: 800, fontSize: 15, cursor: 'pointer',
            border: '2px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s'
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = '#EF4444';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            e.currentTarget.style.color = '#EF4444';
          }}
        >
          🚨 {partnerName}에게 긴급 가불 요청하기
        </button>
      </div>

      {/* 비밀 지출 내역 */}
      <div style={{ background: 'var(--bg2)', borderRadius: T.radius.xl, border: '1px solid var(--border-solid)', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>비밀 지출 내역</p>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>이번 달</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {privateTx.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.5 }}>🤐</div>
              <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>아직 비밀 지출 내역이 없습니다.</p>
            </div>
          ) : (
            privateTx.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 30).map((t, idx) => {
              const c = CAT[t.cat] || CATS[8];
              const isLast = idx === Math.min(privateTx.length, 30) - 1;
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)' }}>{c.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.memo || '지출'}</span>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>{t.date}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>-{fmtS(t.amount)}원</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{t.payMethod === 'cash' ? '현금' : '카드'}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
