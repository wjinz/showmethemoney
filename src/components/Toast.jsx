import { useState, useCallback } from "react";

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  }, []);

  return { toasts, addToast };
}

export function ToastContainer({ toasts }) {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none", width: "90%", maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "var(--bg2)",
          color: t.type === "error" ? "var(--red)" : "var(--green)",
          border: `1px solid ${t.type === "error" ? "rgba(170,32,32,0.3)" : "rgba(60,180,100,0.3)"}`,
          padding: "12px 16px", borderRadius: 12,
          fontSize: 13, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
