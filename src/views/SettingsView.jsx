import { Card, SectionHeader } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { CATS } from "../constants";
import { fmtS } from "../utils/helpers";
import { exportTransactions } from "../utils/export";

export function SettingsView({names,setNames,budgets,setBudgets,sliderCfg,setSliderCfg,theme,setTheme,resetAll,householdId,myRole,leaveHousehold,tx,plan}){
  const updateName=(role,v)=>setNames({...names,[role]:v});
  const updateBudget=(id,v)=>setBudgets({...budgets,[id]:v});

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1"><SectionHeader sub="App Preferences" title="설정 및 관리"/></div>

      <Card className="u2" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 일반 설정</div>
        <div style={{display:"flex",gap:10,marginBottom:18}}>
          {["dark","light"].map(t=>(
            <button key={t} onClick={()=>setTheme(t)} style={{
              flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:13,
              background:theme===t?"var(--goldD)":"var(--bg3)",
              border:`1px solid ${theme===t?"var(--gold)":"var(--border)"}`,
              color:theme===t?"var(--gold)":"var(--text2)"
            }}>{t==="dark"?"🌙 다크 모드":"☀️ 라이트 모드"}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns: plan?.isSolo ? "1fr" : "1fr 1fr", gap:12}}>
          {[{r:"husband",l: plan?.isSolo ? "사용자 이름" : "남편 이름"}, {r:"wife",l:"와이프 이름"}].slice(0, plan?.isSolo ? 1 : 2).map(p=>(
            <div key={p.r}><div style={{fontSize:11,color:"var(--text2)",marginBottom:6}}>{p.l}</div>
              <input value={names[p.r]} onChange={e=>updateName(p.r,e.target.value)} style={{width:"100%",background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",fontSize:13}}/>
            </div>
          ))}
        </div>
      </Card>

      <Card className="u3" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 카테고리별 예산 설정</div>
        {CATS.map(c=>(
          <SliderRow key={c.id} label={`${c.icon} ${c.label}`} value={budgets[c.id]} min={0} max={sliderCfg.budgetSliderMax} step={10000} onChange={v=>updateBudget(c.id,v)} fillColor={c.color}/>
        ))}
      </Card>

      <Card className="u4" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 고급 설정 (슬라이더 범위 등)</div>
        <SliderRow label="예산 슬라이더 최대치" value={sliderCfg.budgetSliderMax} min={500000} max={10000000} step={100000} onChange={v=>setSliderCfg({...sliderCfg,budgetSliderMax:v})} formatVal={v=>fmtS(v)+"원"}/>
        <SliderRow label="페이스 조절 최대치" value={sliderCfg.paceMaxDaily} min={50000} max={1000000} step={10000} onChange={v=>setSliderCfg({...sliderCfg,paceMaxDaily:v})} formatVal={v=>fmtS(v)+"원"}/>
      </Card>

      <Card className="u5" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 데이터 및 연결</div>
        <div style={{background:"var(--bg3)",padding:"14px",borderRadius:12,marginBottom:14,border:"1px solid var(--border2)"}}>
          <div style={{fontSize:10,color:"var(--text2)",marginBottom:4}}>{plan?.isSolo ? "나의 연결 코드" : "가정 연결 코드"}</div>
          <div style={{fontSize:20,fontWeight:800,color:"var(--gold)",letterSpacing:".1em"}}>{householdId}</div>
          {!plan?.isSolo && (
            <div style={{fontSize:10,color:"var(--text3)",marginTop:6}}>내 역할: {myRole==="husband"?names.husband:names.wife}</div>
          )}
        </div>
        {plan?.isSolo && (
          <button onClick={() => {
            if(confirm("커플 모드로 전환할까요? 파트너가 동일한 가계부를 공유할 수 있습니다.")) {
              setPlan(p => ({ ...p, isSolo: false }));
            }
          }} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--gold)",background:"var(--goldD)",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:8}}>👥 파트너 초대 — 커플 모드로 전환</button>
        )}
        <button onClick={()=>exportTransactions(tx)} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--goldL)",background:"var(--goldD)",color:"var(--gold)",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:8}}>📥 전체 지출 내역 CSV 내보내기</button>
        <button onClick={leaveHousehold} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--border2)",background:"none",color:"var(--text2)",fontSize:12,cursor:"pointer",marginBottom:8}}>가계부 나가기 (다른 코드로 연결)</button>
        <button onClick={()=>{if(confirm("모든 데이터를 초기화할까요?"))resetAll();}} style={{width:"100%",padding:"12px",borderRadius:10,border:"1px solid var(--redD)",background:"var(--redD)",color:"var(--red)",fontSize:12,fontWeight:700,cursor:"pointer"}}>전체 데이터 초기화</button>
      </Card>
      <div style={{textAlign:"center",padding:"10px",opacity:0.3,fontSize:10}}>Family Budget v4.0.0</div>
    </div>
  );
}
