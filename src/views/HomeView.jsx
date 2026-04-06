import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Sparkles, Settings, ScanLine } from "lucide-react";
import { Card, Chip } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { CAT, CATS, getYear, getMonth, getDay, getDaysInMonth } from "../constants";
import { fmtS } from "../utils/helpers";
import { TxEditModal } from "../components/TxEditModal";
import { THEME_TOKENS as T } from "../styles/tokens.js";

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 * @typedef {import('../constants/index.js').CardItem} CardItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').InstallItem} InstallItem
 */

/**
 * @param {{
 *   tx: TxItem[],
 *   budgets: Record<string, number>,
 *   fixed: FixedItem[],
 *   install: InstallItem[],
 *   names: Record<string, string>,
 *   onAdd: (who: string) => void,
 *   sliderCfg: { paceMaxDaily: number },
 *   onWidget: () => void,
 *   onScan: () => void,
 *   plan: Record<string, import('../constants/index.js').GoalItem[] | boolean | object | number | undefined>,
 *   setPlan: (v: object) => void,
 *   cards: CardItem[],
 *   onEdit: (id: number, updates: Partial<TxItem>) => void,
 *   onDelete: (id: number) => void,
 *   onSettings: (v: string) => void,
 *   sosPending: SosRequest[],
 *   onSosResolve: (id: number, status: 'approved' | 'rejected') => Promise<void>,
 * }} props
 */
