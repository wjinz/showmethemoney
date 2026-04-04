import { useState, useMemo } from "react";
import { Card, SectionHeader, Bar } from "../components/UI";
import { CAT, CATS, getYear, getMonth, getDay, getDaysInMonth } from "../constants";
import { fmtS } from "../utils/helpers";
import { CalendarView } from "./CalendarView";
import { TaxOptimizerView } from "./TaxOptimizerView";
import { PredictionView } from "./PredictionView";
import { DataImportView } from "./DataImportView";
import { AssetView } from "./AssetView";

function StackedBar({data,total,height=24,showLegend=false}){
  return(
    <div>
      <div style={{display:"flex",height,borderRadius:10,overflow:"hidden"}}>
        {data.filter(d=>d.amount>0).map(d=>{
          const c=d.cat.endsWith("_internal") ? d : CAT[d.cat]; 
          const w=total>0?d.amount/total*100:0;
          return <div key={d.cat} style={{width:`${w}%`,background:c?.color||"#888",transition:"width .7s ease",minWidth:w>1?1:0}} title={`${c?.label} ${Math.round(w)}%`}/>;
        })}
      </div>
      {showLegend&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"5px 12px",marginTop:8}}>
          {data.filter(d=>d.amount>0&&total>0&&d.amount/total>.01).map(d=>{
            const c=d.cat.endsWith("_internal") ? d : CAT[d.cat]; 
            const p=Math.round(d.amount/total*100);
            return(<div key={d.cat} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:1,background:c?.color}}/><span style={{fontSize:10,color:"var(--text2)"}}>{c?.label} {p}%</span></div>);
          })}
        </div>
      )}
    </div>
  );
}

