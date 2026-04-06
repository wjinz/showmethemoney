import { useCallback, useMemo, useRef, useState } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import debounce from 'lodash.debounce';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DEFAULT_WIDGET_LAYOUT } from '../constants/index.js';
import { BudgetRingWidget } from './widgets/BudgetRingWidget.jsx';
import { GoalWidget }        from './widgets/GoalWidget.jsx';
import { TaxGuideWidget }    from './widgets/TaxGuideWidget.jsx';
import { AiNudgeWidget }     from './widgets/AiNudgeWidget.jsx';
import { Edit2, Check }      from 'lucide-react';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').WidgetLayoutItem} WidgetLayoutItem
 * @typedef {import('react-grid-layout').LayoutItem} RGLItem
 */

/**
 * @param {{
 *   plan: any,
 *   budgets: Record<string, number>,
 *   tx: TxItem[],
 *   fixed: FixedItem[],
 *   names: Record<string, string>,
 *   widgetLayout: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] },
 *   setWidgetLayout: (v: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }) => void,
 *   onSettings?: () => void,
 *   setPlan: (v: any) => void
 * }} props
 */
export function DashboardView({ plan, setPlan, budgets, tx, fixed, names, widgetLayout, setWidgetLayout, onSettings: _onSettings }) {
  const [isEditMode, setIsEditMode] = useState(false);
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

  const ctx = useMemo(() => ({ plan, setPlan, budgets, tx, fixed, names }), [plan, setPlan, budgets, tx, fixed, names]);

  /** @type {Array<[string, React.ComponentType<Record<string, unknown>>]>} */
  const WIDGET_ENTRIES = [
    ['budget_ring', /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (BudgetRingWidget))],
    ['goal',        /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (GoalWidget))],
    ['tax_guide',   /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (TaxGuideWidget))],
    ['ai_nudge',    /** @type {React.ComponentType<Record<string, unknown>>} */ (/** @type {unknown} */ (AiNudgeWidget))],
  ];

  return (
    <div ref={containerRef} style={{ padding: '0 8px 96px', overflowY: 'auto', height: '100%' }}>
      <div style={{ padding: '12px 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Dashboard {isEditMode && <span style={{ color: 'var(--gold)', marginLeft: 8 }}>• Editing</span>}
        </span>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          style={{
            background: isEditMode ? 'var(--goldD)' : 'var(--bg3)',
            border: `1px solid ${isEditMode ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
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
        {WIDGET_ENTRIES.map(([key, Widget]) => (
          <div
            key={key}
            style={{
              background: 'var(--bg2)', borderRadius: 20,
              border: `1px solid ${isEditMode ? 'var(--gold)' : 'var(--border)'}`,
              overflow: 'hidden', boxShadow: isEditMode ? '0 8px 24px rgba(0,0,0,0.3)' : 'none',
              transition: 'border 0.2s, box-shadow 0.2s'
            }}
          >
            {isEditMode && (
              <div
                className="widget-handle"
                style={{ height: 28, cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg3)' }}
              >
                <div style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--gold)', opacity: 0.5 }} />
              </div>
            )}
            <div style={{ padding: isEditMode ? '0 0 12px' : '12px 0' }}>
              <Widget {...ctx} />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}

