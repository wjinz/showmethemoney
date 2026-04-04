# Budget-v2 UI/UX 리뉴얼 상세 계획서

> **작성일**: 2026년 4월 4일
> **기반**: 실제 소스코드 전수 분석 (src/ 전체)
> **목표**: 사용자가 가계부에 쉽게 접근하고, 지출 내역을 부담 없이 올릴 수 있는 경험

---

## 0. 현재 상태 진단 (코드 기반)

코드를 직접 읽으며 확인한 실제 UX 문제점들:

### 0-1. Nav.jsx — 죽어있는 코드와 누락된 메뉴

```jsx
// Nav.jsx 현재 상태 — sides 변수가 선언만 되고 쓰이지 않음
const sides = [  /* ... */  ];  // ← 사용 안 됨 (Dead code)
const newSides = [ /* ... */ ]; // ← 실제로 쓰이는 버전

// '고정비' 탭이 App.jsx에는 view="fixed"로 존재하지만
// Nav에서 라우팅하는 버튼이 없음 → 접근 불가
```

→ `fixed`(고정비) 뷰는 App.jsx에 렌더 로직이 있지만 Nav에 버튼이 없어 사실상 고아 뷰(orphan view)입니다.

### 0-2. EntryView와 InputModal의 중복

`EntryView.jsx`와 `InputModal.jsx`는 거의 동일한 UI를 구현하면서도 두 파일로 분리되어 있습니다:

| 기능 | EntryView | InputModal |
|---|---|---|
| 키패드 (`press` 함수) | ✅ | ✅ (동일 로직) |
| 카테고리 선택 그리드 | ✅ | ✅ (동일 레이아웃) |
| 결제 수단 선택 | ✅ `credit/debit/cash` | ✅ `credit/debit/cash` |
| OCR 카메라 버튼 | ✅ | ✅ |
| 메모 입력 | ✅ | ✅ |

`TxEditModal.jsx`까지 포함하면 **같은 키패드 코드가 3곳에** 존재합니다.

### 0-3. SyncBar가 항상 28px를 점유

```jsx
// App.jsx — SyncBar는 view에 관계없이 항상 최상단 고정
<SyncBar />
<div style={{ flex: 1, overflow: "hidden", marginTop: 28 }}>  // ← 28px 항상 손실
```

### 0-4. 하단 Nav에 공간 낭비

Nav 중앙의 FAB(✚ 입력 버튼)은 잘 만들어졌지만, 좌우 4개 버튼 중 `fixed`(고정비)가 빠져 있고 asset/settings가 중복으로 배치되어 있습니다.

### 0-5. 빠른 진입 동선 부재

홈 화면에서 지출을 추가하려면:
1. Nav 중앙 FAB 클릭 → `setView("entry")` → EntryView로 이동
2. **또는** HomeView 내 파트너 버튼 클릭 → `onAdd(who)` → InputModal 팝업

두 가지 경로가 있지만 동작이 다릅니다. FAB 클릭 시엔 전체 페이지 전환, 파트너 버튼은 모달. 사용자가 혼란스러울 수 있습니다.

---

## 1. 리뉴얼 방향

**핵심 원칙**: 지출 입력까지의 탭 수(tap count)를 줄이고, 이미 잘 만들어진 다크/라이트 테마 시스템을 최대한 활용한다.

```
현재: Nav FAB 클릭 → EntryView 페이지 이동 → 금액 입력 → 카테고리 → 저장
목표: 어디서든 FAB 클릭 → 바텀 시트 팝업 → 금액 입력 → 저장 (카테고리 자동 제안)
```

---

## 2. Phase 1: Navigation 구조 개편 [완료]

### 2-1. Nav.jsx 정리 및 고정비 복원

**현재 코드 문제**:
```jsx
// Nav.jsx - 현재 (dead code 포함)
const sides = [...];    // 사용 안 됨
const newSides = [...]; // 이게 실제 사용
// fixed 뷰 접근 불가
```

