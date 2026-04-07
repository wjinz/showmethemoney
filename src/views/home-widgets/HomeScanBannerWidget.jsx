import { ScanLine } from "lucide-react";
import { THEME_TOKENS as T } from "../../styles/tokens.js";

/**
 * @param {{
 *   onScan: () => void
 * }} props
 */
export function HomeScanBannerWidget({ onScan }) {
  return (
    <div
      onClick={onScan}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "linear-gradient(135deg, var(--goldD), var(--gold))",
        borderRadius: T.radius.lg, padding: "12px 16px",
        border: "1px solid rgba(255,255,255,0.1)",
        cursor: "pointer", boxShadow: "0 4px 15px rgba(200,168,75,0.25)",
        transition: "opacity 0.2s",
        height: "100%", width: "100%", boxSizing: "border-box"
      }}
      onMouseOver={e => { e.currentTarget.style.opacity = "0.9"; }}
      onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            background: "rgba(255,255,255,0.2)", borderRadius: T.radius.md,
            padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <ScanLine size={20} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>영수증 & 카드내역 자동 입력</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 1 }}>사진 한 장으로 여러 내역을 한꺼번에! ✨</div>
        </div>
      </div>
      <div style={{ fontSize: 16, color: "#fff", opacity: 0.8 }}>›</div>
    </div>
  );
}
