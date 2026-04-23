import React, { useState } from "react";
import { Card } from "./UI";

export function AdminLoginModal({ onLogin, onClose, addToast }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  const handleSubmit = () => {
    if (id === "wjin" && pw === "080964") {
      onLogin();
      addToast("관리자 인증 성공!", "success");
      onClose();
    } else {
      addToast("인증 정보가 올바르지 않습니다.", "error");
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
      background: "rgba(0,0,0,0.85)", zIndex: 1100, display: "flex", 
      alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)"
    }}>
      <Card style={{ width: "100%", maxWidth: 320, padding: 24, textAlign: "center" }}>
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 18, fontWeight: 800 }}>🔐 관리자 인증</h3>
        
        <input 
          type="text"
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="관리자 아이디"
          style={{
            width: "100%", background: "#F3F4F6", border: "1px solid var(--border)",
            borderRadius: 10, padding: "12px", marginBottom: 10, color: "var(--text)", 
            fontSize: 13, outline: "none", textAlign: "center"
          }}
        />
        
        <input 
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          placeholder="비밀번호"
          style={{
            width: "100%", background: "#F3F4F6", border: "1px solid var(--border)",
            borderRadius: 10, padding: "12px", marginBottom: 24, color: "var(--text)", 
            fontSize: 13, outline: "none", textAlign: "center"
          }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)",
            background: "var(--surface-alt)", color: "var(--text-faint)", fontSize: 13, cursor: "pointer"
          }}>취소</button>
          <button onClick={handleSubmit} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "none",
            background: "var(--primary)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>인증하기</button>
        </div>
      </Card>
    </div>
  );
}