**변경안**:
```jsx
// Nav.jsx - 리뉴얼
export function Nav({ view, setView }) {
  const isEntry = view === "entry";

  const LEFT_ITEMS = [
    { id: "home",   icon: "⌂",  l: "홈" },
    { id: "report", icon: "◈",  l: "리포트" },
  ];
  const RIGHT_ITEMS = [
    { id: "fixed",    icon: "📌", l: "고정비" }, // ← 복원
    { id: "settings", icon: "⊙", l: "설정" },
  ];

  const NavBtn = ({ item }) => (
    <button
      key={item.id}
      onClick={() => setView(item.id)}
      style={{
        flex: 1, background: "none", border: "none", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "4px 0",
        color: view === item.id ? "var(--gold)" : "var(--text3)",
        transition: "color .2s",
      }}
    >
      <span style={{
        fontSize: 19, lineHeight: 1,
        // 활성 탭 아이콘에 미묘한 scale 강조
        display: "block",
        transform: view === item.id ? "scale(1.12)" : "scale(1)",
        transition: "transform .2s",
      }}>
        {item.icon}
      </span>
      <span style={{
        fontSize: 9,
        fontWeight: view === item.id ? 700 : 400,
        letterSpacing: ".03em",
      }}>
        {item.l}
      </span>
    </button>
  );

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 100,
    }}>
      {/* FAB */}
      <div style={{ position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)", zIndex: 101 }}>
        <button
          onClick={() => setView("entry")}
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: isEntry
              ? "linear-gradient(135deg,#e2c97e,#c8a84b)"
              : "linear-gradient(135deg,var(--gold),var(--goldL))",
            border: "3px solid var(--bg)",
            boxShadow: isEntry
              ? "0 0 0 4px rgba(200,168,75,.3), 0 6px 24px rgba(200,168,75,.5)"
              : "0 4px 20px rgba(200,168,75,.35)",
            cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 1,
            transition: "all .2s",
            transform: isEntry ? "scale(1.08)" : "scale(1)",
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1, color: "#fff", fontWeight: 700 }}>✚</span>
          <span style={{ fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: ".06em", lineHeight: 1 }}>
            입력
          </span>
        </button>
      </div>

      <div style={{
        background: "var(--nav-bg)", backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: "8px 0 14px",
      }}>
        {LEFT_ITEMS.map(item => <NavBtn key={item.id} item={item} />)}
        <div style={{ flex: 1 }} /> {/* FAB 공간 */}
        {RIGHT_ITEMS.map(item => <NavBtn key={item.id} item={item} />)}
      </div>
    </div>
  );
}
```

### 2-2. App.jsx에 자산(asset) 뷰를 Report 서브탭으로 흡수

`asset`은 자주 쓰는 기능이 아니므로, ReportView의 탭 중 하나로 이동하고 Nav 슬롯은 `fixed`에 양보합니다:

```jsx
// ReportView.jsx - 기존 탭 구조에 '자산' 탭 추가
const TABS = ["통계", "캘린더", "재무 계획", "세금", "자산"]; // ← '자산' 추가
```

```jsx
// App.jsx - asset view를 report에 포함
{view === "report" && (
  <ReportView
    {...existingProps}
    assets={assets}    // ← 추가
    setAssets={setAssets}
  />
)}
// asset view 별도 렌더 제거
```

---

## 3. Phase 2: 지출 입력 UX 대수술 — QuickEntry 바텀시트 [완료]

### 3-1. 핵심 변경: EntryView → QuickEntry 바텀시트 + 상세 입력 분리

현재 EntryView는 전체 페이지를 점유합니다. 리뉴얼 후에는:

- **QuickEntry 바텀시트**: 금액 + 카테고리만 (3초 내 완료 목표)
- **EntryView 상세**: "더 입력하기" 클릭 시 확장 (메모, 날짜, 카드 선택)

