import { motion } from 'framer-motion';
import { fmtS } from '../../utils/helpers.js';

/**
 * @param {{
 *   plan: { goals?: import('../../constants/index.js').GoalItem[] }
 * }} props
 */
export function GoalWidget({ plan }) {
  const goals = plan.goals ?? [];
  if (!goals.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
        공동 목표를 추가해보세요
      </div>
    );
  }
  return (
    <div style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 12 }}>🎯 목표 저축</div>
      {goals.map((g, i) => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        return (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{g.label}</span>
              <span style={{ fontSize: 12, color: '#7A9E87', fontWeight: 800 }}>{pct}%</span>
            </div>
            {/* 3D 물결 애니메이션 프로그레스 바 */}
            <div style={{ position: 'relative', height: 12, background: 'var(--bg4)', borderRadius: 6, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%', background: 'linear-gradient(90deg, #7A9E87, #4dab87)',
                  borderRadius: 6, position: 'relative', overflow: 'hidden',
                }}
              >
                {/* 물결 라이팅 오버레이 */}
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '50%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  }}
                />
              </motion.div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, fontWeight: 600 }}>
              {fmtS(g.saved)}원 / {fmtS(g.target)}원
            </div>
          </div>
        );
      })}
    </div>
  );
}
