import React from 'react';
import { useBudget } from '../context/BudgetContext.jsx';

const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

export function DiaryCard({ item, onPhotoClick, currentUser, onCardClick }) {
  const { names } = useBudget();
  const isH = item.who === 'husband';
  const isExpense = item.type === 'expense';
  const isMine = item.who === currentUser;
  const showContent = isMine || !!item.shared;
  const showItems = isMine || (!!item.shared && !item.mask_details);
  const ownerName = item.who === 'husband' ? names.husband : names.wife;

  return (
    <div className={`diary-card ${item.who}`} onClick={onCardClick}>
      <div className="card-header">
        <div className={`avatar ${item.who}`}>
          {isH ? '👨' : '👩'}
        </div>
        <div className="card-meta">
          <div className="card-name">{isH ? names.husband : names.wife}</div>
          <div className="card-time">{item.time}</div>
        </div>
        {!isExpense && <div className="card-mood">{item.emoji}</div>}
      </div>

      {isExpense ? (
        <div>
          {showContent ? (
            <>
              {item.content && <div className="card-content">{item.content}</div>}
              {showItems && item.expenseItems && item.expenseItems.length > 0 ? (
                <div className="expense-items-in-card">
                  {item.expenseItems.map((ei, i) => (
                    <div key={i} className="expense-item-in-card">
                      <span className="ei-label">{ei.label}</span>
                      <span className="ei-amount">{fmtMoney(ei.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {!showItems && (
                <div className="card-content" style={{color:'var(--ink3)', fontStyle:'italic', fontSize:13}}>
                  {`${ownerName}님이 ${fmtMoney(item.totalSpent)} 지출했습니다`}
                </div>
              )}
            </>
          ) : (
            <div className="card-content" style={{color:'var(--ink3)'}}>
              세부 내역은 비공개 상태입니다
            </div>
          )}
          <div className="card-footer">
            <div className="spend-badge">
              💳 <strong>{fmtMoney(item.totalSpent)}</strong> 지출
            </div>
            {item.shared
              ? (item.mask_details
                  ? <span className="shared-tag private">총액만 공유</span>
                  : <span className="shared-tag shared">내역 공유</span>)
              : <span className="shared-tag private">비공개</span>
            }
          </div>
        </div>
      ) : (
        <div>
          {showContent ? (
            <>
              <div className="card-content">{item.content}</div>
              {item.photos && item.photos.length > 0 && (
                <div className="photo-strip">
                  {item.photos.map((src, i) => (
                    <img key={i} className="photo-thumb" src={src} alt=""
                      onClick={e => { e.stopPropagation(); onPhotoClick && onPhotoClick(src); }} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card-content" style={{color:'var(--ink3)'}}>
              비공개 일기입니다
            </div>
          )}
          <div className="card-footer">
            <div style={{fontSize:12,color:'var(--ink3)'}}>오늘의 기록 ✏️</div>
            {item.shared ? (
              <span className="shared-tag shared">파트너 공유</span>
            ) : (
              <span className="shared-tag private">비공개</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