```jsx
// src/components/QuickEntrySheet.jsx (신규 파일)
import { useState, useCallback } from "react";
import { CATS, CAT } from "../constants";
import { Card } from "./UI";
import { toDateStr } from "../utils/helpers";

/**
 * QuickEntry 바텀시트
 * - 탭 수 최소화: 금액 키패드 → 카테고리 탭 → 저장
 * - "더 입력" 토글로 메모/날짜/카드 확장
 */
export function QuickEntrySheet({ names, plan, cards, onSave, onClose }) {
  const [who,       setWho]       = useState("husband");
  const [amount,    setAmount]    = useState("");
  const [cat,       setCat]       = useState("");
  const [memo,      setMemo]      = useState("");
  const [payMethod, setPayMethod] = useState("credit");
  const [date,      setDate]      = useState(toDateStr(new Date()));
  const [cardId,    setCardId]    = useState("");
  const [expanded,  setExpanded]  = useState(false); // 상세 입력 토글
  const [saved,     setSaved]     = useState(false);

  const press = useCallback((v) => {
    if (v === "C") setAmount("");
    else if (v === "⌫") setAmount(a => a.slice(0, -1));
    else if (amount.length < 9) setAmount(a => a + v);
  }, [amount.length]);

  const handleSave = () => {
    if (!amount || !cat) return;
    onSave({ who, amount: parseInt(amount), cat, memo, payMethod, date, cardId });
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  // 최근 자주 쓴 카테고리를 상단에 노출하는 스마트 정렬
  // (실제 구현 시 tx prop에서 useMemo로 빈도 계산)
  // ⚠️ 성능 주의: 전체 tx 순회 대신 최근 2개월 슬라이스 or localStorage 캐싱 방식 선택
  const SORTED_CATS = CATS; // TODO: 빈도순 정렬

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--bg2)",
          borderRadius: "24px 24px 0 0",
          border: "1px solid var(--border)",
          padding: "20px 20px 40px",
          animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",
          maxHeight: "92dvh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 핸들 바 */}
        <div style={{
          width: 40, height: 5,
          background: "var(--border2)", borderRadius: 99,
          margin: "0 auto 20px",
        }} />

        {/* 헤더 */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16,
        }}>
          <div className="serif" style={{ fontSize: 20 }}>
            {saved ? "✓ 저장됨" : "지출 입력"}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              fontSize: 20, color: "var(--text3)", cursor: "pointer",
            }}
          >✕</button>
        </div>

        {/* 사용자 선택 (커플 모드만) */}
        {!plan?.isSolo && (
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {["husband", "wife"].map(r => (
              <button
                key={r}
                onClick={() => setWho(r)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12,
                  cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: who === r
                    ? (r === "husband" ? "var(--hD)" : "var(--wD)")
                    : "var(--bg3)",
                  border: `1px solid ${who === r
                    ? (r === "husband" ? "var(--h)" : "var(--w)")
                    : "var(--border)"}`,
                  color: who === r
                    ? (r === "husband" ? "var(--h)" : "var(--w)")
                    : "var(--text2)",
                  transition: "all .15s",
                }}
              >
                {r === "husband" ? names.husband : names.wife}
              </button>
            ))}
          </div>
        )}

        {/* 금액 표시 + 키패드 */}
        <div style={{
          background: "var(--bg3)", borderRadius: 18,
          padding: "18px", marginBottom: 16,
          border: "1px solid var(--border2)",
        }}>
          {/* 금액 표시 */}
          <div style={{
            display: "flex", justifyContent: "flex-end",
            alignItems: "baseline", marginBottom: 14, gap: 4,
          }}>
            <span style={{
              fontSize: 36, fontWeight: 800,
              color: amount ? "var(--text)" : "var(--text3)",
              letterSpacing: "-.02em", lineHeight: 1,
            }}>
              {amount ? parseInt(amount).toLocaleString() : "0"}
            </span>
            <span style={{ fontSize: 16, color: "var(--text2)", fontWeight: 400 }}>원</span>
          </div>

          {/* 숫자 키패드 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
            {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v => (
              <button
                key={v}
                onClick={() => press(String(v))}
                style={{
                  height: 52, borderRadius: 13,
                  border: "1px solid var(--border)",
                  background: v === "C"
                    ? "rgba(217,95,95,0.08)"
                    : v === "⌫"
                    ? "rgba(200,168,75,0.08)"
                    : "var(--bg2)",
                  fontSize: 19, fontWeight: 700, cursor: "pointer",
                  color: v === "C" ? "var(--red)"
                    : v === "⌫" ? "var(--gold)"
                    : "var(--text)",
                  transition: "background .1s",
                  // 터치 피드백
                  WebkitTapHighlightColor: "transparent",
                  active: { transform: "scale(0.96)" },
                }}
              >{v}</button>
            ))}
          </div>

          {/* 빠른 금액 버튼 (신규) */}
          <div style={{
            display: "flex", gap: 6, marginTop: 10, overflowX: "auto",
            paddingBottom: 2,
          }}>
            {[10000, 30000, 50000, 100000].map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(String(amount ? parseInt(amount) + amt : amt))}
                style={{
                  flexShrink: 0, padding: "5px 12px",
                  borderRadius: 99, fontSize: 11, fontWeight: 700,
                  background: "var(--goldD)",
                  border: "1px solid rgba(200,168,75,0.3)",
                  color: "var(--gold)", cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >+{(amt / 10000).toFixed(0)}만</button>
            ))}
          </div>
        </div>

        {/* 카테고리 (3×3 그리드) */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3,1fr)",
          gap: 7, marginBottom: 14,
        }}>
          {SORTED_CATS.map(c => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: 5, padding: "12px 0",
                borderRadius: 14, cursor: "pointer",
                background: cat === c.id ? c.color + "22" : "var(--bg3)",
                border: `1px solid ${cat === c.id ? c.color : "var(--border)"}`,
                color: cat === c.id ? c.color : "var(--text2)",
                transition: "all .15s ease",
                transform: cat === c.id ? "scale(1.02)" : "scale(1)",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <span style={{
                fontSize: 11,
                fontWeight: cat === c.id ? 700 : 400,
              }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* 더 입력하기 토글 */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            width: "100%", background: "var(--bg3)",
            border: "1px solid var(--border)", borderRadius: 12,
            padding: "10px", fontSize: 12, color: "var(--text2)",
            cursor: "pointer", marginBottom: 12,
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}
        >
          <span>📝</span>
          <span>{expanded ? "▲ 닫기" : "메모 · 날짜 · 카드 추가"}</span>
        </button>

        {/* 확장 영역 */}
        {expanded && (
          <div style={{ marginBottom: 14, animation: "fadeIn 0.2s ease" }}>
            {/* 날짜 */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg3)", borderRadius: 12,
              padding: "10px 14px", marginBottom: 8,
              border: "1px solid var(--border)",
            }}>
              <span>📅</span>
              <input
                type="date" value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  background: "none", border: "none",
                  color: "var(--text)", fontSize: 14,
                  outline: "none", flex: 1, colorScheme: "dark",
                }}
              />
            </div>

            {/* 메모 */}
            <div style={{
              background: "var(--bg3)", borderRadius: 12,
              padding: "4px 14px", marginBottom: 8,
              border: "1px solid var(--border)",
            }}>
              <input
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="메모 입력 (선택)"
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "var(--text)", fontSize: 14,
                  padding: "12px 0", outline: "none",
                }}
              />
            </div>

            {/* 결제 수단 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[
                { id: "credit", l: "신용", i: "💳" },
                { id: "debit",  l: "체크", i: "🏦" },
                { id: "cash",   l: "현금", i: "💵" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPayMethod(m.id)}
                  style={{
                    flex: 1, padding: "9px", borderRadius: 11,
                    cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: payMethod === m.id ? "var(--goldD)" : "var(--bg3)",
                    border: `1px solid ${payMethod === m.id ? "var(--gold)" : "var(--border)"}`,
                    color: payMethod === m.id ? "var(--gold)" : "var(--text2)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 5,
                  }}
                ><span>{m.i}</span>{m.l}</button>
              ))}
            </div>

            {/* 카드 선택 */}
            {cards.length > 0 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {cards.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setCardId(cardId === c.id ? "" : c.id)}
                    style={{
                      flexShrink: 0, padding: "6px 12px",
                      borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: cardId === c.id ? c.color : "var(--bg3)",
                      color: cardId === c.id ? "#fff" : "var(--text3)",
                      border: `1px solid ${cardId === c.id ? c.color : "var(--border)"}`,
                    }}
                  >{c.icon} {c.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={!amount || !cat || saved}
          style={{
            width: "100%", padding: "17px",
            borderRadius: 16, border: "none",
            fontSize: 16, fontWeight: 700,
            cursor: (!amount || !cat) ? "default" : "pointer",
            background: saved
              ? "var(--greenD)"
              : (!amount || !cat)
              ? "var(--bg3)"
              : "var(--gold)",
            color: saved
              ? "var(--green)"
              : (!amount || !cat)
              ? "var(--text3)"
              : "#fff",
            border: saved
              ? "1px solid var(--green)"
              : "none",
            boxShadow: (!amount || !cat) || saved
              ? "none"
              : "0 8px 28px rgba(200,168,75,.35)",
            transition: "all .2s ease",
          }}
        >
          {saved
            ? "✓ 저장 완료"
            : (!amount || !cat)
            ? "금액과 카테고리를 선택해주세요"
            : `${parseInt(amount).toLocaleString()}원 저장하기`}
        </button>
      </div>
    </div>
  );
}
```

