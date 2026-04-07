# family-budget-app V3 구현 계획서

> 작성일: 2026-04-07  
> 코드베이스 기준 커밋: `f695cfd`

---

## 현재 코드베이스 진단 (As-Is)

### 아키텍처 요약

| 영역 | 현황 |
|------|------|
| **라우팅** | `App.jsx`의 `view` state 문자열로 조건부 렌더링 (SPA flat router) |
| **상태관리** | `App.jsx` ~820줄 단일 파일에 모든 state, effect, handler 집중 |
| **BudgetContext** | `context/BudgetContext.jsx`는 Context + hook만 export. Provider는 App.jsx 내부 |
| **DB** | `household_data` KV 테이블(레거시) + `transactions` RDB + `sos_requests` 혼용 |
| **오프라인** | `offlineQueue.js`가 KV ops만 처리. `db.insertTx` 경로는 큐 미지원 |
| **테마** | `theme.css`에 `joint`(Navy+Emerald) / `private`(Black+Coral) 2개. `useTheme(view)`가 `view==="private"` 시 전환 |
| **Kids** | 존재 없음. Nav, 라우팅, DB 스키마 모두 미구현 |

### 핵심 부채 목록

1. **오프라인 큐 누락**: `CardScanSheet`의 `addTxBatch` → `db.insertTxBatch`는 오프라인 시 큐 미등록
2. **BudgetContext 범위 좁음**: `kidsMode`, `kidsConfig`, `addTx` 등 자주 쓰이는 핸들러 미노출
3. **Kids 미구현**: `ParentKidsMgmtView`, `KidsView`, kids 테마, DB 스키마 전무
4. **legacy 폴더**: `budget-v2/`, `archive/` 루트 존재 → 검색 노이즈
5. **리렌더링 위험**: `BudgetContext` 단일 Provider에 모든 state가 집중 — tx 업데이트 시 앱 전체 리렌더 가능
6. **오프라인 완전성 미달**: 앱 종료/백그라운드 중 네트워크 복구 시 `offlineQueue` flush 미실행 (Service Worker Background Sync 미연동)
7. **AI 비용 낭비**: 동일 파라미터로 반복 AI 호출 시 캐싱 없음. Gemini API 오류 시 Fallback 부재
8. **기존 테이블 RLS 미확인**: `transactions`, `sos_requests`에 RLS 적용 여부 별도 확인 필요

---

## Phase 0: 파일시스템 정리

### 목표
LLM 컨텍스트 낭비 원인인 중복 폴더 제거.

### 작업
```bash
# 외부 백업 후 실행 (되돌릴 수 없음, 반드시 git commit 또는 백업 후 진행)
rm -rf budget-v2/
rm -rf archive/
```

### 유지할 구조
```
/
├── api/          # Vercel Serverless Functions
├── src/          # React 앱
├── public/       # PWA assets
├── dist/         # 빌드 산출물
├── plan.md       # 이 파일
├── package.json
├── vite.config.js
└── vercel.json
```

---

## Phase 1: DB 스키마 확장 (Supabase)

### 1-1. kids_profiles 테이블

```sql
-- 아이 프로필 (한 가계부에 여러 아이 가능)
CREATE TABLE kids_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  text NOT NULL REFERENCES household_data(id) ON DELETE CASCADE,
  name          text NOT NULL,
  avatar        text,                    -- 이모지 or URL
  goal_label    text NOT NULL,           -- "레고 테크닉 42151"
  goal_amount   int  NOT NULL DEFAULT 0, -- 목표 금액 (원)
  saved_amount  int  NOT NULL DEFAULT 0, -- 현재 저금액
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE kids_profiles ENABLE ROW LEVEL SECURITY;

-- household_id 일치 시만 접근 허용
CREATE POLICY "kids_own_household" ON kids_profiles
  FOR ALL USING (household_id = current_setting('app.household_id', true));
```

### 1-2. kids_missions 테이블

```sql
-- 부모가 생성한 미션 목록
CREATE TABLE kids_missions (
  id           bigserial PRIMARY KEY,
  kid_id       uuid NOT NULL REFERENCES kids_profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  reward       int  NOT NULL DEFAULT 0,   -- 양수: 보상 지급, 음수: 패널티 차감 (음수 허용)
  status       text NOT NULL DEFAULT 'pending'  -- pending | done | rewarded
               CHECK (status IN ('pending', 'done', 'rewarded')),
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE kids_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_own_household" ON kids_missions
  FOR ALL USING (
    kid_id IN (
      SELECT id FROM kids_profiles
      WHERE household_id = current_setting('app.household_id', true)
    )
  );
```

> **[Antigravity 메모] 패널티 로직 (Gamification)**: `reward` 음수 허용으로 패널티 미션 구현. 긍정적 보상(집안일 돕기)뿐 아니라 부정적 차감(스마트폰 2시간 초과) 미션도 지원. 클라이언트 UI에서 `reward < 0`인 미션은 붉은색 차감 표시, `reward > 0`은 금색 보상 표시.

**패널티 미션 UI 분기 (ParentKidsMgmtView MissionItem 포인트):**

```jsx
// MissionItem — reward 음수/양수 분기
const isPenalty = m.reward < 0;

<div style={{ fontSize: 11, color: isPenalty ? 'var(--red)' : 'var(--gold)' }}>
  {isPenalty ? `${m.reward.toLocaleString()}원 차감` : `+${m.reward.toLocaleString()}원`}
</div>

// AddMissionSheet — 패널티 토글 추가
const [isPenalty, setIsPenalty] = useState(false);
onAdd({ title: title.trim(), reward: Number(reward) * (isPenalty ? -1 : 1) });
```

**`complete_and_reward_mission` RPC — 패널티 시 음수 방지:**
```sql
-- saved_amount가 0 미만이 되지 않도록 GREATEST 처리
UPDATE kids_profiles
  SET saved_amount = GREATEST(0, saved_amount + v_reward)
  WHERE id = v_kid_id;
```

### 1-3. 기존 테이블 RLS 점검 및 보강 (메모 반영)

> **[Antigravity 메모]** 인증된 사용자라도 자신이 속한 `household_id` 외의 데이터에는 접근 불가해야 합니다.

```sql
-- transactions 테이블 RLS (아직 미적용 상태라면 실행)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_own_household" ON transactions
  FOR ALL USING (household_id = current_setting('app.household_id', true));

-- sos_requests 테이블 RLS
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sos_own_household" ON sos_requests
  FOR ALL USING (household_id = current_setting('app.household_id', true));
```

> **확인 방법**: Supabase 대시보드 → Authentication → Policies 탭에서 각 테이블의 RLS enabled 여부와 정책 목록 검증.

### 1-4. transactions 테이블 컬럼 추가

