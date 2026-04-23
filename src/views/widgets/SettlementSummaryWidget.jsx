import React, { useMemo } from 'react';
import { useBudget } from "../../context/BudgetContext.jsx";

export function SettlementSummaryWidget({ onNavigate }) {
  const { settlements } = useBudget();

  const latestSettlement = useMemo(() => {
    if (!settlements || settlements.length === 0) return null;
    return [...settlements].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [settlements]);
 
  const isPastMonth = useMemo(() => {
    if (!latestSettlement) return false;
    const d = new Date();
    const curDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return latestSettlement.date !== curDate;
  }, [latestSettlement]);

  if (!latestSettlement) {
    return (
      <div 
        style={{ width: "100%", height: "100%", background: "var(--surface)", borderRadius: 16, border: "1px dashed var(--border)", display: "flex", flexDirection: "column", padding: 16, cursor: "pointer" }}
        onClick={() => onNavigate && onNavigate("settlement")}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>💳 카드 대금 정산</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-faint)", textAlign: "center", padding: 10 }}>
          아직 정산 내역이 없습니다.<br/>클릭해서 결제 대금을 정산해보세요.
        </div>
      </div>
    );
  }

  const isSurplus = latestSettlement.expectedShortage >= 0;
  
  return (
    <div 
      style={{ 
        width: "100%", height: "100%", 
        background: `linear-gradient(135deg, ${isSurplus ? "var(--success-bg1)" : "var(--danger-bg1)"}, var(--surface))`, 
        borderRadius: 16, border: `1px solid ${isSurplus ? "var(--success)" : "var(--danger)"}30`, 
        display: "flex", flexDirection: "column", padding: 16, cursor: "pointer" 
      }}
      onClick={() => onNavigate && onNavigate("settlement")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>💳 카드 대금 정산</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--bg)", padding: "2px 6px", borderRadius: 4 }}>
          {isPastMonth && <span style={{ color: "var(--danger-bg1)" }}>※ 지난 데이터 </span>}
          {latestSettlement.date}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>이번 달 {isSurplus ? "예상 여유액" : "예상 부족액"}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: isSurplus ? "var(--success)" : "var(--danger)" }}>
          {isSurplus ? "+" : ""}{latestSettlement.expectedShortage.toLocaleString()}
          <span style={{ fontSize: 14 }}>원</span>
        </div>
      </div>
    </div>
  );
}
