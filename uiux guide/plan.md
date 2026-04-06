# 지능형 공유 가계부 — 통합 구현 플랜

> **목적**: `uiux guide/` 목업의 디자인 시스템을 실제 앱(`/src/`)에 적용하는 계획서  
> **소스 기반**: 두 코드베이스를 직접 읽고 작성 (2026-04-06)

---

## 0. 두 코드베이스 현황 비교

### 실제 앱 (`/src/`) — 기능은 완성, 디자인 미흡
| 항목 | 상태 |
|------|------|
| Supabase DB 연동 | ✅ 완전 구현 (household_data, transactions, sos_requests) |
| 실시간 동기화 (배우자) | ✅ Supabase Realtime 채널 |
| Gemini AI 영수증 스캔 | ✅ `/api/ocr.js` 서버리스 함수 |
| Gemini AI 예산 자동배분 | ✅ `/api/budget-ai.js` |
| SOS 시스템 | ✅ DB 트리거 포함 완전 구현 |
| 오프라인 동기화 | ✅ offlineQueue.js |
| PWA | ✅ manifest + service worker |
| 18개 뷰 | ✅ 완성 |
| **디자인 시스템 일관성** | ⚠️ CSS-in-JS + 인라인 스타일 혼재 |
| **Toss-스타일 헤더 계층** | ❌ 없음 |
| **PIN 잠금 UI** | ❌ 없음 |
| **스프링 애니메이션 바텀시트** | ⚠️ 일부만 적용 |
| **프리미엄 블랙카드 대시보드** | ❌ 없음 |
| **AI 코치 말풍선** | ❌ 없음 (nudge API는 있음) |

### UIUX Guide (`/uiux guide/`) — 디자인은 완성, 데이터는 목업
| 항목 | 상태 |
|------|------|
| CSS 변수 테마 시스템 | ✅ `--theme-*` 7개 변수 |
| Toss-스타일 헤더 | ✅ `HomeView.tsx:29-34` |
| 예산 링 SVG 애니메이션 | ✅ `HomeView.tsx:46-61` |
| AI 코치 말풍선 | ✅ `HomeView.tsx:65-78` |
| SOS 티켓 카드 | ✅ `HomeView.tsx:80-108` |
| PIN 잠금 UI | ✅ `PrivateView.tsx:26-58` |
| 프리미엄 블랙카드 | ✅ `PrivateView.tsx:77-90` |
| 스프링 바텀시트 | ✅ `ActionSheets.tsx:17-21` |
| **실제 데이터** | ❌ 하드코딩 |
| **Supabase 연동** | ❌ 없음 |
| **18개 뷰** | ❌ 2개 뷰만 존재 |

---

## 1. 핵심 전략: 디자인 이식 (Data Migration이 아님)

> **"기능 로직은 건드리지 않고, UI 레이어만 교체한다"**

실제 앱의 Supabase 연동, 비즈니스 로직, 상태 관리는 그대로 유지.  
UIUX 가이드의 **CSS 변수 시스템, 컴포넌트 패턴, 애니메이션**을 실제 앱에 이식.

### 이식 우선순위 맵

| UIUX Guide 컴포넌트 | 실제 앱 대응 파일 | 작업 유형 |
|---------------------|-------------------|-----------|
| `index.css` `--theme-*` | `styles/theme.css` `--bg`, `--gold` 등 | 변수명 정렬 |
| `BottomNav.tsx` | `components/Nav.jsx` | 리디자인 |
| `HomeView.tsx` header | `views/HomeView.jsx:8-78` | 상단부 교체 |
| `HomeView.tsx` AI bubble | `views/HomeView.jsx` + nudge API | 새 섹션 추가 |
| `HomeView.tsx` SOS ticket | `views/HomeView.jsx` + SosPendingSheet | 카드 스타일 적용 |
| `PrivateView.tsx` PIN lock | `views/PrivateWalletView.jsx` | PIN 화면 추가 |
| `PrivateView.tsx` 블랙카드 | `views/PrivateWalletView.jsx` | 대시보드 카드 교체 |
| `ActionSheets.tsx` spring | `components/QuickEntrySheet.jsx` 등 | 애니메이션 적용 |

