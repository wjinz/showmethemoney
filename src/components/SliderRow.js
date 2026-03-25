import { fmt, fmtS } from '../utils/helpers';

export function SliderRow({ label, value, min, max, step=1000, onChange, fillColor, formatVal, showReset=false, onReset, defaultValue }) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct     = max > min ? ((clamped - min) / (max - min)) * 100 : 0;
  const fill    = fillColor || "var(--gold)";
  const trackBg = `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, var(--track) ${pct}%, var(--track) 100%)`;

  return (
    <div style={{marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <span style={{fontSize:12,color:"var(--text2)"}}>{label}</span>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {showReset && (
            <button onClick={onReset} style={{
              fontSize:10,color:"var(--text3)",background:"var(--dim)",
              border:"1px solid var(--border)",borderRadius:6,padding:"2px 7px",cursor:"pointer"
            }}>초기화</button>
          )}
          <span style={{fontSize:15,fontWeight:700,color:fill,letterSpacing:"-.01em"}}>
            {formatVal ? formatVal(clamped) : fmt(clamped)}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={clamped}
        onChange={e => onChange(+e.target.value)}
        style={{ background: trackBg }}
      />
      <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
        <span style={{fontSize:10,color:"var(--text3)"}}>
          {formatVal ? formatVal(min) : fmtS(min)+"원"}
        </span>
        <span style={{fontSize:10,color:"var(--text3)"}}>
          {formatVal ? formatVal(max) : fmtS(max)+"원"}
        </span>
      </div>
    </div>
  );
}