> **💡 구현 노트 — 카테고리 빈도 정렬 성능**
> `SORTED_CATS`를 실제 빈도순으로 구현할 때 전체 `tx` 배열을 매번 순회하면 비효율적입니다. 두 가지 접근 중 하나를 선택합니다:
> - **슬라이딩 윈도우**: `tx`에서 최근 1~2개월분만 `filter`로 잘라내고 `useMemo` 적용 — 데이터 신선도 유지
> - **localStorage 캐싱**: 카테고리 선택 시 `catFreq` 객체를 `localStorage`에 누적 — tx 크기와 무관하게 O(1) 조회
>
> 현재 앱이 이미 `offlineQueue.js`에서 localStorage를 적극 활용하므로, 후자가 기존 패턴과 일관성이 높습니다.

### 3-2. App.jsx 연결

```jsx
// App.jsx - FAB이 이제 EntryView 페이지 이동 대신 바텀시트를 띄움

// 기존:
{view === "entry" && <EntryView ... />}

// 변경:
// entry view는 상세 내역 조회/편집 전용으로 유지하되
// FAB 클릭 → QuickEntrySheet 팝업 (view 전환 없이)

const [showQuickEntry, setShowQuickEntry] = useState(false);

// Nav의 FAB onClick 변경:
// setView("entry") → setShowQuickEntry(true)
```

### 3-3. NumPad 공통 컴포넌트 추출 (중복 제거)

현재 `EntryView`, `InputModal`, `TxEditModal` 세 곳에 동일한 키패드 코드가 존재합니다.

```jsx
// src/components/NumPad.jsx (기존 파일 활용 또는 새로 작성)
export function NumPad({ value, onChange }) {
  const press = (v) => {
    if (v === "C") onChange("");
    else if (v === "⌫") onChange(value.slice(0, -1));
    else if (value.length < 9) onChange(value + v);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
      {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v => (
        <button
          key={v}
          onClick={() => press(String(v))}
          style={{
            height: 52, borderRadius: 13,
            border: "1px solid var(--border)",
            background: v === "C"
              ? "rgba(217,95,95,0.08)"
              : v === "⌫"
              ? "rgba(200,168,75,0.08)"
              : "var(--bg2)",
            fontSize: 19, fontWeight: 700, cursor: "pointer",
            color: v === "C" ? "var(--red)"
              : v === "⌫" ? "var(--gold)"
              : "var(--text)",
          }}
        >{v}</button>
      ))}
    </div>
  );
}
```

