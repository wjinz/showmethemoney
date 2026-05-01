import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CATS, CAT, PAY_METHODS } from '../constants/index.js';
import { useBudget } from '../context/BudgetContext.jsx';
import { compressImage } from '../utils/image.js';
import { today_str } from '../utils/helpers.js';

const DRAFT_KEY = 'smtm_diary_draft_v1';
const SAFE_DIARY_BYTES = 360 * 1024;
const PHOTO_MAX_BYTES = 200 * 1024;

/**
 * @typedef {Object} DiaryDraft
 * @property {'diary'|'expense'} mode
 * @property {'husband'|'wife'} who
 * @property {string} entryDate
 * @property {string} emoji
 * @property {string} content
 * @property {boolean} shared
 * @property {string[]} photos
 * @property {ExpenseItemRow[]} items
 * @property {boolean} expShared
 * @property {boolean} maskDetails
 */

/** @returns {DiaryDraft|null} */
function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    return /** @type {DiaryDraft} */ (obj);
  } catch { return null; }
}

/** @param {DiaryDraft} draft */
function saveDraft(draft) {
  try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}

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

/** @param {Partial<ExpenseItemRow>} seed @returns {ExpenseItemRow} */
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

/** @param {string|number} raw */
const parseAmount = (raw) => parseInt(String(raw).replace(/[^0-9]/g, ''), 10) || 0;

/**
 * 잔액 비율에 따라 상태 색상을 반환합니다.
 * @param {number} remains
 * @param {number} budget
 * @returns {{ bg: string, color: string, label: string }}
 */
function getRemainsTone(remains, budget) {
  if (budget <= 0) return { bg: 'var(--surface-alt)', color: 'var(--text-muted)', label: '' };
  const ratio = remains / budget;
  if (ratio > 0.5) return { bg: 'var(--success-bg2)', color: 'var(--success)', label: '여유' };
  if (ratio > 0.2) return { bg: 'oklch(95% 0.06 80)', color: 'var(--accent)', label: '주의' };
  if (ratio > 0)   return { bg: 'var(--danger-bg2)', color: 'var(--danger)', label: '경고' };
  return { bg: 'var(--danger-bg2)', color: 'var(--danger)', label: '초과' };
}

/**
 * @param {{ defaultWho?: 'husband'|'wife', onClose: () => void, onSave: (entry: Omit<import('../constants/index.js').DiaryItem, 'id'>) => boolean | void }} props
 */
