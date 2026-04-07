import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Sparkles, Settings, ScanLine, Edit2, Check } from "lucide-react";
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import debounce from 'lodash.debounce';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { Card, Chip } from "../components/UI";
import { SliderRow } from "../components/SliderRow";
import { CAT, CATS, getYear, getMonth, getDay, getDaysInMonth, DEFAULT_HOME_LAYOUT } from "../constants";
import { fmtS } from "../utils/helpers";
import { TxEditModal } from "../components/TxEditModal";
import { THEME_TOKENS as T } from "../styles/tokens.js";

// Home Widgets
import { HomeHeroWidget } from "./home-widgets/HomeHeroWidget.jsx";
import { HomeExecutionSummaryWidget } from "./home-widgets/HomeExecutionSummaryWidget.jsx";
import { HomeAiCoachWidget } from "./home-widgets/HomeAiCoachWidget.jsx";
import { HomeSosPendingWidget } from "./home-widgets/HomeSosPendingWidget.jsx";
import { HomePacePredictorWidget } from "./home-widgets/HomePacePredictorWidget.jsx";
import { HomeScenarioSliderWidget } from "./home-widgets/HomeScenarioSliderWidget.jsx";
import { HomeLimitStatusWidget } from "./home-widgets/HomeLimitStatusWidget.jsx";
import { HomePartnerSpendingWidget } from "./home-widgets/HomePartnerSpendingWidget.jsx";
import { HomeRecentTxWidget } from "./home-widgets/HomeRecentTxWidget.jsx";

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 * @typedef {import('../constants/index.js').CardItem} CardItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').InstallItem} InstallItem
 * @typedef {import('../constants/index.js').WidgetLayoutItem} WidgetLayoutItem
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
 *   plan: any,
 *   setPlan: (v: object) => void,
 *   cards: CardItem[],
 *   onEdit: (id: number, updates: Partial<TxItem>) => void,
 *   onDelete: (id: number) => void,
 *   onSettings: (v: string) => void,
 *   sosPending: SosRequest[],
 *   onSosResolve: (id: number, status: 'approved' | 'rejected') => Promise<void>,
 *   homeLayout: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] },
 *   setHomeLayout: (v: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }) => void,
 * }} props
 */
