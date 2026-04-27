// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  budget: 2000000,
  spent: 847500,
  me: { name: '나', color: '#1C2B4A' },
  partner: { name: '지연', color: '#7A9E87' },
  todayMe: 35000,
  todayPartner: 28000,
  partnerDetailShared: false,
  transactions: [
    { id: 1, who: 'me', type: 'daily', date: '오늘', amount: 35000, memo: '하루 총액', items: null },
    { id: 2, who: 'partner', type: 'daily', date: '오늘', amount: 28000, memo: '하루 총액', items: null, hidden: true },
    { id: 3, who: 'me', type: 'item', date: '어제', amount: 12500, memo: '편의점', category: '식비' },
    { id: 4, who: 'partner', type: 'item', date: '어제', amount: 67000, memo: '마트 장보기', category: '식비' },
    { id: 5, who: 'me', type: 'daily', date: '04.20', amount: 54000, memo: '하루 총액', items: [
      { label: '점심', amount: 12000 }, { label: '카페', amount: 6500 }, { label: '교통', amount: 35500 }
    ]},
    { id: 6, who: 'partner', type: 'item', date: '04.20', amount: 89000, memo: '의류', category: '쇼핑' },
    { id: 7, who: 'me', type: 'item', date: '04.19', amount: 320000, memo: '관리비', category: '주거' },
  ],
  sosMessages: [
    { id: 1, from: 'partner', text: '오늘 저녁 밥값 내가 낼게, SOS 승인해줘 🙏', time: '14:23', amount: 45000 },
    { id: 2, from: 'me', text: '얼마?', time: '14:25', amount: null },
    { id: 3, from: 'partner', text: '4만5천원이면 될 것 같아 🥺', time: '14:25', amount: null },
    { id: 4, from: 'me', text: '승인!', time: '14:26', amount: null, approved: true },
  ],
  settlement: {
    cardTotal: 623000,
    cardEstimate: 820000,
    myCard: 312000,
    partnerCard: 311000,
    cashFixed: 150000,
  },
};

