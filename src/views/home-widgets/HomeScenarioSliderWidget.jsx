import { Card } from "../../components/UI";
import { SliderRow } from "../../components/SliderRow";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   paceDaily: number,
 *   paceMax: number,
 *   setPaceDaily: (v: number) => void,
 *   paceColor: string,
 *   projOver: boolean,
 *   projected: number,
 *   currentPaceDaily: number,
 *   defaultPaceVal: number
 * }} props
 */
export function HomeScenarioSliderWidget({
  paceDaily, paceMax, setPaceDaily, paceColor,
  projOver, projected, currentPaceDaily, defaultPaceVal
}) {
  return (
    <Card style={{ padding: "16px", marginBottom: 0, height: "100%", background: "#F3F4F6", border: "1px solid var(--border)", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>🎛 시나리오 조정</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>일 지출 조정 → 월말 예상 변화</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>조정 시 월말</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: projOver ? "var(--danger)" : "var(--success)" }}>{fmtS(projected)}원</div>
          <div style={{ fontSize: 10, color: projOver ? "var(--danger)" : "var(--success)", marginTop: 1 }}>{projOver ? "▲ 예산 초과" : "✓ 예산 내"}</div>
        </div>
      </div>
      <SliderRow
        label="일평균 목표 지출"
        value={paceDaily}
        min={0}
        max={paceMax}
        step={5000}
        onChange={setPaceDaily}
        fillColor={paceColor}
        formatVal={/** @param {number} v */ (v) => fmtS(v) + "원/일"}
        showReset
        onReset={() => setPaceDaily(Math.max(0, defaultPaceVal))}
        defaultValue={defaultPaceVal}
      />
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { label: "지금 페이스", val: currentPaceDaily, c: "var(--text-muted)" },
          { label: "조정 후",     val: paceDaily,        c: paceColor },
        ].map(b => (
          <div key={b.label} style={{ flex: 1, background: "var(--surface-alt)", borderRadius: 10, padding: "9px 12px" }}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>{b.label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: b.c }}>{fmtS(b.val)}<span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 2 }}>원/일</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
