import { useState } from "react";
import { Card, SectionHeader, Bar, Chip } from "../components/UI";
import { CAT, CATS } from "../constants";
import { fmt, fmtS } from "../utils/helpers";
import { CardView } from "./CardView";
import { SimulatorView } from "./SimulatorView";

export function FixedView({ fixed, setFixed, install, setInstall, cards, setCards, tx, names }) {
  const [tab, setTab] = useState("fixed");
  const [showAdd, setShowAdd] = useState(false);
  const [newF, setNewF] = useState({ name: "", amount: "", cat: "housing", day: 1 });
  const [newI, setNewI] = useState({ name: "", total: "", month: 3, cardId: cards[0]?.id || "", date: "" });

  const addF = () => {
    if (!newF.name || !newF.amount) return;
    setFixed(p => [...p, { ...newF, id: Date.now(), amount: parseInt(newF.amount) }]);
    setShowAdd(false); setNewF({ name: "", amount: "", cat: "housing", day: 1 });
  };
  const delF = id => setFixed(p => p.filter(f => f.id !== id));

  const addI = () => {
    if (!newI.name || !newI.total || !newI.date) return;
    setInstall(p => [...p, { ...newI, id: Date.now(), total: parseInt(newI.total), monthly: Math.round(newI.total / newI.month) }]);
    setShowAdd(false); setNewI({ name: "", total: "", month: 3, cardId: cards[0]?.id || "", date: "" });
  };
  const delI = id => setInstall(p => p.filter(i => i.id !== id));

  const fTotal = fixed.reduce((s, f) => s + f.amount, 0);
  const iTotal = install.reduce((s, i) => s + i.monthly, 0);

  const iStyle = {
    width: "100%", background: "var(--bg4)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "10px 13px", color: "var(--text)", fontSize: 13, outline: "none"
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 6, padding: "14px 16px 0", background: "var(--bg)", flexShrink: 0 }}>
        {[{ id: "fixed", l: "📌 고정비/할부" }, { id: "cards", l: "💳 카드" }, { id: "simulator", l: "📈 시뮬레이터" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 6px", borderRadius: 12, cursor: "pointer",
            fontWeight: 700, fontSize: 11,
            background: tab === t.id ? "var(--goldD)" : "var(--bg2)",
            border: `1px solid ${tab === t.id ? "var(--gold)" : "var(--border)"}`,
            color: tab === t.id ? "var(--gold)" : "var(--text2)",
            transition: "all .15s"
          }}>{t.l}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab === "fixed" && (
          <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
            <div className="u1" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 10 }}>
              <SectionHeader sub="Recurring Costs" title="고정비 및 할부" />
              <button onClick={() => setShowAdd(!showAdd)} style={{
                fontSize: 12, fontWeight: 700, background: showAdd ? "var(--bg3)" : "var(--blue)",
                color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", marginBottom: 14
              }}>{showAdd ? "닫기" : "+ 항목 추가"}</button>
            </div>

            {showAdd && (
              <Card className="u2" style={{ padding: "20px", marginBottom: 16, border: "1px solid var(--blue)" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {[{ id: "f", l: "고정 정기지출" }, { id: "i", l: "카드 할부" }].map(t => (
                    <button key={t.id} onClick={() => setNewF({ ...newF, type: t.id })} style={{ flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: (newF.type || "f") === t.id ? "var(--blueD)" : "var(--bg4)", color: (newF.type || "f") === t.id ? "var(--blue)" : "var(--text2)", border: `1px solid ${(newF.type || "f") === t.id ? "var(--blue)" : "var(--border)"}` }}>{t.l}</button>
                  ))}
                </div>

                {(newF.type || "f") === "f" ? (
                  <div>
                    <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>항목명</div><input value={newF.name} onChange={e => setNewF({ ...newF, name: e.target.value })} placeholder="예: 아파트 관리비" style={iStyle} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>월 금액</div><input type="number" value={newF.amount} onChange={e => setNewF({ ...newF, amount: e.target.value })} style={{ ...iStyle, textAlign: "right" }} /></div>
                      <div><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>출금일</div><input type="number" value={newF.day} onChange={e => setNewF({ ...newF, day: parseInt(e.target.value) || 1 })} style={{ ...iStyle, textAlign: "right" }} /></div>
                    </div>
                    <button onClick={addF} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 14 }}>고정비 등록</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>할부 항목</div><input value={newI.name} onChange={e => setNewI({ ...newI, name: e.target.value })} placeholder="예: 맥북 프로 맥스" style={iStyle} /></div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 12, marginBottom: 14 }}>
                      <div><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>총 결제 금액</div><input type="number" value={newI.total} onChange={e => setNewI({ ...newI, total: e.target.value })} style={{ ...iStyle, textAlign: "right" }} /></div>
                      <div><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>개월 수</div><input type="number" value={newI.month} onChange={e => setNewI({ ...newI, month: parseInt(e.target.value) || 1 })} style={{ ...iStyle, textAlign: "right" }} /></div>
                    </div>
                    <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>결제 카드</div><select value={newI.cardId} onChange={e => setNewI({ ...newI, cardId: e.target.value })} style={iStyle}>{cards.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                    <div style={{ marginBottom: 16 }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>최초 결제일</div><input type="date" value={newI.date} onChange={e => setNewI({ ...newI, date: e.target.value })} style={iStyle} /></div>
                    <button onClick={addI} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 14 }}>할부 등록</button>
                  </div>
                )}
              </Card>
            )}

            <Card className="u2" style={{ padding: "18px", marginBottom: 14, display: "flex", gap: 18, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--blueD)", color: "var(--blue)", display: "flex", alignItems: "center", justifyCenter: "center", fontSize: 24, justifyContent: "center" }}>📌</div>
              <div><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 2 }}>월 정기 지출 합계</div><div style={{ fontSize: 22, fontWeight: 700, color: "var(--blue)" }}>{fmt(fTotal + iTotal)}</div></div>
            </Card>

            <div className="u3" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", marginBottom: 10, display: "flex", justifyContent: "space-between" }}><span>고정 정기지출</span><span>{fmtS(fTotal)}원</span></div>
            {fixed.map(f => {
              const c = CAT[f.cat] || CATS[8];
              return (
                <Card key={f.id} className="u3" style={{ padding: "11px 15px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: c.color + "1a", display: "flex", alignItems: "center", justifyCenter: "center", fontSize: 16, flexShrink: 0, justifyContent: "center" }}>{c.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 10, color: "var(--text2)" }}>매달 {f.day}일 정기 지출</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 14, fontWeight: 700 }}>{fmtS(f.amount)}원</div><button onClick={() => delF(f.id)} style={{ fontSize: 10, color: "var(--red)", background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>삭제</button></div>
                </Card>
              );
            })}

            <div className="u4" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", margin: "24px 0 10px", display: "flex", justifyContent: "space-between" }}><span>할부 관리</span><span>{fmtS(iTotal)}원/월</span></div>
            {install.map(i => {
              const card = cards.find(c => c.id === i.cardId);
              return (
                <Card key={i.id} className="u4" style={{ padding: "14px 15px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div><div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{i.name}</div><div style={{ fontSize: 10, color: "var(--text2)" }}>{card?.name || "카드"} · {i.month}개월 · {i.date}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: 15, fontWeight: 700, color: "var(--pink)" }}>{fmtS(i.monthly)}원</div><div style={{ fontSize: 9, color: "var(--text3)" }}>총 {fmtS(i.total)}원</div></div>
                  </div>
                  <button onClick={() => delI(i.id)} style={{ width: "100%", fontSize: 10, color: "var(--text3)", background: "var(--track)", border: "none", borderRadius: 6, padding: "4px", cursor: "pointer" }}>항목 삭제</button>
                </Card>
              );
            })}
          </div>
        )}
        {tab === "cards" && <CardView cards={cards} setCards={setCards} />}
        {tab === "simulator" && <SimulatorView sliderCfg={sliderCfg || {}} />}
      </div>
    </div>
  );
}
