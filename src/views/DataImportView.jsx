import { useState, useRef } from "react";
import { Card } from "../components/UI";
import { CAT, CATS, MONTH_NAMES } from "../constants";
import { fmtS } from "../utils/helpers";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import * as XLSX from "xlsx";

// ────────────────────────────────────────────────
// 가맹점명 → 카테고리 추측 키워드
// ────────────────────────────────────────────────
const KW = {
  food:      ["스타벅스","커피","카페","맥도날드","버거","치킨","피자","배달","쿠팡이츠","요기요","배민","마켓컬리","이마트","홈플러스","롯데마트","gs25","cu편의","세븐일레","편의점","식당","음식","슈퍼","베이커리","파리바게","뚜레쥬르","김밥","분식","도시락","한식","중식","일식","양식","쿠팡푸드"],
  transport: ["지하철","버스","택시","카카오t","우버","주유","칼텍스","sk에너지","현대오일","s-oil","주차","ktx","srt","항공","아시아나","대한항공","티머니","교통카드"],
  medical:   ["병원","의원","약국","치과","한의원","클리닉","헬스","피트니스","요가","gym","필라테스","의료"],
  education: ["학원","교육","도서","교보문고","yes24","알라딘","인터파크도서","서점","온라인강의","인프런","클래스"],
  culture:   ["cgv","롯데시네마","메가박스","넷플릭스","유튜브프리미엄","왓챠","쿠팡플레이","티빙","공연","뮤지컬","여행","호텔","에어비앤비","야놀자","여기어때","쿠팡여행"],
  clothing:  ["무신사","지그재그","29cm","h&m","자라","유니클로","나이키","아디다스","뉴발란스","스파오","탑텐","세정"],
  sub:       ["구독","멤버십","네이버플러스","카카오","애플","구글","아마존","어도비","microsoft","ms365"],
  housing:   ["월세","관리비","아파트","인테리어","이케아","다이소","리빙","부동산"],
};

const guessCat = (merchant) => {
  const m = String(merchant || "").toLowerCase();
  for (const [cat, kws] of Object.entries(KW)) {
    if (kws.some(kw => m.includes(kw))) return cat;
  }
  return "etc";
};

// ────────────────────────────────────────────────
// 컬럼 자동 감지 (한국 카드사 공통 패턴)
// ────────────────────────────────────────────────
const detectCols = (headers) => {
  const h = headers.map(x => String(x || "").toLowerCase());
  return {
    dateIdx:     h.findIndex(x => /일자|날짜|일시|승인일|거래일|date/.test(x)),
    amtIdx:      h.findIndex(x => /이용금액|거래금액|청구금액|결제금액|금액/.test(x) && !/취소|할인|포인트|적립/.test(x)),
    merchantIdx: h.findIndex(x => /가맹점|업체명|상호|점명|merchant|이용처/.test(x)),
    cancelIdx:   h.findIndex(x => /취소|cancel|구분/.test(x)),
  };
};

// 날짜 파싱 (YYYYMMDD, YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD 등)
const parseDate = (raw) => {
  const s = String(raw || "").replace(/[./]/g, "-").trim();
  // YYYYMMDD
  if (/^\d{8}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
  // YYYY-MM-DD or similar
  const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  return null;
};

const parseAmt = (raw) => {
  const n = parseInt(String(raw || "").replace(/[^0-9]/g, ""));
  return isNaN(n) ? 0 : n;
};

// ────────────────────────────────────────────────
// 분석 계산
// ────────────────────────────────────────────────
const analyze = (txs) => {
  const byMonth = {}, byCat = {}, byMerchant = {};
  txs.forEach(t => {
    const ym = t.date.slice(0, 7);
    byMonth[ym]         = (byMonth[ym]   || 0) + t.amount;
    byCat[t.cat]        = (byCat[t.cat]  || 0) + t.amount;
    byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
  });
  const months = Object.keys(byMonth).sort();
  const total  = txs.reduce((s, t) => s + t.amount, 0);
  const avgMonthly = months.length > 0 ? Math.round(total / months.length) : 0;
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { total, count: txs.length, byMonth, byCat, avgMonthly, topMerchants, months };
};

// recharts 툴팁 포맷
const KrTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 11 }}>
      <div style={{ color: "var(--text2)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{fmtS(payload[0].value)}원</div>
    </div>
  );
};