```sql
-- 아이의 지출/용돈 내역을 기존 transactions와 분리 추적
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS kid_id uuid REFERENCES kids_profiles(id);
```

### 1-5. Supabase RPC 추가

```sql
-- 아이 저금액 원자적 증감 (미션 보상 지급 시 레이스 컨디션 방지)
CREATE OR REPLACE FUNCTION increment_kid_savings(
  p_kid_id     uuid,
  p_amount     int
) RETURNS void AS $$
  UPDATE kids_profiles
  SET saved_amount = saved_amount + p_amount
  WHERE id = p_kid_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Phase 2: BudgetContext 확장

### 현재 `budgetContextValue` (App.jsx:747)

```js
const budgetContextValue = {
  tx, setTx, loadTxYear, budgets, setBudgets, plan, setPlan, names, setNames,
  fixed, setFixed, install, setInstall, cards, setCards, assets, setAssets,
  syncStatus, householdId, myRole,
};
```

### 목표 상태

```js
// App.jsx — budgetContextValue에 추가할 필드
const budgetContextValue = {
  // ... 기존 유지 ...
  addTx,          // 자주 쓰이는 핸들러를 Context에 노출 (prop drilling 제거)
  deleteTx,
  editTx,
  addTxBatch,
  // Kids Mode
  kidsMode,       // boolean — localStorage + DB 설정
  setKidsMode,    // (v: boolean) => void
  kidsProfiles,   // KidProfile[] — kids_profiles 테이블 미러
  setKidsProfiles,
  kidsMissions,   // KidsMission[] — kids_missions 테이블 미러
  setKidsMissions,
};
```

### BudgetContext typedef 확장 (`context/BudgetContext.jsx`)

```js
/**
 * @typedef {Object} KidProfile
 * @property {string} id
 * @property {string} name
 * @property {string} avatar
 * @property {string} goal_label
 * @property {number} goal_amount
 * @property {number} saved_amount
 */

/**
 * @typedef {Object} KidsMission
 * @property {number} id
 * @property {string} kid_id
 * @property {string} title
 * @property {number} reward
 * @property {'pending'|'done'|'rewarded'} status
 */

/**
 * @typedef {Object} BudgetContextValue
 * @property {import('../constants').TxItem[]} tx
 * ... (기존 유지)
 * @property {boolean} kidsMode
 * @property {(v: boolean) => void} setKidsMode
 * @property {KidProfile[]} kidsProfiles
 * @property {KidsMission[]} kidsMissions
 */
```

### App.jsx 상태 추가

```js
// App.jsx — 기존 useState 블록 하단에 추가
const [kidsMode, setKidsModeRaw] = useState(false);
const [kidsProfiles, setKidsProfiles] = useState(/** @type {KidProfile[]} */ ([]));
const [kidsMissions, setKidsMissions] = useState(/** @type {KidsMission[]} */ ([]));

const setKidsMode = useCallback((v) => {
  setKidsModeRaw(v);
  savePrivate('kidsMode', v);
  // DB에도 저장해 파트너 기기에 전파
  if (householdId) db.save(householdId, 'kidsMode', v).catch(console.error);
}, [householdId, savePrivate]);
```

### 초기 로드 (`loadShared` 내부, App.jsx:152)

```js
// loadShared 내부, setSyncStatus("ok") 직전에 추가
if (allData.kidsMode !== undefined) setKidsModeRaw(allData.kidsMode);

// kids_profiles 로드
if (isSupabaseConfigured) {
  const { data: profiles } = await supabase
    .from('kids_profiles')
    .select('*')
    .eq('household_id', hid);
  if (profiles) setKidsProfiles(profiles);

  const { data: missions } = await supabase
    .from('kids_missions')
    .select('*')
    .in('kid_id', (profiles ?? []).map(p => p.id));
  if (missions) setKidsMissions(missions);
}
```

### `updateSharedState`에 kidsMode 핸들 추가 (App.jsx:117)

```js
case 'kidsMode': setKidsModeRaw(value); break;
```

---

## Phase 3: offlineQueue 보강 + Background Sync API

### 현재 문제
`addTxBatch` → `db.insertTxBatch` 경로는 오프라인 시 큐에 미등록됨.

### 3-A. Background Sync API 연동 (메모 반영)

> **[Antigravity 메모]** PWA의 Service Worker 내 Background Sync API를 연동하면, 앱이 닫히거나 백그라운드에 있을 때 네트워크가 복구되어도 시스템단에서 자동 동기화 실행. 현재 `handleOnline`은 앱이 포그라운드인 경우에만 동작.
>
> 🚨 **[Antigravity의 핵심 변경 제안 (CRITICAL)]**: 원본 계획은 `localStorage`에 큐를 저장하고 Service Worker(SW)가 `postMessage`로 창(window)에 flush를 지시하는 방식입니다. 하지만 앱이 완전히 종료된 상태에서 Background Sync가 구동되면 활성화된 창 클라이언트가 없어 실패하게 됩니다! 진정한 백그라운드 동기화를 위해서는 **오프라인 큐를 `localStorage`가 아닌 브라우저 내장 `IndexedDB`에 저장**해야 합니다. 그래야 메인 스레드 없이 SW가 단독으로 DB를 읽고 Supabase API를 호출할 수 있습니다.

> 🚨 **[Antigravity 메모 — CRITICAL 변경]**: 원본 계획(localStorage + postMessage)은 앱이 **완전히 종료**된 상태에서 Background Sync가 구동되면 활성 창이 없어 flush가 실패함. 진정한 백그라운드 동기화를 위해 오프라인 큐를 **`localStorage` → `IndexedDB`로 이전**해야 함. Service Worker가 메인 스레드 없이 단독으로 IndexedDB를 읽고 Supabase API를 직접 호출하는 구조로 변경.

**아키텍처 변경 요약:**

| | 기존 (localStorage) | 변경 후 (IndexedDB) |
|--|--|--|
| 큐 저장소 | `localStorage` | `IndexedDB` (`budget-offline-db`) |
| SW flush 방식 | `postMessage` → App이 flush | SW가 직접 Supabase REST 호출 |
| 앱 종료 중 동기화 | 불가 | 가능 |

**`src/utils/offlineIDB.js` — IndexedDB 큐 헬퍼 (신규 파일):**

```js
// src/utils/offlineIDB.js
const DB_NAME = 'budget-offline-db';
const STORE   = 'queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(STORE, { autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/** @param {{ type: 'kv'|'tx', key?: string, value?: any, tx?: object }} item */
export async function idbEnqueue(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...item, ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

/** @returns {Promise<Array<{ id: number, type: string, key?: string, value?: any, tx?: object }>>} */
export async function idbDequeueAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = e => resolve(e.result);
    req.onerror = e => reject(e.target.error);
  });
}

