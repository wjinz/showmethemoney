import { useState, useEffect } from "react";
import { Card, Chip } from "../components/UI";
import { TxEditModal } from "../components/TxEditModal";
import { CAT, CATS, DNAMES, getYear, getMonth } from "../constants";
import { fmt, fmtMonthDay, fmtPeriodLabel, fmtS, getBillingPeriod, today_str, toDateStr } from "../utils/helpers";

/**
 * @param {{ tx: Array, cards: Array, names: Object, budgets: Object,
 *           onEdit: Function, onDelete: Function,
 *           loadTxYear?: (year: number) => void }} props
 */
export function CalendarView({tx, cards, names, budgets, onEdit, onDelete, loadTxYear}) {
  const [selDate, setSelDate] = useState(toDateStr(new Date()));
  const [selCard, setSelCard] = useState(null);
  const [editingTx, setEditingTx] = useState(null);

  const [viewYear,  setViewYear]  = useState(getYear());
  const [viewMonth, setViewMonth] = useState(getMonth());

  // Task 4-2: 과거 연도로 이동 시 해당 연도 tx lazy 로드
  useEffect(() => {
    if (loadTxYear && viewYear !== getYear()) {
      loadTxYear(viewYear);
    }
  }, [viewYear, loadTxYear]);

  const firstDay    = new Date(viewYear, viewMonth-1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const isCurrentMonth = viewYear===getYear() && viewMonth===getMonth();

  const dailyMap = {};
  tx.forEach(t => {
    const [ty, tm] = t.date.split("-").map(Number);
    if (ty===viewYear && tm===viewMonth) {
      dailyMap[t.date] = (dailyMap[t.date]||0) + t.amount;
    }
  });

  const maxDaily = Math.max(...Object.values(dailyMap), 1);
  const totalBudget = Object.values(budgets).reduce((s,v)=>s+v,0);
  const dailyBudget = totalBudget / daysInMonth;

  const cardPayDates = cards.map(card => {
    try {
      const { payDate, cycleStart, cycleEnd, daysUntilPay } = getBillingPeriod(card,
        new Date(viewYear, viewMonth-1, 15));
      const pY = payDate.getFullYear(), pM = payDate.getMonth()+1, pD = payDate.getDate();
      if (pY===viewYear && pM===viewMonth) {
        return { card, payDay: pD, payDate, cycleStart, cycleEnd, daysUntilPay };
      }
    } catch { return null; }
    return null;
  }).filter(Boolean);

  const payDateMap = {};
  cardPayDates.forEach(cp => {
    const key = `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(cp.payDay).padStart(2,"0")}`;
    if (!payDateMap[key]) payDateMap[key] = [];
    payDateMap[key].push(cp);
  });

  const selTx   = tx.filter(t => t.date === selDate).sort((a,b)=>b.id-a.id);
  const selTotal = selTx.reduce((s,t)=>s+t.amount, 0);
  const selPayCards = payDateMap[selDate] || [];

  const prevMonth = () => {
    if (viewMonth===1) { setViewYear(y=>y-1); setViewMonth(12); }
    else setViewMonth(m=>m-1);
  };
  const nextMonth = () => {
    if (viewMonth===12) { setViewYear(y=>y+1); setViewMonth(1); }
    else setViewMonth(m=>m+1);
  };

  const selDateLabel = `${selDate.split("-")[1]}월 ${selDate.split("-")[2].replace(/^0/,"")}일`;

  return (
    <div style={{padding:"0 16px 96px", overflowY:"auto", height:"100%"}}>
      <div className="u1" style={{padding:"22px 0 14px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={prevMonth} style={{
          width:34,height:34,borderRadius:10,border:"1px solid var(--border)",
          background:"var(--surface)",cursor:"pointer",fontSize:16,color:"var(--text-muted)",
          display:"flex",alignItems:"center",justifyContent:"center"
        }}>‹</button>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"var(--text-muted)",letterSpacing:".08em",textTransform:"uppercase"}}>{viewYear}</div>
          <div className="serif" style={{fontSize:22,lineHeight:1.2}}>{viewMonth}월</div>
        </div>
        <button onClick={nextMonth} style={{
          width:34,height:34,borderRadius:10,border:"1px solid var(--border)",
          background:"var(--surface)",cursor:"pointer",fontSize:16,color:"var(--text-muted)",
          display:"flex",alignItems:"center",justifyContent:"center"
        }}>›</button>
      </div>

      {isCurrentMonth && (
        <div className="u2" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[
            {l:"이달 지출", v:fmtS(tx.filter(t=>t.date.startsWith(`${getYear()}-${String(getMonth()).padStart(2,"0")}`)).reduce((s,t)=>s+t.amount,0))+"원", c:"var(--text)"},
            {l:"결제 예정", v:cards.length>0?fmtS(cardPayDates.reduce((s,cp)=>{
              const s2=toDateStr(cp.cycleStart),e2=toDateStr(cp.cycleEnd);
              return s+tx.filter(t=>t.cardId===cp.card.id&&t.date>=s2&&t.date<=e2).reduce((a,t)=>a+t.amount,0);
            },0))+"원":"—", c:"var(--pink)"},
            {l:"카드 수", v:cards.length+"개", c:"#3B82F6"},
          ].map(s=>(
            <Card key={s.l} style={{padding:"11px 10px",textAlign:"center"}}>
              <div style={{fontSize:10,color:"var(--text-muted)",marginBottom:4}}>{s.l}</div>
              <div style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</div>
            </Card>
          ))}
        </div>
      )}

      <Card className="u3" style={{padding:"14px",marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6}}>
          {DNAMES.map((d,i)=>(
            <div key={d} style={{
              textAlign:"center",fontSize:11,fontWeight:600,
              color:i===0?"var(--danger)":i===6?"#3B82F6":"var(--text-faint)",
              padding:"3px 0"
            }}>{d}</div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {Array(firstDay).fill(null).map((_,i)=><div key={"e"+i}/>)}
          {Array(daysInMonth).fill(null).map((_,i)=>{
            const d = i+1;
            const dateStr = `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const amt = dailyMap[dateStr]||0;
            const isSel = dateStr===selDate;
            const isToday = dateStr===today_str();
            const payCards = payDateMap[dateStr]||[];
            const hasPayDay = payCards.length>0;
            const isOver = amt > dailyBudget * 1.5;
            const weekday = (firstDay + i) % 7;

            const intensity = amt>0 ? Math.min(amt/maxDaily, 1) : 0;
            const heatBg = amt>0
              ? `rgba(${isOver?"217,95,95":"77,171,135"}, ${0.15 + intensity*0.5})`
              : "transparent";

            return (
              <div
                key={d}
                onClick={()=>setSelDate(dateStr)}
                style={{
                  borderRadius:9,padding:"5px 2px 4px",cursor:"pointer",
                  textAlign:"center",position:"relative",
                  background: isSel ? "rgba(28,43,74,.08)" : heatBg,
                  border:`1px solid ${isSel?"var(--primary)":"transparent"}`,
                  transition:"all .12s",
                  minHeight:46,
                }}
              >
                <div style={{
                  fontSize:12,fontWeight:isToday?700:400,lineHeight:1,
                  color:isToday?"var(--primary)":isSel?"var(--primary)":weekday===0?"var(--danger)":weekday===6?"#3B82F6":"var(--text)"
                }}>{d}</div>

                {amt>0 && (
                  <div style={{fontSize:8,color:isSel?"var(--primary)":"var(--text-muted)",marginTop:2,lineHeight:1}}>
                    {fmtS(amt)}
                  </div>
                )}

                {hasPayDay && (
                  <div style={{
                    position:"absolute",bottom:2,right:2,
                    width:5,height:5,borderRadius:"50%",
                    background:"var(--pink)"
                  }}/>
                )}

                {isToday && (
                  <div style={{
                    position:"absolute",top:2,right:2,
                    width:5,height:5,borderRadius:"50%",
                    background:"var(--primary)"
                  }}/>
                )}
              </div>
            );
          })}
        </div>

        <div style={{display:"flex",gap:14,marginTop:12,paddingTop:10,borderTop:"1px solid var(--border)",flexWrap:"wrap"}}>
          {[
            {color:"var(--primary)",label:"오늘"},
            {color:"rgba(77,171,135,.7)",label:"지출 있음"},
            {color:"rgba(217,95,95,.7)",label:"과지출 (1.5배↑)"},
            {color:"var(--pink)",label:"💳 카드 결제일"},
          ].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:l.color,flexShrink:0}}/>
              <span style={{fontSize:10,color:"var(--text-muted)"}}>{l.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="u4" style={{overflow:"hidden"}}>
        <div style={{
          padding:"13px 15px 10px",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          borderBottom:"1px solid var(--border)"
        }}>
          <div>
            <span style={{fontSize:13,fontWeight:700}}>{selDateLabel}</span>
            {selPayCards.length>0 && (
              <span style={{
                marginLeft:8,fontSize:10,fontWeight:700,
                background:"var(--pinkD)",color:"var(--pink)",
                padding:"2px 7px",borderRadius:99
              }}>💳 결제일</span>
            )}
          </div>
          <span style={{fontSize:13,fontWeight:700,color:selTotal>0?"var(--text)":"var(--text-faint)"}}>
            {selTotal>0 ? fmt(selTotal) : "지출 없음"}
          </span>
        </div>

        {selPayCards.map(cp=>{
          const s=toDateStr(cp.cycleStart), e=toDateStr(cp.cycleEnd);
          const cardTotal = tx.filter(t=>t.cardId===cp.card.id&&t.date>=s&&t.date<=e).reduce((a,t)=>a+t.amount,0);
          return(
            <div key={cp.card.id} style={{
              padding:"12px 15px",
              background:`linear-gradient(135deg,${cp.card.color}28,${cp.card.color}10)`,
              borderBottom:"1px solid var(--border)"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:15}}>{cp.card.icon}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{cp.card.label}</span>
                  <span style={{fontSize:10,color:"var(--text-muted)"}}>결제일</span>
                </div>
                <span style={{fontSize:16,fontWeight:700,color:"var(--pink)"}}>{fmt(cardTotal)}</span>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)"}}>
                정산 기간: {fmtPeriodLabel(cp.cycleStart,cp.cycleEnd)}
              </div>
            </div>
          );
        })}

        {selTx.length===0 && selPayCards.length===0 ? (
          <div style={{padding:"22px",textAlign:"center",color:"var(--text-faint)",fontSize:12}}>
            이 날의 기록이 없어요
          </div>
        ):selTx.map(t=>{
          const c = CAT[t.cat]||CATS[8];
          const card = t.cardId ? (cards || []).find(cc => cc.id === t.cardId) : null;
          const pmI = t.payMethod === "credit" ? "💳" : t.payMethod === "debit" ? "🏦" : "💵";
          const pmL = card ? card.label : (t.payMethod === "credit" ? "신용" : t.payMethod === "debit" ? "체크" : "현금");
          const canEdit = onEdit && onDelete;

          return(
            <div
              key={t.id}
              onClick={(e) => { if(canEdit) { e.stopPropagation(); setEditingTx(t); } }}
              style={{
                padding:"10px 15px", borderBottom:"1px solid var(--border)",
                display:"flex", alignItems:"center", gap:12,
                cursor: canEdit ? "pointer" : "default",
                transition: "background .15s",
              }}
              onMouseEnter={e => { if(canEdit) e.currentTarget.style.background="var(--surface-alt)"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; }}
            >
              <div style={{
                width:34,height:34,borderRadius:9,flexShrink:0,
                background:c.color+"1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15
              }}>{c.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,fontWeight:600}}>{c.label}</span>
                  <Chip who={t.who} names={names}/>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:4, fontSize:10, color:"var(--text-faint)"}}>
                  <span style={{color:"var(--text-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{t.memo||"—"}</span>
                  <span>·</span>
                  <span style={{background:"var(--surface)", padding:"0 4px", borderRadius:4, fontSize:9, display:"flex", alignItems:"center", gap:2, border:"1px solid var(--border)"}}>
                    <span>{pmI}</span>
                    <span>{pmL}</span>
                  </span>
                </div>
              </div>
              <span style={{fontSize:13,fontWeight:700,flexShrink:0, color:"var(--text)"}}>-{fmtS(t.amount)}원</span>
              {canEdit && <span style={{fontSize:12,color:"var(--text-faint)",flexShrink:0}}>✎</span>}
            </div>
          );
        })}
      </Card>

      {/* 수정 모달 */}
      {editingTx && onEdit && onDelete && (
        <TxEditModal
          tx={editingTx}
          names={names}
          cards={cards}
          onClose={() => setEditingTx(null)}
          onEdit={(id, updates) => { onEdit(id, updates); setEditingTx(null); }}
          onDelete={(id) => { onDelete(id); setEditingTx(null); }}
        />
      )}
    </div>
  );
}