export function InputSheet({ defaultWho, onClose, onSave }) {
  const { cards, names, tx, budgets, addToast, diaries } = useBudget();
  const draft = useMemo(() => loadDraft(), []);
  const [mode, setMode] = useState(/** @type {'diary'|'expense'} */ (draft?.mode || 'diary'));
  const [who, setWho] = useState(/** @type {'husband'|'wife'} */ (draft?.who || defaultWho || 'husband'));

  const [todayTick, setTodayTick] = useState(0);
  useEffect(() => {
    const onFocus = () => setTodayTick(t => t + 1);
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, []);
  const todayStr = useMemo(() => today_str(), [todayTick]);
  const [entryDate, setEntryDate] = useState(() => draft?.entryDate || today_str());

  const [emoji, setEmoji] = useState(draft?.emoji || '🥺');
  const [content, setContent] = useState(draft?.content || '');
  const [shared, setShared] = useState(draft?.shared || false);
  const [photos, setPhotos] = useState(/** @type {string[]} */ (draft?.photos || []));
  const fileRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  const defaultCardId = cards.length > 0 ? String(cards[0].id) : '';
  const [items, setItems] = useState(/** @type {ExpenseItemRow[]} */ (
    draft?.items && draft.items.length > 0 ? draft.items : [makeItem({ cardId: defaultCardId })]
  ));
  const [expShared, setExpShared] = useState(draft?.expShared ?? true);
  const [maskDetails, setMaskDetails] = useState(draft?.maskDetails ?? true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 입력 변경 시 sessionStorage 자동 백업 — 사고로 시트 닫혀도 다음 오픈 시 복구
  useEffect(() => {
    /** @type {DiaryDraft} */
    const next = { mode, who, entryDate, emoji, content, shared, photos, items, expShared, maskDetails };
    const isEmpty = !content.trim() && photos.length === 0 &&
      items.every(it => !it.label.trim() && !parseAmount(it.amount));
    if (isEmpty) { clearDraft(); return; }
    saveDraft(next);
  }, [mode, who, entryDate, emoji, content, shared, photos, items, expShared, maskDetails]);

  // 기존 다이어리 누적 사이즈 — 사진 첨부 시 사전 검사용
  const usedBytes = useMemo(() => {
    let total = 0;
    for (const d of diaries) {
      const ps = Array.isArray(d.photos) ? d.photos : [];
      for (const p of ps) total += typeof p === 'string' ? p.length : 0;
      if (typeof d.content === 'string') total += d.content.length;
    }
    return total;
  }, [diaries]);

  const expTotal = items.reduce((s, it) => s + parseAmount(it.amount), 0);

  const currentMonth = useMemo(() => todayStr.slice(0, 7), [todayStr]);
  /** @type {Record<string, number>} */
  const catSpentMap = useMemo(() => {
    /** @type {Record<string, number>} */
    const acc = {};
    for (const t of tx) {
      if (typeof t.date !== 'string' || !t.date.startsWith(currentMonth)) continue;
      if (typeof t.cat !== 'string') continue;
      acc[t.cat] = (acc[t.cat] || 0) + (t.amount || 0);
    }
    return acc;
  }, [tx, currentMonth]);

  /** @type {Record<string, number>} */
  const pendingByCat = useMemo(() => {
    /** @type {Record<string, number>} */
    const acc = {};
    for (const it of items) {
      if (!it.cat) continue;
      acc[it.cat] = (acc[it.cat] || 0) + parseAmount(it.amount);
    }
    return acc;
  }, [items]);

  /** @param {File} file @returns {Promise<string|null>} */
  const compressOnce = useCallback(async (file) => {
    const first = await compressImage(file);
    if (first.length <= PHOTO_MAX_BYTES) return first;
    const retry = await compressImage(file, { maxWidth: 360, quality: 0.55 });
    if (retry.length <= PHOTO_MAX_BYTES) return retry;
    return null;
  }, []);

  /** @param {string[]} current @param {string} dataUrl @returns {boolean} */
  const fitsBudget = useCallback((current, dataUrl) => {
    const currentBytes = current.reduce((s, p) => s + p.length, 0);
    const projected = usedBytes + currentBytes + dataUrl.length;
    return projected <= SAFE_DIARY_BYTES;
  }, [usedBytes]);

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  async function handleFiles(e) {
    const target = e.target;
    if (!target.files) return;
    const list = Array.from(target.files);
    target.value = '';
    for (const file of list) {
      try {
        const dataUrl = await compressOnce(file);
        if (!dataUrl) {
          if (typeof addToast === 'function') {
            addToast('사진이 너무 큽니다. 더 작은 사진을 선택해주세요.', 'error');
          }
          continue;
        }
        let blocked = false;
        setPhotos(prev => {
          if (prev.length >= 2) { blocked = true; return prev; }
          if (!fitsBudget(prev, dataUrl)) { blocked = true; return prev; }
          return [...prev, dataUrl];
        });
        if (blocked && typeof addToast === 'function') {
          addToast('사진 추가 시 저장 한도를 초과합니다. 기존 사진/다이어리를 정리해주세요.', 'warning');
        }
      } catch (err) {
        console.warn('[InputSheet] compress fail:', err);
        if (typeof addToast === 'function') {
          addToast('사진 압축에 실패했습니다. 다른 사진을 시도해주세요.', 'error');
        }
      }
    }
  }

  /** @param {number} idx */
  function removePhoto(idx) {
    setPhotos(p => p.filter((_, i) => i !== idx));
  }

  /** @param {number} id @param {keyof ExpenseItemRow} field @param {string} val */
  function updateItem(id, field, val) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it));
  }
  /** @param {number} id */
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
    const oneYearAgoMs = Date.now() - 365 * 86400 * 1000;
    if (new Date(entryDate + 'T00:00:00').getTime() < oneYearAgoMs) {
      const ok = window.confirm('1년 이전 날짜로 입력하시겠어요?');
      if (!ok) return;
    }
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

    /** @type {Omit<import('../constants/index.js').DiaryItem, 'id'>} */
    const entry = {
      type: mode,
      date: entryDate,
      who,
      time: `${hh}:${mm}`,
      emoji: mode === 'diary' ? emoji : '',
      content: mode === 'diary' ? content.trim() : '',
      totalSpent: mode === 'expense' ? Math.max(0, expTotal) : 0,
      shared: mode === 'diary' ? shared : expShared,
      photos: mode === 'diary' ? photos : [],
      expenseItems: mode === 'expense' ? validItems : undefined,
      cat: mode === 'expense' ? aggregateCat : undefined,
      payMethod: mode === 'expense' ? aggregatePay : undefined,
      cardId: mode === 'expense' ? aggregateCard : undefined,
      mask_details: mode === 'expense' ? maskDetails : undefined,
    };

    const result = onSave(entry);
    // onSave가 false 반환 시 시트 유지 — 사용자 입력 보존(사이즈 가드 등)
    if (result === false) return;
    clearDraft();
    onClose();
  }

  function handleBackdropClose() {
    const hasInput = !!content.trim() || photos.length > 0 ||
      items.some(it => it.label.trim() || parseAmount(it.amount) > 0);
    if (hasInput) {
      const ok = window.confirm('작성 중인 내용이 있습니다. 저장하지 않고 닫을까요?\n(닫아도 다음에 다시 열면 자동 복구됩니다)');
      if (!ok) return;
    }
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && handleBackdropClose()}>
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
            {items.map(it => {
              const budget = typeof budgets[it.cat] === 'number' ? budgets[it.cat] : 0;
              const spent = catSpentMap[it.cat] || 0;
              const pending = pendingByCat[it.cat] || 0;
              const remains = budget - spent - pending;
              const tone = getRemainsTone(remains, budget);
              const catObj = CAT[it.cat];
              return (
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
                  {it.cat && budget > 0 && (
                    <div style={{
                      marginTop:8, padding:'6px 10px', borderRadius:10,
                      background: tone.bg, color: tone.color,
                      fontSize:11, fontWeight:700,
                      display:'flex', justifyContent:'space-between', alignItems:'center',
                    }}>
                      <span>{catObj ? catObj.label : '카테고리'} {tone.label && `· ${tone.label}`}</span>
                      <span>잔액 {fmtMoney(remains)}</span>
                    </div>
                  )}
                  <div style={{display:'flex', gap:4, marginTop:8, flexWrap:'wrap'}}>
                    {CATS.map(c => (
                      <button key={c.id} type="button"
                        onClick={()=>updateItem(it.id,'cat',c.id)}
                        title={c.label}
                        aria-label={c.label}
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
              );
            })}
            <button className="add-item-btn" onClick={addItem}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              항목 추가
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            style={{
              marginTop:8, padding:'8px 12px', borderRadius:10,
              border:'1px solid var(--cream3)', background:'var(--cream2)',
              color:'var(--ink2)', fontSize:12, fontWeight:600,
              cursor:'pointer', fontFamily:'inherit',
            }}
          >
            {showAdvanced ? '공유 설정 접기' : '공유 설정 보기'}
          </button>

          {showAdvanced && (<>
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
