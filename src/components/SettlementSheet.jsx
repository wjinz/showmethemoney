import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';

const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

export function SettlementSheet({ diaries, onClose }) {
  const { names } = useBudget();
  const expenses = diaries.filter(d=>d.type==='expense');
  const hTotal = expenses.filter(d=>d.who==='husband').reduce((s,d)=>s+(d.totalSpent||0),0);
  const wTotal = expenses.filter(d=>d.who==='wife').reduce((s,d)=>s+(d.totalSpent||0),0);
  const totalSpent = hTotal + wTotal;
  const fair = Math.round(totalSpent / 2);
  const diff = hTotal - wTotal;
  const payer   = diff > 0 ? names.husband : names.wife;
  const receiver = diff > 0 ? names.wife : names.husband;
  const amount   = Math.abs(Math.round(diff / 2));
  
  const [settled, setSettled] = useState(false);

  return (
    <div className="sheet-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sheet">
        <div className="sheet-handle"></div>
        <div className="sheet-title">이번 달 정산하기 💰</div>

        <div style={{padding:'0 20px',marginBottom:16}}>
          <div className="couple-split">
            <div className="split-item h-split">
              <div className="split-name">👨 {names.husband}</div>
              <div className="split-amt">{fmtMoney(hTotal)}</div>
              <div className="split-pct">{totalSpent>0?Math.round(hTotal/totalSpent*100):0}%</div>
            </div>
            <div className="split-item w-split">
              <div className="split-name">👩 {names.wife}</div>
              <div className="split-amt">{fmtMoney(wTotal)}</div>
              <div className="split-pct">{totalSpent>0?Math.round(wTotal/totalSpent*100):0}%</div>
            </div>
          </div>
        </div>

        <div style={{margin:'0 20px 16px',padding:'14px 16px',borderRadius:16,background:'var(--cream2)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:13,color:'var(--ink3)'}}>이번 달 총 지출</span>
            <span style={{fontSize:14,fontWeight:700,color:'var(--ink)'}}>{fmtMoney(totalSpent)}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:13,color:'var(--ink3)'}}>1인당 공평 분담</span>
            <span style={{fontSize:14,fontWeight:700,color:'var(--ink)'}}>{fmtMoney(fair)}</span>
          </div>
        </div>

        {amount > 0 && !settled && (
          <div style={{
            margin:'0 20px 20px',padding:'18px',borderRadius:18,
            background: diff>0?'var(--h-light)':'var(--w-light)',
            border:`1.5px solid ${diff>0?'var(--h-mid)':'var(--w-mid)'}`
          }}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--ink3)',marginBottom:8}}>정산 결과</div>
            <div style={{fontSize:15,color:'var(--ink2)',lineHeight:1.6}}>
              <strong style={{color:'var(--ink)'}}>{payer}</strong>이(가) {' '}
              <strong style={{color:'var(--ink)'}}>{receiver}</strong>에게 {' '}
              <strong style={{
                fontSize:20,color:diff>0?'var(--h-color)':'var(--w-color)',letterSpacing:'-.5px'
              }}>{fmtMoney(amount)}</strong>{' '}
              을 이체하면 돼요
            </div>
          </div>
        )}
        {settled && (
          <div style={{
            margin:'0 20px 20px',padding:'18px',borderRadius:18,
            background:'oklch(94% 0.08 150)',border:'1.5px solid oklch(80% 0.10 150)',
            textAlign:'center'
          }}>
            <div style={{fontSize:24,marginBottom:6}}>✅</div>
            <div style={{fontSize:14,fontWeight:600,color:'oklch(38% 0.12 150)'}}>정산 완료!</div>
            <div style={{fontSize:12,color:'oklch(50% 0.10 150)',marginTop:3}}>이번 달 정산이 완료되었어요</div>
          </div>
        )}

        {!settled && (
          <button className="sheet-submit" onClick={()=>setSettled(true)}>
            정산 완료 표시
          </button>
        )}
        {settled && (
          <button className="sheet-submit" style={{background:'var(--ink3)'}} onClick={onClose}>
            닫기
          </button>
        )}
      </div>
    </div>
  );
}