/** @param {number[]} ids */
export async function idbRemove(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    ids.forEach(id => tx.objectStore(STORE).delete(id));
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}
```

**`public/sw.js` — SW가 IndexedDB 직접 읽고 Supabase REST 호출:**

```js
// public/sw.js
const SUPABASE_URL = self.__SUPABASE_URL__; // 빌드 시 주입 (vite-plugin-pwa define)
const SUPABASE_KEY = self.__SUPABASE_KEY__;

self.addEventListener('sync', (event) => {
  if (event.tag !== 'offline-queue-flush') return;

  event.waitUntil((async () => {
    const db = await openIDB();           // SW 내부 동일 openDB 로직
    const items = await dequeueAll(db);
    if (!items.length) return;

    const succeeded = [];
    for (const item of items) {
      try {
        if (item.type === 'kv') {
          await fetch(`${SUPABASE_URL}/rest/v1/household_data`, {
            method: 'POST',
            headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify({ id: item.householdId, key: item.key, value: item.value }),
          });
        } else if (item.type === 'tx') {
          await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
            method: 'POST',
            headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(item.rows),
          });
        }
        succeeded.push(item.id);
      } catch { /* 실패 항목은 큐에 유지 */ }
    }
    if (succeeded.length) await removeFromIDB(db, succeeded);
  })());
});
```

**`App.jsx` — enqueue 시 IDB 저장 + Background Sync 등록:**

```js
import { idbEnqueue } from './utils/offlineIDB.js';

// 오프라인 저장 시 IDB에 push + sync 등록
const enqueueWithSync = async (item) => {
  await idbEnqueue(item);
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('offline-queue-flush').catch(() => {});
  }
};
```

> **Fallback**: `SyncManager` 미지원(iOS Safari) 환경에서는 기존 `window.addEventListener('online', handleOnline)` 방식이 그대로 동작. `handleOnline`도 IDB를 읽도록 수정.

> **주의**: Background Sync는 Chromium 계열(Android Chrome, Edge)에서만 지원. iOS Safari 미지원 — 기존 `handleOnline` fallback과 병행 운영.

### 3-B. enqueueTx / flushTxQueue 추가

### 해결: `src/utils/offlineQueue.js`에 tx 단건/다건 큐 추가

```js
const TX_QUEUE_KEY = 'budget_offline_tx_queue';

/**
 * 오프라인 중 insertTx 단건 큐 등록
 * @param {import('../constants/index.js').TxItem & { is_private?: boolean }} tx
 */
export const enqueueTx = (tx) => {
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    q.push({ ...tx, _ts: Date.now() });
    localStorage.setItem(TX_QUEUE_KEY, JSON.stringify(q));
  } catch (e) {
    console.error('[offlineQueue] enqueueTx 실패:', e);
  }
};

/**
 * 오프라인 tx 큐를 transactions 테이블로 flush
 * @param {import('./supabase').db} db
 * @param {string} householdId
 * @returns {Promise<number>}
 */
export const flushTxQueue = async (db, householdId) => {
  if (!householdId) return 0;
  try {
    const raw = localStorage.getItem(TX_QUEUE_KEY);
    const q = raw ? JSON.parse(raw) : [];
    if (!q.length) return 0;
    await db.insertTxBatch(householdId, q);
    localStorage.removeItem(TX_QUEUE_KEY);
    return q.length;
  } catch (e) {
    console.error('[offlineQueue] flushTxQueue 실패:', e);
    return 0;
  }
};
```

### App.jsx — handleOnline 수정 (App.jsx:294)

```js
// 기존 flushOfflineQueue 호출 옆에 flushTxQueue 추가
import { flush as flushOfflineQueue, flushTxQueue, enqueue as enqueueOffline, hasQueued } from "./utils/offlineQueue.js";

const handleOnline = async () => {
  if (!hasQueued()) return;
  setSyncStatus("syncing");
  const [kvCount, txCount] = await Promise.all([
    flushOfflineQueue(db, householdId),
    flushTxQueue(db, householdId),
  ]);
  const total = kvCount + txCount;
  if (total > 0) {
    setSyncStatus("ok");
    addToast(`☁ 오프라인 내역 ${total}건 동기화 완료`, "success");
    await loadShared(householdId);
  } else {
    setSyncStatus("error");
    addToast("동기화 중 오류가 발생했습니다.", "error");
  }
};
```

---

## Phase 4: Kids Theme 추가

### `src/styles/theme.css` — kids 테마 추가

```css
/* ── Kids 테마 (Soft Sunshine & Playful Coral) ── */
.app-root[data-theme="kids"] {
  --bg:           #FFF9F0;   /* Warm Cream */
  --bg2:          #FFFFFF;
  --bg3:          #FFF3E0;
  --bg4:          #FFE0B2;
  --border:       rgba(255, 167, 38, 0.15);
  --border2:      rgba(255, 167, 38, 0.3);
  --border-solid: #FFE0B2;

  --gold:       #FF9800; /* Vivid Orange */
  --goldL:      #FFB74D;
  --goldD:      rgba(255, 152, 0, 0.15);

  --text:       #3E2723;   /* Warm Brown */
  --text2:      #795548;
  --text3:      #A1887F;

  --nav-bg:     rgba(255, 249, 240, 0.92);
  --theme-accent: #FF9800;
  --theme-accent-soft: rgba(255, 152, 0, 0.12);

  /* 말풍선 */
  --ai-bubble-from: rgba(255, 243, 224, 0.9);
  --ai-bubble-to:   rgba(255, 249, 240, 0.95);
  --ai-bubble-border: rgba(255, 152, 0, 0.3);
  --ai-bubble-text: #3E2723;
  --ai-bubble-title: #E65100;
}
```

### `src/hooks/useTheme.js` — kids 조건 추가

```js
export function useTheme(view, kidsMode) {
  useEffect(() => {
    const theme = kidsMode ? 'kids' : view === 'private' ? 'private' : 'joint';
    document.documentElement.setAttribute('data-theme', theme);
    return () => {
      document.documentElement.setAttribute('data-theme', 'joint');
    };
  }, [view, kidsMode]);
}
```

### App.jsx — useTheme 호출 수정 (App.jsx:78)

```js
useTheme(view, kidsMode);
```

---

## Phase 5: supabase.js DB 메서드 추가

```js
// src/utils/supabase.js — db 객체에 추가

// ── Kids CRUD ─────────────────────────────────────────────────────────────

/** @param {string} hid @param {Omit<KidProfile, 'id'|'created_at'>} profile */
async createKidProfile(hid, profile) {
  const { data, error } = await supabase
    .from('kids_profiles')
    .insert({ household_id: hid, ...profile })
    .select()
    .single();
  if (error) throw error;
  return data;
},

