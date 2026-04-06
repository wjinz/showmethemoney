import { motion } from 'framer-motion';
import { Clock, Heart } from 'lucide-react';
import { fmtS } from '../../utils/helpers.js';
import { THEME_TOKENS as T } from '../../styles/tokens.js';

/**
 * @typedef {import('../../constants/index.js').SosRequest} SosRequest
 * @param {{ mySosPending: SosRequest[], names: Record<string, string>, myRole: string }} props
 */
export function SosStatusWidget({ mySosPending = [], names, myRole }) {
  if (mySosPending.length === 0) return null;

  const partnerName = myRole === 'husband' ? (names.wife || '와이프') : (names.husband || '남편');

  return (
    <div style={{ padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Clock size={14} color="var(--gold)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.02em' }}>
          SOS 진행 현황
        </span>
      </div>

      {mySosPending.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            background: 'var(--bg3)',
            borderRadius: T.radius.lg,
            padding: '16px',
            border: '1px solid rgba(200,168,75,0.2)',
            marginBottom: 8,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                {fmtS(req.amount)}원 요청 중
              </p>
              <p style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 500 }}>
                "{req.reason}"
              </p>
            </div>
            <Heart size={18} color="#EF4444" fill="#EF4444" style={{ opacity: 0.6 }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                animate={{ x: [-100, 100] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: '40%', height: '100%', background: 'var(--gold)', opacity: 0.5 }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700 }}>
              {partnerName}님이 확인 중...
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
