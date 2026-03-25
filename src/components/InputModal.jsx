import { useState } from "react";
import { Card, Chip } from "../components/UI";
import { CAT, CATS } from "../constants";
import { today_str } from "../utils/helpers";
import { runOCR } from "../utils/ocr";

export function InputModal({defaultWho,names,onClose,onSave}){
  const [who,setWho]=useState(defaultWho);
  const [amount,setAmount]=useState("");
  const [cat,setCat]=useState("");
  const [memo,setMemo]=useState("");
  const [payMethod,setPayMethod]=useState("credit");
  const [isOCR,setIsOCR]=useState(false);

  const press=(v)=>{if(v==="C")setAmount("");else if(v==="⌫")setAmount(amount.slice(0,-1));else if(amount.length<9)setAmount(amount+v);};
  const save=()=>{ if(!amount||!cat)return; onSave({who,amount:parseInt(amount),cat,memo,payMethod,date:today_str()}); onClose(); };

  const handleOCR = async (e) => {
    const file = e.target.files[0]; if(!file)return;
    setIsOCR(true);
    try {
      const res = await runOCR(file);
      if(res.amount) setAmount(String(res.amount));
      if(res.cat) setCat(res.cat);
      if(res.memo) setMemo(res.memo);
    } catch(err) { alert("OCR 오류: "+err.message); }
    finally { setIsOCR(false); }
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={onClose}>
      <Card className="u-slide" style={{width:"100%",maxWidth:480,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",animation:"slideUp 0.3s ease-out"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:40,height:5,background:"var(--border2)",borderRadius:99,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div className="serif" style={{fontSize:22}}>지출 직접 입력</div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"var(--text3)",cursor:"pointer"}}>✕</button>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:20}}>
          {["husband","wife"].map(r=>(
            <button key={r} onClick={()=>setWho(r)} style={{
              flex:1,padding:"12px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:13,
              background:who===r?(r==="husband"?"var(--hD)":"var(--wD)"):"var(--bg2)",
              border:`1px solid ${who===r?(r==="husband"?"var(--h)":"var(--w)"):"var(--border)"}`,
              color:who===r?(r==="husband"?"var(--h)":"var(--w)"):"var(--text2)"
            }}>{r==="husband"?names.husband:names.wife}</button>
          ))}
        </div>

        <div style={{background:"var(--bg3)",borderRadius:16,padding:"20px",marginBottom:20,border:"1px solid var(--border2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:16}}>
            <div style={{fontSize:11,color:"var(--text3)",fontWeight:700}}>금액</div>
            <div style={{fontSize:32,fontWeight:800,color:amount?"var(--text)":"var(--text3)"}}>{amount?parseInt(amount).toLocaleString():0}<span style={{fontSize:18,marginLeft:4,fontWeight:500}}>원</span></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v=>(
              <button key={v} onClick={()=>press(v)} style={{height:52,borderRadius:12,border:"1px solid var(--border)",background:"var(--bg2)",fontSize:20,fontWeight:700,cursor:"pointer"}}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
          {CATS.map(c=>(
            <button key={c.id} onClick={()=>setCat(c.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 0",borderRadius:14,cursor:"pointer",
              background:cat===c.id?c.color+"22":"var(--bg3)",
              border:`1px solid ${cat===c.id?c.color:"var(--border)"}`,
              color:cat===c.id?c.color:"var(--text2)"
            }}>
              <span style={{fontSize:20}}>{c.icon}</span>
              <span style={{fontSize:11,fontWeight:cat===c.id?700:400}}>{c.label}</span>
            </button>
          ))}
        </div>

        <div style={{background:"var(--bg3)",borderRadius:14,padding:"4px 14px",marginBottom:20,border:"1px solid var(--border)"}}>
          <input value={memo} onChange={e=>setMemo(e.target.value)} placeholder="메모 입력 (선택)" style={{width:"100%",background:"none",border:"none",color:"var(--text)",fontSize:15,padding:"14px 0",outline:"none"}}/>
        </div>

        <div style={{display:"flex",gap:6,marginBottom:24,marginTop:-10}}>
          {[
            {id:"credit",l:"신용",i:"💳"},
            {id:"debit",l:"체크",i:"🏦"},
            {id:"cash",l:"현금",i:"💵"}
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

        <div style={{display:"flex",gap:10}}>
          <label style={{width:55,height:55,borderRadius:14,background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:22}}>
            <input type="file" accept="image/*" onChange={handleOCR} style={{display:"none"}} disabled={isOCR}/>
            {isOCR?"⏳":"📷"}
          </label>
          <button onClick={save} disabled={!amount||!cat} style={{
            flex:1,borderRadius:16,border:"none",fontSize:16,fontWeight:700,cursor:"pointer",
            background:(!amount||!cat)?"var(--bg3)":"var(--gold)",
            color:(!amount||!cat)?"var(--text3)":"#fff",
            boxShadow:(!amount||!cat)?"none":"0 8px 24px rgba(200,168,75,0.3)"
          }}>지출 저장하기</button>
        </div>
      </Card>
    </div>
  );
}