// ─── HomeView ─────────────────────────────────────────────────────────────────
function HomeView({ onOpenInput, onNav }) {
  const { budget, spent, me, partner, todayMe, todayPartner } = MOCK;
  const remaining = budget - spent;
  const pct = spent / budget;
  const [aiVisible, setAiVisible] = React.useState(true);

  return (
    <div className="view-content" style={{ padding: '0 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '56px 0 20px' }}>
        <PartnerAvatars me={me} partner={partner} onPartnerClick={() => {}} />
        <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>2026년 4월</div>
      </div>

      {/* Hero Budget Card */}
      <div className="card" style={{ padding: '24px 20px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 6 }}>이번 달 남은 예산</p>
            <p style={{ fontSize: 38, fontWeight: 900, color: '#1C2B4A', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              {formatKRW(remaining)}
            </p>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${Math.min(pct * 100, 100)}%`,
                  background: pct > 0.85 ? '#E8715A' : pct > 0.65 ? '#F59E0B' : '#7A9E87',
                  transition: 'width .6s ease'
                }} />
              </div>
              <span style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{Math.round(pct * 100)}% 사용</span>
            </div>
          </div>
          <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            <BudgetRing pct={pct} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>예산</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1C2B4A' }}>200만</span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Spending — Couples Row */}
      <div className="card" style={{ marginBottom: 12, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, marginBottom: 12 }}>오늘 지출</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Me */}
          <div style={{ flex: 1, background: '#F4F6F8', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1C2B4A' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>나</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1C2B4A', letterSpacing: '-0.5px' }}>
              {formatKRW(todayMe)}
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>총액 입력</p>
          </div>
          {/* Partner */}
          <div style={{ flex: 1, background: '#F4F6F8', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7A9E87' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>지연</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#7A9E87', letterSpacing: '-0.5px' }}>
              {formatKRW(todayPartner)}
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>🔒 총액만 공개</p>
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>오늘 합계</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{formatKRW(todayMe + todayPartner)}</span>
        </div>
      </div>

      {/* AI Coach */}
      {aiVisible && (
        <div style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0F2FE 100%)',
          borderRadius: 20, padding: '14px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          border: '1px solid #C7D2FE'
        }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#4338CA', marginBottom: 3 }}>AI 소비 코치</p>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              이번 달 식비가 예상보다 <strong>18% 더</strong> 나오고 있어요. 이 추세면 월말에 <strong>₩94,000</strong> 초과할 것 같아요 🤔
            </p>
          </div>
          <button onClick={() => setAiVisible(false)} style={{ color: '#9CA3AF', fontSize: 16, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* SOS Quick Entry */}
      <div className="card" style={{ marginBottom: 12, padding: '14px 20px', cursor: 'pointer' }}
        onClick={() => onNav('sos')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 4, height: 36, borderRadius: 2, background: '#E8715A', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#E8715A' }}>SOS 결재 대기</p>
              <p style={{ fontSize: 13, color: '#374151', marginTop: 1 }}>지연이 ₩45,000 요청 중</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>확인하기</span>
            <Icons.ChevronRight />
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>최근 내역</p>
          <button onClick={() => onNav('history')} style={{ fontSize: 12, color: '#7A9E87', fontWeight: 600 }}>전체 보기</button>
        </div>
        {MOCK.transactions.slice(0, 3).map(tx => (
          <TxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

// ─── TxRow ────────────────────────────────────────────────────────────────────
function TxRow({ tx }) {
  const [expanded, setExpanded] = React.useState(false);
  const isMe = tx.who === 'me';
  const color = isMe ? '#1C2B4A' : '#7A9E87';
  const name = isMe ? '나' : '지연';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        background: 'white', borderRadius: 16,
        padding: '12px 14px',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        display: 'flex', alignItems: 'center', gap: 12,
        cursor: tx.type === 'daily' && tx.items ? 'pointer' : 'default',
      }} onClick={() => tx.type === 'daily' && tx.items && setExpanded(e => !e)}>
        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{name}</span>
            {tx.type === 'daily' && (
              <span style={{ fontSize: 10, background: color + '18', color, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>총액</span>
            )}
            {tx.hidden && (
              <span style={{ fontSize: 10, background: '#F3F4F6', color: '#9CA3AF', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>🔒 비공개</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
            <span style={{ fontSize: 13, color: '#374151' }}>{tx.memo}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{formatKRW(tx.amount)}</span>
              {tx.items && <Icons.ChevronDown />}
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.date}</span>
        </div>
      </div>
      {/* Expanded items */}
      {expanded && tx.items && (
        <div style={{ background: '#F9FAFB', borderRadius: '0 0 16px 16px', padding: '8px 14px 12px 28px', marginTop: -8, paddingTop: 12 }}>
          {tx.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: '#6B7280' }}>· {item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{formatKRW(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InputSheet ───────────────────────────────────────────────────────────────
function InputSheet({ onClose }) {
  const [tab, setTab] = React.useState('daily'); // 'daily' | 'item'
  const [amount, setAmount] = React.useState('0');
  const [showDetail, setShowDetail] = React.useState(false);
  const [shared, setShared] = React.useState(false);
  const [details, setDetails] = React.useState([{ label: '', amount: '0' }]);
  const [category, setCategory] = React.useState('식비');
  const [memo, setMemo] = React.useState('');

  const cats = ['식비', '교통', '쇼핑', '주거', '의료', '문화', '기타'];

  const handleSave = () => {
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sheet-handle" />
      <div style={{ padding: '8px 20px 0' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 16 }}>지출 입력</p>
        {/* Tab Toggle */}
        <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {[{ id: 'daily', label: '오늘 총액' }, { id: 'item', label: '건별 입력' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10,
              background: tab === t.id ? 'white' : 'transparent',
              color: tab === t.id ? '#1C2B4A' : '#9CA3AF',
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: 14,
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              transition: 'all .15s',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {tab === 'daily' ? (
          <DailyTotalForm
            amount={amount} setAmount={setAmount}
            showDetail={showDetail} setShowDetail={setShowDetail}
            shared={shared} setShared={setShared}
            details={details} setDetails={setDetails}
          />
        ) : (
          <ItemForm
            amount={amount} setAmount={setAmount}
            category={category} setCategory={setCategory}
            memo={memo} setMemo={setMemo}
            cats={cats}
          />
        )}
      </div>

      <div style={{ padding: '12px 20px 28px', borderTop: '1px solid #F3F4F6' }}>
        <button onClick={handleSave} style={{
          width: '100%', padding: '16px 0',
          background: 'linear-gradient(135deg, #1C2B4A 0%, #2d4270 100%)',
          color: 'white', borderRadius: 16,
          fontSize: 16, fontWeight: 700,
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(28,43,74,.35)',
        }}>저장하기</button>
      </div>
    </div>
  );
}

function DailyTotalForm({ amount, setAmount, showDetail, setShowDetail, shared, setShared, details, setDetails }) {
  const numVal = parseInt(amount) || 0;
  return (
    <div>
      {/* Privacy Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#6B7280' }}>오늘 하루 지출한 총금액을 입력하세요</span>
      </div>

      {/* Big Amount Display */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 42, fontWeight: 900, color: '#1C2B4A', letterSpacing: '-2px' }}>
          {numVal === 0 ? '₩0' : '₩' + numVal.toLocaleString('ko-KR')}
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>2026. 4. 22. (오늘)</p>
      </div>

      {/* Numpad */}
      <NumPad value={amount} onChange={setAmount} style={{ marginBottom: 20 }} />

      {/* Privacy Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#F9FAFB', borderRadius: 14, marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🔒 세부 내역 공개</p>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>파트너에게 세부 내역을 보여줄게요</p>
        </div>
        <div onClick={() => setShared(s => !s)} style={{
          width: 44, height: 26, borderRadius: 13,
          background: shared ? '#7A9E87' : '#D1D5DB',
          position: 'relative', cursor: 'pointer', transition: 'background .2s',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%', background: 'white',
            position: 'absolute', top: 3,
            left: shared ? 21 : 3, transition: 'left .2s',
            boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          }} />
        </div>
      </div>

      {/* Optional Detail */}
      <button onClick={() => setShowDetail(d => !d)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '10px 0', borderRadius: 12,
        border: '1.5px dashed #D1D5DB', background: 'transparent',
        color: '#7A9E87', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 12,
        transition: 'all .15s',
      }}>
        <Icons.Add /> {showDetail ? '세부 내역 숨기기' : '세부 내역 추가하기 (선택)'}
      </button>

      {showDetail && (
        <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '14px', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>어디에 썼나요? (나만 볼 수 있어요)</p>
          {details.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                placeholder="항목 이름"
                value={d.label}
                onChange={e => {
                  const next = [...details];
                  next[i] = { ...next[i], label: e.target.value };
                  setDetails(next);
                }}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 10,
                  border: '1px solid #E5E7EB', fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                  background: 'white',
                }}
              />
              <input
                placeholder="금액"
                value={d.amount === '0' ? '' : d.amount}
                onChange={e => {
                  const next = [...details];
                  next[i] = { ...next[i], amount: e.target.value.replace(/\D/g, '') };
                  setDetails(next);
                }}
                style={{
                  width: 90, padding: '9px 12px', borderRadius: 10,
                  border: '1px solid #E5E7EB', fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                  background: 'white',
                }}
              />
            </div>
          ))}
          <button onClick={() => setDetails(d => [...d, { label: '', amount: '0' }])} style={{
            fontSize: 12, color: '#7A9E87', fontWeight: 600,
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>+ 항목 추가</button>
        </div>
      )}
    </div>
  );
}

function ItemForm({ amount, setAmount, category, setCategory, memo, setMemo, cats }) {
  const numVal = parseInt(amount) || 0;
  return (
    <div>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>지출 항목을 직접 입력하세요</p>
      {/* Amount */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 42, fontWeight: 900, color: '#1C2B4A', letterSpacing: '-2px' }}>
          {numVal === 0 ? '₩0' : '₩' + numVal.toLocaleString('ko-KR')}
        </p>
      </div>
      <NumPad value={amount} onChange={setAmount} style={{ marginBottom: 20 }} />
      {/* Category */}
      <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 8 }}>카테고리</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {cats.map(c => <CategoryChip key={c} label={c} selected={category === c} onClick={() => setCategory(c)} />)}
      </div>
      {/* Memo */}
      <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 6 }}>메모</p>
      <input
        placeholder="어디에 쓰셨나요? 🥺"
        value={memo}
        onChange={e => setMemo(e.target.value)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 14,
          border: '1.5px solid #E5E7EB', fontSize: 14,
          fontFamily: 'inherit', outline: 'none', background: 'white',
          transition: 'border-color .15s',
        }}
        onFocus={e => e.target.style.borderColor = '#1C2B4A'}
        onBlur={e => e.target.style.borderColor = '#E5E7EB'}
      />
    </div>
  );
}

// ─── HistoryView ──────────────────────────────────────────────────────────────
function HistoryView() {
  const [filter, setFilter] = React.useState('전체');
  const filters = ['전체', '나', '지연', '총액', '건별'];
  const filtered = filter === '전체' ? MOCK.transactions
    : filter === '나' ? MOCK.transactions.filter(t => t.who === 'me')
    : filter === '지연' ? MOCK.transactions.filter(t => t.who === 'partner')
    : filter === '총액' ? MOCK.transactions.filter(t => t.type === 'daily')
    : MOCK.transactions.filter(t => t.type === 'item');

  const myTotal = MOCK.transactions.filter(t => t.who === 'me').reduce((s, t) => s + t.amount, 0);
  const partnerTotal = MOCK.transactions.filter(t => t.who === 'partner').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="view-content" style={{ padding: '0 16px' }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', padding: '56px 0 20px', letterSpacing: '-0.5px' }}>지출 내역</p>

      {/* Monthly Summary */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>4월 지출 합계</p>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#1C2B4A', fontWeight: 600, marginBottom: 4 }}>나</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#1C2B4A' }}>{formatKRW(myTotal)}</p>
          </div>
          <div style={{ width: 1, background: '#F3F4F6', margin: '0 8px' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#7A9E87', fontWeight: 600, marginBottom: 4 }}>지연</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#7A9E87' }}>{formatKRW(partnerTotal)}</p>
          </div>
          <div style={{ width: 1, background: '#F3F4F6', margin: '0 8px' }} />
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>합계</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{formatKRW(myTotal + partnerTotal)}</p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: filter === f ? '#1C2B4A' : 'white',
            color: filter === f ? 'white' : '#6B7280',
            border: `1px solid ${filter === f ? '#1C2B4A' : '#E5E7EB'}`,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            transition: 'all .15s',
          }}>{f}</button>
        ))}
      </div>

      {filtered.map(tx => <TxRow key={tx.id} tx={tx} />)}
    </div>
  );
}

// ─── PrivateView ──────────────────────────────────────────────────────────────
function PrivateView() {
  const [unlocked, setUnlocked] = React.useState(false);
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const CORRECT = '1234';

  const handlePin = (k) => {
    if (k === '⌫') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + k;
    setPin(next);
    if (next.length === 4) {
      if (next === CORRECT) { setTimeout(() => setUnlocked(true), 200); }
      else { setError(true); setTimeout(() => { setPin(''); setError(false); }, 600); }
    }
  };

  if (unlocked) return <PrivateDashboard onLock={() => { setUnlocked(false); setPin(''); }} />;

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div style={{
      background: '#121212', minHeight: '100%',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
      <p style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>프라이빗 월렛</p>
      <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 40 }}>PIN 4자리를 입력해주세요 (힌트: 1234)</p>
      {/* PIN dots */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 48 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < pin.length ? (error ? '#E8715A' : 'white') : '#374151',
            transition: 'background .2s',
            transform: error ? 'translateX(0)' : 'none',
          }} />
        ))}
      </div>
      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, width: '100%', maxWidth: 280 }}>
        {keys.map((k, i) => (
          k === '' ? <div key={i} /> :
          <button key={i} onClick={() => handlePin(k)} style={{
            height: 72, borderRadius: '50%',
            background: k === '⌫' ? 'transparent' : '#1E1E1E',
            color: 'white', fontSize: k === '⌫' ? 13 : 24, fontWeight: 600,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity .1s',
          }}
          onMouseDown={e => e.currentTarget.style.opacity = '0.5'}
          onMouseUp={e => e.currentTarget.style.opacity = '1'}
          >{k === '⌫' ? <Icons.Delete /> : k}</button>
        ))}
      </div>
    </div>
  );
}

function PrivateDashboard({ onLock }) {
  return (
    <div style={{ background: '#121212', minHeight: '100%', padding: '56px 16px 100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>프라이빗 월렛</p>
        <button onClick={onLock} style={{ color: '#E8715A', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>잠그기</button>
      </div>
      {/* Black Card */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #0a0a0a 100%)',
        borderRadius: 24, padding: '24px', marginBottom: 16, position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(232,113,90,.08)', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(122,158,135,.06)', filter: 'blur(20px)' }} />
        <p style={{ color: '#9CA3AF', fontSize: 11, letterSpacing: 2, marginBottom: 16 }}>PRIVATE WALLET</p>
        <p style={{ color: 'white', fontSize: 32, fontWeight: 900, letterSpacing: '-1px', marginBottom: 4 }}>₩312,000</p>
        <p style={{ color: '#6B7280', fontSize: 12 }}>나만의 이번 달 지출</p>
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ color: '#4B5563', fontSize: 10, letterSpacing: 1 }}>예산</p>
            <p style={{ color: '#9CA3AF', fontSize: 14, fontWeight: 700 }}>₩500,000</p>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(232,113,90,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#E8715A', fontSize: 16 }}>🔒</span>
          </div>
        </div>
      </div>
      {/* Private txs */}
      <p style={{ color: '#6B7280', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>나만 보이는 내역</p>
      {[
        { memo: '개인 보험료', amount: 87000, date: '04.15' },
        { memo: '용돈 (부모님)', amount: 100000, date: '04.01' },
        { memo: '헤어샵', amount: 55000, date: '04.18' },
      ].map((t, i) => (
        <div key={i} style={{ background: '#1E1E1E', borderRadius: 14, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#F9FAFB', fontSize: 14, fontWeight: 600 }}>{t.memo}</p>
            <p style={{ color: '#6B7280', fontSize: 12 }}>{t.date}</p>
          </div>
          <p style={{ color: '#E8715A', fontSize: 15, fontWeight: 700 }}>{formatKRW(t.amount)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── SOSView ──────────────────────────────────────────────────────────────────
function SOSView() {
  const [msgs, setMsgs] = React.useState(MOCK.sosMessages);
  const [input, setInput] = React.useState('');
  const [approved, setApproved] = React.useState(false);
  const bottomRef = React.useRef(null);
  const quickAmounts = [10000, 30000, 50000, 100000];

  const send = (text) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { id: Date.now(), from: 'me', text, time: '지금', amount: null }]);
    setInput('');
  };

  const handleApprove = () => {
    setApproved(true);
    setMsgs(m => [...m, { id: Date.now(), from: 'me', text: '✅ 45,000원 승인했어!', time: '지금', amount: null }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#F4F6F8' }}>
      {/* Header */}
      <div style={{ padding: '56px 16px 12px', background: 'white', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#7A9E87', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>지</div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>지연과의 SOS</p>
            <p style={{ fontSize: 11, color: '#7A9E87' }}>● 온라인</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map(msg => {
          const isMe = msg.from === 'me';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>지연</p>}
              {msg.amount && !approved && !isMe && (
                <div style={{
                  background: 'white', borderRadius: '18px 18px 18px 4px',
                  padding: '14px 16px', maxWidth: '80%',
                  boxShadow: '0 2px 8px rgba(0,0,0,.08)',
                  marginBottom: 6,
                }}>
                  <p style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>{msg.text}</p>
                  <div style={{ background: '#FFF5F3', borderRadius: 12, padding: '10px 14px', border: '1px solid #FDD5CF', marginBottom: 10 }}>
                    <p style={{ fontSize: 11, color: '#E8715A', fontWeight: 600, marginBottom: 2 }}>SOS 결재 요청</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: '#E8715A' }}>₩45,000</p>
                  </div>
                  <button onClick={handleApprove} style={{
                    width: '100%', padding: '10px 0',
                    background: '#1C2B4A', color: 'white', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  }}>승인하기</button>
                </div>
              )}
              {(!msg.amount || approved || isMe) && (
                <div style={{
                  background: isMe ? '#1C2B4A' : 'white',
                  color: isMe ? 'white' : '#111827',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px', maxWidth: '75%',
                  fontSize: 14, lineHeight: 1.5,
                  boxShadow: '0 2px 6px rgba(0,0,0,.07)',
                }}>
                  {msg.approved && <span>✅ </span>}
                  {msg.text}
                </div>
              )}
              <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>{msg.time}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick Amounts */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px 0', overflowX: 'auto' }}>
        {quickAmounts.map(a => (
          <button key={a} onClick={() => send(`${a.toLocaleString()}원 요청해도 돼? 🥺`)} style={{
            padding: '6px 12px', borderRadius: 16, background: 'white',
            border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, color: '#374151',
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>₩{a.toLocaleString()}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px 100px', background: 'white', borderTop: '1px solid #E5E7EB' }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
          placeholder="메시지를 입력하세요..."
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 20,
            border: '1.5px solid #E5E7EB', fontSize: 14,
            fontFamily: 'inherit', outline: 'none', background: '#F9FAFB',
          }}
          onFocus={e => e.target.style.borderColor = '#1C2B4A'}
          onBlur={e => e.target.style.borderColor = '#E5E7EB'}
        />
        <button onClick={() => send(input)} style={{
          width: 40, height: 40, borderRadius: '50%',
          background: '#1C2B4A', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}><Icons.Send /></button>
      </div>
    </div>
  );
}

// ─── SettlementView ───────────────────────────────────────────────────────────
function SettlementView() {
  const { settlement: s } = MOCK;
  const diff = s.cardEstimate - s.cardTotal;
  const surplus = diff > 0;

  return (
    <div className="view-content" style={{ padding: '0 16px' }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: '#111827', padding: '56px 0 20px', letterSpacing: '-0.5px' }}>카드 정산</p>

      {/* Status Card */}
      <div style={{
        background: surplus ? 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' : 'linear-gradient(135deg, #FFF5F3, #FDE8E4)',
        borderRadius: 24, padding: '20px', marginBottom: 12,
        border: `1px solid ${surplus ? '#6EE7B7' : '#FCA5A5'}`,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: surplus ? '#065F46' : '#991B1B', marginBottom: 6 }}>
          {surplus ? '🟢 이번 달 카드값 여유 있어요' : '🔴 카드값이 예상보다 높아요'}
        </p>
        <p style={{ fontSize: 36, fontWeight: 900, color: surplus ? '#047857' : '#DC2626', letterSpacing: '-1.5px', marginBottom: 2 }}>
          {surplus ? '+' : '-'}{formatKRW(Math.abs(diff))}
        </p>
        <p style={{ fontSize: 12, color: surplus ? '#065F46' : '#991B1B', opacity: .7 }}>
          예상 {formatKRW(s.cardEstimate)} vs 현재 {formatKRW(s.cardTotal)}
        </p>
      </div>

      {/* Breakdown */}
      <div className="card" style={{ marginBottom: 12, padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 14 }}>카드 결제 내역</p>
        {[
          { label: '내 카드 합계', amount: s.myCard, color: '#1C2B4A' },
          { label: '지연 카드 합계', amount: s.partnerCard, color: '#7A9E87' },
          { label: '현금 고정비', amount: s.cashFixed, color: '#9CA3AF' },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.color }} />
              <span style={{ fontSize: 13, color: '#374151' }}>{row.label}</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: row.color }}>{formatKRW(row.amount)}</span>
          </div>
        ))}
        <div style={{ paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>총 결제 예상액</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#111827' }}>{formatKRW(s.cardTotal + s.cashFixed)}</span>
        </div>
      </div>

      {/* Cash Balance */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12 }}>현금 잔고 입력</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="보유 현금 입력" style={{
            flex: 1, padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid #E5E7EB', fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = '#1C2B4A'}
          onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
          <button style={{
            padding: '0 18px', borderRadius: 12,
            background: '#1C2B4A', color: 'white', fontWeight: 700, fontSize: 14,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}>계산</button>
        </div>
      </div>
    </div>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────
Object.assign(window, {
  HomeView, HistoryView, PrivateView, SOSView, SettlementView,
  InputSheet, TxRow, MOCK,
});