export function HomeView({
  tx, budgets, fixed, install, names, onAdd, sliderCfg,
  onWidget: _onWidget, onScan, plan, setPlan: _setPlan, cards,
  onEdit, onDelete, onSettings,
  sosPending = [], onSosResolve,
}) {
  const [isTotalMode, setIsTotalMode] = useState(true);
  const YEAR  = getYear();
  const MONTH = getMonth();
  const DAY   = getDay();
  const DAYS  = getDaysInMonth(YEAR, MONTH);

  const totalBudget  = Object.values(budgets).reduce((s, v) => s + v, 0);
  const fixedTotal   = (fixed || []).reduce((s, f) => s + f.amount, 0);
  const installTotal = (install || []).reduce((s, i) => s + i.monthly, 0);

  const curMonthPrefix = `${YEAR}-${String(MONTH).padStart(2, "0")}`;
  const thisMonthTx = useMemo(() => tx.filter(t => t.date.startsWith(curMonthPrefix)), [tx, curMonthPrefix]);

  const variableSpent = useMemo(() => thisMonthTx.reduce((s, t) => s + t.amount, 0), [thisMonthTx]);
  const totalSpent    = variableSpent + fixedTotal + installTotal;
  const totalBudgetAll = totalBudget + fixedTotal + installTotal;

  const hSpent = useMemo(() => thisMonthTx.filter(t => t.who === "husband").reduce((s, t) => s + t.amount, 0), [thisMonthTx]);
  const wSpent = useMemo(() => thisMonthTx.filter(t => t.who === "wife").reduce((s, t) => s + t.amount, 0), [thisMonthTx]);

  const thisMonthCardSpend = useMemo(
    () => thisMonthTx.filter(t => (t.payMethod === "card" || t.payMethod === "credit")).reduce((s, t) => s + t.amount, 0),
    [thisMonthTx]
  );

  const ringPct = totalBudget > 0 ? Math.min(Math.round(variableSpent / totalBudget * 100), 100) : 0;
  const paceTarget   = Math.round(DAY / DAYS * totalBudget);
  const pacePct      = paceTarget > 0 ? Math.round(variableSpent / paceTarget * 100) : 0;
  const remaining    = totalBudget - variableSpent;
  const daysLeft     = Math.max(DAYS - DAY, 1);
  const defaultPaceVal = Math.min(Math.round(remaining / daysLeft), sliderCfg.paceMaxDaily);

  const [paceDaily, setPaceDaily] = useState(Math.max(0, defaultPaceVal));
  const paceMax    = sliderCfg.paceMaxDaily;
  const projected  = variableSpent + paceDaily * daysLeft;
  const projOver   = projected > totalBudget;
  const paceColor  = pacePct <= 90 ? "var(--green)" : pacePct <= 110 ? "#d4b84a" : "var(--red)";
  const paceStatus = pacePct <= 90 ? "안전한 페이스 ✓" : pacePct <= 110 ? "보통" : "주의";

  const currentPaceDaily = DAY > 0 ? Math.round(variableSpent / DAY) : 0;
  const projectedAtPace  = variableSpent + currentPaceDaily * daysLeft;

  const salary         = /** @type {{ husband: number, wife: number, savingsTarget: number }} */ (plan?.salary) || { husband: 0, wife: 0, savingsTarget: 0 };
  const utilTarget     = /** @type {number} */ (plan?.utilizationTarget) || 100;
  const totalSalary    = (salary.husband || 0) + (salary.wife || 0);
  const savingsTarget  = salary.savingsTarget || 0;
  const committed      = fixedTotal + installTotal;

  const monthlyAvailRaw = totalSalary - committed - savingsTarget;
  const cardLimit       = Math.max(Math.round(monthlyAvailRaw * utilTarget / 100), 0);
  const cardUsedPct     = cardLimit > 0 ? Math.min(Math.round(variableSpent / cardLimit * 100), 100) : 0;
  const cardLeft        = cardLimit - variableSpent;
  const cardLimitOk     = cardLeft >= 0;

  const estimatedSavings  = totalSalary - committed - projectedAtPace;
  const hasData           = thisMonthTx.length > 0;
  const savingsRate       = totalSalary > 0 ? Math.round(estimatedSavings / totalSalary * 100) : 0;
  const savingsRateColor  = totalSalary === 0 || !hasData ? "var(--text3)" : (savingsRate >= 20 ? "var(--green)" : savingsRate >= 10 ? "var(--gold)" : "var(--red)");
  const savingsRateLabel  = totalSalary === 0 ? "급여 미설정" : (!hasData ? "데이터 부족" : (savingsRate >= 20 ? "우수 (예상)" : savingsRate >= 10 ? "양호 (예상)" : savingsRate >= 0 ? "주의 ⚠" : "적자 ⚠"));

  const paceProgressPct = totalBudget > 0 ? Math.min(Math.round(projectedAtPace / totalBudget * 100), 130) : 0;
  const remainingAtPace = totalBudget - projectedAtPace;
  const isOnTrack       = remainingAtPace >= 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [showFull, setShowFull]     = useState(false);
  const [editItem, setEditItem]     = useState(/** @type {TxItem|null} */ (null));

  // AI 코치 말풍선 텍스트 (nudge API)
  const [nudgeText, setNudgeText] = useState("");
  useEffect(() => {
    if (thisMonthTx.length === 0) return;
    const ctrl = new AbortController();
    /** @type {Record<string, number>} */
    const summary = {};
    for (const t of thisMonthTx) {
      summary[t.cat] = (summary[t.cat] || 0) + t.amount;
    }
    fetch("/api/nudge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, budget: totalBudget, remaining }),
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.text) setNudgeText(data.text); })
      .catch(() => {/* nudge 실패는 조용히 처리 */});
    return () => ctrl.abort();
  }, [thisMonthTx.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // B8: 검색 결과 memoize
  const filteredTx = useMemo(() => {
    const pool = searchTerm ? tx : thisMonthTx;
    return pool.filter(t => {
      // 1. 개인 지출 필터링 — 홈 화면에는 공동 예산 지출만 노출
      if (t.is_private) return false;
      
      if (!searchTerm) return true;
      const label = CAT[t.cat]?.label || "";
      return (t.memo && t.memo.includes(searchTerm)) || label.includes(searchTerm);
    }).sort((a, b) => b.id - a.id);
  }, [tx, thisMonthTx, searchTerm]);

  /** SVG 링 circumference (r=40, viewBox 0 0 100 100) */
  const CIRC = 251;
  const ringDash = `${ringPct * (CIRC / 100)} ${CIRC}`;

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>

      {/* ── 헤더: Toss-스타일 대형 남은 예산 ── */}
      <div style={{ padding: "20px 0 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>
            이번 달 남은 공동 예산
          </p>
          <h1
            style={{
              fontSize: T.font.hero,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {fmtS(remaining)}
            <span style={{ fontSize: T.font.xxl, fontWeight: 700, marginLeft: 4 }}>원</span>
          </h1>
          <p style={{ fontSize: 11, color: "var(--text2)", marginTop: 4 }}>
            {YEAR}년 {MONTH}월 · {DAY}일차 · 잔여 {daysLeft}일
          </p>
        </div>
        <button
          onClick={() => onSettings("settings")}
          style={{
            marginTop: 4,
            width: 36, height: 36, borderRadius: T.radius.full,
            background: "var(--bg2)", border: "1px solid var(--border-solid)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text2)",
          }}
        >
          <Settings size={18} strokeWidth={2} />
        </button>
      </div>

      {/* ── 예산 링 카드 + 스캔 배너 ── */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: T.radius.xl,
          padding: 20,
          marginTop: 16,
          marginBottom: 12,
          border: "1px solid var(--border-solid)",
          boxShadow: T.shadow.sm,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>
            {isTotalMode ? "총 집행액" : "생활비 집행"}
          </p>
          <p style={{ fontSize: T.font.xl, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
            {fmtS(isTotalMode ? totalSpent : variableSpent)}원
          </p>
          {/* 토글 */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg3)",
              borderRadius: T.radius.md,
              padding: 3,
              border: "1px solid var(--border)",
              gap: 2,
            }}
          >
            {[
              { v: true,  label: "종합" },
              { v: false, label: "생활비" },
            ].map(({ v, label }) => (
              <button
                key={label}
                onClick={() => setIsTotalMode(v)}
                style={{
                  padding: "4px 10px", borderRadius: T.radius.sm, fontSize: 10,
                  fontWeight: 700, cursor: "pointer", border: "none",
                  background: isTotalMode === v ? "var(--gold)" : "none",
                  color: isTotalMode === v ? "#fff" : "var(--text2)",
                  transition: "all .2s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <span
            style={{
              display: "inline-block",
              fontSize: 10, fontWeight: 600, color: "var(--gold)",
              background: "var(--goldD)",
              padding: "3px 8px", borderRadius: T.radius.sm,
              marginLeft: 8,
            }}
          >
            {paceStatus}
          </span>
        </div>

        {/* SVG 링 애니메이션 */}
        <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
          <svg
            style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
            viewBox="0 0 100 100"
          >
            {/* 배경 트랙 */}
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg3)" strokeWidth="12" />
            {/* 진행 아크 */}
            <motion.circle
              cx="50" cy="50" r="40" fill="transparent"
              stroke="var(--gold)" strokeWidth="12"
              strokeDasharray={ringDash}
              initial={{ strokeDasharray: `0 ${CIRC}` }}
              animate={{ strokeDasharray: ringDash }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{ringPct}%</span>
            <span style={{ fontSize: 8, color: "var(--text3)", marginTop: 1 }}>집행</span>
          </div>
        </div>
      </div>

      {/* ── 고정비/할부/생활비 요약 바 ── */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8, marginBottom: 12,
        }}
      >
        {[
          { label: "📌 고정비", value: fixedTotal },
          { label: "💳 할부",   value: installTotal },
          { label: "🛒 생활비", value: variableSpent },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              background: "var(--bg2)",
              borderRadius: T.radius.lg,
              padding: "10px 12px",
              border: "1px solid var(--border-solid)",
            }}
          >
            <p style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)" }}>{fmtS(value)}원</p>
          </div>
        ))}
      </div>

      {/* ── AI 스캔 배너 ── */}
      <div
        onClick={onScan}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "linear-gradient(135deg, var(--goldD), var(--gold))",
          borderRadius: T.radius.lg, padding: "12px 16px",
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer", boxShadow: "0 4px 15px rgba(200,168,75,0.25)",
          transition: "opacity 0.2s",
          marginBottom: 12,
        }}
        onMouseOver={e => { e.currentTarget.style.opacity = "0.9"; }}
        onMouseOut={e => { e.currentTarget.style.opacity = "1"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.2)", borderRadius: T.radius.md,
              padding: 8, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <ScanLine size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>영수증 & 카드내역 자동 입력</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", marginTop: 1 }}>사진 한 장으로 여러 내역을 한꺼번에! ✨</div>
          </div>
        </div>
        <div style={{ fontSize: 16, color: "#fff", opacity: 0.8 }}>›</div>
      </div>

      {/* ── AI 코치 말풍선 ── */}
      <AnimatePresence>
        {nudgeText && (
          <motion.div
            key="ai-bubble"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{
              background: "linear-gradient(135deg, var(--ai-bubble-from), var(--ai-bubble-to))",
              padding: 20, marginBottom: 12,
              borderRadius: T.radius.xl,
              borderTopLeftRadius: 4,
              border: "1px solid var(--ai-bubble-border)",
              display: "flex", alignItems: "flex-start", gap: 14,
              boxShadow: T.shadow.sm,
            }}
          >
            <div
              style={{
                background: "var(--ai-icon-bg)",
                padding: 10, borderRadius: T.radius.full,
                color: "var(--ai-icon-color)",
                boxShadow: T.shadow.sm,
                flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ai-bubble-title)", marginBottom: 4 }}>AI 소비 코치</p>
              <p style={{ fontSize: 13, color: "var(--ai-bubble-text)", lineHeight: 1.6 }}>{nudgeText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SOS 대기 요청 (티켓 스타일 인라인) ── */}
      <AnimatePresence>
        {sosPending.length > 0 && (
          <motion.div
            key="sos-section"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ marginBottom: 12 }}
          >
            <p
              style={{
                fontSize: 14, fontWeight: 700, color: "var(--text)",
                marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
              }}
            >
              🚨 결재 대기 중인 요청
            </p>
            {sosPending.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                style={{
                  background: "var(--bg2)",
                  borderRadius: T.radius.xl,
                  border: "2px solid rgba(239,68,68,0.2)",
                  padding: 20, marginBottom: 10,
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* 빨간 왼쪽 테두리 — 티켓 효과 */}
                <div
                  style={{
                    position: "absolute", top: 0, left: 0,
                    width: 4, height: "100%", background: "#EF4444",
                    borderRadius: "24px 0 0 24px",
                  }}
                />
                <div style={{ paddingLeft: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>배우자의 애교 섞인 요청 🥺</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{req.reason}</p>
                    </div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#EF4444", flexShrink: 0, marginLeft: 12 }}>
                      {fmtS(req.amount)}원
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => onSosResolve && onSosResolve(req.id, "approved")}
                      style={{
                        flex: 1, padding: "11px 0",
                        background: "#EF4444", color: "#fff",
                        borderRadius: T.radius.lg, fontWeight: 700, fontSize: 13,
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        transition: "background 0.2s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = "#DC2626"; }}
                      onMouseOut={e => { e.currentTarget.style.background = "#EF4444"; }}
                    >
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      쿨하게 승인
                    </button>
                    <button
                      onClick={() => onSosResolve && onSosResolve(req.id, "rejected")}
                      style={{
                        padding: "11px 18px",
                        background: "rgba(239,68,68,0.1)", color: "#EF4444",
                        borderRadius: T.radius.lg, fontWeight: 700, fontSize: 13,
                        border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                        transition: "background 0.2s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
                      onMouseOut={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                    >
                      <XCircle size={16} strokeWidth={2} />
                      반려
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 페이스 예측 카드 ── */}
      <Card
        style={{
          padding: "16px", marginBottom: 10,
          border: isOnTrack ? "1px solid rgba(60,180,100,.25)" : "1px solid rgba(200,50,50,.25)",
          background: isOnTrack ? "rgba(60,180,100,.04)" : "rgba(200,50,50,.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 4, letterSpacing: ".04em" }}>이 속도면 월말에</div>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: isOnTrack ? "var(--green)" : "var(--red)", letterSpacing: "-.02em" }}>
              {isOnTrack ? "+" : "-"}{fmtS(Math.abs(remainingAtPace))}<span style={{ fontSize: 14, marginLeft: 3 }}>원</span>
            </div>
            <div style={{ fontSize: 11, color: isOnTrack ? "var(--green)" : "var(--red)", marginTop: 5 }}>
              {isOnTrack ? `예산 ${fmtS(Math.abs(remainingAtPace))}원 남아요 ✓` : `예산 ${fmtS(Math.abs(remainingAtPace))}원 초과 ⚠`}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 3 }}>일평균 지출</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{fmtS(currentPaceDaily)}<span style={{ fontSize: 10, color: "var(--text2)", marginLeft: 2 }}>원/일</span></div>
            <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 2 }}>잔여 {daysLeft}일</div>
          </div>
        </div>
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
      </Card>

      {/* ── 시나리오 조정 슬라이더 ── */}
      <Card style={{ padding: "16px", marginBottom: 10, background: "var(--bg4)", border: "1px solid var(--border2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>🎛 시나리오 조정</div>
            <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 3 }}>슬라이더로 일 지출 조정 → 월말 예상 변화</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: "var(--text2)" }}>조정 시 월말</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: projOver ? "var(--red)" : "var(--green)" }}>{fmtS(projected)}원</div>
            <div style={{ fontSize: 10, color: projOver ? "var(--red)" : "var(--green)", marginTop: 1 }}>{projOver ? "▲ 예산 초과" : "✓ 예산 내"}</div>
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
            { label: "지금 페이스", val: currentPaceDaily, c: "var(--text2)" },
            { label: "조정 후",     val: paceDaily,        c: paceColor },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, background: "var(--bg3)", borderRadius: 10, padding: "9px 12px" }}>
              <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 3 }}>{b.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: b.c }}>{fmtS(b.val)}<span style={{ fontSize: 10, color: "var(--text2)", marginLeft: 2 }}>원/일</span></div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── 카드 한도 & 저축률 ── */}
      <Card className="u3" style={{ padding: 0, marginBottom: 10, overflow: "hidden" }}>
        {totalSalary === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>나의 수입과 예산 플랜을 짜보세요</div>
            <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 18, lineHeight: 1.7 }}>
              예산 탭에서 급여와 저축 목표를 설정하면<br />
              지출 한도와 예상 저축률을<br />
              이곳에서 실시간으로 확인할 수 있습니다.
            </div>
            <button
              onClick={() => onSettings("budget")}
              style={{
                padding: "10px 24px", borderRadius: 11, cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: "var(--goldD)", border: "1px solid var(--gold)", color: "var(--gold)",
              }}
            >
              예산 설정하러 가기
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 4, letterSpacing: ".04em" }}>💳 이번달 카드 권장 한도 ({utilTarget}%)</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: cardLimitOk ? "var(--text)" : "var(--red)", letterSpacing: "-.02em" }}>
                      {fmtS(variableSpent)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>/ {fmtS(cardLimit)}원</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    display: "inline-block", padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: cardLimitOk ? "rgba(60,180,100,.12)" : "rgba(200,50,50,.12)",
                    color: cardLimitOk ? "var(--green)" : "var(--red)",
                    border: `1px solid ${cardLimitOk ? "rgba(60,180,100,.2)" : "rgba(200,50,50,.2)"}`,
                  }}>
                    {cardLimitOk ? `${fmtS(cardLeft)}원 남음` : `${fmtS(Math.abs(cardLeft))}원 초과`}
                  </div>
                </div>
              </div>
              <div style={{ background: "var(--bg4)", borderRadius: 99, height: 7, overflow: "hidden", marginBottom: 6, border: "1px solid var(--border)" }}>
                <div
                  style={{
                    height: "100%", borderRadius: 99, transition: "width .5s ease",
                    width: `${cardUsedPct}%`,
                    background: cardUsedPct < 70
                      ? "linear-gradient(90deg,var(--green),#5cba84)"
                      : cardUsedPct < 90
                      ? "linear-gradient(90deg,var(--gold),#c8a030)"
                      : "linear-gradient(90deg,var(--gold),var(--red))",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", opacity: 0.8, marginTop: 4 }}>
                <span>사용률 {cardUsedPct}%</span>
                <span>남은 한도 {fmtS(cardLeft)}원</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderTop: "1px solid var(--border)" }}>
              <div style={{ padding: "11px 16px", borderRight: "1px solid var(--border)" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>📈 이달 예상 여유자금(률)</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: savingsRateColor }}>{totalSalary > 0 ? (savingsRate > 0 ? "+" : "") + savingsRate + "%" : "미정"}</div>
                <div style={{ fontSize: 9, color: savingsRateColor, marginTop: 1, fontWeight: 700 }}>{savingsRateLabel}</div>
              </div>
              <div style={{ padding: "11px 16px" }}>
                <div style={{ fontSize: 9, color: "var(--text3)", marginBottom: 3 }}>📋 연회비/청구 예정</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{fmtS(thisMonthCardSpend)}원</div>
                <div style={{ fontSize: 9, color: "var(--text2)", marginTop: 1 }}>카드 사용액 기반</div>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── 파트너별 지출 (커플 모드) ── */}
      {!plan?.isSolo && (
        <Card className="u5" style={{ padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 10 }}>파트너별 지출</div>
          <div style={{ display: "flex", height: 5, borderRadius: 99, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${totalSpent > 0 ? hSpent / totalSpent * 100 : 50}%`, background: "var(--h)", transition: "width .7s ease" }} />
            <div style={{ flex: 1, background: "var(--w)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[{ w: "husband", a: hSpent }, { w: "wife", a: wSpent }].map(p => (
              <div key={p.w} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.w === "husband" ? "var(--h)" : "var(--w)" }} />
                <div>
                  <div style={{ fontSize: 10, color: "var(--text2)" }}>{p.w === "husband" ? names.husband : names.wife}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtS(p.a)}원</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["husband", "wife"].map(w => (
              <button
                key={w}
                onClick={() => onAdd(w)}
                style={{
                  background: w === "husband" ? "var(--hD)" : "var(--wD)",
                  border: `1px solid ${w === "husband" ? "rgba(92,141,232,.25)" : "rgba(217,127,168,.25)"}`,
                  borderRadius: 11, padding: "11px", cursor: "pointer",
                  color: w === "husband" ? "var(--h)" : "var(--w)", fontWeight: 700, fontSize: 13,
                  display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
                {w === "husband" ? names.husband : names.wife}
              </button>
            ))}
          </div>
        </Card>
      )}

      {plan?.isSolo && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => onAdd("husband")}
            style={{
              width: "100%", background: "var(--gold)", border: "none", borderRadius: T.radius.lg, padding: "16px",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 12px rgba(200,168,75,0.2)",
            }}
          >
            + 지출 추가하기
          </button>
        </div>
      )}

      {/* ── 최근 지출 내역 (업그레이드된 카드 리스트) ── */}
      <div
        style={{
          background: "var(--bg2)",
          borderRadius: T.radius.xl,
          border: "1px solid var(--border-solid)",
          boxShadow: T.shadow.sm,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            padding: "14px 16px 10px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            borderBottom: "1px solid var(--border-solid)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {searchTerm ? "검색 결과" : "최근 지출"}
          </span>
          <button
            onClick={() => setShowFull(!showFull)}
            style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {showFull ? "간략히" : "전체보기"}
          </button>
        </div>

        <div style={{ padding: "10px 16px" }}>
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔎 지출 처 또는 카테고리 검색"
            style={{
              width: "100%", background: "var(--bg3)", border: "1px solid var(--border-solid)",
              borderRadius: T.radius.md, padding: "8px 12px",
              color: "var(--text)", fontSize: 12, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {(() => {
          const displayList = showFull ? filteredTx : filteredTx.slice(0, 5);
          if (displayList.length === 0) {
            return (
              <div style={{ padding: "24px 16px", textAlign: "center", borderTop: "1px solid var(--border-solid)" }}>
                <div style={{ fontSize: 13, color: "var(--text2)" }}>내역이 없습니다.</div>
              </div>
            );
          }
          return displayList.map((t, idx) => {
            const c    = CAT[t.cat] || CATS[8];
            const card = t.cardId ? (cards || []).find(cc => cc.id === t.cardId) : null;
            const pmI  = t.payMethod === "credit" ? "💳" : t.payMethod === "debit" ? "🏦" : "💵";
            const pmL  = card ? card.label : (t.payMethod === "credit" ? "신용" : t.payMethod === "debit" ? "체크" : "현금");
            const isLast = idx === displayList.length - 1;
            return (
              <div
                key={t.id}
                onClick={() => setEditItem(t)}
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid var(--border-solid)",
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", transition: "background .15s",
                  borderBottom: isLast ? "none" : undefined,
                }}
                onMouseOver={e => { e.currentTarget.style.background = "var(--bg3)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "none"; }}
              >
                <div
                  style={{
                    width: 44, height: 44,
                    borderRadius: T.radius.md,
                    background: c.color + "1a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  {c.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{c.label}</span>
                    {!plan?.isSolo && <Chip who={t.who} names={names} />}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text3)" }}>
                    <span style={{ color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.memo || "—"}
                    </span>
                    <span>·</span>
                    <span
                      style={{
                        background: "var(--bg3)", padding: "1px 4px", borderRadius: 4,
                        fontSize: 9, display: "flex", alignItems: "center", gap: 2,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span>{pmI}</span>
                      <span>{pmL}</span>
                    </span>
                    <span>·</span>
                    <span>{t.date.slice(5)}</span>
                  </div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, flexShrink: 0, color: "var(--text)" }}>
                  -{fmtS(t.amount)}원
                </span>
              </div>
            );
          });
        })()}
      </div>

      {editItem && (
        <TxEditModal
          tx={editItem} cards={cards} names={names} plan={plan}
          onEdit={/** @param {number} id @param {Partial<TxItem>} updates */ (id, updates) => { onEdit(id, updates); setEditItem(null); }}
          onDelete={/** @param {number} id */ (id) => { onDelete(id); setEditItem(null); }}
          onClose={() => setEditItem(null)}
        />
      )}
    </div>
  );
}
