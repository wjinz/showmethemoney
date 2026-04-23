import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { THEME_TOKENS as T } from "../../styles/tokens.js";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   sosPending: import('../../constants/index.js').SosRequest[],
 *   onSosResolve: (id: number, status: 'approved' | 'rejected') => Promise<void>
 * }} props
 */
export function HomeSosPendingWidget({ sosPending, onSosResolve }) {
  if (!sosPending || sosPending.length === 0) return null;

  return (
    <div style={{ height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
      <p
        style={{
          fontSize: 14, fontWeight: 700, color: "var(--text)",
          margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6,
        }}
      >
        🚨 결재 대기 중인 요청
      </p>
      <AnimatePresence>
        {sosPending.map(req => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            style={{
              background: "var(--surface)",
              borderRadius: T.radius.xl,
              border: "2px solid rgba(239,68,68,0.2)",
              padding: 20, marginBottom: 10,
              position: "relative", overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute", top: 0, left: 0,
                width: 4, height: "100%", background: "#EF4444",
                borderRadius: "24px 0 0 24px",
              }}
            />
            <div style={{ paddingLeft: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>배우자의 애교 섞인 요청 🥺</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.reason}</p>
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#EF4444", flexShrink: 0, marginLeft: 12 }}>
                  {fmtS(req.amount)}원
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => onSosResolve && onSosResolve(req.id, "approved")}
                  style={{
                    flex: 1, padding: "11px 0",
                    background: "#EF4444", color: "#fff",
                    borderRadius: T.radius.lg, fontWeight: 700, fontSize: 13,
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <CheckCircle2 size={16} strokeWidth={2.5} />
                  쿨승인
                </button>
                <button
                  onClick={() => onSosResolve && onSosResolve(req.id, "rejected")}
                  style={{
                    padding: "11px 18px",
                    background: "rgba(239,68,68,0.1)", color: "#EF4444",
                    borderRadius: T.radius.lg, fontWeight: 700, fontSize: 13,
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  <XCircle size={16} strokeWidth={2} />
                  반려
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
