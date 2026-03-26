import React, { useState, useEffect, useCallback, useRef } from "react";
import { G } from "./styles/globalStyles";
import { 
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS
} from "./constants";
import { HomeView } from "./views/HomeView";
import { EntryView } from "./views/EntryView";
import { ReportView } from "./views/ReportView";
import { FixedView } from "./views/FixedView";
import { SettingsView } from "./views/SettingsView";
import { AssetView } from "./views/AssetView";
import { SyncSetup } from "./views/SyncSetup";
import { WidgetView } from "./views/WidgetView";
import { Nav } from "./components/Nav";
import { InputModal } from "./components/InputModal";
import { db } from "./utils/supabase";

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

  // 로컬/비공개 데이터 저장소
  const savePrivate = useCallback((key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error("private save error:", e); }
  }, []);

  // 공유 데이터 상태 업데이트 핸들러 (실시간 반영용)
  const updateSharedState = useCallback((key, value) => {
    switch(key) {
      case 'tx': setTxRaw(value); break;
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
      if (allData.tx) setTxRaw(allData.tx);
      if (allData.fixed) setFixedRaw(allData.fixed);
      if (allData.install) setInstallRaw(allData.install);
      if (allData.cards) setCardsRaw(allData.cards);
      if (allData.assets) setAssetsRaw(allData.assets);
      if (allData.budgets) setBudgetsRaw(allData.budgets);
      if (allData.names) setNamesRaw(allData.names);
      if (allData.plan) setPlanRaw(allData.plan);
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

  // 공유 데이터 저장 도우미 (Supabase 전송)
  const setShared = useCallback(async (key, value, rawSetter) => {
    rawSetter(value);
    setSyncStatus("syncing");
    try {
      await db.save(householdId, key, value);
      setSyncStatus("ok");
    } catch(e) {
      console.error(`Save error for ${key}:`, e);
      setSyncStatus("error");
    }
  }, [householdId]);

  const setTx = useCallback(v => setShared("tx", typeof v === 'function' ? v(tx) : v, setTxRaw), [tx, setShared]);
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

  const resetAll = useCallback(async () => {
    const promises = [
      db.save(householdId, "tx", EMPTY_TX),
      db.save(householdId, "fixed", EMPTY_FIXED),
      db.save(householdId, "install", EMPTY_INSTALL),
      db.save(householdId, "cards", EMPTY_CARDS),
      db.save(householdId, "assets", EMPTY_ASSETS),
      db.save(householdId, "plan", {}),
      db.save(householdId, "budgets", INIT_BUDGETS),
      db.save(householdId, "taxConfig", DEFAULT_TAX_CONFIG)
    ];
    await Promise.all(promises);
    await loadShared(householdId);
  }, [householdId, loadShared]);

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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className={`app-root${theme === "light" ? " light" : ""}`}
        style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SyncBar />
        <div style={{ flex: 1, overflow: "hidden", marginTop: 28 }}>
          {view === "home" && <HomeView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} onAdd={setModal} sliderCfg={sliderCfg} onWidget={() => setShowWidget(true)} />}
          {view === "entry" && <EntryView names={names} onSave={addTx} onDelete={deleteTx} onEdit={editTx} tx={tx} cards={cards} />}
          {view === "report" && <ReportView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} cards={cards} plan={plan} setPlan={setPlan} taxConfig={taxConfig} setTaxConfig={setTaxConfig} />}
          {view === "asset" && <AssetView assets={assets} setAssets={setAssets} />}
          {view === "fixed" && <FixedView fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} setCards={setCards} tx={tx} names={names} sliderCfg={sliderCfg} />}
          {view === "settings" && <SettingsView names={names} setNames={setNames} budgets={budgets} setBudgets={setBudgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} theme={theme} setTheme={setTheme} resetAll={resetAll} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} />}
        </div>
        <Nav view={view} setView={setView} />
        {modal && <InputModal defaultWho={modal} names={names} onClose={() => setModal(null)} onSave={addTx} />}
        {showWidget && <WidgetView tx={tx} budgets={budgets} names={names} onClose={() => setShowWidget(false)} />}
      </div>
    </>
  );
}
