import { Card } from "../../components/UI";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   isOnTrack: boolean,
 *   remainingAtPace: number,
 *   currentPaceDaily: number,
 *   daysLeft: number,
 *   paceProgressPct: number,
 *   variableSpent: number,
 *   totalBudget: number
 * }} props
 */
export function HomePacePredictorWidget({
  isOnTrack, remainingAtPace, currentPaceDaily, daysLeft,
  paceProgressPct, variableSpent, totalBudget
}) {
  return (
    <Card
      style={{
        padding: "16px", marginBottom: 0, height: "100%", boxSizing: "border-box",
        border: isOnTrack ? "1px solid rgba(60,180,100,.25)" : "1px solid rgba(200,50,50,.25)",
        background: isOnTrack ? "rgba(60,180,100,.04)" : "rgba(200,50,50,.04)",
        display: "flex", flexDirection: "column", justifyContent: "space-between"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "var(--fluid-sm, 10px)", color: "var(--text2)", marginBottom: 4, letterSpacing: ".04em" }}>이 속도면 월말에</div>
          <div style={{ fontSize: "var(--fluid-lg, 28px)", fontWeight: 700, lineHeight: 1, color: isOnTrack ? "var(--green)" : "var(--red)", letterSpacing: "-.02em", whiteSpace: "nowrap" }}>
            {isOnTrack ? "+" : "-"}{fmtS(Math.abs(remainingAtPace))}<span style={{ fontSize: "var(--fluid-md, 14px)", marginLeft: 3 }}>원</span>
          </div>
          <div className="responsive-hide" style={{ fontSize: "var(--fluid-sm, 11px)", color: isOnTrack ? "var(--green)" : "var(--red)", marginTop: 5 }}>
            {isOnTrack ? `예산 ${fmtS(Math.abs(remainingAtPace))}원 남아요 ✓` : `예산 ${fmtS(Math.abs(remainingAtPace))}원 초과 ⚠`}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "var(--fluid-sm, 10px)", color: "var(--text2)", marginBottom: 3 }}>일평균 지출</div>
          <div style={{ fontSize: "var(--fluid-md, 18px)", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{fmtS(currentPaceDaily)}<span style={{ fontSize: "10px", color: "var(--text2)", marginLeft: 2 }}>/일</span></div>
          <div style={{ fontSize: "var(--fluid-sm, 10px)", color: "var(--text2)", marginTop: 2 }}>잔여 {daysLeft}일</div>
        </div>
      </div>
      <div>
        <div style={{ marginTop: 12, background: "var(--bg3)", borderRadius: 99, height: 5, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", borderRadius: 99, transition: "width .5s ease",
              width: `${Math.min(paceProgressPct, 100)}%`,
              background: isOnTrack
                ? "linear-gradient(90deg,var(--green),#5cba84)"
                : "linear-gradient(90deg,var(--gold),var(--red))",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--text3)" }}>
          <span>현재 {fmtS(variableSpent)}원</span>
          <span>월말 예상 {paceProgressPct}% 집행</span>
          <span>예산 {fmtS(totalBudget)}원</span>
        </div>
      </div>
    </Card>
  );
}
