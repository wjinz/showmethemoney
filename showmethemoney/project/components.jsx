// ─── Icons ───────────────────────────────────────────────────────────────────
const Icons = {
  Home: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" fill="#9CA3AF"/>
      <path d="M9 21V12h6v9" fill="#9CA3AF"/>
    </svg>
  ),
  History: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="#9CA3AF"/>
      <path d="M7 9h10M7 13h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Lock: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="#9CA3AF"/>
      <path d="M8 11V7a4 4 0 018 0v4" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  SOS: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M20 2H4a2 2 0 00-2 2v14a2 2 0 002 2h3l3 3 3-3h7a2 2 0 002-2V4a2 2 0 00-2-2z" fill="#9CA3AF"/>
      <circle cx="9" cy="11" r="1.2" fill="white"/>
      <circle cx="12" cy="11" r="1.2" fill="white"/>
      <circle cx="15" cy="11" r="1.2" fill="white"/>
    </svg>
  ),
  Settlement: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="20" height="14" rx="3" fill="#9CA3AF"/>
      <path d="M2 9h20" stroke="white" strokeWidth="1.5"/>
      <rect x="5" y="13" width="4" height="2" rx="1" fill="white"/>
    </svg>
  ),
  Plus: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#6B7280" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="2"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
      <path d="M1 1l22 22" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Delete: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zM18 9l-6 6M12 9l6 6" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  Add: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
};

// ─── BottomNav ────────────────────────────────────────────────────────────────
function BottomNav({ active, onNav, onFab }) {
  const navItems = [
    { id: 'home', label: '홈', Icon: Icons.Home },
    { id: 'history', label: '내역', Icon: Icons.History },
    { id: 'fab', label: '', Icon: null },
    { id: 'sos', label: 'SOS', Icon: Icons.SOS },
    { id: 'settlement', label: '정산', Icon: Icons.Settlement },
  ];
  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        if (item.id === 'fab') {
          return (
            <div key="fab" className="nav-fab" onClick={onFab}>
              <Icons.Plus />
            </div>
          );
        }
        const isActive = active === item.id;
        return (
          <div key={item.id} className={`nav-item${isActive ? ' active' : ''}`} onClick={() => onNav(item.id)}>
            <div className="nav-icon"><item.Icon /></div>
            <span className="nav-label" style={isActive ? { color: '#1C2B4A', fontWeight: 600 } : {}}>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

// ─── PartnerRow ───────────────────────────────────────────────────────────────
function PartnerAvatars({ me, partner, onPartnerClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Me */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#1C2B4A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 700,
          border: '2px solid white', boxShadow: '0 0 0 2px #1C2B4A'
        }}>{me.name[0]}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1C2B4A' }}>{me.name}</span>
      </div>
      <div style={{ color: '#D1D5DB', fontSize: 12 }}>•</div>
      {/* Partner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={onPartnerClick}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#7A9E87',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 14, fontWeight: 700,
          border: '2px solid white', boxShadow: '0 0 0 2px #7A9E87'
        }}>{partner.name[0]}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#7A9E87' }}>{partner.name}</span>
      </div>
    </div>
  );
}

// ─── BudgetRing (SVG) ─────────────────────────────────────────────────────────
function BudgetRing({ pct }) {
  const r = 54; const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 1));
  const color = pct > 0.85 ? '#E8715A' : pct > 0.65 ? '#F59E0B' : '#7A9E87';
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#E5E7EB" strokeWidth="10"/>
      <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset .6s ease, stroke .3s' }}
      />
    </svg>
  );
}

// ─── AmountChip ───────────────────────────────────────────────────────────────
function AmountChip({ amount, color }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 700,
      background: color + '18',
      color,
    }}>
      {formatKRW(amount)}
    </span>
  );
}

// ─── formatKRW ───────────────────────────────────────────────────────────────
function formatKRW(n) {
  if (n === undefined || n === null) return '₩0';
  return '₩' + Math.abs(n).toLocaleString('ko-KR');
}

// ─── CategoryChip ─────────────────────────────────────────────────────────────
function CategoryChip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px',
      borderRadius: 20,
      fontSize: 13, fontWeight: 600,
      background: selected ? '#1C2B4A' : '#F3F4F6',
      color: selected ? 'white' : '#374151',
      border: 'none', cursor: 'pointer',
      transition: 'all .15s',
      whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}

// ─── NumPad ───────────────────────────────────────────────────────────────────
function NumPad({ value, onChange, style }) {
  const keys = ['1','2','3','4','5','6','7','8','9','00','0','⌫'];
  const handleKey = (k) => {
    if (k === '⌫') { onChange(value.slice(0, -1) || '0'); return; }
    if (value === '0' || value === '') { onChange(k === '00' ? '0' : k); return; }
    if (value.length >= 9) return;
    onChange(value + k);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, ...style }}>
      {keys.map(k => (
        <button key={k} onClick={() => handleKey(k)} style={{
          height: 52, borderRadius: 14,
          background: k === '⌫' ? '#F3F4F6' : 'transparent',
          fontSize: k === '⌫' ? 13 : 20,
          fontWeight: 600, color: '#111827',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .1s',
        }}
        onMouseDown={e => e.currentTarget.style.background = '#E5E7EB'}
        onMouseUp={e => e.currentTarget.style.background = k === '⌫' ? '#F3F4F6' : 'transparent'}
        >
          {k === '⌫' ? <Icons.Delete /> : k}
        </button>
      ))}
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
Object.assign(window, {
  Icons, BottomNav, PartnerAvatars, BudgetRing, AmountChip,
  CategoryChip, NumPad, formatKRW,
});
