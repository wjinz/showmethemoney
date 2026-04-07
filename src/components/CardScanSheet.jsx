import { useState, useRef, useEffect, useMemo } from "react";
import { CATS, CAT } from "../constants";
import { runBulkOCR } from "../utils/ocr";
import { useOcrScan } from "../hooks/useOcrScan";
import { ReceiptSplitter } from "./ReceiptSplitter.jsx";

/**
 * @typedef {{ id: string, date: string, amount: number, cat: string, memo: string, selected: boolean }} ScannedItem
 */

/** @returns {string} */
const newId = () => Math.random().toString(36).slice(2);

export function CardScanSheet({ who, onSave, onSaveAll, onClose }) {
  const { phase, data: rawItems, error: errMsg, cooldown, startScan, reset } = useOcrScan(runBulkOCR, 'bulk');
  
  const [showSplitter, setShowSplitter] = useState(false);
  const [items, setItems] = useState([]);
  const [scanFile, setScanFile] = useState(null); 
  const fileRef = useRef(null);
  const processedRef = useRef(false);

  // Blob URL 메모리 누수 방지
  const previewUrl = useMemo(() => scanFile ? URL.createObjectURL(scanFile) : null, [scanFile]);
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  // 훅에서 데이터가 넘어오면 초기 처리
  useEffect(() => {
    if (rawItems && Array.isArray(rawItems.items)) {
      setItems(rawItems.items.map(r => ({
        id:       newId(),
        date:     r.date || new Date().toISOString().slice(0, 10),
        amount:   r.amount,
        cat:      CATS.map(c => c.id).includes(r.cat) ? r.cat : 'etc',
        memo:     r.memo || '',
        selected: true,
      })));
    }
  }, [rawItems]);

  // PWA Share Target 이미지 처리
  useEffect(() => {
    if (processedRef.current) return;
    const sharedFile = window.__sharedFile;
    if (sharedFile instanceof File) {
      processedRef.current = true;
      window.__sharedFile = null;
      setScanFile(sharedFile);
      startScan(sharedFile);
    }
  }, [startScan]);

  const handleFile = (file) => {
    if (cooldown > 0) return;
    setScanFile(file);
    startScan(file);
  };

  const handleReset = () => {
    reset();
    setItems([]);
    setScanFile(null);
  };

  const toggleSelect = (id) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));

  const toggleAll = (selected) =>
    setItems(prev => prev.map(i => ({ ...i, selected })));

  const removeItem = (id) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const selectedCount = useMemo(() => items.filter(i => i.selected).length, [items]);
  const allSelected = useMemo(() => items.length > 0 && items.every(i => i.selected), [items]);
  const hasInvalidAmount = useMemo(() => {
    return items.some(i => i.selected && (!i.amount || Number(i.amount) <= 0));
  }, [items]);

  const handleSaveAll = () => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) return;

    if (hasInvalidAmount) {
      if (!window.confirm("금액이 0원 이하인 항목이 포함되어 있습니다. 그대로 저장할까요?")) {
        return;
      }
    }

    const txList = selectedItems.map(i => ({
      who,
      amount: i.amount,
      cat: i.cat,
      memo: i.memo,
      date: i.date,
      payMethod: 'credit',
      type: 'expense',
    }));

    if (onSaveAll) {
      onSaveAll(txList);
    } else {
      txList.forEach(t => onSave(t));
    }
    
    reset(); // 세션 데이터 정리
    setScanFile(null);
    onClose();
  };

  const overlayStyle = {
    position: 'fixed', inset: 0, zIndex: 1100,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
  };

  const sheetStyle = {
    width: '100%', maxWidth: 480,
    background: 'var(--bg2)', borderRadius: '20px 20px 0 0',
    borderTop: '1px solid var(--border)',
    maxHeight: '90dvh', display: 'flex', flexDirection: 'column',
  };

  return (
    <>
    {showSplitter && (
      <ReceiptSplitter
        items={items.filter(i => i.selected)}
        onConfirm={(shared, priv) => {
          const all = [
            ...shared.map(i => ({ who, amount: i.amount, cat: i.cat, memo: i.memo, date: i.date, payMethod: 'credit', type: 'expense', is_private: false })),
            ...priv.map(i => ({ who, amount: i.amount, cat: i.cat, memo: i.memo, date: i.date, payMethod: 'credit', type: 'expense', is_private: true })),
          ];
          if (onSaveAll) { onSaveAll(all); } else { all.forEach(t => onSave(t)); }
          reset(); // 세션 데이터 정리
          onClose();
        }}
        onClose={() => setShowSplitter(false)}
      />
    )}
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 14px', flexShrink: 0 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 14px', opacity: 0.5 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', marginBottom: 2, letterSpacing: ".05em" }}>AI SMART SCAN</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>내역 검토 및 입력</div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)', width: 32, height: 32, borderRadius: "50%", cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {phase === 'idle' && (
            <div>
              <div
                onClick={() => cooldown <= 0 && fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border2)', borderRadius: 16,
                  padding: '48px 20px', textAlign: 'center', 
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  background: 'var(--bg3)', marginBottom: 16,
                  opacity: cooldown > 0 ? 0.6 : 1,
                }}
              >
                <div style={{ fontSize: 42, marginBottom: 16 }}>{cooldown > 0 ? '⏳' : '📸'}</div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                  {cooldown > 0 ? `AI 엔진 냉각 중 (${cooldown}초)` : '사진 업로드 또는 촬영'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  영수증이나 카드 내역 스크린샷을 자동 분석해드립니다.
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              {errMsg && (
                <div style={{ 
                  borderRadius: 12, padding: '12px 16px', 
                  background: 'var(--redD)', border: '1px solid var(--red)', 
                  fontSize: 13, color: 'var(--red)', marginBottom: 16,
                  maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap',
                  lineHeight: '1.5'
                }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>⚠️ 분석 오류 발생</div>
                  {errMsg}
                </div>
              )}
            </div>
          )}

          {phase === 'scanning' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 20 }}>
              <div style={{ position: "relative", width: 64, height: 64 }}>
                <svg width="64" height="64" viewBox="0 0 24 24" style={{ animation: 'spin 1.2s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="var(--gold)" strokeWidth="2" strokeDasharray="40 20" strokeLinecap="round" />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧠</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Gemma 4 엔진 분석 중...</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>이미지에서 날짜와 금액을 추출하고 있습니다.</div>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Preview" style={{ maxWidth: '80%', maxHeight: '200px', borderRadius: 12, border: '1px solid var(--border)' }} />
              )}
            </div>
          )}

          {phase === 'review' && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
                  {items.length}건 인식됨 · {selectedCount}건 선택됨
                </div>
                <button onClick={() => toggleAll(!allSelected)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "var(--text2)", cursor: "pointer" }}>
                  {allSelected ? "전체 해제" : "전체 선택"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                {items.map(item => {
                  const catInfo = CAT[item.cat] || CATS[8];
                  return (
                    <div key={item.id} style={{
                      position: "relative", border: `1px solid ${item.selected ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 14, padding: '12px', background: item.selected ? 'var(--goldD)' : 'var(--bg3)',
                    }}>
                      <button onClick={() => removeItem(item.id)} style={{ position: "absolute", top: -8, right: -8, background: "var(--bg2)", border: "1px solid var(--border)", width: 22, height: 22, borderRadius: "50%", cursor: "pointer" }}>✕</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div onClick={() => toggleSelect(item.id)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.selected ? 'var(--gold)' : 'var(--border2)'}`, background: item.selected ? 'var(--gold)' : 'none', cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                          {item.selected && "✓"}
                        </div>
                        <span style={{ fontSize: 24 }}>{catInfo.icon}</span>
                        <input type="number" value={item.amount} onChange={e => updateItem(item.id, 'amount', Number(e.target.value))} style={{ flex: 1, background: 'none', border: 'none', color: Number(item.amount) <= 0 ? 'var(--red)' : 'var(--text)', fontSize: 18, fontWeight: 900, outline: 'none' }} />
                        <input type="date" value={item.date} onChange={e => updateItem(item.id, 'date', e.target.value)} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 11, padding: '4px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={item.cat} onChange={e => updateItem(item.id, 'cat', e.target.value)} style={{ background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12 }}>
                          {CATS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                        </select>
                        <input value={item.memo} placeholder="가맹점명" onChange={e => updateItem(item.id, 'memo', e.target.value)} style={{ flex: 1, background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 12, padding: '6px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={handleReset} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg3)', cursor: 'pointer' }}>재촬영</button>
                <button onClick={() => setShowSplitter(true)} disabled={selectedCount === 0} style={{ flex: 1, padding: '14px', borderRadius: 16, border: `1px solid ${selectedCount > 0 ? '#E8715A' : 'var(--border)'}`, color: selectedCount > 0 ? '#E8715A' : 'var(--text3)', cursor: selectedCount > 0 ? 'pointer' : 'default' }}>분류</button>
                <button onClick={handleSaveAll} disabled={selectedCount === 0} style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: selectedCount > 0 ? (hasInvalidAmount ? 'var(--red)' : 'var(--gold)') : 'var(--bg4)', color: '#fff', fontWeight: 800, cursor: selectedCount > 0 ? 'pointer' : 'default' }}>
                  {selectedCount > 0 ? `${selectedCount}건 저장` : '선택 필요'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
