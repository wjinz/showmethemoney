import { useState, useRef } from "react";
import { CATS, CAT } from "../constants";
import { runBulkOCR } from "../utils/ocr";
import { toDateStr } from "../utils/helpers";

/**
 * @typedef {{ id: string, date: string, amount: number, cat: string, memo: string, selected: boolean }} ScannedItem
 */

/** @returns {string} */
const newId = () => Math.random().toString(36).slice(2);

const today = () => toDateStr(new Date());

const CAT_IDS = CATS.map(c => c.id);

/**
 * @param {{ who: string, onSave: (tx: object) => void, onClose: () => void }} props
 */
export function CardScanSheet({ who, onSave, onClose }) {
  /** @type {['idle'|'scanning'|'review', (v: 'idle'|'scanning'|'review') => void]} */
  const [phase, setPhase] = useState('idle');
  /** @type {[ScannedItem[], (v: ScannedItem[] | ((prev: ScannedItem[]) => ScannedItem[])) => void]} */
  const [items, setItems] = useState([]);
  const [errMsg, setErrMsg] = useState('');
  const fileRef = useRef(/** @type {HTMLInputElement|null} */ (null));

  /** @param {File} file */
  const handleFile = async (file) => {
    setPhase('scanning');
    setErrMsg('');
    try {
      const raw = await runBulkOCR(file);
      if (raw.length === 0) {
        setErrMsg('인식된 거래가 없어요. 다른 이미지를 시도해보세요.');
        setPhase('idle');
        return;
      }
      setItems(raw.map(r => ({
        id:       newId(),
        date:     r.date || today(),
        amount:   r.amount,
        cat:      CAT_IDS.includes(r.cat) ? r.cat : 'etc',
        memo:     r.memo || '',
        selected: true,
      })));
      setPhase('review');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'OCR 오류');
      setPhase('idle');
    }
  };

  /** @param {string} id */
  const toggleSelect = (id) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));

  /**
   * @param {string} id
   * @param {keyof ScannedItem} field
   * @param {string|number|boolean} value
   */
  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleSaveAll = () => {
    items
      .filter(i => i.selected)
      .forEach(i => onSave({ who, amount: i.amount, cat: i.cat, memo: i.memo, date: i.date, payMethod: 'credit' }));
    onClose();
  };

  const selectedCount = items.filter(i => i.selected).length;

  const overlayStyle = /** @type {React.CSSProperties} */ ({
    position: 'fixed', inset: 0, zIndex: 1100,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
  });

  const sheetStyle = /** @type {React.CSSProperties} */ ({
    width: '100%', maxWidth: 480,
    background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
    borderTop: '1px solid var(--border)',
    maxHeight: '85dvh', display: 'flex', flexDirection: 'column',
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>

        {/* 핸들 + 헤더 */}
        <div style={{ padding: '12px 16px 10px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>Card History</div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>카드 이용내역 스캔</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* idle: 이미지 선택 */}
          {phase === 'idle' && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border2)', borderRadius: 14,
                  padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg3)', marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>🪪</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>카드 이용내역 스크린샷 선택</div>
                <div style={{ fontSize: 11, color: 'var(--text2)' }}>갤러리에서 캡처 이미지를 선택하세요</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              {errMsg && (
                <div style={{ borderRadius: 10, padding: '10px 14px', background: 'var(--redD)', border: '1px solid var(--red)', fontSize: 12, color: 'var(--red)' }}>
                  {errMsg}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, lineHeight: 1.7 }}>
                KB국민 · 신한 · 삼성 · 현대카드 앱의<br />이용내역 화면을 캡처해서 올려주세요.
              </div>
            </>
          )}

          {/* scanning: 로딩 */}
          {phase === 'scanning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 16 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }}>
                <circle cx="12" cy="12" r="9" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
              <div style={{ fontSize: 13, color: 'var(--text2)' }}>AI가 이용내역을 분석 중...</div>
            </div>
          )}

          {/* review: 결과 확인 */}
          {phase === 'review' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10 }}>
                {items.length}건 인식됨 · 저장할 항목을 선택/수정하세요
              </div>

              {items.map(item => {
                const catInfo = CAT[item.cat] || CATS[8];
                return (
                  <div key={item.id} style={{
                    border: `1px solid ${item.selected ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 12, padding: '10px 12px', marginBottom: 8,
                    background: item.selected ? 'var(--goldD)' : 'var(--bg3)',
                    transition: 'all .15s',
                  }}>
                    {/* 체크 + 카테고리 아이콘 + 금액 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelect(item.id)}
                        style={{ width: 16, height: 16, accentColor: 'var(--gold)', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{catInfo.icon}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>
                        {item.amount.toLocaleString()}원
                      </span>
                      <input
                        type="date"
                        value={item.date}
                        onChange={e => updateItem(item.id, 'date', e.target.value)}
                        style={{
                          background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 7,
                          color: 'var(--text)', fontSize: 11, padding: '4px 8px', outline: 'none',
                        }}
                      />
                    </div>
                    {/* 카테고리 선택 + 메모 */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select
                        value={item.cat}
                        onChange={e => updateItem(item.id, 'cat', e.target.value)}
                        style={{
                          flex: '0 0 auto', background: 'var(--bg4)', border: '1px solid var(--border)',
                          borderRadius: 7, color: 'var(--text)', fontSize: 11, padding: '5px 8px', outline: 'none',
                        }}
                      >
                        {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                      <input
                        value={item.memo}
                        placeholder="가맹점명"
                        onChange={e => updateItem(item.id, 'memo', e.target.value)}
                        style={{
                          flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)',
                          borderRadius: 7, color: 'var(--text)', fontSize: 11, padding: '5px 8px',
                          outline: 'none', minWidth: 0,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <button
                onClick={handleSaveAll}
                disabled={selectedCount === 0}
                style={{
                  width: '100%', padding: '15px', borderRadius: 14, border: 'none', marginTop: 6,
                  background: selectedCount > 0 ? 'var(--gold)' : 'var(--bg4)',
                  color: selectedCount > 0 ? '#fff' : 'var(--text3)',
                  fontWeight: 700, fontSize: 15,
                  cursor: selectedCount > 0 ? 'pointer' : 'default',
                  boxShadow: selectedCount > 0 ? '0 4px 20px rgba(200,168,75,.3)' : 'none',
                  transition: 'all .2s',
                }}
              >
                {selectedCount > 0 ? `${selectedCount}건 저장` : '항목을 선택해주세요'}
              </button>

              <button
                onClick={() => { setPhase('idle'); setItems([]); setErrMsg(''); }}
                style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, border: '1px solid var(--border)', background: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
              >
                다시 스캔
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
