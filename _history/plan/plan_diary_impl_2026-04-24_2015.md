# [Plan] 부부 다이어리 탭 구현 계획

일자: 2026-04-24 20:15
상태: [DRAFT]
기반: plan_diary_2026-04-24_1920.md + handoff-3 디자인 가이드 + 실제 소스 분석

---

## 1. 현황 파악

### 1.1 Nav 현재 구조 (src/components/Nav.jsx)

```jsx
const LEFT_ITEMS = [
  { id: "home",      Icon: Home,            label: "공동" },
  { id: "dashboard", Icon: LayoutDashboard, label: "대시보드" },
];
const RIGHT_ITEMS = [
  { id: "private",  Icon: Wallet, label: "내 지갑" },
  { id: "settings", Icon: Menu,   label: "메뉴" },
];
```

### 1.2 App.jsx 진입점 현황

```jsx
const [view, setView] = useState("home");  // 현재 기본값

// switch(view) 라우팅
case "home": return <HomeView ... />;
default:     return <HomeView ... />;  // fallback도 home
```

### 1.3 데이터 레이어 현황

- `constants/index.js`: TxItem typedef 존재, DiaryItem 없음
- `App.jsx` 공유 상태: tx, fixed, install, cards, settlements, assets, plan, budgets, names, taxConfig, widgetLayout, homeLayout (diaries 없음)
- `loadShared()`: `allData.xxx` 패턴으로 로드 후 setXxxRaw()
- `updateSharedState()`: switch(key) 패턴으로 실시간 동기화
- `BudgetContext`: diaries/setDiaries 미포함

### 1.4 HomeView 위젯 목록 (src/views/HomeView.jsx)

react-grid-layout 기반, 9개 위젯:
hero, execution_summary, ai_nudge, sos_pending, pace_predictor, scenario_slider, limit_status, partner_spending, recent_tx

### 1.5 handoff-3 프로토타입 Nav 목표 구조

```
diary(BookHeart) | entry(List/내역) | FAB | dashboard(Grid) | settings(Menu)
```

---

## 2. 변경 파일 목록

| 파일 | 작업 |
|------|------|
| `src/constants/index.js` | DiaryItem typedef + EMPTY_DIARIES 추가 |
| `src/App.jsx` | diaries 상태 + loadShared + updateSharedState + budgetContextValue + switch 라우팅 + 초기 view 변경 |
| `src/context/BudgetContext.jsx` | BudgetContextValue typedef에 diaries/setDiaries 추가 |
| `src/components/Nav.jsx` | home->diary 교체, private->entry 교체, BookHeart/List 아이콘 추가 |
| `src/styles/theme.css` | 다이어리 전용 CSS 변수 블록 추가 |
| `src/views/DiaryView.jsx` | 신규 생성 |

DashboardView 위젯 통합은 이번 범위 제외. HomeView는 "home" 케이스로 유지하되 Nav에서만 제거.

---

## 3. Phase 1 — 데이터 모델

### 3.1 src/constants/index.js — DiaryItem typedef + EMPTY_DIARIES 추가

기존 TxItem typedef 블록 아래에 삽입:

```js
/**
 * @typedef {Object} DiaryItem
 * @property {number}   id         - 고유 ID (Date.now() * 1000 + rand)
 * @property {string}   date       - YYYY-MM-DD
 * @property {string}   time       - HH:MM
 * @property {string}   who        - 'husband' | 'wife'
 * @property {string}   emoji      - 오늘의 기분 이모지
 * @property {string}   content    - 다이어리 본문
 * @property {number}   totalSpent - 오늘 지출 총액 (원 단위)
 * @property {boolean}  shared     - 파트너 공유 여부 (기본 true)
 * @property {string[]} photos     - base64 또는 URL 배열 (최대 3)
 */

/** @type {DiaryItem[]} */
export const EMPTY_DIARIES = [];
```

App.jsx 상단 import에 EMPTY_DIARIES 추가:

```js
import {
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS,
  EMPTY_PLAN, EMPTY_SETTLEMENTS, EMPTY_DIARIES,
  DEFAULT_WIDGET_LAYOUT, DEFAULT_HOME_LAYOUT,
  getYear,
} from "./constants/index.js";
```

### 3.2 src/App.jsx — diaries 상태 추가

taxConfig 상태 선언 (line 98) 바로 아래에 추가:

```jsx
const [diaries, setDiariesRaw] = useState(/** @type {import('./constants/index.js').DiaryItem[]} */ (EMPTY_DIARIES));
```

### 3.3 src/App.jsx — loadShared() 에 diaries 로드 추가

`if (typeof allData.kidsMode === 'boolean')` 바로 위(line ~260)에 삽입:

```js
if (Array.isArray(allData.diaries)) setDiariesRaw(allData.diaries);
```

### 3.4 src/App.jsx — updateSharedState() 에 diaries 케이스 추가

switch(key) 내부 `case 'kidsMode':` 바로 위(line ~163)에 삽입:

```js
case 'diaries': setDiariesRaw(value || []); break;
```

### 3.5 src/App.jsx — setDiaries 콜백 추가

setSettlements/setAssets 라인 패턴 따라 추가:

```js
const setDiaries = useCallback(
  v => setShared("diaries", typeof v === 'function' ? v(diaries) : v, setDiariesRaw),
  [diaries, setShared]
);
```

### 3.6 src/App.jsx — budgetContextValue 에 diaries 추가 (line 836)

```jsx
const budgetContextValue = {
  tx, setTx, addTx, deleteTx, editTx, addTxBatch, loadTxYear,
  budgets, setBudgets, plan, setPlan, names, setNames,
  fixed, setFixed, install, setInstall, cards, setCards,
  settlements, setSettlements, assets, setAssets,
  diaries, setDiaries,
  syncStatus, householdId, myRole,
  kidsMode, setKidsMode,
};
```

### 3.7 src/context/BudgetContext.jsx — BudgetContextValue typedef 확장

기존 typedef 끝에 추가:

