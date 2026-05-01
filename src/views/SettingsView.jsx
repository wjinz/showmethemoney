import React, { useState } from "react";
import { useBudget } from "../context/BudgetContext.jsx";
import { exportTransactions } from "../utils/export";

const fmtMoney = v => new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW'}).format(v||0);

export function SettingsView({
  names, setNames, budgets, sliderCfg, setSliderCfg,
  resetAll, resetTx, resetFixed, resetBudgets, resetSetup, resetDiaries,
  householdId, myRole,
  leaveHousehold, tx, onBugReport, onAdminTrigger, isAdmin, onNavigate
}) {
  const [clickCount, setClickCount] = useState(0);
  const { kidsMode, setKidsMode } = useBudget();
  const [editNames, setEditNames] = useState(false);
  const [draftH, setDraftH] = useState(names.husband);
  const [draftW, setDraftW] = useState(names.wife);
  const [showReset, setShowReset] = useState(false);

  const totalBudget = Object.values(budgets).reduce((s,v)=>s+(typeof v === 'number' ? v : 0), 0);

  const openNameEdit = () => {
    setDraftH(names.husband);
    setDraftW(names.wife);
    setEditNames(true);
  };

  const saveNames = () => {
    setNames({ husband: draftH || '남편', wife: draftW || '와이프' });
    setEditNames(false);
  };

  const resetItems = [
    { label: '지출 내역만 삭제',     fn: resetTx      },
    { label: '고정비/할부 초기화',   fn: resetFixed   },
    { label: '예산 설정 초기화',     fn: resetBudgets },
    { label: '다이어리 초기화',      fn: resetDiaries },
    { label: '사용자 설정 초기화',   fn: resetSetup   },
    { label: '전체 초기화',          fn: resetAll, isAll: true },
  ];

  const items = [
    {label:'예산 관리', sub:`월 예산 ${fmtMoney(totalBudget)}`, icon:'🎯', action:()=>onNavigate("budget")},
    {label:'카드 관리', sub:'결제 수단 연동', icon:'💳', action:()=>onNavigate("budget")},
    {label:'자산/부채', sub:'전체 자산 현황', icon:'💰', action:()=>onNavigate("asset")},
    {label:'과거 리포트', sub:'지난 지출 통계', icon:'📊', action:()=>onNavigate("report")},
    {label:'세금 최적화', sub:'연말정산 등', icon:'📝', action:()=>onNavigate("tax")},
    {label:'데이터 가져오기', sub:'CSV 임포트', icon:'📥', action:()=>onNavigate("dataImport")},
    {label:'캘린더', sub:'달력형 요약', icon:'📅', action:()=>onNavigate("calendar")},
    {label:'기본 정보', sub:`${names.husband} / ${names.wife}`, icon:'👤', action: openNameEdit},
    {label:'데이터 초기화', sub:'항목별 선택 삭제', icon:'🗑️', danger:true, action: () => setShowReset(v => !v)},
  ];

  return (
    <div className="view" style={{background:'var(--bg)'}}>
      <div className="view-header">
        <div>
          <h1>설정</h1>
          <div className="sub">Control Center</div>
        </div>
      </div>
      <div className="scroll-area">
        <div style={{
          borderRadius:20,background:'var(--ink)',color:'white',
          padding:'16px 18px',marginBottom:16,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'space-between'
        }} onClick={()=>onNavigate && onNavigate("settlement")}>
          <div>
            <div style={{fontSize:11,opacity:.5,letterSpacing:'.4px',marginBottom:4}}>이번 달</div>
            <div style={{fontSize:16,fontWeight:700}}>💰 월간 정산하기 (수기 계산기)</div>
            <div style={{fontSize:12,opacity:.6,marginTop:3}}>카드 확정금액 · 부부 현금 · 기타 비용 → 잔액/부족액</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {items.map(item => (
          <React.Fragment key={item.label}>
            <div onClick={item.action} style={{
              padding:'15px 18px',background:'white',borderRadius:16,marginBottom:8,
              border:'1px solid var(--cream3)',display:'flex',justifyContent:'space-between',
              alignItems:'center',cursor:'pointer'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:18}}>{item.icon}</span>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:item.danger?'var(--danger)':'var(--ink)'}}>{item.label}</div>
                  <div style={{fontSize:12,color:'var(--ink3)',marginTop:2}}>{item.sub}</div>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink3)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>

            {item.label === '기본 정보' && editNames && (
              <div style={{background:'white', borderRadius:16, padding:'16px 18px',
                border:'1px solid var(--cream3)', marginBottom:8}}>
                <div style={{fontSize:13, fontWeight:600, marginBottom:10, color:'var(--ink2)'}}>이름 수정</div>
                <input value={draftH} onChange={e=>setDraftH(e.target.value)}
                  placeholder="남편 이름"
                  style={{width:'100%', padding:'10px 12px', borderRadius:10,
                    border:'1px solid var(--cream3)', marginBottom:8, fontFamily:'inherit', fontSize:14, outline:'none'}} />
                <input value={draftW} onChange={e=>setDraftW(e.target.value)}
                  placeholder="와이프 이름"
                  style={{width:'100%', padding:'10px 12px', borderRadius:10,
                    border:'1px solid var(--cream3)', marginBottom:12, fontFamily:'inherit', fontSize:14, outline:'none'}} />
                <div style={{display:'flex', gap:8}}>
                  <button onClick={()=>setEditNames(false)}
                    style={{flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--cream3)',
                      background:'white', color:'var(--ink3)', fontSize:13, cursor:'pointer'}}>
                    취소
                  </button>
                  <button onClick={saveNames}
                    style={{flex:2, padding:'10px', borderRadius:10, border:'none',
                      background:'var(--ink)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer'}}>
                    저장
                  </button>
                </div>
              </div>
            )}

            {item.label === '데이터 초기화' && showReset && (
              <div style={{background:'var(--danger-bg1, #FFF5F3)', border:'1px solid var(--danger-border, #FCA5A5)',
                borderRadius:16, padding:'16px 18px', marginBottom:8}}>
                <div style={{fontSize:13, fontWeight:700, color:'var(--danger)', marginBottom:12}}>
                  초기화할 항목을 선택하세요
                </div>
                {resetItems.map(({ label, fn, isAll }) => (
                  <button key={label}
                    onClick={() => {
                      if (typeof fn !== 'function') return;
                      if (window.confirm(`"${label}" 하시겠습니까?`)) {
                        Promise.resolve(fn()).finally(() => setShowReset(false));
                      }
                    }}
                    style={{
                      width:'100%', padding:'11px 14px', borderRadius:10, border:'none',
                      background: isAll ? 'var(--danger)' : 'white',
                      color: isAll ? 'white' : 'var(--danger)',
                      fontSize:13, fontWeight:600, cursor:'pointer',
                      marginBottom:6, textAlign:'left',
                      fontFamily:'inherit',
                    }}>
                    {label}
                  </button>
                ))}
                <button onClick={()=>setShowReset(false)}
                  style={{width:'100%', padding:'11px', borderRadius:10, border:'1px solid var(--cream3)',
                    background:'white', fontSize:13, cursor:'pointer', marginTop:4, fontFamily:'inherit', color:'var(--ink2)'}}>
                  취소
                </button>
              </div>
            )}
          </React.Fragment>
        ))}

        <div style={{marginTop: 20}}>
          <button onClick={() => onNavigate && onNavigate("kids-mgmt")}
            style={{ width: "100%", padding: "15px", borderRadius: 16, border: "1px solid var(--cream3)", background: "white", color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
            🧒 아이 프로필 및 미션 관리
          </button>

          <button onClick={() => exportTransactions(tx)}
            style={{ width: "100%", padding: "15px", borderRadius: 16, border: "1px solid var(--primary)", background: "rgba(28,43,74,.05)", color: "var(--primary)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
            📥 전체 지출 내역 CSV 내보내기
          </button>

          <button onClick={() => navigator.clipboard.writeText(householdId).then(() => alert("복사되었습니다."))}
            style={{ width: "100%", padding: "15px", borderRadius: 16, border: "1px solid var(--cream3)", background: "white", color: "var(--ink2)", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
            가계부 HID 복사 (연결용)
          </button>

          <button onClick={() => { if (window.confirm("정말로 이 가계부에서 나갈까요?")) leaveHousehold(); }}
            style={{ width: "100%", padding: "15px", borderRadius: 16, border: "1px dashed var(--danger)", background: "white", color: "var(--danger)", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
            가계부 연결 해제
          </button>

          <button onClick={onBugReport}
            style={{ width: "100%", padding: "15px", borderRadius: 16, border: "1px solid #3B82F6", background: "#EFF6FF", color: "#3B82F6", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
            🐞 오류 제보하기 (시스템 개선)
          </button>

          {isAdmin && (
            <button onClick={onAdminTrigger}
              style={{ width: "100%", padding: "15px", borderRadius: 16, border: "none", background: "var(--ink)", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
              👨‍💻 관리자 페이지
            </button>
          )}
        </div>

        <div
          onClick={() => {
            const newCount = clickCount + 1;
            if (newCount >= 5) {
              onAdminTrigger();
              setClickCount(0);
            } else {
              setClickCount(newCount);
            }
          }}
          style={{ textAlign: "center", padding: "20px 10px", opacity: 0.4, fontSize: 11, cursor: "pointer", color:'var(--ink3)' }}
        >
          Family Budget v4.0.0 {clickCount > 0 && `(${clickCount})`}
        </div>
      </div>

    </div>
  );
}
