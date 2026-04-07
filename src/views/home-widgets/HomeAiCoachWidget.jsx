import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { THEME_TOKENS as T } from "../../styles/tokens.js";

/**
 * @param {{
 *   nudgeText: string
 * }} props
 */
export function HomeAiCoachWidget({ nudgeText }) {
  if (!nudgeText) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="ai-bubble"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        style={{
          background: "linear-gradient(135deg, var(--ai-bubble-from), var(--ai-bubble-to))",
          padding: 20,
          borderRadius: T.radius.xl,
          borderTopLeftRadius: 4,
          border: "1px solid var(--ai-bubble-border)",
          display: "flex", alignItems: "flex-start", gap: 14,
          boxShadow: T.shadow.sm,
          height: "100%", boxSizing: "border-box", overflow: "hidden"
        }}
      >
        <div
          style={{
            background: "var(--ai-icon-bg)",
            padding: 10, borderRadius: T.radius.full,
            color: "var(--ai-icon-color)",
            boxShadow: T.shadow.sm,
            flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Sparkles size={18} strokeWidth={2} />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ai-bubble-title)", marginBottom: 4 }}>AI 소비 코치</p>
          <p style={{ fontSize: 13, color: "var(--ai-bubble-text)", lineHeight: 1.6, margin: 0 }}>{nudgeText}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