```js
 * @property {import('../constants/index.js').DiaryItem[]} diaries
 * @property {(v: import('../constants/index.js').DiaryItem[] | ((prev: import('../constants/index.js').DiaryItem[]) => import('../constants/index.js').DiaryItem[])) => void} setDiaries
```

---

## 4. Phase 2 — Nav 재구성

### 4.1 src/components/Nav.jsx — 아이콘 import 교체

```jsx
// 변경 전
import { Home, LayoutDashboard, Wallet, Menu, Plus } from "lucide-react";

// 변경 후
import { BookHeart, List, LayoutDashboard, Menu, Plus } from "lucide-react";
```

### 4.2 src/components/Nav.jsx — 탭 배열 교체

```jsx
// 변경 전
const LEFT_ITEMS = [
  { id: "home",      Icon: Home,            label: "공동" },
  { id: "dashboard", Icon: LayoutDashboard, label: "대시보드" },
];
const RIGHT_ITEMS = [
  { id: "private",  Icon: Wallet, label: "내 지갑" },
  { id: "settings", Icon: Menu,   label: "메뉴" },
];

// 변경 후
const LEFT_ITEMS = [
  { id: "diary",    Icon: BookHeart,        label: "다이어리" },
  { id: "entry",    Icon: List,             label: "내역" },
];
const RIGHT_ITEMS = [
  { id: "dashboard", Icon: LayoutDashboard, label: "대시보드" },
  { id: "settings",  Icon: Menu,            label: "설정" },
];
```

내 지갑(private) 탭은 Nav에서 제거. DashboardView 또는 SettingsView 내부 진입점으로 유지.

### 4.3 src/App.jsx — 초기 view 변경 (line 58)

```jsx
// 변경 전
const [view, setView] = useState("home");

// 변경 후
const [view, setView] = useState("diary");
```

### 4.4 src/App.jsx — lazy import 추가

기존 lazy import 블록 끝에 추가:

```jsx
const DiaryView = lazy(() => import("./views/DiaryView.jsx").then(m => ({ default: m.DiaryView })));
```

### 4.5 src/App.jsx — switch 라우팅에 diary 케이스 추가 + default 변경

```jsx
// case "home": 바로 위에 삽입
case "diary":
  return (
    <DiaryView
      diaries={diaries}
      setDiaries={setDiaries}
      names={names}
      myRole={myRole}
      tx={tx}
    />
  );

// default fallback 변경
default:
  return (
    <DiaryView
      diaries={diaries}
      setDiaries={setDiaries}
      names={names}
      myRole={myRole}
      tx={tx}
    />
  );
```

---

## 5. Phase 3 — theme.css 다이어리 토큰 추가

src/styles/theme.css 맨 끝에 블록 추가:

```css
/* Diary View — Warm Analog Palette */
:root {
  --diary-cream:     #FAF7F3;
  --diary-cream2:    #F4EFE8;
  --diary-cream3:    #EDE5D8;
  --diary-ink:       #1C1714;
  --diary-ink2:      #5C4F44;
  --diary-ink3:      #9C8E84;
  --diary-h:         oklch(42% 0.10 230);
  --diary-h-light:   oklch(92% 0.06 230);
  --diary-h-mid:     oklch(75% 0.10 230);
  --diary-w:         oklch(52% 0.14 10);
  --diary-w-light:   oklch(94% 0.06 10);
  --diary-w-mid:     oklch(78% 0.12 10);
  --diary-accent:    oklch(58% 0.14 50);
  --diary-green:     oklch(55% 0.14 150);
  --diary-shadow:    0 4px 20px rgba(28,23,20,0.08);
  --diary-shadow-lg: 0 8px 32px rgba(28,23,20,0.12);
}
```

---

## 6. Phase 4 — DiaryView.jsx 신규 생성

경로: src/views/DiaryView.jsx

### 6.1 컴포넌트 구조

```
DiaryView
├── DiaryHeader          (날짜 표시)
├── DiaryTimeline        (스크롤 카드 목록)
│   └── DiaryCard[]      (개별 카드)
├── DiaryFab             (플로팅 작성 버튼)
└── DiaryInputSheet      (하단 슬라이드업 입력 패널)
    ├── WhoSelector      (남편/아내 선택)
    ├── EmojiPicker      (18개 감정 이모지)
    ├── ContentTextarea  (일기 본문)
    ├── PhotoPicker      (최대 3장, FileReader base64)
    ├── SpendInput       (오늘 총 지출액)
    └── SharedToggle     (공유/비공개 스위치)
```

### 6.2 파일 전체 구조 (src/views/DiaryView.jsx)