/** @param {string} kidId @param {Partial<KidProfile>} updates */
async updateKidProfile(kidId, updates) {
  const { error } = await supabase
    .from('kids_profiles')
    .update(updates)
    .eq('id', kidId);
  if (error) throw error;
},

/** @param {string} kidId @param {Omit<KidsMission, 'id'|'created_at'>} mission */
async createMission(kidId, mission) {
  const { data, error } = await supabase
    .from('kids_missions')
    .insert({ kid_id: kidId, ...mission })
    .select()
    .single();
  if (error) throw error;
  return data;
},

/** @param {number} missionId @param {'done'|'rewarded'} status */
async completeMission(missionId, status) {
  const { error } = await supabase
    .from('kids_missions')
    .update({ status, completed_at: new Date().toISOString() })
    .eq('id', missionId);
  if (error) throw error;
},

/** @param {string} kidId @param {number} amount */
async rewardKid(kidId, amount) {
  const { error } = await supabase.rpc('increment_kid_savings', {
    p_kid_id: kidId,
    p_amount: amount,
  });
  if (error) throw error;
},
```

---

## Phase 6: ParentKidsMgmtView 구현

**파일**: `src/views/ParentKidsMgmtView.jsx`

### 구조

```
ParentKidsMgmtView
├── KidSelector (탭 — 아이별 선택)
├── KidGoalCard (저금통 현황 — 목표 게이지)
├── MissionList
│   ├── MissionItem (pending | done | rewarded)
│   └── AddMissionSheet (바텀 시트)
└── AllowanceHistory (kid_id로 필터된 tx 목록)
```

### 핵심 코드 스니펫

```jsx
// src/views/ParentKidsMgmtView.jsx
import { useState, useCallback } from 'react';
import { useBudget } from '../context/BudgetContext.jsx';
import { db } from '../utils/supabase.js';
import { BottomSheet } from '../components/BottomSheet.jsx';

