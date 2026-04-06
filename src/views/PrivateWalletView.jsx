import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, EyeOff, ShieldCheck, Delete } from 'lucide-react';
import { fmtS } from '../utils/helpers.js';
import { getYear, getMonth, CAT, CATS } from '../constants/index.js';
import { SosRequestSheet } from '../components/SosRequestSheet.jsx';
import { THEME_TOKENS as T } from '../styles/tokens.js';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').GoalItem} GoalItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 */

/** PIN 키패드 키 타입 */
/** @typedef {number | 'del' | ''} PinKey */

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
 *   onSosSubmit: (req: { requester: string, amount: number, reason: string, repay_plan: string }) => Promise<void>,
 *   onSettings: () => void,
 *   onAdd: () => void
 * }} props
 */
export function PrivateWalletView({ plan, tx, myRole, names, householdId: _householdId, onSosSubmit, onSettings, onAdd }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin]               = useState('');
  const [pinError, setPinError]     = useState(false);
  const [showSos, setShowSos]       = useState(false);

  const CORRECT_PIN = localStorage.getItem('private_pin') || '1234';

  /** @param {string} digit */
  const handlePinInput = (digit) => {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        setTimeout(() => { setIsUnlocked(true); setPin(''); }, 300);
      } else {
        setPinError(true);
        setTimeout(() => { setPin(''); setPinError(false); }, 500);
      }
    }
  };

  const handlePinDel = () => setPin(p => p.slice(0, -1));

  // ── PIN 잠금 화면 ──
  if (!isUnlocked) {
    /** @type {PinKey[]} */
    const PAD_KEYS = [1,2,3,4,5,6,7,8,9,'',0,'del'];

    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '85vh', padding: '24px',
          background: 'var(--bg)',
        }}
      >
        {/* 자물쇠 아이콘 */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 40 }}
        >
          <div
            style={{
              width: 80, height: 80,
              background: 'linear-gradient(135deg, #1F2937, #111827)',
              borderRadius: T.radius.full,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid #374151',
            }}
          >
            <Lock size={32} color='var(--gold)' strokeWidth={2} />
          </div>
          <h2
            style={{
              fontSize: T.font.xxl, fontWeight: 800,
              letterSpacing: '-0.02em', color: 'var(--text)', margin: 0,
            }}
          >
            프라이빗 월렛
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>
            PIN 번호를 입력하세요
          </p>
        </motion.div>

        {/* PIN 도트 */}
        <motion.div
          animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', gap: 24, marginBottom: 56 }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                width: 16, height: 16, borderRadius: T.radius.full,
                background: pin.length > i ? 'var(--gold)' : '#1F2937',
                transition: 'all 0.3s',
                transform: pin.length > i ? 'scale(1.15)' : 'scale(1)',
                boxShadow: pin.length > i ? T.shadow.glow : 'none',
              }}
            />
          ))}
        </motion.div>

        {/* iOS 스타일 PIN 패드 */}
        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px 28px', width: '100%', maxWidth: 280,
          }}
        >
          {PAD_KEYS.map((key, i) => {
            const isEmpty = key === '';
            const isDel   = key === 'del';
            return (
              <button
                key={i}
                onClick={() => {
                  if (isEmpty) return;
                  if (isDel) { handlePinDel(); return; }
                  handlePinInput(String(key));
                }}
                style={{
                  width: 80, height: 80, borderRadius: T.radius.full,
                  background: isEmpty ? 'transparent' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  cursor: isEmpty ? 'default' : 'pointer',
                  fontSize: isDel ? 11 : T.font.hero,
                  fontWeight: isDel ? 600 : 300,
                  color: 'var(--text)',
                  visibility: isEmpty ? 'hidden' : 'visible',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { if (!isEmpty) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseOut={e => { if (!isEmpty) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              >
                {isDel ? <Delete size={22} strokeWidth={1.5} /> : key}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 잠금 해제 후 대시보드 ──
  return <UnlockedView
    plan={plan} tx={tx} myRole={myRole} names={names}
    onLock={() => setIsUnlocked(false)}
    onSettings={onSettings} onAdd={onAdd}
    showSos={showSos} setShowSos={setShowSos}
    onSosSubmit={onSosSubmit}
  />;
}

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
 *   onLock: () => void,
 *   onSettings: () => void,
 *   onAdd: () => void,
 *   showSos: boolean,
 *   setShowSos: (v: boolean) => void,
 *   onSosSubmit: (req: { requester: string, amount: number, reason: string, repay_plan: string }) => Promise<void>,
 * }} props
 */
function UnlockedView({ plan, tx, myRole, names, onLock, onSettings: _onSettings, onAdd, showSos, setShowSos, onSosSubmit }) {
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

  const privateTx    = tx.filter(t => t.who === myRole && t.is_private);
  const privateTxTotal = privateTx.reduce((s, t) => s + t.amount, 0);
  const sosActive    = allowance > 0 && pct >= 90;
  const privateGoals = plan.privateGoals?.[/** @type {'husband'|'wife'} */ (myRole)] ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '16px 16px 96px', overflowY: 'auto', height: '100%' }}
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
            {name}님만 볼 수 있어요
          </p>
        </div>
        <button
          onClick={onLock}
          style={{
            padding: 10, borderRadius: T.radius.full,
            background: 'var(--bg3)', border: '1px solid var(--border-solid)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text2)',
          }}
        >
          <Unlock size={18} strokeWidth={2} />
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
        {/* 배경 글로우 오브 */}
        <div
          style={{
            position: 'absolute', top: -16, right: -16, width: 128, height: 128,
            background: 'var(--gold)', opacity: 0.12, borderRadius: '50%',
            filter: 'blur(40px)', pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: -16, left: -16, width: 96, height: 96,
            background: '#3B82F6', opacity: 0.1, borderRadius: '50%',
            filter: 'blur(32px)', pointerEvents: 'none',
          }}
        />
        {/* 카드 내용 */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <ShieldCheck size={28} color='var(--gold)' strokeWidth={1.5} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#6B7280' }}>
              PRIVATE
            </span>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>이번 달 비밀 지출</p>
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

      {/* 용돈 게이지 카드 */}
      {allowance > 0 && (
        <div
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border-solid)',
            borderRadius: T.radius.xl, padding: 20, marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>
            Pocket Money Gauge
          </p>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
            남음: {fmtS(leftAmt)}원 / {fmtS(allowance)}원
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <RingGauge pct={pct} spent={mySpent} />
          </div>
        </div>
      )}

      {/* 개인 목표 위시리스트 */}
      {privateGoals.length > 0 && (
        <div
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border-solid)',
            borderRadius: T.radius.xl, padding: '16px 20px', marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, fontWeight: 600 }}>
            My Goals
          </p>
          {privateGoals.map((g, i) => {
            const gpct = Math.min(100, Math.round(g.saved / g.target * 100));
            return (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{g.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 800 }}>{gpct}%</span>
                </div>
                <div style={{ height: 8, background: 'var(--border-solid)', borderRadius: 4, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gpct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'var(--gold)', borderRadius: 4 }}
                  />
                </div>
                <p style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4 }}>
                  {fmtS(g.saved)}원 / {fmtS(g.target)}원
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* 개인 지출 입력 버튼 */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={onAdd}
          style={{
            width: '100%', background: 'var(--gold)', border: 'none',
            borderRadius: T.radius.lg, padding: '16px',
            color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 12px var(--goldD)',
          }}
        >
          + 내 개인 지출 입력하기
        </button>
      </div>

      {/* SOS 버튼 — 90% 이상 소진 시 */}
      <AnimatePresence>
        {sosActive && (
          <motion.button
            key="sos-btn"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: [1, 1.03, 1], opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2 }}
            onClick={() => setShowSos(true)}
            style={{
              width: '100%', padding: 16, borderRadius: T.radius.lg, border: 'none',
              background: '#EF4444', color: '#fff', marginBottom: 20,
              fontWeight: 900, fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
            }}
          >
            🚨 긴급 생활비 가불 요청하기
          </motion.button>
        )}
      </AnimatePresence>

      {/* 비밀 지출 내역 */}
      <div
        style={{
          background: 'var(--bg2)', borderRadius: T.radius.xl,
          border: '1px solid var(--border-solid)', overflow: 'hidden',
        }}
      >
        <p
          style={{
            fontSize: 14, fontWeight: 700, color: 'var(--text)',
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--border-solid)', margin: 0,
          }}
        >
          비밀 지출 내역
        </p>
        {privateTx.length === 0 ? (
          <div
            style={{
              padding: '28px 16px', textAlign: 'center',
              color: 'var(--text3)',
            }}
          >
            <EyeOff size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p style={{ fontSize: 13, margin: 0 }}>아직 비밀 지출이 없네요!</p>
          </div>
        ) : (
          privateTx.slice(0, 30).map((t, idx) => {
            const c = CAT[t.cat] || CATS[8];
            const isLast = idx === Math.min(privateTx.length, 30) - 1;
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border-solid)',
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42, height: 42, borderRadius: T.radius.full,
                      background: 'var(--bg3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                      border: '1px solid var(--border-solid)',
                    }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{t.memo || c.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{c.label} · {t.date}</p>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)', flexShrink: 0 }}>
                  -{fmtS(t.amount)}원
                </span>
              </div>
            );
          })
        )}
      </div>

      {showSos && (
        <SosRequestSheet
          myRole={myRole}
          allowance={allowance}
          spentPct={pct}
          onSubmit={onSosSubmit}
          onClose={() => setShowSos(false)}
        />
      )}
    </motion.div>
  );
}

/**
 * SVG 원형 게이지
 * @param {{ pct: number, spent: number }} props
 */
function RingGauge({ pct, spent: _spent }) {
  const r    = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - pct / 100);
  const color = pct >= 90 ? '#E8715A' : pct >= 70 ? '#c8a84b' : '#7A9E87';

  return (
    <svg width={140} height={140} style={{ overflow: 'visible' }}>
      <circle cx={70} cy={70} r={r} fill="none" stroke="var(--border-solid)" strokeWidth={10} />
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