```jsx
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookHeart, Plus, X, Camera } from "lucide-react";

/**
 * @typedef {import('../constants/index.js').DiaryItem} DiaryItem
 * @typedef {import('../constants/index.js').TxItem} TxItem
 */

const EMOJI_LIST = ['😊','😴','😤','🥰','😭','🤔','😎','🥳','😅','😑','🤩','😰','😇','🤗','😒','🤣','😬','🥺'];

/**
 * @param {{
 *   diaries: DiaryItem[],
 *   setDiaries: (v: DiaryItem[] | ((p: DiaryItem[]) => DiaryItem[])) => void,
 *   names: { husband: string, wife: string },
 *   myRole: 'husband' | 'wife',
 *   tx: TxItem[],
 * }} props
 */
export function DiaryView({ diaries, setDiaries, names, myRole, tx }) {
  const [showInput, setShowInput] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const todayTotal = useMemo(() =>
    tx.filter(t => t.date === today && t.who === myRole && !t.is_private)
      .reduce((s, t) => s + t.amount, 0),
    [tx, today, myRole]
  );

  const addDiary = useCallback((draft) => {
    if (!draft.content.trim()) return;
    const clamped = Math.max(0, draft.totalSpent);
    /** @type {DiaryItem} */
    const item = {
      ...draft,
      totalSpent: clamped,
      id:   Date.now() * 1000 + (Math.random() * 1000 | 0),
      date: today,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      who:  myRole,
    };
    setDiaries(prev => [item, ...prev]);
    setShowInput(false);
  }, [today, myRole, setDiaries]);

  return (
    <div style={{ height: '100%', background: 'var(--diary-cream)', overflowY: 'auto', paddingBottom: 96 }}>
      <DiaryHeader today={today} />
      <DiaryTimeline diaries={diaries} names={names} />
      <DiaryFab onClick={() => setShowInput(true)} />
      <AnimatePresence>
        {showInput && (
          <DiaryInputSheet
            names={names}
            myRole={myRole}
            defaultSpent={todayTotal}
            onSave={addDiary}
            onClose={() => setShowInput(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DiaryHeader({ today }) {
  const formatted = new Date(today + 'T00:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  return (
    <div style={{ padding: '60px 20px 16px', background: 'var(--diary-cream)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <BookHeart size={18} color="var(--diary-accent)" />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--diary-accent)', textTransform: 'uppercase' }}>
          우리 다이어리
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--diary-ink2)' }}>{formatted}</div>
    </div>
  );
}

function DiaryTimeline({ diaries, names }) {
  if (diaries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--diary-ink3)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>아직 일기가 없어요</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>오늘의 기억을 남겨보세요</div>
      </div>
    );
  }
  return (
    <div style={{ paddingTop: 8 }}>
      {diaries.map(item => <DiaryCard key={item.id} item={item} names={names} />)}
    </div>
  );
}

function DiaryCard({ item, names }) {
  const isH = item.who === 'husband';
  const name = isH ? names.husband : names.wife;
  const fmtKRW = n => n > 0 ? n.toLocaleString('ko-KR') + '원' : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isH ? 'var(--diary-h-light)' : 'var(--diary-w-light)',
        border: `1px solid ${isH ? 'var(--diary-h-mid)' : 'var(--diary-w-mid)'}`,
        borderRadius: 20, padding: '16px 18px', margin: '0 16px 12px',
        boxShadow: 'var(--diary-shadow)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isH ? 'var(--diary-h)' : 'var(--diary-w)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          {isH ? '👨' : '👩'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--diary-ink)' }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--diary-ink3)' }}>{item.time}</div>
        </div>
        <div style={{ fontSize: 24 }}>{item.emoji}</div>
      </div>

      <p style={{ fontSize: 14, color: 'var(--diary-ink)', lineHeight: 1.6, margin: '0 0 10px' }}>
        {item.content}
      </p>

      {item.photos?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {item.photos.map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {fmtKRW(item.totalSpent) && (
          <span style={{
            background: 'rgba(28,23,20,0.08)', borderRadius: 99,
            padding: '3px 10px', fontSize: 12, fontWeight: 600, color: 'var(--diary-ink2)',
          }}>
            {fmtKRW(item.totalSpent)}
          </span>
        )}
        <span style={{ fontSize: 11, color: item.shared ? 'var(--diary-green)' : 'var(--diary-ink3)', marginLeft: 'auto' }}>
          {item.shared ? '공유됨' : '비공개'}
        </span>
      </div>
    </motion.div>
  );
}

function DiaryFab({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', bottom: 80, right: 'max(16px, calc(50% - 224px))',
        width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, var(--diary-h), var(--diary-w))',
        boxShadow: '0 4px 20px rgba(28,23,20,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <Plus size={24} color="#fff" />
    </button>
  );
}

/**
 * @param {{
 *   names: { husband: string, wife: string },
 *   myRole: 'husband' | 'wife',
 *   defaultSpent: number,
 *   onSave: (draft: Omit<DiaryItem, 'id' | 'date' | 'time'>) => void,
 *   onClose: () => void,
 * }} props
 */
function DiaryInputSheet({ names, myRole, defaultSpent, onSave, onClose }) {
  const [draft, setDraft] = useState({
    who: myRole, emoji: '😊', content: '',
    totalSpent: defaultSpent, shared: true, photos: [],
  });

  const canSave = draft.content.trim().length > 0;

  const handlePhoto = useCallback((e) => {
    const remaining = 3 - draft.photos.length;
    if (remaining <= 0) return;
    const files = Array.from(e.target.files || []).slice(0, remaining);
    files.forEach(f => {
      if (!f.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => {
        if (!ev.target?.result) return;
        setDraft(p => ({ ...p, photos: [...p.photos, String(ev.target.result)].slice(0, 3) }));
      };
      reader.readAsDataURL(f);
    });
  }, [draft.photos.length]);

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480, zIndex: 300,
        background: 'var(--diary-cream)', borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 40px rgba(28,23,20,0.15)',
        padding: '20px 20px 40px', overflowY: 'auto', maxHeight: '90dvh',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
          <X size={20} color="var(--diary-ink3)" />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['husband', 'wife']).map(role => (
          <button
            key={role}
            onClick={() => setDraft(p => ({ ...p, who: role }))}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: draft.who === role
                ? (role === 'husband' ? 'var(--diary-h)' : 'var(--diary-w)')
                : 'var(--diary-cream2)',
              color: draft.who === role ? '#fff' : 'var(--diary-ink3)',
            }}
          >
            {role === 'husband' ? names.husband : names.wife}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
        {EMOJI_LIST.map(em => (
          <button
            key={em}
            onClick={() => setDraft(p => ({ ...p, emoji: em }))}
            style={{
              fontSize: 22, padding: '3px 5px', cursor: 'pointer',
              background: draft.emoji === em ? 'var(--diary-cream3)' : 'transparent',
              border: draft.emoji === em ? '2px solid var(--diary-accent)' : '2px solid transparent',
              borderRadius: 10,
            }}
          >
            {em}
          </button>
        ))}
      </div>

      <textarea
        placeholder="오늘 하루 어땠어? 짧게라도 남겨봐..."
        value={draft.content}
        onChange={e => setDraft(p => ({ ...p, content: e.target.value }))}
        rows={3}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 14, resize: 'none',
          border: '1px solid var(--diary-cream3)', background: 'var(--diary-cream2)',
          fontSize: 14, color: 'var(--diary-ink)', lineHeight: 1.6,
          fontFamily: 'inherit', boxSizing: 'border-box', display: 'block',
        }}
      />

      <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
        <input
          type="number"
          placeholder="오늘 지출 총액"
          value={draft.totalSpent || ''}
          onChange={e => setDraft(p => ({ ...p, totalSpent: Math.max(0, Number(e.target.value) || 0) }))}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            border: '1px solid var(--diary-cream3)', background: 'var(--diary-cream2)',
            fontSize: 14, color: 'var(--diary-ink)',
          }}
        />
        <button
          onClick={() => setDraft(p => ({ ...p, shared: !p.shared }))}
          style={{
            padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: draft.shared ? 'var(--diary-green)' : 'var(--diary-cream3)',
            color: draft.shared ? '#fff' : 'var(--diary-ink3)',
            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
          }}
        >
          {draft.shared ? '공유' : '비공개'}
        </button>
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, cursor: 'pointer', fontSize: 13, color: 'var(--diary-ink3)' }}>
        <Camera size={16} />
        사진 추가 ({draft.photos.length}/3)
        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhoto} disabled={draft.photos.length >= 3} />
      </label>

      {draft.photos.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {draft.photos.map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
          ))}
        </div>
      )}

      <button
        disabled={!canSave}
        onClick={() => onSave(draft)}
        style={{
          width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 16, border: 'none',
          background: canSave
            ? 'linear-gradient(135deg, var(--diary-h) 0%, var(--diary-w) 100%)'
            : 'var(--diary-cream3)',
          color: canSave ? '#fff' : 'var(--diary-ink3)',
          fontWeight: 800, fontSize: 15, cursor: canSave ? 'pointer' : 'not-allowed',
          fontFamily: 'inherit',
        }}
      >
        저장
      </button>
    </motion.div>
  );
}
```