export function ParentKidsMgmtView() {
  const { kidsProfiles, setKidsProfiles, kidsMissions, setKidsMissions, householdId } = useBudget();
  const [selectedKidId, setSelectedKidId] = useState(kidsProfiles[0]?.id ?? null);
  const [showAddMission, setShowAddMission] = useState(false);

  const selectedKid = kidsProfiles.find(p => p.id === selectedKidId);
  const missions = kidsMissions.filter(m => m.kid_id === selectedKidId);
  const goalPct = selectedKid
    ? Math.min(100, Math.round((selectedKid.saved_amount / selectedKid.goal_amount) * 100))
    : 0;

  const handleReward = useCallback(async (mission) => {
    if (mission.status !== 'done') return;
    await db.completeMission(mission.id, 'rewarded');
    await db.rewardKid(mission.kid_id, mission.reward);
    setKidsMissions(prev => prev.map(m => m.id === mission.id ? { ...m, status: 'rewarded' } : m));
    setKidsProfiles(prev => prev.map(p =>
      p.id === mission.kid_id ? { ...p, saved_amount: p.saved_amount + mission.reward } : p
    ));
  }, [setKidsMissions, setKidsProfiles]);

  const handleAddMission = useCallback(async ({ title, reward }) => {
    if (!selectedKidId) return;
    const newMission = await db.createMission(selectedKidId, { title, reward, status: 'pending' });
    setKidsMissions(prev => [...prev, newMission]);
    setShowAddMission(false);
  }, [selectedKidId, setKidsMissions]);

  return (
    <div style={{ padding: '16px 16px 120px', overflowY: 'auto', height: '100%', background: 'var(--bg)' }}>
      {/* 아이 선택 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {kidsProfiles.map(kid => (
          <button
            key={kid.id}
            onClick={() => setSelectedKidId(kid.id)}
            style={{
              padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: selectedKidId === kid.id ? 'var(--gold)' : 'var(--bg2)',
              color: selectedKidId === kid.id ? '#fff' : 'var(--text2)',
              fontWeight: 700, fontSize: 13,
            }}
          >
            {kid.avatar} {kid.name}
          </button>
        ))}
      </div>

      {selectedKid && (
        <>
          {/* 목표 게이지 카드 */}
          <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>
              🎯 {selectedKid.goal_label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <span>{selectedKid.saved_amount.toLocaleString()}원</span>
              <span>{goalPct}%</span>
            </div>
            {/* 진행 바 */}
            <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${goalPct}%`,
                background: goalPct >= 100 ? 'var(--green)' : 'var(--gold)',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>
              목표: {selectedKid.goal_amount.toLocaleString()}원
            </div>
          </div>

          {/* 미션 목록 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>미션 목록</span>
              <button onClick={() => setShowAddMission(true)}
                style={{ background: 'var(--goldD)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + 미션 추가
              </button>
            </div>
            {missions.map(m => (
              <div key={m.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg2)', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                border: `1px solid ${m.status === 'rewarded' ? 'var(--greenD)' : 'var(--border)'}`,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--gold)' }}>+{m.reward.toLocaleString()}원</div>
                </div>
                {m.status === 'done' && (
                  <button onClick={() => handleReward(m)}
                    style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    보상 지급
                  </button>
                )}
                {m.status === 'rewarded' && <span style={{ fontSize: 18 }}>✅</span>}
                {m.status === 'pending' && <span style={{ fontSize: 18 }}>⏳</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 미션 추가 바텀 시트 */}
      {showAddMission && (
        <AddMissionSheet onAdd={handleAddMission} onClose={() => setShowAddMission(false)} />
      )}
    </div>
  );
}

// 미션 추가 바텀 시트
function AddMissionSheet({ onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');

  const handleSubmit = () => {
    if (!title.trim() || !Number(reward)) return;
    onAdd({ title: title.trim(), reward: Number(reward) });
  };

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>미션 추가</div>
        <input
          placeholder="미션 내용 (예: 레고 정리하기)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
        />
        <input
          type="number"
          placeholder="보상 금액 (원)"
          value={reward}
          onChange={e => setReward(e.target.value)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 20, outline: 'none', boxSizing: 'border-box' }}
        />
        <button onClick={handleSubmit}
          style={{ width: '100%', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          미션 등록
        </button>
      </div>
    </BottomSheet>
  );
}
```

---

## Phase 7: KidsView 구현

**파일**: `src/views/KidsView.jsx`

### 설계 원칙
- 숫자 최소화 → 시각적 게이지 중심
- 터치 기반 — 큰 터치 타겟 (최소 48px)
- 입체 돼지저금통 애니메이션 (CSS)
- AI 응원 메시지 (api/kids-coach.js 경유)

```jsx
// src/views/KidsView.jsx
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBudget } from '../context/BudgetContext.jsx';
import { CATS } from '../constants/index.js';

export function KidsView() {
  const { kidsProfiles, kidsMissions, myRole, addTx, householdId } = useBudget();
  // 현재 로그인 role에 연결된 아이 (추후 kid_id를 localStorage에서 읽어 연결)
  const kid = kidsProfiles[0]; // Phase 1에서는 단일 아이 지원
  const [nudge, setNudge] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const goalPct = kid
    ? Math.min(100, Math.round((kid.saved_amount / kid.goal_amount) * 100))
    : 0;

  // AI 응원 메시지 로드
  useEffect(() => {
    if (!kid) return;
    fetch('/api/kids-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kidName: kid.name, goalPct, goalLabel: kid.goal_label }),
    })
      .then(r => r.json())
      .then(d => setNudge(d.message ?? ''))
      .catch(() => {});
  }, [goalPct, kid]);

  // 100% 달성 시 축하
  useEffect(() => {
    if (goalPct >= 100) setShowCelebration(true);
  }, [goalPct]);

  // 아이 지출 탭 레코드
  const handleTap = (cat) => {
    if (!kid) return;
    addTx({
      date: new Date().toISOString().slice(0, 10),
      amount: 100, // 기본 금액 — 추후 NumPad 연결
      cat: cat.id,
      memo: cat.label,
      who: myRole,
      payMethod: 'allowance',
      type: 'expense',
    });
  };

  return (
    <div style={{
      padding: '24px 20px 120px', overflowY: 'auto', height: '100%',
      background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* 이름 + 인사 */}
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
        안녕, {kid?.name ?? '친구'}! 👋
      </div>

      {/* 돼지저금통 + 목표 게이지 */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        style={{ fontSize: 96, lineHeight: 1, marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setShowCelebration(true)}
      >
        🐷
      </motion.div>

      {/* 원형 게이지 */}
      <svg width={160} height={160} style={{ marginBottom: 8 }}>
        <circle cx={80} cy={80} r={70} fill="none" stroke="var(--bg3)" strokeWidth={14} />
        <circle
          cx={80} cy={80} r={70} fill="none"
          stroke={goalPct >= 100 ? 'var(--green, #22c55e)' : 'var(--gold)'}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 70}`}
          strokeDashoffset={`${2 * Math.PI * 70 * (1 - goalPct / 100)}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={80} y={84} textAnchor="middle" fill="var(--text)"
          fontSize={28} fontWeight="800" fontFamily="Pretendard, sans-serif">
          {goalPct}%
        </text>
      </svg>

      <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
        🎯 {kid?.goal_label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 24 }}>
        {kid?.saved_amount.toLocaleString()}원 / {kid?.goal_amount.toLocaleString()}원
      </div>

      {/* AI 응원 말풍선 */}
      {nudge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: 'var(--ai-bubble-from)', border: '1.5px solid var(--ai-bubble-border)',
            borderRadius: 16, padding: '14px 18px', marginBottom: 28, maxWidth: 320,
            fontSize: 14, color: 'var(--text)', lineHeight: 1.6, textAlign: 'center',
          }}
        >
          🤖 {nudge}
        </motion.div>
      )}

      {/* 탭-투-레코드 카테고리 그리드 */}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12, fontWeight: 700 }}>
        오늘 뭘 샀어?
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 320 }}>
        {CATS.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleTap(cat)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '18px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              cursor: 'pointer', minHeight: 80,
            }}
          >
            <span style={{ fontSize: 28 }}>{cat.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* 100% 달성 축하 오버레이 */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCelebration(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 500,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: 3, duration: 0.5 }}
              style={{ fontSize: 80 }}
            >🎉</motion.div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginTop: 16 }}>
              목표 달성!
            </div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 8 }}>
              {kid?.goal_label}을 살 수 있어요!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Phase 8: Kids Coach API

**파일**: `api/kids-coach.js`

```js
// api/kids-coach.js — Vercel Serverless Function
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return res.status(500).json({ error: 'API 키 없음' });

  const { kidName = '친구', goalPct = 0, goalLabel = '목표' } = req.body;

  const prompt = `당신은 어린이(5세) 친구인 따뜻한 AI 코치입니다.
아이 이름: ${kidName}
현재 목표 달성률: ${goalPct}%
목표: ${goalLabel}

지시사항:
1. 아이가 이해할 수 있는 쉬운 단어로 20자 이내 응원 한 문장을 써주세요.
2. 달성률에 맞는 톤: 0~30%는 격려, 31~70%는 칭찬, 71~99%는 흥분, 100%는 축하.
3. 이모지 1개를 문장 끝에 붙이세요.
4. 순수 텍스트만 반환하세요.`;

  try {
    const resp = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 40 },
      }),
    });
    if (!resp.ok) return res.status(resp.status).json({ error: 'Gemini API Error' });

    const data = await resp.json();
    const message = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '잘 하고 있어! 🌟').trim();
    return res.status(200).json({ message });
  } catch (err) {
    console.error('[kids-coach]', err);
    return res.status(500).json({ error: '코치 메시지 생성 실패' });
  }
}
```

---

## Phase 9: AI 응답 캐싱 및 Fallback 강화 (메모 반영)

> **[Antigravity 메모]** 동일 파라미터(급여, 고정비 등)로 반복 호출되는 AI 함수 결과를 Vercel KV(Redis)에 캐싱하면 응답 속도 향상 및 API 비용 절감. Gemini API 오류 시를 대비한 로컬 Fallback 알고리즘도 필수.

### 9-1. 캐싱 전략

| API | 캐시 키 | TTL | 이유 |
|-----|---------|-----|------|
| `budget-ai.js` | `budget:{salary}:{fixedTotal}:{month}` | 24h | 급여/고정비 바뀌지 않으면 동일 결과 |
| `nudge.js` | `nudge:{householdId}:{year}-{month}:{spentPct}` | 1h | 소비율 변할 때만 새 메시지 필요 |
| `kids-coach.js` | `kids:{kidId}:{goalPct}` | 30min | goalPct 단위 변화 전까지 동일 응원 |
| `ocr.js` | 캐싱 불필요 | — | 이미지마다 고유 입력 |

> **[Antigravity 메모] AI 캐시 키 고도화**: `txSummary` 전체를 캐시 키에서 제외하면 캐시 히트율이 높지만 AI가 소비 흐름을 놓침. 절충안: `txSummary`에서 상위 1~2개 카테고리명만 파싱해 키에 포함. 예: `budget:{salary}:{fixedTotal}:{top2cat}:{month}`. 정밀도와 캐시 효율을 동시에 확보.

### 9-2. Vercel KV 연동 (`budget-ai.js` 예시)

```js
// api/budget-ai.js — 캐싱 레이어 추가
import { kv } from '@vercel/kv';  // npm install @vercel/kv

