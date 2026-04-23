import { Card } from "../../components/UI";
import { fmtS } from "../../utils/helpers";

/**
 * @param {{
 *   totalSalary: number,
 *   utilTarget: number,
 *   variableSpent: number,
 *   cardLimitOk: boolean,
 *   cardLimit: number,
 *   cardLeft: number,
 *   cardUsedPct: number,
 *   savingsRateColor: string,
 *   savingsRate: number,
 *   allowanceTotal: number,
 *   thisMonthCardSpend: number,
 *   onSettings: (v: string) => void
 * }} props
 */
export function HomeLimitStatusWidget({
  totalSalary, utilTarget, variableSpent, cardLimitOk, cardLimit, cardLeft,
  cardUsedPct, savingsRateColor, savingsRate, allowanceTotal,
  thisMonthCardSpend, onSettings
}) {
  return (
    <Card className="u3" style={{ padding: 0, marginBottom: 0, height: "100%", overflow: "hidden", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {totalSalary === 0 ? (
        <div style={{ padding: "24px 16px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>나의 수입과 예산 플랜을 짜보세요</div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.7 }}>
            예산 탭에서 급여와 저축 목표를 설정하면 한도와 저축률을 확인할 수 있습니다.
          </p>
          <button
            onClick={() => onSettings("budget")}
            style={{
              padding: "10px 24px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: "rgba(28,43,74,.08)", border: "1px solid var(--primary)", color: "var(--primary)", alignSelf: "center"
            }}
          >
            설정하러 가기
          </button>
        </div>
      ) : (
        <>
          <div style={{ padding: "16px 16px 14px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: "var(--fluid-sm, 10px)", color: "var(--text-muted)", marginBottom: 4, letterSpacing: ".04em", whiteSpace: "nowrap" }}>💳 카드 권장 한도 ({utilTarget}%)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: "var(--fluid-lg, 22px)", fontWeight: 800, color: cardLimitOk ? "var(--text)" : "var(--danger)", letterSpacing: "-.02em" }}>
                    {fmtS(variableSpent)}
                  </span>
                  <span style={{ fontSize: "var(--fluid-sm, 12px)", color: "var(--text-faint)", whiteSpace: "nowrap" }}>/ {fmtS(cardLimit)}원</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, paddingLeft: 8 }}>
                <div style={{
                  display: "inline-block", padding: "4px 10px", borderRadius: 99, fontSize: "clamp(9px, 3cqw, 11px)", fontWeight: 700,
                  background: cardLimitOk ? "rgba(60,180,100,.12)" : "rgba(200,50,50,.12)",
                  color: cardLimitOk ? "var(--success)" : "var(--danger)",
                  border: `1px solid ${cardLimitOk ? "rgba(60,180,100,.2)" : "rgba(200,50,50,.2)"}`,
                  whiteSpace: "nowrap"
                }}>
                  {cardLimitOk ? `${fmtS(cardLeft)}원 남음` : `${fmtS(Math.abs(cardLeft))}원 초과`}
                </div>
              </div>
            </div>
            <div style={{ background: "#F3F4F6", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 6, border: "1px solid var(--border)" }}>
              <div
                style={{
                  height: "100%", borderRadius: 99, transition: "width .5s ease",
                  width: `${cardUsedPct}%`,
                  background: cardUsedPct < 70
                    ? "linear-gradient(90deg,var(--success),#5cba84)"
                    : cardUsedPct < 90
                    ? "linear-gradient(90deg,var(--primary),#c8a030)"
                    : "linear-gradient(90deg,var(--primary),var(--danger))",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)", opacity: 0.8, marginTop: 4 }}>
              <span>사용률 {cardUsedPct}%</span>
              <span>남은 한도 {fmtS(cardLeft)}원</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: "1px solid var(--border)" }}>
            <div style={{ padding: "11px 16px", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 3 }}>📈 예상 여유</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: savingsRateColor }}>{totalSalary > 0 ? (savingsRate > 0 ? "+" : "") + savingsRate + "%" : "미정"}</div>
            </div>
            <div style={{ padding: "11px 16px", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 3 }}>👥 부부용돈</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>{fmtS(allowanceTotal)}원</div>
            </div>
            <div style={{ padding: "11px 16px" }}>
              <div style={{ fontSize: 9, color: "var(--text-faint)", marginBottom: 3 }}>📋 청구 예정</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{fmtS(thisMonthCardSpend)}원</div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