---

## 7. 구현 순서 (권장)

1. constants/index.js — DiaryItem typedef + EMPTY_DIARIES (5분)
2. App.jsx — import + state + loadShared + updateSharedState + setDiaries + budgetContextValue + lazy + switch + 초기 view (20분)
3. BudgetContext.jsx — typedef 확장 (3분)
4. theme.css — diary CSS 변수 (3분)
5. DiaryView.jsx — 신규 생성 (30분)
6. Nav.jsx — 아이콘 + 탭 교체 (5분)

---

## 8. 방어 코드 체크리스트

- loadShared: `Array.isArray(allData.diaries)` 후 set
- DiaryCard: `item.photos?.length` optional chaining
- handlePhoto: `f.type.startsWith('image/')` 검사
- addDiary: `totalSpent` 0 미만 클램프 (`Math.max(0, ...)`)
- DiaryFab: `right: max(16px, calc(50% - 224px))` — 480px 컨테이너 우측에 항상 위치
- DiaryInputSheet: `maxHeight: 90dvh` + `overflowY: auto` — 키보드 올라올 때 스크롤

---

## 9. 검증 계획

1. `npx tsc --noEmit` — 0 errors 확인
2. 다이어리 작성 → Supabase 대시보드 `household_data` key 'diaries' 저장 확인
3. 파트너 기기 실시간 수신 확인 (Realtime subscribe 경로)
4. 오프라인 작성 → 온라인 복구 시 동기화 (offlineQueue flush)
5. iOS Safari 15.4+: `oklch()` 색상 렌더링 확인

---

## 10. 이번 범위 제외 (별도 추진)

- DashboardView에 HomeView 위젯 흡수 통합
- PrivateWalletView Nav 접근 경로 재설계
- 다이어리 날짜별 그룹핑 / 무한 스크롤
- 다이어리 삭제/수정 기능
- 다이어리 photos Supabase Storage 업로드 (현재는 base64 인라인)


---

# [Claude 분석 주석] 7개 이슈 진단 및 구현 지침

분석일: 2026-04-25  
분석자: Claude  
기반 파일: src/App.jsx, Nav.jsx, InputSheet.jsx, DiaryView.jsx, SettingsView.jsx, theme.css, globalStyles.js

---

## [Claude] Issue 1 — FAB 버튼이 다이어리 아닌 지출 입력으로 열림

### 원인 파악

`Nav.jsx` FAB의 `onClick`:
```jsx
onClick={() => setView("quickEntry")
```
→ `App.jsx` line 920에서 `"quickEntry"` 시그널 수신 시 `setShowQuickEntry(true)` 호출  
→ `QuickEntrySheet` (지출 전용) 가 열림 (line 938)

반면 `DiaryView`의 "기록하기" 버튼은 `onOpenSheet(currentUser)` → `setDiarySheet(who)` → `InputSheet` (diary 모드 기본)을 열도록 별도로 연결되어 있음.

두 경로가 분리되어 있어서 FAB은 항상 지출, "기록하기"는 다이어리로 연결됨.

### 수정 방법 (최소 변경)

**`src/components/Nav.jsx`** — FAB onClick 수정:
```jsx
// 변경 전
onClick={() => setView("quickEntry")}

// 변경 후
onClick={() => setView("diary-input")}
```

**`src/App.jsx`** — Nav의 setView 콜백 수정 (line 920):
```jsx
// 변경 전
setView={v => v === "quickEntry" ? setShowQuickEntry(true) : setView(v)}

// 변경 후
setView={v => {
  if (v === "quickEntry")   { setShowQuickEntry(true); return; }
  if (v === "diary-input")  { setDiarySheet(myRole); return; }
  setView(v);
}}
```

이렇게 하면 FAB → InputSheet(diary 모드 기본), QuickEntry 경로는 보존, 기존 테스트 불필요.

### 추가 개선 아이디어 [Claude]

InputSheet의 default mode를 `'diary'`로 유지하되, Nav에 FAB 롱프레스 시 지출 직입 모드로 여는 것도 UX적으로 좋음. 단, 모바일 롱프레스는 복잡하므로 일단 위 단순 수정 우선.