---

## 2. 디자인 시스템 정렬

### 2.1 CSS 변수 매핑

실제 앱 `theme.css`와 UIUX 가이드 `index.css`의 변수명이 다름. 실제 앱 변수명을 유지하면서 값을 확인/통일.

```css
/* 실제 앱 theme.css — 현재 */
.app-root[data-theme="joint"] {
  --bg:    #F4F6F8;   /* = uiux --theme-bg */
  --bg2:   #FFFFFF;   /* = uiux --theme-surface */
  --text:  #1C2B4A;   /* = uiux --theme-primary */
  --gold:  #7A9E87;   /* = uiux --theme-secondary */
  --text2: #718096;   /* ≈ uiux --theme-text-muted */
  --border: rgba(28,43,74,0.1); /* uiux는 #E5E7EB */
}
.app-root[data-theme="private"] {
  --bg:    #121212;   /* ✅ 동일 */
  --bg2:   #1E1E1E;   /* ✅ 동일 */
  --gold:  #E8715A;   /* ✅ 동일 (코랄) */
  --text:  #F5F5F5;   /* uiux는 #F9FAFB — 거의 동일 */
}
```

**추가 필요한 CSS 변수** (`theme.css`에 추가):
```css
.app-root[data-theme="joint"] {
  /* 기존 변수 유지하면서 아래 추가 */
  --bg3:           #F9FAFB;
  --bg4:           #F1F3F5;
  --border-solid:  #E5E7EB;   /* 투명도 없는 테두리 (Tailwind 호환) */
  --radius-card:   24px;       /* rounded-3xl 동일값 */
  --radius-sheet:  32px;       /* rounded-[2rem] 동일값 */
}
[data-theme="private"] {
  --border-solid:  #374151;
}
```

### 2.2 토큰 업데이트 (`styles/tokens.js`)

```javascript
// 현재 tokens.js radius (너무 작음)
radius: { sm: 8, md: 12, lg: 16, full: 9999 }

// 변경 후 — uiux guide 패턴 반영
export const THEME_TOKENS = {
  radius: {
    sm:   8,     // rounded-lg — 뱃지, 작은 요소
    md:   12,    // rounded-xl — 버튼, 칩
    lg:   16,    // rounded-2xl — 모달 버튼, CTA
    xl:   24,    // rounded-3xl — 메인 카드
    xxl:  32,    // rounded-[2rem] — 바텀시트, 프리미엄 카드
    full: 9999,  // rounded-full — FAB, PIN 버튼, 아이콘
  },
  shadow: {
    sm:  "0 1px 4px rgba(0,0,0,0.08)",
    md:  "0 4px 12px rgba(0,0,0,0.12)",
    lg:  "0 8px 24px rgba(0,0,0,0.16)",
    fab: "0 8px 30px rgba(28,43,74,0.4)",   // FAB 전용 — uiux 실측값
    glow: "0 0 10px var(--gold)",            // PIN 도트 글로우
  },
}
```

### 2.3 새 컴포넌트 작성 규칙

```jsx
// ✅ 올바른 방법 — CSS 변수 참조
<div style={{ background: "var(--bg2)", color: "var(--text)", border: "1px solid var(--border-solid)" }}>

// ❌ 하드코딩 금지 — 테마 전환 시 깨짐  
<div style={{ background: "#FFFFFF", color: "#1C2B4A" }}>

// ✅ THEME_TOKENS 활용
import { THEME_TOKENS as T } from "../styles/tokens";
<div style={{ borderRadius: T.radius.xl, boxShadow: T.shadow.md }}>
```

---

## 3. Phase 1 — Nav.jsx 리디자인

**현재 문제**: 이모지 아이콘, 인라인 스타일 전부, Framer Motion 미적용  
**목표**: UIUX 가이드 `BottomNav.tsx` 패턴 적용

### 3.1 현재 코드 (`Nav.jsx:17-53`)

