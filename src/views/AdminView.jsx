import React, { useState, useEffect } from "react";
import { Card, SectionHeader } from "../components/UI";
import { db } from "../utils/supabase";
import { fmtMonthDay } from "../utils/helpers";

export function AdminView({ onClose, addToast }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadBugs = async () => {
    setLoading(true);
    try {
      const data = await db.loadBugs();
      // map to include key for updates
      setBugs(data.map(d => ({ ...d.value, key: d.key, hid: d.id, updatedAt: d.updated_at })));
    } catch (e) {
      console.error("Admin load error:", e);
      addToast("버그 리스트를 불러오지 못했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, []);

  const updateStatus = async (bug, newStatus) => {
    try {
      const updatedValue = { ...bug, status: newStatus };
      delete updatedValue.key; // key는 value에 포함되지 않음
      await db.updateBugStatus(bug.key, updatedValue);
      addToast("상태가 업데이트되었습니다.", "success");
      loadBugs(); // 새로고침
    } catch (e) {
      console.error("Update status error:", e);
      addToast("상태 업데이트 실패", "error");
    }
  };

  const filteredBugs = bugs.filter(b => filter === "all" || b.status === filter);

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%", background: "var(--bg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
        <SectionHeader sub="System Management" title="👨‍💻 관리자 페이지" />
        <button onClick={onClose} style={{
          padding: "8px 16px", borderRadius: 10, border: "none", 
          background: "var(--surface-alt)", color: "var(--text-faint)", fontSize: 13, cursor: "pointer"
        }}>나가기</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["all", "open", "resolved"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: filter === f ? "rgba(28,43,74,.08)" : "var(--surface-alt)",
            border: `1px solid ${filter === f ? "var(--primary)" : "var(--border)"}`,
            color: filter === f ? "var(--primary)" : "var(--text-muted)"
          }}>{f === "all" ? "전체" : f === "open" ? "대기중" : "해결됨"}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "100px 0", textAlign: "center", color: "var(--text-faint)" }}>로딩 중...</div>
      ) : filteredBugs.length === 0 ? (
        <div style={{ padding: "100px 20px", textAlign: "center", color: "var(--text-faint)", fontSize: 13, background: "var(--surface)", borderRadius: 20 }}>
          {filter === "all" ? "신고된 버그가 없습니다." : `"${filter}" 상태의 항목이 없습니다.`}
        </div>
      ) : filteredBugs.map(b => (
        <Card key={b.key} style={{ padding: 18, marginBottom: 12, border: b.status === "open" ? "1px solid var(--danger-bg1)" : "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
            <div style={{
              fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
              background: b.status === "open" ? "var(--danger-bg1)" : "var(--success-bg1)",
              color: b.status === "open" ? "var(--danger)" : "var(--success)"
            }}>{b.status.toUpperCase()}</div>
            <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{fmtMonthDay(new Date(b.updatedAt))}</div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{b.content}</div>
          
          <div style={{ background: "var(--surface-alt)", padding: 12, borderRadius: 10, fontSize: 10, color: "var(--text-muted)", marginBottom: 16 }}>
            <div>📍 HID: {b.hid || "unknown"}</div>
            <div style={{ marginTop: 4 }}>💻 {b.userAgent}</div>
            <div style={{ marginTop: 4 }}>📐 {b.screen} | {b.platform}</div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {b.status === "open" && (
              <button onClick={() => updateStatus(b, "resolved")} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none",
                background: "var(--success)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer"
              }}>해결 완료 처리</button>
            )}
            {b.status === "resolved" && (
              <button onClick={() => updateStatus(b, "open")} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "none", color: "var(--text-faint)", fontSize: 11, cursor: "pointer"
              }}>대기로 변경</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
