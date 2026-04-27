import React, { useState } from 'react';

export function MiniCalendar({ selectedDate, onSelectDate, diaries }) {
  const [calOpen, setCalOpen] = useState(true);
  const m = selectedDate.getMonth();
  const y = selectedDate.getFullYear();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const days = [];
  
  for(let i=0; i<firstDay; i++) days.push(null);
  for(let i=1; i<=daysInMonth; i++) days.push(new Date(y, m, i));

  const getDots = d => {
    if(!d) return [];
    // timezone safe local ISO format
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const ds = diaries.filter(x => x.date === localDate);
    const dots = [];
    if(ds.some(x => x.who === 'husband')) dots.push('h');
    if(ds.some(x => x.who === 'wife')) dots.push('w');
    if(ds.some(x => x.type === 'diary' && x.photos && x.photos.length > 0)) dots.push('photo');
    return dots.slice(0,3);
  };

  return (
    <div className={`cal-wrap ${calOpen?'open':''}`} style={{maxHeight:calOpen?400:52}}>
      <div className="cal-header" onClick={()=>setCalOpen(!calOpen)}>
        <div className="cal-month">{m+1}월</div>
        <button className={`cal-toggle ${calOpen?'open':''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink2)" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div className="cal-body">
        <div className="cal-weekdays">
          {['일','월','화','수','목','금','토'].map(wd=><span key={wd}>{wd}</span>)}
        </div>
        <div className="cal-days">
          {days.map((d, i) => {
            if(!d) return <div key={`empty-${i}`} className="cal-day empty"><div className="cal-day-num"></div></div>;
            
            const localDateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const selStr = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            const isToday = localDateStr === todayStr;
            const isSel = localDateStr === selStr;
            const wd = d.getDay();
            const dots = getDots(d);
            
            return (
              <div key={i} className={`cal-day ${isSel?'selected':''} ${isToday?'today':''} ${wd===0?'sunday':wd===6?'saturday':''}`}
                onClick={()=>onSelectDate(d)}>
                <div className="cal-day-num">{d.getDate()}</div>
                <div className="cal-dots">
                  {dots.map((dot,di)=><div key={di} className={`cal-dot ${dot}`}></div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
