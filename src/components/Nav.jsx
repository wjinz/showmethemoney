export function Nav({view,setView}){
  const sides=[
    [{id:"home",  icon:"⌂", l:"홈"},    {id:"report",icon:"◈",l:"리포트"}],
    [{id:"asset", icon:"💰",l:"자산"},   {id:"fixed", icon:"📌",l:"고정비"}],
    // {id:"settings",icon:"⊙",l:"설정"} -> settings move to top or somewhere? 
    // Wait, the original had 4 buttons + 1 big center.
    // Total 5 slots in nav bar. 
  ];

  // Original sides:
  // sides[0]: home, report
  // sides[1]: fixed, settings
  
  // New sides (to fit assets):
  const newSides = [
    [{id:"home",  icon:"⌂", l:"홈"},    {id:"report",icon:"◈",l:"리포트"}],
    [{id:"asset", icon:"💰",l:"자산"},   {id:"settings",icon:"⊙",l:"설정"}]
  ];
  // I'll keep 'fixed' accessible via Report or Home maybe? 
  // No, let's keep it in nav. 
  // Maybe 3 on left, 2 on right? 
  
  const isEntry = view==="entry";
  return(
    <div style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:480,zIndex:100,
    }}>
      <div style={{
        position:"absolute",top:-28,left:"50%",transform:"translateX(-50%)",
        zIndex:101,
      }}>
        <button onClick={()=>setView("entry")} style={{
          width:60,height:60,borderRadius:"50%",
          background: isEntry
            ? "linear-gradient(135deg,#e2c97e,#c8a84b)"
            : "linear-gradient(135deg,var(--gold),var(--goldL))",
          border:`3px solid var(--bg)`,
          boxShadow: isEntry
            ? "0 0 0 4px rgba(200,168,75,.3), 0 6px 24px rgba(200,168,75,.5)"
            : "0 4px 20px rgba(200,168,75,.35)",
          cursor:"pointer",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          gap:1,
          transition:"all .2s",
          transform: isEntry ? "scale(1.08)" : "scale(1)",
        }}>
          <span style={{fontSize:22,lineHeight:1,color:"#fff",fontWeight:700}}>✚</span>
          <span style={{fontSize:8,fontWeight:800,color:"#fff",letterSpacing:".06em",lineHeight:1}}>입력</span>
        </button>
      </div>

      <div style={{
        background:"var(--nav-bg)",backdropFilter:"blur(20px)",
        borderTop:"1px solid var(--border)",
        display:"flex",alignItems:"center",
        padding:"8px 0 14px",
      }}>
        {/* 좌측 2개 */}
        {newSides[0].map(item=>(
          <button key={item.id} onClick={()=>setView(item.id)} style={{
            flex:1,background:"none",border:"none",cursor:"pointer",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",
            color:view===item.id?"var(--gold)":"var(--text3)",
            fontFamily:"Syne,sans-serif",transition:"color .2s"
          }}>
            <span style={{fontSize:19,lineHeight:1}}>{item.icon}</span>
            <span style={{fontSize:9,fontWeight:view===item.id?700:400,letterSpacing:".03em"}}>{item.l}</span>
          </button>
        ))}

        <div style={{flex:1}}/>

        {/* 우측 2개 (Fixed는 Settings 옆에 배치하거나 순서 조정) */}
        <button onClick={()=>setView("asset")} style={{
           flex:1,background:"none",border:"none",cursor:"pointer",
           display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",
           color:view==="asset"?"var(--gold)":"var(--text3)",
           fontFamily:"Syne,sans-serif",transition:"color .2s"
        }}>
          <span style={{fontSize:19,lineHeight:1}}>💰</span>
          <span style={{fontSize:9,fontWeight:view==="asset"?700:400,letterSpacing:".03em"}}>자산</span>
        </button>
        <button onClick={()=>setView("settings")} style={{
           flex:1,background:"none",border:"none",cursor:"pointer",
           display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0",
           color:view==="settings"?"var(--gold)":"var(--text3)",
           fontFamily:"Syne,sans-serif",transition:"color .2s"
        }}>
          <span style={{fontSize:19,lineHeight:1}}>⊙</span>
          <span style={{fontSize:9,fontWeight:view==="settings"?700:400,letterSpacing:".03em"}}>설정</span>
        </button>
      </div>
    </div>
  );
}
