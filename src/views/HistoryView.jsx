import React, { useMemo, useState } from 'react';
import { MiniCalendar } from '../components/MiniCalendar.jsx';
import { DiaryCard } from '../components/DiaryCard.jsx';
import { DetailSheet } from '../components/DetailSheet.jsx';
import { useBudget } from '../context/BudgetContext.jsx';
import { CAT } from '../constants/index.js';
import { toDateStr, parseLocalDate, fmt } from '../utils/helpers.js';

/**
 * @typedef {{ id: number, date: string, title: string, who: 'husband'|'wife'|'joint', cycle?: 'none'|'monthly'|'yearly_solar', isAnnual?: boolean, isWork?: boolean }} ScheduleItem
 */

/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(v || 0);

/**
 * @param {ScheduleItem[]} list
 * @param {string} dateStr
 * @returns {ScheduleItem[]}
 */
function pickSchedules(list, dateStr) {
  const [, mm, dd] = dateStr.split('-');
  const mmdd = `${mm}-${dd}`;
  return list.filter(s => {
    if (s.isWork) return s.date === dateStr;
    if (s.cycle === 'yearly_solar' || s.isAnnual) return s.date.slice(5, 10) === mmdd;
    if (s.cycle === 'monthly') return s.date.slice(8, 10) === dd;
    return s.date === dateStr;
  });
}

export function HistoryView() {
  const { diaries, currentUser, editDiaryWithTx, deleteDiaryWithTx, tx, plan, setPlan, names } = useBudget();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailItem, setDetailItem] = useState(/** @type {import('../constants/index.js').DiaryItem | null} */ (null));
  const [newSched, setNewSched] = useState('');
  const [newSchedWho, setNewSchedWho] = useState(/** @type {'husband'|'wife'|'joint'} */ (currentUser));
  const [newCycle, setNewCycle] = useState(/** @type {'none'|'monthly'|'yearly_solar'} */ ('none'));

  const schedules = /** @type {ScheduleItem[]} */ (Array.isArray(plan?.schedules) ? plan.schedules : []);
  const selStr = toDateStr(selectedDate);
  const dayDiaries = diaries.filter(d => d.date === selStr);
  const dayTx = useMemo(() => tx.filter(t => t.date === selStr).sort((a, b) => b.id - a.id), [tx, selStr]);
  const daySchedules = useMemo(() => pickSchedules(schedules, selStr), [schedules, selStr]);

  const monthPrefix = selStr.substring(0, 7);
  const monthDiaries = diaries.filter(d => d.date.startsWith(monthPrefix));
  const monthTx = tx.filter(t => t.date.startsWith(monthPrefix));

  const topEmojis = useMemo(() => Object.entries(monthDiaries
    .filter(d => d.type === 'diary' && d.emoji)
    .reduce((acc, d) => { acc[d.emoji] = (acc[d.emoji] || 0) + 1; return acc; }, /** @type {Record<string, number>} */ ({})))
    .sort((a, b) => b[1] - a[1]).slice(0, 3), [monthDiaries]);

  const dailyExpenses = useMemo(() => {
    /** @type {Record<string, number>} */
    const acc = {};
    for (const t of monthTx) acc[t.date] = (acc[t.date] || 0) + (Number(t.amount) || 0);
    return Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [monthTx]);

  const dayTotal = dayTx.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const addSchedule = () => {
    const title = newSched.trim();
    if (!title) return;
    /** @type {ScheduleItem} */
    const item = {
      id: Date.now() * 1000 + (Math.random() * 1000 | 0),
      date: selStr,
      title,
      who: newSchedWho,
      cycle: newCycle,
    };
    setPlan({ ...plan, schedules: [...schedules, item] });
    setNewSched('');
    setNewCycle('none');
  };

  /** @param {number} id */
  const removeSchedule = (id) => {
    setPlan({ ...plan, schedules: schedules.filter(s => s.id !== id) });
  };

  const selDateLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  return (
    <div className="view">
      <div className="view-header"><h1>우리의 내역</h1></div>
      <MiniCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        diaries={diaries}
        tx={tx}
        schedules={schedules}
      />

      <div className="scroll-area" style={{ paddingTop: 0 }}>
        <div style={sectionHeader}>
          <span>{selDateLabel}의 기록</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink3)' }}>
            일정 {daySchedules.length} · 다이어리 {dayDiaries.length} · 지출 {dayTx.length}
          </span>
        </div>

        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div className="widget" style={{ marginBottom: 12 }}>
            <div className="widget-title">일정</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={newSchedWho} onChange={e => setNewSchedWho(/** @type {'husband'|'wife'|'joint'} */ (e.target.value))}
                  style={selectStyle}>
                  <option value="husband">{names.husband}</option>
                  <option value="wife">{names.wife}</option>
                  <option value="joint">공동</option>
                </select>
                <input
                  value={newSched}
                  onChange={e => setNewSched(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSchedule(); }}
                  placeholder="새 일정 (예: 회의, 기념일)"
                  style={inputStyle}
                />
                <button onClick={addSchedule} style={addBtnStyle}>+</button>
              </div>
              <select value={newCycle} onChange={e => setNewCycle(/** @type {'none'|'monthly'|'yearly_solar'} */ (e.target.value))}
                style={{ ...selectStyle, width: '100%' }}>
                <option value="none">단일 일정</option>
                <option value="monthly">매월 반복</option>
                <option value="yearly_solar">매년 반복</option>
              </select>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {daySchedules.map(s => (
                <div key={s.id} style={schedRowStyle}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: s.who === 'husband' ? 'var(--h-mid)' : s.who === 'wife' ? 'var(--w-mid)' : 'var(--ink)' }} />
                  <div style={{ flex: 1, fontSize: 13, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.title}
                    {s.cycle === 'yearly_solar' && <span style={badgeStyle}>매년</span>}
                    {s.cycle === 'monthly' && <span style={badgeStyle}>매월</span>}
                    {s.isWork && <span style={badgeStyle}>근무</span>}
                  </div>
                  <button onClick={() => removeSchedule(s.id)} style={delBtnStyle}>×</button>
                </div>
              ))}
              {daySchedules.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', padding: '6px 0' }}>등록된 일정이 없습니다.</div>
              )}
            </div>
          </div>

          {dayTx.length > 0 && (
            <div className="widget" style={{ marginBottom: 12 }}>
              <div className="widget-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>지출 내역</span>
                <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 700 }}>{fmt(dayTotal)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayTx.map(t => {
                  const c = CAT[t.cat];
                  return (
                    <div key={t.id} style={txRowStyle}>
                      <div style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{c?.icon || '💸'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{c?.label || '기타'}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.memo || '—'}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>-{(Number(t.amount) || 0).toLocaleString('ko-KR')}원</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {dayDiaries.length > 0 ? (
            <div>
              {dayDiaries.map(item => (
                <DiaryCard key={item.id} item={item} currentUser={currentUser}
                  onPhotoClick={() => null} onCardClick={() => setDetailItem(item)} />
              ))}
            </div>
          ) : (
            <div style={emptyDiaryStyle}>이 날의 다이어리가 없어요</div>
          )}
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, padding: '0 16px' }}>
          {selectedDate.getMonth() + 1}월 요약
        </div>

        <div style={{ padding: '0 16px' }}>
          {dailyExpenses.length > 0 && (
            <div className="widget">
              <div className="widget-title">가장 지출이 많았던 날 (Top 5)</div>
              {dailyExpenses.map(([date, amt], i) => {
                const localD = parseLocalDate(date);
                const wd = ['일', '월', '화', '수', '목', '금', '토'][localD.getDay()];
                return (
                  <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < dailyExpenses.length - 1 ? 10 : 0 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 50,
                      background: i === 0 ? 'var(--ink)' : i === 1 ? 'var(--ink2)' : 'var(--cream3)',
                      color: i < 2 ? 'white' : 'var(--ink3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--ink2)' }}>
                      {localD.getMonth() + 1}월 {localD.getDate()}일 ({wd})
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmtMoney(amt)}</div>
                  </div>
                );
              })}
            </div>
          )}

          {topEmojis.length > 0 && (
            <div className="widget">
              <div className="widget-title">이번 달 우리의 기분</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {topEmojis.map(([emoji, cnt]) => (
                  <div key={emoji} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, background: 'var(--cream2)', fontSize: 13,
                  }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span style={{ fontWeight: 600, color: 'var(--ink2)' }}>{cnt}회</span>
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
          onClose={() => setDetailItem(null)}
          onSave={editDiaryWithTx}
          onDelete={deleteDiaryWithTx}
        />
      )}
    </div>
  );
}

