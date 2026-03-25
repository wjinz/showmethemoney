export function Ring({pct=0,size=104,stroke=6,children}){
  const r=(size-stroke)/2, c=2*Math.PI*r, p=Math.min(pct,100)/100*c;
  const color=pct>100?"var(--red)":pct>85?"#d4b84a":"var(--green)";
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)",position:"absolute"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${p} ${c}`} strokeLinecap="round" style={{transition:"stroke-dasharray .7s"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        {children}
      </div>
    </div>
  );
}

export function Bar({pct=0,color="#888",h=5}){
  return(
    <div style={{background:"var(--track)",borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:pct>100?"var(--red)":color,borderRadius:99,transition:"width .7s ease",minWidth:pct>0?2:0}}/>
    </div>
  );
}

export function Chip({who,names}){
  const isH=who==="husband";
  return <span style={{fontSize:10,fontWeight:700,background:isH?"var(--hD)":"var(--wD)",color:isH?"var(--h)":"var(--w)",padding:"2px 7px",borderRadius:99,flexShrink:0}}>{isH?names.husband:names.wife}</span>;
}

export function Card({children,style={},className=""}){
  return <div className={className} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:18,...style}}>{children}</div>;
}

export function SectionHeader({sub,title}){
  return(
    <div style={{padding:"22px 0 14px"}}>
      <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:3}}>{sub}</div>
      <div className="serif" style={{fontSize:21}}>{title}</div>
    </div>
  );
}
