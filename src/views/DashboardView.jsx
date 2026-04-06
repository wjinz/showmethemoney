import { useCallback, useMemo, useRef } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import debounce from 'lodash.debounce';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DEFAULT_WIDGET_LAYOUT } from '../constants/index.js';
import { BudgetRingWidget } from './widgets/BudgetRingWidget.jsx';
import { GoalWidget }        from './widgets/GoalWidget.jsx';
import { TaxGuideWidget }    from './widgets/TaxGuideWidget.jsx';
import { AiNudgeWidget }     from './widgets/AiNudgeWidget.jsx';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').WidgetLayoutItem} WidgetLayoutItem
 * @typedef {import('react-grid-layout').LayoutItem} RGLItem
 */

/**
 * @param {{
 *   plan: object,
 *   budgets: Record<string, number>,
 *   tx: TxItem[],
 *   fixed: FixedItem[],
 *   names: Record<string, string>,
 *   widgetLayout: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] },
 *   setWidgetLayout: (v: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }) => void,
 *   onSettings?: () => void
 * }} props
 */
export function DashboardView({ plan, budgets, tx, fixed, names, widgetLayout, setWidgetLayout, onSettings }) {
  const layouts = widgetLayout ?? DEFAULT_WIDGET_LAYOUT;
  const { containerRef, width } = useContainerWidth({ initialWidth: 480 });

  // ResponsiveLayouts 형식에 맞게 변환 (Partial<Record<breakpoint, LayoutItem[]>>)
  const rglLayouts = useMemo(() => ({
    desktop: layouts.desktop.map(l => ({ ...l })),
    mobile:  layouts.mobile.map(l => ({ ...l })),
  }), [layouts]);

  // 1.5초 debounce — 드래그 완료 후에만 저장
  const saveLayout = useRef(
    debounce((/** @type {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} */ next) => {
      setWidgetLayout(next);
    }, 1500)
  ).current;

  const onLayoutChange = useCallback(
    /** @param {readonly RGLItem[]} _cur @param {Partial<Record<string, readonly RGLItem[]>>} allLayouts */
    (_cur, allLayouts) => {
      /** @type {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} */
      const next = {
        mobile:  (allLayouts.mobile  ?? layouts.mobile).map(/** @param {RGLItem} l */ l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })),
        desktop: (allLayouts.desktop ?? layouts.desktop).map(/** @param {RGLItem} l */ l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })),
      };
      saveLayout(next);
    },
    [saveLayout, layouts]
  );

  const ctx = useMemo(() => ({ plan, budgets, tx, fixed, names }), [plan, budgets, tx, fixed, names]);

  /** @type {Array<[string, React.ComponentType<Record<string, unknown>>]>} */
  const WIDGET_ENTRIES = [
    ['budget_ring', /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (BudgetRingWidget))],
    ['goal',        /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (GoalWidget))],
    ['tax_guide',   /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (TaxGuideWidget))],
    ['ai_nudge',    /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (AiNudgeWidget))],
  ];

  return (
    <div ref={containerRef} style={{ padding: '0 8px 96px', overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '12px 8px 8px', fontSize: 13, fontWeight: 800, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Joint Dashboard</span>
        <button onClick={onSettings} style={{background:"none", border:"none", cursor:"pointer", fontSize:18, opacity:0.8}}>⚙️</button>
      </div>
      <ResponsiveGridLayout
        width={width}
        layouts={rglLayouts}
        breakpoints={{ desktop: 480, mobile: 0 }}
        cols={{ desktop: 2, mobile: 1 }}
        rowHeight={60}
        dragConfig={{ enabled: true, handle: '.widget-handle', bounded: false, threshold: 3 }}
        resizeConfig={{ enabled: false, handles: [] }}
        onLayoutChange={onLayoutChange}
      >
        {WIDGET_ENTRIES.map(([key, Widget]) => (
          <div key={key} style={{ background: 'var(--bg2)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div
              className="widget-handle"
              style={{ height: 16, cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>
            <Widget {...ctx} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
