import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CATS, PAY_METHODS } from '../constants/index.js';
import { useBudget } from '../context/BudgetContext.jsx';
import { compressImage } from '../utils/image.js';
import { today_str } from '../utils/helpers.js';

const EMOJIS = ['🥺','😂','🥰','😡','😭','😴','🥳','🤔'];
/** @param {number} v */
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

/**
 * @typedef {Object} ExpenseItemRow
 * @property {number} id
 * @property {string} label
 * @property {string} amount
 * @property {string} cat
 * @property {string} payMethod
 * @property {string} cardId
 */

/** @returns {ExpenseItemRow} */
function makeItem(seed = {}) {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    label: '',
    amount: '',
    cat: typeof seed.cat === 'string' ? seed.cat : 'food',
    payMethod: typeof seed.payMethod === 'string' ? seed.payMethod : 'credit',
    cardId: typeof seed.cardId === 'string' ? seed.cardId : '',
  };
}

const parseAmount = (raw) => parseInt(String(raw).replace(/[^0-9]/g, ''), 10) || 0;

export function InputSheet({ defaultWho, onClose, onSave }) {
  const { cards, names } = useBudget();
  const [mode, setMode] = useState(/** @type {'diary'|'expense'} */ ('diary'));
  const [who, setWho] = useState(defaultWho || 'husband');

  // P0-4: 날짜 선택 (소급 입력 가능, 미래 날짜 차단)
  const [todayTick, setTodayTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTodayTick(t => t + 1);
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  const todayStr = useMemo(() => today_str(), [todayTick]);
  const [entryDate, setEntryDate] = useState(() => today_str());

  const [emoji, setEmoji] = useState('🥺');
  const [content, setContent] = useState('');
  const [shared, setShared] = useState(false);
  const [photos, setPhotos] = useState(/** @type {string[]} */ ([]));
  const fileRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  const defaultCardId = cards.length > 0 ? String(cards[0].id) : '';
  const [items, setItems] = useState(/** @type {ExpenseItemRow[]} */ ([
    makeItem({ cardId: defaultCardId }),
  ]));
  const [memo, setMemo] = useState('');
  const [expShared, setExpShared] = useState(false);
  const [maskDetails, setMaskDetails] = useState(false);

  const expTotal = items.reduce((s, it) => s + parseAmount(it.amount), 0);

  async function handleFiles(e) {
    const target = e.target;
    if (!target.files) return;
    const list = Array.from(target.files);
    target.value = '';
    for (const file of list) {
      try {
        const dataUrl = await compressImage(file);
        setPhotos(p => [...p, dataUrl].slice(0, 2)); // P1-4: 3장 → 2장
      } catch (err) {
        console.warn('[InputSheet] compress fail:', err);
      }
    }
  }

  function removePhoto(idx) {
    setPhotos(p => p.filter((_, i) => i !== idx));
  }

  function updateItem(id, field, val) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));
  }
  function removeItem(id) {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  }
  function addItem() {
    setItems(prev => {
      const last = prev[prev.length - 1];
      return [...prev, makeItem({
        cat: last?.cat,
        payMethod: last?.payMethod,
        cardId: last?.cardId || defaultCardId,
      })];
    });
  }

  function handleSave() {
    if (mode === 'diary' && !content.trim()) return;
    if (mode === 'expense' && expTotal === 0) return;
    // P0-4 [claude]: 1년 이전 입력은 confirm
    const oneYearAgoMs = Date.now() - 365 * 86400 * 1000;
    if (new Date(entryDate + 'T00:00:00').getTime() < oneYearAgoMs) {
      const ok = window.confirm('1년 이전 날짜로 입력하시겠어요?');
      if (!ok) return;
    }
    // 소급 입력 시 12:00, 오늘이면 현재 시각
    const isToday = entryDate === todayStr;
    const hh = isToday ? String(new Date().getHours()).padStart(2, '0') : '12';
    const mm = isToday ? String(new Date().getMinutes()).padStart(2, '0') : '00';
    const validItems = items
      .filter(it => it.label.trim() || parseAmount(it.amount) > 0)
      .map(it => ({
        label: it.label.trim() || '항목',
        amount: parseAmount(it.amount),
        cat: it.cat || 'etc',
        payMethod: it.payMethod || 'credit',
        cardId: it.cardId || '',
      }));

    const firstItem = validItems[0];
    const aggregateCat = firstItem ? firstItem.cat : undefined;
    const aggregatePay = firstItem ? firstItem.payMethod : undefined;
    const aggregateCard = firstItem ? firstItem.cardId : undefined;

    const entry = {
      type: mode,
      date: entryDate,
      who,
      time: `${hh}:${mm}`,
      emoji: mode === 'diary' ? emoji : '',
      content: mode === 'diary' ? content.trim() : memo.trim(),
      totalSpent: mode === 'expense' ? Math.max(0, expTotal) : 0,
      shared: mode === 'diary' ? shared : expShared,
      photos: mode === 'diary' ? photos : [],
      expenseItems: mode === 'expense' ? validItems : undefined,
      cat: mode === 'expense' ? aggregateCat : undefined,
      payMethod: mode === 'expense' ? aggregatePay : undefined,
      cardId: mode === 'expense' ? aggregateCard : undefined,
      mask_details: mode === 'expense' ? maskDetails : undefined,
    };

    onSave(entry);
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle"></div>

        <div className="mode-tabs">
          <button className={`mode-tab${mode==='diary'?' active':''}`} onClick={()=>setMode('diary')}>
            <span>✏️</span> 다이어리
          </button>
          <button className={`mode-tab${mode==='expense'?' active':''}`} onClick={()=>setMode('expense')}>
            <span>💳</span> 지출 입력
          </button>
        </div>

        {/* P0-4: 날짜 선택 (소급 입력 / 미래 차단) */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0 12px' }}>
          <span style={{ fontSize:12, color:'var(--ink3)' }}>날짜</span>
          <input
            type="date"
            value={entryDate}
            max={todayStr}
            onChange={e => setEntryDate(e.target.value)}
            style={{ fontSize:13, border:'1px solid var(--cream3)', borderRadius:8, padding:'4px 8px',
                     background:'var(--cream)', color:'var(--ink)', fontFamily:'inherit' }}
          />
          {entryDate !== todayStr && (
            <button
              onClick={() => setEntryDate(todayStr)}
              style={{ fontSize:11, padding:'4px 8px', borderRadius:8,
                       border:'1px solid var(--cream3)', background:'var(--cream2)',
                       color:'var(--ink2)', cursor:'pointer', fontFamily:'inherit' }}
            >오늘로</button>
          )}
        </div>

        {mode === 'diary' && (
          <div className="who-selector">
            <button className={`who-btn${who==='husband'?' selected h':''}`} onClick={()=>setWho('husband')}>👨 {names.husband}</button>
            <button className={`who-btn${who==='wife'?' selected w':''}`} onClick={()=>setWho('wife')}>👩 {names.wife}</button>
          </div>
        )}

        {mode === 'diary' && (<>
          <div className="emoji-row">
            {EMOJIS.map(e => (
              <button key={e} className={`emoji-btn${emoji===e?' selected':''}`} onClick={()=>setEmoji(e)}>{e}</button>
            ))}
          </div>
          <textarea className="sheet-input" rows={3}
            placeholder="오늘 하루는 어땠나요? 🥺"
            value={content} onChange={e=>setContent(e.target.value)} />
          <div className="photo-picker-area">
            <div className="photo-picker-label">사진 첨부</div>
            <div className="photo-picker-row">
              <button className="photo-add-btn" onClick={()=>fileRef.current && fileRef.current.click()}>
                <CameraIcon/><span>추가</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleFiles}/>
              {photos.map((src, idx) => (
                <div className="photo-preview-wrap" key={idx}>
                  <img className="photo-preview-thumb" src={src} alt="" />
                  <button className="photo-preview-del" onClick={()=>removePhoto(idx)}>×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="privacy-row">
            <div>
              <div style={{fontSize:13, color:'var(--ink2)', fontWeight:500}}>파트너와 공유</div>
              <div style={{fontSize:11, color:'var(--ink3)'}}>다이어리 내용 공유</div>
            </div>
            <button className={`toggle${shared?' on':''}`} onClick={()=>setShared(v=>!v)}></button>
          </div>
        </>)}

        {mode === 'expense' && (<>
          <div className="expense-total-display">
            <div className="etd-label">합계 금액</div>
            <div className="etd-amount">{fmtMoney(expTotal)}</div>
            <div className="etd-count">{items.filter(it => parseAmount(it.amount) > 0).length}개 항목</div>
          </div>

          <div className="expense-items-list">
            <div className="expense-items-label">지출 항목</div>
            {items.map(it => (
              <div className="expense-item-row" key={it.id} style={{flexDirection:'column', alignItems:'stretch', gap:0}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <input className="expense-item-label-input" type="text"
                    placeholder="항목명 (예: 점심, 카페)"
                    value={it.label} onChange={e=>updateItem(it.id,'label',e.target.value)} />
                  <div className="expense-item-divider"></div>
                  <input className="expense-item-amount-input" type="text" inputMode="numeric"
                    placeholder="금액"
                    value={it.amount} onChange={e=>{
                      const num = e.target.value.replace(/[^0-9]/g,'');
                      updateItem(it.id,'amount',num ? Number(num).toLocaleString() : '');
                    }} />
                  <button className="expense-item-del" onClick={()=>removeItem(it.id)}>×</button>
                </div>
                <div style={{display:'flex', gap:4, marginTop:8, flexWrap:'wrap'}}>
                  {CATS.map(c => (
                    <button key={c.id} type="button"
                      onClick={()=>updateItem(it.id,'cat',c.id)}
                      title={c.label}
                      style={{
                        fontSize:18, padding:'2px 6px', borderRadius:8, border:'none',
                        background: it.cat === c.id ? 'var(--cream3)' : 'transparent',
                        cursor:'pointer', fontFamily:'inherit',
                      }}>
                      {c.icon}
                    </button>
                  ))}
                </div>
                <div style={{display:'flex', gap:4, marginTop:6, flexWrap:'wrap'}}>
                  {PAY_METHODS.map(pm => (
                    <button key={pm.id} type="button"
                      onClick={()=>updateItem(it.id,'payMethod',pm.id)}
                      style={{
                        fontSize:11, padding:'4px 10px', borderRadius:99, border:'none',
                        background: it.payMethod === pm.id ? 'var(--ink)' : 'var(--cream2)',
                        color: it.payMethod === pm.id ? 'white' : 'var(--ink3)',
                        cursor:'pointer', fontFamily:'inherit', fontWeight:600,
                      }}>
                      {pm.label}
                    </button>
                  ))}
                  {it.payMethod !== 'cash' && cards.length > 0 && (
                    <select value={it.cardId}
                      onChange={e=>updateItem(it.id,'cardId',e.target.value)}
                      style={{
                        flex:1, minWidth:80, padding:'4px 8px', borderRadius:8,
                        border:'1px solid var(--cream3)', background:'white',
                        fontSize:11, fontFamily:'inherit', color:'var(--ink2)',
                      }}>
                      <option value="">카드 미지정</option>
                      {cards.map(c => (
                        <option key={c.id} value={String(c.id)}>{c.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
            <button className="add-item-btn" onClick={addItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              항목 추가
            </button>
          </div>

          <textarea className="sheet-input" rows={2}
            placeholder="메모 (선택사항) — 오늘 어디서 썼나요?"
            value={memo} onChange={e=>setMemo(e.target.value)} />

          <div className="privacy-row">
            <div>
              <div style={{fontSize:13, color:'var(--ink2)', fontWeight:500}}>파트너와 총액 공유</div>
              <div style={{fontSize:11, color:'var(--ink3)'}}>{expShared ? '합계만 파트너에게 노출' : '비공개'}</div>
            </div>
            <button className={`toggle${expShared?' on':''}`} onClick={()=>setExpShared(v=>!v)}></button>
          </div>

          <div className="privacy-row">
            <div>
              <div style={{fontSize:13, color:'var(--ink2)', fontWeight:500}}>세부 내역 숨기기</div>
              <div style={{fontSize:11, color:'var(--ink3)'}}>파트너에겐 총액만 노출 · 항목 리스트는 비공개</div>
            </div>
            <button className={`toggle${maskDetails?' on':''}`} onClick={()=>setMaskDetails(v=>!v)}></button>
          </div>
        </>)}

        <button className="sheet-submit"
          onClick={handleSave}
          style={{opacity: mode==='diary'&&!content.trim() ? .45 : mode==='expense'&&expTotal===0 ? .45 : 1}}>
          저장하기
        </button>
      </div>
    </div>
  );
}