```jsx
// 이모지 기반, 인라인 스타일 전체
const NavBtn = (item) => (
  <button style={{
    color: view === item.id ? "var(--gold)" : "var(--text3)",
    fontFamily: "Syne,sans-serif",
  }}>
    <span style={{ fontSize: 19 }}>{item.icon}</span>  {/* 이모지 */}
    <span style={{ fontSize: 9 }}>{item.l}</span>
  </button>
);
```

### 3.2 변경 후 — lucide-react 아이콘 + motion

```jsx
import { Home, LayoutDashboard, Wallet, Menu } from "lucide-react";
import { motion } from "framer-motion";

const ICON_MAP = {
  home:      Home,
  dashboard: LayoutDashboard,
  private:   Wallet,
  settings:  Menu,
};

const NavBtn = ({ id, l }) => {
  const Icon = ICON_MAP[id];
  const isActive = view === id;
  return (
    <button
      onClick={() => setView(id)}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, padding: "4px 0", background: "none", border: "none", cursor: "pointer",
        color: isActive ? "var(--gold)" : "var(--text3)",
        transform: isActive ? "scale(1.1)" : "scale(1)",
        transition: "all 0.3s",
      }}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, letterSpacing: ".03em" }}>
        {l}
      </span>
    </button>
  );
};

// FAB 업데이트 — uiux guide BottomNav.tsx:22 패턴
<button
  onClick={() => setView("quickEntry")}
  style={{
    width: 60, height: 60, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--text), #3B6FCC)",  // navy → blue
    border: "3px solid var(--bg)",
    boxShadow: "0 8px 30px rgba(28,43,74,0.4)",  // T.shadow.fab
    transform: isEntry ? "scale(1.08) translateY(-2px)" : "translateY(0)",
    transition: "all 0.3s",
  }}
>
```

---

## 4. Phase 2 — HomeView 상단 리디자인

**현재 문제**: 홈 화면 상단에 "이번 달 남은 예산" 숫자가 시각적으로 강조되지 않음  
**목표**: Toss-스타일 대형 헤더 + 예산 링 카드 + AI 코치 말풍선

### 4.1 헤더 교체 (`HomeView.jsx:8` 이후)

현재 헤더 구조를 아래로 교체:

```jsx
// HomeView.jsx — 헤더 섹션 (기존 로직 remaining, pct 등은 그대로 사용)
<header style={{ paddingTop: 24, paddingBottom: 8 }}>
  <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>
    이번 달 남은 공동 예산
  </p>
  <h1 style={{
    fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em",
    color: "var(--text)",
    lineHeight: 1.1,
  }}>
    {fmtS(remaining)}
    <span style={{ fontSize: 22, fontWeight: 700, marginLeft: 4 }}>원</span>
  </h1>
</header>
```

### 4.2 예산 링 카드

```jsx
// 기존 Ring 컴포넌트(UI.jsx)를 래핑하는 새 카드 레이아웃
<div style={{
  background: "var(--bg2)",
  borderRadius: THEME_TOKENS.radius.xl,  // 24px
  padding: 24, marginTop: 16,
  border: "1px solid var(--border-solid)",
  boxShadow: THEME_TOKENS.shadow.sm,
  display: "flex", alignItems: "center", justifyContent: "space-between",
}}>
  <div>
    <p style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500, marginBottom: 4 }}>현재 지출액</p>
    <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{fmtS(variableSpent)}원</p>
    <span style={{
      fontSize: 11, fontWeight: 600, color: "var(--gold)",
      background: "var(--goldD)", padding: "3px 8px",
      borderRadius: THEME_TOKENS.radius.sm, display: "inline-block", marginTop: 8,
    }}>
      {paceStatus}
    </span>
  </div>

  {/* SVG 링 — uiux guide HomeView.tsx:46-61 패턴 그대로 */}
  <div style={{ position: "relative", width: 96, height: 96 }}>
    <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--bg)" strokeWidth="12" />
      <motion.circle
        cx="50" cy="50" r="40" fill="transparent"
        stroke="var(--gold)" strokeWidth="12"
        strokeDasharray={`${pct * 2.51} 251`}
        initial={{ strokeDasharray: "0 251" }}
        animate={{ strokeDasharray: `${pct * 2.51} 251` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        strokeLinecap="round"
      />
    </svg>
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{pct}%</span>
    </div>
  </div>
</div>
```