/** @type {React.CSSProperties} */
const sectionHeader = {
  fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, padding: '0 16px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
};
/** @type {React.CSSProperties} */
const selectStyle = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream3)',
  background: 'var(--cream2)', color: 'var(--ink2)', fontSize: 12, fontFamily: 'inherit',
};
/** @type {React.CSSProperties} */
const inputStyle = {
  flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--cream3)',
  background: 'white', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};
/** @type {React.CSSProperties} */
const addBtnStyle = {
  width: 34, height: 34, borderRadius: 8, background: 'var(--ink)', color: 'white',
  border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 700, flexShrink: 0,
};
/** @type {React.CSSProperties} */
const schedRowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
  background: 'var(--cream2)', borderRadius: 10,
};
/** @type {React.CSSProperties} */
const badgeStyle = {
  fontSize: 10, padding: '1px 6px', borderRadius: 6,
  border: '1px solid var(--cream3)', color: 'var(--ink3)', background: 'white',
};
/** @type {React.CSSProperties} */
const delBtnStyle = {
  background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 16,
};
/** @type {React.CSSProperties} */
const txRowStyle = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
  borderBottom: '1px dashed var(--cream3)',
};
/** @type {React.CSSProperties} */
const emptyDiaryStyle = {
  padding: '20px 16px', textAlign: 'center', color: 'var(--ink3)', fontSize: 13,
  background: 'white', borderRadius: 16, border: '1px dashed var(--cream3)',
};
