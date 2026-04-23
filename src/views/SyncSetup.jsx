import { useState } from "react";
import { INIT_BUDGETS, EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS, DEFAULT_TAX_CONFIG } from "../constants";
import { db } from "../utils/supabase";

export function SyncSetup({onDone}){
  const [tab,  setTab]  = useState("create"); // create | join
  const [mode, setMode] = useState("couple"); // couple | solo
  const [code, setCode] = useState("");
  const [role, setRole] = useState("husband");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  const genCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

  const handleCreate = async () => {
    setBusy(true); setErr("");
    const hid = genCode();
    try {
      // 1. Supabase에 초기화 데이터를 업로드하여 다른 기기에서도 접근 가능하게 함
      const isSolo = mode === "solo";
      const initialUploads = [
        db.save(hid, "tx",        EMPTY_TX),
        db.save(hid, "fixed",     EMPTY_FIXED),
        db.save(hid, "install",   EMPTY_INSTALL),
        db.save(hid, "cards",     EMPTY_CARDS),
        db.save(hid, "assets",    EMPTY_ASSETS),
        db.save(hid, "budgets",   INIT_BUDGETS),
        db.save(hid, "names",     isSolo ? { husband: "나", wife: "" } : { husband: "남편", wife: "와이프" }),
        db.save(hid, "plan",      { isSolo }),
        db.save(hid, "taxConfig", DEFAULT_TAX_CONFIG)
      ];
      await Promise.all(initialUploads);

      // 2. 완료 콜백 호출 (저장은 App.jsx에서 통합 처리)
      onDone(hid, role);
    } catch(e) {
      console.error("Create error:", e);
      setErr(`오류: ${e?.message || "클라우드 저장 실패"}. 네트워크를 확인해주세요.`);
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const hid = code.trim().toUpperCase();
    if (hid.length !== 6) { setErr("6자리 코드를 입력해주세요."); return; }
    setBusy(true); setErr("");
    try {
      // 1. Supabase에서 해당 가계부 데이터가 실제로 존재하는지 확인 (10초 타임아웃)
      const data = await Promise.race([
        db.loadAll(hid),
        new Promise((_, reject) => setTimeout(() => reject(new Error("네트워크 타임아웃")), 10000))
      ]);
      
      // 데이터가 비어있으면 (key/value 쌍이 하나도 없으면) 잘못된 코드로 판단
      if (!data || Object.keys(data).length === 0) {
        setErr("유효하지 않은 코드입니다. 코드를 다시 확인해주세요.");
        setBusy(false);
        return;
      }

      // 2. 존재하면 진입 (개선 2: 역할 중복 경고 추가)
      const existingNames = data.names || {};
      const isHusbandTaken = role === 'husband' && existingNames.husband && existingNames.husband !== '남편' && existingNames.husband !== '나';
      const isWifeTaken = role === 'wife' && existingNames.wife && existingNames.wife !== '와이프' && existingNames.wife !== '';

      if (isHusbandTaken || isWifeTaken) {
        const displayName = existingNames[role];
        if (!window.confirm(`이미 '${displayName}'님이 사용 중인 역할일 수 있습니다. 그래도 이 역할로 합류하시겠습니까?`)) {
          setBusy(false);
          return;
        }
      }

      onDone(hid, role);
    } catch(e) {
      console.error("Join error:", e);
      setErr(`연결 오류: ${e?.message || "네트워크를 확인해주세요."}`);
      setBusy(false);
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
        <div style={{fontSize:13,color:"var(--text-muted)"}}>부부가 함께 쓰는 가계부</div>
      </div>

      {/* 탭/모드 선택 */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24,width:"100%",maxWidth:340}}>
        <div style={{display:"flex",gap:6}}>
          {[{id:"create",l:"새 가계부 만들기"},{id:"join",l:"코드로 참여하기"}].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);setErr("");}} style={{
              flex:1,padding:"11px",borderRadius:13,cursor:"pointer",fontWeight:700,fontSize:12,
              background:tab===t.id?"rgba(28,43,74,.08)":"var(--surface)",
              border:`1px solid ${tab===t.id?"var(--primary)":"var(--border)"}`,
              color:tab===t.id?"var(--primary)":"var(--text-muted)"
            }}>{t.l}</button>
          ))}
        </div>
        
        {tab==="create" && (
          <div style={{display:"flex",gap:6,background:"var(--surface-alt)",padding:4,borderRadius:14,border:"1px solid var(--border)"}}>
            {[{id:"couple",l:"👥 부부가 함께",e:"👨‍👩‍👧"},{id:"solo",l:"👤 나 혼자 관리",e:"🙋‍♂️"}].map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{
                flex:1,padding:"10px",borderRadius:11,cursor:"pointer",fontSize:11,fontWeight:700,
                background:mode===m.id?"var(--bg)":"transparent",
                border:"none",
                boxShadow:mode===m.id?"0 2px 8px rgba(0,0,0,0.2)":"none",
                color:mode===m.id?"var(--primary)":"var(--text-faint)",
                display:"flex",alignItems:"center",justifyContent:"center",gap:6
              }}>{m.e} {m.l}</button>
            ))}
          </div>
        )}
      </div>

      {/* 카드 */}
      <div style={{
        background:"var(--surface)",border:"1px solid var(--border)",borderRadius:20,
        padding:"24px",width:"100%",maxWidth:340
      }}>
        {/* 역할 선택 (커플 모드 또는 참여하기 시) */}
        {(tab==="join" || (tab==="create" && mode==="couple")) && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:10}}>내 역할</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{id:"husband",l:"남편",e:"👨"},{id:"wife",l:"와이프",e:"👩"}].map(r=>(
                <button key={r.id} onClick={()=>setRole(r.id)} style={{
                  padding:"14px",borderRadius:13,cursor:"pointer",fontWeight:700,fontSize:14,
                  background:role===r.id?(r.id==="husband"?"var(--hD)":"var(--wD)"):"var(--surface-alt)",
                  border:`1px solid ${role===r.id?(r.id==="husband"?"rgba(92,141,232,.4)":"rgba(217,127,168,.4)"):"var(--border)"}`,
                  color:role===r.id?(r.id==="husband"?"var(--h)":"var(--w)"):"var(--text-muted)",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:6
                }}>
                  <span style={{fontSize:28}}>{r.e}</span>
                  <span>{r.l}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab==="join"&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,color:"var(--text-muted)",marginBottom:8}}>가정 코드 6자리</div>
            <input
              value={code}
              onChange={e=>setCode(e.target.value.toUpperCase().slice(0,6))}
              placeholder="예: AB12CD"
              maxLength={6}
              style={{
                width:"100%",background:"var(--surface-alt)",border:"1px solid var(--border)",
                borderRadius:12,padding:"14px 16px",color:"var(--text)",fontSize:20,
                fontWeight:700,letterSpacing:".15em",textAlign:"center",outline:"none"
              }}
            />
          </div>
        )}

        {err&&(
          <div style={{
            padding:"10px 14px",borderRadius:10,marginBottom:14,
            background:"var(--danger-bg1)",border:"1px solid rgba(170,32,32,.25)",
            fontSize:12,color:"var(--danger)"
          }}>{err}</div>
        )}

        <button
          onClick={tab==="create"?handleCreate:handleJoin}
          disabled={busy}
          style={{
            width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",
            background:busy?"var(--surface-alt)":"var(--primary)",
            color:busy?"var(--text-faint)":"#fff",fontWeight:700,fontSize:15,
            transition:"all .2s"
          }}
        >
          {busy?"처리 중...":(tab==="create"?"가계부 만들기":"참여하기")}
        </button>

        {tab==="create"&&(
          <div style={{fontSize:11,color:"var(--text-faint)",marginTop:12,textAlign:"center",lineHeight:1.7}}>
            만들면 6자리 코드가 생성돼요.<br/>
            와이프에게 코드를 공유해서 함께 사용하세요.
          </div>
        )}
      </div>
    </div>
  );
}