### 4.3 AI 코치 말풍선 (nudge API 연동)

```jsx
// HomeView.jsx — nudgeText는 /api/nudge 결과 (기존 AiNudgeWidget 로직 재사용)
{nudgeText && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    style={{
      background: "linear-gradient(135deg, #EEF2FF, #E0E7FF)",
      padding: "20px", marginTop: 16,
      borderRadius: THEME_TOKENS.radius.xl,
      borderTopLeftRadius: 0,     // ← 말풍선 꼭지
      border: "1px solid rgba(99,102,241,0.2)",
      display: "flex", alignItems: "flex-start", gap: 16,
      boxShadow: THEME_TOKENS.shadow.sm,
    }}
  >
    <div style={{
      background: "#fff", padding: 10, borderRadius: "50%",
      color: "#6366F1", boxShadow: THEME_TOKENS.shadow.sm, flexShrink: 0,
    }}>
      ✨
    </div>
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#3730A3", marginBottom: 4 }}>AI 소비 코치</p>
      <p style={{ fontSize: 13, color: "#4338CA", lineHeight: 1.6 }}>{nudgeText}</p>
    </div>
  </motion.div>
)}
```

### 4.4 SOS 대기 카드 (홈에 인라인 표시)

현재는 `SosPendingSheet`가 별도 모달. 홈 화면에 티켓 스타일로 인라인 표시:

```jsx
// HomeView.jsx — SOS 대기 섹션
{sosPending.length > 0 && (
  <div style={{ marginTop: 24 }}>
    <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>
      🚨 결재 대기 중인 요청
    </p>
    {sosPending.map(req => (
      <motion.div
        key={req.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: "var(--bg2)",
          borderRadius: THEME_TOKENS.radius.xl,
          border: "2px solid rgba(239,68,68,0.2)",
          padding: 20, marginBottom: 12,
          position: "relative", overflow: "hidden",
        }}
      >
        {/* 빨간 왼쪽 테두리 — 티켓 효과 */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: 4, height: "100%", background: "#EF4444",
        }} />
        <div style={{ paddingLeft: 8 }}>
          <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>
            배우자의 애교 섞인 요청 🥺
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{req.reason}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#EF4444" }}>
              {fmtS(req.amount)}원
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              onClick={() => handleSosApprove(req)}
              style={{
                flex: 1, padding: "12px 0",
                background: "#EF4444", color: "#fff",
                borderRadius: THEME_TOKENS.radius.lg, fontWeight: 700,
                border: "none", cursor: "pointer",
              }}
            >
              ✓ 쿨하게 승인
            </button>
            <button
              onClick={() => handleSosReject(req)}
              style={{
                padding: "12px 20px",
                background: "rgba(239,68,68,0.1)", color: "#EF4444",
                borderRadius: THEME_TOKENS.radius.lg, fontWeight: 700,
                border: "none", cursor: "pointer",
              }}
            >
              반려
            </button>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
)}
```

---

## 5. Phase 3 — PrivateWalletView PIN 잠금 추가

**현재 문제**: 개인 지갑 뷰가 바로 열림. PIN 보호 없음  
**목표**: UIUX 가이드 `PrivateView.tsx` PIN 화면 그대로 이식

### 5.1 상태 추가

```jsx
// PrivateWalletView.jsx 상단에 추가
const [isUnlocked, setIsUnlocked] = useState(false);
const [pin, setPin] = useState("");
const [pinError, setPinError] = useState(false);

// PIN은 localStorage에 bcrypt hash로 저장 (또는 Supabase profiles)
const CORRECT_PIN = localStorage.getItem("private_pin") || "1234";
```

### 5.2 PIN 화면 (잠긴 상태)

