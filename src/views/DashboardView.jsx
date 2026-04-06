import { useCallback, useMemo, useRef, useState } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import debounce from 'lodash.debounce';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DEFAULT_WIDGET_LAYOUT } from '../constants/index.js';
import { TodayStatusWidget } from './widgets/TodayStatusWidget.jsx';
import { SpendingInsightWidget } from './widgets/SpendingInsightWidget.jsx';
import { BudgetRingWidget } from './widgets/BudgetRingWidget.jsx';
import { GoalWidget }        from './widgets/GoalWidget.jsx';
import { TaxGuideWidget }    from './widgets/TaxGuideWidget.jsx';
import { AiNudgeWidget }     from './widgets/AiNudgeWidget.jsx';
import { SosStatusWidget }   from './widgets/SosStatusWidget.jsx';
import { AllowanceInsightWidget } from './widgets/AllowanceInsightWidget.jsx';
import { Edit2, Check, Sparkles } from 'lucide-react';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').WidgetLayoutItem} WidgetLayoutItem
 * @typedef {import('react-grid-layout').LayoutItem} RGLItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 */

/**
 * @param {{
 *   plan: any,
 *   budgets: Record<string, number>,
 *   tx: TxItem[],
 *   fixed: FixedItem[],
 *   names: Record<string, string>,
 *   myRole: string,
 *   mySosPending?: SosRequest[],
 *   widgetLayout: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] },
 *   setWidgetLayout: (v: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }) => void,
 *   onSettings?: () => void,
 *   setPlan: (v: any) => void
 * }} props
 */
export function DashboardView({ plan, setPlan, budgets, tx, fixed, names, myRole, mySosPending = [], widgetLayout, setWidgetLayout, onSettings: _onSettings }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const layouts = widgetLayout ?? DEFAULT_WIDGET_LAYOUT;
  const { containerRef, width } = useContainerWidth();

  const name = names?.[myRole] ?? myRole;

  // ResponsiveLayouts 형식에 맞게 변환
  const rglLayouts = useMemo(() => ({
    desktop: layouts.desktop.map(l => ({ ...l })),
    mobile:  layouts.mobile.map(l => ({ ...l })),
  }), [layouts]);

  const saveLayout = useRef(
    debounce((/** @type {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} */ next) => {
      setWidgetLayout(next);
    }, 1500)
  ).current;

  const onLayoutChange = useCallback(
    /** @param {readonly RGLItem[]} _cur @param {Partial<Record<string, readonly RGLItem[]>>} allLayouts */
    (_cur, allLayouts) => {
      const next = {
        mobile:  (allLayouts.mobile  ?? layouts.mobile).map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })),
        desktop: (allLayouts.desktop ?? layouts.desktop).map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })),
      };
      saveLayout(next);
    },
    [saveLayout, layouts]
  );

  const ctx = useMemo(() => ({ plan, setPlan, budgets, tx, fixed, names, myRole, mySosPending }), [plan, setPlan, budgets, tx, fixed, names, myRole, mySosPending]);

  /** @type {Record<string, React.ComponentType<any>>} */
  const WIDGET_MAP = useMemo(() => ({
    sos_status:       SosStatusWidget,
    allowance_insight: AllowanceInsightWidget,
    today_status:     TodayStatusWidget,
    spending_insight: SpendingInsightWidget,
    budget_ring:      BudgetRingWidget,
    goal:             GoalWidget,
    tax_guide:        TaxGuideWidget,
    ai_nudge:         AiNudgeWidget,
  }), []);

  // 실제 렌더링할 위젯 키들 (데이터 유무에 따라 필터링)
  const visibleWidgetKeys = useMemo(() => {
    return Object.keys(WIDGET_MAP).filter(key => {
      if (key === 'sos_status') return (mySosPending?.length ?? 0) > 0;
      return true;
    });
  }, [WIDGET_MAP, mySosPending]);

  return (
    <div ref={containerRef} style={{ padding: '0 4px 120px', overflowY: 'auto', height: '100%', background: 'var(--bg)' }}>
      {/* 웰컴 섹션 */}
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Sparkles size={16} color="var(--gold)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>AI REPORT</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          안녕하세요, {name}님!
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, fontWeight: 500 }}>
          오늘의 금융 리포트를 확인해보세요.
        </p>
      </div>

      <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Widgets {isEditMode && <span style={{ color: 'var(--gold)' }}>• Edit Mode</span>}
        </span>
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

      <ResponsiveGridLayout
        width={width}
        layouts={rglLayouts}
        breakpoints={{ desktop: 480, mobile: 0 }}
        cols={{ desktop: 2, mobile: 1 }}
        rowHeight={60}
        isDraggable={isEditMode}
        isResizable={false}
        draggableHandle=".widget-handle"
        onLayoutChange={onLayoutChange}
        margin={[12, 12]}
      >
        {visibleWidgetKeys.map((key) => {
          const Widget = WIDGET_MAP[key];
          return (
            <div
              key={key}
              style={{
                background: 'var(--bg2)', borderRadius: 24,
                border: `1px solid ${isEditMode ? 'var(--gold)' : 'var(--border)'}`,
                overflow: 'hidden', boxShadow: isEditMode ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
                transition: 'border 0.2s, box-shadow 0.2s'
              }}
            >
              {isEditMode && (
                <div
                  className="widget-handle"
                  style={{ height: 32, cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg3)' }}
                >
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--gold)', opacity: 0.4 }} />
                </div>
              )}
              <div style={{ padding: isEditMode ? '0 0 16px' : '16px 0' }}>
                <Widget {...ctx} />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}

