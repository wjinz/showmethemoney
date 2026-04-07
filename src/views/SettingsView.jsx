import { useState } from "react";
import { Card, SectionHeader } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { fmtS } from "../utils/helpers";
import { exportTransactions } from "../utils/export";
import { useBudget } from "../context/BudgetContext.jsx";
import { useKidsStore } from "../stores/kidsStore.js";

export function SettingsView({
  names, setNames, budgets, setBudgets, sliderCfg, setSliderCfg, theme, setTheme,
  resetAll, resetTx, resetFixed, resetBudgets, resetSetup, householdId, myRole,
  leaveHousehold, tx, plan, onBugReport, onAdminTrigger, isAdmin, onClose=undefined, onNavigate
}) {
  const [clickCount, setClickCount] = useState(0);
  const updateName = (role, v) => setNames(prev => ({ ...prev, [role]: v }));
  const { kidsMode, setKidsMode } = useBudget();
  const { kidsProfiles } = useKidsStore();

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%", background: "var(--bg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 0 12px" }}>
        <SectionHeader sub="Control Center" title="메뉴 / 환경 설정" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        <button onClick={() => onNavigate && onNavigate("budget")} style={{
          padding: "20px", borderRadius: 14, background: "var(--bg2)", border: "1px solid var(--border)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer"
        }}>
          <span style={{ fontSize: 24 }}>⚖️</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>예산 및 목표 설정</span>
        </button>
        <button onClick={() => onNavigate && onNavigate("report")} style={{
          padding: "20px", borderRadius: 14, background: "var(--bg2)", border: "1px solid var(--border)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer"
        }}>
          <span style={{ fontSize: 24 }}>◈</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>과거 리포트 조회</span>
        </button>
      </div>

      <Card className="u1" style={{ padding: "18px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".06em", marginBottom: 16 }}>■ 기본 정보 설정</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>남편 이름</div>
            <input value={names.husband} onChange={e => updateName("husband", e.target.value)}
              style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 13, outline: "none" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>아내 이름</div>
            <input value={names.wife} onChange={e => updateName("wife", e.target.value)}
              style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 13, outline: "none" }} />
          </div>
        </div>
      </Card>

      <Card className="u2" style={{ padding: "18px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".06em", marginBottom: 16 }}>■ 앱 스타일 및 테마</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {["dark", "light", "oldschool"].map(t => (
            <button key={t} onClick={() => setTheme(t)} style={{
              flex:1,padding:"10px",borderRadius:12,cursor:"pointer",
              fontWeight:700,fontSize:11,textTransform:"uppercase",
              background:theme===t?"var(--goldD)":"var(--bg2)",
              border:`1px solid ${theme===t?"var(--gold)":"var(--border)"}`,
              color:theme===t?"var(--gold)":"var(--text2)",
              transition:"all .15s"
            }}>{t === "dark" ? "다크 (기본)" : t === "light" ? "라이트" : "레트로 터미널"}</button>
          ))}
        </div>
        <SliderRow 
          label="예산 슬라이더 최대치" 
          value={sliderCfg.budgetSliderMax} 
          min={500000} max={10000000} step={100000} 
          onChange={v => setSliderCfg(p => ({ ...p, budgetSliderMax: v }))} 
          formatVal={v => fmtS(v) + "원"} 
          showReset onReset={() => setSliderCfg(p => ({ ...p, budgetSliderMax: 2000000 }))} 
        />
      </Card>

      {/* Kids Mode 토글 */}
      <Card style={{ padding: "18px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".06em", marginBottom: 16 }}>■ 아이 모드</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: kidsMode ? 12 : 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Kids Mode</div>
            <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
              활성화 시 아이 전용 UI로 전환됩니다
            </div>
          </div>
          <button
            onClick={() => setKidsMode(!kidsMode)}
            style={{
              width: 50, height: 28, borderRadius: 99, border: "none", cursor: "pointer",
              background: kidsMode ? "var(--gold)" : "var(--bg4)",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: kidsMode ? 24 : 4,
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }} />
          </button>
        </div>
        {kidsMode && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {kidsProfiles.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--text3)" }}>등록된 아이가 없습니다.</div>
              ) : (
                kidsProfiles.map(kid => (
                  <div key={kid.id} style={{ background: "var(--bg3)", borderRadius: 10, padding: "6px 12px", fontSize: 12, color: "var(--text2)" }}>
                    {kid.avatar} {kid.name}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => onNavigate && onNavigate("kids-mgmt")}
              style={{
                width: "100%", padding: "12px", borderRadius: 10,
                background: "var(--bg3)", border: "1px solid var(--border)",
                color: "var(--text)", fontSize: 12, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6
              }}
            >
              🧒 아이 프로필 및 미션 관리하기
            </button>
          </div>
        )}
      </Card>

      <Card className="u3" style={{ padding: "18px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".06em", marginBottom: 16 }}>■ 데이터 및 연결</div>
        <div style={{ background: "var(--bg3)", borderRadius: 12, padding: "14px", marginBottom: 12, fontSize: 12 }}>
          <div style={{ color: "var(--text3)", marginBottom: 4 }}>가계부 고유 ID (HID)</div>
          <div style={{ fontWeight: 800, letterSpacing: ".05em", color: "var(--gold)" }}>{householdId || "—"}</div>
        </div>

        <button onClick={() => navigator.clipboard.writeText(householdId).then(() => alert("복사되었습니다."))}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text2)", fontSize: 12, cursor: "pointer", marginBottom: 8 }}>복제용 HID 복사하기</button>
        <button onClick={() => { if (confirm("정말로 이 가계부에서 나갈까요?")) leaveHousehold(); }}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--red)", fontSize: 12, cursor: "pointer", marginBottom: 8 }}>가계부 연결 해제</button>

        <div style={{ height: 1, background: "var(--border)", margin: "12px 0" }} />

        <button onClick={() => exportTransactions(tx)}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--goldL)", background: "var(--goldD)", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>📥 전체 지출 내역 CSV 내보내기</button>
        <button onClick={onBugReport}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--blueL)", background: "var(--blueD)", color: "var(--blue)", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>🐞 오류 제보하기 (시스템 개선)</button>

        {isAdmin && (
          <button onClick={onAdminTrigger}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--gold)", background: "var(--gold)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>👨‍💻 관리자 페이지 바로가기</button>
        )}

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", opacity: 0.9 }}>
          <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, marginBottom: 12 }}>⚠️ 위험 구역 (데이터 관리)</div>
          <button onClick={() => { if (confirm("모든 지출 내역을 삭제할까요?")) resetTx(); }}
            style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text3)", fontSize: 11, cursor: "pointer", marginBottom: 8 }}>지출 내역 초기화</button>
          <button onClick={() => { if (confirm("정말로 모든 데이터를 초기화할까요?\n지출 내역, 고정비, 예산 등 모든 정보가 삭제됩니다.")) resetAll(); }}
            style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--red)", background: "var(--red)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>전체 데이터 초기화</button>
        </div>
      </Card>

      <div
        onClick={() => {
          const newCount = clickCount + 1;
          if (newCount >= 5) {
            onAdminTrigger();
            setClickCount(0);
          } else {
            setClickCount(newCount);
          }
        }}
        style={{ textAlign: "center", padding: "10px", opacity: 0.3, fontSize: 10, cursor: "pointer" }}
      >
        Family Budget v4.0.0 {clickCount > 0 && `(${clickCount})`}
      </div>
    </div>
  );
}
