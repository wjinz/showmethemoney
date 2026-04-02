import { useState } from "react";
import { Card, Bar } from "../components/UI";
import { CAT, CATS, DAY, MONTH, YEAR, MONTH_NAMES } from "../constants";
import { fmtS } from "../utils/helpers";

// ────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────
const TABS = [
  { id: "baseline", icon: "📊", label: "기준 데이터" },
  { id: "income",   icon: "💰", label: "수입/저축"  },
  { id: "budget",   icon: "📋", label: "카테고리 예산" },
  { id: "events",   icon: "📌", label: "연간 이벤트" },
  { id: "summary",  icon: "🔍", label: "플랜 요약"  },
];

const iStyle = {
  width: "100%", background: "var(--bg3)", border: "1px solid var(--border)",
  borderRadius: 10, padding: "10px 13px", color: "var(--text)", fontSize: 14, outline: "none",
};

// ────────────────────────────────────────────────
// 1. 기준 데이터 탭
// ────────────────────────────────────────────────
function BaselineTab({ plan, onGoToImport }) {
  const imp = plan.importedAnalysis;
  if (!imp) return (
    <div style={{ padding: "24px 0" }}>
      <Card style={{ padding: "28px 20px", textAlign: "center", border: "1px dashed var(--border)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>과거 카드 데이터가 없어요</div>
        <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 20, lineHeight: 1.7 }}>
          카드사 Excel 파일을 업로드하면<br/>
          지출 패턴을 분석해서 예산 초안을 자동으로 잡아드려요.
        </div>
        <button onClick={onGoToImport} style={{
          padding: "12px 24px", borderRadius: 12, border: "none",
          background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>카드 데이터 업로드하기 →</button>
      </Card>
      <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", marginTop: 14 }}>
        데이터 없이도 직접 예산을 입력할 수 있어요 (수입/저축 탭)
      </div>
    </div>
  );

  // 업로드 데이터 있는 경우
  const { total, avgMonthly, count, months, byCat, catBudgetSuggestions } = imp;
  const catData = CATS.map(c => ({
    ...c,
    amount: byCat[c.id] || 0,
    monthly: catBudgetSuggestions?.[c.id] || 0,
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div>
      <Card style={{ padding: "16px", marginBottom: 10, background: "var(--bg2)", border: "1px solid var(--green)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>✓ 분석 데이터 연결됨</div>
          <button onClick={onGoToImport} style={{ fontSize: 10, color: "var(--text3)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>재업로드</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { l: "분석 기간", v: `${months.length}개월` },
            { l: "총 지출", v: fmtS(total) + "원" },
            { l: "월평균", v: fmtS(avgMonthly) + "원" },
          ].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--text2)", marginBottom: 3 }}>{s.l}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 카테고리별 실제 지출 (월평균)</div>
        {catData.map(c => {
          const pct = total > 0 ? Math.round(c.amount / total * 100) : 0;
          return (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{c.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtS(c.monthly)}원/월</span>
                  <span style={{ fontSize: 10, color: "var(--text3)", marginLeft: 5 }}>{pct}%</span>
                </div>
              </div>
              <Bar pct={pct} color={c.color} h={4} />
            </div>
          );
        })}
      </Card>

      <div style={{ background: "var(--goldD)", border: "1px solid var(--gold)", borderRadius: 12, padding: "14px 16px", fontSize: 12, color: "var(--text)", lineHeight: 1.7 }}>
        💡 <strong>수입/저축 탭</strong>에서 수입을 입력하고, <strong>카테고리 예산 탭</strong>에서 이 데이터 기반으로 예산을 조정해보세요.
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// 2. 수입/저축 탭
// ────────────────────────────────────────────────
function IncomeTab({ plan, setPlan }) {
  const update = (key, val) => setPlan(p => ({ ...p, [key]: val }));

  const salary        = plan.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const monthlyIncome = (salary.husband || 0) + (salary.wife || 0);
  const monthlySavingTarget = salary.savingsTarget || 0;
  const yearSavingGoal      = monthlySavingTarget * 12;
  const monthlyFixed    = plan.monthlyFixedTotal || 0;
  const monthlyAvail    = Math.max(0, monthlyIncome - monthlyFixed - monthlySavingTarget);

  const imp = plan.importedAnalysis;
  const avgSuggest = imp ? imp.avgMonthly : null;

  return (
    <div>
      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ {plan?.isSolo ? "월 실수령액" : "부부 합산 월 실수령액"}</div>
        {plan?.isSolo ? (
          <div style={{ marginBottom: 8 }}>
            <input type="number" placeholder="0" value={salary.husband || ""}
              onChange={e => update("salary", { ...salary, husband: parseInt(e.target.value) || 0, wife: 0 })}
              style={iStyle} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>남편</div>
              <input type="number" placeholder="0" value={salary.husband || ""}
                onChange={e => update("salary", { ...salary, husband: parseInt(e.target.value) || 0 })}
                style={iStyle} />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 4 }}>아내</div>
              <input type="number" placeholder="0" value={salary.wife || ""}
                onChange={e => update("salary", { ...salary, wife: parseInt(e.target.value) || 0 })}
                style={iStyle} />
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>
          합계: <span style={{ color: "var(--green)" }}>{fmtS(monthlyIncome)}원</span>
        </div>
        {imp && (
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 8 }}>
            💡 카드 데이터 기준 월평균 지출: <strong style={{ color: "var(--gold)" }}>{fmtS(imp.avgMonthly)}원</strong>
            {monthlyIncome > 0 && monthlyIncome > imp.avgMonthly && (
              <span style={{ color: "var(--green)" }}> → 수입이 지출보다 {fmtS(monthlyIncome - imp.avgMonthly)}원 많아요</span>
            )}
          </div>
        )}

        {/* 고정 지출 합계 (참고값) */}
        {monthlyFixed > 0 && (
          <div style={{ background: "var(--bg3)", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>
            고정비 합산 (FixedView 기준): <strong style={{ color: "var(--text)" }}>{fmtS(monthlyFixed)}원/월</strong>
          </div>
        )}
      </Card>

      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 월 저축 목표</div>
        <input type="number" placeholder="예: 500000" value={salary.savingsTarget || ""}
          onChange={e => update("salary", { ...salary, savingsTarget: parseInt(e.target.value) || 0 })}
          style={{ ...iStyle, marginBottom: 8 }} />
        <div style={{ fontSize: 12, color: "var(--text2)" }}>
          → 연간 <strong style={{ color: "var(--gold)" }}>{fmtS(yearSavingGoal)}원</strong> 저축 목표
          {monthlyIncome > 0 && (
            <span style={{ color: "var(--text3)" }}> ({Math.round(monthlySavingTarget / monthlyIncome * 100)}% 저축률)</span>
          )}
        </div>
      </Card>

      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 연간 지출 총 한도 (선택)</div>
        <input type="number" placeholder="예: 36000000" value={plan.yearSpendLimit || ""}
          onChange={e => update("yearSpendLimit", parseInt(e.target.value) || 0)}
          style={iStyle} />
      </Card>

      {/* 가용 예산 요약 */}
      {monthlyIncome > 0 && (
        <div style={{
          borderRadius: 14, padding: "16px",
          background: monthlyAvail >= 0 ? "var(--bg2)" : "var(--redD)",
          border: `1px solid ${monthlyAvail >= 0 ? "var(--border)" : "var(--red)"}`,
        }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 10 }}>■ 월 가용 예산 계산</div>
          {[
            { label: "월 실수령액", value: monthlyIncome, color: "var(--green)", sign: "+" },
            ...(monthlyFixed > 0 ? [{ label: "고정 지출", value: monthlyFixed, color: "var(--text2)", sign: "-" }] : []),
            ...(monthlySavingTarget > 0 ? [{ label: "저축 목표", value: monthlySavingTarget, color: "var(--blue)", sign: "-" }] : []),
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--text2)" }}>{r.sign} {r.label}</span>
              <span style={{ fontWeight: 600, color: r.color }}>{fmtS(r.value)}원</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700 }}>= 변동 지출 예산</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: monthlyAvail >= 0 ? "var(--gold)" : "var(--red)" }}>
              {fmtS(monthlyAvail)}원/월
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// 3. 카테고리 예산 탭
// ────────────────────────────────────────────────
function BudgetTab({ plan, setPlan, tx, budgets, setBudgets, fixed, install }) {
  const [editMode, setEditMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState(null); // { budgets, reasons, tip }
  const [aiError, setAiError]     = useState(null);
  const update = (key, val) => setPlan(p => ({ ...p, [key]: val }));

  const imp = plan.importedAnalysis;

  // 급여는 HomeView와 동일한 plan.salary 활용
  const salary        = plan.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const totalSalary   = (salary.husband || 0) + (salary.wife || 0);
  const savingsTarget = salary.savingsTarget || 0;
  const fixedTotal    = (fixed  || []).reduce((s, f) => s + f.amount,  0);
  const installTotal  = (install|| []).reduce((s, i) => s + i.monthly, 0);
  const monthlyAvail  = Math.max(0, totalSalary - fixedTotal - installTotal - savingsTarget);

  // 최근 3개월 카테고리별 평균 지출
  const now = new Date();
  const catHistory = {};
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    tx.filter(t => t.date.startsWith(ym)).forEach(t => {
      catHistory[t.cat] = (catHistory[t.cat] || 0) + t.amount / 3;
    });
  }

  const runAI = async () => {
    if (!totalSalary) { setAiError("먼저 홈 화면에서 급여를 입력해주세요."); return; }
    setAiLoading(true); setAiError(null); setAiResult(null);
    try {
      const resp = await fetch("/api/budget-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSalary, fixedTotal, installTotal, savingsTarget, catHistory }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "AI 오류");
      setAiResult(data);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const applyAI = () => {
    if (!aiResult?.budgets) return;
    setBudgets(b => ({ ...b, ...aiResult.budgets }));
    setAiResult(null);
  };

  const monthlyIncome      = totalSalary;
  const monthlySavingTarget = savingsTarget;

  const curMonthStr = `${YEAR}-${String(MONTH).padStart(2,"0")}`;
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const diff = monthlyAvail > 0 ? monthlyAvail - totalBudget : null;

  const applyImportSuggestions = () => {
    if (!imp?.catBudgetSuggestions) return;
    const newBudgets = { ...budgets };
    Object.entries(imp.catBudgetSuggestions).forEach(([cat, amt]) => {
      newBudgets[cat] = amt;
    });
    setBudgets(newBudgets);
  };

  return (
    <div>
      {/* 상단 요약 바 */}
      <Card style={{ padding: "14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700 }}>카테고리 예산 합계: </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: diff !== null && diff < 0 ? "var(--red)" : "var(--gold)" }}>
              {fmtS(totalBudget)}원
            </span>
          </div>
          <button onClick={() => setEditMode(!editMode)} style={{
            fontSize: 11, padding: "4px 12px", borderRadius: 8, cursor: "pointer",
            background: editMode ? "var(--goldD)" : "var(--bg3)",
            border: `1px solid ${editMode ? "var(--gold)" : "var(--border)"}`,
            color: editMode ? "var(--gold)" : "var(--text2)",
          }}>{editMode ? "완료" : "수정"}</button>
        </div>

        {monthlyAvail > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>
              <span>예산 사용률</span>
              <span style={{ color: diff !== null && diff < 0 ? "var(--red)" : "var(--green)" }}>
                {diff !== null
                  ? diff >= 0 ? `여유 ${fmtS(diff)}원` : `초과 ${fmtS(-diff)}원`
                  : "수입 미입력"}
              </span>
            </div>
            <Bar pct={monthlyAvail > 0 ? Math.min(totalBudget / monthlyAvail * 100, 120) : 0}
              color={diff !== null && diff < 0 ? "var(--red)" : "var(--gold)"} h={6} />
          </>
        )}
      </Card>

      {/* ── AI 예산 배분 ── */}
      {!aiResult ? (
        <div style={{
          background: "var(--bg3)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>🤖 AI 예산 자동 배분</div>
              <div style={{ fontSize: 10, color: "var(--text2)" }}>
                {totalSalary > 0
                  ? `급여 ${fmtS(totalSalary)}원 기준 · 배분 가능 ${fmtS(monthlyAvail)}원`
                  : "홈 화면에서 급여를 먼저 입력해주세요"}
              </div>
            </div>
            <button onClick={runAI} disabled={aiLoading || !totalSalary} style={{
              padding: "8px 16px", borderRadius: 10, cursor: totalSalary ? "pointer" : "not-allowed",
              fontWeight: 700, fontSize: 12, flexShrink: 0,
              background: totalSalary ? "var(--goldD)" : "var(--bg2)",
              border: `1px solid ${totalSalary ? "var(--gold)" : "var(--border)"}`,
              color: totalSalary ? "var(--gold)" : "var(--text3)",
              opacity: aiLoading ? 0.6 : 1,
            }}>
              {aiLoading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31" strokeDashoffset="10"/>
                  </svg>
                  분석 중…
                </span>
              ) : "추천받기 →"}
            </button>
          </div>
          {aiError && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 8 }}>⚠ {aiError}</div>}
        </div>
      ) : (
        /* AI 결과 카드 */
        <div style={{
          background: "rgba(60,180,100,.06)", border: "1px solid rgba(60,180,100,.25)",
          borderRadius: 14, padding: "14px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🤖 AI 추천 예산</div>
          {aiResult.tip && (
            <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
              "{aiResult.tip}"
            </div>
          )}
          {CATS.map(cat => {
            const ai  = aiResult.budgets?.[cat.id] || 0;
            const cur = budgets[cat.id] || 0;
            const diff = ai - cur;
            return (
              <div key={cat.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 13, width: 20, textAlign: "center" }}>{cat.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{cat.label}</div>
                  {aiResult.reasons?.[cat.id] && (
                    <div style={{ fontSize: 9, color: "var(--text3)" }}>{aiResult.reasons[cat.id]}</div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{fmtS(ai)}원</div>
                  {diff !== 0 && (
                    <div style={{ fontSize: 9, color: diff > 0 ? "var(--green)" : "var(--red)" }}>
                      {diff > 0 ? "▲" : "▼"} {fmtS(Math.abs(diff))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={applyAI} style={{
              flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: "var(--goldD)", border: "1px solid var(--gold)", color: "var(--gold)",
            }}>전체 적용</button>
            <button onClick={() => setAiResult(null)} style={{
              padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontSize: 12,
              background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text2)",
            }}>취소</button>
          </div>
        </div>
      )}

      {/* 임포트 데이터 기반 자동 채우기 */}
      {imp && (
        <button onClick={applyImportSuggestions} style={{
          width: "100%", padding: "11px", borderRadius: 11, marginBottom: 10,
          background: "var(--bg3)", border: "1px solid var(--gold)",
          color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>
          ✨ 카드 데이터 기반 예산 자동 채우기
        </button>
      )}

      {/* 카테고리별 */}
      {CATS.map(cat => {
        const planKey = `monthPlan_${YEAR}_${MONTH}_${cat.id}`;
        const planAmt = plan[planKey] ?? (budgets[cat.id] || 0);
        const spent   = tx.filter(t => t.cat === cat.id && t.date.startsWith(curMonthStr)).reduce((s, t) => s + t.amount, 0);
        const pct     = planAmt > 0 ? Math.round(spent / planAmt * 100) : 0;
        const suggest = imp?.catBudgetSuggestions?.[cat.id];

        return (
          <div key={cat.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
                {pct > 0 && <span style={{ fontSize: 10 }}>{pct > 100 ? "🔴" : pct > 85 ? "🟡" : "🟢"}</span>}
              </div>

              {editMode ? (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {suggest && (
                    <button onClick={() => setBudgets(b => ({ ...b, [cat.id]: suggest }))} style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 6,
                      background: "var(--goldD)", border: "1px solid var(--gold)",
                      color: "var(--gold)", cursor: "pointer",
                    }}>↺ {fmtS(suggest)}</button>
                  )}
                  <input type="number" value={budgets[cat.id] || ""}
                    onChange={e => setBudgets(b => ({ ...b, [cat.id]: parseInt(e.target.value) || 0 }))}
                    style={{ width: 95, background: "var(--bg3)", border: `1px solid ${cat.color}66`, borderRadius: 8, padding: "4px 8px", color: cat.color, fontSize: 12, fontWeight: 700, textAlign: "right", outline: "none" }} />
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  {planAmt > 0 && <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtS(spent)}</span>}
                  <span style={{ fontSize: 10, color: "var(--text2)" }}>/ {fmtS(planAmt || budgets[cat.id] || 0)}원</span>
                  {pct > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: pct > 100 ? "var(--red)" : pct > 85 ? "var(--gold)" : "var(--green)", minWidth: 32, textAlign: "right" }}>{pct}%</span>}
                </div>
              )}
            </div>
            {!editMode && planAmt > 0 && <Bar pct={pct} color={cat.color} h={4} />}
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
// 4. 연간 이벤트 탭
// ────────────────────────────────────────────────
function EventsTab({ plan, setPlan }) {
  const [newEv, setNewEv] = useState({ title: "", amount: "", month: MONTH, cat: "etc" });

  const addEvent = () => {
    if (!newEv.title || !newEv.amount) return;
    setPlan(p => ({ ...p, events: [...(p.events || []), { id: Date.now(), ...newEv, amount: parseInt(newEv.amount) }] }));
    setNewEv({ title: "", amount: "", month: MONTH, cat: "etc" });
  };
  const delEvent = id => setPlan(p => ({ ...p, events: (p.events || []).filter(e => e.id !== id) }));

  const upcoming = [...(plan.events || [])].filter(e => e.month >= MONTH).sort((a, b) => a.month - b.month);
  const past     = [...(plan.events || [])].filter(e => e.month < MONTH).sort((a, b) => a.month - b.month);
  const totalEventAmt = (plan.events || []).reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <Card style={{ padding: "16px", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 새 이벤트 추가</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input value={newEv.title} onChange={e => setNewEv(v => ({ ...v, title: e.target.value }))}
            placeholder="이름 (예: 여름 휴가)" style={{ ...iStyle, flex: 2 }} />
          <input type="number" value={newEv.amount} onChange={e => setNewEv(v => ({ ...v, amount: e.target.value }))}
            placeholder="금액" style={{ ...iStyle, flex: 1, textAlign: "right" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <select value={newEv.month} onChange={e => setNewEv(v => ({ ...v, month: parseInt(e.target.value) }))}
            style={{ ...iStyle, flex: 1 }}>
            {MONTH_NAMES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={newEv.cat} onChange={e => setNewEv(v => ({ ...v, cat: e.target.value }))}
            style={{ ...iStyle, flex: 1 }}>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <button onClick={addEvent} disabled={!newEv.title || !newEv.amount} style={{
          width: "100%", padding: "12px", borderRadius: 11, border: "none",
          background: !newEv.title || !newEv.amount ? "var(--bg3)" : "var(--gold)",
          color: !newEv.title || !newEv.amount ? "var(--text3)" : "#fff",
          fontWeight: 700, fontSize: 14, cursor: !newEv.title || !newEv.amount ? "default" : "pointer",
        }}>추가하기</button>
      </Card>

      {totalEventAmt > 0 && (
        <div style={{ background: "var(--goldD)", border: "1px solid var(--gold)", borderRadius: 11, padding: "11px 14px", marginBottom: 10, fontSize: 12 }}>
          {YEAR}년 예정 큰 지출 합계: <strong style={{ color: "var(--gold)" }}>{fmtS(totalEventAmt)}원</strong>
          <span style={{ color: "var(--text2)", marginLeft: 4 }}>({fmtS(Math.round(totalEventAmt / 12))}원/월 적립 시 도달)</span>
        </div>
      )}

      {/* 예정 이벤트 */}
      {upcoming.length > 0 && (
        <Card style={{ overflow: "hidden", marginBottom: 10 }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 11, color: "var(--text2)" }}>■ 예정 이벤트</div>
          {upcoming.map(e => {
            const c = CAT[e.cat] || CAT.etc;
            return (
              <div key={e.id} style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: c.color + "1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>{MONTH_NAMES[e.month - 1]}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{fmtS(e.amount)}원</div>
                <button onClick={() => delEvent(e.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            );
          })}
        </Card>
      )}

      {/* 지난 이벤트 */}
      {past.length > 0 && (
        <Card style={{ overflow: "hidden", opacity: 0.6 }}>
          <div style={{ padding: "12px 14px 8px", fontSize: 11, color: "var(--text2)" }}>■ 지난 이벤트</div>
          {past.map(e => {
            const c = CAT[e.cat] || CAT.etc;
            return (
              <div key={e.id} style={{ padding: "9px 14px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: c.color + "1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: 12 }}>{MONTH_NAMES[e.month - 1]}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{fmtS(e.amount)}원</div>
                <button onClick={() => delEvent(e.id)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            );
          })}
        </Card>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 12, padding: "30px 0" }}>
          연간 큰 지출(여행, 가전, 경조사 등)을 미리 등록해두면<br/>월별 적립 계획을 짜기 쉬워요
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// 5. 플랜 요약 탭
// ────────────────────────────────────────────────
function SummaryTab({ plan, tx, budgets, fixed, install }) {
  const imp                 = plan.importedAnalysis;
  const salary              = plan.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const monthlyIncome       = (salary.husband || 0) + (salary.wife || 0);
  const monthlySavingTarget = salary.savingsTarget || 0;
  const yearSavingGoal      = monthlySavingTarget * 12;

  // 고정비 계산 (FixedView 데이터 활용)
  const monthlyFixed = (fixed || []).reduce((s, f) => s + (f.amount || 0), 0)
    + (install || []).filter(i => !i.paid).reduce((s, i) => s + Math.round((i.totalAmount || 0) / (i.months || 1)), 0);

  const totalBudget   = Object.values(budgets).reduce((s, v) => s + v, 0);
  const yearActualSpent = tx.filter(t => t.date.startsWith(`${YEAR}`)).reduce((s, t) => s + t.amount, 0);
  const totalEventAmt = (plan.events || []).reduce((s, e) => s + e.amount, 0);

  const monthlyTotal = totalBudget + monthlyFixed + monthlySavingTarget;
  const balance = monthlyIncome - monthlyTotal;
  const savingRate = monthlyIncome > 0 ? Math.round(monthlySavingTarget / monthlyIncome * 100) : 0;
  const yearProjected = DAY > 0 ? Math.round(yearActualSpent / (MONTH * 30 + DAY) * 365) : 0;

  // 건강 점수 (0~100)
  const healthScore = Math.min(100, Math.max(0, Math.round(
    (savingRate >= 20 ? 35 : savingRate >= 10 ? 20 : 5) +
    (balance >= 0 ? 35 : 10) +
    ((plan.events || []).length > 0 ? 15 : 0) +
    (imp ? 15 : 0)
  )));

  const healthLabel = healthScore >= 80 ? { text: "매우 건전", color: "var(--green)" }
    : healthScore >= 60 ? { text: "양호", color: "var(--gold)" }
    : healthScore >= 40 ? { text: "보통", color: "var(--text2)" }
    : { text: "개선 필요", color: "var(--red)" };

  // 조언
  const tips = [];
  if (savingRate < 10) tips.push({ icon: "💰", msg: "저축률이 10% 미만이에요. 월 지출을 줄이거나 저축 목표를 세워보세요." });
  if (savingRate >= 20) tips.push({ icon: "🎉", msg: `저축률 ${savingRate}%! 매우 훌륭한 재무 습관이에요.` });
  if (balance < 0) tips.push({ icon: "⚠️", msg: `월 ${fmtS(-balance)}원 예산이 초과돼요. 카테고리 예산을 조정해보세요.` });
  if ((plan.events || []).length === 0) tips.push({ icon: "📌", msg: "연간 이벤트 탭에서 여행·경조사 등 큰 지출을 미리 등록해두세요." });
  if (!imp) tips.push({ icon: "📂", msg: "카드 데이터를 업로드하면 더 정확한 예산 계획을 세울 수 있어요." });
  if (yearProjected > 0 && plan.yearSpendLimit > 0 && yearProjected > plan.yearSpendLimit)
    tips.push({ icon: "🚨", msg: `현재 지출 속도로는 연말 ${fmtS(yearProjected)}원 예상 → 한도(${fmtS(plan.yearSpendLimit)}원) 초과 위험` });

  return (
    <div>
      {/* 재무 건강 점수 */}
      <Card style={{ padding: "18px", marginBottom: 10, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ {YEAR}년 재무 건강 점수</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: healthLabel.color, lineHeight: 1 }}>{healthScore}</div>
        <div style={{ fontSize: 14, color: healthLabel.color, fontWeight: 700, marginTop: 4, marginBottom: 14 }}>{healthLabel.text}</div>
        <div style={{ height: 8, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${healthScore}%`, background: healthLabel.color, borderRadius: 4, transition: "width .8s ease" }} />
        </div>
      </Card>

      {/* 월간 현금 흐름 */}
      {monthlyIncome > 0 && (
        <Card style={{ padding: "16px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 월간 현금 흐름 계획</div>
          {[
            { label: "+ 월 실수령액",  value: monthlyIncome,       color: "var(--green)" },
            { label: "− 고정 지출",    value: monthlyFixed,        color: "var(--text2)" },
            { label: "− 변동 예산",    value: totalBudget,         color: "var(--blue)"  },
            { label: "− 저축 목표",    value: monthlySavingTarget, color: "var(--gold)"  },
          ].filter(r => r.value > 0).map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: "var(--text2)" }}>{r.label}</span>
              <span style={{ fontWeight: 600, color: r.color }}>{fmtS(r.value)}원</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>= 월 잉여/부족</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: balance >= 0 ? "var(--green)" : "var(--red)" }}>
              {balance >= 0 ? "+" : ""}{fmtS(balance)}원
            </span>
          </div>
        </Card>
      )}

      {/* 연간 목표 달성률 */}
      {yearSavingGoal > 0 && (
        <Card style={{ padding: "16px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 연간 저축 목표 진행도</div>
          {(() => {
            const yearIncome    = monthlyIncome * 12;
            const actualSaving  = Math.max(0, yearIncome - yearActualSpent);
            const pct           = yearSavingGoal > 0 ? Math.round(actualSaving / yearSavingGoal * 100) : 0;
            return (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13 }}>{fmtS(actualSaving)}원 / {fmtS(yearSavingGoal)}원</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? "var(--green)" : "var(--gold)" }}>{pct}%</span>
                </div>
                <Bar pct={pct} color={pct >= 100 ? "var(--green)" : "var(--gold)"} h={8} />
              </>
            );
          })()}
        </Card>
      )}

      {/* 이벤트 예산 */}
      {totalEventAmt > 0 && (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px", marginBottom: 10, fontSize: 12 }}>
          연간 이벤트 합계: <strong>{fmtS(totalEventAmt)}원</strong>
          <span style={{ color: "var(--text2)", marginLeft: 6 }}>→ 지금부터 월 {fmtS(Math.round(totalEventAmt / Math.max(12 - MONTH + 1, 1)))}원 적립 필요</span>
        </div>
      )}

      {/* 조언 */}
      {tips.length > 0 && (
        <Card style={{ padding: "14px", overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 개선 포인트</div>
          {tips.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < tips.length - 1 ? 10 : 0, paddingBottom: i < tips.length - 1 ? 10 : 0, borderBottom: i < tips.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{t.icon}</span>
              <span style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{t.msg}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// 메인 PlanView
// ────────────────────────────────────────────────
export function PlanView({ plan, setPlan, tx, budgets, setBudgets, fixed, install, onGoToImport }) {
  const [tab, setTab] = useState("baseline");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

      {/* 탭 네비 */}
      <div style={{ display: "flex", gap: 4, padding: "14px 16px 0", background: "var(--bg)", flexShrink: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: "9px 11px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 10,
            background: tab === t.id ? "var(--goldD)" : "var(--bg2)",
            border: `1px solid ${tab === t.id ? "var(--gold)" : "var(--border)"}`,
            color: tab === t.id ? "var(--gold)" : "var(--text2)",
            transition: "all .15s",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
          <div style={{ padding: "18px 0 12px" }}>
            <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".08em", marginBottom: 2 }}>{YEAR}년 재무 계획</div>
            <div className="serif" style={{ fontSize: 20 }}>
              {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
            </div>
          </div>

          {tab === "baseline" && <BaselineTab plan={plan} onGoToImport={onGoToImport} />}
          {tab === "income"   && <IncomeTab   plan={plan} setPlan={setPlan} />}
          {tab === "budget"   && <BudgetTab   plan={plan} setPlan={setPlan} tx={tx} budgets={budgets} setBudgets={setBudgets} fixed={fixed} install={install} />}
          {tab === "events"   && <EventsTab   plan={plan} setPlan={setPlan} />}
          {tab === "summary"  && <SummaryTab  plan={plan} tx={tx} budgets={budgets} fixed={fixed} install={install} />}
        </div>
      </div>
    </div>
  );
}
