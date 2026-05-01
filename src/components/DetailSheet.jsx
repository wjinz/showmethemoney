import React, { useState, useRef } from 'react';
import { CATS, PAY_METHODS } from '../constants/index.js';
import { useBudget } from '../context/BudgetContext.jsx';
import { compressImage } from '../utils/image.js';

const EMOJIS = ['🥺','😂','🥰','😡','😭','😴','🥳','🤔'];
const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

export function DetailSheet({ item, onClose, onSave, onDelete }) {
  const { cards, names } = useBudget();
  const isH = item.who === 'husband';
  const isExpense = item.type === 'expense';

  const [emoji, setEmoji] = useState(item.emoji || '🥺');
  const [content, setContent] = useState(item.content || '');
  const [shared, setShared] = useState(item.shared || false);
  const [photos, setPhotos] = useState(item.photos || []);
  const [items, setItems] = useState(
    item.expenseItems ? item.expenseItems.map((it,i)=>({...it, id:i+1, amount: it.amount.toLocaleString()})) : []
  );
  
  // Antigravity Added Fields
  const [cat, setCat] = useState(item.cat || 'food');
  const [payMethod, setPayMethod] = useState(item.payMethod || 'credit');
  const [cardId, setCardId] = useState(item.cardId || '');

  const fileRef = useRef(null);

  const expTotal = items.reduce((s,it)=>(s + (parseInt(String(it.amount).replace(/[^0-9]/g,''))||0)), 0);

  function updateItem(id, field, val) { setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: val } : it)); }
  function removeItem(id) { setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev); }
  function addItem() { setItems(prev => [...prev, { id: Date.now(), label: '', amount: '' }]); }

  /** @param {React.ChangeEvent<HTMLInputElement>} e */
  async function handleFiles(e) {
    const target = e.target;
    if (!target.files) return;
    const list = Array.from(target.files);
    target.value = '';
    for (const file of list) {
      try {
        const dataUrl = await compressImage(file);
        if (dataUrl.length > 200 * 1024) {
          const retry = await compressImage(file, { maxWidth: 360, quality: 0.55 });
          if (retry.length > 200 * 1024) continue;
          setPhotos(p => [...p, retry].slice(0, 2));
          continue;
        }
        setPhotos(p => [...p, dataUrl].slice(0, 2));
      } catch (err) {
        console.warn('[DetailSheet] compress fail:', err);
      }
    }
  }

  function handleSave() {
    const validItems = items
      .filter(it => it.label.trim() || (parseInt(String(it.amount).replace(/[^0-9]/g,''))||0) > 0)
      .map(it => ({
        label: it.label.trim() || '항목',
        amount: parseInt(String(it.amount).replace(/[^0-9]/g,'')) || 0
      }));
    onSave({
      ...item, emoji, content, shared, photos,
      expenseItems: isExpense ? validItems : undefined,
      totalSpent: isExpense ? expTotal : item.totalSpent,
      cat: isExpense ? cat : undefined,
      payMethod: isExpense ? payMethod : undefined,
      cardId: isExpense ? cardId : undefined,
    });
    onClose();
  }

  function handleDelete() {
    if(window.confirm('이 기록을 삭제할까요?')) { onDelete(item.id); onClose(); }
  }

  return (
    <div className="sheet-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="detail-sheet">
        {/* Header */}
        <div className="detail-sheet-header">
          <div className="dsh-title">기록 수정</div>
          <button className="dsh-del" onClick={handleDelete}>삭제</button>
        </div>

        <div className="detail-sheet-body">
          <div className="field-block" style={{display:'flex', alignItems:'center', gap:10}}>
            <div className={`who-chip ${isH ? 'h' : 'w'}`}>{isH ? `👨 ${names.husband}` : `👩 ${names.wife}`}</div>
            <div style={{fontSize:12, fontWeight:600, color:'var(--ink3)', padding:'5px 10px', borderRadius:20, background:'var(--cream2)'}}>
              {isExpense ? '💳 지출' : '✏️ 다이어리'} · {item.time}
            </div>
          </div>

          <div className="detail-divider"></div>

          {!isExpense && (
            <div className="field-block">
              <div className="field-label">기분</div>
              <div className="emoji-row" style={{padding:0, marginBottom:0}}>
                {EMOJIS.map(e => (
                  <button key={e} className={`emoji-btn${emoji===e?' selected':''}`} onClick={()=>setEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>
          )}

          <div className="field-block">
            <div className="field-label">{isExpense ? '메모' : '일기 내용'}</div>
            <textarea className="sheet-input" style={{margin:0, width:'100%'}} rows={3}
              placeholder={isExpense ? '메모 (선택사항)' : '오늘 하루는 어땠나요?'}
              value={content} onChange={e=>setContent(e.target.value)} />
          </div>

          {isExpense && (
            <div className="field-block">
              <div className="field-label">지출 항목</div>
              <div style={{marginBottom:8, padding:'12px 14px', borderRadius:14, background:'var(--ink)', color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:12, opacity:.6}}>합계</span>
                <span style={{fontSize:18, fontWeight:700, letterSpacing:'-1px'}}>{fmtMoney(expTotal)}</span>
              </div>
              {items.map(it => (
                <div className="expense-item-row" key={it.id}>
                  <input className="expense-item-label-input" type="text" placeholder="항목명"
                    value={it.label} onChange={e=>updateItem(it.id,'label',e.target.value)} />
                  <div className="expense-item-divider"></div>
                  <input className="expense-item-amount-input" type="text" inputMode="numeric" placeholder="금액"
                    value={it.amount} onChange={e=>{
                      const num = e.target.value.replace(/[^0-9]/g,'');
                      updateItem(it.id,'amount',num ? Number(num).toLocaleString() : '');
                    }} />
                  <button className="expense-item-del" onClick={()=>removeItem(it.id)}>×</button>
                </div>
              ))}
              <button className="add-item-btn" onClick={addItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                항목 추가
              </button>
            </div>
          )}
          
          {isExpense && (
            <div className="field-block">
              <div className="field-label">카테고리</div>
              <div className="emoji-row" style={{padding:0, marginBottom: 14}}>
                {CATS.map(c=>(
                  <button key={c.id} className={`emoji-btn${cat===c.id?' selected':''}`} onClick={()=>setCat(c.id)} title={c.label}>
                    {c.icon}
                  </button>
                ))}
              </div>
              
              <div className="field-label">결제 수단</div>
              <div className="who-selector" style={{padding:0, marginBottom:8}}>
                {PAY_METHODS.map(pm=>(
                  <button key={pm.id} className={`who-btn${payMethod===pm.id?' selected':''}`} onClick={()=>setPayMethod(pm.id)}>
                    {pm.label}
                  </button>
                ))}
              </div>
              
              {payMethod !== 'cash' && cards.length > 0 && (
                <select className="sheet-input" style={{margin:0, width:'100%', padding:'10px 14px'}}
                  value={cardId} onChange={e=>setCardId(e.target.value)}>
                  <option value="">카드 선택 안함</option>
                  {cards.map(c=>(
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {!isExpense && (
            <div className="field-block">
              <div className="field-label">사진</div>
              <div className="photo-picker-row">
                <button className="photo-add-btn" onClick={()=>fileRef.current.click()}>
                  <CameraIcon/><span>추가</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleFiles}/>
                {photos.map((src, idx) => (
                  <div className="photo-preview-wrap" key={idx}>
                    <img className="photo-preview-thumb" src={src} alt="" />
                    <button className="photo-preview-del" onClick={()=>setPhotos(p => p.filter((_,i)=>i!==idx))}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-divider"></div>

          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
            <div>
              <div style={{fontSize:13, color:'var(--ink2)', fontWeight:500}}>파트너와 공유</div>
              <div style={{fontSize:11, color:'var(--ink3)'}}>{isExpense ? '내역 공유 (해제 시 총액만 공유)' : '다이어리 내용 공유'}</div>
            </div>
            <button className={`toggle${shared?' on':''}`} onClick={()=>setShared(v=>!v)}></button>
          </div>
        </div>

        <div className="detail-sheet-footer">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave}>저장하기</button>
        </div>
      </div>
    </div>
  );
}
