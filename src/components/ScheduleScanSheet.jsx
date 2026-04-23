import { useState, useMemo } from "react";
import { format, addDays, startOfMonth, parseISO, isValid } from "date-fns";

/**
 * @typedef {Object} ScheduleItem
 * @property {number} id
 * @property {string} date
 * @property {string} who
 * @property {string} title
 * @property {string} cycle
 * @property {boolean} isWork
 */

/**
 * 근무표 수기 입력을 위한 시트 컴포넌트
 * @param {{ names: {husband: string, wife: string}, onSave: (schedules: ScheduleItem[]) => void, onClose: () => void }} props
 */
export function ScheduleScanSheet({ names, onSave, onClose }) {
  const [startDateStr, setStartDateStr] = useState(format(startOfMonth(new Date()), 'yyyy-MM-01'));
  const [selWho, setSelWho] = useState(/** @type {"husband"|"wife"} */ ("husband"));
  const [codeText, setCodeText] = useState("");

  // 코드 파싱 및 미리보기 데이터 생성
  const previewSchedules = useMemo(() => {
    const codes = codeText.trim().split(/[\s,]+/).filter(c => c.length > 0);
    const start = parseISO(startDateStr);
    if (!isValid(start)) return [];

    return codes.map((code, idx) => {
      const date = addDays(start, idx);
      return {
        date: format(date, 'yyyy-MM-dd'),
        code: code.toUpperCase()
      };
    });
  }, [codeText, startDateStr]);

  const handleSave = () => {
    if (previewSchedules.length === 0) return;

    const newSchedules = previewSchedules.map(s => ({
      id: Date.now() + Math.random(),
      date: s.date,
      who: selWho,
      title: s.code === 'M' ? 'M12' : s.code, // M -> M12 변환
      cycle: 'none',
      isWork: true
    }));

    onSave(newSchedules);
    onClose();
  };

  const overlayStyle = /** @type {import('react').CSSProperties} */ ({
    position: 'fixed', inset: 0, zIndex: 1100,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
  });

  const sheetStyle = /** @type {import('react').CSSProperties} */ ({
    width: '100%', maxWidth: 480, background: 'var(--surface)', 
    borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--border)',
    maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
    animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
  });

  const gridStyle = /** @type {import('react').CSSProperties} */ ({
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px',
    background: 'var(--surface-alt)', padding: '12px', borderRadius: '12px',
    border: '1px solid var(--border)', marginTop: '8px'
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '12px 16px 14px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px', opacity: 0.5 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', marginBottom: 2, letterSpacing: ".05em" }}>MANUAL SCHEDULE ENTRY</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>근무표 수기 등록</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {/* 가이드 */}
          <div style={{ background: 'var(--surface-alt)', borderRadius: 12, padding: '12px', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: 'var(--text)' }}>💡 코드 가이드</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
              <span><b>D</b> 주간</span>
              <span><b>N</b> 야간</span>
              <span><b>M</b> M12</span>
              <span><b>X</b> 오프</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-faint)' }}>* 공백이나 콤마로 구분하여 순서대로 입력하세요.</div>
          </div>

          {/* 설정 섹션 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>입력 대상 및 시작일</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={selWho} onChange={e => setSelWho(/** @type {"husband"|"wife"} */ (e.target.value))} style={{ flex: 1, padding: '12px', borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }}>
                  <option value="husband">{names.husband}</option>
                  <option value="wife">{names.wife}</option>
                </select>
                <input type="date" value={startDateStr} onChange={e => setStartDateStr(e.target.value)} style={{ flex: 1.5, padding: '12px', borderRadius: 10, background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>근무 코드 시퀀스</label>
              <textarea 
                value={codeText}
                onChange={e => setCodeText(e.target.value)}
                placeholder="예: D D N N X X M M ..."
                style={{ width: '100%', height: 120, padding: '14px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6 }}
              />
            </div>

            {/* 프리뷰 */}
            {previewSchedules.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>입력 내역 미리보기 ({previewSchedules.length}일분)</label>
                <div style={gridStyle}>
                  {previewSchedules.slice(0, 31).map((s, idx) => (
                    <div key={idx} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 6, background: '#F3F4F6', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 8, color: 'var(--text-faint)', marginBottom: 2 }}>{s.date.slice(8, 10)}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: s.code === 'X' ? 'var(--text-faint)' : s.code === 'N' ? '#3B82F6' : s.code === 'M' ? 'var(--primary)' : 'var(--text)' }}>{s.code}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 16px 24px', flexShrink: 0 }}>
          <button 
            onClick={handleSave} 
            disabled={previewSchedules.length === 0}
            style={{ 
              width: '100%', padding: '16px', borderRadius: 16, border: 'none', 
              background: previewSchedules.length > 0 ? '#3B82F6' : '#F3F4F6', 
              color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer',
              boxShadow: previewSchedules.length > 0 ? '0 8px 24px rgba(64,120,224,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            캘린더에 {previewSchedules.length}건 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}
