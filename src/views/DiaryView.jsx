import React, { useState, useMemo, useEffect } from 'react';
import { DiaryCard } from '../components/DiaryCard.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { useBudget } from '../context/BudgetContext.jsx';
import { getDailyPrompt } from '../constants/prompts.js';
import { today_str } from '../utils/helpers.js';

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

/** @param {{ onOpenSheet: (defaultWho: 'husband'|'wife') => void }} props */
export function DiaryView({ onOpenSheet }) {
  const { diaries, editDiaryWithTx, deleteDiaryWithTx, currentUser, budgets, tx } = useBudget();
  const [photo, setPhoto] = useState(/** @type {string | null} */ (null));
  const [detailItem, setDetailItem] = useState(/** @type {import('../constants/index.js').DiaryItem | null} */ (null));

  // P1-3: 자정 갱신 — 모듈 const 제거
  const [todayTick, setTodayTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTodayTick(t => t + 1);
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  const today = useMemo(() => today_str(), [todayTick]);

  // P3-1: 다이어리 검색
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDiaries = useMemo(() => {
    if (!searchQuery.trim()) return diaries;
    const q = searchQuery.trim().toLowerCase();
    return diaries.filter(d =>
      (d.content || '').toLowerCase().includes(q) ||
      (d.expenseItems || []).some(it => (it.label || '').toLowerCase().includes(q))
    );
  }, [diaries, searchQuery]);

  const groups = filteredDiaries.reduce((acc, d) => {
    (acc[d.date] = acc[d.date] || []).push(d);
    return acc;
  }, /** @type {Record<string, import('../constants/index.js').DiaryItem[]>} */ ({}));
  const sortedDates = Object.keys(groups).sort((a,b)=>new Date(b).getTime() - new Date(a).getTime());

  const thisMonth = today.substring(0, 7);
  const totalSpent = tx
    .filter(t => typeof t.date === 'string' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalBudget = Object.values(budgets).reduce((s,v)=>s+(typeof v === 'number' ? v : 0), 0);
  const remaining = totalBudget - totalSpent;

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>우리의 기록</h1>
          <div className="sub">{new Date().getMonth()+1}월의 다이어리 & 지출</div>
        </div>
        <button onClick={()=>onOpenSheet(currentUser)} style={{
          padding:'8px 14px',borderRadius:20,background:'var(--ink)',color:'white',
          border:'none',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer'
        }}>기록하기</button>
      </div>

      <div className="scroll-area">
        {/* P3-1: 검색 */}
        <div style={{ padding: '0 0 12px' }}>
          <input
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="다이어리·지출 메모 검색"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 12,
              border: '1px solid var(--cream3)', background: 'var(--cream2)',
              color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
          {searchQuery.trim() && (
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>
              {filteredDiaries.length}건 매칭
            </div>
          )}
        </div>
        <div className="month-banner">
          <div className="mb-left">
            <div className="mb-label">이번 달 총 지출</div>
            <div className="mb-amount">{fmtMoney(totalSpent)}</div>
            <div className="mb-sub">
              {totalBudget > 0 
                ? remaining > 0 ? `예산까지 ${fmtMoney(remaining)} 남음` : `예산을 ${fmtMoney(Math.abs(remaining))} 초과함` 
                : '이번 달 목표 예산을 설정해보세요'}
            </div>
          </div>
          <div style={{fontSize:32}}>💸</div>
        </div>

        {/* 오늘의 질문 */}
        <div className="today-prompt" onClick={()=>onOpenSheet(currentUser)}>
          <div className="prompt-icon">💭</div>
          <div className="prompt-text">
            <strong>오늘의 질문</strong>
            {getDailyPrompt()}
          </div>
        </div>

        {sortedDates.map(date => {
          const dObj = new Date(date);
          const isToday = date === today;
          const label = isToday ? '오늘' : `${dObj.getMonth()+1}월 ${dObj.getDate()}일`;
          return (
            <div key={date} className="day-group">
              <div className="day-label">{label}</div>
              {groups[date].map(item => (
                <DiaryCard key={item.id} item={item} currentUser={currentUser}
                  onPhotoClick={setPhoto} onCardClick={()=>setDetailItem(item)} />
              ))}
            </div>
          );
        })}
        {diaries.length === 0 && (
          <div style={{textAlign:'center',padding:'40px 0',color:'var(--ink3)'}}>
            아직 기록이 없어요.<br/>첫 번째 일기나 지출을 기록해보세요!
          </div>
        )}
      </div>

      {photo && (
        <div className="lightbox" onClick={()=>setPhoto(null)}>
          <img src={photo} alt="" onClick={e=>e.stopPropagation()} />
        </div>
      )}
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
