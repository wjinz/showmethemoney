import React, { useState, useEffect, useCallback, useRef } from "react";
import { G } from "./styles/globalStyles.js";
import { validate } from "./utils/validate.js";
import { flush as flushOfflineQueue, enqueue as enqueueOffline, hasQueued } from "./utils/offlineQueue.js";
import {
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS,
  getYear,
} from "./constants/index.js";
import { HomeView } from "./views/HomeView.jsx";
import { EntryView } from "./views/EntryView.jsx";
import { ReportView } from "./views/ReportView.jsx";
import { FixedView } from "./views/FixedView.jsx";
import { SettingsView } from "./views/SettingsView.jsx";
import { AssetView } from "./views/AssetView.jsx";
import { SyncSetup } from "./views/SyncSetup.jsx";
import { WidgetView } from "./views/WidgetView.jsx";
import { Nav } from "./components/Nav.jsx";
import { InputModal } from "./components/InputModal.jsx";
import { QuickEntrySheet } from "./components/QuickEntrySheet.jsx";
import { useToast, ToastContainer } from "./components/Toast.jsx";
import { db, isSupabaseConfigured } from "./utils/supabase.js";
import { BudgetContext } from "./context/BudgetContext.jsx";

export default function App() {
  const [ready, setReady] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [householdId, setHouseholdId] = useState("");
  const [myRole, setMyRole] = useState("husband");
  const [view, setView] = useState("home");
  const [syncStatus, setSyncStatus] = useState("ok");
  const [lastSync, setLastSync] = useState(null);

  // 공유 데이터 필드들
  const [tx, setTxRaw] = useState(EMPTY_TX);
  const [fixed, setFixedRaw] = useState(EMPTY_FIXED);
  const [install, setInstallRaw] = useState(EMPTY_INSTALL);
  const [cards, setCardsRaw] = useState(EMPTY_CARDS);
  const [assets, setAssetsRaw] = useState(EMPTY_ASSETS);
  const [plan, setPlanRaw] = useState({});
  const [budgets, setBudgetsRaw] = useState(INIT_BUDGETS);
  const [names, setNamesRaw] = useState({ husband: "남편", wife: "와이프" });
  const [taxConfig, setTaxConfigRaw] = useState(DEFAULT_TAX_CONFIG);

  // 개인 설정 필드들
  const [sliderCfg, setSliderCfgRaw] = useState({ ...DEFAULT_SLIDER_CFG });
  const [theme, setThemeRaw] = useState("dark");
  const [modal, setModal] = useState(null);
  const [showWidget, setShowWidget] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const { toasts, addToast } = useToast();

  // 로컬/비공개 데이터 저장소
  const savePrivate = useCallback((key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error("private save error:", e); }
  }, []);

  // 로드된 연도 추적 (tx Lazy Loading용)
  const loadedTxYears = useRef(/** @type {Set<number>} */ (new Set()));

  // 공유 데이터 상태 업데이트 핸들러 (실시간 반영용)
  const updateSharedState = useCallback((key, value) => {
    // tx_YYYY 패턴 처리 (Task 4-2: 연도별 tx 분리)
    if (key.startsWith('tx_')) {
      const year = Number(key.slice(3));
      if (!isNaN(year) && loadedTxYears.current.has(year)) {
        // 해당 연도가 이미 로드된 경우에만 실시간 업데이트 반영
        setTxRaw(prev => {
          const filtered = prev.filter(t => {
            const [ty] = t.date.split('-').map(Number);
            return ty !== year;
          });
          return [...filtered, ...value];
        });
      }
      setLastSync(new Date());
      return;
    }
    switch(key) {
      case 'tx': setTxRaw(value); break; // 레거시 키 호환
      case 'fixed': setFixedRaw(value); break;
      case 'install': setInstallRaw(value); break;
      case 'cards': setCardsRaw(value); break;
      case 'assets': setAssetsRaw(value); break;
      case 'budgets': setBudgetsRaw(value); break;
      case 'names': setNamesRaw(value); break;
      case 'plan': setPlanRaw(value); break;
      case 'taxConfig': setTaxConfigRaw(value); break;
      default: break;
    }
    setLastSync(new Date());
  }, []);

  // Supabase 데이터 로드
  const loadShared = useCallback(async (hid) => {
    setSyncStatus("syncing");
    try {
      const allData = await db.loadAll(hid);

      // Task 4-2: tx 연도별 분리 로드
      // 1단계: 레거시 'tx' 키가 있으면 연도별로 마이그레이션
      if (Array.isArray(allData.tx) && allData.tx.length > 0) {
        console.log('[tx-migrate] 레거시 tx 키 감지 — 연도별 분리 마이그레이션 시작');
        /** @type {Object.<number, Array>} */
        const byYear = {};
        allData.tx.forEach(t => {
          const year = Number(String(t.date ?? '').slice(0, 4));
          if (!isNaN(year) && year > 2000) {
            if (!byYear[year]) byYear[year] = [];
            byYear[year].push(t);
          }
        });
        await Promise.all(
          Object.entries(byYear).map(([y, items]) => db.saveTx(hid, Number(y), items))
        );
        // 레거시 키를 빈 배열로 덮어써 중복 방지
        await db.save(hid, 'tx', []);
        console.log('[tx-migrate] 완료. 연도:', Object.keys(byYear).join(', '));
      }

      // 2단계: 현재 연도 tx만 로드 (성능 최적화)
      const currentYear = getYear();
      const curTx = await db.loadTx(hid, currentYear);
      setTxRaw(curTx);
      loadedTxYears.current.add(currentYear);

      if (allData.fixed) setFixedRaw(allData.fixed);
      if (allData.install) setInstallRaw(allData.install);
      if (allData.cards) {
        // Task 10-1: card.name -> card.label 마이그레이션
        const normalizedCards = allData.cards.map(c => c.label ? c : { ...c, label: c.name || "미지정" });
        setCardsRaw(normalizedCards);
        if (allData.cards.some(c => !Object.hasOwn(c, 'label'))) {
           await db.save(hid, "cards", normalizedCards);
        }
      }
      if (allData.assets) setAssetsRaw(allData.assets);
      if (allData.budgets) setBudgetsRaw(allData.budgets);
      if (allData.names) setNamesRaw(allData.names);
      if (allData.plan) {
        const loadedPlan = allData.plan;
        // Task 1-1: plan.monthlyIncome → plan.salary 마이그레이션 (1회성)
        if (loadedPlan.monthlyIncome && !loadedPlan.salary?.husband) {
          const migratedPlan = {
            ...loadedPlan,
            salary: {
              husband:       loadedPlan.monthlyIncome || 0,
              wife:          0,
              savingsTarget: loadedPlan.yearSavingGoal || 0,
            },
          };
          setPlanRaw(migratedPlan);
          await db.save(hid, "plan", migratedPlan);
        } else {
          setPlanRaw(loadedPlan);
        }
      }
      if (allData.taxConfig) setTaxConfigRaw(allData.taxConfig);
      setSyncStatus("ok");
    } catch(e) {
      console.error("Supabase load error:", e);
      setSyncStatus("error");
    }
  }, []);

  // 초기 실행 및 개인 설정 로드
  useEffect(() => {
    (async () => {
      try {
        const safeGet = (key) => {
          try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
          catch { return null; }
        };
        const savedHid    = safeGet("householdId");
        const savedRole   = safeGet("myRole");
        const savedSlider = safeGet("sliderCfg");
        const savedTheme  = safeGet("theme");

        if (savedSlider) setSliderCfgRaw(savedSlider);
        if (savedTheme) setThemeRaw(savedTheme);
        if (savedHid) {
          setHouseholdId(savedHid);
          setMyRole(savedRole || "husband");
          await loadShared(savedHid);
          setSetupDone(true);
        }
      } catch (e) { console.error("init error:", e); }
      finally { setReady(true); }
    })();
  }, [loadShared]);

  // 실시간 구독 활성화
  useEffect(() => {
    if (!setupDone || !householdId) return;
    const subscription = db.subscribe(householdId, (key, value) => {
      updateSharedState(key, value);
    });
    return () => { subscription.unsubscribe(); };
  }, [setupDone, householdId, updateSharedState]);

  // Task 5-3: 온라인 복구 시 오프라인 큐 flush
  useEffect(() => {
    if (!setupDone || !householdId) return;

    const handleOnline = async () => {
      if (!hasQueued()) return;
      console.log('[offlineQueue] 온라인 복구 감지 — 큐 flush 시작');
      setSyncStatus("syncing");
      const count = await flushOfflineQueue(db, householdId);
      if (count > 0) {
        setSyncStatus("ok");
        addToast(`☁ 오프라인 내역 ${count}건 동기화 완료`, "success");
        // 파트너 기기와 동기화 위해 최신 데이터 재로드
        await loadShared(householdId);
      } else {
        setSyncStatus("error");
        addToast("동기화 중 오류가 발생했습니다.", "error");
      }
    };

    window.addEventListener('online', handleOnline);
    return () => { window.removeEventListener('online', handleOnline); };
  }, [setupDone, householdId, loadShared, addToast]);

  // 공유 데이터 저장 도우미 (Supabase 전송) — validate + 지수 백오프 재시도 포함
  const setShared = useCallback(async (key, value, rawSetter) => {
    validate(key, value); // 스키마 불일치 경고 (Task 2-4)
    rawSetter(value);     // 낙관적 UI 업데이트

    // 오프라인 상태 시 큐에 저장 후 즉시 반환 (Task 5-3)
    if (!navigator.onLine) {
      enqueueOffline(key, value);
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    let retries = 0;
    while (retries < 3) {
      try {
        await db.save(householdId, key, value);
        setSyncStatus("ok");
        return;
      } catch (e) {
        retries++;
        if (retries === 3) {
          // 저장 실패 시 큐에 보관 (Task 5-3)
          enqueueOffline(key, value);
          console.error(`[sync] 저장 실패 (3회 시도) key=${key}:`, e);
          setSyncStatus("error");
        } else {
          await new Promise(r => setTimeout(r, 1000 * retries)); // 1s → 2s 백오프
        }
      }
    }
  }, [householdId]);

  // Task 4-2: tx 저장 시 연도별 키(tx_YYYY)로 분리 저장
  const setTx = useCallback(v => {
    const newTx = typeof v === 'function' ? v(tx) : v;
    // 연도별로 그룹핑하여 각 연도 키로 저장
    /** @type {Object.<number, Array>} */
    const byYear = {};
    newTx.forEach(t => {
      const year = Number(String(t.date ?? '').slice(0, 4));
      if (!isNaN(year) && year > 2000) {
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(t);
      }
    });
    // 로드된 연도 중 변경된 것만 저장 (각 연도별 upsert)
    const currentYear = getYear();
    const yearsToSave = Object.keys(byYear).map(Number);
    // 낙관적 UI 업데이트
    validate('tx', newTx);
    setTxRaw(newTx);
    setSyncStatus("syncing");
    // 비동기 저장 (각 연도별)
    const saveAll = async () => {
      let retries = 0;
      while (retries < 3) {
        try {
          // Task 8-2: 로드된 모든 연도에 대해 동기화 수행 (삭제로 인해 빈 연도가 된 경우 포함)
          const allLoadedYears = Array.from(loadedTxYears.current);
          await Promise.all(
            allLoadedYears.map(y => db.saveTx(householdId, y, byYear[y] ?? []))
          );
          setSyncStatus("ok");
          return;
        } catch (e) {
          retries++;
          if (retries === 3) {
            console.error(`[sync] tx 저장 실패 (3회 시도):`, e);
            setSyncStatus("error");
          } else {
            await new Promise(r => setTimeout(r, 1000 * retries));
          }
        }
      }
    };
    saveAll();
  }, [tx, householdId]);

  /**
   * 특정 과거 연도의 tx를 lazy 로드합니다.
   * CalendarView / ReportView에서 과거 연도 탐색 시 호출.
   * @param {number} year
   */
  const loadTxYear = useCallback(async (year) => {
    if (loadedTxYears.current.has(year)) return; // 이미 로드됨
    loadedTxYears.current.add(year); // 중복 요청 방지 (낙관적 마킹)
    try {
      const pastTx = await db.loadTx(householdId, year);
      setTxRaw(prev => {
        // 기존에 해당 연도 tx가 있으면 교체, 없으면 추가
        const filtered = prev.filter(t => {
          const [ty] = t.date.split('-').map(Number);
          return ty !== year;
        });
        return [...filtered, ...pastTx];
      });
    } catch (e) {
      console.error(`[loadTxYear] ${year}년 tx 로드 실패:`, e);
      loadedTxYears.current.delete(year); // 실패 시 재시도 허용
    }
  }, [householdId]);
  const setFixed = useCallback(v => setShared("fixed", typeof v === 'function' ? v(fixed) : v, setFixedRaw), [fixed, setShared]);
  const setInstall = useCallback(v => setShared("install", typeof v === 'function' ? v(install) : v, setInstallRaw), [install, setShared]);
  const setCards = useCallback(v => setShared("cards", typeof v === 'function' ? v(cards) : v, setCardsRaw), [cards, setShared]);
  const setAssets = useCallback(v => setShared("assets", typeof v === 'function' ? v(assets) : v, setAssetsRaw), [assets, setShared]);
  const setTaxConfig = useCallback(v => setShared("taxConfig", typeof v === 'function' ? v(taxConfig) : v, setTaxConfigRaw), [taxConfig, setShared]);
  const setPlan = useCallback(v => setShared("plan", typeof v === 'function' ? v(plan) : v, setPlanRaw), [plan, setShared]);
  const setBudgets = useCallback(v => setShared("budgets", typeof v === 'function' ? v(budgets) : v, setBudgetsRaw), [budgets, setShared]);
  const setNames = useCallback(v => setShared("names", v, setNamesRaw), [setShared]);

  const setSliderCfg = useCallback(v => { setSliderCfgRaw(v); savePrivate("sliderCfg", v); }, [savePrivate]);
  const setTheme = useCallback(v => { setThemeRaw(v); savePrivate("theme", v); }, [savePrivate]);

  const addTx = useCallback(t => setTx(ts => [...ts, { ...t, id: Date.now() }]), [setTx]);
  const deleteTx = useCallback(id => setTx(ts => ts.filter(t => t.id !== id)), [setTx]);
  const editTx = useCallback((id, updates) => setTx(ts => ts.map(t => t.id === id ? { ...t, ...updates } : t)), [setTx]);
  
  // -- 세분화된 초기화 함수들 (Task 12-1) --
  
  /** 1. 지출 내역만 초기화 */
  const resetTx = useCallback(async () => {
    setSyncStatus("syncing");
    await db.clearAllTransactions(householdId);
    // 레거시 'tx' 키도 혹시 모르니 정리
    await db.save(householdId, "tx", EMPTY_TX);
    setTxRaw(EMPTY_TX);
    loadedTxYears.current.clear();
    const curYear = getYear();
    loadedTxYears.current.add(curYear);
    setSyncStatus("ok");
    addToast("모든 지출 내역이 초기화되었습니다.");
  }, [householdId, addToast]);

  /** 2. 고정비 및 할부 초기화 */
  const resetFixed = useCallback(async () => {
    setSyncStatus("syncing");
    await Promise.all([
      db.save(householdId, "fixed", EMPTY_FIXED),
      db.save(householdId, "install", EMPTY_INSTALL)
    ]);
    setFixedRaw(EMPTY_FIXED);
    setInstallRaw(EMPTY_INSTALL);
    setSyncStatus("ok");
    addToast("고정비/할부 내역이 초기화되었습니다.");
  }, [householdId, addToast]);

  /** 3. 예산 설정 초기화 */
  const resetBudgets = useCallback(async () => {
    setSyncStatus("syncing");
    await db.save(householdId, "budgets", INIT_BUDGETS);
    setBudgetsRaw(INIT_BUDGETS);
    setSyncStatus("ok");
    addToast("카테고리별 예산이 초기화되었습니다.");
  }, [householdId, addToast]);

  /** 4. 기본 설정(이름, 플랜) 초기화 */
  const resetSetup = useCallback(async () => {
    setSyncStatus("syncing");
    await Promise.all([
      db.save(householdId, "plan", {}),
      db.save(householdId, "names", { husband: "남편", wife: "와이프" }),
      db.save(householdId, "taxConfig", DEFAULT_TAX_CONFIG)
    ]);
    setPlanRaw({});
    setNamesRaw({ husband: "남편", wife: "와이프" });
    setTaxConfigRaw(DEFAULT_TAX_CONFIG);
    setSyncStatus("ok");
    addToast("사용자 설정이 초기화되었습니다.");
  }, [householdId, addToast]);

  /** 전체 초기화 */
  const resetAll = useCallback(async () => {
    setSyncStatus("syncing");
    await Promise.all([
      db.clearAllTransactions(householdId),
      db.save(householdId, "tx", EMPTY_TX),
      db.save(householdId, "fixed", EMPTY_FIXED),
      db.save(householdId, "install", EMPTY_INSTALL),
      db.save(householdId, "cards", EMPTY_CARDS),
      db.save(householdId, "assets", EMPTY_ASSETS),
      db.save(householdId, "plan", {}),
      db.save(householdId, "budgets", INIT_BUDGETS),
      db.save(householdId, "taxConfig", DEFAULT_TAX_CONFIG)
    ]);
    await loadShared(householdId);
    setSyncStatus("ok");
    addToast("전체 데이터가 초기화되었습니다.");
  }, [householdId, loadShared, addToast]);

  const leaveHousehold = useCallback(async () => {
    await savePrivate("householdId", null);
    setHouseholdId(""); setSetupDone(false);
  }, [savePrivate]);

  const handleSetupDone = useCallback(async (hid, role) => {
    setHouseholdId(hid);
    setMyRole(role);
    await savePrivate("householdId", hid);
    await savePrivate("myRole", role);
    await loadShared(hid);
    setSetupDone(true);
  }, [loadShared, savePrivate]);

  if (!isSupabaseConfigured) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root" style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div className="serif" style={{ fontSize: 20 }}>설정 오류</div>
        <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
          Supabase 환경 변수가 설정되지 않았습니다.<br/>
          Vercel 대시보드에서 <b>VITE_SUPABASE_URL</b> 및 <b>VITE_SUPABASE_ANON_KEY</b>를 확인해 주세요.
        </div>
      </div>
    </>
  );

  if (!ready) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root" style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>초기화 중...</div>
      </div>
    </>
  );

  if (!setupDone) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className={`app-root${theme === "light" ? " light" : ""}`}>
        <SyncSetup onDone={handleSetupDone} />
      </div>
    </>
  );

  const SyncBar = () => (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 200,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "6px 14px",
      background: syncStatus === "error" ? "var(--redD)" : "var(--bg3)",
      borderBottom: `1px solid ${syncStatus === "error" ? "rgba(170,32,32,.3)" : "var(--border)"}`,
      fontSize: 10, color: syncStatus === "error" ? "var(--red)" : "var(--text3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: syncStatus === "syncing" ? "var(--gold)" : syncStatus === "error" ? "var(--red)" : "var(--green)",
          animation: syncStatus === "syncing" ? "pulse 1s infinite" : "none"
        }} />
        <span>{syncStatus === "error" ? "연결 끊김" : syncStatus === "syncing" ? "데이터 전송 중" : "실시간 클라우드 연결됨"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ letterSpacing: ".08em", fontWeight: 700, color: "var(--gold)" }}>{householdId}</span>
        <span style={{
          background: myRole === "husband" ? "var(--hD)" : "var(--wD)",
          color: myRole === "husband" ? "var(--h)" : "var(--w)",
          padding: "1px 7px", borderRadius: 99, fontWeight: 700, fontSize: 9
        }}>{myRole === "husband" ? names.husband : names.wife}</span>
      </div>
    </div>
  );

  const budgetContextValue = {
    tx, setTx, loadTxYear, budgets, setBudgets, plan, setPlan, names, setNames,
    fixed, setFixed, install, setInstall, cards, setCards, assets, setAssets,
    syncStatus, householdId, myRole,
  };

  return (
    <BudgetContext.Provider value={budgetContextValue}>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className={`app-root${theme === "light" ? " light" : ""}`}
        style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SyncBar />
        <div style={{ flex: 1, overflow: "hidden", marginTop: 28 }}>
          {view === "home" && <HomeView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} onAdd={setModal} sliderCfg={sliderCfg} onWidget={() => setShowWidget(true)} plan={plan} setPlan={setPlan} cards={cards} onEdit={editTx} onDelete={deleteTx} />}
          {view === "entry" && <EntryView names={names} onSave={addTx} onDelete={deleteTx} onEdit={editTx} tx={tx} cards={cards} />}
          {view === "report" && <ReportView tx={tx} budgets={budgets} setBudgets={setBudgets} fixed={fixed} install={install} names={names} cards={cards} plan={plan} setPlan={setPlan} taxConfig={taxConfig} setTaxConfig={setTaxConfig} onEdit={editTx} onDelete={deleteTx} loadTxYear={loadTxYear} assets={assets} setAssets={setAssets} />}
          {view === "fixed" && <FixedView fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} setCards={setCards} tx={tx} names={names} sliderCfg={sliderCfg} />}
          {view === "settings" && <SettingsView names={names} setNames={setNames} budgets={budgets} setBudgets={setBudgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} theme={theme} setTheme={setTheme} resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed} resetBudgets={resetBudgets} resetSetup={resetSetup} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} plan={plan} />}
        </div>
        <Nav view={showQuickEntry ? "quickEntry" : view} setView={v => v === "quickEntry" ? setShowQuickEntry(true) : setView(v)} syncStatus={syncStatus} />
        {modal && <InputModal defaultWho={modal} names={names} plan={plan} onClose={() => setModal(null)} onSave={addTx} />}
        {showWidget && <WidgetView tx={tx} budgets={budgets} names={names} onClose={() => setShowWidget(false)} />}
        {showQuickEntry && <QuickEntrySheet names={names} plan={plan} cards={cards} tx={tx} onSave={addTx} onClose={() => setShowQuickEntry(false)} />}
        <ToastContainer toasts={toasts} />
      </div>
    </BudgetContext.Provider>
  );
}
