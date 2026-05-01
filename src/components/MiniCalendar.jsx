import React, { useState, useMemo } from 'react';
import { toDateStr, today_str } from '../utils/helpers.js';

/**
 * @typedef {{ date: string, who?: string }} ScheduleLite
 * @typedef {{ date: string, amount: number }} TxLite
 *
 * @param {Object} props
 * @param {Date} props.selectedDate
 * @param {(d: Date) => void} props.onSelectDate
 * @param {import('../constants/index.js').DiaryItem[]} props.diaries
 * @param {TxLite[]=} props.tx
 * @param {ScheduleLite[]=} props.schedules
 */
export function MiniCalendar({ selectedDate, onSelectDate, diaries, tx, schedules }) {
  const [calOpen, setCalOpen] = useState(true);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth()); // 0-indexed

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const dailyExpense = useMemo(() => {
    /** @type {Record<string, number>} */
    const acc = {};
    if (!Array.isArray(tx)) return acc;
    for (const t of tx) {
      if (typeof t.date !== 'string') continue;
      acc[t.date] = (acc[t.date] || 0) + (Number(t.amount) || 0);
    }
    return acc;
  }, [tx]);

  /** @param {Date} d */
  const getDots = (d) => {
    if (!d) return /** @type {string[]} */ ([]);
    const ds = toDateStr(d);
    const dots = /** @type {string[]} */ ([]);
    const day = diaries.filter(x => x.date === ds);
    if (day.some(x => x.who === 'husband')) dots.push('h');
    if (day.some(x => x.who === 'wife')) dots.push('w');
    if (day.some(x => x.type === 'diary' && Array.isArray(x.photos) && x.photos.length > 0)) dots.push('photo');
    if (Array.isArray(schedules) && schedules.some(s => s.date === ds)) dots.push('event');
    return dots.slice(0, 4);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(viewYear, viewMonth, i));

  const todayStr = today_str();
  const selStr = toDateStr(selectedDate);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); return; }
    setViewMonth(m => m - 1);
  };
  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); return; }
    setViewMonth(m => m + 1);
  };
  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(now);
  };

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;
  const monthTotal = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    let sum = 0;
    for (const k of Object.keys(dailyExpense)) {
      if (k.startsWith(prefix)) sum += dailyExpense[k];
    }
    return sum;
  }, [dailyExpense, viewYear, viewMonth]);

  return (
    <div className={`cal-wrap ${calOpen ? 'open' : ''}`} style={{ maxHeight: calOpen ? 460 : 52 }}>
      <div className="cal-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={goPrev} aria-label="이전 달" style={navBtnStyle}>‹</button>
        <div style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }} onClick={() => setCalOpen(v => !v)}>
          <div className="cal-month" style={{ fontSize: 15, fontWeight: 700 }}>{monthLabel}</div>
          {monthTotal > 0 && (
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
              {viewMonth + 1}월 지출 {monthTotal.toLocaleString('ko-KR')}원
            </div>
          )}
        </div>
        <button onClick={goToday} style={navBtnStyle} aria-label="오늘로">오늘</button>
        <button onClick={goNext} aria-label="다음 달" style={navBtnStyle}>›</button>
      </div>
      <div className="cal-body">
        <div className="cal-weekdays">
          {['일', '월', '화', '수', '목', '금', '토'].map(wd => <span key={wd}>{wd}</span>)}
        </div>
        <div className="cal-days">
          {days.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="cal-day empty"><div className="cal-day-num"></div></div>;
            const ds = toDateStr(d);
            const isToday = ds === todayStr;
            const isSel = ds === selStr;
            const wd = d.getDay();
            const dots = getDots(d);
            const amt = dailyExpense[ds] || 0;
            const cls = `cal-day ${isSel ? 'selected' : ''} ${isToday ? 'today' : ''} ${wd === 0 ? 'sunday' : wd === 6 ? 'saturday' : ''}`;
            return (
              <div key={i} className={cls} onClick={() => onSelectDate(d)}>
                <div className="cal-day-num">{d.getDate()}</div>
                {amt > 0 && (
                  <div style={{ fontSize: 8, color: isSel ? 'var(--primary)' : 'var(--ink3)', marginTop: 1, lineHeight: 1 }}>
                    {amt >= 10000 ? `${Math.round(amt / 10000)}만` : amt.toLocaleString('ko-KR')}
                  </div>
                )}
                <div className="cal-dots">
                  {dots.map((dot, di) => <div key={di} className={`cal-dot ${dot}`}></div>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** @type {React.CSSProperties} */
const navBtnStyle = {
  padding: '4px 10px', borderRadius: 8, border: '1px solid var(--cream3)',
  background: 'var(--cream2)', color: 'var(--ink2)', fontSize: 12, fontFamily: 'inherit',
  cursor: 'pointer', fontWeight: 600,
};