// ────────────────────────────────────────────────
// 메인 컴포넌트
// ────────────────────────────────────────────────
export function DataImportView({ plan, setPlan, onGoToPlan }) {
  const [stage, setStage]         = useState("idle");    // idle | mapping | result
  const [rawRows, setRawRows]     = useState([]);
  const [headers, setHeaders]     = useState([]);
  const [colMap, setColMap]       = useState({});
  const [txs, setTxs]             = useState([]);
  const [analysis, setAnalysis]   = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef();

  // ── 파일 파싱 ──
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if (rows.length < 2) { alert("데이터가 없는 파일이에요."); return; }

        // 헤더 찾기: 빈 행 건너뜀
        let headerRow = 0;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          if (rows[i].filter(Boolean).length >= 3) { headerRow = i; break; }
        }

        const hdrs = rows[headerRow].map(h => String(h || "").trim());
        const dataRows = rows.slice(headerRow + 1).filter(r => r.some(Boolean));
        const detected = detectCols(hdrs);

        setHeaders(hdrs);
        setRawRows(dataRows);
        setColMap(detected);
        setStage("mapping");
      } catch (err) {
        alert("파일을 읽을 수 없어요: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── 컬럼 매핑 확정 후 분석 실행 ──
  const runAnalysis = () => {
    const { dateIdx, amtIdx, merchantIdx, cancelIdx } = colMap;
    if (dateIdx < 0 || amtIdx < 0) {
      alert("날짜와 금액 컬럼을 선택해주세요."); return;
    }
    const parsed = rawRows
      .filter(r => {
        // 취소 거래 제외
        if (cancelIdx >= 0) {
          const v = String(r[cancelIdx] || "").trim();
          if (v === "취소" || v === "Y" || v === "1") return false;
        }
        return true;
      })
      .map(r => ({
        date:     parseDate(r[dateIdx]),
        amount:   parseAmt(r[amtIdx]),
        merchant: String(r[merchantIdx] ?? "기타").trim() || "기타",
        cat:      guessCat(r[merchantIdx]),
      }))
      .filter(t => t.date && t.amount > 0);

    if (parsed.length === 0) {
      alert("유효한 거래 데이터가 없어요. 컬럼 설정을 확인해주세요."); return;
    }

    const result = analyze(parsed);
    setTxs(parsed);
    setAnalysis(result);
    setStage("result");
  };

  // ── 재무계획에 반영 ──
  const applyToPlan = () => {
    if (!analysis) return;
    // 카테고리별 월 평균을 예산 추천으로 저장
    const monthCount = analysis.months.length || 1;
    const catBudgetSuggestions = {};
    Object.entries(analysis.byCat).forEach(([cat, total]) => {
      catBudgetSuggestions[cat] = Math.round(total / monthCount);
    });
    setPlan(p => ({
      ...p,
      importedAnalysis: {
        ...analysis,
        importedAt: new Date().toISOString(),
        catBudgetSuggestions,
      }
    }));
    onGoToPlan?.();
  };

  // ────────────────────────────────────────────────
  // RENDER: idle
  // ────────────────────────────────────────────────
  if (stage === "idle") return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "22px 0 14px" }}>
        <div style={{ fontSize: 11, color: "var(--text2)", letterSpacing: ".08em", marginBottom: 3 }}>Credit Card History</div>
        <div className="serif" style={{ fontSize: 21 }}>카드 데이터 불러오기</div>
      </div>

      {/* 안내 카드 */}
      <Card style={{ padding: "18px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 이런 분석을 해드려요</div>
        {[
          ["📅","연간 월별 지출 흐름","어느 달에 얼마나 썼는지 한눈에"],
          ["🗂","카테고리별 지출 분해","식비·교통·문화 비중을 파악"],
          ["🎯","재무계획 자동 제안","과거 데이터 기반으로 예산 초안 생성"],
          ["🏪","자주 쓰는 가맹점 TOP 8","지출 패턴과 절약 포인트 발견"],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 11, color: "var(--text2)" }}>{desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* 파일 내보내기 가이드 */}
      <Card style={{ padding: "16px", marginBottom: 14, background: "var(--goldD)", border: "1px solid var(--gold)" }}>
        <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, marginBottom: 8 }}>📋 파일 받는 방법</div>
        {[
          "KB국민카드 앱 → 이용내역 → 기간설정 → Excel 다운로드",
          "신한카드 앱 → 이용내역 조회 → 엑셀다운로드",
          "삼성카드 앱 → 이용내역 → 조회기간 설정 → 파일저장",
          "현대카드 앱 → 이용내역 → Excel 저장",
        ].map((g, i) => (
          <div key={i} style={{ fontSize: 11, color: "var(--text)", marginBottom: 5, paddingLeft: 4 }}>· {g}</div>
        ))}
        <div style={{ fontSize: 10, color: "var(--text2)", marginTop: 6 }}>CSV, Excel(.xlsx, .xls) 모두 지원해요</div>
      </Card>

      {/* 업로드 존 */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "var(--gold)" : "var(--border)"}`,
          borderRadius: 16, padding: "40px 20px",
          textAlign: "center", cursor: "pointer",
          background: dragOver ? "var(--goldD)" : "var(--bg2)",
          transition: "all .2s",
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>파일을 여기에 끌어다 놓거나 클릭해서 선택</div>
        <div style={{ fontSize: 11, color: "var(--text2)" }}>.xlsx · .xls · .csv 지원</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>

      {/* 기존 분석 있으면 표시 */}
      {plan.importedAnalysis && (
        <Card style={{ padding: "14px", marginTop: 14, border: "1px solid var(--green)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 700, marginBottom: 2 }}>✓ 이전 분석 데이터 있음</div>
              <div style={{ fontSize: 11, color: "var(--text2)" }}>
                {new Date(plan.importedAnalysis.importedAt).toLocaleDateString("ko-KR")} 업로드 · {fmtS(plan.importedAnalysis.total)}원 분석됨
              </div>
            </div>
            <button onClick={onGoToPlan} style={{
              padding: "8px 14px", borderRadius: 9, border: "1px solid var(--green)",
              background: "none", color: "var(--green)", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>계획 보기 →</button>
          </div>
        </Card>
      )}
    </div>
  );

  // ────────────────────────────────────────────────
  // RENDER: mapping
  // ────────────────────────────────────────────────
  if (stage === "mapping") {
    const ColSelect = ({ label, field }) => (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 5 }}>{label}</div>
        <select
          value={colMap[field]}
          onChange={e => setColMap(m => ({ ...m, [field]: parseInt(e.target.value) }))}
          style={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 9, padding: "9px 12px", color: "var(--text)", fontSize: 13, outline: "none" }}
        >
          <option value={-1}>— 해당 없음 —</option>
          {headers.map((h, i) => <option key={i} value={i}>{h || `(열 ${i+1})`}</option>)}
        </select>
      </div>
    );

    return (
      <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
        <div style={{ padding: "22px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="serif" style={{ fontSize: 21 }}>컬럼 확인</div>
          <button onClick={() => setStage("idle")} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}>← 다시</button>
        </div>

        <Card style={{ padding: "16px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 각 항목이 어느 열인지 확인해주세요</div>
          <ColSelect label="📅 날짜 열 *" field="dateIdx" />
          <ColSelect label="💰 금액 열 *" field="amtIdx" />
          <ColSelect label="🏪 가맹점명 열" field="merchantIdx" />
          <ColSelect label="🚫 취소 여부 열 (있다면)" field="cancelIdx" />
        </Card>

        {/* 데이터 미리보기 */}
        <Card style={{ padding: "14px", marginBottom: 14, overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 10 }}>■ 데이터 미리보기 (처음 5행)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} style={{
                      padding: "4px 8px", borderBottom: "1px solid var(--border)",
                      color: [colMap.dateIdx, colMap.amtIdx, colMap.merchantIdx].includes(i) ? "var(--gold)" : "var(--text2)",
                      fontWeight: [colMap.dateIdx, colMap.amtIdx, colMap.merchantIdx].includes(i) ? 700 : 400,
                      whiteSpace: "nowrap", textAlign: "left",
                    }}>{h || `열${i+1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, ri) => (
                  <tr key={ri}>
                    {headers.map((_, ci) => (
                      <td key={ci} style={{
                        padding: "4px 8px", borderBottom: "1px solid var(--border2)",
                        color: "var(--text)", whiteSpace: "nowrap",
                      }}>{String(row[ci] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <button onClick={runAnalysis} style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none",
          background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 15,
          cursor: "pointer", boxShadow: "0 6px 20px rgba(200,168,75,.3)",
        }}>
          분석 시작 ({rawRows.length.toLocaleString()}건)
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────
  // RENDER: result
  // ────────────────────────────────────────────────
  const monthlyChartData = analysis.months.map(ym => ({
    name: ym.slice(5) + "월",
    amount: analysis.byMonth[ym],
  }));

  const catChartData = CATS
    .map(c => ({ id: c.id, name: c.label, icon: c.icon, color: c.color, amount: analysis.byCat[c.id] || 0 }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div style={{ padding: "0 16px 96px", overflowY: "auto", height: "100%" }}>
      <div style={{ padding: "22px 0 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="serif" style={{ fontSize: 21 }}>분석 결과</div>
        <button onClick={() => setStage("idle")} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}>← 다시</button>
      </div>

      {/* 요약 숫자 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "총 지출", value: fmtS(analysis.total) + "원", color: "var(--text)" },
          { label: "월평균 지출", value: fmtS(analysis.avgMonthly) + "원", color: "var(--gold)" },
          { label: "거래 건수", value: analysis.count.toLocaleString() + "건", color: "var(--blue)" },
          { label: "분석 기간", value: analysis.months.length + "개월", color: "var(--green)" },
        ].map(s => (
          <Card key={s.label} style={{ padding: "14px" }}>
            <div style={{ fontSize: 10, color: "var(--text2)", marginBottom: 5 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* 월별 지출 바 차트 */}
      <Card style={{ padding: "16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 월별 지출 추이</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text3)" }} />
            <YAxis tick={{ fontSize: 9, fill: "var(--text3)" }} tickFormatter={v => fmtS(v)} />
            <Tooltip content={<KrTooltip />} />
            <Bar dataKey="amount" radius={[5,5,0,0]}>
              {monthlyChartData.map((_, i) => (
                <Cell key={i} fill={i === monthlyChartData.length - 1 ? "var(--gold)" : "#5c8de866"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* 카테고리별 지출 */}
      <Card style={{ padding: "16px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 14 }}>■ 카테고리별 지출 분석</div>
        {catChartData.map(c => {
          const pct = Math.round(c.amount / analysis.total * 100);
          const monthlyAvg = Math.round(c.amount / (analysis.months.length || 1));
          return (
            <div key={c.id} style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{c.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: "var(--text3)" }}>{pct}%</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{fmtS(c.amount)}원</span>
                  <span style={{ fontSize: 10, color: "var(--text2)", marginLeft: 5 }}>월평균 {fmtS(monthlyAvg)}원</span>
                </div>
              </div>
              <div style={{ height: 5, borderRadius: 3, background: "var(--bg3)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: c.color, borderRadius: 3, transition: "width .6s ease" }} />
              </div>
            </div>
          );
        })}
      </Card>

      {/* 자주 쓰는 가맹점 */}
      {analysis.topMerchants.length > 0 && (
        <Card style={{ padding: "16px", marginBottom: 14, overflow: "hidden" }}>
          <div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 12 }}>■ 자주 쓰는 곳 TOP {analysis.topMerchants.length}</div>
          {analysis.topMerchants.map(([name, amt], i) => {
            const cat = guessCat(name);
            const c = CAT[cat] || CAT.etc;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < analysis.topMerchants.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: 11, color: "var(--text3)", width: 16, flexShrink: 0 }}>{i+1}</span>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: c.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{c.icon}</div>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{fmtS(amt)}원</span>
              </div>
            );
          })}
        </Card>
      )}

      {/* 재무계획에 반영 버튼 */}
      <button onClick={applyToPlan} style={{
        width: "100%", padding: "16px", borderRadius: 14, border: "none",
        background: "var(--gold)", color: "#fff", fontWeight: 700, fontSize: 15,
        cursor: "pointer", boxShadow: "0 6px 20px rgba(200,168,75,.3)", marginBottom: 10,
      }}>
        🎯 이 데이터로 재무계획 수립하기
      </button>
      <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center" }}>
        카테고리별 월평균 지출이 예산 초안으로 자동 채워져요
      </div>
    </div>
  );
}
