import { useState, useMemo } from "react";
import { Card, Bar } from "../components/UI";
import { CAT, CATS, getYear, getMonth, getDay, MONTH_NAMES } from "../constants";
import { fmtS } from "../utils/helpers";
import { CardView } from "./CardView";
import { SimulatorView } from "./SimulatorView";

const TABS = [
  { id: "income",    icon: "💰", label: "수입/저축"    },
  { id: "fixed",     icon: "📌", label: "고정비/할부"  },
  { id: "cards",     icon: "💳", label: "카드 관리"    },
  { id: "budget",    icon: "📋", label: "카테고리 예산" },
  { id: "events",    icon: "🗓️", label: "연간 이벤트" },
  { id: "baseline",  icon: "📊", label: "분석 데이터"  },
  { id: "simulator", icon: "📈", label: "시뮬레이터"   },
  { id: "summary",   icon: "🔍", label: "플랜 요약"   },
];

const iStyle = {
  width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "10px 13px", color: "var(--text)", fontSize: 14, outline: "none",
};

const formatInput = (val) => {
  const num = String(val).replace(/[^0-9]/g, "");
  return num ? Number(num).toLocaleString() : "";
};
const parseInput = (val) => String(val).replace(/[^0-9]/g, "");

// ── 로컬 AI 예산 배분 알고리즘 (Heuristic Fallback) ──
const runLocalAI = (totalSalary, fixedTotal, installTotal, savingsTarget, catHistory) => {
  const monthlyAvail = Math.max(0, totalSalary - fixedTotal - installTotal - savingsTarget);
  if (monthlyAvail <= 0) return { budgets: {}, tip: "현재 고정비와 저축 목표가 수입을 초과하여 배분 가능한 예산이 없습니다." };

  const suggested = {};
  const reasons = {};
  
  // 1. 과거 데이터 기반 비중 계산
  const historyTotal = Object.values(catHistory).reduce((s, v) => s + v, 0);
  
  // 2. 표준 권장 비중 (지출 우선순위)
  const defaultWeights = {
    food: 0.35, housing: 0.15, transport: 0.1, medical: 0.08, education: 0.07,
    culture: 0.07, clothing: 0.08, sub: 0.05, etc: 0.05
  };

  CATS.forEach(cat => {
    let weight = defaultWeights[cat.id] || 0.1;
    // 과거 기록이 있으면 기록 가중치 50% 반영
    if (historyTotal > 0 && catHistory[cat.id]) {
      const histWeight = catHistory[cat.id] / historyTotal;
      weight = (weight * 0.4) + (histWeight * 0.6);
    }
    suggested[cat.id] = Math.round((monthlyAvail * weight) / 1000) * 1000; // 1,000원 단위 절사
    
    const REASON_TEMPLATES = {
      food:      "식비는 생활비에서 가장 큰 비중을 차지합니다.",
      housing:   "주거/관리비는 고정적으로 발생하는 필수 지출입니다.",
      transport: "교통비는 출퇴근 패턴을 기반으로 추정했습니다.",
      medical:   "의료비는 예비비 성격으로 여유있게 배분했습니다.",
      education: "교육비는 현재 지출 패턴을 우선 반영했습니다.",
      culture:   "문화/여가는 삶의 질을 위한 적정 비중입니다.",
      clothing:  "의류는 계절 지출을 고려한 평균치입니다.",
      sub:       "구독서비스는 현재 이용 중인 서비스를 기준으로 했습니다.",
      etc:       "기타는 예측 불가 지출을 위한 버퍼입니다.",
    };
    reasons[cat.id] = catHistory[cat.id] > 0
      ? `최근 3개월 평균 ${fmtS(catHistory[cat.id])}원을 기반으로 조정했습니다.`
      : (REASON_TEMPLATES[cat.id] || "표준 재무 가이드 기준입니다.");
  });

  return {
    budgets: suggested,
    reasons,
    tip: "로컬 엔진을 통해 지출 패턴과 재무 가이드를 결합하여 생성한 추천 예산입니다."
  };
};