이후 `EntryView`, `InputModal`, `TxEditModal` 모두에서:
```jsx
// Before (각 파일마다 동일한 press 함수 + 그리드)
const press = (v) => { ... };
<div style={{display:"grid",...}}>
  {[1,2,3,...].map(v => <button ...>{v}</button>)}
</div>

// After
import { NumPad } from "../components/NumPad";
<NumPad value={amount} onChange={setAmount} />
```

---

## 4. Phase 3: SyncBar 개편 — 비침습적 상태 표시 [완료]

### 4-1. 문제

현재 SyncBar는 항상 28px를 소비하고, `householdId`(예: `AB12CD`)를 노출해 기술적 느낌을 줍니다.

### 4-2. 변경안: 상태별 조건부 표시

```jsx
// App.jsx - SyncBar 리뉴얼

const SyncBar = () => {
  // ok 상태일 때는 바를 숨기고 Nav에 작은 점으로 표시
  if (syncStatus === "ok") return null;  // ← 평상시 사라짐

  return (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 200,
      display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
      padding: "8px 14px",
      background: syncStatus === "error"
        ? "var(--redD)"
        : "rgba(200,168,75,0.12)",  // syncing: 골드 반투명
      borderBottom: `1px solid ${
        syncStatus === "error"
          ? "rgba(170,32,32,.3)"
          : "rgba(200,168,75,.2)"
      }`,
      fontSize: 11,
      color: syncStatus === "error" ? "var(--red)" : "var(--gold)",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
        background: syncStatus === "syncing" ? "var(--gold)" : "var(--red)",
        animation: syncStatus === "syncing" ? "pulse 1s infinite" : "none",
      }} />
      <span>
        {syncStatus === "error"
          ? "⚡ 오프라인 · 연결 복구 시 자동 저장"
          : "↑ 동기화 중..."}
      </span>
    </div>
  );
};

// marginTop도 조건부로
// marginTop에 transition 적용 — Layout Shift 방지 핵심
<div style={{
  flex: 1, overflow: "hidden",
  marginTop: syncStatus !== "ok" ? 28 : 0,
  transition: "margin-top 0.3s ease",
}}>
```

> **💡 구현 노트 — Layout Shift 및 완료 피드백**
> SyncBar가 사라질 때 `marginTop`을 즉시 0으로 전환하면 콘텐츠 전체가 위로 점프하는 Layout Shift가 발생합니다. 위 코드처럼 `transition: margin-top 0.3s ease`를 적용해 부드럽게 올라가도록 처리합니다.
> 추가로, `syncStatus`가 `ok`로 전환되는 순간 Phase 7의 Toast 시스템을 통해 "☁ 동기화 완료"를 1.5초간 노출 후 페이드아웃하면 사용자가 저장 완결을 더 명확히 인지할 수 있습니다. `ofllineQueue` flush 성공 시에도 동일한 Toast를 활용합니다.

### 4-3. Nav에 동기화 상태 도트 추가

```jsx
// Nav.jsx - 우상단에 작은 상태 도트

// Nav 컨테이너에 syncStatus prop 추가
export function Nav({ view, setView, syncStatus }) {
  // ...
  // settings 버튼 상단에 도트 오버레이
  return (
    // ...
    <div style={{ position: "relative" }}>
      <NavBtn item={{ id: "settings", icon: "⊙", l: "설정" }} />
      {syncStatus !== "ok" && (
        <div style={{
          position: "absolute", top: 2, right: "calc(50% - 14px)",
          width: 7, height: 7, borderRadius: "50%",
          background: syncStatus === "error" ? "var(--red)" : "var(--gold)",
          border: "1.5px solid var(--bg)",
        }} />
      )}
    </div>
  );
}
```

---

## 5. Phase 4: HomeView 스트림라인 [완료]

### 5-1. 홈 상단 헤더 — 날짜와 요약을 더 임팩트 있게

```jsx
// HomeView.jsx - 헤더 리뉴얼

// 현재: 텍스트만
<div style={{padding:"22px 0 14px",...}}>
  <div style={{fontSize:11,...}}>{YEAR}년 {MONTH}월 · {DAY}일차</div>
  <div className="serif" style={{fontSize:21}}>가정 경영현황</div>
</div>

// 변경: 잔여 예산을 헤더에 즉시 노출
<div style={{
  padding: "18px 0 12px",
  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
}}>
  <div>
    <div style={{fontSize:11,color:"var(--text2)",letterSpacing:".08em",marginBottom:3}}>
      {YEAR}년 {MONTH}월 · 오늘 {DAY}일 · {daysLeft}일 남음
    </div>
    <div className="serif" style={{fontSize:22}}>
      {plan?.isSolo ? "이번달 현황" : "가정 경영현황"}
    </div>
    {/* 잔여 예산 한 줄 요약 — 홈에서 바로 확인 */}
    <div style={{
      fontSize: 13, marginTop: 5, fontWeight: 600,
      color: remaining >= 0 ? "var(--green)" : "var(--red)",
    }}>
      {remaining >= 0
        ? `잔여 ${fmtS(remaining)}원`
        : `예산 ${fmtS(Math.abs(remaining))}원 초과`}
    </div>
  </div>
  <button
    onClick={onWidget}
    style={{
      background: paceColor + "22", color: paceColor,
      fontSize: 11, fontWeight: 700, padding: "5px 11px",
      borderRadius: 99, border: `1px solid ${paceColor}44`, cursor: "pointer",
    }}
  >
    PACE {paceStatus} ↗
  </button>
</div>
```

