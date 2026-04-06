import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { THEME_TOKENS as T } from "../styles/tokens.js";

/**
 * 공통 바텀시트 래퍼
 * — spring 애니메이션, 드래그 핸들, 백드롭 블러 포함
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   children: import('react').ReactNode,
 *   maxHeight?: string,
 * }} props
 */
export function BottomSheet({ isOpen, onClose, title, children, maxHeight = "90dvh" }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 백드롭 */}
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 200,
              maxWidth: 480,
              margin: "0 auto",
            }}
          />

          {/* 시트 */}
          <motion.div
            key="bs-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 480,
              margin: "0 auto",
              maxHeight,
              overflowY: "auto",
              background: "var(--bg2)",
              borderRadius: `${T.radius.xxl}px ${T.radius.xxl}px 0 0`,
              padding: "0 24px 40px",
              zIndex: 201,
              borderTop: "1px solid var(--border-solid)",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
              color: "var(--text)",
            }}
          >
            {/* 드래그 핸들 */}
            <div
              style={{
                width: 48,
                height: 6,
                background: "var(--border-solid)",
                borderRadius: T.radius.full,
                margin: "12px auto 20px",
              }}
            />

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 36,
                height: 36,
                borderRadius: T.radius.full,
                background: "var(--bg3)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text2)",
                transition: "background 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.background = "var(--bg4)"; }}
              onMouseOut={e => { e.currentTarget.style.background = "var(--bg3)"; }}
            >
              <X size={18} strokeWidth={2} />
            </button>

            {title && (
              <h2
                style={{
                  fontSize: T.font.xxl,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--text)",
                  marginBottom: 24,
                  paddingRight: 48,
                }}
              >
                {title}
              </h2>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