```jsx
// PrivateWalletView.jsx — isUnlocked가 false일 때 렌더
if (!isUnlocked) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "85vh", padding: 24,
      background: "var(--bg)",
    }}>
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {/* 자물쇠 아이콘 */}
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, #1F2937, #111827)",
          borderRadius: "50%", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 24px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          border: "1px solid #374151",
          fontSize: 32,
        }}>
          🔒
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: "center", color: "var(--text)", letterSpacing: "-0.02em" }}>
          프라이빗 월렛
        </h2>
        <p style={{ fontSize: 14, color: "var(--text2)", textAlign: "center", marginTop: 8 }}>
          PIN 번호를 입력하세요
        </p>
      </motion.div>

      {/* PIN 도트 — uiux guide PrivateView.tsx:39-43 */}
      <motion.div
        animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        style={{ display: "flex", gap: 24, margin: "40px 0 60px" }}
      >
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: pin.length > i ? "var(--gold)" : "#1F2937",
            transition: "all 0.3s",
            transform: pin.length > i ? "scale(1.1)" : "scale(1)",
            boxShadow: pin.length > i ? "0 0 10px var(--gold)" : "none",
          }} />
        ))}
      </motion.div>

      {/* PIN 패드 — iOS 스타일 */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
        gap: "24px 32px", width: "100%", maxWidth: 280,
      }}>
        {[1,2,3,4,5,6,7,8,9,"",0,"del"].map((key, i) => (
          <button
            key={i}
            onClick={() => {
              if (key === "del") {
                setPin(p => p.slice(0, -1));
              } else if (key !== "" && pin.length < 4) {
                const newPin = pin + key;
                setPin(newPin);
                if (newPin.length === 4) {
                  if (newPin === CORRECT_PIN) {
                    setTimeout(() => setIsUnlocked(true), 300);
                  } else {
                    setPinError(true);
                    setTimeout(() => { setPin(""); setPinError(false); }, 500);
                  }
                }
              }
            }}
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: key === "" ? "transparent" : "rgba(255,255,255,0.05)",
              border: "none", cursor: key === "" ? "default" : "pointer",
              fontSize: key === "del" ? 12 : 28, fontWeight: 300,
              color: "var(--text)",
              visibility: key === "" ? "hidden" : "visible",
              transition: "background 0.15s",
            }}
          >
            {key === "del" ? "지우기" : key}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 5.3 잠금 해제 후 — 프리미엄 블랙카드 대시보드

```jsx
// PrivateWalletView.jsx — isUnlocked가 true일 때
// 기존 개인 지갑 UI 상단에 프리미엄 카드 추가

{/* 헤더 */}
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 24 }}>
  <div>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.02em" }}>
      나만의 비상금 👁️‍🗨️
    </h1>
    <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 4, fontWeight: 500 }}>
      배우자에게는 절대 보이지 않아요
    </p>
  </div>
  <button
    onClick={() => setIsUnlocked(false)}
    style={{
      padding: 12, borderRadius: "50%",
      background: "#1F2937", border: "1px solid #374151",
      cursor: "pointer", color: "#9CA3AF", fontSize: 16,
    }}
  >
    🔓
  </button>
</div>

{/* 프리미엄 블랙카드 — uiux guide PrivateView.tsx:77-90 */}
<div style={{
  position: "relative", overflow: "hidden",
  background: "linear-gradient(135deg, #1F2937, #111827, #000000)",
  padding: 32, borderRadius: THEME_TOKENS.radius.xxl,
  border: "1px solid #374151",
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  marginTop: 24,
}}>
  {/* 배경 글로우 오브 */}
  <div style={{
    position: "absolute", top: -16, right: -16, width: 128, height: 128,
    background: "var(--gold)", opacity: 0.1, borderRadius: "50%",
    filter: "blur(40px)",
  }} />
  <div style={{
    position: "absolute", bottom: -16, left: -16, width: 96, height: 96,
    background: "#3B82F6", opacity: 0.1, borderRadius: "50%",
    filter: "blur(32px)",
  }} />

  {/* 카드 내용 */}
  <div style={{ position: "relative", zIndex: 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
      <span style={{ fontSize: 22 }}>🛡️</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "#6B7280" }}>
        PRIVATE
      </span>
    </div>
    <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 4 }}>이번 달 비밀 지출</p>
    <p style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
      {fmtS(privateTotalSpent)}
      <span style={{ fontSize: 22, marginLeft: 4 }}>원</span>
    </p>
  </div>
