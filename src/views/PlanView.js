import { useState } from "react";
import { Card, Bar } from "../components/UI";
import { CAT, CATS, MONTH, YEAR, MONTH_NAMES } from "../constants";
import { fmtS } from "../utils/helpers";

export function PlanView({plan, setPlan, tx, budgets}) {
  const [editSection, setEditSection] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({title:"", amount:"", month:MONTH, cat:"etc"});

  const yearTx       = tx.filter(t => t.date.startsWith(`${YEAR}`));
  const yearSpent    = yearTx.reduce((s,t) => s+t.amount, 0);
  const yearSavingGoal = plan.yearSavingGoal || 0;
  const yearIncome   = plan.yearIncome || 0;
  const yearActualSaving = Math.max(0, yearIncome - yearSpent);
  const savingPct    = yearSavingGoal > 0 ? Math.round(yearActualSaving / yearSavingGoal * 100) : 0;

  const yearSpendLimit = plan.yearSpendLimit || 0;
  const spendPct     = yearSpendLimit > 0 ? Math.round(yearSpent / yearSpendLimit * 100) : 0;
  const yearProjected = DAY > 0 ? Math.round(yearSpent / (MONTH*30+DAY) * 365) : 0;

  const monthlySpent = Array.from({length:12}, (_,i) => {
    const prefix = `${YEAR}-${String(i+1).padStart(2,"0")}`;
    return tx.filter(t=>t.date.startsWith(prefix)).reduce((s,t)=>s+t.amount,0);
  });

  const iStyle = {
    width:"100%", background:"var(--bg4)", border:"1px solid var(--border)",
    borderRadius:10, padding:"10px 13px", color:"var(--text)", fontSize:13, outline:"none"
  };
  const numStyle = {...iStyle, textAlign:"right"};

  const updatePlan = (key, val) => setPlan(p => ({...p, [key]: val}));

  const addEvent = () => {
    if (!newEvent.title || !newEvent.amount) return;
    setPlan(p => ({...p, events:[...(p.events||[]),{id:Date.now(),...newEvent,amount:parseInt(newEvent.amount)}]}));
    setNewEvent({title:"",amount:"",month:MONTH,cat:"etc"});
    setShowAddEvent(false);
  };
  const delEvent = id => setPlan(p => ({...p, events:(p.events||[]).filter(e=>e.id!==id)}));

  const upcomingEvents = [...(plan.events||[])].filter(e=>e.month >= MONTH).sort((a,b)=>a.month-b.month);
  const pastEvents     = [...(plan.events||[])].filter(e=>e.month < MONTH).sort((a,b)=>a.month-b.month);

  return (
    <div style={{padding:"0 16px 96px", overflowY:"auto", height:"100%"}}>
      <div className="u1" style={{padding:"22px 0 14px"}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>Annual & Monthly Plan</div>
        <div className="serif" style={{fontSize:21}}>{YEAR}년 재무 계획</div>
      </div>

      <Card className="u2" style={{padding:"18px",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em"}}>■ 연간 재무 목표</div>
          <button onClick={()=>setEditSection(editSection==="annual"?null:"annual")} style={{
            fontSize:11,color:"var(--gold)",background:"var(--goldD)",border:"1px solid var(--gold)",
            borderRadius:7,padding:"3px 10px",cursor:"pointer"
          }}>{editSection==="annual"?"완료":"수정"}</button>
        </div>

        {editSection==="annual" ? (
          <div>
            {[
              {label:"연간 예상 수입", key:"yearIncome",    placeholder:"예: 84000000"},
              {label:"연간 저축 목표", key:"yearSavingGoal",placeholder:"예: 36000000"},
              {label:"연간 지출 한도", key:"yearSpendLimit",placeholder:"예: 48000000"},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <div style={{fontSize:11,color:"var(--text2)",marginBottom:5}}>{f.label}</div>
                <input type="number" placeholder={f.placeholder}
                  value={plan[f.key]||""}
                  onChange={e=>updatePlan(f.key, parseInt(e.target.value)||0)}
                  style={numStyle}/>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:16}}>💰</span>
                  <span style={{fontSize:13,fontWeight:600}}>연간 저축 목표</span>
                </div>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:"var(--green)"}}>{fmtS(yearActualSaving)}원</span>
                  <span style={{fontSize:11,color:"var(--text2)"}}> / {fmtS(yearSavingGoal)}원</span>
                </div>
              </div>
              {yearSavingGoal > 0 ? (
                <>
                  <Bar pct={savingPct} color="var(--green)" h={8}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                    <span style={{fontSize:11,color:"var(--text2)"}}>달성률 {savingPct}%</span>
                    <span style={{fontSize:11,color:savingPct>=100?"var(--green)":"var(--text2)"}}>
                      {savingPct>=100 ? "🎉 목표 달성!" : `${fmtS(yearSavingGoal-yearActualSaving)}원 남음`}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{fontSize:11,color:"var(--text3)",textAlign:"center",padding:"8px 0"}}>수정 버튼을 눌러 목표를 설정하세요</div>
              )}
            </div>

            <div style={{paddingTop:14,borderTop:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:16}}>📉</span>
                  <span style={{fontSize:13,fontWeight:600}}>연간 지출 한도</span>
                </div>
                <div>
                  <span style={{fontSize:14,fontWeight:700,color:spendPct>100?"var(--red)":"var(--text)"}}>{fmtS(yearSpent)}원</span>
                  <span style={{fontSize:11,color:"var(--text2)"}}> / {fmtS(yearSpendLimit)}원</span>
                </div>
              </div>
              {yearSpendLimit > 0 ? (
                <>
                  <Bar pct={spendPct} color="var(--blue)" h={8}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                    <span style={{fontSize:11,color:"var(--text2)"}}>집행률 {spendPct}%</span>
                    <span style={{fontSize:11,color:yearProjected>yearSpendLimit?"var(--red)":"var(--green)"}}>
                      연말 예상 {fmtS(yearProjected)}원 {yearProjected>yearSpendLimit?"⚠️ 한도 초과 예상":"✓"}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{fontSize:11,color:"var(--text3)",textAlign:"center",padding:"8px 0"}}>수정 버튼을 눌러 한도를 설정하세요</div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="u3" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:14}}>■ {YEAR}년 월별 지출 현황</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>
          {MONTH_NAMES.map((m,i)=>{
            const spent  = monthlySpent[i];
            const mBudget= Object.values(budgets).reduce((s,v)=>s+v,0);
            const pct    = mBudget>0 ? Math.min(spent/mBudget*100, 100) : 0;
            const isCur  = i+1 === MONTH;
            const isFuture = i+1 > MONTH;
            const hasEvents = (plan.events||[]).some(e=>e.month===i+1);
            return (
              <div key={m} style={{textAlign:"center"}}>
                <div style={{
                  height:60, background:"var(--bg3)", borderRadius:8, overflow:"hidden",
                  position:"relative", marginBottom:4,
                  border:`1px solid ${isCur?"var(--gold)":"var(--border)"}`
                }}>
                  {!isFuture && spent>0 && (
                    <div style={{
                      position:"absolute", bottom:0, left:0, right:0,
                      height:`${pct}%`,
                      background:pct>=100?"var(--red)":isCur?"var(--gold)":"var(--blue)",
                      opacity:isFuture?0.3:1,
                      transition:"height .6s ease"
                    }}/>
                  )}
                  {hasEvents && (
                    <div style={{position:"absolute",top:3,right:3,fontSize:8}}>📌</div>
                  )}
                </div>
                <div style={{fontSize:9,color:isCur?"var(--gold)":"var(--text2)",fontWeight:isCur?700:400}}>{m}</div>
                {!isFuture && spent>0 && (
                  <div style={{fontSize:8,color:"var(--text3)"}}>{fmtS(spent)}</div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      
      <Card className="u4" style={{padding:"18px",marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em"}}>■ {MONTH}월 카테고리별 플래닝</div>
          <button onClick={()=>setEditSection(editSection==="month"?null:"month")} style={{
            fontSize:11,color:"var(--blue)",background:"var(--blueD)",border:"1px solid var(--blue)",
            borderRadius:7,padding:"3px 10px",cursor:"pointer"
          }}>{editSection==="month"?"완료":"조정"}</button>
        </div>
        
        {CATS.map(cat=>{
          const planKey  = `monthPlan_${YEAR}_${MONTH}_${cat.id}`;
          const planAmt  = plan[planKey] ?? (budgets[cat.id]||0);
          const spent    = tx.filter(t=>t.cat===cat.id&&t.date.startsWith(`${YEAR}-${String(MONTH).padStart(2,"0")}`)).reduce((s,t)=>s+t.amount,0);
          const pct      = planAmt > 0 ? Math.round(spent/planAmt*100) : 0;
          if(!planAmt && !spent) return null;
          return (
            <div key={cat.id} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:14}}>{cat.icon}</span>
                  <span style={{fontSize:12,fontWeight:500}}>{cat.label}</span>
                  <span style={{fontSize:11}}>{pct>100?"🔴":pct>85?"🟡":"🟢"}</span>
                </div>
                {editSection==="month" ? (
                  <input type="number" value={planAmt||""}
                    onChange={e=>updatePlan(planKey, parseInt(e.target.value)||0)}
                    style={{width:90,background:"var(--bg4)",border:`1px solid ${cat.color}66`,
                      borderRadius:8,padding:"4px 8px",color:cat.color,fontSize:12,
                      fontWeight:700,textAlign:"right",outline:"none"}}/>
                ) : (
                  <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                    <span style={{fontSize:12,fontWeight:700}}>{fmtS(spent)}</span>
                    <span style={{fontSize:10,color:"var(--text2)"}}>/ {fmtS(planAmt)}원</span>
                    <span style={{fontSize:11,fontWeight:700,color:pct>100?"var(--red)":pct>85?"var(--gold)":"var(--green)",minWidth:32,textAlign:"right"}}>{pct}%</span>
                  </div>
                )}
              </div>
              {editSection!=="month" && <Bar pct={pct} color={cat.color} h={4}/>}
            </div>
          );
        })}
      </Card>
      
      <Card className="u5" style={{overflow:"hidden",marginBottom:10}}>
        <div style={{padding:"14px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em"}}>■ 큰 지출 이벤트 예고</div>
          <span style={{fontSize:11,color:"var(--text2)"}}>{(plan.events||[]).length}개</span>
        </div>
        {upcomingEvents.length===0 && pastEvents.length===0 ? (
          <div style={{padding:"20px",textAlign:"center",color:"var(--text3)",fontSize:12}}>
            예정된 큰 지출을 미리 등록해두세요
          </div>
        ) : (
          upcomingEvents.map(e=>{
            const c = CAT[e.cat]||CATS[8];
            return (
              <div key={e.id} style={{
                padding:"11px 15px",borderTop:"1px solid var(--border)",
                display:"flex",alignItems:"center",gap:10
              }}>
                <div style={{
                  width:36,height:36,borderRadius:10,flexShrink:0,
                  background:c.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16
                }}>{c.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{e.title}</div>
                  <div style={{fontSize:10,color:"var(--text2)"}}>{MONTH_NAMES[e.month-1]} · {c.label}</div>
                </div>
                <div style={{textAlign:"right",marginRight:6}}>
                  <div style={{fontSize:14,fontWeight:700}}>{fmtS(e.amount)}원</div>
                </div>
                <button onClick={()=>delEvent(e.id)} style={{
                  width:24,height:24,borderRadius:6,border:"none",cursor:"pointer",
                  background:"transparent",color:"var(--text3)",fontSize:12,flexShrink:0
                }}>✕</button>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
