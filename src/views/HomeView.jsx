import { useState } from "react";
import { Card, Ring, Chip, SectionHeader } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { CAT, CATS, DAY, DAYS, MONTH, YEAR } from "../constants";
import { fmtS } from "../utils/helpers";

export function HomeView({tx,budgets,fixed,install,names,onAdd,sliderCfg,onWidget}){
  const totalBudget  = Object.values(budgets).reduce((s,v)=>s+v,0);
  const fixedTotal   = fixed.reduce((s,f)=>s+f.amount,0);
  const installTotal = install.reduce((s,i)=>s+i.monthly,0);
  const totalSpent   = tx.reduce((s,t)=>s+t.amount,0);
  const pct          = Math.round(totalSpent/totalBudget*100);
  const paceTarget   = Math.round(DAY/DAYS*totalBudget);
  const pacePct      = paceTarget>0?Math.round(totalSpent/paceTarget*100):0;
  const remaining    = totalBudget-totalSpent;
  const hSpent       = tx.filter(t=>t.who==="husband").reduce((s,t)=>s+t.amount,0);
  const wSpent       = tx.filter(t=>t.who==="wife").reduce((s,t)=>s+t.amount,0);
  const recent       = [...tx].sort((a,b)=>b.id-a.id).slice(0,4);

  const daysLeft       = Math.max(DAYS - DAY, 1);
  const defaultPaceVal = Math.min(Math.round(remaining / daysLeft), sliderCfg.paceMaxDaily);
  const [paceDaily, setPaceDaily] = useState(Math.max(0, defaultPaceVal));
  const [searchTerm, setSearchTerm] = useState("");
  const [showFull, setShowFull] = useState(false);

  const paceMax     = sliderCfg.paceMaxDaily;
  const projected   = totalSpent + paceDaily * daysLeft;
  const projOver    = projected > totalBudget;
  const paceColor   = pacePct<=90?"var(--green)":pacePct<=110?"#d4b84a":"var(--red)";
  const paceStatus  = pacePct<=90?"양호 ✓":pacePct<=110?"보통":"주의";
  const fillColor   = projOver ? "var(--red)" : "var(--green)";

  // 현재 페이스 기반 월말 예측
  const currentPaceDaily         = DAY > 0 ? Math.round(totalSpent / DAY) : 0;
  const projectedAtPace          = totalSpent + currentPaceDaily * daysLeft;
  const remainingAtPace          = totalBudget - projectedAtPace;
  const isOnTrack                = remainingAtPace >= 0;
  const paceProgressPct          = totalBudget > 0 ? Math.min(Math.round(projectedAtPace / totalBudget * 100), 130) : 0;

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1" style={{padding:"22px 0 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>{YEAR}년 {MONTH}월 · {DAY}일차</div>
          <div className="serif" style={{fontSize:21}}>가정 경영현황</div>
        </div>
        <button onClick={onWidget} style={{background:paceColor+"22",color:paceColor,fontSize:11,fontWeight:700,padding:"5px 11px",borderRadius:99,border:`1px solid ${paceColor}44`,cursor:"pointer"}}>
          PACE {paceStatus} ↗
        </button>
      </div>

      <Card className="u2" style={{padding:"18px",marginBottom:10,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,var(--goldD) 0%,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",gap:18,alignItems:"center",marginBottom:16}}>
          <Ring pct={pct} size={100} stroke={7}>
            <div style={{fontSize:20,fontWeight:700,color:"var(--gold)"}}>{pct}%</div>
            <div style={{fontSize:9,color:"var(--text2)",letterSpacing:".05em",marginTop:1}}>집행률</div>
          </Ring>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:2}}>누적 지출</div>
            <div style={{fontSize:21,fontWeight:700,letterSpacing:"-.02em"}}>{fmtS(totalSpent)}<span style={{fontSize:13,color:"var(--text2)",marginLeft:2}}>원</span></div>
            <div style={{fontSize:12,color:"var(--text2)",marginTop:1}}>/ {fmtS(totalBudget)}원</div>
            <div style={{display:"flex",gap:14,marginTop:10}}>
              <div><div style={{fontSize:10,color:"var(--text2)"}}>잔여</div><div style={{fontSize:12,fontWeight:700,color:remaining>=0?"var(--green)":"var(--red)"}}>{fmtS(remaining)}원</div></div>
              <div><div style={{fontSize:10,color:"var(--text2)"}}>고정+할부</div><div style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>{fmtS(fixedTotal+installTotal)}원</div></div>
            </div>
          </div>
        </div>

        {/* ── 이 속도면 월말에? ── */}
        <div style={{
          background: isOnTrack ? "rgba(60,180,100,.1)" : "rgba(200,50,50,.1)",
          border: `1px solid ${isOnTrack ? "rgba(60,180,100,.25)" : "rgba(200,50,50,.25)"}`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 10
        }}>
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
          {/* 진행 게이지 */}
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
            <span>현재 {fmtS(totalSpent)}원</span>
            <span>월말 예상 {paceProgressPct}% 집행</span>
            <span>예산 {fmtS(totalBudget)}원</span>
          </div>
        </div>

        <div style={{background:"var(--bg4)",borderRadius:14,padding:"16px",border:"1px solid var(--border2)"}}>
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
            fillColor={fillColor}
            formatVal={v => fmtS(v)+"원/일"}
            showReset
            onReset={() => setPaceDaily(Math.max(0, defaultPaceVal))}
          />

          <div style={{display:"flex",gap:8}}>
            {[{label:"지금 페이스",val:currentPaceDaily,c:"var(--text2)"},{label:"조정 후",val:paceDaily,c:fillColor}].map(b=>(
              <div key={b.label} style={{flex:1,background:"var(--bg3)",borderRadius:10,padding:"9px 12px"}}>
                <div style={{fontSize:10,color:"var(--text2)",marginBottom:3}}>{b.label}</div>
                <div style={{fontSize:14,fontWeight:700,color:b.c}}>{fmtS(b.val)}<span style={{fontSize:10,color:"var(--text2)",marginLeft:2}}>원/일</span></div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="u3" style={{padding:"14px",marginBottom:10}}>
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

      <Card className="u4" style={{overflow:"hidden"}}>
        <div style={{padding:"12px 14px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,fontWeight:700}}>{searchTerm ? "검색 결과" : "최근 내역"}</span>
          <button onClick={()=>setShowFull(!showFull)} style={{background:"none",border:"none",color:"var(--gold)",fontSize:11,fontWeight:700,cursor:"pointer"}}>{showFull?"간략히":"전체보기"}</button>
        </div>
        
        <div style={{padding:"0 14px 10px"}}>
          <input 
            value={searchTerm} 
            onChange={e=>setSearchTerm(e.target.value)} 
            placeholder="🔎 지출 처 또는 카테고리 검색" 
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

          if (displayList.length === 0) {
            return (
              <div style={{padding:"24px 14px",textAlign:"center",borderTop:"1px solid var(--border)"}}>
                <div style={{fontSize:13,color:"var(--text2)"}}>내역이 없습니다.</div>
              </div>
            );
          }

          return displayList.map(t => {
            const c=CAT[t.cat]||CATS[8];
            return(
              <div key={t.id} style={{padding:"9px 14px",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:33,height:33,borderRadius:9,background:c.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{c.icon}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}><span style={{fontSize:12,fontWeight:500}}>{c.label}</span><Chip who={t.who} names={names}/></div>
                  <div style={{fontSize:10,color:"var(--text2)"}}>{t.memo||"—"} · {t.date.slice(5)}</div>
                </div>
                <span style={{fontSize:13,fontWeight:700,flexShrink:0}}>-{fmtS(t.amount)}원</span>
              </div>
            );
          });
        })()}
      </Card>
    </div>
  );
}
