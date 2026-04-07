/**
 * KidsView — 아이 전용 UI
 *
 * - 돼지저금통 + 원형 게이지 (숫자 최소화)
 * - AI 응원 메시지 (api/kids-coach.js 경유)
 * - Tap-to-Record 카테고리 그리드
 * - 100% 달성 축하 오버레이
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKidsStore } from '../stores/kidsStore.js';
import { useBudget } from '../context/BudgetContext.jsx';
import { CATS } from '../constants/index.js';

export function KidsView() {
  const { addTx, myRole } = useBudget();
  const { kidsProfiles } = useKidsStore();

  // Phase 1: 단일 아이 지원 (첫 번째 아이)
  const kid = kidsProfiles[0] ?? null;

  const [nudge, setNudge] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [tappedCat, setTappedCat] = useState(/** @type {string|null} */ (null));

  const goalPct = kid && kid.goal_amount > 0
    ? Math.min(100, Math.round((kid.saved_amount / kid.goal_amount) * 100))
    : 0;

  // AI 응원 메시지 로드
  useEffect(() => {
    if (!kid) return;
    let cancelled = false;
    fetch('/api/kids-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kidName: kid.name, goalPct, goalLabel: kid.goal_label }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setNudge(d.message ?? ''); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [kid, goalPct]);

  // 100% 달성 시 축하 오버레이 표시
  useEffect(() => {
    if (goalPct >= 100) setShowCelebration(true);
  }, [goalPct]);

  /**
   * 탭-투-레코드: 카테고리 클릭 시 100원 지출 기록
   * @param {{ id: string, label: string }} cat
   */
  const handleTap = (cat) => {
    if (!kid) return;
    setTappedCat(cat.id);
    setTimeout(() => setTappedCat(null), 400);
    addTx({
      date: new Date().toISOString().slice(0, 10),
      amount: 100,
      cat: cat.id,
      memo: cat.label,
      who: myRole,
      payMethod: 'allowance',
      type: 'expense',
    });
  };

  const circumference = 2 * Math.PI * 70;

  return (
    <div style={{
      padding: '24px 20px 120px', overflowY: 'auto', height: '100%',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* 이름 인사 */}
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
        안녕, {kid?.name ?? '친구'}! 👋
      </div>

      {/* 돼지저금통 bounce 애니메이션 */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        style={{ fontSize: 96, lineHeight: 1, marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setShowCelebration(true)}
      >
        🐷
      </motion.div>

      {/* 원형 게이지 SVG */}
      <svg width={160} height={160} style={{ marginBottom: 8 }}>
        <circle cx={80} cy={80} r={70} fill="none" stroke="var(--bg3)" strokeWidth={14} />
        <circle
          cx={80} cy={80} r={70} fill="none"
          stroke={goalPct >= 100 ? '#22c55e' : 'var(--gold)'}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={String(circumference)}
          strokeDashoffset={String(circumference * (1 - goalPct / 100))}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={80} y={84} textAnchor="middle" fill="var(--text)"
          fontSize={28} fontWeight="800" fontFamily="Pretendard, sans-serif">
          {goalPct}%
        </text>
      </svg>

      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
        🎯 {kid?.goal_label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 24 }}>
        {kid?.saved_amount.toLocaleString()}원 / {kid?.goal_amount.toLocaleString()}원
      </div>

      {/* AI 응원 말풍선 */}
      <AnimatePresence>
        {nudge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'var(--ai-bubble-from)', border: '1.5px solid var(--ai-bubble-border)',
              borderRadius: 16, padding: '14px 18px', marginBottom: 28, maxWidth: 320,
              fontSize: 14, color: 'var(--ai-bubble-text)', lineHeight: 1.6, textAlign: 'center',
            }}
          >
            🤖 {nudge}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap-to-Record 카테고리 그리드 */}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, fontWeight: 700 }}>
        오늘 뭘 샀어?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 320 }}>
        {CATS.map(cat => (
          <motion.button
            key={cat.id}
            onClick={() => handleTap(cat)}
            animate={tappedCat === cat.id ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              background: tappedCat === cat.id ? 'var(--goldD)' : 'var(--bg2)',
              border: `1px solid ${tappedCat === cat.id ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 16, padding: '18px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer', minHeight: 80,
            }}
          >
            <span style={{ fontSize: 28 }}>{cat.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{cat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* 100% 달성 축하 오버레이 */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCelebration(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 500,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 3, duration: 0.5 }}
              style={{ fontSize: 80 }}
            >🎉</motion.div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginTop: 16 }}>
              {goalPct >= 100 ? '목표 달성!' : '잘 하고 있어!'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8 }}>
              {goalPct >= 100
                ? `${kid?.goal_label}을 살 수 있어요!`
                : `조금만 더 모으면 돼! 현재 ${goalPct}%`}
            </div>
            <div style={{ marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              탭해서 닫기
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
