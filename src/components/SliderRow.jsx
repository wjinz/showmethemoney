import { fmt as _fmt, fmtS, fmtC } from '../utils/helpers';

/**
 * @param {{
 *   label: string,
 *   value: number,
 *   min: number,
 *   max: number,
 *   step?: number,
 *   onChange: (v: number) => void,
 *   fillColor?: string,
 *   formatVal?: (n: number) => string,
 *   showReset?: boolean,
 *   onReset?: () => void,
 *   defaultValue?: number,
 * }} props
 */
export function SliderRow({
  label, value, min, max, step = 1000, onChange,
  fillColor, formatVal, showReset = false, onReset,
  defaultValue: _defaultValue,
}) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0;
  const fill = fillColor || "var(--primary)";
  const trackBg = `linear-gradient(to right, ${fill} 0%, ${fill} ${pct}%, var(--border) ${pct}%, var(--border) 100%)`;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {showReset && (
            <button onClick={onReset} style={{
              fontSize: 10, color: "var(--text-muted)", background: "var(--surface-alt)",
              border: "1px solid var(--border)", borderRadius: 6, padding: "2px 7px", cursor: "pointer",
              fontFamily: "inherit",
            }}>초기화</button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: fill, letterSpacing: "-.01em" }}>
            {formatVal ? formatVal(clamped) : fmtC(clamped) + "원"}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={clamped}
        onChange={(e) => onChange(+e.target.value)}
        style={{ background: trackBg }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
          {formatVal ? formatVal(min) : fmtS(min) + "원"}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-faint)" }}>
          {formatVal ? formatVal(max) : fmtS(max) + "원"}
        </span>
      </div>
    </div>
  );
}