---

## [Claude] Issue 2 — 지출 항목 건건마다 카테고리/결제수단 설정

### 원인 파악

`InputSheet.jsx` expense 모드의 item 구조:
```js
{ id: Date.now(), label: '', amount: '' }   // cat, payMethod 없음
```

`cat`, `payMethod`, `cardId`는 시트 하단에 전체 공통으로 1개만 설정됨. `handleSave`에서:
```js
cat: mode === 'expense' ? cat : undefined,   // 모든 항목에 동일 cat 적용
```

`ExpenseLine` 타입도 `{label, amount}`만 있어서 건별 메타 정보 없음.

### 수정 방법

**`src/constants/index.js`** — ExpenseLine 타입 확장:
```js
// 변경 전
 * @typedef {{ label: string, amount: number }} ExpenseLine

// 변경 후
 * @typedef {{ label: string, amount: number, cat?: string, payMethod?: string, cardId?: string }} ExpenseLine
```

**`src/components/InputSheet.jsx`** — items 초기값 및 updateItem 확장:
```js
// 초기값
const [items, setItems] = useState([{
  id: Date.now(), label: '', amount: '',
  cat: 'food', payMethod: 'credit', cardId: ''
}]);

// addItem
function addItem() {
  setItems(prev => [...prev, {
    id: Date.now(), label: '', amount: '',
    cat: 'food', payMethod: 'credit', cardId: ''
  }]);
}
```

**각 expense-item-row에 카테고리 선택 추가** (접는 토글로 UX 단순화):
```jsx
{/* expense-item-row 내부 확장 */}
<div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
  {CATS.map(c => (
    <button key={c.id}
      onClick={() => updateItem(it.id, 'cat', c.id)}
      style={{
        fontSize: 18, padding: '2px 4px', borderRadius: 8, border: 'none',
        background: it.cat === c.id ? 'var(--cream3)' : 'transparent',
        cursor: 'pointer'
      }}
      title={c.label}
    >{c.icon}</button>
  ))}
</div>
<div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
  {PAY_METHODS.map(pm => (
    <button key={pm.id}
      onClick={() => updateItem(it.id, 'payMethod', pm.id)}
      style={{
        fontSize: 11, padding: '3px 8px', borderRadius: 99, border: 'none',
        background: it.payMethod === pm.id ? 'var(--ink)' : 'var(--cream2)',
        color: it.payMethod === pm.id ? 'white' : 'var(--ink3)',
        cursor: 'pointer'
      }}
    >{pm.label}</button>
  ))}
</div>
```

**handleSave 수정** — 전체 공통 cat/payMethod/cardId 블록 제거, 항목별 값 사용:
```js
expenseItems: mode === 'expense' ? validItems.map(it => ({
  label: it.label,
  amount: it.amount,
  cat: it.cat || 'etc',
  payMethod: it.payMethod || 'credit',
  cardId: it.cardId || '',
})) : undefined,
cat: undefined,       // 더 이상 전체 공통 불필요
payMethod: undefined,
cardId: undefined,
```

**`src/components/DetailSheet.jsx`도 동일하게 수정** 필요 (수정 모달에서도 항목별 cat/payMethod 표시).

### 추가 개선 아이디어 [Claude]

기본값 UX: 처음 항목 추가 시 직전 항목의 cat/payMethod를 복사해 주면 연속 입력 시 편리함. `addItem`에서 `prev[prev.length-1]?.cat` 참조.

---

## [Claude] Issue 3 — 지출 입력 시 who 선택 제거, myRole 자동 적용

### 원인 파악

`InputSheet.jsx`:
```jsx
const [who, setWho] = useState(defaultWho || 'husband');
// ...
<div className="who-selector">
  <button onClick={()=>setWho('husband')}>👨 {names.husband}</button>
  <button onClick={()=>setWho('wife')}>👩 {names.wife}</button>
</div>
```

`defaultWho`는 `App.jsx`에서 `diarySheet`에 저장된 `myRole` 값이지만, UI상 변경 가능.

### 수정 방법 (최소 변경)

**`src/components/InputSheet.jsx`** — who-selector 조건부 렌더 (diary 모드에서만 표시):

```jsx
// 변경 전: 항상 표시
<div className="who-selector"> ... </div>

// 변경 후: 다이어리 모드에서만 표시 (지출은 myRole 고정)
{mode === 'diary' && (
  <div className="who-selector">
    <button className={`who-btn${who==='husband'?' selected h':''}`} onClick={()=>setWho('husband')}>
      👨 {names.husband}
    </button>
    <button className={`who-btn${who==='wife'?' selected w':''}`} onClick={()=>setWho('wife')}>
      👩 {names.wife}
    </button>
  </div>
)}
```

지출 모드에서는 `who`가 `defaultWho`(myRole)로 고정됨. useState 초기값 그대로 사용.

### 추가 개선 아이디어 [Claude]

다이어리 모드의 who 선택도 장기적으로 제거 고려. 내 다이어리는 항상 myRole로 고정하고, 파트너 다이어리는 Realtime으로 수신하는 구조가 더 명확함. 지금은 일단 지출만 고정.

---

## [Claude] Issue 4 — 전체 레이아웃 짤림

### 원인 파악

**문제 1: scroll-area 하단 패딩 부족**

`theme.css`:
```css
.scroll-area { flex: 1; overflow-y: auto; padding: 0 16px 20px; }
```
Nav bar는 `position: fixed; bottom: 0`이고 높이 약 72px, FAB 오버행 28px. 하단에 최소 100px 여유가 필요한데 20px만 있음.

**문제 2: view-header 상단 패딩 부족**

```css
.view-header { padding: 14px 20px 10px; }
```
iOS status bar (대략 44~60px), safe-area-inset-top 미적용. 노치/다이나믹 아일랜드 기기에서 헤더가 상태바에 가려짐.

**문제 3: month-banner 위치 중복**

