import { motion } from "framer-motion";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   isTotalMode: boolean,
 *   setIsTotalMode: (v: boolean) => void,
 *   totalSpent: number,
 *   variableSpent: number,
 *   ringPct: number,
 *   ringDash: string,
 *   paceStatus: string,
 *   fixedTotal: number,
 *   installTotal: number,
 *   totalBudget: number,
 *   allowanceData: { husband: any, wife: any } | null,
 *   names: Record<string, string>,
 *   onSettings: (v: string) => void
 * }} props
 */
export function HomeExecutionSummaryWidget({
  isTotalMode, setIsTotalMode, totalSpent, variableSpent,
  ringPct, ringDash, paceStatus, fixedTotal, installTotal,
  totalBudget, allowanceData, names, onSettings
}) {
  const CIRC = 251;

  if (totalBudget === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: '20px 0' }}>
        <span style={{ fontSize: 32 }}>📊</span>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>이번 달 예산이 설정되지 않았습니다</p>
        <button
          onClick={() => onSettings("budget")}
          style={{
            padding: '8px 16px', borderRadius: 99, background: 'var(--gold)', color: '#fff',
            border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer'
          }}
        >
          예산 설정하러 가기
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 상단: 집행액 및 링 그래프 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "var(--fluid-sm, 12px)", color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>
            {isTotalMode ? "총 집행액" : "생활비 집행"}
          </p>
          <p style={{ fontSize: "var(--fluid-lg, 28px)", fontWeight: 800, color: "var(--text)", marginBottom: 10, whiteSpace: "nowrap" }}>
            {fmtS(isTotalMode ? totalSpent : variableSpent)}<span style={{ fontSize: 16, marginLeft: 2 }}>원</span>
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--bg3)",
                borderRadius: T.radius.md,
                padding: 3,
                border: "1px solid var(--border)",
                gap: 2,
              }}
            >
              {[{ v: true, label: "종합" }, { v: false, label: "생활비" }].map(({ v, label }) => (
                <button
                  key={label}
                  onClick={() => setIsTotalMode(v)}
                  style={{
                    padding: "4px 10px", borderRadius: T.radius.sm, fontSize: 10,
                    fontWeight: 700, cursor: "pointer", border: "none",
                    background: isTotalMode === v ? "var(--gold)" : "none",
                    color: isTotalMode === v ? "#fff" : "var(--text2)",
                    transition: "all .2s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <span
              className="responsive-hide"
              style={{
                fontSize: 10, fontWeight: 700, color: "var(--gold)",
                background: "var(--goldD)",
                padding: "4px 8px", borderRadius: T.radius.sm,
              }}
            >
              {paceStatus}
            </span>
          </div>
        </div>

        <div style={{ position: "relative", width: "clamp(72px, 20cqw, 100px)", height: "clamp(72px, 20cqw, 100px)", flexShrink: 0 }}>
          <svg
            style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
            viewBox="0 0 100 100"
          >
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg3)" strokeWidth="12" />
            <motion.circle
              cx="50" cy="50" r="40" fill="transparent"
              stroke="var(--gold)" strokeWidth="12"
              strokeDasharray={ringDash}
              initial={{ strokeDasharray: `0 ${CIRC}` }}
              animate={{ strokeDasharray: ringDash }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "clamp(12px, 4cqw, 18px)", fontWeight: 800, color: "var(--text)" }}>{ringPct}%</span>
            <span style={{ fontSize: "clamp(7px, 2cqw, 9px)", color: "var(--text3)", marginTop: 1 }}>{isTotalMode ? "종합" : "생활"}</span>
          </div>
        </div>
      </div>

      {/* 하단: 항목별 상세 바 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: "📌 고정비", value: fixedTotal },
          { label: "💳 할부",   value: installTotal },
          { label: "🛒 생활비", value: variableSpent },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--bg3)",
              borderRadius: T.radius.lg,
              padding: "12px 14px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <p style={{ fontSize: 9, color: "var(--text3)", fontWeight: 600 }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text2)" }}>{fmtS(value)}원</p>
          </div>
        ))}
      </div>

      {/* 추가: 부부 용돈 현황 (Image 3 스타일 통합) */}
      {allowanceData && (
        <div style={{ marginTop: 4, padding: '16px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: T.radius.lg, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
             <span style={{ fontSize: 13 }}>🐷</span>
             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>부부 용돈 현황</span>
          </div>
          
          {['husband', 'wife'].map(role => {
            const data = allowanceData[role];
            const color = role === 'husband' ? 'var(--h)' : 'var(--w)';
            const bg = role === 'husband' ? 'var(--hD)' : 'var(--wD)';
            return (
              <div key={role} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                      {names[role]} <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginLeft: 2 }}>{data.pct}%</span>
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                    {fmtS(data.remaining)}원 <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>남음</span>
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${data.pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    style={{ height: '100%', background: color, borderRadius: 99 }} 
                  />
                </div>
              </div>
            );
          })}
          
          <div style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', marginTop: 10, opacity: 0.6 }}>
            * 개인별 비밀 용돈 지출 기반 🤫
          </div>
        </div>
      )}
    </div>
  );
}
