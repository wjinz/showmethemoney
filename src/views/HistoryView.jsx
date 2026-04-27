import React, { useState } from 'react';
import { MiniCalendar } from '../components/MiniCalendar.jsx';
import { DiaryCard } from '../components/DiaryCard.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { useBudget } from '../context/BudgetContext.jsx';
import { toDateStr, parseLocalDate } from '../utils/helpers.js';

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

export function HistoryView() {
  const { diaries, currentUser, editDiaryWithTx, deleteDiaryWithTx } = useBudget();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailItem, setDetailItem] = useState(/** @type {import('../constants/index.js').DiaryItem | null} */ (null));

  // P1-1: toISOString 대신 로컬 날짜 문자열로 변환
  const selStr = toDateStr(selectedDate);
  const dayDiaries = diaries.filter(d => d.date === selStr);

  const monthDiaries = diaries.filter(d => d.date.startsWith(selStr.substring(0,7)));
  const topEmojis = Object.entries(monthDiaries.filter(d => d.type === 'diary' && d.emoji).reduce((acc,d)=>{
    acc[d.emoji] = (acc[d.emoji]||0)+1; return acc;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,3);

  const dailyExpenses = Object.entries(monthDiaries.filter(d => d.type === 'expense').reduce((acc,d)=>{
    acc[d.date] = (acc[d.date]||0)+(d.totalSpent||0); return acc;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);

  return (
    <div className="view">
      <div className="view-header"><h1>우리의 내역</h1></div>
      <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} diaries={diaries} />

      <div className="scroll-area" style={{paddingTop:0}}>
        <div style={{fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:12,padding:'0 16px',display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
          <span>{selectedDate.getDate()}일의 기록</span>
          <span style={{fontSize:12,fontWeight:500,color:'var(--ink3)'}}>{dayDiaries.length}개</span>
        </div>

        {dayDiaries.length > 0 ? (
          <div style={{padding:'0 16px',marginBottom:24}}>
            {dayDiaries.map(item => (
              <DiaryCard key={item.id} item={item} currentUser={currentUser}
                onPhotoClick={()=>null} onCardClick={()=>setDetailItem(item)} />
            ))}
          </div>
        ) : (
          <div style={{padding:'30px 16px',textAlign:'center',color:'var(--ink3)',fontSize:13,background:'white',margin:'0 16px 24px',borderRadius:16,border:'1px dashed var(--cream3)'}}>
            이 날은 기록이 없어요
          </div>
        )}

        <div style={{fontSize:14,fontWeight:700,color:'var(--ink)',marginBottom:12,padding:'0 16px'}}>
          {selectedDate.getMonth()+1}월 요약
        </div>

        <div style={{padding:'0 16px'}}>
          {dailyExpenses.length > 0 && (
            <div className="widget">
              <div className="widget-title">가장 지출이 많았던 날 (Top 5)</div>
              {dailyExpenses.map(([date, amt], i) => {
                const localD = parseLocalDate(date); // P1-1: 로컬 자정으로 파싱
                const wd = ['일','월','화','수','목','금','토'][localD.getDay()];
                return (
                  <div key={date} style={{display:'flex',alignItems:'center',gap:10,marginBottom:i<dailyExpenses.length-1?10:0}}>
                    <div style={{
                      width:24,height:24,borderRadius:50,
                      background:i===0?'var(--ink)':i===1?'var(--ink2)':'var(--cream3)',
                      color:i<2?'white':'var(--ink3)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:12,fontWeight:700,flexShrink:0
                    }}>{i+1}</div>
                    <div style={{flex:1,fontSize:13,color:'var(--ink2)'}}>
                      {localD.getMonth()+1}월 {localD.getDate()}일 ({wd})
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--ink)',letterSpacing:'-.5px'}}>{fmtMoney(amt)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {topEmojis.length > 0 && (
            <div className="widget">
              <div className="widget-title">이번 달 우리의 기분</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {topEmojis.map(([emoji,cnt])=>(
                  <div key={emoji} style={{
                    display:'flex',alignItems:'center',gap:5,
                    padding:'6px 12px',borderRadius:20,background:'var(--cream2)',
                    fontSize:13
                  }}>
                    <span style={{fontSize:18}}>{emoji}</span>
                    <span style={{fontWeight:600,color:'var(--ink2)'}}>{cnt}회</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
