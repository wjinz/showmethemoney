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
    <div style={{ padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Clock size={13} color="var(--gold)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.02em' }}>
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
            borderRadius: T.radius.md,
            padding: '12px',
            border: '1px solid rgba(200,168,75,0.2)',
            marginBottom: 6,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 1 }}>
                {fmtS(req.amount)}원 요청 중
              </p>
              <p style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 500, opacity: 0.8 }}>
                "{req.reason}"
              </p>
            </div>
            <Heart size={16} color="#EF4444" fill="#EF4444" style={{ opacity: 0.6 }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
              <motion.div
                animate={{ x: [-100, 100] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: '40%', height: '100%', background: 'var(--gold)', opacity: 0.5 }}
              />
            </div>
            <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700 }}>
              {partnerName}님이 확인 중...
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