export default async function handler(req, res) {
  // ... 기존 헤더/메서드 검사 유지 ...

  const { salary, fixedTotal, month, txSummary } = req.body;

  // 캐시 키 고도화: txSummary에서 상위 2개 카테고리명 추출 후 포함
  // (txSummary 예: "식비 320,000원\n교통 85,000원\n의류 120,000원")
  const top2cat = (txSummary ?? '')
    .split('\n')
    .slice(0, 2)
    .map(line => line.split(' ')[0])   // 첫 단어(카테고리명)만 추출
    .join('-') || 'none';
  const cacheKey = `budget:${salary}:${fixedTotal}:${top2cat}:${month}`;

  // 1. 캐시 히트 확인
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return res.status(200).json({ ...cached, fromCache: true });
  } catch (e) {
    console.warn('[budget-ai] KV 읽기 실패, 캐시 건너뜀:', e);
  }

  // 2. Gemini API 호출
  let result;
  try {
    result = await callGemini(/* ... */);
  } catch (e) {
    // 3. Fallback: 로컬 규칙 기반 예산 배분
    result = localBudgetFallback(salary, fixedTotal);
    return res.status(200).json({ ...result, fromFallback: true });
  }

  // 4. 캐시 저장 (TTL: 24시간)
  try {
    await kv.set(cacheKey, result, { ex: 86400 });
  } catch (e) {
    console.warn('[budget-ai] KV 쓰기 실패:', e);
  }

  return res.status(200).json(result);
}
```

### 9-3. 로컬 Fallback 알고리즘 (`budget-ai.js` 내)

```js
// Gemini 오류 시 실행되는 규칙 기반 예산 배분
function localBudgetFallback(salary, fixedTotal) {
  const disposable = salary - fixedTotal;
  if (disposable <= 0) return { budgets: INIT_BUDGETS, message: '고정비가 소득을 초과합니다.' };

  // 각 카테고리별 기본 비율 (합산 100%)
  const ratios = {
    food: 0.30, transport: 0.10, medical: 0.08,
    education: 0.15, housing: 0.05, culture: 0.08,
    clothing: 0.07, sub: 0.05, etc: 0.12,
  };

  // 1만원 단위 반올림
  const budgets = Object.fromEntries(
    Object.entries(ratios).map(([cat, ratio]) => [
      cat, Math.round((disposable * ratio) / 10000) * 10000
    ])
  );

  return { budgets, message: 'AI 서버 응답 불가로 기본 배분을 적용했습니다.' };
}
```

### 9-4. `nudge.js` 캐싱 (간소화)

```js
// api/nudge.js — TTL 1시간 캐싱 추가
const cacheKey = `nudge:${req.body.householdId}:${yearMonth}:${Math.floor(pct / 5)}`;
// pct를 5% 단위로 버림 → 미세한 소비율 변화에 과도한 API 호출 방지
```

---

## Phase 10: 렌더링 최적화 (메모 반영)

> **[Antigravity 메모]** 현재 `BudgetContext` 단일 Provider에 모든 state가 집중 → tx 업데이트 시 앱 전체 리렌더. Zustand/Jotai 같은 아토믹 상태 관리 + React.lazy 코드 분할로 체감 성능 대폭 향상 가능.

### 10-1. 개선 목표

현재 구조의 문제:
```
App.jsx Provider (모든 state) → 모든 view가 동일 context 구독
→ tx 1건 추가 시 HomeView, PrivateWalletView, DashboardView 등 전체 리렌더
```

목표 구조:
```
App.jsx → 분리된 slice별 Context or Zustand store
→ tx 구독 컴포넌트만 리렌더 (EntryView, HomeView:tx slice 등)
```

### 10-2. 단계적 마이그레이션 전략

**즉시 적용 가능 (Context 분리):**

```js
// src/context/TxContext.jsx — tx 전용 Context 분리
export const TxContext = createContext(null);

export function TxProvider({ children }) {
  // App.jsx에서 tx 관련 state/handler만 이 Provider로 이동
  const [tx, setTxRaw] = useState(EMPTY_TX);
  // addTx, deleteTx, editTx, addTxBatch, loadTxYear ...
  return <TxContext.Provider value={{ tx, addTx, deleteTx, editTx, addTxBatch, loadTxYear }}>{children}</TxContext.Provider>;
}
```

```js
// src/context/KidsContext.jsx — kids 전용 Context (신규 기능이므로 처음부터 분리)
export const KidsContext = createContext(null);
// kidsMode, kidsProfiles, kidsMissions, setKidsMode ...
```

**중장기 (Zustand 도입):**

```js
// src/stores/txStore.js — Zustand 스토어
import { create } from 'zustand';

export const useTxStore = create((set, get) => ({
  tx: [],
  addTx: (t) => set(s => ({ tx: [...s.tx, { ...t, id: Date.now() * 1000 + (Math.random() * 1000 | 0) }] })),
  deleteTx: (id) => set(s => ({ tx: s.tx.filter(t => t.id !== id) })),
  editTx: (id, updates) => set(s => ({ tx: s.tx.map(t => t.id === id ? { ...t, ...updates } : t) })),
}));
```

### 10-3. React.lazy 코드 분할

```js
// App.jsx — 뷰 컴포넌트 lazy 임포트로 전환
import { lazy, Suspense } from 'react';

const HomeView          = lazy(() => import('./views/HomeView.jsx'));
const DashboardView     = lazy(() => import('./views/DashboardView.jsx'));
const ReportView        = lazy(() => import('./views/ReportView.jsx'));
const PrivateWalletView = lazy(() => import('./views/PrivateWalletView.jsx'));
const KidsView          = lazy(() => import('./views/KidsView.jsx'));
const ParentKidsMgmtView = lazy(() => import('./views/ParentKidsMgmtView.jsx'));

// 렌더링 영역 Suspense 래핑
<Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
  <div style={{ fontSize: 24, animation: 'spin 1s linear infinite' }}>⟳</div>
</div>}>
  {view === 'home' && <HomeView {/* ...props */} />}
  {/* ... */}
</Suspense>
```

> **[Antigravity 메모] Zustand 마이그레이션 적기**: Kids 기능이 추가되면 Context 덩치가 2배 이상 불어남. 나중에 뜯어고치는 것보다 **지금 신규 추가되는 Kids 상태를 `KidsContext` 대신 `useKidsStore`(Zustand)로 처음부터 구축**하는 것을 권장. Zustand 작동 방식을 먼저 검증하고, 향후 기존 Tx 상태도 스토어로 안전하게 점진 이전 가능.

**따라서 Phase 10 계획 수정**: `KidsContext.jsx` 대신 `useKidsStore` (Zustand)를 Kids 첫 번째 Zustand 스토어로 사용.

```js
// src/stores/kidsStore.js — Kids 전용 Zustand 스토어 (KidsContext 대체)
import { create } from 'zustand';
import { db } from '../utils/supabase.js';