export function HomeView({
  tx, budgets, fixed, install, names, onAdd, sliderCfg,
  onWidget: _onWidget, onScan, plan, setPlan: _setPlan, cards,
  onEdit, onDelete, onSettings,
  sosPending = [], onSosResolve,
  homeLayout, setHomeLayout
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const layouts = homeLayout ?? DEFAULT_HOME_LAYOUT;
  const { containerRef, width } = useContainerWidth();

  const [isTotalMode, setIsTotalMode] = useState(true);
  const YEAR  = getYear();
  const MONTH = getMonth();
  const DAY   = getDay();
  const DAYS  = getDaysInMonth(YEAR, MONTH);

  const totalBudget  = Object.values(budgets).reduce((s, v) => s + v, 0);
  const fixedTotal   = (fixed || []).reduce((s, f) => s + f.amount, 0);
  const installTotal = (install || []).reduce((s, i) => s + i.monthly, 0);

  const curMonthPrefix = `${YEAR}-${String(MONTH).padStart(2, "0")}`;
  const thisMonthTx = useMemo(() => tx.filter(t => t.date.startsWith(curMonthPrefix) && !t.is_private), [tx, curMonthPrefix]);

  const variableSpent = useMemo(() => thisMonthTx.reduce((s, t) => s + t.amount, 0), [thisMonthTx]);
  const totalSpent    = variableSpent + fixedTotal + installTotal;

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
  const allowance      = /** @type {{ husband: number, wife: number }} */ (plan?.allowance) || { husband: 0, wife: 0 };
  const utilTarget     = /** @type {number} */ (plan?.utilizationTarget) || 100;
  const totalSalary    = (salary.husband || 0) + (salary.wife || 0);
  const savingsTarget  = salary.savingsTarget || 0;
  const allowanceTotal = (allowance.husband || 0) + (allowance.wife || 0);
  const committed      = fixedTotal + installTotal;

  const monthlyAvailRaw = totalSalary - committed - savingsTarget - allowanceTotal;
  const cardLimit       = Math.max(Math.round(monthlyAvailRaw * utilTarget / 100), 0);
  const cardUsedPct     = cardLimit > 0 ? Math.min(Math.round(variableSpent / cardLimit * 100), 100) : 0;
  const cardLeft        = cardLimit - variableSpent;
  const cardLimitOk     = cardLeft >= 0;

  const estimatedSavings  = totalSalary - committed - projectedAtPace;
  const hasData           = thisMonthTx.length > 0;
  const savingsRate       = totalSalary > 0 ? Math.round(estimatedSavings / totalSalary * 100) : 0;
  const savingsRateColor  = totalSalary === 0 || !hasData ? "var(--text3)" : (savingsRate >= 20 ? "var(--green)" : savingsRate >= 10 ? "var(--gold)" : "var(--red)");

  const paceProgressPct = totalBudget > 0 ? Math.min(Math.round(projectedAtPace / totalBudget * 100), 130) : 0;
  const remainingAtPace = totalBudget - projectedAtPace;
  const isOnTrack       = remainingAtPace >= 0;

  const [searchTerm, setSearchTerm] = useState("");
  const [showFull, setShowFull]     = useState(false);
  const [editItem, setEditItem]     = useState(/** @type {TxItem|null} */ (null));

  // -- Allowance Data Calculation (Image 3 integration) --
  const allowanceData = useMemo(() => {
    const p = plan || {};
    if (p.isSolo) return null;
    const targets = p.allowance || { husband: 0, wife: 0 };
    
    // 이번 달 비밀 지출 (is_private === true) 집계
    const hPrivate = tx.filter(t => t.date.startsWith(curMonthPrefix) && t.is_private && t.who === 'husband').reduce((s, t) => s + t.amount, 0);
    const wPrivate = tx.filter(t => t.date.startsWith(curMonthPrefix) && t.is_private && t.who === 'wife').reduce((s, t) => s + t.amount, 0);
    
    return {
      husband: { target: targets.husband || 0, spent: hPrivate, remaining: (targets.husband || 0) - hPrivate, pct: (targets.husband || 0) > 0 ? Math.min(100, Math.round(hPrivate / targets.husband * 100)) : 0 },
      wife:    { target: targets.wife || 0,    spent: wPrivate, remaining: (targets.wife || 0) - wPrivate,    pct: (targets.wife || 0) > 0    ? Math.min(100, Math.round(wPrivate / targets.wife * 100))    : 0 }
    };
  }, [tx, plan, curMonthPrefix]);

  // Layout Handlers
  const saveLayout = useRef(
    debounce((next) => {
      setHomeLayout(next);
    }, 800)
  ).current;

  const onLayoutChange = useCallback((_cur, all) => {
    // i, x, y, w, h 정보만 추출 (minW, minH 등은 시스템 기본값 사용)
    const mapLayouts = (lArr) => (lArr || []).map(l => ({
      i: l.i, x: l.x, y: l.y, w: l.w, h: l.h
    }));

    const next = {
      mobile:  mapLayouts(all.mobile  || layouts.mobile),
      desktop: mapLayouts(all.desktop || layouts.desktop),
    };
    saveLayout(next);
  }, [saveLayout, layouts]);

  const handleDelete = (key) => {
    const next = {
      mobile:  layouts.mobile.filter(l => l.i !== key),
      desktop: layouts.desktop.filter(l => l.i !== key),
    };
    setHomeLayout(next);
  };

  const handleAdd = (key) => {
    if (layouts.mobile.find(l => l.i === key)) return;
    const dMob = DEFAULT_HOME_LAYOUT.mobile.find(l => l.i === key) || { i: key, x: 0, y: 100, w: 1, h: 2 };
    const dDsk = DEFAULT_HOME_LAYOUT.desktop.find(l => l.i === key) || { i: key, x: 0, y: 100, w: 1, h: 2 };
    setHomeLayout({
      mobile:  [...layouts.mobile, { ...dMob, y: 100 }],
      desktop: [...layouts.desktop, { ...dDsk, y: 100 }],
    });
  };

  const resetLayout = () => {
    if (confirm("홈 화면 배치를 초기화하시겠습니까?")) {
      setHomeLayout(DEFAULT_HOME_LAYOUT);
    }
  };

  /** SVG 링 circumference (r=40, viewBox 0 0 100 100) */
  const CIRC = 251;
  const ringDash = `${ringPct * (CIRC / 100)} ${CIRC}`;

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
  }, [thisMonthTx.length, totalBudget, remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  // B8: 검색 결과 memoize
  const filteredTx = useMemo(() => {
    const pool = searchTerm ? tx : thisMonthTx;
    return pool.filter(t => {
      if (t.is_private) return false;
      if (!searchTerm) return true;
      const label = CAT[t.cat]?.label || "";
      return (t.memo && t.memo.includes(searchTerm)) || label.includes(searchTerm);
    }).sort((a, b) => b.id - a.id);
  }, [tx, thisMonthTx, searchTerm]);

  // Widget Mapper
  const WIDGET_MAP = {
    hero:              () => <HomeHeroWidget remaining={remaining} YEAR={YEAR} MONTH={MONTH} DAY={DAY} daysLeft={daysLeft} onSettings={onSettings} />,
    execution_summary: () => <HomeExecutionSummaryWidget isTotalMode={isTotalMode} setIsTotalMode={setIsTotalMode} totalSpent={totalSpent} variableSpent={variableSpent} ringPct={ringPct} ringDash={ringDash} paceStatus={paceStatus} fixedTotal={fixedTotal} installTotal={installTotal} totalBudget={totalBudget} allowanceData={allowanceData} names={names} onSettings={onSettings} />,
    ai_nudge:          () => <HomeAiCoachWidget nudgeText={nudgeText} />,
    sos_pending:       () => <HomeSosPendingWidget sosPending={sosPending} onSosResolve={onSosResolve} />,
    pace_predictor:    () => <HomePacePredictorWidget isOnTrack={isOnTrack} remainingAtPace={remainingAtPace} currentPaceDaily={currentPaceDaily} daysLeft={daysLeft} paceProgressPct={paceProgressPct} variableSpent={variableSpent} totalBudget={totalBudget} />,
    scenario_slider:   () => <HomeScenarioSliderWidget paceDaily={paceDaily} paceMax={paceMax} setPaceDaily={setPaceDaily} paceColor={paceColor} projOver={projOver} projected={projected} currentPaceDaily={currentPaceDaily} defaultPaceVal={defaultPaceVal} />,
    limit_status:      () => <HomeLimitStatusWidget totalSalary={totalSalary} utilTarget={utilTarget} variableSpent={variableSpent} cardLimitOk={cardLimitOk} cardLimit={cardLimit} cardLeft={cardLeft} cardUsedPct={cardUsedPct} savingsRateColor={savingsRateColor} savingsRate={savingsRate} allowanceTotal={allowanceTotal} thisMonthCardSpend={thisMonthCardSpend} onSettings={onSettings} />,
    partner_spending:  () => <HomePartnerSpendingWidget plan={plan} totalSpent={totalSpent} hSpent={hSpent} wSpent={wSpent} names={names} onAdd={onAdd} />,
    recent_tx:         () => <HomeRecentTxWidget searchTerm={searchTerm} setSearchTerm={setSearchTerm} showFull={showFull} setShowFull={setShowFull} filteredTx={filteredTx} setEditItem={setEditItem} CAT={CAT} CATS={CATS} cards={cards} plan={plan} names={names} />,
  };

  const DISPLAY_NAMES = {
    hero: '잔액 요약', execution_summary: '집행 요약', ai_nudge: 'AI 코치',
    sos_pending: 'SOS 대기', pace_predictor: '페이스 예측',
    scenario_slider: '시나리오 조정', limit_status: '한도 & 저축률', partner_spending: '파트너별 지출', recent_tx: '최근 지출'
  };

  const ALL_KEYS = Object.keys(WIDGET_MAP);
  const currentKeys = layouts.mobile.map(l => l.i);
  const hiddenKeys = ALL_KEYS.filter(k => !currentKeys.includes(k));

  const visibleKeys = useMemo(() => currentKeys.filter(k => {
    if (!WIDGET_MAP[k]) return false; // 존재하지 않는 위젯 제거
    if (k === 'sos_pending') return (sosPending?.length ?? 0) > 0;
    if (k === 'ai_nudge') return !!nudgeText;
    return true;
  }), [currentKeys, sosPending, nudgeText]); // eslint-disable-line react-hooks/exhaustive-deps

  // 기존에 저장된 레이아웃이라도 현재의 최소 높이를 강제 적용
  const rglLayouts = useMemo(() => {
    const enforceMin = (layout, defaultLayout) => layout.map(l => {
      const def = defaultLayout.find(d => d.i === l.i);
      const minH = def?.minH || 1;
      return { ...l, h: Math.max(l.h, minH), minH, static: !isEditMode };
    });
    return {
      desktop: enforceMin(layouts.desktop, DEFAULT_HOME_LAYOUT.desktop),
      mobile:  enforceMin(layouts.mobile, DEFAULT_HOME_LAYOUT.mobile),
    };
  }, [layouts, isEditMode]);

  return (
    <div ref={containerRef} style={{ padding: "0 4px 96px", overflowY: "auto", height: "100%", background: 'var(--bg)' }}>
      {/* 편집 모드 헤더 */}
      <div style={{ padding: '16px 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          HOME {isEditMode && <span style={{ color: 'var(--gold)' }}>• Edit Mode</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditMode && (
            <button
              onClick={resetLayout}
              style={{
                background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.3)',
                borderRadius: 12, padding: '6px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: '#FF6B6B'
              }}
            >
              초기화
            </button>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{
              background: isEditMode ? 'var(--goldD)' : 'transparent',
              border: `1px solid ${isEditMode ? 'var(--gold)' : 'var(--border)'}`,
              borderRadius: 12, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, color: isEditMode ? 'var(--gold)' : 'var(--text2)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            {isEditMode ? <><Check size={14} /> 완료</> : <><Edit2 size={13} /> 편집</>}
          </button>
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={rglLayouts}
        breakpoints={{ desktop: 480, mobile: 0 }}
        cols={{ desktop: 2, mobile: 1 }}
        rowHeight={70}
        width={width}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        draggableHandle=".widget-handle"
        onLayoutChange={onLayoutChange}
        margin={[12, 12]}
      >
        {visibleKeys.map((key) => (
          <div
            key={key}
            className="widget-item-wrapper"
            style={{
              background: 'var(--bg2)', borderRadius: 24,
              border: `1px solid ${isEditMode ? 'var(--gold)' : 'transparent'}`,
              boxShadow: isEditMode ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
              transition: 'border 0.2s, box-shadow 0.2s'
            }}
          >
            {isEditMode && (
              <div
                className="widget-handle"
                style={{ height: 32, cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg3)', position: 'relative', zIndex: 10 }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--gold)', opacity: 0.4 }} />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(key); }}
                  style={{ position: 'absolute', right: 8, top: 4, background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}
                >
                  ✕
                </button>
              </div>
            )}
            <div className="responsive-narrow-padding" style={{ padding: "20px 24px", height: isEditMode ? 'calc(100% - 32px)' : '100%', overflowY: 'auto' }}>
              {WIDGET_MAP[key] ? WIDGET_MAP[key]() : <div style={{ padding: 20 }}>Widget {key} not found</div>}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {isEditMode && hiddenKeys.length > 0 && (
        <div style={{ padding: '20px 16px', borderTop: '1px dashed var(--border)', marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12 }}>
            <Sparkles size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            추가 가능한 카드
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hiddenKeys.map(key => (
              <button
                key={key}
                onClick={() => handleAdd(key)}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '8px 16px',
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'transform 0.1s'
                }}
              >
                + {DISPLAY_NAMES[key] || key}
              </button>
            ))}
          </div>
        </div>
      )}

      {editItem && (
        <TxEditModal
          tx={editItem}
          names={names}
          onClose={() => setEditItem(null)}
          onEdit={(id, updates) => { onEdit(id, updates); setEditItem(null); }}
          onDelete={(id) => { onDelete(id); setEditItem(null); }}
          cards={cards}
        />
      )}
    </div>
  );
}
