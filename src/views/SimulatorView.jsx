import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, SectionHeader } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { getYear } from "../constants";
import { fmtS } from "../utils/helpers";

const simTooltip=({active,payload,label})=>{
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10,padding:"10px 14px",fontSize:11}}>
      <div style={{color:"var(--text2)",marginBottom:4}}>{label}년</div>
      {payload.map(p=>(<div key={p.name} style={{color:p.color,fontWeight:700}}>{p.name}: {fmtS(p.value)}원</div>))}
    </div>
  );
};

export function SimulatorView({sliderCfg,onUpdateSimCfg}){
  const [init,   setInit]   = useState(sliderCfg?.simInitAmt || 10000000);
  const [monthly,setMonthly]= useState(sliderCfg?.simMonthly || 500000);
  const [rate,   setRate]   = useState(sliderCfg?.simRate || 5);
  const [years,  setYears]  = useState(sliderCfg?.simYears || 20);
  const [goal,   setGoal]   = useState(sliderCfg?.simGoal || 300000000);

  const reset=()=>{
    setInit(sliderCfg?.simInitAmt || 10000000);
    setMonthly(sliderCfg?.simMonthly || 500000);
    setRate(sliderCfg?.simRate || 5);
    setYears(sliderCfg?.simYears || 20);
    setGoal(sliderCfg?.simGoal || 300000000);
  };

  const data=useMemo(()=>{
    const r=rate/100;
    return Array.from({length:years+1},(_,y)=>({
      year:y,
      복리성장:Math.round(init*Math.pow(1+r,y)+monthly*12*(r>0?(Math.pow(1+r,y)-1)/r:y)),
      단순저축:Math.round(init+monthly*12*y),
      원금:init,
    }));
  },[init,monthly,rate,years]);

  const final = data.length > 0 ? data[data.length - 1] : { 복리성장: 0, 단순저축: 0, 원금: 0 };
  const multiple = final.원금 > 0 ? (final.복리성장 / final.원금).toFixed(1) : "0.0";
  const goalYear = data.findIndex(d => d.복리성장 >= goal);

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1">
        <div style={{padding:"22px 0 4px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <SectionHeader sub="Finance Simulator" title="재무 시뮬레이터"/>
          <button onClick={reset} style={{fontSize:11,color:"var(--text2)",background:"rgba(255,255,255,.04)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 12px",cursor:"pointer",marginBottom:14}}>전체 초기화</button>
        </div>
      </div>

      <Card className="u2" style={{padding:"20px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 변수 조정</div>
        <SliderRow label="초기 투자금" value={init} min={1000000} max={100000000} step={1000000}
          onChange={setInit} fillColor="var(--gold)"
          showReset onReset={()=>setInit(sliderCfg.simInitAmt)}/>
        <SliderRow label="월 저축액" value={monthly} min={100000} max={3000000} step={50000}
          onChange={setMonthly} fillColor="var(--blue)"
          showReset onReset={()=>setMonthly(sliderCfg.simMonthly)}/>
        <SliderRow label="연 수익률" value={rate} min={1} max={20} step={0.5}
          onChange={setRate} fillColor="var(--green)"
          formatVal={v=>v.toFixed(1)+"%"}
          showReset onReset={()=>setRate(sliderCfg.simRate)}/>
        <SliderRow label="투자 기간" value={years} min={1} max={40} step={1}
          onChange={setYears} fillColor="var(--pink)"
          formatVal={v=>v+"년"}
          showReset onReset={()=>setYears(sliderCfg.simYears)}/>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16,marginTop:4}}>
          <SliderRow label="🎯 목표 금액" value={goal} min={10000000} max={1000000000} step={10000000}
            onChange={setGoal} fillColor="var(--purple)"
            formatVal={v=>fmtS(v)+"원"}
            showReset onReset={()=>setGoal(sliderCfg.simGoal)}/>
          <div style={{
            background:goalYear>0?"var(--greenD)":"var(--redD)",
            border:`1px solid ${goalYear>0?"rgba(77,171,135,.3)":"rgba(217,95,95,.3)"}`,
            borderRadius:10,padding:"10px 14px",fontSize:12,
            color:goalYear>0?"var(--green)":"var(--red)"
          }}>
            {goalYear>0?`✓ ${goalYear}년 후 달성 예상 (${getYear()+goalYear}년)`:`✗ ${years}년 내 달성 불가`}
          </div>
        </div>
      </Card>

      <div className="u3" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
        {[
          {label:"최종 금액",  val:fmtS(final.복리성장)+"원",c:"var(--goldL)", icon:"💰"},
          {label:"복리 추가수익",val:fmtS(final.복리성장-final.단순저축)+"원",c:"var(--green)",icon:"📈"},
          {label:"원금 대비",  val:multiple+"배",             c:"var(--purple)",icon:"✨"},
        ].map(c=>(
          <Card key={c.label} style={{padding:"13px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,marginBottom:5}}>{c.icon}</div>
            <div style={{fontSize:10,color:"var(--text2)",marginBottom:4}}>{c.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:c.c,lineHeight:1.2}}>{c.val}</div>
          </Card>
        ))}
      </div>

      <Card className="u4" style={{padding:"18px"}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:14}}>■ 성장 곡선</div>
        <div style={{height:210}}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{top:5,right:8,left:0,bottom:5}}>
              <XAxis dataKey="year" tick={{fill:"var(--text3)",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>v+"년"}/>
              <YAxis tick={{fill:"var(--text3)",fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmtS} width={40}/>
              <Tooltip content={simTooltip}/>
              {goalYear>0&&<ReferenceLine x={goalYear} stroke="rgba(200,168,75,.5)" strokeDasharray="4 4"/>}
              <Line type="monotone" dataKey="복리성장" stroke="#5c8de8" strokeWidth={2.5} dot={false}/>
              <Line type="monotone" dataKey="단순저축" stroke="#4dab87" strokeWidth={1.5} dot={false} strokeDasharray="5 4"/>
              <Line type="monotone" dataKey="원금"    stroke="rgba(255,255,255,.15)" strokeWidth={1} dot={false} strokeDasharray="3 6"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
