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
 * @param {{ who: string, onSave: (tx: object) => void, onSaveAll?: (txList: object[]) => void, onClose: () => void }} props
 */
export function CardScanSheet({ who, onSave, onSaveAll, onClose }) {
  const [phase, setPhase] = useState(/** @type {'idle'|'scanning'|'review'} */ ('idle'));
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

  /** @param {boolean} selected */
  const toggleAll = (selected) =>
    setItems(prev => prev.map(i => ({ ...i, selected })));

  /** @param {string} id */
  const removeItem = (id) =>
    setItems(prev => prev.filter(i => i.id !== id));

  /**
   * @param {string} id
   * @param {keyof ScannedItem} field
   * @param {string|number|boolean} value
   */
  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleSaveAll = () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) return;
    const txList = selectedItems.map(i => ({
      who,
      amount: i.amount,
      cat: i.cat,
      memo: i.memo,
      date: i.date,
      payMethod: 'credit',
      type: 'expense',
    }));
    // B1: onSaveAll이 있으면 배치 저장 (race condition 방지), 없으면 개별 저장 fallback
    if (onSaveAll) {
      onSaveAll(txList);
    } else {
      txList.forEach(t => onSave(t));
    }
    onClose();
  };

  const selectedCount = items.filter(i => i.selected).length;
  const allSelected = items.length > 0 && items.every(i => i.selected);

  const overlayStyle = /** @type {import('react').CSSProperties} */ ({
    position: 'fixed', inset: 0, zIndex: 1100,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
  });

  const sheetStyle = /** @type {import('react').CSSProperties} */ ({
    width: '100%', maxWidth: 480,
    background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
    borderTop: '1px solid var(--border)',
    maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
    animation: "slideUp 0.3s cubic-bezier(0.32,0.72,0,1)",
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>

        {/* 핸들 + 헤더 */}
        <div style={{ padding: '12px 16px 14px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px', opacity: 0.5 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', marginBottom: 2, letterSpacing: ".05em" }}>AI SMART SCAN</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>내역 검토 및 입력</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)', width: 32, height: 32, borderRadius: "50%", display:"flex", alignItems:"center", justifyContent:"center", cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>

          {/* idle: 이미지 선택 */}
          {phase === 'idle' && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border2)', borderRadius: 16,
                  padding: '48px 20px', textAlign: 'center', cursor: 'pointer',
                  background: 'var(--bg3)', marginBottom: 16,
                  transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = "var(--gold)"}
                onMouseOut={e => e.currentTarget.style.borderColor = "var(--border2)"}
              >
                <div style={{ fontSize: 42, marginBottom: 16 }}>📸</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>사진 업로드 또는 촬영</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>영수증이나 카드 내역 스크린샷을<br />AI가 자동으로 분석해드립니다.</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              
              {errMsg && (
                <div style={{ borderRadius: 12, padding: '12px 16px', background: 'var(--redD)', border: '1px solid var(--red)', fontSize: 13, color: 'var(--red)', marginBottom: 16, display: "flex", gap: 8 }}>
                  <span>⚠️</span> {errMsg}
                </div>
              )}

              <div style={{ background: "var(--bg3)", padding: "14px", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text2)" }}>💡 사용 팁</div>
                <ul style={{ margin: 0, padding: "0 0 0 18px", fontSize: 11, color: "var(--text3)", lineHeight: 1.8 }}>
                  <li>카드사 앱의 <b>이용 내역 화면</b>을 캡처해서 올려보세요.</li>
                  <li>종이 영수증은 <b>위에서 수직으로</b> 밝은 곳에서 찍어주세요.</li>
                  <li>한 번에 여러 거래가 찍혀있어도 AI가 각각 분리해냅니다.</li>
                </ul>
              </div>
            </div>
          )}

          {/* scanning: 로딩 */}
          {phase === 'scanning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 20 }}>
              <div style={{ position: "relative", width: 60, height: 60 }}>
                <svg width="60" height="60" viewBox="0 0 24 24" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="40 20" strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧠</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>인공지능이 눈을 비비는 중...</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>이미지에서 날짜와 금액을 추출하고 있습니다.</div>
              </div>
            </div>
          )}

          {/* review: 결과 확인 */}
          {phase === 'review' && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 16, padding: "4px 2px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                  {items.length}건 인식됨 · {selectedCount}건 선택됨
                </div>
                <button 
                  onClick={() => toggleAll(!allSelected)}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "var(--text2)", cursor: "pointer", fontWeight: 700 }}
                >
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {items.map(item => {
                  const catInfo = CAT[item.cat] || CATS[8];
                  return (
                    <div key={item.id} style={{
                      position: "relative",
                      border: `1px solid ${item.selected ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '12px',
                      background: item.selected ? 'var(--goldD)' : 'var(--bg3)',
                      boxShadow: item.selected ? "0 4px 12px rgba(200,168,75,0.15)" : "none",
                      transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}>
                      {/* 삭제 버튼 */}
                      <button 
                        onClick={() => removeItem(item.id)}
                        style={{ position: "absolute", top: -8, right: -8, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text3)", width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)" }}
                      >✕</button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div 
                          onClick={() => toggleSelect(item.id)}
                          style={{ 
                            width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.selected ? 'var(--gold)' : 'var(--border2)'}`, 
                            background: item.selected ? 'var(--gold)' : 'none', 
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: 14 
                          }}
                        >
                          {item.selected && "✓"}
                        </div>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{catInfo.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                           <input
                            type="number"
                            value={item.amount}
                            onChange={e => updateItem(item.id, 'amount', Number(e.target.value))}
                            style={{
                              width: "100%", background: 'none', border: 'none',
                              color: 'var(--text)', fontSize: 18, fontWeight: 900, padding: 0, outline: 'none',
                            }}
                          />
                        </div>
                        <input
                          type="date"
                          value={item.date}
                          onChange={e => updateItem(item.id, 'date', e.target.value)}
                          style={{
                            background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8,
                            color: 'var(--text)', fontSize: 11, padding: '5px 8px', outline: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          value={item.cat}
                          onChange={e => updateItem(item.id, 'cat', e.target.value)}
                          style={{
                            flex: '0 0 auto', background: 'var(--bg4)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '6px 10px', outline: 'none',
                          }}
                        >
                          {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                        <input
                          value={item.memo}
                          placeholder="가맹점 또는 품목명"
                          onChange={e => updateItem(item.id, 'memo', e.target.value)}
                          style={{
                            flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '6px 12px',
                            outline: 'none', minWidth: 0,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setPhase('idle'); setItems([]); setErrMsg(''); }}
                  style={{ flex: 1, padding: '16px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text2)', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: "all 0.2s" }}
                >
                  취소/재촬영
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={selectedCount === 0}
                  style={{
                    flex: 2, padding: '16px', borderRadius: 16, border: 'none',
                    background: selectedCount > 0 ? 'var(--gold)' : 'var(--bg4)',
                    color: selectedCount > 0 ? '#fff' : 'var(--text3)',
                    fontWeight: 800, fontSize: 16,
                    cursor: selectedCount > 0 ? 'pointer' : 'default',
                    boxShadow: selectedCount > 0 ? '0 8px 24px rgba(200,168,75,.4)' : 'none',
                    transition: 'all .25s',
                  }}
                >
                  {selectedCount > 0 ? `${selectedCount}건 한꺼번에 저장` : '저장할 항목 선택'}
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--text3)" }}>
                저장 시 모든 항목은 '신용카드' 지출로 등록됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