### 5-2. 홈 하단 최근내역 — 스와이프로 삭제 힌트

현재 최근 내역 리스트는 클릭 시 아무 반응이 없습니다 (HomeView에서는 edit 콜백이 없음). 탭 시 바텀시트로 수정 가능하도록 연결:

```jsx
// HomeView.jsx - 최근 내역 아이템에 onEdit 연결
// App.jsx에서 HomeView에 onEdit, onDelete를 prop으로 전달 필요

// App.jsx
{view === "home" && (
  <HomeView
    {...existingProps}
    onEdit={editTx}    // ← 추가
    onDelete={deleteTx} // ← 추가
  />
)}

// HomeView.jsx - 내역 아이템
return displayList.map(t => {
  const c = CAT[t.cat] || CATS[8];
  return (
    <div
      key={t.id}
      onClick={() => setEditingTx(t)}  // ← 클릭 시 수정 모달
      style={{
        padding: "9px 14px", borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 10,
        cursor: "pointer", transition: "background .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* ... 기존 내용 ... */}
      <span style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>✎</span>
    </div>
  );
});

// 수정 모달 (HomeView에 TxEditModal import 추가)
{editingTx && (
  <TxEditModal
    tx={editingTx}
    names={names}
    cards={[]}
    onClose={() => setEditingTx(null)}
    onEdit={(id, updates) => { onEdit(id, updates); setEditingTx(null); }}
    onDelete={(id) => { onDelete(id); setEditingTx(null); }}
  />
)}
```

---

## 6. Phase 5: 온보딩 (SyncSetup) 개선 [완료]

### 6-1. 현재 문제

- 로고가 💰 이모지 하나 — 앱 정체성 약함
- "남편"/"와이프" 역할 선택이 첫 화면에 나옴 — 뜬금없음
- 에러 메시지가 작고 눈에 잘 안 띔

### 6-2. 개선안: 단계별 온보딩

```jsx
// SyncSetup.jsx - 스텝 기반 온보딩으로 변경

export function SyncSetup({ onDone }) {
  const [step, setStep] = useState(0); // 0: 모드 선택, 1: 역할/코드, 2: 완료
  const [tab,  setTab]  = useState("create");
  const [mode, setMode] = useState("couple");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("husband");
  const [err,  setErr]  = useState("");
  const [busy, setBusy] = useState(false);

  // Step 0: 환영 + 모드 선택
  if (step === 0) {
    return (
      <div style={{
        height: "100dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px", maxWidth: 480, margin: "0 auto",
      }}>
        {/* 브랜드 로고 영역 */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "linear-gradient(135deg, var(--goldD), rgba(200,168,75,0.05))",
            border: "1px solid rgba(200,168,75,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 40, margin: "0 auto 16px",
          }}>💰</div>
          <div className="serif" style={{ fontSize: 28, marginBottom: 8 }}>
            가정 경영 가계부
          </div>
          <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
            부부의 지출을 함께 기록하고<br/>
            재무 목표를 실현해보세요
          </div>
        </div>

        {/* 모드 선택 카드 */}
        <div style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              id: "couple",
              icon: "👥",
              title: "부부가 함께",
              desc: "두 기기에서 실시간 동기화",
              tab: "create",
            },
            {
              id: "solo",
              icon: "👤",
              title: "나 혼자 관리",
              desc: "개인 가계부로 시작하기",
              tab: "create",
            },
            {
              id: "join",
              icon: "🔗",
              title: "코드로 참여",
              desc: "파트너가 만든 가계부에 연결",
              tab: "join",
            },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => {
                setMode(opt.id === "solo" ? "solo" : "couple");
                setTab(opt.tab);
                setStep(1);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "18px 20px", borderRadius: 16, cursor: "pointer",
                background: "var(--bg2)", border: "1px solid var(--border)",
                textAlign: "left", transition: "all .2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--gold)";
                e.currentTarget.style.background = "var(--goldD)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.background = "var(--bg2)";
              }}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: "var(--text2)" }}>{opt.desc}</div>
              </div>
              <span style={{ marginLeft: "auto", color: "var(--text3)", fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 1: 기존 역할 선택 + 코드 입력 UI (유지)
  // ... 기존 SyncSetup 내용과 동일하되 뒤로가기 버튼 추가
  return (
    <div style={{ /* 기존 스타일 */ }}>
      {/* 뒤로가기 */}
      <button
        onClick={() => setStep(0)}
        style={{
          position: "absolute", top: 24, left: 24,
          background: "none", border: "none",
          color: "var(--text2)", fontSize: 24, cursor: "pointer",
        }}
      >←</button>
      {/* 기존 폼 내용 */}
    </div>
  );
}
```

