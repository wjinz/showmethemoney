import React, { useState } from "react";
import { Card } from "./UI";
import { db } from "../utils/supabase";

export function BugReportModal({ householdId, onClose, addToast }) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    
    try {
      const systemInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        timestamp: new Date().toISOString(),
        screen: `${window.screen.width}x${window.screen.height}`,
      };

      await db.reportBug(householdId, {
        content: content.trim(),
        status: "open",
        createdAt: new Date().toISOString(),
        ...systemInfo
      });

      addToast("오류 제보가 성공적으로 전송되었습니다. 감사합니다!", "success");
      onClose();
    } catch (e) {
      console.error("Bug report error:", e);
      addToast("제보 전송 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
      background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", 
      alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)"
    }}>
      <Card style={{ width: "100%", maxWidth: 400, padding: 24, position: "relative" }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "none", 
          border: "none", fontSize: 20, color: "var(--text3)", cursor: "pointer"
        }}>✕</button>
        
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 18, fontWeight: 800 }}>🐞 오류 제보하기</h3>
        <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
          발견하신 버그나 불편한 점을 자세히 적어주세요.<br/> 
          기기 정보가 자동으로 포함되어 문제 해결에 큰 도움이 됩니다.
        </p>

        <textarea 
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="어떤 상황에서 어떤 오류가 발생했나요?"
          style={{
            width: "100%", height: 120, background: "var(--bg4)", border: "1px solid var(--border)",
            borderRadius: 12, padding: 14, color: "var(--text)", fontSize: 13, resize: "none",
            outline: "none", marginBottom: 20
          }}
        />

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
          style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: isSubmitting ? "var(--bg3)" : "var(--blue)",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
            opacity: isSubmitting || !content.trim() ? 0.6 : 1
          }}
        >
          {isSubmitting ? "전송 중..." : "제보 전송하기"}
        </button>
      </Card>
    </div>
  );
}
