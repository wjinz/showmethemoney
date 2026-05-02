import React, { useState, useMemo, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { TxEditModal } from '../components/TxEditModal.jsx';
import { CATS } from '../constants/index.js';
import { today_str } from '../utils/helpers.js';

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

/** @param {{ spent: number, budget: number, size?: number }} props */
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
 * @typedef {{ date: string, total: number, hTotal: number, wTotal: number, count: number }} DailyTotal
 */

/** @param {string} prefix @returns {string} prefix+1 month */
function nextMonthPrefix(prefix) {
  const [y, m] = prefix.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
/** @param {string} prefix @returns {string} prefix-1 month */
function prevMonthPrefix(prefix) {
  const [y, m] = prefix.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function DashboardView() {
  const { diaries, tx, currentUser, setCurrentUser, budgets, editDiaryWithTx, deleteDiaryWithTx, editTx, deleteTx, names, cards, loadTxYear } = useBudget();
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
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const isH = currentUser === 'husband';

  // 과거/미래 연도로 이동 시 해당 연도 tx lazy 로드
  useEffect(() => {
    const year = Number(selectedMonth.slice(0, 4));
    if (Number.isNaN(year)) return;
    if (typeof loadTxYear !== 'function') return;
    const curYear = Number(currentMonth.slice(0, 4));
    if (year !== curYear) loadTxYear(year);
  }, [selectedMonth, currentMonth, loadTxYear]);

  const monthTx = useMemo(
    () => tx.filter(t => typeof t.date === 'string' && t.date.startsWith(selectedMonth)),
    [tx, selectedMonth]
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

  const isCurrentMonth = selectedMonth === currentMonth;
  const [selY, selM] = selectedMonth.split('-').map(Number);
  const daysInSelMonth = new Date(selY, selM, 0).getDate();
  const todayDate = new Date().getDate();
  const denom = isCurrentMonth ? todayDate : daysInSelMonth;
  const projected = denom > 0 ? Math.round(totalSpent / denom * daysInSelMonth) : 0;
  const pacePct = isCurrentMonth ? Math.min(todayDate / daysInSelMonth, 1) : 1;
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

  /** @type {DailyTotal[]} */
  const dailyTotals = useMemo(() => {
    /** @type {Record<string, { total: number, hTotal: number, wTotal: number, count: number }>} */
    const acc = {};
    for (const t of monthTx) {
      if (!acc[t.date]) acc[t.date] = { total: 0, hTotal: 0, wTotal: 0, count: 0 };
      const amt = Number(t.amount) || 0;
      acc[t.date].total += amt;
      if (t.who === 'husband') acc[t.date].hTotal += amt;
      else if (t.who === 'wife') acc[t.date].wTotal += amt;
      acc[t.date].count += 1;
    }
    return Object.entries(acc)
      .map(([date, v]) => ({ date, total: v.total, hTotal: v.hTotal, wTotal: v.wTotal, count: v.count }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  }, [monthTx]);

  /**
   * 펼친 날짜의 상세 항목 — diary(type='expense')와 매칭되면 diary로, 아니면 raw tx로 노출
   * @param {string} date
   * @returns {DayDetailItem[]}
   */
  const buildDayDetails = (date) => {
    const dayTx = monthTx.filter(t => t.date === date);
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

  const goPrevMonth = () => setSelectedMonth(p => prevMonthPrefix(p));
  const goNextMonth = () => setSelectedMonth(p => nextMonthPrefix(p));
  const goCurrentMonth = () => setSelectedMonth(currentMonth);
  const monthLabel = `${selY}년 ${selM}월`;

  return (
    <div className="view">
      <div className="view-header">
        <div><h1>대시보드</h1><div className="sub">{monthLabel} 가계 현황</div></div>
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
        <div style={monthNavRowStyle}>
          <button onClick={goPrevMonth} style={monthNavBtnStyle} aria-label="이전 달">‹</button>
          <div style={{flex:1, textAlign:'center'}}>
            <div style={{fontSize:14, fontWeight:700, color:'var(--ink)'}}>{monthLabel}</div>
            {!isCurrentMonth && (
              <button onClick={goCurrentMonth} style={todayBtnStyle}>이번 달로</button>
            )}
          </div>
          <button onClick={goNextMonth} style={monthNavBtnStyle} aria-label="다음 달">›</button>
        </div>

        {totalBudget > 0 && totalSpent > 0 && (
          <div className="nudge-card">
            <div className="nudge-label">✦ AI 분석</div>
            <div className="nudge-text">
              {isCurrentMonth ? '이번 달' : `${selM}월`} 이 페이스면 <strong>{fmtMoney(projected)} 예상</strong>.{' '}
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
              <div className="budget-label">{selM}월 총 지출</div>
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
              <div style={{fontSize:11,color:'var(--ink3)',marginBottom:3}}>{selM}월 예상 지출</div>
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
                일자별 지출 내역
              </div>
              <div style={{
                fontSize:13,fontWeight:700,letterSpacing:'-.5px', color:'var(--ink)'
              }}>{fmtMoney(totalSpent)}</div>
            </div>
            <div style={{fontSize:11,color:'var(--ink3)',marginTop:4}}>
              부부 합산 하루 총액 · 행 클릭 시 세부 펼침 · 항목 클릭 시 수정 (양쪽 모두)
            </div>
          </div>

          {dailyTotals.length === 0 && (
            <div style={{padding:'28px 18px',textAlign:'center',color:'var(--ink3)',fontSize:13}}>
              <div>{selM}월 지출 기록이 없어요</div>
              <div style={{marginTop:8, fontSize:11}}>
                {isCurrentMonth ? '하단 + 버튼으로 첫 지출을 기록해보세요' : '◀ ▶ 으로 다른 달을 확인하세요'}
              </div>
            </div>
          )}

          {dailyTotals.map(({ date, total, hTotal, wTotal, count }) => {
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
                    cursor:'pointer', textAlign:'left', fontFamily:'inherit', gap:10,
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',gap:8, minWidth:0, flexWrap:'wrap'}}>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--ink2)',letterSpacing:'.3px'}}>{dayLabel}</span>
                    {isToday && (
                      <span style={{
                        fontSize:9,fontWeight:700,padding:'1px 6px',borderRadius:8,
                        background:'var(--ink)',color:'white',
                      }}>오늘</span>
                    )}
                    <span style={{fontSize:11,color:'var(--ink3)'}}>{count}건</span>
                    <div style={{display:'flex', gap:4}}>
                      {hTotal > 0 && (
                        <span style={whoBadgeStyle('husband')}>👨 {fmtMoney(hTotal)}</span>
                      )}
                      {wTotal > 0 && (
                        <span style={whoBadgeStyle('wife')}>👩 {fmtMoney(wTotal)}</span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8, flexShrink:0}}>
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
                            <span style={whoChipStyle(item.who)}>{item.who === 'husband' ? '👨' : '👩'}</span>
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
                      const who = t.who === 'wife' ? 'wife' : 'husband';
                      return (
                        <button
                          type="button"
                          key={`t-${t.id}-${idx}`}
                          onClick={() => setEditingTx(t)}
                          style={detailItemStyle}
                        >
                          <span style={whoChipStyle(who)}>{who === 'husband' ? '👨' : '👩'}</span>
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
                  <div style={{height:'100%',borderRadius:6,background:c.color,width:`${totalSpent>0?(c.amt/totalSpent*100):0}%`,transition:'width .6s ease'}}></div>
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
const monthNavRowStyle = {
  display:'flex', alignItems:'center', gap:8,
  padding:'4px 4px 12px',
};
/** @type {React.CSSProperties} */
const monthNavBtnStyle = {
  width:36, height:36, borderRadius:10,
  border:'1px solid var(--cream3)', background:'var(--cream2)',
  color:'var(--ink2)', fontSize:18, cursor:'pointer', fontFamily:'inherit',
  display:'flex', alignItems:'center', justifyContent:'center',
};
/** @type {React.CSSProperties} */
const todayBtnStyle = {
  marginTop:2, padding:'2px 10px', borderRadius:99,
  border:'1px solid var(--cream3)', background:'white',
  color:'var(--ink3)', fontSize:10, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
};
/** @param {'husband'|'wife'} who @returns {React.CSSProperties} */
function whoBadgeStyle(who) {
  return {
    fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:99,
    background: who === 'husband' ? 'var(--h-bg, #eaf0ff)' : 'var(--w-bg, #fce7f3)',
    color: who === 'husband' ? 'var(--h-color)' : 'var(--w-color)',
  };
}
/** @param {'husband'|'wife'} who @returns {React.CSSProperties} */
function whoChipStyle(who) {
  return {
    fontSize:14, width:24, height:24, borderRadius:'50%',
    background: who === 'husband' ? 'var(--h-bg, #eaf0ff)' : 'var(--w-bg, #fce7f3)',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  };
}
/** @type {React.CSSProperties} */
const detailItemStyle = {
  display:'flex', alignItems:'center', gap:10,
  padding:'10px 12px', borderRadius:10,
  background:'white', border:'1px solid var(--cream2)',
  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
};
