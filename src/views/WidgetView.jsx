import { Ring } from "../components/UI";
import { fmt, fmtS } from "../utils/helpers";
import { DAY, DAYS, MONTH, YEAR } from "../constants";

export function WidgetView({tx, budgets, names, onClose}){
  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const totalSpent  = tx.reduce((s,t)=>s+t.amount,0);
  const pct         = Math.round(totalSpent / totalBudget * 100);
  
  const paceTarget = Math.round(DAY/DAYS * totalBudget);
  const pacePct    = paceTarget>0 ? Math.round(totalSpent/paceTarget*100) : 0;
  
  const paceColor = pacePct<=90 ? "#4ade80" : pacePct<=110 ? "#fbbf24" : "#f87171";
  const paceLabel = pacePct<=90 ? "안전" : pacePct<=110 ? "보통" : "과소비";

  return(
    <div style={{
      position:"fixed", inset:0, zIndex:1000, background:"#0f172a", // Darker premium navy
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:24, color:"#fff", fontFamily:"Syne, sans-serif"
    }}>
      <button onClick={onClose} style={{position:"absolute", top:20, right:20, background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"50%", width:40, height:40, color:"#fff", cursor:"pointer", fontSize:20}}>✕</button>
      
      <div style={{textAlign:"center", marginBottom:48}}>
        <div style={{fontSize:14, color:"#94a3b8", letterSpacing:".2em", marginBottom:8}}>{MONTH}월 지출 페이스</div>
        <div style={{fontSize:48, fontWeight:800, color:paceColor}}>{paceLabel}</div>
      </div>

      <div style={{position:"relative", marginBottom:48}}>
        <Ring pct={pct} size={280} stroke={20} trackColor="rgba(255,255,255,0.05)">
            <div style={{fontSize:56, fontWeight:800, color:"#fff"}}>{pct}%</div>
            <div style={{fontSize:14, color:"#94a3b8", marginTop:4}}>전체 예산 집행</div>
        </Ring>
      </div>

      <div style={{width:"100%", maxWidth:320}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:24}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:12, color:"#94a3b8", marginBottom:4}}>현재 지출</div>
            <div style={{fontSize:20, fontWeight:700}}>{fmtS(totalSpent)}원</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:12, color:"#94a3b8", marginBottom:4}}>예산 목표</div>
            <div style={{fontSize:20, fontWeight:700}}>{fmtS(totalBudget)}원</div>
          </div>
        </div>

        <div style={{background:"rgba(255,255,255,0.05)", borderRadius:20, padding:20, textAlign:"center"}}>
          <div style={{fontSize:13, color:"#cbd5e1", lineHeight:1.6}}>
             {pacePct <= 100 
               ? `✓ 목표치보다 ${fmtS(paceTarget - totalSpent)}원 아껴 쓰고 있습니다. 이 페이스라면 월말에 여유자금이 생깁니다!`
               : `⚠ 목표치보다 ${fmtS(totalSpent - paceTarget)}원 더 많이 썼습니다. 다음 주에는 지출을 조금 줄여볼까요?`
             }
          </div>
        </div>
      </div>

      <div style={{position:"absolute", bottom:40, fontSize:10, color:"#475569", letterSpacing:".1em"}}>FOCUS MODE ENABLED</div>
    </div>
  );
}
