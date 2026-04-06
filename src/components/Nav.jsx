/**
 * @param {{ view: string, setView: (v: string) => void, syncStatus: string }} props
 */
export function Nav({ view, setView, syncStatus }) {
  const isEntry = view === "entry" || view === "quickEntry";

  const LEFT_ITEMS = [
    { id: "home",      icon: "⌂",  l: "홈" },
    { id: "entry",     icon: "✎",  l: "기록" },
  ];
  const RIGHT_ITEMS = [
    { id: "dashboard", icon: "⊞",  l: "대시보드" },
    { id: "private",   icon: "🔒", l: "내 지갑" },
  ];

  /** @param {{ id: string, icon: string, l: string }} item */
  const NavBtn = (item) => (
    <div key={item.id} style={{ flex: 1, position: "relative", display: "flex", justifyContent: "center" }}>
      <button
        onClick={() => setView(item.id)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          padding: "4px 0", width: "100%",
          color: view === item.id ? "var(--gold)" : "var(--text3)",
          fontFamily: "Syne,sans-serif", transition: "color .2s",
        }}
      >
        <span style={{
          fontSize: 19, lineHeight: 1,
          display: "block",
          transform: view === item.id ? "scale(1.12)" : "scale(1)",
          transition: "transform .2s",
        }}>
          {item.icon}
        </span>
        <span style={{
          fontSize: 9,
          fontWeight: view === item.id ? 700 : 400,
          letterSpacing: ".03em",
        }}>
          {item.l}
        </span>
      </button>
      {(item.id === "dashboard") && syncStatus && syncStatus !== "ok" && (
        <div style={{
          position: "absolute", top: 2, right: "calc(50% - 14px)",
          width: 7, height: 7, borderRadius: "50%",
          background: syncStatus === "error" ? "var(--red)" : "var(--gold)",
          border: "1.5px solid var(--bg)",
        }} />
      )}
    </div>
  );

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 100,
    }}>
      {/* FAB */}
      <div style={{ position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)", zIndex: 101 }}>
        <button
          className="fab"
          onClick={() => setView("quickEntry")}
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: isEntry
              ? "linear-gradient(135deg,#e2c97e,#c8a84b)"
              : "linear-gradient(135deg,var(--gold),var(--goldL))",
            border: "3px solid var(--bg)",
            boxShadow: isEntry
              ? "0 0 0 4px rgba(200,168,75,.3), 0 6px 24px rgba(200,168,75,.5)"
              : "0 4px 20px rgba(200,168,75,.35)",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 1,
            transition: "all .2s",
            transform: isEntry ? "scale(1.08)" : "scale(1)",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1, color: "#fff", fontWeight: 700 }}>✚</span>
          <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: ".06em", lineHeight: 1 }}>
            입력
          </span>
        </button>
      </div>

      <div style={{
        background: "var(--nav-bg)", backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "8px 0 14px",
      }}>
        {LEFT_ITEMS.map(item => <NavBtn key={item.id} {...item} />)}
        <div style={{ flex: 1 }} /> {/* FAB 공간 */}
        {RIGHT_ITEMS.map(item => <NavBtn key={item.id} {...item} />)}
      </div>
    </div>
  );
}
