import { Card, SectionHeader } from "../components/UI";
import { CAT, CATS } from "../constants";
import { fmtS } from "../utils/helpers";

export function PredictionView({tx, fixed}){
  // 간단한 패턴 매칭: 최근 3개월간 월 1회 이상 발생한 항목 추출 (고정비 제외)
  const findRecurring = () => {
    const fixedMemos = fixed.map(f => f.name);
    const groups = {};
    
    tx.forEach(t => {
      if (fixedMemos.includes(t.memo)) return;
      const key = `${t.cat}_${t.memo || "unnamed"}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const predictions = [];
    Object.entries(groups).forEach(([key, items]) => {
      const months = new Set(items.map(i => i.date.slice(0, 7)));
      if (months.size >= 2) { // 2개월 이상 발생
        const avg = Math.round(items.reduce((s,i) => s + i.amount, 0) / items.length);
        const [catId, memo] = key.split("_");
        predictions.push({ catId, memo: memo === "unnamed" ? "" : memo, avg, count: months.size });
      }
    });

    return predictions.sort((a,b) => b.avg - a.avg);
  };

  const predictions = findRecurring();

  return(
    <div style={{padding:"0 16px 96px", overflowY:"auto", height:"100%"}}>
      <div className="u1"><SectionHeader sub="Smart Forecasting" title="지능형 지출 예측"/></div>

      <Card className="u2" style={{padding:18, marginBottom:16}}>
        <div style={{fontSize:11, color:"var(--text-muted)", marginBottom:14}}>💡 과거 데이터를 기반으로 한 이번 달 예상 지출</div>
        <div style={{fontSize:13, color:"var(--text)"}}>
          고정비로 등록되지 않았지만 매달 반복되는 지출 패턴을 분석했습니다.
        </div>
      </Card>

      {predictions.length === 0 ? (
        <div style={{padding:"40px 20px", textAlign:"center", color:"var(--text-faint)", fontSize:13}}>
          분석을 위한 데이터가 부족합니다.<br/>지출 내역이 쌓이면 자동으로 예측을 시작합니다.
        </div>
      ) : predictions.map((p, idx) => {
        const c = CAT[p.catId] || CATS[8];
        return (
          <Card key={idx} style={{padding:"14px 16px", marginBottom:10, display:"flex", alignItems:"center", gap:14}}>
            <div style={{width:40, height:40, borderRadius:12, background:c.color+"1a", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20}}>
              {c.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14, fontWeight:700}}>{p.memo || c.label}</div>
              <div style={{fontSize:10, color:"var(--text-faint)"}}>{p.count}개월 지출 패턴 분석됨</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:15, fontWeight:800, color:"var(--primary)"}}>~{fmtS(p.avg)}원</div>
              <div style={{fontSize:9, color:"var(--text-faint)"}}>평균 지출액</div>
            </div>
          </Card>
        );
      })}

      <Card style={{padding:16, marginTop:10, background:"var(--surface-alt)", border:"1px solid var(--border)"}}>
        <div style={{fontSize:11, fontWeight:700, color:"var(--text-muted)", marginBottom:8}}>📊 AI 예측 알림</div>
        <div style={{fontSize:11, color:"var(--text-faint)", lineHeight:1.5}}>
          계절성 지출(여름 냉방비, 겨울 난방비)이나 정기 구독 서비스 등 잊기 쉬운 지출을 미리 예산에 반영해 보세요. 
          항목 우측의 버튼을 통해 바로 고정비로 등록할 수 있는 기능이 곧 추가될 예정입니다.
        </div>
      </Card>
    </div>
  );
}
