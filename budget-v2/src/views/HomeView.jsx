import { useState, useMemo } from "react";
import { Card, Ring, Chip, SectionHeader } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { CAT, CATS, getYear, getMonth, getDay, getDaysInMonth } from "../constants";
import { fmtS } from "../utils/helpers";
import { TxEditModal } from "../components/TxEditModal";

export function HomeView({tx,budgets,fixed,install,names,onAdd,sliderCfg,onWidget,plan,setPlan,cards,onEdit,onDelete, onSettings}){
  const [isTotalMode, setIsTotalMode] = useState(true);
  const YEAR  = getYear();
  const MONTH = getMonth();
  const DAY   = getDay();
  const DAYS  = getDaysInMonth(YEAR, MONTH);

  const totalBudget  = Object.values(budgets).reduce((s,v)=>s+v,0);
  const fixedTotal   = (fixed || []).reduce((s,f)=>s+f.amount,0);
  const installTotal = (install || []).reduce((s,i)=>s+i.monthly,0);

  const curMonthPrefix = `${YEAR}-${String(MONTH).padStart(2,"0")}`;
  const thisMonthTx     = useMemo(() => tx.filter(t => t.date.startsWith(curMonthPrefix)), [tx, curMonthPrefix]);

  const variableSpent = useMemo(() => thisMonthTx.reduce((s,t)=>s+t.amount, 0), [thisMonthTx]);
  const totalSpent = variableSpent + fixedTotal + installTotal;
  const totalBudgetAll = totalBudget + fixedTotal + installTotal;
  
  const hSpent = useMemo(() => thisMonthTx.filter(t=>t.who==="husband").reduce((s,t)=>s+t.amount, 0), [thisMonthTx]);
  const wSpent = useMemo(() => thisMonthTx.filter(t=>t.who==="wife").reduce((s,t)=>s+t.amount, 0), [thisMonthTx]);
  
  const thisMonthCardSpend = useMemo(
    () => thisMonthTx.filter(t => (t.payMethod==="card" || t.payMethod==="credit")).reduce((s,t)=>s+t.amount, 0),
    [thisMonthTx]
  );

  const pct          = totalBudgetAll > 0 ? Math.round(totalSpent/totalBudgetAll*100) : 0;
  const paceTarget   = Math.round(DAY/DAYS*totalBudget);
  const pacePct      = paceTarget>0?Math.round(variableSpent/paceTarget*100):0;
  const remaining    = totalBudget-variableSpent;
  const daysLeft     = Math.max(DAYS - DAY, 1);
  const defaultPaceVal = Math.min(Math.round(remaining / daysLeft), sliderCfg.paceMaxDaily);

  const [paceDaily, setPaceDaily] = useState(Math.max(0, defaultPaceVal));
  const paceMax     = sliderCfg.paceMaxDaily;
  const projected   = variableSpent + paceDaily * daysLeft;
  const projOver    = projected > totalBudget;
  const paceColor   = pacePct <= 90 ? "var(--green)" : pacePct <= 110 ? "#d4b84a" : "var(--red)";
  const paceStatus  = pacePct <= 90 ? "양호 ✓" : pacePct <= 110 ? "보통" : "주의";
  const fillColor    = projOver ? "var(--red)" : "var(--green)";

  const currentPaceDaily  = DAY > 0 ? Math.round(variableSpent / DAY) : 0;
  const projectedAtPace   = variableSpent + currentPaceDaily * daysLeft;
  
  // ── 급여 & 카드 한도 (utilizationTarget 반영) ──
  const salary = plan?.salary || { husband: 0, wife: 0, savingsTarget: 0 };
  const utilTarget = plan?.utilizationTarget || 100;
  const totalSalary    = (salary.husband || 0) + (salary.wife || 0);
  const savingsTarget  = salary.savingsTarget || 0;
  const committed      = fixedTotal + installTotal;
  
  const monthlyAvailRaw = totalSalary - committed - savingsTarget;
  const cardLimit       = Math.max(Math.round(monthlyAvailRaw * utilTarget / 100), 0);
  
  const cardUsedPct    = cardLimit > 0 ? Math.min(Math.round(variableSpent / cardLimit * 100), 100) : 0;
  const cardLeft       = cardLimit - variableSpent;
  const cardLimitOk    = cardLeft >= 0;

  const estimatedSavings = totalSalary - committed - projectedAtPace;
  const hasData          = thisMonthTx.length > 0;
  const savingsRate      = totalSalary > 0 ? Math.round(estimatedSavings / totalSalary * 100) : 0;
  const savingsRateColor = totalSalary === 0 || !hasData ? "var(--text3)" : (savingsRate >= 20 ? "var(--green)" : savingsRate >= 10 ? "var(--gold)" : "var(--red)");
  const savingsRateLabel = totalSalary === 0 ? "급여 미설정" : (!hasData ? "데이터 부족" : (savingsRate >= 20 ? "우수 (예상)" : savingsRate >= 10 ? "양호 (예상)" : savingsRate >= 0 ? "주의 ⚠" : "적자 ⚠"));

  const paceProgressPct   = totalBudget > 0 ? Math.min(Math.round(projectedAtPace / totalBudget * 100), 130) : 0;
  const remainingAtPace    = totalBudget - projectedAtPace;
  const isOnTrack          = remainingAtPace >= 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [editItem, setEditItem] = useState(null);

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1" style={{padding:"20px 0 10px", display:"flex", flexDirection:"column", gap:14}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:"var(--text2)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:2}}>{YEAR}년 {MONTH}월 · {DAY}일차</div>
            <div className="serif" style={{fontSize:20}}>{isTotalMode ? "가계 종합 현황" : "생활비 집중 관리"}</div>
          </div>
          <div style={{display:"flex", background:"var(--bg3)", borderRadius:12, padding:4, border:"1px solid var(--border)"}}>
            <button onClick={()=>setIsTotalMode(true)} style={{padding:"6px 12px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer", border:"none", background:isTotalMode?"var(--gold)":"none", color:isTotalMode?"#fff":"var(--text2)", transition:"all .2s"}}>🏢 종합</button>
            <button onClick={()=>setIsTotalMode(false)} style={{padding:"6px 12px", borderRadius:9, fontSize:11, fontWeight:700, cursor:"pointer", border:"none", background:!isTotalMode?"var(--blue)":"none", color:!isTotalMode?"#fff":"var(--text2)", transition:"all .2s"}}>🛒 생활비</button>
          </div>
        </div>
        
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(255,255,255,0.03)", borderRadius:14, padding:"12px 16px", border:"1px solid var(--border)"}}>
          <div style={{fontSize:11, color:"var(--text2)"}}>{isTotalMode ? "🏢 전체 예산 대비 집행률" : "🛒 순수 변동비 집행률"}</div>
          <div style={{fontSize:15, fontWeight:800, color: remaining >= 0 ? "var(--green)" : "var(--red)"}}>{fmtS(isTotalMode ? totalBudgetAll - totalSpent : remaining)}원 남음</div>
        </div>
      </div>

      <Card className="u2" style={{padding:"20px", marginBottom:10, overflow:"hidden", position:"relative"}}>
        <div style={{position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:isTotalMode?"radial-gradient(circle,var(--goldD) 0%,transparent 70%)":"radial-gradient(circle,var(--blueD) 0%,transparent 70%)", pointerEvents:"none", opacity:0.6}}/>
        <div style={{display:"flex", gap:20, alignItems:"center", marginBottom:16}}>
          <div style={{position:"relative", width:200, height:130, display:"flex", alignItems:"center", justifyContent:"flex-end", flexShrink:0}}>
            <div style={{position:"relative", width:130, height:130, display:"flex", alignItems:"center", justifyContent:"center"}}>
              {isTotalMode ? (
                <>
                  <Ring pct={pct} size={120} stroke={12} color="var(--gold)" />
                  <div style={{position:"absolute", top:25, right:112, transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap", pointerEvents:"none"}}>
                    <div style={{fontSize:10, fontWeight:800, color:"var(--gold)", letterSpacing:"-.02em"}}>가계 전체</div>
                    <div style={{width:20, height:1, background:"var(--gold)", opacity:0.5}} />
                    <div style={{width:5, height:5, borderRadius:"50%", background:"var(--gold)", boxShadow:"0 0 4px var(--gold)"}} />
                  </div>
                </>
              ) : (
                <>
                  <Ring pct={totalBudget>0?Math.round(variableSpent/totalBudget*100):0} size={120} stroke={12} color="var(--blue)" />
                  <div style={{position:"absolute", top:105, right:104, transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:4, whiteSpace:"nowrap", pointerEvents:"none"}}>
                    <div style={{fontSize:10, fontWeight:800, color:"var(--blue)", letterSpacing:"-.02em"}}>생활비 전용</div>
                    <div style={{width:14, height:1, background:"var(--blue)", opacity:0.5}} />
                    <div style={{width:5, height:5, borderRadius:"50%", background:"var(--blue)", boxShadow:"0 0 4px var(--blue)"}} />
                  </div>
                </>
              )}
              <div style={{position:"absolute", textAlign:"center"}}>
                <div style={{fontSize:24, fontWeight:800, color:isTotalMode?"var(--gold)":"var(--blue)"}}>{isTotalMode ? pct : (totalBudget>0?Math.round(variableSpent/totalBudget*100):0)}%</div>
                <div style={{fontSize:9, color:"var(--text3)", textTransform:"uppercase"}}>{isTotalMode ? "Total" : "Life"}</div>
              </div>
            </div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:2}}>{isTotalMode ? "총 누적 지출" : "순수 생활비 지출"}</div>
            <div style={{fontSize:22,fontWeight:800,letterSpacing:"-.02em", color:isTotalMode?"var(--gold)":"var(--blue)"}}>{fmtS(isTotalMode ? totalSpent : variableSpent)}<span style={{fontSize:13,color:"var(--text3)",marginLeft:2}}>원</span></div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>/ {fmtS(isTotalMode ? totalBudgetAll : totalBudget)}원</div>
          </div>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginTop:4, borderTop:"1px solid var(--border)", paddingTop:12}}>
          <div><div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>📌 고정비</div><div style={{fontSize:12,fontWeight:700,color:"var(--text2)"}}>{fmtS(fixedTotal)}원</div></div>
          <div><div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>💳 할부</div><div style={{fontSize:12,fontWeight:700,color:"var(--text2)"}}>{fmtS(installTotal)}원</div></div>
          <div><div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>🛒 생활비</div><div style={{fontSize:12,fontWeight:700,color:"var(--text2)"}}>{fmtS(variableSpent)}원</div></div>
        </div>
      </Card>

      <Card style={{padding:"16px", marginBottom:10, border:isOnTrack?"1px solid rgba(60,180,100,.25)":"1px solid rgba(200,50,50,.25)", background:isOnTrack?"rgba(60,180,100,.04)":"rgba(200,50,50,.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:"var(--text2)",marginBottom:4,letterSpacing:".04em"}}>이 속도면 월말에</div>
            <div style={{fontSize:28,fontWeight:700,lineHeight:1,color:isOnTrack?"var(--green)":"var(--red)",letterSpacing:"-.02em"}}>
              {isOnTrack ? "+" : "-"}{fmtS(Math.abs(remainingAtPace))}<span style={{fontSize:14,marginLeft:3}}>원</span>
            </div>
            <div style={{fontSize:11,color:isOnTrack?"var(--green)":"var(--red)",marginTop:5}}>
              {isOnTrack ? `예산 ${fmtS(Math.abs(remainingAtPace))}원 남아요 ✓` : `예산 ${fmtS(Math.abs(remainingAtPace))}원 초과 ⚠`}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:10,color:"var(--text2)",marginBottom:3}}>일평균 지출</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>{fmtS(currentPaceDaily)}<span style={{fontSize:10,color:"var(--text2)",marginLeft:2}}>원/일</span></div>
            <div style={{fontSize:10,color:"var(--text2)",marginTop:2}}>잔여 {daysLeft}일</div>
          </div>
        </div>
        <div style={{marginTop:12,background:"var(--bg3)",borderRadius:99,height:5,overflow:"hidden"}}>
          <div style={{
            height:"100%", borderRadius:99, transition:"width .5s ease",
            width:`${Math.min(paceProgressPct, 100)}%`,
            background: isOnTrack
              ? "linear-gradient(90deg,var(--green),#5cba84)"
              : "linear-gradient(90deg,var(--gold),var(--red))"
          }}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,color:"var(--text3)"}}>
          <span>현재 {fmtS(variableSpent)}원</span>
          <span>월말 예상 {paceProgressPct}% 집행</span>
          <span>예산 {fmtS(totalBudget)}원</span>
        </div>
      </Card>

      <Card style={{padding:"16px", marginBottom:10, background:"var(--bg4)", border:"1px solid var(--border2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>🎛 시나리오 조정</div>
            <div style={{fontSize:10,color:"var(--text2)",marginTop:3}}>슬라이더로 일 지출 조정 → 월말 예상 변화</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:10,color:"var(--text2)"}}>조정 시 월말</div>
            <div style={{fontSize:16,fontWeight:700,color:projOver?"var(--red)":"var(--green)"}}>{fmtS(projected)}원</div>
            <div style={{fontSize:10,color:projOver?"var(--red)":"var(--green)",marginTop:1}}>{projOver?"▲ 예산 초과":"✓ 예산 내"}</div>
          </div>
        </div>
        <SliderRow
          label="일평균 목표 지출"
          value={paceDaily}
          min={0}
          max={paceMax}
          step={5000}
          onChange={setPaceDaily}
          fillColor={paceColor}
          formatVal={v => fmtS(v)+"원/일"}
          showReset
          onReset={() => setPaceDaily(Math.max(0, defaultPaceVal))}
        />
        <div style={{display:"flex",gap:8}}>
          {[{label:"지금 페이스",val:currentPaceDaily,c:"var(--text2)"},{label:"조정 후",val:paceDaily,c:paceColor}].map(b=>(
            <div key={b.label} style={{flex:1,background:"var(--bg3)",borderRadius:10,padding:"9px 12px"}}>
              <div style={{fontSize:10,color:"var(--text2)",marginBottom:3}}>{b.label}</div>
              <div style={{fontSize:14,fontWeight:700,color:b.c}}>{fmtS(b.val)}<span style={{fontSize:10,color:"var(--text2)",marginLeft:2}}>원/일</span></div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="u3" style={{padding:0,marginBottom:10,overflow:"hidden"}}>
        {totalSalary === 0 ? (
          <div style={{padding:"24px 16px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:12}}>📊</div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>나의 수입과 예산 플랜을 짜보세요</div>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:18,lineHeight:1.7}}>
              예산 탭에서 급여와 저축 목표를 설정하면<br/>
              지출 한도와 예상 저축률을<br/>
              이곳에서 실시간으로 확인할 수 있습니다.
            </div>
            <button onClick={() => onSettings("budget")} style={{
              padding:"10px 24px",borderRadius:11,cursor:"pointer",fontWeight:700,fontSize:13,
              background:"var(--goldD)",border:"1px solid var(--gold)",color:"var(--gold)"
            }}>예산 설정하러 가기</button>
          </div>
        ) : (
          <>
            <div style={{padding:"16px 16px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:10,color:"var(--text2)",marginBottom:4,letterSpacing:".04em"}}>💳 이번달 카드 권장 한도 ({utilTarget}%)</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:5}}>
                    <span style={{fontSize:22,fontWeight:800,color:cardLimitOk?"var(--text)":"var(--red)",letterSpacing:"-.02em"}}>
                      {fmtS(variableSpent)}
                    </span>
                    <span style={{fontSize:12,color:"var(--text3)"}}>/ {fmtS(cardLimit)}원</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{
                    display:"inline-block",padding:"4px 10px",borderRadius:99,fontSize:11,fontWeight:700,
                    background: cardLimitOk ? "rgba(60,180,100,.12)" : "rgba(200,50,50,.12)",
                    color: cardLimitOk ? "var(--green)" : "var(--red)",
                    border: `1px solid ${cardLimitOk ? "rgba(60,180,100,.2)" : "rgba(200,50,50,.2)"}`
                  }}>
                    {cardLimitOk ? `${fmtS(cardLeft)}원 남음` : `${fmtS(Math.abs(cardLeft))}원 초과`}
                  </div>
                </div>
              </div>
              <div style={{background:"var(--bg4)",borderRadius:99,height:7,overflow:"hidden",marginBottom:6, border:"1px solid var(--border)"}}>
                <div style={{
                  height:"100%",borderRadius:99,transition:"width .5s ease",
                  width:`${cardUsedPct}%`,
                  background: cardUsedPct < 70
                    ? "linear-gradient(90deg,var(--green),#5cba84)"
                    : cardUsedPct < 90
                    ? "linear-gradient(90deg,var(--gold),#c8a030)"
                    : "linear-gradient(90deg,var(--gold),var(--red))"
                }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)", opacity:0.8, marginTop:4}}>
                <span>사용률 {cardUsedPct}%</span>
                <span>남은 한도 {fmtS(cardLeft)}원</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0, borderTop:"1px solid var(--border)"}}>
              <div style={{padding:"11px 16px",borderRight:"1px solid var(--border)"}}>
                <div style={{fontSize:9,color:"var(--text3)",marginBottom:3}}>📈 이달 예상 여유자금(률)</div>
                <div style={{fontSize:16,fontWeight:800,color:savingsRateColor}}>{totalSalary > 0 ? (savingsRate > 0 ? "+" : "") + savingsRate + "%" : "미정"}</div>
                <div style={{fontSize:9,color:savingsRateColor,marginTop:1, fontWeight:700}}>{savingsRateLabel}</div>
              </div>
              <div style={{padding:"11px 16px"}}>
                <div style={{fontSize:9,color:"var(--text3)",marginBottom:3}}>📋 연회비/청구 예정</div>
                <div style={{fontSize:16,fontWeight:800,color:"var(--text)"}}>{fmtS(thisMonthCardSpend)}원</div>
                <div style={{fontSize:9,color:"var(--text2)",marginTop:1}}>카드 사용액 기반</div>
              </div>
            </div>
          </>
        )}
      </Card>

      {!plan?.isSolo && (
        <Card className="u5" style={{padding:"14px",marginBottom:10}}>
          <div style={{fontSize:11,color:"var(--text2)",marginBottom:10}}>파트너별 지출</div>
          <div style={{display:"flex",height:5,borderRadius:99,overflow:"hidden",marginBottom:10}}>
            <div style={{width:`${totalSpent>0?hSpent/totalSpent*100:50}%`,background:"var(--h)",transition:"width .7s ease"}}/>
            <div style={{flex:1,background:"var(--w)"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{w:"husband",a:hSpent},{w:"wife",a:wSpent}].map(p=>(
              <div key={p.w} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:p.w==="husband"?"var(--h)":"var(--w)"}}/>
                <div>
                  <div style={{fontSize:10,color:"var(--text2)"}}>{p.w==="husband"?names.husband:names.wife}</div>
                  <div style={{fontSize:13,fontWeight:700}}>{fmtS(p.a)}원</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {["husband","wife"].map(w=>(
              <button key={w} onClick={()=>onAdd(w)} style={{
                background:w==="husband"?"var(--hD)":"var(--wD)",
                border:`1px solid ${w==="husband"?"rgba(92,141,232,.25)":"rgba(217,127,168,.25)"}`,
                borderRadius:11,padding:"11px",cursor:"pointer",
                color:w==="husband"?"var(--h)":"var(--w)",fontWeight:700,fontSize:13,
                display:"flex",alignItems:"center",gap:6,justifyContent:"center"
              }}><span style={{fontSize:17,lineHeight:1}}>+</span>{w==="husband"?names.husband:names.wife}</button>
            ))}
          </div>
        </Card>
      )}

      {plan?.isSolo && (
        <div style={{marginBottom:10}}>
          <button onClick={()=>onAdd("husband")} style={{
            width:"100%", background:"var(--gold)", border:"none", borderRadius:14, padding:"16px",
            color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:"0 4px 12px rgba(200,168,75,0.2)"
          }}>+ 지출 추가하기</button>
        </div>
      )}

      <Card className="u6" style={{overflow:"hidden"}}>
        <div style={{padding:"12px 14px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700}}>{searchTerm ? "검색 결과" : "최근 내역"}</span>
          <button onClick={()=>setShowFull(!showFull)} style={{background:"none",border:"none",color:"var(--gold)",fontSize:11,fontWeight:700,cursor:"pointer"}}>{showFull?"간략히":"전체보기"}</button>
        </div>
        <div style={{padding:"0 14px 10px"}}>
          <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="🔎 지출 처 또는 카테고리 검색" 
            style={{width:"100%",background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 12px",color:"var(--text)",fontSize:12,outline:"none"}}
          />
        </div>

        {(() => {
          const filtered = tx.filter(t => {
            if(!searchTerm) return true;
            const label = CAT[t.cat]?.label || "";
            return (t.memo && t.memo.includes(searchTerm)) || label.includes(searchTerm);
          }).sort((a,b)=>b.id-a.id);
          const displayList = showFull ? filtered : filtered.slice(0, 5);
          if (displayList.length === 0) return <div style={{padding:"24px 14px",textAlign:"center",borderTop:"1px solid var(--border)"}}><div style={{fontSize:13,color:"var(--text2)"}}>내역이 없습니다.</div></div>;

          return displayList.map(t => {
            const c = CAT[t.cat] || CATS[8];
            const card = t.cardId ? (cards || []).find(cc => cc.id === t.cardId) : null;
            const pmI = t.payMethod === "credit" ? "💳" : t.payMethod === "debit" ? "🏦" : "💵";
            const pmL = card ? card.label : (t.payMethod === "credit" ? "신용" : t.payMethod === "debit" ? "체크" : "현금");
            return(
              <div key={t.id} onClick={() => setEditItem(t)} style={{padding:"9px 14px",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"background .15s"}} onMouseOver={e=>e.currentTarget.style.background="var(--bg3)"} onMouseOut={e=>e.currentTarget.style.background="none"}>
                <div style={{width:34,height:34,borderRadius:10,background:c.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:600}}>{c.label}</span>
                    {!plan?.isSolo && <Chip who={t.who} names={names}/>}
                  </div>
                  <div style={{display:"flex", alignItems:"center", gap:4, fontSize:10, color:"var(--text3)"}}>
                    <span style={{color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.memo||"—"}</span>
                    <span>·</span>
                    <span style={{background:"var(--bg3)", padding:"1px 4px", borderRadius:4, fontSize:9, display:"flex", alignItems:"center", gap:2, border:"1px solid var(--border)"}}>
                      <span>{pmI}</span>
                      <span>{pmL}</span>
                    </span>
                    <span>·</span>
                    <span>{t.date.slice(5)}</span>
                  </div>
                </div>
                <span style={{fontSize:14,fontWeight:800,flexShrink:0, color:"var(--text)"}}>-{fmtS(t.amount)}원</span>
              </div>
            );
          });
        })()}
      </Card>

      {editItem && (
        <TxEditModal 
          tx={editItem} cards={cards} names={names} plan={plan}
          onEdit={(id, updates) => { onEdit(id, updates); setEditItem(null); }}
          onDelete={(id) => { onDelete(id); setEditItem(null); }}
          onClose={() => setEditItem(null)} 
        />
      )}
    </div>
  );
}
