import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { fmtS } from '../utils/helpers.js';
import { getYear, getMonth } from '../constants/index.js';
import { SosRequestSheet } from '../components/SosRequestSheet.jsx';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').GoalItem} GoalItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 */

/**
 * @param {{
 *   plan: {
 *     salary?: { husband: number, wife: number },
 *     personalAllowancePct?: number,
 *     privateGoals?: { husband: GoalItem[], wife: GoalItem[] }
 *   },
 *   tx: TxItem[],
 *   myRole: string,
 *   names: Record<string, string>,
 *   householdId: string,
 *   onSosSubmit: (req: { requester: string, amount: number, reason: string, repay_plan: string }) => Promise<void>
 * }} props
 */
export function PrivateWalletView({ plan, tx, myRole, names, householdId: _householdId, onSosSubmit }) {
  const [showSos, setShowSos] = useState(false);

  const name = names?.[myRole] ?? myRole;

  const { allowance, mySpent, leftAmt, pct } = useMemo(() => {
    const y = getYear(), m = getMonth();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const allw = (plan.salary?.[/** @type {'husband'|'wife'} */ (myRole)] ?? 0) * (plan.personalAllowancePct ?? 0.2);
    const spent = tx
      .filter(t => t.who === myRole && t.is_private && t.date.startsWith(prefix))
      .reduce((s, t) => s + t.amount, 0);
    const left = Math.max(allw - spent, 0);
    const p = allw > 0 ? Math.min(100, Math.round(spent / allw * 100)) : 0;
    return { allowance: allw, mySpent: spent, leftAmt: left, pct: p };
  }, [tx, myRole, plan]);

  const sosActive = allowance > 0 && pct >= 90;
  const privateGoals = plan.privateGoals?.[/** @type {'husband'|'wife'} */ (myRole)] ?? [];

  return (
    <div style={{ padding: '16px 16px 96px', overflowY: 'auto', height: '100%' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 2 }}>Welcome,</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)' }}>{name}!</div>
        <div style={{ fontSize: 12, color: 'var(--text2)' }}>Your Goals.</div>
      </div>

      {/* 개인 목표 위시리스트 */}
      {privateGoals.length > 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 14, fontWeight: 600 }}>
            My Goals
          </div>
          {privateGoals.map((g, i) => {
            const gpct = Math.min(100, Math.round(g.saved / g.target * 100));
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{g.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--theme-accent)', fontWeight: 800 }}>{gpct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gpct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{
                      height: '100%', background: 'var(--theme-accent)', borderRadius: 4,
                      boxShadow: '0 0 8px var(--theme-accent-soft)',
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>
                  {fmtS(g.saved)}원 / {fmtS(g.target)}원
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ring Gauge — 잔여 용돈 원형, 세부 내역 없음 */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '20px', marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4, fontWeight: 600 }}>
          Pocket Money Gauge
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 16 }}>
          Left: {fmtS(leftAmt)}원 / {fmtS(allowance)}원
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <RingGauge pct={pct} spent={mySpent} />
        </div>
        <button style={{
          marginTop: 16, padding: '10px 20px', borderRadius: 10,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          width: '100%',
        }}>
          🔒 View My Private Details
        </button>
      </div>

      {/* SOS 버튼 — 90% 이상 소진 시 활성화, 펄스 애니메이션 */}
      {sosActive && (
        <motion.button
          initial={{ scale: 0.95 }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          onClick={() => setShowSos(true)}
          style={{
            width: '100%', padding: 16, borderRadius: 14, border: 'none',
            background: 'var(--theme-accent)', color: '#fff',
            fontWeight: 900, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 20px var(--theme-accent-soft)',
          }}
        >
          SOS Budget Request ({pct}% 소진)
        </motion.button>
      )}

      {showSos && (
        <SosRequestSheet
          myRole={myRole}
          allowance={allowance}
          spentPct={pct}
          onSubmit={onSosSubmit}
          onClose={() => setShowSos(false)}
        />
      )}
    </div>
  );
}

/**
 * SVG 원형 게이지 — 세부 내역 없이 % 수치만 노출
 * @param {{ pct: number, spent: number }} props
 */
function RingGauge({ pct, spent: _spent }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  const color = pct >= 90 ? '#E8715A' : pct >= 70 ? '#c8a84b' : '#7A9E87';

  return (
    <svg width={140} height={140} style={{ overflow: 'visible' }}>
      <circle cx={70} cy={70} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
      <motion.circle
        cx={70} cy={70} r={r} fill="none"
        stroke={color} strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: dash }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform="rotate(-90 70 70)"
      />
      <text x={70} y={75} textAnchor="middle" fontSize={22} fontWeight={900} fill="var(--text)">
        {pct}%
      </text>
    </svg>
  );
}
