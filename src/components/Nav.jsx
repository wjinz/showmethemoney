import { Home, LayoutDashboard, Wallet, Menu, Plus } from "lucide-react";
import { THEME_TOKENS as T } from "../styles/tokens.js";

/**
 * @typedef {{ id: string, Icon: import('lucide-react').LucideIcon, label: string }} NavItem
 */

/** @type {NavItem[]} */
const LEFT_ITEMS = [
  { id: "home",      Icon: Home,            label: "공동" },
  { id: "dashboard", Icon: LayoutDashboard, label: "대시보드" },
];

/** @type {NavItem[]} */
const RIGHT_ITEMS = [
  { id: "private",  Icon: Wallet, label: "내 지갑" },
  { id: "settings", Icon: Menu,   label: "메뉴" },
];

/**
 * @param {{
 *   view: string,
 *   setView: (v: string) => void,
 *   syncStatus: string
 * }} props
 */
export function Nav({ view, setView, syncStatus }) {
  const isEntry = view === "entry" || view === "quickEntry";

  /**
   * @param {{ id: string, Icon: import('lucide-react').LucideIcon, label: string }} item
   */
  const NavBtn = ({ id, Icon, label }) => {
    const isActive = view === id;
    return (
      <button
        onClick={() => setView(id)}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          padding: "4px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isActive ? "var(--gold)" : "var(--text3)",
          transform: isActive ? "scale(1.1)" : "scale(1)",
          transition: "color 0.2s, transform 0.2s",
          position: "relative",
        }}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        <span
          style={{
            fontSize: 9,
            fontWeight: isActive ? 700 : 400,
            letterSpacing: ".03em",
          }}
        >
          {label}
        </span>
        {/* 동기화 오류 닷 — 대시보드 버튼에만 표시 */}
        {id === "dashboard" && syncStatus && syncStatus !== "ok" && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: "calc(50% - 14px)",
              width: 7,
              height: 7,
              borderRadius: T.radius.full,
              background: syncStatus === "error" ? "var(--red)" : "var(--gold)",
              border: "1.5px solid var(--bg)",
            }}
          />
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        zIndex: 100,
      }}
    >
      {/* FAB */}
      <div
        style={{
          position: "absolute",
          top: -28,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 101,
        }}
      >
        <button
          onClick={() => setView("quickEntry")}
          style={{
            width: 60,
            height: 60,
            borderRadius: T.radius.full,
            background: isEntry
              ? "linear-gradient(135deg,#c8a84b,#e2c97e)"
              : "linear-gradient(135deg,var(--text),#3B6FCC)",
            border: "3px solid var(--bg)",
            boxShadow: isEntry
              ? "0 0 0 4px rgba(200,168,75,.3), 0 6px 24px rgba(200,168,75,.5)"
              : T.shadow.fab,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            transition: "all 0.25s",
            transform: isEntry ? "scale(1.08) translateY(-2px)" : "scale(1)",
          }}
          onMouseOver={e => { e.currentTarget.style.transform = isEntry ? "scale(1.12) translateY(-2px)" : "scale(1.05)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = isEntry ? "scale(1.08) translateY(-2px)" : "scale(1)"; }}
        >
          <Plus size={26} strokeWidth={2.5} color="#fff" />
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: ".06em",
              lineHeight: 1,
            }}
          >
            입력
          </span>
        </button>
      </div>

      {/* 네비게이션 바 */}
      <div
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border-solid)",
          display: "flex",
          alignItems: "center",
          padding: "8px 0 14px",
        }}
      >
        {LEFT_ITEMS.map(item => (
          <NavBtn key={item.id} id={item.id} Icon={item.Icon} label={item.label} />
        ))}
        <div style={{ flex: 1 }} />
        {RIGHT_ITEMS.map(item => (
          <NavBtn key={item.id} id={item.id} Icon={item.Icon} label={item.label} />
        ))}
      </div>
    </div>
  );
}