`DiaryView.jsx`:
```jsx
<div className="scroll-area">
  <div className="month-banner"> ...   // scroll-area 안에 있는데
```
`theme.css`의 `.month-banner`는 `margin: 0 16px 10px`를 사용 → scroll-area의 `padding: 0 16px`와 겹쳐서 좌우 32px 여백 발생 가능.

### 수정 방법

**`src/styles/theme.css`** — scroll-area 패딩 + view-header safe-area 적용:
```css
.view-header {
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 20px 10px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
}

.scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px calc(env(safe-area-inset-bottom, 0px) + 100px);
  -webkit-overflow-scrolling: touch;
}
```

**month-banner — scroll-area 안에 있을 때 좌우 마진 조정**:
```css
.month-banner {
  margin: 0 0 10px;        /* scroll-area 패딩이 이미 16px 있으므로 추가 마진 불필요 */
  border-radius: 18px;
  /* ... 나머지 유지 */
}
```

또는 month-banner를 scroll-area 밖 (view-header 바로 아래 flex 자식)으로 이동.

### 추가 개선 아이디어 [Claude]

**globalStyles.js의 `.view-content`** padding-bottom도 100px로 맞춰야 함:
```js
.view-content { ... padding-bottom: 100px; }
```
현재 두 CSS 시스템(globalStyles.js와 theme.css)이 혼재하고 있어서 `.view`와 `.view-content`가 각자 다른 패딩값을 쓰고 있음. 통일 필요.

---

## [Claude] Issue 5 — 기본 정보(이름) 설정 활성화

### 원인 파악

`SettingsView.jsx`:
```js
{label:'기본 정보', sub:`${names.husband} / ${names.wife}`, icon:'👤',
  action:()=>alert("이름 수정은 추후 업데이트 예정입니다.")},
```

`setNames` prop은 SettingsView에 전달되고 있고 (`setNames={setNames}`), App.jsx에서도 정상 동작. 단지 alert으로 막아둔 것.

### 수정 방법

`SettingsView.jsx`에 인라인 이름 편집 UI 추가:

```jsx
// state 추가 (SettingsView 함수 내부)
const [editNames, setEditNames] = useState(false);
const [draftH, setDraftH] = useState(names.husband);
const [draftW, setDraftW] = useState(names.wife);

// 기본 정보 action 교체
{label:'기본 정보', sub:`${names.husband} / ${names.wife}`, icon:'👤',
  action: () => { setDraftH(names.husband); setDraftW(names.wife); setEditNames(true); }},

// 모달 또는 인라인 편집 UI (items 목록 아래)
{editNames && (
  <div style={{
    background:'white', borderRadius:16, padding:'16px 18px',
    border:'1px solid var(--cream3)', marginBottom:8
  }}>
    <div style={{fontSize:13, fontWeight:600, marginBottom:10}}>이름 수정</div>
    <input value={draftH} onChange={e=>setDraftH(e.target.value)}
      placeholder="남편 이름"
      style={{width:'100%', padding:'10px 12px', borderRadius:10,
        border:'1px solid var(--cream3)', marginBottom:8, fontFamily:'inherit', fontSize:14}} />
    <input value={draftW} onChange={e=>setDraftW(e.target.value)}
      placeholder="와이프 이름"
      style={{width:'100%', padding:'10px 12px', borderRadius:10,
        border:'1px solid var(--cream3)', marginBottom:12, fontFamily:'inherit', fontSize:14}} />
    <div style={{display:'flex', gap:8}}>
      <button onClick={()=>setEditNames(false)}
        style={{flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--cream3)',
          background:'white', color:'var(--ink3)', fontSize:13, cursor:'pointer'}}>
        취소
      </button>
      <button onClick={()=>{ setNames({husband:draftH||'남편', wife:draftW||'와이프'}); setEditNames(false); }}
        style={{flex:2, padding:'10px', borderRadius:10, border:'none',
          background:'var(--ink)', color:'white', fontSize:13, fontWeight:700, cursor:'pointer'}}>
        저장
      </button>
    </div>
  </div>
)}
```

`setNames`는 BudgetContext를 통해 Supabase에도 자동 저장됨. 별도 저장 로직 불필요.

---

## [Claude] Issue 6 — 데이터 초기화 세분화

### 원인 파악

App.jsx에 이미 `resetTx`, `resetFixed`, `resetBudgets`, `resetSetup`(line 683), `resetAll`이 모두 구현되어 있음.

SettingsView에 props로 `resetTx`, `resetFixed`, `resetBudgets`가 전달되지만 (`App.jsx` line 893 확인), SettingsView의 items 배열에는 `resetAll`만 연결:
```js
{label:'데이터 초기화', ... action:()=>{ if (confirm("...")) resetAll(); }}
```

또한 `resetSetup`과 **`resetDiaries`는 SettingsView에 전달조차 안 됨**.

### 수정 방법

**`src/App.jsx`** — `resetDiaries` 함수 추가:
```js
const resetDiaries = useCallback(async () => {
  setSyncStatus("syncing");
  await db.save(householdId, "diaries", EMPTY_DIARIES);
  setDiariesRaw(EMPTY_DIARIES);
  setSyncStatus("ok");
  addToast("다이어리가 초기화되었습니다.");
}, [householdId, addToast]);
```

**`src/App.jsx`** — SettingsView에 props 추가 (line 893, 907):
```jsx
<SettingsView
  resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed}
  resetBudgets={resetBudgets} resetSetup={resetSetup} resetDiaries={resetDiaries}
  ...
/>
```