### 6-3. 추후 확장: Solo → Couple 전환 UX (SettingsView 연계)

Solo 모드로 시작한 사용자가 나중에 파트너를 초대하고 싶을 때를 대비해, `SettingsView`에 "커플 모드로 전환" 옵션을 추가합니다. `plan.isSolo` 플래그를 `false`로 전환하고 기존 `householdId`를 공유 코드로 노출하면 됩니다. 기존 데이터를 마이그레이션할 필요 없이 플래그 하나로 확장 가능합니다.

```jsx
// SettingsView.jsx - Solo → Couple 전환 버튼 추가
{plan?.isSolo && (
  <button
    onClick={() => setPlan(p => ({ ...p, isSolo: false }))}
    style={{ /* 골드 스타일 버튼 */ }}
  >
    👥 파트너 초대 — 커플 모드로 전환
  </button>
)}
// 전환 후 householdId를 공유하면 파트너가 "코드로 참여" 탭에서 바로 합류 가능
```

---

## 7. Phase 6: 디자인 시스템 — THEME_TOKENS 확장 적용 [완료]

`tokens.js`의 `THEME_TOKENS`가 이미 정의되어 있지만 실제로 컴포넌트에서 거의 사용되지 않고 있습니다. 신규 컴포넌트부터 적용합니다.

### 7-1. 토큰 확장

```js
// src/styles/tokens.js - 확장
export const THEME_TOKENS = {
  // 기존 유지...
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius:  { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
  shadow: {
    sm: "0 1px 4px rgba(0,0,0,0.08)",
    md: "0 4px 12px rgba(0,0,0,0.12)",
    lg: "0 8px 24px rgba(0,0,0,0.16)",
    gold: "0 8px 28px rgba(200,168,75,.35)",  // ← 추가: 골드 그림자
  },
  color: {
    // 기존 유지...
    // 추가:
    husband:    "var(--h)",
    husbandDim: "var(--hD)",
    wife:       "var(--w)",
    wifeDim:    "var(--wD)",
  },

  // 추가: 반복 사용 컴포넌트 스타일 프리셋
  preset: {
    // 바텀시트 공통 헤더 핸들
    sheetHandle: {
      width: 40, height: 5,
      background: "var(--border2)",
      borderRadius: 9999,
      margin: "0 auto 20px",
    },
    // 카테고리 버튼 (비활성)
    catBtn: {
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 5, padding: "12px 0",
      borderRadius: 14, cursor: "pointer",
      background: "var(--bg3)",
      border: "1px solid var(--border)",
      color: "var(--text2)",
      transition: "all .15s ease",
    },
    // 저장 버튼 (활성)
    saveBtn: {
      borderRadius: 16, border: "none",
      fontSize: 16, fontWeight: 700,
      background: "var(--gold)",
      color: "#fff",
      boxShadow: "0 8px 28px rgba(200,168,75,.35)",
      cursor: "pointer",
    },
  },
};
```

### 7-2. 전환 전략

1단계 (즉시): 신규 `QuickEntrySheet` 컴포넌트에 `THEME_TOKENS` 우선 적용
2단계 (단기): `InputModal`, `TxEditModal` 리팩터링 시 토큰 사용
3단계 (중기): View 파일 점진적 전환 (HomeView → EntryView → SettingsView 순)

---

## 8. Phase 7: Toast 알림 시스템 (선택 구현) [완료]

현재 저장 성공/실패 피드백이 일부 인라인 상태 변수로 처리됩니다. 토스트 시스템으로 통일하면 UX가 일관됩니다.

```jsx
// src/components/Toast.jsx (신규)
import { useState, useCallback } from "react";

// 전역 토스트 훅
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((msg, type = "success", duration = 2200) => {
    const id = Date.now();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => {
      setToasts(ts => ts.filter(t => t.id !== id));
    }, duration);
  }, []);

  return { toasts, show };
}

// Toast 렌더러 (App.jsx 최상단에 추가)
export function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 32px)", maxWidth: 448, zIndex: 2000,
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "12px 16px", borderRadius: 14, fontSize: 13, fontWeight: 600,
          background: t.type === "error" ? "var(--redD)" : "rgba(77,171,135,0.15)",
          border: `1px solid ${t.type === "error" ? "rgba(217,95,95,.4)" : "rgba(77,171,135,.4)"}`,
          color: t.type === "error" ? "var(--red)" : "var(--green)",
          backdropFilter: "blur(10px)",
          animation: "fadeIn 0.2s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{t.type === "error" ? "⚡" : "✓"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
```

```jsx
// App.jsx - 토스트 연결
const { toasts, show: showToast } = useToast();

const addTx = useCallback(t => {
  setTx(ts => [...ts, { ...t, id: Date.now() }]);
  showToast(`${t.memo || CAT[t.cat]?.label || "지출"} · ${t.amount.toLocaleString()}원 저장`);
}, [setTx, showToast]);

// JSX에 추가
<ToastContainer toasts={toasts} />
```

### 8-2. offlineQueue flush 완료 시 Toast 연계