function ReportContent({tx,budgets,fixed,install,names,plan}){
  const YEAR  = getYear();
  const MONTH = getMonth();
  const DAY   = getDay();
  const DAYS  = getDaysInMonth(YEAR, MONTH);

  const variableBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const fixedTotal     = (fixed || []).reduce((s,f)=>s+f.amount,0);
  const installTotal   = (install || []).reduce((s,i)=>s+i.monthly,0);
  const totalBudgetAll = variableBudget + fixedTotal + installTotal;

  // Task 4-1: tx 배열 연산 useMemo 최적화
  const curMonthStr  = `${YEAR}-${String(MONTH).padStart(2,"0")}`;
  const prevYear     = MONTH===1 ? YEAR-1 : YEAR;
  const prevMonth    = MONTH===1 ? 12 : MONTH-1;
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2,"0")}`;

  const totalSpent = useMemo(() => tx.reduce((s,t)=>s+t.amount, 0), [tx]);
  const hSpent     = useMemo(() => tx.filter(t=>t.who==="husband").reduce((s,t)=>s+t.amount, 0), [tx]);
  const wSpent     = useMemo(() => tx.filter(t=>t.who==="wife").reduce((s,t)=>s+t.amount, 0), [tx]);

  const curTx    = useMemo(() => tx.filter(t=>t.date.startsWith(curMonthStr)), [tx, curMonthStr]);
  const curVariableTotal = useMemo(() => curTx.reduce((s,t)=>s+t.amount, 0), [curTx]);
  const curTotalAll = curVariableTotal + fixedTotal + installTotal;
  
  const catData  = useMemo(() => {
    const list = CATS.map(c=>({cat:c.id,amount:curTx.filter(t=>t.cat===c.id).reduce((s,t)=>s+t.amount,0)}));
    // 고정비와 할부를 가상 카테고리로 추가 (시각화용)
    if(fixedTotal > 0) list.push({cat:"fixed_internal", amount:fixedTotal, label:"고정비", color:"#5c8de8", icon:"📌"});
    if(installTotal > 0) list.push({cat:"install_internal", amount:installTotal, label:"할부", color:"#d97fa8", icon:"💳"});
    return list;
  }, [curTx, fixedTotal, installTotal]);

  const prevTx    = useMemo(() => tx.filter(t=>t.date.startsWith(prevMonthStr)), [tx, prevMonthStr]);
  const prevVariableTotal = useMemo(() => prevTx.reduce((s,t)=>s+t.amount, 0), [prevTx]);
  const prevTotalAll = prevVariableTotal + fixedTotal + installTotal;
  const hasPrev   = prevTotalAll > 0;
  const prevLabel = `${prevYear}년 ${prevMonth}월`;

  const projected = DAY > 0 ? Math.round(curTotalAll / DAY * DAYS) : 0;

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1"><SectionHeader sub={`${YEAR}년 ${MONTH}월 · ${DAY}일 기준`} title="월간 경영 리포트"/></div>

      <Card className="u2" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:14}}>■ 지출 구조 분석</div>
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:600}}>이번 달 지출 구조 ({fmtS(curTotalAll)}원)</span>
          </div>
          {curTotalAll > 0
            ? <StackedBar data={catData} total={curTotalAll} height={24} showLegend/>
            : <div style={{height:24,borderRadius:10,background:"var(--track)",display:"flex",alignItems:"center",paddingLeft:12}}><span style={{fontSize:11,color:"var(--text3)"}}>이번 달 지출 내역 없음</span></div>
          }
        </div>
        {hasPrev && (
          <div>
            <div style={{fontSize:11,color:"var(--text3)",marginBottom:8}}>전월 대비 ({prevLabel})</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{flex:1,marginRight:14}}><Bar pct={prevTotalAll>0?curTotalAll/prevTotalAll*100:0} color="var(--gold)" h={6}/></div>
              <div style={{fontSize:12,fontWeight:700,color:curTotalAll>prevTotalAll?"var(--red)":"var(--green)"}}>
                {curTotalAll > prevTotalAll ? `▲ ${fmtS(curTotalAll-prevTotalAll)}원` : `▼ ${fmtS(prevTotalAll-curTotalAll)}원`}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="u3" style={{padding:"18px",marginBottom:10}}>
        <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 카테고리별 상세 비교 (vs 예산)</div>
        {catData.map(d=>{
          const c=CAT[d.cat]; const b=budgets[d.cat]||0; const pct=b>0?Math.round(d.amount/b*100):0;
          if(d.amount===0 && b===0) return null;
          return(
            <div key={d.cat} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>{c.icon}</span><span style={{fontSize:12,fontWeight:500}}>{c.label}</span></div>
                <div style={{fontSize:12,fontWeight:700}}>{fmtS(d.amount)}원 <span style={{fontSize:10,color:"var(--text2)",fontWeight:400}}>/ {fmtS(b)}원</span></div>
              </div>
              <Bar pct={pct} color={c.color} h={4}/>
            </div>
          );
        })}
      </Card>

      {!plan?.isSolo && (
        <Card className="u4" style={{padding:"18px"}}>
          <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".06em",marginBottom:16}}>■ 파트너 기여도</div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span>{names.husband}</span><span>{Math.round(hSpent/Math.max(totalSpent,1)*100)}%</span></div>
              <Bar pct={totalSpent>0?hSpent/totalSpent*100:0} color="var(--h)" h={8}/>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span>{names.wife}</span><span>{Math.round(wSpent/Math.max(totalSpent,1)*100)}%</span></div>
              <Bar pct={totalSpent>0?wSpent/totalSpent*100:0} color="var(--w)" h={8}/>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function ReportView({tx, budgets, setBudgets, fixed, install, names, cards, plan, setPlan, taxConfig, setTaxConfig, onEdit, onDelete, loadTxYear, assets, setAssets}) {
  const [tab, setTab] = useState("report");
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",gap:4,padding:"14px 16px 0",background:"var(--bg)",flexShrink:0,overflowX:"auto"}}>
        {[
          {id:"report",l:"📊 리포트"},
          {id:"calendar",l:"📅 캘린더"},
          {id:"import",l:"📁 데이터"},
          {id:"tax",l:"💸 연말정산"},
          {id:"pred",l:"🔮 예측"},
          {id:"asset",l:"💰 자산"}
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flexShrink:0,padding:"10px 12px",borderRadius:12,cursor:"pointer",
            fontWeight:700,fontSize:10,
            background:tab===t.id?"var(--goldD)":"var(--bg2)",
            border:`1px solid ${tab===t.id?"var(--gold)":"var(--border)"}`,
            color:tab===t.id?"var(--gold)":"var(--text2)",
            transition:"all .15s"
          }}>{t.l}</button>
        ))}
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        {tab==="report"   && <ReportContent tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} plan={plan}/>}
        {tab==="calendar" && <CalendarView tx={tx} cards={cards} names={names} budgets={budgets} onEdit={onEdit} onDelete={onDelete} loadTxYear={loadTxYear} />}
        {tab==="import"   && <DataImportView plan={plan} setPlan={setPlan} onGoToPlan={() => {}}/>}
        {tab==="tax"      && <TaxOptimizerView tx={tx} names={names} taxConfig={taxConfig} setTaxConfig={setTaxConfig}/>}
        {tab==="pred"     && <PredictionView tx={tx} fixed={fixed}/>}
        {tab==="asset"    && <AssetView assets={assets} setAssets={setAssets}/>}
      </div>
    </div>
  );
}
