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
import { IncomeSavingsWidget } from './widgets/IncomeSavingsWidget.jsx';
import { FixedExpenseWidget } from './widgets/FixedExpenseWidget.jsx';
import { PlanSummaryWidget } from './widgets/PlanSummaryWidget.jsx';
import { CalendarWidget } from './widgets/CalendarWidget.jsx';
import { SettlementSummaryWidget } from './widgets/SettlementSummaryWidget.jsx';

/**
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {import('../constants/index.js').FixedItem} FixedItem
 * @typedef {import('../constants/index.js').WidgetLayoutItem} WidgetLayoutItem
 * @typedef {import('../constants/index.js').Plan} Plan
 * @typedef {import('react-grid-layout').LayoutItem} RGLItem
 * @typedef {import('../constants/index.js').SosRequest} SosRequest
 * @typedef {import('../constants/index.js').InstallItem} InstallItem
 * @typedef {import('../constants/index.js').CardItem} CardItem
 */

/**
 * @param {{
 *   plan: Plan,
 *   budgets: Record<string, number>,
 *   tx: TxItem[],
 *   fixed: FixedItem[],
 *   install?: InstallItem[],
 *   cards?: CardItem[],
 *   names: Record<string, string>,
 *   myRole: string,
 *   mySosPending?: SosRequest[],
 *   sosRequests?: SosRequest[],
 *   onSosUpdate?: (id: number, updates: Partial<SosRequest>) => void,
 *   onSosCancel?: (id: number) => void,
 *   widgetLayout: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] },
 *   setWidgetLayout: (v: { mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }) => void,
 *   onSettings?: () => void,
 *   setPlan: (v: Plan) => void
 * }} props
 */