export const useKidsStore = create((set, get) => ({
  kidsMode:     false,
  kidsProfiles: [],
  kidsMissions: [],

  setKidsMode: async (v, householdId) => {
    set({ kidsMode: v });
    localStorage.setItem('kidsMode', JSON.stringify(v));
    if (householdId) await db.save(householdId, 'kidsMode', v).catch(console.error);
  },

  loadKids: async (householdId) => {
    const { data: profiles } = await supabase.from('kids_profiles').select('*').eq('household_id', householdId);
    if (!profiles) return;
    const { data: missions } = await supabase.from('kids_missions').select('*').in('kid_id', profiles.map(p => p.id));
    set({ kidsProfiles: profiles ?? [], kidsMissions: missions ?? [] });
  },

  addProfile: (profile) => set(s => ({ kidsProfiles: [...s.kidsProfiles, profile] })),

  rewardMission: (missionId, kidId, amount) => set(s => ({
    kidsMissions:  s.kidsMissions.map(m => m.id === missionId ? { ...m, status: 'rewarded' } : m),
    kidsProfiles:  s.kidsProfiles.map(p => p.id === kidId ? { ...p, saved_amount: Math.max(0, p.saved_amount + amount) } : p),
  })),
}));
```

> **우선순위**: Context 분리(TxContext) → React.lazy → `useKidsStore`(Zustand, Kids 신규 기능) → 기존 Tx 상태 Zustand 이전(장기).

---

## Phase 11: Kids Mode 토글 (SettingsView)

### SettingsView.jsx에 추가할 섹션

```jsx
// SettingsView.jsx — import useBudget 추가
import { useBudget } from '../context/BudgetContext.jsx';

// SettingsView 함수 내부 상단에:
const { kidsMode, setKidsMode } = useBudget();