</div>

{/* 이하 기존 개인 지갑 거래 내역 유지 */}
```

---

## 6. Phase 4 — 바텀시트 스프링 애니메이션 통일

**현재 문제**: `QuickEntrySheet`, `CardScanSheet` 등이 각자 다른 transition 사용  
**목표**: 모든 바텀시트에 `type: spring, damping: 25, stiffness: 200` 적용

### 6.1 공통 바텀시트 래퍼 (새 컴포넌트)

```jsx
// components/BottomSheet.jsx (새 파일)
import { motion, AnimatePresence } from "framer-motion";
import { THEME_TOKENS as T } from "../styles/tokens";

export function BottomSheet({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)", zIndex: 50,
            }}
          />
          {/* 시트 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              maxWidth: 480, margin: "0 auto",
              background: "var(--bg2)",
              borderRadius: `${T.radius.xxl}px ${T.radius.xxl}px 0 0`,
              padding: "8px 24px 40px",
              zIndex: 51,
              borderTop: "1px solid var(--border-solid)",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.1)",
              color: "var(--text)",
            }}
          >
            {/* 드래그 핸들 */}
            <div style={{
              width: 48, height: 6, background: "var(--border-solid)",
              borderRadius: T.radius.full, margin: "12px auto 24px",
            }} />
            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              style={{
                position: "absolute", top: 20, right: 20,
                padding: 8, borderRadius: "50%",
                background: "var(--bg)", border: "none", cursor: "pointer",
                color: "var(--text2)", fontSize: 16,
              }}
            >
              ✕
            </button>
            {title && (
              <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, letterSpacing: "-0.02em" }}>
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

기존 시트들을 이 래퍼로 교체:
```jsx
// QuickEntrySheet.jsx — 기존 코드 구조 유지, 래퍼만 교체
import { BottomSheet } from "./BottomSheet";

export function QuickEntrySheet({ isOpen, onClose, ...props }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="무엇을 기록할까요?">
      {/* 기존 내부 컨텐츠 그대로 */}
    </BottomSheet>
  );
}
```

---

## 7. Phase 5 — 거래 내역 리스트 스타일 업그레이드

**목표**: 이모지 아이콘 + 깔끔한 카드 리스트 (uiux guide HomeView.tsx:112-139 패턴)

```jsx
// 카테고리별 이모지 매핑 (constants/index.js에 추가)
export const CAT_EMOJI = {
  food: "🍔",
  cafe: "☕",
  transport: "🚌",
  medical: "💊",
  culture: "🎬",
  clothing: "👔",
  education: "📚",
  housing: "🏠",
  sub: "💳",
  game: "🎮",
  hobby: "🎸",
  shopping: "🛍️",
  sos: "🚨",
  default: "💳",
};

// 거래 카드 컴포넌트
function TxItem({ tx, isLast, onEdit }) {
  return (
    <div
      onClick={() => onEdit(tx)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "16px 20px",
        borderBottom: isLast ? "none" : "1px solid var(--border-solid)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: THEME_TOKENS.radius.md,
          background: "var(--bg)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 22,
          boxShadow: "inset 0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {CAT_EMOJI[tx.cat] || CAT_EMOJI.default}
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{tx.memo}</p>
          <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>
            {CAT[tx.cat]} · {tx.date.slice(5)}
          </p>
        </div>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
        -{fmtS(tx.amount)}원
      </span>
    </div>
  );
}

// 리스트 컨테이너
<div style={{
  background: "var(--bg2)",
  borderRadius: THEME_TOKENS.radius.xl,
  border: "1px solid var(--border-solid)",
  boxShadow: THEME_TOKENS.shadow.sm,
  overflow: "hidden",  // 내부 border-radius 적용
}}>
  {filteredTx.map((tx, i) => (
    <TxItem key={tx.id} tx={tx} isLast={i === filteredTx.length - 1} onEdit={setEditItem} />
  ))}
</div>
```