function FixedTab({ fixed, setFixed, install, setInstall, cards, tx, names }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editFId, setEditFId] = useState(null);
  const [editIId, setEditIId] = useState(null);
  const [newF, setNewF] = useState({ name: "", amount: "", cat: "housing", day: "" });
  const [newI, setNewI] = useState({ name: "", total: "", months: "", cardId: cards[0]?.id || "", date: "" });

  const addF = () => {
    if (!newF.name || !newF.amount || !newF.day) return;
    const amount = parseInt(parseInput(newF.amount));
    const day = parseInt(newF.day);
    if (editFId) {
      setFixed(p => p.map(f => f.id === editFId ? { ...f, ...newF, amount, day } : f));
    } else {
      setFixed(p => [...p, { ...newF, id: Date.now(), amount, day }]);
    }
    setShowAdd(false); setEditFId(null); setNewF({ name: "", amount: "", cat: "housing", day: "" });
  };
  const delF = id => setFixed(p => p.filter(f => f.id !== id));

  const addI = () => {
    const totalNum = parseInt(parseInput(newI.total));
    const monthsNum = parseInt(newI.months);
    if (!newI.name || !totalNum || !monthsNum || !newI.date) return;
    const monthly = Math.round(totalNum / monthsNum);
    if (editIId) {
      setInstall(p => p.map(i => i.id === editIId ? { ...i, ...newI, total: totalNum, months: monthsNum, monthly } : i));
    } else {
      setInstall(p => [...p, { ...newI, id: Date.now(), total: totalNum, months: monthsNum, monthly }]);
    }
    setShowAdd(false); setEditIId(null); setNewI({ name: "", total: "", months: "", cardId: cards[0]?.id || "", date: "" });
  };
  const delI = id => setInstall(p => p.filter(i => i.id !== id));

  const fTotal = (fixed || []).reduce((s, f) => s + (f.amount || 0), 0);
  const iTotal = (install || []).reduce((s, i) => s + (i.monthly || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>고정비 합계: <span style={{color:"var(--blue)"}}>{fmtS(fTotal + iTotal)}원</span></div>
        <button onClick={() => {
          if (showAdd) { setEditFId(null); setEditIId(null); }
          setShowAdd(!showAdd);
        }} style={{ background: "var(--blue)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          {showAdd ? "닫기" : "+ 지출 추가"}
        </button>
      </div>

      {showAdd && (
        <Card style={{ padding: "18px", marginBottom: 16, border: "1px solid var(--blue)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[{ id: "f", l: "고정 정기지출" }, { id: "i", l: "카드 할부" }].map(t => (
              <button key={t.id} onClick={() => setNewF({ ...newF, type: t.id })} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: (newF.type || "f") === t.id ? "var(--blueD)" : "var(--bg4)", color: (newF.type || "f") === t.id ? "var(--blue)" : "var(--text2)", border: `1px solid ${(newF.type || "f") === t.id ? "var(--blue)" : "var(--border)"}` }}>{t.l}</button>
            ))}
          </div>

          {(newF.type || "f") === "f" ? (
            <div>
              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>항목명</div><input value={newF.name} onChange={e => setNewF({ ...newF, name: e.target.value })} placeholder="예: 아파트 관리비" style={iStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>월 금액</div><input type="text" value={formatInput(newF.amount)} onChange={e => setNewF({ ...newF, amount: parseInput(e.target.value) })} placeholder="0" style={{ ...iStyle, textAlign: "right" }} /></div>
                <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>출금일</div><input type="number" value={newF.day} onChange={e => setNewF({ ...newF, day: e.target.value })} placeholder="일(1-31)" style={{ ...iStyle, textAlign: "right" }} /></div>
              </div>
              <button onClick={addF} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 13 }}>{editFId ? "수정 완료" : "고정비 등록"}</button>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>할부 항목</div><input value={newI.name} onChange={e => setNewI({ ...newI, name: e.target.value })} placeholder="예: 가전제품" style={iStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 10, marginBottom: 10 }}>
                <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>할부 원금</div><input type="text" value={formatInput(newI.total)} onChange={e => setNewI({ ...newI, total: parseInput(e.target.value) })} placeholder="0" style={iStyle} /></div>
                <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>개월 수</div><input type="number" value={newI.months} onChange={e => setNewI({ ...newI, months: e.target.value })} placeholder="개월" style={{ ...iStyle, textAlign: "right" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[3, 6, 12, 24].map(m => (
                  <button key={m} onClick={() => setNewI({ ...newI, months: m })} style={{ flex: 1, padding: "5px 0", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer", background: newI.months == m ? "var(--blueD)" : "var(--bg3)", color: newI.months == m ? "var(--blue)" : "var(--text3)", border: `1px solid ${newI.months == m ? "var(--blue)" : "var(--border)"}` }}>{m}개월</button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: "45%" }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>결제 카드</div><select value={newI.cardId} onChange={e => setNewI({ ...newI, cardId: e.target.value })} style={iStyle}>{cards.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div style={{ flex: 1, minWidth: "45%" }}><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>최초 결제일</div><input type="date" value={newI.date} onChange={e => setNewI({ ...newI, date: e.target.value })} style={iStyle} /></div>
              </div>
              <button onClick={addI} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 13 }}>{editIId ? "수정 완료" : "할부 등록"}</button>
            </div>
          )}
          {(editFId || editIId) && (
            <button onClick={() => { setShowAdd(false); setEditFId(null); setEditIId(null); }} style={{ width: "100%", marginTop: 8, padding: "8px", borderRadius: 10, border: "1px solid var(--border)", background: "none", color: "var(--text3)", fontSize: 12 }}>취소</button>
          )}
        </Card>
      )}

      {/* 리스트 출력 */}
      <Card style={{ padding: "12px 14px", marginBottom: 8 }}>
        <div style={{fontSize:10, color:"var(--text3)", marginBottom:8}}>정기 지출</div>
        {fixed && fixed.length > 0 ? fixed.map(f => (
          <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", background: editFId === f.id ? "rgba(92,141,232,0.05)" : "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{f.name} <span style={{fontSize:10, color:"var(--text2)", fontWeight:400}}>(매달 {f.day}일)</span></div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>
              {fmtS(f.amount)}원
              <button onClick={() => {
                setEditFId(f.id); setShowAdd(true);
                setNewF({ ...f, amount: String(f.amount), type: "f" });
              }} style={{ padding: "2px 6px", borderRadius: 4, background: "var(--bg3)", border: "none", color: "var(--blue)", fontSize: 10, marginLeft: 8 }}>✏️</button>
              <button onClick={() => delF(f.id)} style={{ padding: "2px 6px", borderRadius: 4, background: "var(--bg3)", border: "none", color: "var(--red)", fontSize: 10, marginLeft: 4 }}>✕</button>
            </div>
          </div>
        )) : <div style={{fontSize:11, color:"var(--text3)", padding:"10px 0"}}>등록된 고정비가 없습니다.</div>}
      </Card>
      <Card style={{ padding: "12px 14px" }}>
        <div style={{fontSize:10, color:"var(--text3)", marginBottom:8}}>카드 할부</div>
        {install && install.length > 0 ? install.map(i => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--border)", background: editIId === i.id ? "rgba(92,141,232,0.05)" : "none" }}>
            <div><div style={{ fontSize: 13, fontWeight: 600 }}>{i.name}</div><div style={{fontSize:10, color:"var(--text2)"}}>{i.months}개월 · {i.date}</div></div>
            <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--pink)" }}>
              {fmtS(i.monthly)}원
              <button onClick={() => {
                setEditIId(i.id); setShowAdd(true);
                setNewF({ ...newF, type: "i" });
                setNewI({ ...i, total: String(i.total) });
              }} style={{ padding: "2px 6px", borderRadius: 4, background: "var(--bg3)", border: "none", color: "var(--blue)", fontSize: 10, marginLeft: 8 }}>✏️</button>
              <button onClick={() => delI(i.id)} style={{ padding: "2px 6px", borderRadius: 4, background: "var(--bg3)", border: "none", color: "var(--red)", fontSize: 10, marginLeft: 4 }}>✕</button>
            </div>
          </div>
        )) : <div style={{fontSize:11, color:"var(--text3)", padding:"10px 0"}}>등록된 할부 내역이 없습니다.</div>}
      </Card>
    </div>
  );
}