// JSX — 기존 Card 섹션들 하단에 추가
<Card style={{ padding: '18px', marginBottom: 12 }}>
  <div style={{ fontSize: 11, color: 'var(--text2)', letterSpacing: '.06em', marginBottom: 16 }}>■ 아이 모드</div>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Kids Mode</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
        활성화 시 아이 전용 UI로 전환됩니다
      </div>
    </div>
    {/* 토글 스위치 */}
    <button
      onClick={() => setKidsMode(!kidsMode)}
      style={{
        width: 50, height: 28, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: kidsMode ? 'var(--gold)' : 'var(--bg4)',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: kidsMode ? 24 : 4,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  </div>
</Card>
```

---

## Phase 12: 라우팅 가드 및 Nav 연동

### App.jsx — Kids Mode 라우팅 가드

```jsx
// App.jsx — 뷰 렌더링 블록 내부
// kidsMode 활성화 시: private, admin, settings 고급 기능 차단 후 kids 뷰 강제

// 기존 뷰 렌더링 영역 (App.jsx:761 전후) 수정:
<div style={{ flex: 1, overflow: 'hidden', marginTop: 28 }}>
  {kidsMode ? (
    // Kids Mode — KidsView만 표시, 나머지 뷰 차단
    view === 'settings'
      ? <SettingsView {/* ...props */} />  // 설정은 부모가 kids 해제 위해 허용
      : <KidsView />
  ) : (
    // Normal Mode — 기존 라우팅 유지
    <>
      {view === 'home' && <HomeView {/* ...props */} />}
      {view === 'entry' && <EntryView {/* ...props */} />}
      {/* ... 나머지 뷰 ... */}
      {view === 'private' && <PrivateWalletView {/* ...props */} />}
    </>
  )}
</div>
```

### Nav.jsx — Kids Mode 시 변형

```jsx
// Nav.jsx — props에 kidsMode 추가
export function Nav({ view, setView, syncStatus, kidsMode }) {
  // kidsMode 시 좌측 네비를 home(kids)과 settings만 표시
  const LEFT  = kidsMode ? [{ id: 'home', Icon: Home, label: '홈' }] : LEFT_ITEMS;
  const RIGHT = kidsMode
    ? [{ id: 'settings', Icon: Menu, label: '설정' }]
    : RIGHT_ITEMS;

  // FAB는 kids 모드에서 숨김
  // ... 렌더링 로직에 kidsMode 조건 추가
}
```

---

## 구현 순서 로드맵

| 단계 | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| P0 | 폴더 정리 | `budget-v2/`, `archive/` 삭제 | 없음 |
| P1 | DB 스키마 + RLS 보강 | Supabase SQL 실행 | 없음 |
| P2 | BudgetContext 확장 | `context/BudgetContext.jsx`, `App.jsx` | P1 |
| P3 | offlineQueue + IndexedDB + Background Sync | `utils/offlineIDB.js`(신규), `utils/offlineQueue.js`, `App.jsx`, `public/sw.js` | P2 |
| P4 | Kids 테마 | `styles/theme.css`, `hooks/useTheme.js` | 없음 |
| P5 | supabase.js 메서드 추가 | `utils/supabase.js` | P1 |
| P6 | ParentKidsMgmtView | `views/ParentKidsMgmtView.jsx` | P2, P5 |
| P7 | KidsView | `views/KidsView.jsx` | P4, P8 |
| P8 | Kids Coach API | `api/kids-coach.js` | 없음 |
| P9 | AI 캐싱 + Fallback | `api/budget-ai.js`, `api/nudge.js`, `api/kids-coach.js` | P8 |
| P10 | 렌더링 최적화 | `context/TxContext.jsx`, `stores/kidsStore.js`(Zustand 신규), `App.jsx` | P2 |
| P11 | Settings 토글 | `views/SettingsView.jsx` | P2 |
| P12 | 라우팅 가드 + Nav | `App.jsx`, `components/Nav.jsx` | P2, P6, P7, P11 |

---

## 체크리스트

### Phase 0
- [ ] `budget-v2/` 삭제
- [ ] `archive/` 삭제

### Phase 1 (Supabase + RLS 보강)
- [ ] `transactions` 테이블 RLS 활성화 및 household 정책 확인
- [ ] `sos_requests` 테이블 RLS 활성화 및 household 정책 확인
- [ ] `kids_profiles` 테이블 생성 + RLS
- [ ] `kids_missions` 테이블 생성 + RLS (reward 음수 허용 확인)
- [ ] `transactions.kid_id` 컬럼 추가
- [ ] `increment_kid_savings` RPC 생성
- [ ] `complete_and_reward_mission` RPC 생성 (`GREATEST(0, saved_amount + v_reward)` 패널티 보호 포함)

### Phase 2 (Context)
- [ ] `BudgetContext.jsx` typedef 확장 (KidProfile, KidsMission)
- [ ] `App.jsx` — kidsMode state 추가 (kidsProfiles/kidsMissions는 P10 kidsStore로 이전)
- [ ] `App.jsx` — loadShared에 kidsMode 로드 추가
- [ ] `App.jsx` — updateSharedState에 kidsMode 케이스 추가
- [ ] `App.jsx` — budgetContextValue에 kidsMode + addTx/deleteTx/editTx 추가

### Phase 3 (Offline + IndexedDB + Background Sync)
- [ ] `utils/offlineIDB.js` 신규 생성 (openDB, idbEnqueue, idbDequeueAll, idbRemove)
- [ ] `utils/offlineQueue.js` — localStorage 큐를 IDB 큐 호출로 전환
- [ ] `public/sw.js` — `sync` 이벤트 핸들러: IDB 직접 읽고 Supabase REST 호출
- [ ] `App.jsx` — `enqueueWithSync` 헬퍼로 기존 enqueue 교체 + IDB flush 지원 handleOnline 수정

### Phase 4 (Theme)
- [ ] `theme.css` — kids 테마 추가
- [ ] `useTheme.js` — kidsMode 파라미터 추가
- [ ] `App.jsx` — useTheme(view, kidsMode) 호출 수정

### Phase 5 (DB 메서드)
- [ ] `supabase.js` — createKidProfile, updateKidProfile
- [ ] `supabase.js` — createMission, completeMission, rewardKid

### Phase 6 (ParentKidsMgmtView)
- [ ] 파일 생성
- [ ] KidSelector 탭 구현
- [ ] KidGoalCard 게이지 구현
- [ ] MissionList + 보상 지급 구현
- [ ] AddMissionSheet 구현

### Phase 7 (KidsView)
- [ ] 파일 생성
- [ ] 돼지저금통 SVG 원형 게이지 구현
- [ ] AI 응원 메시지 연동
- [ ] 탭-투-레코드 카테고리 그리드 구현
- [ ] 100% 달성 축하 오버레이 구현

### Phase 8 (Kids Coach API)
- [ ] `api/kids-coach.js` 생성

### Phase 9 (AI 캐싱 + Fallback)
- [ ] `@vercel/kv` 패키지 설치
- [ ] `api/budget-ai.js` — KV 캐싱 (top2cat 포함 키) + localBudgetFallback 추가
- [ ] `api/nudge.js` — KV 캐싱 (TTL 1h, pct 5% 단위 버림) 추가
- [ ] `api/kids-coach.js` — KV 캐싱 (TTL 30min) 추가

### Phase 10 (렌더링 최적화)
- [ ] `context/TxContext.jsx` 분리 생성
- [ ] `src/stores/kidsStore.js` 신규 생성 (Zustand, KidsContext 대체)
- [ ] `App.jsx` — React.lazy + Suspense로 뷰 컴포넌트 전환
- [ ] `ParentKidsMgmtView`, `KidsView` — `useBudget` 대신 `useKidsStore` 사용
- [ ] (중장기) Zustand `txStore.js` 도입 검토

### Phase 11 (Settings)
- [ ] SettingsView에 Kids Mode 토글 추가

### Phase 12 (Routing)
- [ ] App.jsx — kidsMode 라우팅 가드
- [ ] Nav.jsx — kidsMode props 추가 + 조건부 렌더링

---

## 주의 사항 및 안티패턴

### RLS 범위 (기존 + 신규 테이블 모두)
`transactions`, `sos_requests` 기존 테이블도 RLS 적용 여부를 Supabase 대시보드에서 반드시 확인. `kids_profiles`, `kids_missions` 신규 테이블도 동일. `current_setting('app.household_id', true)` 방식 또는 Supabase auth JWT 클레임 기반 정책 필수. 인증된 사용자라도 자신이 속한 household 외 데이터 접근 불가해야 함.

### IndexedDB + Background Sync 주의
- `SyncManager` API는 Chromium(Android Chrome, Edge)만 지원. iOS Safari 미지원 → `'SyncManager' in window` 조건부 등록 필수. 미지원 환경은 `handleOnline` fallback이 담당.
- SW에서 Supabase REST 직접 호출 시 `SUPABASE_KEY`(anon key)가 SW 코드에 노출됨. 빌드 시 환경변수 주입(`vite-plugin-pwa`의 `define`) 방식 사용, 소스코드에 하드코딩 금지.
- `offlineIDB.js`의 DB 버전(`open(DB_NAME, 1)`)을 변경할 경우 `onupgradeneeded`에서 기존 스토어 마이그레이션 로직 필수. 버전 올리면 기존 큐 유실 위험.

### Vercel KV 비용 주의
`@vercel/kv`는 무료 티어 한도(30MB, 월 30만 req)가 있음. `budget-ai.js` 캐시 키에 `top2cat`을 포함시켜 정밀도를 높이되, txSummary 전체 문자열은 절대 포함하지 말 것 → 키 폭발 방지. TTL 설정 누락 시 KV 용량 무한 증가 위험.

### 패널티 미션 — saved_amount 음수 방지
`complete_and_reward_mission` RPC에서 `GREATEST(0, saved_amount + v_reward)` 처리 필수. 클라이언트 낙관적 업데이트 시도 `rewardMission` (kidsStore)도 동일하게 `Math.max(0, ...)` 처리.

### KidsView에서 PrivateWalletView 차단
`kidsMode === true`일 때 `view === 'private'`로 라우팅 불가 처리. App.jsx 라우팅 가드에서 강제.

### addTx in Kids Mode
`KidsView`의 Tap-to-Record는 `addTx`를 호출하지만, `kid_id`와 `is_private: false`를 함께 전달해야 함. `db.insertTx`에 `kid_id` 필드 포함되도록 supabase.js 수정 필요.

### 미션 보상 원자성
`completeMission` + `rewardKid`는 별도 DB 호출 → 중간 실패 시 inconsistent state. PostgreSQL 트리거 또는 RPC로 원자화 권장:
```sql
CREATE OR REPLACE FUNCTION complete_and_reward_mission(p_mission_id bigint)
RETURNS void AS $$
DECLARE v_reward int; v_kid_id uuid;
BEGIN
  SELECT reward, kid_id INTO v_reward, v_kid_id FROM kids_missions WHERE id = p_mission_id;
  UPDATE kids_missions SET status = 'rewarded', completed_at = now() WHERE id = p_mission_id;
  UPDATE kids_profiles SET saved_amount = saved_amount + v_reward WHERE id = v_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