**`src/views/SettingsView.jsx`** — props 선언 및 items 교체:
```jsx
export function SettingsView({
  ..., resetAll, resetTx, resetFixed, resetBudgets, resetSetup, resetDiaries, ...
}) {
  const [showReset, setShowReset] = useState(false);

  // items 배열의 '데이터 초기화' 항목 교체
  {label:'데이터 초기화', sub:'항목별 선택 삭제', icon:'🗑️', danger:true,
    action: () => setShowReset(true)},

  // showReset 패널
  {showReset && (
    <div style={{background:'var(--danger-bg1)', border:'1px solid var(--danger-border)',
      borderRadius:16, padding:'16px 18px', marginBottom:8}}>
      <div style={{fontSize:13, fontWeight:700, color:'var(--danger)', marginBottom:12}}>
        초기화할 항목을 선택하세요
      </div>
      {[
        { label:'지출 내역만 삭제',     fn: resetTx      },
        { label:'고정비/할부 초기화',   fn: resetFixed   },
        { label:'예산 설정 초기화',     fn: resetBudgets },
        { label:'다이어리 초기화',      fn: resetDiaries },
        { label:'사용자 설정 초기화',   fn: resetSetup   },
        { label:'전체 초기화',          fn: resetAll, isAll: true },
      ].map(({ label, fn, isAll }) => (
        <button key={label}
          onClick={() => {
            if (confirm(`"${label}" 하시겠습니까?`)) { fn(); setShowReset(false); }
          }}
          style={{
            width:'100%', padding:'11px 14px', borderRadius:10, border:'none',
            background: isAll ? 'var(--danger)' : 'white',
            color: isAll ? 'white' : 'var(--danger)',
            fontSize:13, fontWeight:600, cursor:'pointer',
            marginBottom:6, textAlign:'left',
          }}>
          {label}
        </button>
      ))}
      <button onClick={()=>setShowReset(false)}
        style={{width:'100%', padding:'11px', borderRadius:10, border:'1px solid var(--cream3)',
          background:'white', fontSize:13, cursor:'pointer', marginTop:4}}>
        취소
      </button>
    </div>
  )}
```

---

## [Claude] Issue 7 — 다이어리 화면 예산 잔액 오계산

### 원인 파악

`DiaryView.jsx`:
```js
const totalSpent = currentMonthDiaries
  .filter(d => d.type === 'expense')
  .reduce((s, d) => s + (d.totalSpent || 0), 0);

const totalBudget = Object.values(budgets)
  .reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
```

`totalSpent`가 **diaries 배열의 type==='expense' 항목만** 합산함.  
그러나 `EntryView`, `QuickEntrySheet`, `CardScanSheet`에서 입력한 지출은 **`tx` 배열**에 저장됨 (addTx 호출).  
즉 다이어리에서 지출 입력한 것만 집계되고, 나머지는 빠져 있음.

`budgets`는 `useBudget()` 통해 정상적으로 실제 설정값 참조. 이 부분은 하드코딩 아님.

문제는 `tx` 배열을 DiaryView가 받지 않아서 실제 지출 총액을 알 수 없다는 것.

### 수정 방법

`DiaryView.jsx`에서 `useBudget()`으로 `tx`를 추가로 가져와 합산:

```jsx
// DiaryView.jsx 상단
export function DiaryView({ onOpenSheet }) {
  const { diaries, editDiary, deleteDiary, currentUser, budgets, tx } = useBudget();
  // tx는 BudgetContext에 이미 공급되어 있음 (App.jsx line 868)

  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;

  // 이번 달 실제 지출 = tx 기반 (EntryView/QuickEntry 입력분)
  const txMonthSpent = tx
    .filter(t => t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0);

  // 이번 달 다이어리 지출 (InputSheet expense 입력분)
  const diaryMonthSpent = diaries
    .filter(d => d.type === 'expense' && d.date.startsWith(thisMonth))
    .reduce((s, d) => s + (d.totalSpent || 0), 0);

  // 합산 (tx에 diary 경유 지출이 중복 저장되지 않는다고 가정)
  const totalSpent = txMonthSpent + diaryMonthSpent;

  const totalBudget = Object.values(budgets)
    .reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  const remaining = totalBudget - totalSpent;
```

> **중복 저장 주의**: InputSheet `handleSave`가 `onSave(entry)` → `addDiary(entry)` 만 호출하고 `addTx`는 호출 안 함 → 중복 없음. 단, 향후 지출 입력 경로가 통합되면 재검토 필요.

### 추가 개선 아이디어 [Claude]

장기적으로는 DiaryView의 지출 표시를 "나의 지출"과 "전체 지출"로 분리해서 보여주는 것이 유용함:
- `나의 지출`: `tx.filter(t => t.who === myRole && t.date.startsWith(thisMonth))`
- `전체 지출`: `tx.filter(t => t.date.startsWith(thisMonth))`

---

## [Claude] 추가 발견 이슈 및 개선 아이디어

### A. BudgetContext에 tx가 공급되지 않을 가능성

`App.jsx` line 862~870에서 `budgetContextValue`를 확인 필요.  
현재 `tx`가 context에 포함되어 있는지 검증: 포함되어 있다면 `useBudget()`에서 `tx`를 바로 꺼낼 수 있음.  
포함 안 되어 있다면 `DiaryView`에 `tx` prop을 추가로 전달해야 함.

### B. InputSheet — PAY_METHODS import 누락 가능성

`InputSheet.jsx` line 2:
```js
import { CATS, PAY_METHODS } from '../constants/index.js';
```
`PAY_METHODS`가 `constants/index.js`에 export 되어있는지 확인 필요. 없으면 빌드 에러.

### C. SettingsView — resetSetup prop 미전달

App.jsx line 893에서 SettingsView로 전달하는 props에 `resetSetup`이 없음 (Issue 6에서 언급).  
현재 Issue 6 수정 시 함께 처리.

### D. theme.css — oklch() iOS 15 미만 폴백 없음

```css
--h-color: oklch(42% 0.10 230);
```
iOS 15.4 미만에서 `oklch()` 미지원. fallback RGB 값 추가 권장:
```css
--h-color: #2d4270;    /* fallback */
--h-color: oklch(42% 0.10 230);
```

### E. diaries — Supabase 연도별 분리 미적용

`tx`는 `tx_YYYY` 키로 연도별 분리 저장하지만 `diaries`는 단일 `'diaries'` 키로 전체 저장됨.  
데이터가 쌓이면 같은 성능 문제 발생 가능. 장기적으로 `diaries_YYYY` 패턴 검토 권장.

