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
  // 1단계: 안전한 초기값 설정 (sliderCfg가 없거나 누락된 속성이 있을 경우 대비)
  const [init,   setInit]   = useState(Number(sliderCfg?.simInitAmt) || 10000000);
  const [monthly,setMonthly]= useState(Number(sliderCfg?.simMonthly) || 500000);
  const [rate,   setRate]   = useState(Number(sliderCfg?.simRate) || 5);
  const [years,  setYears]  = useState(Number(sliderCfg?.simYears) || 20);
  const [goal,   setGoal]   = useState(Number(sliderCfg?.simGoal) || 300000000);

  const reset=()=>{
    setInit(Number(sliderCfg?.simInitAmt) || 10000000);
    setMonthly(Number(sliderCfg?.simMonthly) || 500000);
    setRate(Number(sliderCfg?.simRate) || 5);
    setYears(Number(sliderCfg?.simYears) || 20);
    setGoal(Number(sliderCfg?.simGoal) || 300000000);
  };

  // 2단계: 연산 안전장치 강화
  const data=useMemo(()=>{
    try {
      const r = (Number(rate) || 0) / 100;
      const initialAmt = Number(init) || 0;
      const monthlyAmt = Number(monthly) || 0;
      const yearsLimit = Math.min(Math.max(Number(years) || 1, 1), 50); // 최대 50년 제한으로 연산 부하 방지
      
      return Array.from({length: yearsLimit + 1}, (_, y) => {
        let compound = 0;
        if (r > 0) {
          compound = initialAmt * Math.pow(1 + r, y) + monthlyAmt * 12 * ((Math.pow(1 + r, y) - 1) / r);
        } else {
          compound = initialAmt + (monthlyAmt * 12 * y);
        }
        
        return {
          year: y,
          복리성장: Math.round(compound) || 0,
          단순저축: Math.round(initialAmt + (monthlyAmt * 12 * y)) || 0,
          원금: initialAmt,
        };
      });
    } catch (e) {
      console.error("[Simulator] 연산 에러:", e);
      return [];
    }
  }, [init, monthly, rate, years]);

  // 3단계: 렌더링 전 최종 방어
  if (!data || data.length === 0) {
    return (
      <div style={{padding:"40px 20px", textAlign:"center", color:"var(--text2)"}}>
        시뮬레이션 데이터를 유효하게 불러오지 못했습니다. <br/> 초기화 버튼을 눌러주세요.
        <button onClick={reset} style={{display:"block", margin:"20px auto", padding:"10px 20px", borderRadius:10, border:"1px solid var(--border)", background:"var(--bg3)", color:"var(--text)"}}>초기화</button>
      </div>
    );
  }

  const final = data[data.length - 1];
  const multiple = final.원금 > 0 ? (final.복리성장 / final.원금).toFixed(1) : "0.0";
  const goalYear = data.findIndex(d => d.복리성장 >= goal);

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%", background:"var(--bg)"}}>
      <div className="u1">
        <div style={{padding:"22px 0 4px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <SectionHeader sub="Finance Simulator" title="재무 시뮬레이터"/>
          <button onClick={reset} style={{fontSize:11,color:"var(--text2)",background:"rgba(255,255,255,.04)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 12px",cursor:"pointer",marginBottom:14}}>전체 초기화</button>
        </div>
      </div>

      <Card className="u2" style={{padding:"20px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 변수 조정</div>
        <SliderRow label="초기 투자금" value={init} min={1000000} max={200000000} step={1000000}
          onChange={setInit} fillColor="var(--gold)"
          showReset onReset={()=>setInit(sliderCfg?.simInitAmt || 10000000)}/>
        <SliderRow label="월 저축액" value={monthly} min={100000} max={5000000} step={50000}
          onChange={setMonthly} fillColor="var(--blue)"
          showReset onReset={()=>setMonthly(sliderCfg?.simMonthly || 500000)}/>
        <SliderRow label="연 수익률" value={rate} min={0} max={20} step={0.5}
          onChange={setRate} fillColor="var(--green)"
          formatVal={v=>v.toFixed(1)+"%"}
          showReset onReset={()=>setRate(sliderCfg?.simRate || 5)}/>
        <SliderRow label="투자 기간" value={years} min={1} max={50} step={1}
          onChange={setYears} fillColor="var(--pink)"
          formatVal={v=>v+"년"}
          showReset onReset={()=>setYears(sliderCfg?.simYears || 20)}/>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:16,marginTop:4}}>
          <SliderRow label="🎯 목표 금액" value={goal} min={10000000} max={2000000000} step={10000000}
            onChange={setGoal} fillColor="var(--purple)"
            formatVal={v=>fmtS(v)+"원"}
            showReset onReset={()=>setGoal(sliderCfg?.simGoal || 300000000)}/>
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
