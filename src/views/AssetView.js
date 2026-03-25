import { useState } from "react";
import { Card, SectionHeader, Bar } from "../components/UI";
import { fmt, fmtS } from "../utils/helpers";

export function AssetView({assets, setAssets}){
  const [showAdd, setShowAdd] = useState(false);
  const [newA, setNewA] = useState({name:"", type:"account", amount:"", info:""});

  const add = () => {
    if(!newA.name || !newA.amount) return;
    setAssets(prev => [...prev, {...newA, id:Date.now(), amount:parseInt(newA.amount)}]);
    setShowAdd(false);
    setNewA({name:"", type:"account", amount:"", info:""});
  };

  const del = id => setAssets(prev => prev.filter(a => a.id !== id));

  const totalAssets = assets.filter(a => a.type !== "loan").reduce((s,a) => s+a.amount, 0);
  const totalLoans  = assets.filter(a => a.type === "loan").reduce((s,a) => s+a.amount, 0);
  const netWorth    = totalAssets - totalLoans;

  const types = [
    {id:"account", l:"계좌", e:"🏦"},
    {id:"cash",    l:"현금", e:"💵"},
    {id:"invest",  l:"투자", e:"📈"},
    {id:"loan",    l:"대출", e:"📉"},
  ];

  return(
    <div style={{padding:"0 16px 96px", overflowY:"auto", height:"100%"}}>
      <div className="u1" style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", paddingBottom:10}}>
        <SectionHeader sub="Net Worth Tracking" title="자산 및 순자산"/>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          fontSize:12, fontWeight:700, background:showAdd ? "var(--bg3)" : "var(--gold)",
          color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", marginBottom:14
        }}>{showAdd ? "닫기" : "+ 자산 추가"}</button>
      </div>

      <Card className="u2" style={{padding:"20px", marginBottom:16, background:"var(--goldD)", border:"1px solid var(--gold)"}}>
          <div style={{fontSize:11, color:"var(--text2)", marginBottom:4}}>현재 순자산</div>
          <div style={{fontSize:28, fontWeight:800, color:"var(--gold)"}}>{fmt(netWorth)}</div>
          <div style={{display:"flex", gap:16, marginTop:12, paddingTop:12, borderTop:"1px solid var(--border2)"}}>
            <div style={{flex:1}}>
              <div style={{fontSize:10, color:"var(--text2)"}}>총 자산</div>
              <div style={{fontSize:14, fontWeight:700, color:"var(--text)"}}>{fmtS(totalAssets)}원</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:10, color:"var(--text2)"}}>총 부채</div>
              <div style={{fontSize:14, fontWeight:700, color:"var(--red)"}}>{fmtS(totalLoans)}원</div>
            </div>
          </div>
      </Card>

      {showAdd && (
        <Card className="u-slide" style={{padding:"20px", marginBottom:16, border:"1px solid var(--gold)"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1.5fr", gap:10, marginBottom:14}}>
            <div>
              <div style={{fontSize:11, color:"var(--text2)", marginBottom:6}}>자산 종류</div>
              <select value={newA.type} onChange={e=>setNewA({...newA, type:e.target.value})} style={{width:"100%", background:"var(--bg4)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", color:"var(--text)"}}>
                {types.map(t=><option key={t.id} value={t.id}>{t.e} {t.l}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:11, color:"var(--text2)", marginBottom:6}}>자산/계좌명</div>
              <input value={newA.name} onChange={e=>setNewA({...newA, name:e.target.value})} placeholder="예: 카카오뱅크 세이프박스" style={{width:"100%", background:"var(--bg4)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", fontSize:13}}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11, color:"var(--text2)", marginBottom:6}}>현재 금액</div>
            <input type="number" value={newA.amount} onChange={e=>setNewA({...newA, amount:e.target.value})} style={{width:"100%", background:"var(--bg4)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", textAlign:"right", fontSize:16, fontWeight:700}}/>
          </div>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11, color:"var(--text2)", marginBottom:6}}>추가 메모 (선택)</div>
            <input value={newA.info} onChange={e=>setNewA({...newA, info:e.target.value})} placeholder="계좌번호 등" style={{width:"100%", background:"var(--bg4)", border:"1px solid var(--border)", borderRadius:10, padding:"10px", fontSize:13}}/>
          </div>
          <button onClick={add} style={{width:"100%", padding:"14px", borderRadius:12, border:"none", background:"var(--gold)", color:"#fff", fontWeight:700, fontSize:14}}>자산 등록하기</button>
        </Card>
      )}

      {types.map(type => {
        const filtered = assets.filter(a => a.type === type.id);
        if (filtered.length === 0) return null;
        const subtotal = filtered.reduce((s,a) => s+a.amount, 0);
        return (
          <div key={type.id} className="u3" style={{marginBottom:20}}>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:8, padding:"0 4px"}}>
              <span style={{fontSize:12, fontWeight:700, color:"var(--text2)"}}>{type.e} {type.l}</span>
              <span style={{fontSize:12, fontWeight:700}}>{fmtS(subtotal)}원</span>
            </div>
            {filtered.map(a => (
              <Card key={a.id} style={{padding:"12px 14px", marginBottom:8, display:"flex", alignItems:"center", gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:14, fontWeight:600}}>{a.name}</div>
                  {a.info && <div style={{fontSize:10, color:"var(--text2)"}}>{a.info}</div>}
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:14, fontWeight:700, color:a.type==="loan"?"var(--red)":"var(--text)"}}>{fmtS(a.amount)}원</div>
                  <button onClick={()=>del(a.id)} style={{fontSize:10, color:"var(--text3)", background:"none", border:"none", cursor:"pointer"}}>삭제</button>
                </div>
              </Card>
            ))}
          </div>
        );
      })}

      {assets.length === 0 && !showAdd && (
        <div style={{padding:"60px 20px", textAlign:"center", color:"var(--text3)", fontSize:13}}>
          자산 정보가 없습니다.<br/>매달 순자산의 변화를 추적해보세요.
        </div>
      )}
    </div>
  );
}
