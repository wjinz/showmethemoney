import { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Briefcase } from 'lucide-react';
import { getYear, getMonth, DNAMES, CAT } from '../../constants';
import { getDayInfo } from '../../constants/holidays';
import { fmtS, toDateStr, today_str } from '../../utils/helpers';
import { Chip } from '../../components/UI';
import { ScheduleScanSheet } from '../../components/ScheduleScanSheet';

export function CalendarWidget({ plan, tx, cards, names, setPlan }) {
  const [selDate, setSelDate] = useState(toDateStr(new Date()));
  const [viewYear, setViewYear] = useState(getYear());
  const [viewMonth, setViewMonth] = useState(getMonth());
  const [newSched, setNewSched] = useState("");
  const [newSchedWho, setNewSchedWho] = useState("husband");
  const [newCycle, setNewCycle] = useState("none");
  const [showScan, setShowScan] = useState(false);

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const schedules = plan.schedules || [];
  
  const dailyMap = {};
  tx.filter(t => !t.is_private).forEach(t => {
    const [ty, tm] = t.date.split("-").map(Number);
    if (ty === viewYear && tm === viewMonth) {
      dailyMap[t.date] = (dailyMap[t.date] || 0) + t.amount;
    }
  });

  const maxDaily = Math.max(...Object.values(dailyMap), 1);
  const totalBudget = Object.values(plan.budgets || {}).reduce((s,v)=>s+v,0) || 1000000;
  const dailyBudget = totalBudget / daysInMonth;

  const handleAddSchedule = () => {
    if (!newSched.trim()) return;
    const item = {
      id: Date.now(),
      date: selDate,
      who: newSchedWho,
      title: newSched.trim(),
      cycle: newCycle
    };
    setPlan({ ...plan, schedules: [...schedules, item] });
    setNewSched("");
    setNewCycle("none");
  };

  const handleDelSchedule = (id) => {
    setPlan({ ...plan, schedules: schedules.filter(s => s.id !== id) });
  };

  const getSchedsForDate = (dateStr) => {
    const [yyyy, mm, dd] = dateStr.split("-");
    const mmdd = `${mm}-${dd}`;
    return schedules.filter(s => {
      if (s.isWork) return s.date === dateStr;
      if (s.isAnnual && !s.cycle) return s.date.slice(5, 10) === mmdd; // backward compatibility
      if (s.cycle === 'yearly_solar') return s.date.slice(5, 10) === mmdd;
      if (s.cycle === 'monthly') return s.date.slice(8, 10) === dd;
      return s.date === dateStr;
    });
  };

  const selTx = tx.filter(t => !t.is_private && t.date === selDate).sort((a,b)=>b.id-a.id);
  const selTotal = selTx.reduce((s,t)=>s+t.amount, 0);
  const selScheds = getSchedsForDate(selDate);
  const selDayInfo = getDayInfo(selDate);
  const selHoliday = selDayInfo ? selDayInfo.name : null;
  const isSelRedHoliday = selDayInfo ? selDayInfo.isRed : false;

  const prevMonth = () => { if (viewMonth===1) { setViewYear(y=>y-1); setViewMonth(12); } else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===12) { setViewYear(y=>y+1); setViewMonth(1); } else setViewMonth(m=>m+1); };

  const selDateLabel = `${selDate.split("-")[1]}월 ${selDate.split("-")[2].replace(/^0/,"")}일`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(200,168,75,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <CalendarIcon size={18} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>부부 캘린더</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => setShowScan(true)} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, color: '#3B82F6', cursor: 'pointer', padding: '6px 12px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} /> 근무표 스캔</button>
          <button onClick={prevMonth} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-faint)', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{viewYear}.{String(viewMonth).padStart(2,'0')}</span>
          <button onClick={nextMonth} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-faint)', cursor: 'pointer', padding: '4px 8px', fontSize: 16 }}>›</button>
        </div>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
        {/* 요일 헤더 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 6 }}>
          {DNAMES.map((d,i) => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: i===0 ? "var(--danger)" : i===6 ? "#3B82F6" : "var(--text-faint)", padding: "3px 0" }}>{d}</div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
          {Array(firstDay).fill(null).map((_,i) => <div key={"e"+i}/>)}
          {Array(daysInMonth).fill(null).map((_,i) => {
            const d = i+1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const dayInfo = getDayInfo(dateStr);
            const holidayName = dayInfo ? dayInfo.name : null;
            const isRedHoliday = dayInfo ? dayInfo.isRed : false;
            
            const amt = dailyMap[dateStr]||0;
            const isSel = dateStr === selDate;
            const isToday = dateStr === today_str();
            const isOver = amt > dailyBudget * 1.5;
            const weekday = (firstDay + i) % 7;
            const dayScheds = getSchedsForDate(dateStr);
            const intensity = amt>0 ? Math.min(amt/maxDaily, 1) : 0;
            const heatBg = amt > 0 ? `rgba(${isOver?"217,95,95":"77,171,135"}, ${0.15 + intensity*0.5})` : "var(--surface-alt)";
            
            const hasHusband = dayScheds.some(s => s.who === 'husband');
            const hasWife = dayScheds.some(s => s.who === 'wife');
            const hasJoint = dayScheds.some(s => s.who === 'joint');
            
            const dayWorkScheds = dayScheds.filter(s => s.isWork);
            const husbandWork = dayWorkScheds.find(s => s.who === 'husband');
            const wifeWork = dayWorkScheds.find(s => s.who === 'wife');

            // 근무 코드별 전용 색상 매핑
            const getWorkColor = (code) => {
              if (code === 'N') return '#2D336B';   // 짙은 남색 (야간)
              if (code === 'D') return '#5AB2FF';   // 하늘색 (주간)
              if (code === 'X') return '#9CA3AF';   // 회색 (오프)
              if (code?.includes('M')) return '#A855F7'; // 보라색 (M12)
              return '#3B82F6';
            };

            return (
              <div key={d} onClick={() => setSelDate(dateStr)} style={{
                borderRadius: 8, padding: "4px 2px", cursor: "pointer", textAlign: "center", position: "relative",
                background: isSel ? "rgba(28,43,74,.08)" : heatBg,
                border: `1px solid ${isSel ? "var(--primary)" : "transparent"}`,
                transition: "all .12s", minHeight: 52, overflow: "hidden"
              }}>
                <div style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 500, lineHeight: 1,
                  color: isToday ? "var(--primary)" : isSel ? "var(--primary)" : (isRedHoliday || weekday===0) ? "var(--danger)" : weekday===6 ? "#3B82F6" : "var(--text)"
                }}>{d}</div>
                
                {holidayName && <div style={{ fontSize: 9, color: isRedHoliday ? "var(--danger)" : "var(--text-faint)", marginTop: 2, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>{holidayName}</div>}
                {amt > 0 && <div style={{ fontSize: 8, color: isSel ? "var(--primary)" : "var(--text-muted)", marginTop: 2, lineHeight: 1, transform: "scale(0.9)" }}>{fmtS(amt)}</div>}
                
                {/* 근무 레이블 또는 점 표시 */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, position: 'absolute', bottom: 3, width: '100%', padding: '0 2px' }}>
                  {dayWorkScheds.length > 0 ? (
                    <div style={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
                      {husbandWork && (
                        <div style={{ 
                          fontSize: 9, fontWeight: 900, color: '#fff', background: getWorkColor(husbandWork.title), 
                          padding: '1px 3px', borderRadius: 4, lineHeight: 1, transform: 'scale(0.85)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {husbandWork.title}
                        </div>
                      )}
                      {wifeWork && (
                        <div style={{ 
                          fontSize: 9, fontWeight: 900, color: '#fff', background: getWorkColor(wifeWork.title), 
                          padding: '1px 3px', borderRadius: 4, lineHeight: 1, transform: 'scale(0.85)',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {wifeWork.title}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {hasHusband && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--h)' }} title={`${names.husband} 일정`} />}
                      {hasWife && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--w)' }} title={`${names.wife} 일정`} />}
                      {hasJoint && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--primary)' }} title="공동 일정" />}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 상세 내역 영역 */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {selDateLabel} 일정/지출
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: selTotal>0 ? 'var(--primary)' : 'var(--text-faint)' }}>
              {selTotal>0 ? `${fmtS(selTotal)}원 지출` : '지출 없음'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {selHoliday && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: isSelRedHoliday ? 'rgba(217,95,95,0.1)' : 'var(--surface-alt)', borderRadius: 8, border: `1px solid ${isSelRedHoliday ? 'rgba(217,95,95,0.3)' : 'var(--border)'}` }}>
                <span style={{ fontSize: 14 }}>{isSelRedHoliday ? '🎊' : '🎉'}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: isSelRedHoliday ? 'var(--danger)' : 'var(--text)' }}>{selHoliday}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                <select value={newSchedWho} onChange={e => setNewSchedWho(e.target.value)} style={{ padding: '8px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', outline: 'none' }}>
                  <option value="husband">{names.husband} 일정</option>
                  <option value="wife">{names.wife} 일정</option>
                  <option value="joint">공동 일정</option>
                </select>
                <input value={newSched} onChange={e => setNewSched(e.target.value)} placeholder="새 일정 (생일, 회식 등)" onKeyDown={e => e.key === 'Enter' && handleAddSchedule()} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'var(--surface-alt)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text)', outline: 'none', minWidth: 100 }} />
                <button onClick={handleAddSchedule} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} strokeWidth={3} /></button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={newCycle} onChange={e => setNewCycle(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--surface-alt)', border: 'none', fontSize: 11, color: 'var(--text-muted)', outline: 'none', width: 'fit-content', cursor: 'pointer' }}>
                  <option value="none">단일 일정 (반복 없음)</option>
                  <option value="monthly">매월 반복 (월세, 공과금 등)</option>
                  <option value="yearly_solar">매년 반복 (결혼기념일, 생일 등)</option>
                </select>
              </div>
            </div>

            {selScheds.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: s.who === 'husband' ? 'var(--h)' : s.who === 'wife' ? 'var(--w)' : 'var(--primary)' }} />
                <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.title}
                  {(s.isAnnual || s.cycle === 'yearly_solar') && <span style={{ fontSize: 9, color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, padding: '1px 4px', background: 'rgba(28,43,74,.08)' }}>매년</span>}
                  {s.cycle === 'monthly' && <span style={{ fontSize: 9, color: '#3B82F6', border: '1px solid #3B82F6', borderRadius: 4, padding: '1px 4px', background: 'rgba(59,130,246,0.1)' }}>매월</span>}
                  {s.isWork && <span style={{ fontSize: 9, color: '#3B82F6', border: '1px solid #3B82F6', borderRadius: 4, padding: '1px 4px', background: '#F3F4F6' }}>근무</span>}
                </div>
                <button onClick={() => handleDelSchedule(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}

            {showScan && (
              <ScheduleScanSheet 
                names={names} 
                onSave={(newS) => setPlan({ ...plan, schedules: [...schedules, ...newS] })}
                onClose={() => setShowScan(false)}
              />
            )}


            {selTx.map(t => {
              const c = CAT[t.cat];
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'transparent', borderBottom: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 16 }}>{c?.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c?.label}</span>
                      <Chip who={t.who} names={names} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{t.memo || '—'}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>-{fmtS(t.amount)}원</span>
                </div>
              );
            })}
            
            {selScheds.length === 0 && selTx.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 11, color: 'var(--text-faint)' }}>등록된 일정이나 지출이 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