function BaselineTab({ plan, onGoToImport }) {
  const imp = plan.importedAnalysis;
  if (!imp) return (
    <div style={{ padding: "24px 0" }}>
      <Card style={{ padding: "28px 20px", textAlign: "center", border: "1px dashed var(--border)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>분석된 카드 데이터가 없어요</div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20, lineHeight: 1.7 }}>
          데이터 메뉴에서 카드사 Excel 파일을 업로드하면<br/>
          지출 패턴을 분석해서 예산 초안을 자동으로 잡아드려요.
        </div>
      </Card>
    </div>
  );
  const { total, avgMonthly, months, byCat, catBudgetSuggestions } = imp;
  const catData = CATS.map(c => ({
    ...c,
    amount: byCat[c.id] || 0,
    monthly: catBudgetSuggestions?.[c.id] || 0,
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  return (
    <div>
      <Card style={{ padding: "16px", marginBottom: 10, background: "var(--bg2)", border: "1px solid var(--green)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✓ 데이터 분석 완료</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[{ l: "분석 기간", v: `${months.length}개월` }, { l: "총 지출", v: fmtS(total) + "원" }, { l: "월평균", v: fmtS(avgMonthly) + "원" }].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--text2)", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 지출 분석 상세</div>
        {catData.map(c => {
          const pct = total > 0 ? Math.round(c.amount / total * 100) : 0;
          return (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span>{c.icon}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span></div>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtS(c.monthly)}원/월</span>
              </div>
              <Bar pct={pct} color={c.color} h={4} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function IncomeTab({ plan, setPlan, fixed, install }) {
  const update = (key, val) => setPlan(p => ({ ...p, [key]: val }));
  const salary = plan.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const monthlyIncome = (salary.husband || 0) + (salary.wife || 0);
  const monthlySavingTarget = salary.savingsTarget || 0;
  const monthlyFixed = (fixed || []).reduce((s, f) => s + (f.amount || 0), 0) + (install || []).reduce((s, i) => s + (i.monthly || 0), 0);
  const monthlyAvail = Math.max(0, monthlyIncome - monthlyFixed - monthlySavingTarget);

  return (
    <div>
      <Card style={{ padding: "18px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ {plan?.isSolo ? "나의 월 실수령액" : "부부 월 실수령액"}</div>
        {plan?.isSolo ? (
          <input type="text" value={formatInput(salary.husband)} onChange={e => {
            const v = parseInput(e.target.value);
            update("salary", { ...salary, husband: parseInt(v) || 0, wife: 0 });
          }} style={{...iStyle, textAlign: "right"}} placeholder="0" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>남편</div><input type="text" value={formatInput(salary.husband)} onChange={e => {
              const v = parseInput(e.target.value);
              update("salary", { ...salary, husband: parseInt(v) || 0 });
            }} style={{...iStyle, textAlign: "right"}} placeholder="0" /></div>
            <div><div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>아내</div><input type="text" value={formatInput(salary.wife)} onChange={e => {
              const v = parseInput(e.target.value);
              update("salary", { ...salary, wife: parseInt(v) || 0 });
            }} style={{...iStyle, textAlign: "right"}} placeholder="0" /></div>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 14, fontWeight: 800 }}>합계: <span style={{ color: "var(--green)" }}>{fmtS(monthlyIncome)}원</span></div>
      </Card>
      
      <Card style={{ padding: "18px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 월 저축 목표</div>
        <input type="text" value={formatInput(salary.savingsTarget)} onChange={e => {
          const v = parseInput(e.target.value);
          update("salary", { ...salary, savingsTarget: parseInt(v) || 0 });
        }} style={{...iStyle, textAlign: "right"}} placeholder="0" />
        {monthlyIncome > 0 && <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>저축률: {Math.round(monthlySavingTarget / monthlyIncome * 100)}%</div>}
      </Card>

      <div style={{ background: monthlyAvail >= 0 ? "var(--bg2)" : "var(--redD)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}><span style={{ color: "var(--text2)" }}>월 실수령액</span><span style={{ fontWeight: 600 }}>{fmtS(monthlyIncome)}원</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}><span style={{ color: "var(--text2)" }}>저축 및 고정비</span><span style={{ fontWeight: 600 }}>-{fmtS(monthlySavingTarget + monthlyFixed)}원</span></div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700 }}>변동 예산 가능액</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: "var(--gold)" }}>{fmtS(monthlyAvail)}원/월</span>
        </div>
      </div>
    </div>
  );
}

function BudgetTab({ budgets, setBudgets, tx, plan, setPlan, fixed, install }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const salary = plan.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const totalSalary = (salary.husband || 0) + (salary.wife || 0);
  const fixedTotal = (fixed || []).reduce((s, f) => s + (f.amount || 0), 0);
  const installTotal = (install || []).reduce((s, i) => s + (i.monthly || 0), 0);
  const monthlyAvailRaw = Math.max(0, totalSalary - fixedTotal - installTotal - (salary.savingsTarget || 0));
  
  const utilTarget = plan.utilizationTarget || 100;
  const monthlyAvail = Math.round(monthlyAvailRaw * utilTarget / 100);

  const totalBudget = Object.values(budgets).reduce((s, v) => s + (v || 0), 0);
  const unallocated = monthlyAvail - totalBudget;

  const runAI = async () => {
    setAiLoading(true);
    const catHistory = {};
    CATS.forEach(c => { catHistory[c.id] = 0; });
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        tx.filter(t => t.date.startsWith(ym)).forEach(t => { catHistory[t.cat] = (catHistory[t.cat] || 0) + t.amount / 3; });
    }
    try {
      const resp = await fetch("/api/budget-ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSalary, fixedTotal, installTotal, savingsTarget: salary.savingsTarget, catHistory })
      });
      if (resp.ok) {
        const data = await resp.json();
        setAiResult(data);
      } else { throw new Error("API Fail"); }
    } catch (e) {
      const local = runLocalAI(totalSalary, fixedTotal, installTotal, salary.savingsTarget, catHistory);
      setAiResult(local);
    } finally { setAiLoading(false); }
  };

  return (
    <div>
      <Card style={{ padding: "18px", marginBottom: 14, background: "var(--bg2)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 예산 활용 전략</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[90, 100].map(v => (
            <button key={v} onClick={() => setPlan(p => ({ ...p, utilizationTarget: v }))} style={{
              flex: 1, padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "1px solid var(--border)",
              background: utilTarget === v ? "var(--goldD)" : "var(--bg3)",
              color: utilTarget === v ? "var(--gold)" : "var(--text2)",
              transition: "all .2s"
            }}>{v}% 지출 타겟</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
           <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>총 집행 예정 예산</div>
            <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 800, marginTop: 4 }}>{fmtS(totalBudget)}원 <span style={{fontSize:9, color:"var(--text3)", fontWeight:400}}>/ {fmtS(monthlyAvail)}원</span></div>
           </div>
          <button onClick={() => setEditMode(!editMode)} style={{ background: editMode ? "var(--gold)" : "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 12px", fontSize: 11, cursor: "pointer", color: editMode ? "#fff" : "var(--text2)", fontWeight: 700 }}>{editMode ? "저장" : "예산 편집"}</button>
        </div>

        {/* 인터랙티브 스택 바 (Unallocated 포함) */}
        <div style={{ height: 36, width: "100%", background: "var(--bg4)", borderRadius: 12, overflow: "hidden", display: "flex", marginBottom: 12, border: "1px solid var(--border)" }}>
          {CATS.map(c => {
            const val = budgets[c.id] || 0;
            const pct = monthlyAvail > 0 ? (val / monthlyAvail * 100) : 0;
            if (pct < 0.5) return null;
            return (
              <div key={c.id} style={{ width: `${pct}%`, background: c.color, height: "100%", transition: "width .5s ease", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>
                {pct > 10 && <span title={c.label}>{c.icon}</span>}
              </div>
            );
          })}
          {unallocated > 0 && <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--text3)" }}>미배분</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
          <span style={{ color: unallocated < 0 ? "var(--red)" : "var(--green)" }}>{unallocated < 0 ? `한도 초과: ${fmtS(Math.abs(unallocated))}원` : `남은 예산: ${fmtS(unallocated)}원`}</span>
          <span style={{ color: "var(--text3)" }}>총 가용: {fmtS(monthlyAvail)}원</span>
        </div>
      </Card>

      {!aiResult && (
        <Card style={{ padding: "16px", marginBottom: 14, background: "var(--bg3)", border: "1px dashed var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>🤖 AI에게 예산 추천받기</div>
            <button onClick={runAI} disabled={aiLoading} style={{ background: "var(--gold)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{aiLoading ? "분석 중..." : "추천 시작"}</button>
          </div>
        </Card>
      )}

      {aiResult && (
        <Card style={{ padding: "16px", marginBottom: 14, background: "var(--greenD)1a", border: "1px solid var(--green)" }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "var(--green)" }}>✨ AI 추천 결과</div>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>{aiResult.tip}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setBudgets(b => ({ ...b, ...aiResult.budgets })); setAiResult(null); }} style={{ flex: 1, background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 12, fontWeight: 700 }}>전체 적용</button>
            <button onClick={() => setAiResult(null)} style={{ padding: "10px", background: "none", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}>취소</button>
          </div>
        </Card>
      )}

      {CATS.map(c => {
        const val = budgets[c.id] || 0;
        const pctOfTotal = monthlyAvail > 0 ? Math.round(val / monthlyAvail * 100) : 0;
        return (
          <div key={c.id} style={{ marginBottom: 14, background: editMode ? "var(--bg3)" : "none", padding: editMode ? "10px" : "0", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text3)" }}>비중 {pctOfTotal}%</div>
                </div>
              </div>
              {editMode ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="text" value={formatInput(budgets[c.id])} onChange={e => {
                    const v = parseInput(e.target.value);
                    setBudgets(prev => ({ ...prev, [c.id]: parseInt(v) || 0 }));
                  }} style={{ width: 110, background: "var(--bg4)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 14, textAlign: "right", color: "var(--text)", fontWeight: 700 }} />
                  <span style={{fontSize:12, color:"var(--text2)"}}>원</span>
                </div>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 800 }}>{fmtS(val)}원</span>
              )}
            </div>
            <Bar pct={pctOfTotal} color={c.color} h={4} />
          </div>
        );
      })}
    </div>
  );
}

function EventsTab({ plan, setPlan }) {
  const currentMonth = getMonth();
  const [newEv, setNewEv] = useState({ title: "", amount: "", month: currentMonth, cat: "etc" });
  const addEvent = () => {
    if (!newEv.title || !newEv.amount) return;
    setPlan(p => ({ ...p, events: [...(p.events || []), { id: Date.now(), ...newEv, amount: parseInt(newEv.amount) }] }));
    setNewEv({ title: "", amount: "", month: currentMonth, cat: "etc" });
  };
  const events = (plan.events || []).sort((a, b) => a.month - b.month);
  return (
    <div>
      <Card style={{ padding: "16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 새 이벤트 추가 (명절, 여행 등)</div>
        <input value={newEv.title} onChange={e => setNewEv(v => ({ ...v, title: e.target.value }))} placeholder="이벤트명" style={{ ...iStyle, marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input type="number" value={newEv.amount} onChange={e => setNewEv(v => ({ ...v, amount: e.target.value }))} placeholder="예상 금액" style={{ ...iStyle, flex: 1 }} />
          <select value={newEv.month} onChange={e => setNewEv(v => ({ ...v, month: parseInt(e.target.value) }))} style={{ ...iStyle, flex: 1 }}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button onClick={addEvent} style={{ width: "100%", padding: "12px", background: "var(--gold)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>이벤트 추가</button>
      </Card>
      {events.map(e => (
        <Card key={e.id} style={{ padding: "12px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 10, color: "var(--text3)" }}>{e.month}월</div><div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div></div>
          <div style={{ fontWeight: 700 }}>{fmtS(e.amount)}원 <button onClick={() => setPlan(p => ({ ...p, events: (p.events || []).filter(ev => ev.id !== e.id) }))} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", marginLeft: 8 }}>✕</button></div>
        </Card>
      ))}
    </div>
  );
}

export function BudgetView({ plan, setPlan, budgets, setBudgets, tx, fixed, setFixed, install, setInstall, cards, setCards, names, sliderCfg, setSliderCfg }) {
  const [tab, setTab] = useState("income");
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 4, padding: "14px 16px 0", background: "var(--bg)", flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "9px 12px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 11,
            background: tab === t.id ? "var(--goldD)" : "var(--bg2)",
            border: `1px solid ${tab === t.id ? "var(--gold)" : "var(--border)"}`,
            color: tab === t.id ? "var(--gold)" : "var(--text2)",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
          <div style={{ padding: "18px 0 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".08em", marginBottom: 2 }}>{getYear()}년 재무 마스터 플랜</div>
            <div className="serif" style={{ fontSize: 20 }}>{TABS.find(t => t.id === tab)?.label}</div>
          </div>
          {tab === "income"    && <IncomeTab plan={plan} setPlan={setPlan} fixed={fixed} install={install} />}
          {tab === "fixed"     && <FixedTab fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} tx={tx} names={names} />}
          {tab === "cards"     && <CardView cards={cards} setCards={setCards} />}
          {tab === "budget"    && <BudgetTab budgets={budgets} setBudgets={setBudgets} tx={tx} plan={plan} setPlan={setPlan} fixed={fixed} install={install} />}
          {tab === "events"    && <EventsTab plan={plan} setPlan={setPlan} />}
          {tab === "baseline"  && <BaselineTab plan={plan} />}
          {tab === "simulator" && <SimulatorView sliderCfg={sliderCfg ?? {}} onUpdateSimCfg={setSliderCfg} />}
          {tab === "summary"   && <IncomeTab plan={plan} setPlan={setPlan} fixed={fixed} install={install} />}
        </div>
      </div>
    </div>
  );
}
