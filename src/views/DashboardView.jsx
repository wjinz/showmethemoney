import React, { useState, useMemo, useEffect } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { CATS } from '../constants/index.js';
import { today_str } from '../utils/helpers.js';

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

// Simple SVG Budget Ring
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

export function DashboardView() {
  const { diaries, tx, currentUser, setCurrentUser, budgets, editDiaryWithTx, deleteDiaryWithTx, names } = useBudget();
  const [detailItem, setDetailItem] = useState(/** @type {import('../constants/index.js').DiaryItem | null} */ (null));
  const [expandedId, setExpandedId] = useState(/** @type {number | null} */ (null));
  const [todayTick, setTodayTick] = useState(0);

  // 자정 갱신 (P1-3): visibilitychange로 today 재계산
  useEffect(() => {
    const onFocus = () => setTodayTick(t => t + 1);
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);

  const todayStr = useMemo(() => today_str(), [todayTick]);
  const currentMonth = todayStr.substring(0, 7);
  const isH = currentUser === 'husband';

  // === P0-1: tx 단일소스 통계 (mergedTx 제거) ===
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

  // 카테고리 통계도 tx 기반
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

  // === 리스트: diaries(expense) + tx(고아: source_id 없는 직접 기록) ===
  const listItems = useMemo(() => {
    /** @type {import('../constants/index.js').DiaryItem[]} */
    const diaryExpenses = diaries
      .filter(d => d.type === 'expense' && typeof d.date === 'string' && d.date.startsWith(currentMonth));
    /** @type {import('../constants/index.js').DiaryItem[]} */
    const orphanTx = tx
      .filter(t => !t.source_id && typeof t.date === 'string' && t.date.startsWith(currentMonth))
      .map(t => /** @type {import('../constants/index.js').DiaryItem} */ ({
        id: t.id,
        type: 'expense',
        date: t.date,
        who: t.who === 'wife' ? 'wife' : 'husband',
        emoji: '',
        time: '12:00',
        content: t.memo || '지출 기록',
        totalSpent: t.amount,
        shared: !t.is_private,
        photos: [],
        cat: t.cat,
        payMethod: t.payMethod,
        cardId: t.cardId,
        expenseItems: [{ label: t.memo || '항목', amount: t.amount }]
      }));
    return [...diaryExpenses, ...orphanTx];
  }, [diaries, tx, currentMonth]);

  const myRecords = listItems
    .filter(d => d.who === currentUser)
    .sort((a, b) => b.date > a.date ? 1 : b.date < a.date ? -1 : b.id - a.id);
  const myTotal = isH ? hSpent : wSpent;

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
                {isH?'👨':'👩'} 내 지출 내역
              </div>
              <div style={{
                fontSize:13,fontWeight:700,letterSpacing:'-.5px',
                color: isH?'var(--h-color)':'var(--w-color)'
              }}>{fmtMoney(myTotal)}</div>
            </div>
            <div style={{fontSize:11,color:'var(--ink3)',marginTop:4}}>
              {isH?names.husband:names.wife}의 지출 {myRecords.length}건 · 항목 합계 · 비공개 설정 반영
            </div>
          </div>

          {myRecords.length === 0 && (
            <div style={{padding:'28px 18px',textAlign:'center',color:'var(--ink3)',fontSize:13}}>
              아직 지출 기록이 없어요
            </div>
          )}
          {(() => {
            const grouped = {};
            myRecords.forEach(d => { if(!grouped[d.date]) grouped[d.date]=[]; grouped[d.date].push(d); });
            const dates = Object.keys(grouped).sort((a,b)=>b>a?1:-1);
            return dates.map(date => {
              const dayItems = grouped[date];
              const dayTotal = dayItems.reduce((s,d)=>s+(d.totalSpent||0),0);
              const dd = new Date(date+'T00:00:00');
              const wd = ['일','월','화','수','목','금','토'][dd.getDay()];
              const dayLabel = `${dd.getMonth()+1}/${dd.getDate()} (${wd})`;
              return (
                <div key={date}>
                  <div style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'8px 18px',background:'var(--cream2)',
                  }}>
                    <span style={{fontSize:11,fontWeight:700,color:'var(--ink3)',letterSpacing:'.3px'}}>{dayLabel}</span>
                    <span style={{fontSize:12,fontWeight:700,color:'var(--ink2)'}}>{fmtMoney(dayTotal)}</span>
                  </div>
                  {dayItems.map((d, idx) => {
                    const isExpanded = expandedId === d.id;
                    const hasItems = d.expenseItems && d.expenseItems.length > 0;
                    const isLast = idx === dayItems.length-1;
                    return (
                      <div key={d.id} style={{borderBottom: !isLast?'1px solid var(--cream2)':'none'}}>
                        <div
                          style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',cursor:'pointer'}}
                          onClick={()=>setExpandedId(isExpanded?null:d.id)}
                        >
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>
                              {d.content || '지출 기록'}
                            </div>
                            <div style={{fontSize:11,color:'var(--ink3)',marginTop:2}}>
                              {d.time} · {hasItems ? d.expenseItems.length+'개 항목' : '항목 없음'}
                            </div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:14,fontWeight:700,color:'var(--ink)',letterSpacing:'-.5px'}}>{fmtMoney(d.totalSpent)}</span>
                            {hasItems && <span style={{fontSize:11,color:'var(--ink3)'}}>{isExpanded?'▲':'▼'}</span>}
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{margin:'0 18px 10px',borderRadius:12,overflow:'hidden',border:'1px solid var(--cream2)'}}>
                            {hasItems && d.expenseItems.map((ei,i)=>(
                              <div key={i} style={{
                                display:'flex',justifyContent:'space-between',alignItems:'center',
                                padding:'9px 14px',borderBottom:i<d.expenseItems.length-1?'1px solid var(--cream2)':'none',
                                fontSize:13
                              }}>
                                <span style={{color:'var(--ink2)'}}>{ei.label}</span>
                                <span style={{fontWeight:600,color:'var(--ink)'}}>{fmtMoney(ei.amount)}</span>
                              </div>
                            ))}
                            <div style={{padding:'8px 14px',background:'var(--cream2)',display:'flex',justifyContent:'flex-end'}}>
                              <button onClick={()=>setDetailItem(d)} style={{
                                fontSize:12,fontWeight:600,color:'var(--accent)',border:'none',
                                background:'none',cursor:'pointer',fontFamily:'inherit'
                              }}>✏️ 수정하기</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}
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

      {detailItem && (
        <DetailSheet
          item={detailItem}
          onClose={()=>setDetailItem(null)}
          onSave={editDiaryWithTx}
          onDelete={deleteDiaryWithTx}
        />
      )}
    </div>
  );
}
