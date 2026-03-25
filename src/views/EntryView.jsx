import { useState } from "react";
import { Card, Chip } from "../components/UI";
import { CAT, CATS } from "../constants";
import { fmtS, today_str } from "../utils/helpers";
import { runOCR } from "../utils/ocr";

export function EntryView({names,onSave,onDelete,tx,cards}){
  const [who,setWho]=useState("husband");
  const [amount,setAmount]=useState("");
  const [cat,setCat]=useState("");
  const [memo,setMemo]=useState("");
  const [cardId,setCardId]=useState("");
  const [payMethod,setPayMethod]=useState("credit");
  const [saved,setSaved]=useState(false);
  const [isOCR,setIsOCR]=useState(false);

  const press=(v)=>{if(v==="C")setAmount("");else if(v==="⌫")setAmount(amount.slice(0,-1));else if(amount.length<9)setAmount(amount+v);};
  const save=()=>{
    onSave({who,amount:parseInt(amount),cat,memo,cardId,payMethod,date:today_str()});
    setSaved(true); setTimeout(()=>{setSaved(false);setAmount("");setCat("");setMemo("");setCardId("");setPayMethod("credit");},1000);
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setIsOCR(true);
    try {
      const res = await runOCR(file);
      if(res.amount) setAmount(String(res.amount));
      if(res.cat) setCat(res.cat);
      if(res.memo) setMemo(res.memo);
    } catch(err) {
      alert("OCR 인계 오류: " + err.message);
    } finally {
      setIsOCR(false);
    }
  };

  const todayTx = tx.filter(t=>t.date===today_str()).sort((a,b)=>b.id-a.id);

  return(
    <div style={{padding:"0 16px 96px",overflowY:"auto",height:"100%"}}>
      <div className="u1" style={{padding:"22px 0 14px",display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
        <div className="serif" style={{fontSize:21}}>오늘의 지출 기록</div>
        <div style={{fontSize:11,color:"var(--text2)"}}>{today_str()}</div>
      </div>

      <div className="u2" style={{display:"flex",gap:4,marginBottom:12}}>
        {["husband","wife"].map(r=>(
          <button key={r} onClick={()=>setWho(r)} style={{
            flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:13,
            background:who===r?(r==="husband"?"var(--hD)":"var(--wD)"):"var(--bg2)",
            border:`1px solid ${who===r?(r==="husband"?"var(--h)":"var(--w)"):"var(--border)"}`,
            color:who===r?(r==="husband"?"var(--h)":"var(--w)"):"var(--text2)",
            transition:"all .2s"
          }}>{r==="husband"?names.husband:names.wife}</button>
        ))}
      </div>

      <Card className="u2" style={{padding:"14px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:10,padding:"0 4px"}}>
          <div style={{fontSize:11,color:"var(--text3)",fontWeight:700}}>AMOUNT</div>
          <div style={{fontSize:28,fontWeight:800,color:amount?"var(--text)":"var(--text3)"}}>{amount?parseInt(amount).toLocaleString():0}<span style={{fontSize:16,marginLeft:4}}>원</span></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
          {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v=>(
            <button key={v} onClick={()=>press(v)} style={{
              height:48,borderRadius:10,border:`1px solid var(--border)`,
              background:"var(--bg3)",fontSize:18,fontWeight:700,cursor:"pointer",
              color:v==="C"?"var(--red)":v==="⌫"?"var(--gold)":"var(--text)"
            }}>{v}</button>
          ))}
        </div>
      </Card>

      <div className="u3" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:12}}>
        {CATS.map(c=>(
          <button key={c.id} onClick={()=>setCat(c.id)} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"10px 0",
            borderRadius:12,cursor:"pointer",transition:"all .2s",
            background:cat===c.id?c.color+"22":"var(--bg2)",
            border:`1px solid ${cat===c.id?c.color:"var(--border)"}`,
            color:cat===c.id?c.color:"var(--text2)"
          }}>
            <span style={{fontSize:18}}>{c.icon}</span>
            <span style={{fontSize:11,fontWeight:cat===c.id?700:400}}>{c.label}</span>
          </button>
        ))}
      </div>

      <Card className="u4" style={{padding:12,marginBottom:12}}>
        <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="어디에 쓰셨나요? (선택)" style={{width:"100%",background:"none",border:"none",color:"var(--text)",fontSize:14,outline:"none",marginBottom:10,padding:"4px"}}/>
        {cards.length>0 && (
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingTop:10,borderTop:"1px solid var(--border2)",marginTop:10}}>
            {cards.map(c=>(
              <button key={c.id} onClick={()=>setCardId(cardId===c.id?"":c.id)} style={{
                flexShrink:0,padding:"6px 12px",borderRadius:8,fontSize:11,fontWeight:700,cursor:"pointer",
                background:cardId===c.id?c.color:"var(--bg3)",
                color:cardId===c.id?"#fff":"var(--text3)",
                border:`1px solid ${cardId===c.id?c.color:"var(--border)"}`
              }}>{c.icon} {c.name}</button>
            ))}
          </div>
        )}
      </Card>

      <div className="u4" style={{display:"flex",gap:6,marginBottom:12}}>
        {[
          {id:"credit",l:"신용카드",i:"💳"},
          {id:"debit",l:"체크/현금",i:"🏦"},
          {id:"cash",l:"현금영수증",i:"💵"}
        ].map(m=>(
          <button key={m.id} onClick={()=>setPayMethod(m.id)} style={{
            flex:1,padding:"10px",borderRadius:12,cursor:"pointer",fontSize:12,fontWeight:700,
            background:payMethod===m.id?"var(--goldD)":"var(--bg3)",
            border:`1px solid ${payMethod===m.id?"var(--gold)":"var(--border)"}`,
            color:payMethod===m.id?"var(--gold)":"var(--text2)",
            display:"flex",alignItems:"center",justifyContent:"center",gap:6
          }}><span>{m.i}</span>{m.l}</button>
        ))}
      </div>

      <div className="u5" style={{display:"flex",gap:8,marginBottom:20}}>
          <label style={{
            width:52,height:52,borderRadius:13,background:"var(--bg3)",border:"1px solid var(--border)",
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,flexShrink:0
          }}>
            <input type="file" accept="image/*" onChange={handleOCR} style={{display:"none"}} disabled={isOCR}/>
            {isOCR ? "⏳" : "📷"}
          </label>
          <button onClick={save} disabled={!amount||!cat} style={{
            flex:1,padding:"15px",
            background:saved?"var(--greenD)":(!amount||!cat)?"var(--bg3)":"var(--gold)",
            border:`1px solid ${saved?"var(--green)":(!amount||!cat)?"var(--border)":"transparent"}`,
            borderRadius:13,
            color:saved?"var(--green)":(!amount||!cat)?"var(--text3)":"#fff",
            fontWeight:700,fontSize:15,cursor:(!amount||!cat)?"default":"pointer",
            boxShadow:(!amount||!cat)||saved?"none":"0 4px 24px rgba(200,168,75,.3)",
            transition:"all .2s"
          }}>
            {saved?"✓ 저장됨":(!amount||!cat)?"금액과 카테고리 선택":`저장 · ${amount?parseInt(amount).toLocaleString():0}원`}
          </button>
      </div>

      <Card className="u5" style={{overflow:"hidden"}}>
        <div style={{padding:"12px 14px 8px",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:700}}>오늘 내역</span>
          <span style={{fontSize:12,fontWeight:700,color:"var(--gold)"}}>{fmtS(todayTx.reduce((s,t)=>s+t.amount,0))}원</span>
        </div>
        {todayTx.length===0?(
          <div style={{padding:"24px 14px",textAlign:"center",color:"var(--text3)",fontSize:12}}>
            오늘 입력된 내역이 없어요
          </div>
        ):todayTx.map(t=>{
          const c=CAT[t.cat]||CATS[8];
          return(
            <div key={t.id} style={{padding:"9px 14px",borderTop:"1px solid var(--border)",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:c.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{c.icon}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:1}}>
                  <span style={{fontSize:12,fontWeight:500}}>{c.label}</span>
                  <Chip who={t.who} names={names}/>
                </div>
                <div style={{fontSize:10,color:"var(--text2)"}}>{t.memo||"—"}</div>
              </div>
              <span style={{fontSize:13,fontWeight:700,color:"var(--text)",flexShrink:0}}>-{fmtS(t.amount)}원</span>
              <button onClick={()=>onDelete(t.id)} style={{
                width:26,height:26,borderRadius:7,border:"none",cursor:"pointer",
                background:"var(--redD)",color:"var(--red)",fontSize:13,
                display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
              }}>✕</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