export function DashboardView({ plan, setPlan, budgets, tx, fixed, install = [], cards = [], names, myRole, mySosPending = [], sosRequests = [], onSosUpdate, onSosCancel, widgetLayout, setWidgetLayout, onSettings: _onSettings }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const layouts = widgetLayout ?? DEFAULT_WIDGET_LAYOUT;
  const { containerRef, width } = useContainerWidth();

  const name = names?.[myRole] ?? myRole;

  // 기존에 저장된 레이아웃이라도 현재의 최소 높이를 강제 적용
  const rglLayouts = useMemo(() => {
    const enforceMin = (layout, defaultLayout) => layout.map(l => {
      const def = defaultLayout.find(d => d.i === l.i);
      const minH = def?.minH || 1;
      return { ...l, h: Math.max(l.h, minH), minH, static: !isEditMode };
    });
    return {
      desktop: enforceMin(layouts.desktop, DEFAULT_WIDGET_LAYOUT.desktop),
      mobile:  enforceMin(layouts.mobile, DEFAULT_WIDGET_LAYOUT.mobile),
    };
  }, [layouts, isEditMode]);

  const saveLayout = useRef(
    debounce((/** @type {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} */ next) => {
      setWidgetLayout(next);
    }, 1500)
  ).current;

  const onLayoutChange = useCallback(
    /** @param {readonly RGLItem[]} _cur @param {Partial<Record<string, readonly RGLItem[]>>} allLayouts */
    (_cur, allLayouts) => {
      const next = {
        mobile:  (allLayouts.mobile  ?? layouts.mobile).map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH })),
        desktop: (allLayouts.desktop ?? layouts.desktop).map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH })),
      };
      saveLayout(next);
    },
    [saveLayout, layouts]
  );

  const handleDelete = (/** @type {string} */ key) => {
    const next = {
      mobile:  layouts.mobile.filter(l => l.i !== key),
      desktop: layouts.desktop.filter(l => l.i !== key),
    };
    setWidgetLayout(next);
  };

  const handleAdd = (/** @type {string} */ key) => {
    // 이미 존재하는지 확인
    if (layouts.mobile.find(l => l.i === key)) return;
    
    // 기본 레이아웃에서 정보 찾기
    const dMob = DEFAULT_WIDGET_LAYOUT.mobile.find(l => l.i === key) || { i: key, x: 0, y: 100, w: 1, h: 4 };
    const dDsk = DEFAULT_WIDGET_LAYOUT.desktop.find(l => l.i === key) || { i: key, x: 0, y: 100, w: 1, h: 4 };

    const next = {
      mobile:  [...layouts.mobile, { ...dMob, y: 100 }], // 맨 아래 배치
      desktop: [...layouts.desktop, { ...dDsk, y: 100 }],
    };
    setWidgetLayout(next);
  };

  const resetLayout = () => {
    if (confirm("대시보드 배치를 초기화하시겠습니까?")) {
      setWidgetLayout(DEFAULT_WIDGET_LAYOUT);
    }
  };

  const ctx = useMemo(() => ({ plan, setPlan, budgets, tx, fixed, install, cards, names, myRole, mySosPending, sosRequests, onSosUpdate, onSosCancel }), [plan, setPlan, budgets, tx, fixed, install, cards, names, myRole, mySosPending, sosRequests, onSosUpdate, onSosCancel]);

  /** @type {Record<string, string>} */
  const DISPLAY_NAMES = {
    sos_status: 'SOS 진행 현황',
    allowance_insight: '부부 용돈 현황',
    today_status: '오늘의 요약',
    spending_insight: '지출 분석',
    budget_ring: '예산 현황',
    goal: '저축 목표',
    tax_guide: '세금 가이드',
    ai_nudge: 'AI 추천',
    income_savings: '수입 및 저축 목표',
    fixed_list: '고정비 및 할부 요약',
    plan_summary: '플랜 요약',
    calendar_schedule: '일정 캘린더',
    settlement_summary: '결제 정산기',
  };

  /** @type {Record<string, React.ComponentType<import('../context/BudgetContext.jsx').BudgetContextValue | Object>>} */
  const WIDGET_MAP = useMemo(() => ({
    sos_status:       SosStatusWidget,
    allowance_insight: AllowanceInsightWidget,
    today_status:     TodayStatusWidget,
    spending_insight: SpendingInsightWidget,
    budget_ring:      BudgetRingWidget,
    goal:             GoalWidget,
    tax_guide:        TaxGuideWidget,
    ai_nudge:         AiNudgeWidget,
    income_savings:   IncomeSavingsWidget,
    fixed_list:       FixedExpenseWidget,
    plan_summary:     PlanSummaryWidget,
    calendar_schedule: CalendarWidget,
    settlement_summary: SettlementSummaryWidget,
  }), []);

  // 전체 가능한 위젯 리스트
  const ALL_KEYS = Object.keys(WIDGET_MAP);
  // 현재 레이아웃에 있는 위젯 키들
  const currentKeys = useMemo(() => layouts.mobile.map(l => l.i), [layouts]);
  // 제거된(추가 가능한) 위젯 키들
  const hiddenKeys = useMemo(() => ALL_KEYS.filter(k => !currentKeys.includes(k)), [currentKeys]);

  // 실제 렌더링할 위젯 키들 (데이터 유무에 따라 필터링)
  const visibleWidgetKeys = useMemo(() => {
    return currentKeys.filter(key => {
      if (!WIDGET_MAP[key]) return false; // 방어 로직
      // sos_status는 이제 상시 노출 (사용자 요청 반영)
      return true;
    });
  }, [currentKeys, WIDGET_MAP]);

  return (
    <div ref={containerRef} style={{ padding: '0 4px 120px', overflowY: 'auto', height: '100%', background: 'var(--bg)' }}>
      {/* 웰컴 섹션 */}
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Sparkles size={16} color="var(--primary)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>AI REPORT</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          안녕하세요, {name}님!
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>
          오늘의 금융 리포트를 확인해보세요.
        </p>
      </div>

      <div style={{ padding: '0 12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-faint)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Widgets {isEditMode && <span style={{ color: 'var(--primary)' }}>• Edit Mode</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditMode && (
            <button
              onClick={resetLayout}
              style={{
                background: 'rgba(255,100,100,0.1)',
                border: '1px solid rgba(255,100,100,0.3)',
                borderRadius: 12, padding: '6px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, color: 'var(--danger)',
                transition: 'all 0.2s'
              }}
            >
              초기화
            </button>
          )}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{
              background: isEditMode ? 'rgba(28,43,74,.08)' : 'transparent',
              border: `1px solid ${isEditMode ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '6px 12px', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, color: isEditMode ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            {isEditMode ? <><Check size={14} /> 완료</> : <><Edit2 size={13} /> 편집</>}
          </button>
        </div>
      </div>

      <ResponsiveGridLayout
        width={width}
        layouts={rglLayouts}
        breakpoints={{ desktop: 480, mobile: 0 }}
        cols={{ desktop: 2, mobile: 1 }}
        rowHeight={70}
        // @ts-ignore
        isDraggable={isEditMode}
        // @ts-ignore
        isResizable={isEditMode}
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
                background: 'var(--surface)', borderRadius: 24,
                border: `1px solid ${isEditMode ? 'var(--primary)' : 'var(--border)'}`,
                overflowX: 'hidden', overflowY: 'auto', 
                boxShadow: isEditMode ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
                transition: 'border 0.2s, box-shadow 0.2s'
              }}
            >
              {isEditMode && (
                <div
                  className="widget-handle"
                  style={{ height: 32, cursor: 'grab', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--surface-alt)', position: 'relative' }}
                >
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--primary)', opacity: 0.4 }} />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(key); }}
                    style={{ position: 'absolute', right: 8, top: 4, background: 'transparent', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', padding: 4 }}
                  >
                    ✕
                  </button>
                </div>
              )}
              <div style={{ padding: '0', width: '100%', height: '100%' }}>
                <Widget {...ctx} onNavigate={_onSettings} />
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {/* 위젯 추가 섹션 (편집 모드에서만 노출) */}
      {isEditMode && hiddenKeys.length > 0 && (
        <div style={{ padding: '20px 16px', borderTop: '1px dashed var(--border)', marginTop: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12 }}>
            <Sparkles size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            추가 가능한 위젯
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {hiddenKeys.map(key => (
              <button
                key={key}
                onClick={() => handleAdd(key)}
                style={{
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 16, padding: '8px 16px',
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'transform 0.1s'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                + {DISPLAY_NAMES[key] || key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

