import React, { useState, useMemo, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { TxEditModal } from '../components/TxEditModal.jsx';
import { CATS } from '../constants/index.js';
import { today_str } from '../utils/helpers.js';

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

/**
 * @param {{ spent: number, budget: number, size?: number }} props
 */
function BudgetRing({ spent, budget, size=100 }) {
  const r = 40, c = 50;
  const circ = 2 * Math.PI * r;
  const pct = budget > 0 ? Math.min(spent/budget, 1) : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{transform:'rotate(-90deg)'}}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--cream3)" strokeWidth="12" />
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--primary)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        style={{transition:'stroke-dashoffset 1s ease-out'}} />
    </svg>
  );
}

/**
 * @typedef {import('../constants/index.js').DiaryItem} DiaryItem
 * @typedef {import('../constants/index.js').TxItem} TxItem
 * @typedef {{ kind: 'diary', diary: DiaryItem } | { kind: 'tx', txItem: TxItem }} DayDetailItem
 */

export function DashboardView() {
  const { diaries, tx, currentUser, setCurrentUser, budgets, editDiaryWithTx, deleteDiaryWithTx, editTx, deleteTx, names, cards } = useBudget();
  const [detailDiary, setDetailDiary] = useState(/** @type {DiaryItem | null} */ (null));
  const [editingTx, setEditingTx] = useState(/** @type {TxItem | null} */ (null));
  const [expandedDate, setExpandedDate] = useState(/** @type {string | null} */ (null));
  const [todayTick, setTodayTick] = useState(0);

  useEffect(() => {
    const onFocus = () => setTodayTick(t => t + 1);
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);

  const todayStr = useMemo(() => today_str(), [todayTick]);
  const currentMonth = todayStr.substring(0, 7);
  const isH = currentUser === 'husband';

  const monthTx = useMemo(
    () => tx.filter(t => typeof t.date === 'string' && t.date.startsWith(currentMonth)),
    [tx, currentMonth]
  );
  const hSpent = useMemo(
    () => monthTx.filter(t => t.who === 'husband').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTx]
  );
  const wSpent = useMemo(
    () => monthTx.filter(t => t.who === 'wife').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTx]
  );
  const totalSpent = hSpent + wSpent;
  const totalBudget = Object.values(budgets).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const remaining = totalBudget - totalSpent;

  const todayDate = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate();
  const projected = todayDate > 0 ? Math.round(totalSpent / todayDate * daysInMonth) : 0;
  const pacePct = Math.min(todayDate / daysInMonth, 1);
  const budgetPct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const catStats = useMemo(() => monthTx.reduce((acc, t) => {
    if (!t.cat) return acc;
    acc[t.cat] = (acc[t.cat] || 0) + (t.amount || 0);
    return acc;
  }, /** @type {Record<string, number>} */ ({})), [monthTx]);

  const catArray = Object.entries(catStats)
    .map(([id, amt]) => {
      const catObj = CATS.find(c => c.id === id) || { label: '기타', icon: '🏷️' };
      return { id, label: catObj.label, icon: catObj.icon, amt, color: 'var(--primary)' };
    })
    .sort((a, b) => b.amt - a.amt)
    .slice(0, 5);

  // 일자별 총액 — 현재 선택된 사용자(currentUser) 기준 tx 합산 (단일 소스)
  const myMonthTx = useMemo(
    () => monthTx.filter(t => t.who === currentUser),
    [monthTx, currentUser]
  );
  const myTotal = isH ? hSpent : wSpent;

  /**
   * 일자별 총액 + 항목 수 집계 (currentUser 기준)
   * @type {{ date: string, total: number, count: number }[]}
   */
  const dailyTotals = useMemo(() => {
    /** @type {Record<string, { total: number, count: number }>} */
    const acc = {};
    for (const t of myMonthTx) {
      if (!acc[t.date]) acc[t.date] = { total: 0, count: 0 };
      acc[t.date].total += (t.amount || 0);
      acc[t.date].count += 1;
    }
    return Object.entries(acc)
      .map(([date, v]) => ({ date, total: v.total, count: v.count }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  }, [myMonthTx]);

  /**
   * 펼친 날짜의 상세 항목 — diary(type='expense')와 매칭되면 diary로, 아니면 raw tx로 노출
   * @param {string} date
   * @returns {DayDetailItem[]}
   */
  const buildDayDetails = (date) => {
    const dayTx = myMonthTx.filter(t => t.date === date);
    /** @type {DayDetailItem[]} */
    const out = [];
    /** @type {Set<number>} */
    const usedDiaryIds = new Set();
    for (const t of dayTx) {
      if (typeof t.source_id === 'number') {
        const diary = diaries.find(d => d.id === t.source_id && d.type === 'expense');
        if (diary && !usedDiaryIds.has(diary.id)) {
          usedDiaryIds.add(diary.id);
          out.push({ kind: 'diary', diary });
          continue;
        }
        if (diary && usedDiaryIds.has(diary.id)) continue;
      }
      out.push({ kind: 'tx', txItem: t });
    }
    return out;
  };

  return (
    <div className="view">
      <div className="view-header">
        <div><h1>대시보드</h1><div className="sub">{new Date().getMonth()+1}월 가계 현황</div></div>
        <div style={{display:'flex',gap:4,background:'var(--cream2)',borderRadius:20,padding:'3px'}}>
          <button onClick={()=>setCurrentUser('husband')} style={{
            padding:'5px 12px',borderRadius:16,border:'none',cursor:'pointer',fontFamily:'inherit',
            fontSize:12,fontWeight:600,transition:'all .15s',
            background:!isH?'none':'white', color:!isH?'var(--ink3)':'var(--h-color)',
            boxShadow:!isH?'none':'0 1px 4px rgba(28,23,20,.1)'
          }}>👨 {names.husband}</button>
          <button onClick={()=>setCurrentUser('wife')} style={{
            padding:'5px 12px',borderRadius:16,border:'none',cursor:'pointer',fontFamily:'inherit',
            fontSize:12,fontWeight:600,transition:'all .15s',
            background:isH?'none':'white', color:isH?'var(--ink3)':'var(--w-color)',
            boxShadow:isH?'none':'0 1px 4px rgba(28,23,20,.1)'
          }}>👩 {names.wife}</button>
        </div>
      </div>

      <div className="scroll-area">
        {totalBudget > 0 && (
          <div className="nudge-card">
            <div className="nudge-label">✦ AI 분석</div>
            <div className="nudge-text">
              이번 달 이 페이스면 <strong>{fmtMoney(projected)} 예상</strong>.{' '}
              {projected <= totalBudget ? '예산 내로 마무리할 수 있을 것 같아요 👍' : '예산을 초과할 위험이 있어요 ⚠️'}
            </div>
          </div>
        )}

        <div className="widget">
          <div className="widget-title">예산 현황</div>
          <div className="budget-ring-wrap">
            <BudgetRing spent={totalSpent} budget={totalBudget} size={100}/>
            <div className="budget-ring-meta">
              <div className="budget-amount">{fmtMoney(totalSpent)}</div>
              <div className="budget-label">이번 달 총 지출</div>
              <div className="budget-remaining">
                <div className="label">남은 예산</div>
                <div className="amount" style={{color: remaining>=0?'var(--green)':'var(--danger)'}}>{fmtMoney(remaining)}</div>
              </div>
            </div>
          </div>
          <div className="couple-split">
            <div className="split-item h-split">
              <div className="split-name">{names.husband}</div>
              <div className="split-amt">{fmtMoney(hSpent)}</div>
              <div className="split-pct">{totalSpent>0?Math.round(hSpent/totalSpent*100):0}%</div>
            </div>
            <div className="split-item w-split">
              <div className="split-name">{names.wife}</div>
              <div className="split-amt">{fmtMoney(wSpent)}</div>
              <div className="split-pct">{totalSpent>0?Math.round(wSpent/totalSpent*100):0}%</div>
            </div>
          </div>
        </div>

        {totalBudget > 0 && (
          <div className="widget">
            <div className="widget-title">소비 페이스</div>
            {[
              {label:'예산 소진율',pct:budgetPct,color:'var(--accent)'},
              {label:'월 진행률',pct:pacePct,color:'var(--h-mid)'},
            ].map(row=>(
              <div key={row.label} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,color:'var(--ink2)'}}>{row.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>{Math.round(row.pct*100)}%</span>
                </div>
                <div className="pace-bar">
                  <div className="pace-bar-fill" style={{width:`${Math.min(row.pct*100, 100)}%`,background:row.color}}></div>
                </div>
              </div>
            ))}
            <div style={{padding:12,borderRadius:14,background:'var(--cream2)'}}>
              <div style={{fontSize:11,color:'var(--ink3)',marginBottom:3}}>이번 달 예상 지출</div>
              <div style={{fontSize:19,fontWeight:700,color:'var(--ink)',letterSpacing:'-1px'}}>{fmtMoney(projected)}</div>
              <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>
                {projected>totalBudget
                  ? <span style={{color:'var(--w-color)'}}>▲ {fmtMoney(projected-totalBudget)} 초과 예상</span>
                  : <span style={{color:'var(--green)'}}>▼ {fmtMoney(totalBudget-projected)} 절약 예상</span>}
              </div>
            </div>
          </div>
        )}

        <div className="widget" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'16px 18px 14px',borderBottom:'1px solid var(--cream2)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div className="widget-title" style={{marginBottom:0}}>
                {isH?'👨':'👩'} 일자별 지출 내역
              </div>
              <div style={{
                fontSize:13,fontWeight:700,letterSpacing:'-.5px',
                color: isH?'var(--h-color)':'var(--w-color)'
              }}>{fmtMoney(myTotal)}</div>
            </div>
            <div style={{fontSize:11,color:'var(--ink3)',marginTop:4}}>
              {isH?names.husband:names.wife}의 하루 총액 · 행 클릭 시 세부 내역 펼침 · 항목 클릭 시 수정
            </div>
          </div>

          {dailyTotals.length === 0 && (
            <div style={{padding:'28px 18px',textAlign:'center',color:'var(--ink3)',fontSize:13}}>
              아직 지출 기록이 없어요
            </div>
          )}

          {dailyTotals.map(({ date, total, count }) => {
            const isExpanded = expandedDate === date;
            const dd = new Date(date+'T00:00:00');
            const wd = ['일','월','화','수','목','금','토'][dd.getDay()];
            const dayLabel = `${dd.getMonth()+1}/${dd.getDate()} (${wd})`;
            const isToday = date === todayStr;
            return (
              <div key={date} style={{borderBottom:'1px solid var(--cream2)'}}>
                <button
                  type="button"
                  onClick={() => setExpandedDate(isExpanded ? null : date)}
                  style={{
                    width:'100%',
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'12px 18px', background:'transparent', border:'none',
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--ink2)',letterSpacing:'.3px'}}>{dayLabel}</span>
                    {isToday && (
                      <span style={{
                        fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:8,
                        background:'var(--ink)',color:'white',
                      }}>오늘</span>
                    )}
                    <span style={{fontSize:11,color:'var(--ink3)'}}>{count}건</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:14,fontWeight:700,color:'var(--ink)',letterSpacing:'-.5px'}}>
                      {fmtMoney(total)}
                    </span>
                    <span style={{fontSize:11,color:'var(--ink3)'}}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div style={{padding:'4px 18px 12px', background:'var(--cream)', display:'flex', flexDirection:'column', gap:6}}>
                    {buildDayDetails(date).map((d, idx) => {
                      if (d.kind === 'diary') {
                        const item = d.diary;
                        const hasItems = Array.isArray(item.expenseItems) && item.expenseItems.length > 0;
                        return (
                          <button
                            type="button"
                            key={`d-${item.id}-${idx}`}
                            onClick={() => setDetailDiary(item)}
                            style={detailItemStyle}
                          >
                            <div style={{flex:1, minWidth:0, textAlign:'left'}}>
                              <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {item.content || '지출 기록'}
                              </div>
                              <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>
                                {item.time || ''} {hasItems && item.expenseItems ? `· ${item.expenseItems.length}개 항목` : ''}
                              </div>
                            </div>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>{fmtMoney(item.totalSpent)}</span>
                            <span style={{fontSize:11,color:'var(--ink3)'}}>✏️</span>
                          </button>
                        );
                      }
                      const t = d.txItem;
                      const cat = CATS.find(c => c.id === t.cat);
                      return (
                        <button
                          type="button"
                          key={`t-${t.id}-${idx}`}
                          onClick={() => setEditingTx(t)}
                          style={detailItemStyle}
                        >
                          <div style={{flex:1, minWidth:0, textAlign:'left'}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {(cat ? `${cat.icon} ${cat.label}` : '지출')}{t.memo ? ` · ${t.memo}` : ''}
                            </div>
                            <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>
                              {t.payMethod === 'credit' ? '신용' : t.payMethod === 'debit' ? '체크' : '현금'}
                            </div>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--ink)'}}>{fmtMoney(t.amount)}</span>
                          <span style={{fontSize:11,color:'var(--ink3)'}}>✏️</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {catArray.length > 0 && (
          <div className="widget">
            <div className="widget-title">카테고리별 지출 (Top 5)</div>
            {catArray.map(c=>(
              <div key={c.id} style={{marginBottom:11}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:13,color:'var(--ink2)'}}>{c.icon} {c.label}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{fmtMoney(c.amt)}</span>
                </div>
                <div className="pace-bar" style={{height:6}}>
                  <div style={{height:'100%',borderRadius:6,background:c.color,width:`${c.amt/totalSpent*100}%`,transition:'width .6s ease'}}></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailDiary && (
        <DetailSheet
          item={detailDiary}
          onClose={()=>setDetailDiary(null)}
          onSave={(d) => { editDiaryWithTx(d); setDetailDiary(null); }}
          onDelete={(id) => { deleteDiaryWithTx(id); setDetailDiary(null); }}
        />
      )}
      {editingTx && (
        <TxEditModal
          tx={editingTx}
          names={names}
          cards={cards}
          onClose={()=>setEditingTx(null)}
          onEdit={(id, updates)=>{ editTx(id, updates); setEditingTx(null); }}
          onDelete={(id)=>{ deleteTx(id); setEditingTx(null); }}
        />
      )}
    </div>
  );
}

/** @type {React.CSSProperties} */
const detailItemStyle = {
  display:'flex', alignItems:'center', gap:10,
  padding:'10px 12px', borderRadius:10,
  background:'white', border:'1px solid var(--cream2)',
  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
};