---

## 8. 변경 금지 영역 (절대 건드리지 말 것)

| 파일 | 이유 |
|------|------|
| `utils/supabase.js` | DB 연결 로직 — 완성됨 |
| `utils/ocr.js` | AI 스캔 로직 — 완성됨 |
| `utils/offlineQueue.js` | 오프라인 동기화 — 완성됨 |
| `api/ocr.js` | Gemini 서버리스 함수 |
| `api/budget-ai.js` | AI 예산 배분 — 완성됨 |
| `utils/helpers.js` | fmtS, 날짜 유틸 — 완성됨 |
| `constants/index.js` | CAT, CATS 상수 — (확장만 가능) |
| `App.jsx` state 로직 | setShared, realtime 구독 — 완성됨 |

---

## 9. 구현 우선순위 로드맵

| 단계 | 작업 | 파일 | 상태 |
|------|------|------|------|
| **P0** | CSS 변수 정렬 + tokens.js 업데이트 | `theme.css`, `tokens.js` | ✅ 완료 |
| **P0** | Nav.jsx 리디자인 (lucide 아이콘, motion) | `Nav.jsx` | ✅ 완료 |
| **P0** | BottomSheet 공통 래퍼 생성 | `components/BottomSheet.jsx` | ✅ 완료 |
| **P1** | HomeView 헤더 Toss-스타일 교체 | `HomeView.jsx` | ✅ 완료 |
| **P1** | HomeView 예산 링 SVG 애니메이션 | `HomeView.jsx` | ✅ 완료 |
| **P1** | HomeView AI 코치 말풍선 (nudge API 연결) | `HomeView.jsx` | ✅ 완료 |
| **P1** | HomeView SOS 티켓 카드 인라인 표시 | `HomeView.jsx` | ✅ 완료 |
| **P2** | PrivateWalletView PIN 잠금 화면 | `PrivateWalletView.jsx` | ✅ 완료 |
| **P2** | PrivateWalletView 프리미엄 블랙카드 | `PrivateWalletView.jsx` | ✅ 완료 |
| **P2** | 거래 내역 이모지 카드 리스트 | `HomeView.jsx` | ✅ 완료 |
| **P3** | QuickEntrySheet → BottomSheet 래퍼 이전 | `QuickEntrySheet.jsx` | ✅ 완료 |
| **P3** | SosPendingSheet → BottomSheet 래퍼 이전 | `SosPendingSheet.jsx` | ✅ 완료 |
| **P3** | ReportView 차트 스타일 업그레이드 | `ReportView.jsx` | 미정 |
| **P3** | BudgetView 디자인 통일 | `BudgetView.jsx` | 미정 |

---

## 10. 핵심 디자인 철학 (변경 불가 원칙)

| 화면 | 영감 | 핵심 감성 | 적용 뷰 |
|------|------|----------|---------|
| 공동 예산 | **토스** | 극도로 단순, 핵심 숫자만 크게 | HomeView, DashboardView |
| 프라이빗 월렛 | **Apple Wallet / 현대카드** | 프리미엄, 은밀함, 안전감 | PrivateWalletView |
| SOS / AI 코치 | **허니듀** | 공감, 말랑말랑한 인터랙션 | SOS 섹션, AI 말풍선 |
| 보고서 | **토스증권** | 데이터 명확, 깔끔한 차트 | ReportView, BudgetView |

---

## 11. 마이크로카피 원칙 (변경 불가)

```
❌ 딱딱한 레이블    →  ✅ 대화체
"금액 입력"         →  "얼마가 필요한가요? 💳"
"사유"              →  "어디에 쓸 건가요? 🥺"
"승인"              →  "쿨하게 승인"
"거절"              →  "반려"
"개인 지갑"         →  "나만의 비상금"
"파트너에게 비공개" →  "배우자에게는 절대 보이지 않아요"
```

---

*작성: 2026-04-06*  
*기반: `/src/` + `/uiux guide/src/` 전체 파일 직접 분석*
