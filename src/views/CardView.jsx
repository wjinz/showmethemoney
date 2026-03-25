import { useState } from "react";
import { Card, SectionHeader } from "../components/UI";
import { CARD_ICONS_LIST, CARD_PRESETS_COLOR, NOW } from "../constants";
import { fmt, fmtPeriodLabel, getBillingPeriod } from "../utils/helpers";

export function CardView({cards, setCards}){
  const [showAdd,setShowAdd]=useState(false);
  const [newC,setNewC]=useState({name:"",icon:"💳",color:"#1c2340",billingStartDay:1,billingEndDay:25,billingEndNextMonth:false,paymentDay:10});

  const add=()=>{
    if(!newC.name)return;
    setCards(prev=>[...prev,{...newC,id:Date.now()}]);
    setShowAdd(false);
    setNewC({name:"",icon:"💳",color:"#1c2340",billingStartDay:1,billingEndDay:25,billingEndNextMonth:false,paymentDay:10});
  };
  const del=id=>setCards(prev=>prev.filter(c=>c.id!==id));

  const preview=getBillingPeriod(newC);

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingBottom:10}}>
        <SectionHeader sub="Card Management" title="내 카드 관리"/>
        <button onClick={()=>setShowAdd(!showAdd)} style={{
          fontSize:12,fontWeight:700,background:showAdd?"var(--bg3)":"var(--goldL)",
          color:showAdd?"var(--text2)":"#fff",border:"none",borderRadius:10,padding:"8px 16px",cursor:"pointer",marginBottom:14,transition:"all .2s"
        }}>{showAdd?"닫기":"+ 카드 추가"}</button>
      </div>

      {showAdd && (
        <Card className="u2" style={{padding:"20px",marginBottom:16,border:`1px solid var(--gold)`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><div style={{fontSize:11,color:"var(--text2)",marginBottom:6}}>카드 이름</div>
              <input value={newC.name} onChange={e=>setNewC({...newC,name:e.target.value})} placeholder="예: 국민 노리체크" style={{width:"100%",background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",fontSize:13}}/>
            </div>
            <div><div style={{fontSize:11,color:"var(--text2)",marginBottom:6}}>아이콘</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {CARD_ICONS_LIST.map(i=>(
                  <button key={i} onClick={()=>setNewC({...newC,icon:i})} style={{width:28,height:28,borderRadius:6,border:newC.icon===i?"1px solid var(--gold)":"1px solid var(--border)",background:newC.icon===i?"var(--goldD)":"var(--bg4)",fontSize:14,cursor:"pointer"}}>{i}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"var(--text2)",marginBottom:8}}>브랜드 컬러</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {CARD_PRESETS_COLOR.map(c=>(
                <button key={c} onClick={()=>setNewC({...newC,color:c})} style={{width:24,height:24,borderRadius:"50%",background:c,border:newC.color===c?"2px solid #fff":"1px solid transparent",cursor:"pointer"}}/>
              ))}
            </div>
          </div>
          <div style={{background:"var(--bg3)",padding:"16px",borderRadius:14,marginBottom:16,border:"1px solid var(--border2)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"var(--gold)",marginBottom:12}}>정산 정보 설정</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><div style={{fontSize:10,color:"var(--text2)",marginBottom:4}}>이용 시작일</div>
                <input type="number" value={newC.billingStartDay} onChange={e=>setNewC({...newC,billingStartDay:parseInt(e.target.value)||1})} style={{width:"100%",background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",fontSize:13}}/>
              </div>
              <div><div style={{fontSize:10,color:"var(--text2)",marginBottom:4}}>이용 종료일</div>
                <input type="number" value={newC.billingEndDay} onChange={e=>setNewC({...newC,billingEndDay:parseInt(e.target.value)||1})} style={{width:"100%",background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",fontSize:13}}/>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <input type="checkbox" id="nextM" checked={newC.billingEndNextMonth} onChange={e=>setNewC({...newC,billingEndNextMonth:e.target.checked})}/>
              <label htmlFor="nextM" style={{fontSize:11,color:"var(--text2)"}}>종료일이 다음 달인가요? (B타입)</label>
            </div>
            <div><div style={{fontSize:10,color:"var(--text2)",marginBottom:4}}>결제일</div>
              <input type="number" value={newC.paymentDay} onChange={e=>setNewC({...newC,paymentDay:parseInt(e.target.value)||1})} style={{width:80,background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"6px 10px",fontSize:13}}/>
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid var(--border)",fontSize:11,color:"var(--text2)"}}>
              💡 오늘 기준 정산: <span style={{color:"var(--goldL)",fontWeight:700}}>{fmtPeriodLabel(preview.cycleStart,preview.cycleEnd)}</span> 이용분 → <span style={{color:"var(--goldL)",fontWeight:700}}>{preview.payDate.getMonth()+1}월 {preview.payDate.getDate()}일</span> 결제
            </div>
          </div>
          <button onClick={add} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"var(--gold)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"}}>카드 정보 저장</button>
        </Card>
      )}

      {cards.length===0?(
        <div style={{padding:"60px 20px",textAlign:"center",color:"var(--text3)",fontSize:13}}>
          아직 등록된 카드가 없어요.<br/>결제일 관리를 위해 카드를 추가해보세요!
        </div>
      ):cards.map(c=>(
        <Card key={c.id} className="u3" style={{padding:"18px",marginBottom:10,background:`linear-gradient(135deg,${c.color},${c.color}cc)`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:40,height:40,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{c.icon}</div>
              <div><div style={{fontSize:17,fontWeight:700,color:"#fff"}}>{c.name}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.7)"}}>{c.paymentDay}일 결제</div></div>
            </div>
            <button onClick={()=>del(c.id)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:16,cursor:"pointer"}}>✕</button>
          </div>
          <div style={{background:"rgba(0,0,0,0.15)",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>이용기간: {fmtPeriodLabel(getBillingPeriod(c).cycleStart,getBillingPeriod(c).cycleEnd)}</div>
            <div style={{fontSize:10,opacity:0.8}}>D-{getBillingPeriod(c).daysUntilPay}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
