import React, { useMemo, useState } from 'react';
import { MiniCalendar } from '../components/MiniCalendar.jsx';
import { useBudget } from '../context/BudgetContext.jsx';
import { toDateStr, fmt } from '../utils/helpers.js';

/**
 * @typedef {{ id: number, date: string, title: string, who: 'husband'|'wife'|'joint', cycle?: 'none'|'monthly'|'yearly_solar', isAnnual?: boolean, isWork?: boolean }} ScheduleItem
 */

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

/**
 * @typedef {Object} EditingSchedule
 * @property {number} id
 * @property {string} title
 * @property {'husband'|'wife'|'joint'} who
 * @property {'none'|'monthly'|'yearly_solar'} cycle
 */

export function HistoryView() {
  const { diaries, tx, plan, setPlan, names, currentUser } = useBudget();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newSched, setNewSched] = useState('');
  const [newSchedWho, setNewSchedWho] = useState(/** @type {'husband'|'wife'|'joint'} */ (currentUser));
  const [newCycle, setNewCycle] = useState(/** @type {'none'|'monthly'|'yearly_solar'} */ ('none'));
  const [editing, setEditing] = useState(/** @type {EditingSchedule|null} */ (null));

  const schedules = /** @type {ScheduleItem[]} */ (Array.isArray(plan?.schedules) ? plan.schedules : []);
  const selStr = toDateStr(selectedDate);
  const dayTx = useMemo(() => tx.filter(t => t.date === selStr), [tx, selStr]);
  const daySchedules = useMemo(() => pickSchedules(schedules, selStr), [schedules, selStr]);

  const husbandTotal = useMemo(
    () => dayTx.filter(t => t.who === 'husband').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [dayTx]
  );
  const wifeTotal = useMemo(
    () => dayTx.filter(t => t.who === 'wife').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [dayTx]
  );
  const dayTotal = husbandTotal + wifeTotal;

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
    if (!window.confirm('이 일정을 삭제할까요?')) return;
    setPlan({ ...plan, schedules: schedules.filter(s => s.id !== id) });
    if (editing && editing.id === id) setEditing(null);
  };

  const saveEdit = () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return;
    setPlan({
      ...plan,
      schedules: schedules.map(s => s.id === editing.id
        ? { ...s, title, who: editing.who, cycle: editing.cycle }
        : s),
    });
    setEditing(null);
  };

  const selDateLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  return (
    <div className="view">
      <div className="view-header"><h1>캘린더</h1></div>
      <MiniCalendar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        diaries={diaries}
        tx={tx}
        schedules={schedules}
      />

      <div className="scroll-area" style={{ paddingTop: 0 }}>
        <div style={sectionHeader}>
          <span>{selDateLabel}</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink3)' }}>
            일정 {daySchedules.length} · 지출 {dayTx.length}
          </span>
        </div>

        <div style={{ padding: '0 16px', marginBottom: 16 }}>
          <div className="widget" style={{ marginBottom: 12 }}>
            <div className="widget-title">오늘의 지출 총액</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={totalCardStyle('husband')}>
                <div style={totalLabelStyle}>👨 {names.husband}</div>
                <div style={totalAmtStyle}>{fmt(husbandTotal)}</div>
              </div>
              <div style={totalCardStyle('wife')}>
                <div style={totalLabelStyle}>👩 {names.wife}</div>
                <div style={totalAmtStyle}>{fmt(wifeTotal)}</div>
              </div>
            </div>
            <div style={sumRowStyle}>
              <span style={{ fontSize: 12, color: 'var(--ink3)' }}>합계</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{fmt(dayTotal)}</span>
            </div>
          </div>

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
              {daySchedules.map(s => {
                const isEditing = editing && editing.id === s.id;
                if (isEditing) {
                  return (
                    <div key={s.id} style={{ ...schedRowStyle, flexWrap: 'wrap', gap: 6 }}>
                      <select value={editing.who}
                        onChange={e => setEditing({ ...editing, who: /** @type {'husband'|'wife'|'joint'} */ (e.target.value) })}
                        style={selectStyle}>
                        <option value="husband">{names.husband}</option>
                        <option value="wife">{names.wife}</option>
                        <option value="joint">공동</option>
                      </select>
                      <input
                        value={editing.title}
                        onChange={e => setEditing({ ...editing, title: e.target.value })}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); }}
                        style={{ ...inputStyle, minWidth: 0 }}
                        autoFocus
                      />
                      <select value={editing.cycle}
                        onChange={e => setEditing({ ...editing, cycle: /** @type {'none'|'monthly'|'yearly_solar'} */ (e.target.value) })}
                        style={selectStyle}>
                        <option value="none">단일</option>
                        <option value="monthly">매월</option>
                        <option value="yearly_solar">매년</option>
                      </select>
                      <button onClick={saveEdit} style={addBtnStyle}>✓</button>
                      <button onClick={() => setEditing(null)} style={delBtnStyle}>×</button>
                    </div>
                  );
                }
                return (
                  <div key={s.id} style={schedRowStyle}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: s.who === 'husband' ? 'var(--h-mid)' : s.who === 'wife' ? 'var(--w-mid)' : 'var(--ink)',
                    }} />
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                      {s.cycle === 'yearly_solar' && <span style={badgeStyle}>매년</span>}
                      {s.cycle === 'monthly' && <span style={badgeStyle}>매월</span>}
                      {s.isWork && <span style={badgeStyle}>근무</span>}
                    </div>
                    <button
                      onClick={() => setEditing({
                        id: s.id,
                        title: s.title,
                        who: s.who,
                        cycle: s.cycle || 'none',
                      })}
                      style={editBtnStyle}
                      aria-label="수정"
                    >✎</button>
                    <button onClick={() => removeSchedule(s.id)} style={delBtnStyle} aria-label="삭제">×</button>
                  </div>
                );
              })}
              {daySchedules.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink3)', padding: '6px 0' }}>등록된 일정이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @param {'husband'|'wife'} who @returns {React.CSSProperties} */
function totalCardStyle(who) {
  return {
    flex: 1, padding: '10px 12px', borderRadius: 12,
    background: who === 'husband' ? 'var(--h-bg, #eaf0ff)' : 'var(--w-bg, #fce7f3)',
    border: `1px solid ${who === 'husband' ? 'var(--h-mid)' : 'var(--w-mid)'}33`,
    display: 'flex', flexDirection: 'column', gap: 4,
  };
}
/** @type {React.CSSProperties} */
const totalLabelStyle = { fontSize: 11, color: 'var(--ink3)', fontWeight: 600 };
/** @type {React.CSSProperties} */
const totalAmtStyle = { fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.5px' };
/** @type {React.CSSProperties} */
const sumRowStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginTop: 10, paddingTop: 8, borderTop: '1px dashed var(--cream3)',
};
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
  border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, flexShrink: 0,
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
const editBtnStyle = {
  background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 14,
};
/** @type {React.CSSProperties} */
const delBtnStyle = {
  background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 16,
};