Toast 시스템은 `offlineQueue.js`의 비동기 flush와 결합할 때 효과가 극대화됩니다. 네트워크가 복구되어 `flushOfflineQueue()`가 성공하면 Toast로 사용자에게 알려줍니다:

```jsx
// App.jsx - handleOnline 내부에 Toast 연결
const handleOnline = async () => {
  if (!hasQueued()) return;
  setSyncStatus("syncing");
  const count = await flushOfflineQueue(db, householdId);
  if (count > 0) {
    setSyncStatus("ok");
    showToast(`☁ 오프라인 내역 ${count}건 동기화 완료`); // ← Toast 추가
    await loadShared(householdId);
  } else {
    setSyncStatus("error");
    showToast("동기화 중 오류가 발생했습니다", "error");
  }
};
```

---

## 9. 구현 우선순위 로드맵

| 순위 | Phase | 파일 | 예상 공수 | 임팩트 |
|---|---|---|---|---|
| ★★★ | Phase 1 | `Nav.jsx` | 0.5일 | 고정비 복원, Dead code 제거 |
| ★★★ | Phase 2 | `QuickEntrySheet.jsx` (신규) | 1.5일 | 입력 UX 핵심 개선 |
| ★★★ | Phase 3 | `App.jsx` SyncBar | 0.5일 | 화면 공간 확보 |
| ★★☆ | Phase 4 | `HomeView.jsx` | 1일 | 홈 가독성 향상 |
| ★★☆ | Phase 2 | `NumPad.jsx` 추출 | 0.5일 | 코드 중복 제거 |
| ★★☆ | Phase 5 | `SyncSetup.jsx` | 1일 | 온보딩 개선 |
| ★☆☆ | Phase 6 | `tokens.js` 확장 | 지속 | 유지보수성 향상 |
| ★☆☆ | Phase 7 | `Toast.jsx` (신규) | 0.5일 | 피드백 일관성 |

---

## 10. 기존 버그 수정 (research 문서 기반)

리뉴얼과 함께 처리해야 할 기존 버그:

### 10-1. 카드 필드명 혼재 (`name` vs `label`)

```jsx
// CardView.jsx - 저장 시
const newCard = { id: Date.now(), name: cardName, ... };  // ← 'name'으로 저장

// EntryView.jsx - 렌더 시
{cards.map(c => <button ...>{c.icon} {c.label}</button>)}  // ← 'label'로 읽음
// → c.label이 undefined — 카드 이름 안 보임

// 수정: 저장 시 'label'로 통일 (또는 읽을 때 c.label ?? c.name)
const newCard = { id: Date.now(), label: cardName, ... };
```

UI에서 `c.label ?? c.name` 폴백으로 방어하는 것은 임시방편입니다. 가장 안전한 근본 해결책은 `App.jsx`의 `loadShared` 안에서 로드 시점에 일회성 런타임 마이그레이션을 실행하는 것입니다:

```jsx
// App.jsx - loadShared 내부, cards 로드 직후 추가
if (allData.cards) {
  // 'name' → 'label' 필드명 통일 (일회성 마이그레이션)
  const normalizedCards = allData.cards.map(c =>
    c.label ? c : { ...c, label: c.name }
  );
  setCardsRaw(normalizedCards);
  // 변경이 있을 때만 Supabase에 다시 저장하여 스키마 영구 정합
  if (normalizedCards.some(c => !c.label)) {
    await db.save(hid, "cards", normalizedCards);
  }
}
```

이 방식은 기존 tx 마이그레이션(`tx_YYYY` 분리, `plan.salary` 이관)과 동일한 패턴으로 코드베이스 일관성도 높습니다.

### 10-2. 할부 개월 필드 (`month` vs `months`)

```js
// EMPTY_INSTALL 저장 구조
{ id, name, total, month: 12, monthly: 300000, paidMonths: 0 }
//                  ^^^^ 'month'

// FixedView 등에서 읽을 때 'months'로 접근하면 undefined
// 수정: constants/index.js에서 필드명 통일
export const EMPTY_INSTALL = [];
// 새 항목 추가 시 'months'로 통일:
const newInstall = { id: Date.now(), name, total, months, monthly, paidMonths: 0 };
```

---

## 11. 요약

이 계획서는 실제 소스코드를 기반으로 작성된 실행 가능한 UI/UX 리뉴얼 로드맵입니다. 핵심은 세 가지입니다:

1. **지출 입력 속도**: FAB → QuickEntrySheet 바텀시트로 전환하여 "금액 + 카테고리 2탭"으로 완료
2. **화면 공간 최적화**: SyncBar 조건부 표시, 고정비 탭 복원, 자산을 Report 서브탭으로 이동
3. **코드 품질**: 3곳에 중복된 키패드를 NumPad 컴포넌트로 추출, THEME_TOKENS 실제 적용

모든 변경은 기존 아키텍처(BudgetContext, setShared, Supabase 동기화)를 건드리지 않고 UI 레이어에서만 진행되므로 데이터 정합성에 영향 없이 안전하게 구현할 수 있습니다.
