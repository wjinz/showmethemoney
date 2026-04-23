import { Card, SectionHeader, Bar } from "../components/UI";
import { fmt, fmtS } from "../utils/helpers";
import { PAY_METHODS } from "../constants";

export function TaxOptimizerView({tx, names, taxConfig, setTaxConfig}){
  const totalIncome = taxConfig.husbandIncome + taxConfig.wifeIncome;
  const threshold   = totalIncome * 0.25;

  const totalSpent = tx.reduce((s,t) => s + t.amount, 0);
  
  const byMethod = /** @type {{credit:number,debit:number,cash:number}} */ (PAY_METHODS.reduce((/** @type {Record<string,number>} */ acc, m) => {
    acc[m.id] = tx.filter(t => (t.payMethod || "credit") === m.id).reduce((s,t) => s + t.amount, 0);
    return acc;
  }, {}));

  const reachedThreshold = totalSpent >= threshold;
  const thresholdPct = Math.min(100, Math.round((totalSpent / threshold) * 100));

  return(
    <div style={{padding:"0 16px 96px", overflowY:"auto", height:"100%"}}>
      <div className="u1"><SectionHeader sub="Tax Optimization" title="연말정산 최적화"/></div>

      <Card className="u2" style={{padding:"20px", marginBottom:16, border:"1px solid var(--primary)"}}>
        <div style={{fontSize:11, color:"var(--text-muted)", marginBottom:6}}>총 소득 대비 지출 현황 (연간)</div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8}}>
          <div style={{fontSize:24, fontWeight:800}}>{fmt(totalSpent)}</div>
          <div style={{fontSize:12, color:"var(--text-faint)"}}>문턱값: {fmtS(threshold)}원 (25%)</div>
        </div>
        <Bar pct={thresholdPct} color="var(--primary)" h={10}/>
        <div style={{marginTop:12, fontSize:12, color:reachedThreshold?"var(--success)":"var(--text-muted)", fontWeight:700}}>
          {reachedThreshold 
            ? "✓ 소득공제 문턱을 넘었습니다! 지금부터는 체크카드/현금이 유리합니다." 
            : `문턱까지 ${fmtS(threshold - totalSpent)}원 남았습니다. 신용카드 사용을 권장합니다.`}
        </div>
      </Card>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16}}>
        <Card style={{padding:14}}>
          <div style={{fontSize:10, color:"var(--text-muted)", marginBottom:4}}>신용카드 (15%)</div>
          <div style={{fontSize:16, fontWeight:700}}>{fmtS(byMethod.credit)}원</div>
          <div style={{fontSize:10, color:"var(--text-faint)", marginTop:4}}>추정 공제: {fmtS(reachedThreshold ? byMethod.credit * 0.15 : 0)}원</div>
        </Card>
        <Card style={{padding:14}}>
          <div style={{fontSize:10, color:"var(--text-muted)", marginBottom:4}}>체크/현금 (30%)</div>
          <div style={{fontSize:16, fontWeight:700, color:"var(--primary)"}}>{fmtS(byMethod.debit + byMethod.cash)}원</div>
          <div style={{fontSize:10, color:"var(--text-faint)", marginTop:4}}>추정 공제: {fmtS(reachedThreshold ? (byMethod.debit + byMethod.cash) * 0.3 : 0)}원</div>
        </Card>
      </div>

      <Card className="u3" style={{padding:18, marginBottom:10}}>
        <div style={{fontSize:11, color:"var(--text-muted)", marginBottom:16, letterSpacing:".05em"}}>💡 오늘부터의 추천 결제 전략</div>
        {!reachedThreshold ? (
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <div style={{fontSize:32}}>💳</div>
            <div>
              <div style={{fontSize:14, fontWeight:700, marginBottom:2}}>신용카드 집중 사용</div>
              <div style={{fontSize:11, color:"var(--text-muted)", lineHeight:1.5}}>아직 총 소득의 25%를 채우지 못했습니다. 공제 혜택이 없으므로 포인트/할인 혜택이 많은 신용카드를 사용하세요.</div>
            </div>
          </div>
        ) : (
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <div style={{fontSize:32}}>🏦</div>
            <div>
              <div style={{fontSize:14, fontWeight:700, color:"var(--primary)", marginBottom:2}}>체크카드/현금영수증 권장</div>
              <div style={{fontSize:11, color:"var(--text-muted)", lineHeight:1.5}}>문턱값을 넘었습니다! 이제부터는 신용카드(15%)보다 공제율이 2배 높은 체크카드나 현금(30%)을 사용해야 환급금이 많아집니다.</div>
            </div>
          </div>
        )}
      </Card>

      <Card className="u4" style={{padding:18}}>
        <div style={{fontSize:11, color:"var(--text-muted)", marginBottom:14, letterSpacing:".05em"}}>⚙️ 소득 정보 설정</div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <div>
            <div style={{fontSize:10, color:"var(--text-faint)", marginBottom:4}}>{names.husband} 연봉</div>
            <input type="number" value={taxConfig.husbandIncome} onChange={e=>setTaxConfig({...taxConfig, husbandIncome:parseInt(e.target.value)||0})} style={{width:"100%", background:"var(--surface-alt)", border:"1px solid var(--border)", borderRadius:8, padding:"8px", fontSize:13}}/>
          </div>
          <div>
            <div style={{fontSize:10, color:"var(--text-faint)", marginBottom:4}}>{names.wife} 연봉</div>
            <input type="number" value={taxConfig.wifeIncome} onChange={e=>setTaxConfig({...taxConfig, wifeIncome:parseInt(e.target.value)||0})} style={{width:"100%", background:"var(--surface-alt)", border:"1px solid var(--border)", borderRadius:8, padding:"8px", fontSize:13}}/>
          </div>
        </div>
        <div style={{marginTop:12, fontSize:10, color:"var(--text-faint)", textAlign:"center"}}>
          * 입력하신 정보는 본인 기기에만 저장됩니다.
        </div>
      </Card>
    </div>
  );
}
