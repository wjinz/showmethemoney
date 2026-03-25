import { useState } from "react";
import { INIT_BUDGETS } from "../constants";

export function SyncSetup({onDone}){
  const [tab,  setTab]  = useState("create"); // create | join
  const [code, setCode] = useState("");
  const [role, setRole] = useState("husband");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const genCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

  const handleCreate = async () => {
    setBusy(true); setErr("");
    const hid = genCode();
    try {
      const pairs = [
        [`${hid}_tx`,      JSON.stringify([])],
        [`${hid}_fixed`,   JSON.stringify([])],
        [`${hid}_install`, JSON.stringify([])],
        [`${hid}_cards`,   JSON.stringify([])],
        [`${hid}_budgets`, JSON.stringify(INIT_BUDGETS)],
        [`${hid}_names`,   JSON.stringify({husband:"남편",wife:"와이프"})],
        [`${hid}_plan`,    JSON.stringify({})],
        ["householdId",    JSON.stringify(hid)],
        ["myRole",         JSON.stringify(role)],
      ];
      for (const [k, v] of pairs) {
        localStorage.setItem(k, v);
      }
      onDone(hid, role);
    } catch(e) {
      setErr(`오류: ${e?.message||"알 수 없는 오류"}. 다시 시도해주세요.`);
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const hid = code.trim().toUpperCase();
    if (hid.length !== 6) { setErr("6자리 코드를 입력해주세요."); return; }
    setBusy(true); setErr("");
    try {
      const r = localStorage.getItem(`${hid}_tx`);
      if (!r) { setErr("코드를 찾을 수 없어요. 같은 기기에서 만든 코드인지 확인해주세요."); setBusy(false); return; }
      localStorage.setItem("householdId", JSON.stringify(hid));
      localStorage.setItem("myRole",      JSON.stringify(role));
      onDone(hid, role);
    } catch(e) {
      setErr(`연결 오류: ${e?.message||"알 수 없는 오류"}`); setBusy(false);
    }
  };

  return(
    <div style={{
      height:"100dvh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",padding:"24px",
      background:"var(--bg)",maxWidth:480,margin:"0 auto"
    }}>
      {/* 로고 */}
      <div style={{marginBottom:32,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>💰</div>
        <div className="serif" style={{fontSize:26,marginBottom:6}}>가정 경영 가계부</div>
        <div style={{fontSize:13,color:"var(--text2)"}}>부부가 함께 쓰는 가계부</div>
      </div>

      {/* 탭 */}
      <div style={{display:"flex",gap:6,marginBottom:24,width:"100%",maxWidth:340}}>
        {[{id:"create",l:"새 가계부 만들기"},{id:"join",l:"코드로 참여하기"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setErr("");}} style={{
            flex:1,padding:"11px",borderRadius:13,cursor:"pointer",fontWeight:700,fontSize:12,
            background:tab===t.id?"var(--goldD)":"var(--bg2)",
            border:`1px solid ${tab===t.id?"var(--gold)":"var(--border)"}`,
            color:tab===t.id?"var(--gold)":"var(--text2)"
          }}>{t.l}</button>
        ))}
      </div>

      {/* 카드 */}
      <div style={{
        background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:20,
        padding:"24px",width:"100%",maxWidth:340
      }}>
        {/* 역할 선택 */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,color:"var(--text2)",marginBottom:10}}>내 역할</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{id:"husband",l:"남편",e:"👨"},{id:"wife",l:"와이프",e:"👩"}].map(r=>(
              <button key={r.id} onClick={()=>setRole(r.id)} style={{
                padding:"14px",borderRadius:13,cursor:"pointer",fontWeight:700,fontSize:14,
                background:role===r.id?(r.id==="husband"?"var(--hD)":"var(--wD)"):"var(--bg3)",
                border:`1px solid ${role===r.id?(r.id==="husband"?"rgba(92,141,232,.4)":"rgba(217,127,168,.4)"):"var(--border)"}`,
                color:role===r.id?(r.id==="husband"?"var(--h)":"var(--w)"):"var(--text2)",
                display:"flex",flexDirection:"column",alignItems:"center",gap:6
              }}>
                <span style={{fontSize:28}}>{r.e}</span>
                <span>{r.l}</span>
              </button>
            ))}
          </div>
        </div>

        {tab==="join"&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"var(--text2)",marginBottom:8}}>가정 코드 6자리</div>
            <input
              value={code}
              onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="예: AB12CD"
              maxLength={6}
              style={{
                width:"100%",background:"var(--bg3)",border:"1px solid var(--border2)",
                borderRadius:12,padding:"14px 16px",color:"var(--text)",fontSize:20,
                fontWeight:700,letterSpacing:".15em",textAlign:"center",outline:"none"
              }}
            />
          </div>
        )}

        {err&&(
          <div style={{
            padding:"10px 14px",borderRadius:10,marginBottom:14,
            background:"var(--redD)",border:"1px solid rgba(170,32,32,.25)",
            fontSize:12,color:"var(--red)"
          }}>{err}</div>
        )}

        <button
          onClick={tab==="create"?handleCreate:handleJoin}
          disabled={busy}
          style={{
            width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",
            background:busy?"var(--bg3)":"var(--gold)",
            color:busy?"var(--text3)":"#fff",fontWeight:700,fontSize:15,
            transition:"all .2s"
          }}
        >
          {busy?"처리 중...":(tab==="create"?"가계부 만들기":"참여하기")}
        </button>

        {tab==="create"&&(
          <div style={{fontSize:11,color:"var(--text3)",marginTop:12,textAlign:"center",lineHeight:1.7}}>
            만들면 6자리 코드가 생성돼요.<br/>
            와이프에게 코드를 공유해서 함께 사용하세요.
          </div>
        )}
      </div>
    </div>
  );
}