### F. 다이어리 삭제/수정 UI 접근 방법 명확화

현재 `DetailSheet`가 다이어리 수정/삭제를 담당하는데, DiaryView에서 카드 클릭 시 열리는 구조임.  
그런데 `DetailSheet` import는 정상이나, `editDiary`/`deleteDiary`는 BudgetContext에서 가져와야 함.  
`DetailSheet`에서 직접 `useBudget()`으로 꺼내오는 게 아니라 prop으로 전달받는 구조 — 현재 구조 유지가 좋음.

---

## [Claude] 구현 우선순위 권장

| 순위 | 이슈 | 예상 소요 | 파일 |
|---|---|---|---|
| 1 | Issue 7 (예산 표시) | 5분 | DiaryView.jsx |
| 2 | Issue 5 (이름 설정) | 10분 | SettingsView.jsx |
| 3 | Issue 1 (FAB → 다이어리) | 5분 | Nav.jsx, App.jsx |
| 4 | Issue 3 (who 선택 제거) | 5분 | InputSheet.jsx |
| 5 | Issue 4 (레이아웃 짤림) | 15분 | theme.css |
| 6 | Issue 6 (초기화 세분화) | 20분 | App.jsx, SettingsView.jsx |
| 7 | Issue 2 (항목별 cat/pay) | 30분 | InputSheet.jsx, DetailSheet.jsx, constants/index.js |

총 예상: 약 90분 (단계별 빌드 검증 포함)

| 7 | Issue 2 (항목별 cat/pay) | 30분 | InputSheet.jsx, DetailSheet.jsx, constants/index.js |

총 예상: 약 90분 (단계별 빌드 검증 포함)

---

# [Antigravity 추가 제안 및 고도화 아이디어] 🚀

분석일: 2026-04-25  
분석자: Antigravity  
주요 제안: 성능 최적화, UX 일관성, 데이터 무결성 보강

### 1. 이미지 압축 로직의 통일 (DiaryView 내 적용)
- **현황**: `InputSheet.jsx`에는 Canvas API를 이용한 800px WebP 압축 로직이 포함되어 있으나, `DiaryView.jsx` 내의 `DiaryInputSheet` (line 511)는 단순 `readAsDataURL`만 사용하여 원본 base64가 저장될 위험이 있습니다.
- **제안**: `InputSheet.jsx`의 `handleFiles` 압축 로직을 유틸리티 함수(예: `src/utils/image.js`)로 분리하고, 다이어리와 일반 지출 입력창 양쪽에서 공통으로 호출하여 Supabase 저장 공간 및 전송 속도를 최적화해야 합니다.

### 2. 개인 지출 vs 총 지출 공유 로직 정교화
- **현황**: 사용자는 "개인 지출은 개인이 따로 입력하고 서로 볼 수 있는 항목은 오늘의 총 지출"이라고 명시했습니다.
- **제안**: 
    - `DiaryItem`에 `is_private` 필드 외에 `mask_details` 필드를 추가합니다.
    - `mask_details: true`인 경우, 파트너에게는 "우진님이 38,979원을 지출했습니다"라는 요약만 노출하고 세부 `expenseItems` 리스트는 렌더링하지 않도록 `DiaryCard` 로직을 보강합니다.

### 3. 오프라인 이미지 저장 전략 (IndexedDB 활용)
- **현황**: 이미지가 포함된 다이어리를 오프라인에서 작성할 경우, `localStorage` 기반의 큐는 용량 제한(약 5MB)으로 인해 실패할 확률이 높습니다.
- **제안**: 이미 구현된 `offlineIDB.js`를 적극 활용하여, 사진 데이터가 포함된 페이로드는 `IndexedDB`에 우선 저장하고 온라인 복구 시 하나씩 업서트하는 전용 큐 핸들러를 `App.jsx`의 `syncStatus` 로직에 결합해야 합니다.

### 4. 다이어리 & 지출 데이터의 논리적 연결 (Source Mapping)
- **현황**: `DiaryItem` 내의 `expenseItems`와 기존 `tx` 배열은 현재 별개로 관리됩니다.
- **제안**: 
    - `TxItem` typedef에 `source_id` (DiaryItem의 ID) 필드를 추가합니다.
    - 다이어리에서 지출을 입력할 때 `addTx`도 동시에 호출하여 통계(대시보드)에 자동 반영되게 하고, `source_id`를 통해 다이어리 본문으로 바로가기 링크를 제공하는 등 데이터 간의 유기적 연결을 강화합니다.

### 5. "오늘의 질문" 콘텐츠 동적 관리
- **현황**: `DiaryView.jsx` (line 57)에 질문이 하드코딩되어 있습니다.
- **제안**: `src/constants/prompts.js`에 부부 사이의 대화를 이끌어낼 수 있는 30개 이상의 질문 리스트를 작성하고, 날짜(`date.getDate() % prompts.length`)를 인덱스로 사용하여 매일 새로운 질문이 나오도록 구현하면 앱의 'Analog Diary' 정체성을 강화할 수 있습니다.

### 6. 다이어리 타임라인 가독성 개선 (Stick Header)
- **현황**: 날짜별 그룹핑 시 스크롤하면 어느 날짜인지 잊기 쉽습니다.
- **제안**: `day-label` (line 167)에 `position: sticky; top: 0; z-index: 10;`을 적용하고 배경색을 `var(--diary-cream)`으로 설정하여, 스크롤 중에도 현재 보고 있는 일기를 명확히 인지할 수 있게 합니다.

---

**Antigravity의 결론**: Claude의 진단은 매우 정확하며, 위 6가지 고도화 아이디어를 결합하면 단순한 가계부를 넘어 부부의 소중한 기록 저장소로서의 가치가 극대화될 것입니다. 특히 **이미지 압축 유틸리티화**는 앱의 안정성을 위해 가장 먼저 선행되어야 할 작업입니다.
