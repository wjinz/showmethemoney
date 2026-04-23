import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * 공통 바텀시트 래퍼 (spring 25/200)
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
              background: "rgba(0,0,0,0.35)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 200,
              maxWidth: 480,
              margin: "0 auto",
            }}
          />
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
              background: "var(--surface)",
              borderRadius: "28px 28px 0 0",
              padding: "0 20px 28px",
              zIndex: 201,
              boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
              color: "var(--text)",
            }}
          >
            <div style={{ width: 40, height: 5, background: "#D1D5DB", borderRadius: 3, margin: "12px auto 16px" }} />
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 20, right: 20,
                width: 36, height: 36, borderRadius: 9999,
                background: "#F3F4F6", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#6B7280", transition: "background 0.2s",
                fontFamily: "inherit",
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = "#E5E7EB"; }}
              onMouseOut={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
              aria-label="닫기"
            >
              <X size={18} strokeWidth={2} />
            </button>
            {title && (
              <h2 style={{
                fontSize: 18, fontWeight: 800,
                letterSpacing: "-0.02em", color: "#111827",
                marginBottom: 16, paddingRight: 48,
              }}>
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
