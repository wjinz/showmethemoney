import React, { useState, useEffect, useCallback, useRef } from "react";
import { G } from "./src/styles/globalStyles";
import { 
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, 
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS
} from "./src/constants";
import { HomeView } from "./src/views/HomeView";
import { EntryView } from "./src/views/EntryView";
import { ReportView } from "./src/views/ReportView";
import { FixedView } from "./src/views/FixedView";
import { SettingsView } from "./src/views/SettingsView";
import { AssetView } from "./src/views/AssetView";
import { SyncSetup } from "./src/views/SyncSetup";
import { Nav } from "./src/components/Nav";
import { InputModal } from "./src/components/InputModal";

export default function App() {
  const [ready, setReady] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [householdId, setHouseholdId] = useState("");
  const [myRole, setMyRole] = useState("husband");
  const [view, setView] = useState("home");
  const [syncStatus, setSyncStatus] = useState("ok");
  const [lastSync, setLastSync] = useState(null);

  // 공유 데이터
  const [tx, setTxRaw] = useState(EMPTY_TX);
  const [fixed, setFixedRaw] = useState(EMPTY_FIXED);
  const [install, setInstallRaw] = useState(EMPTY_INSTALL);
  const [cards, setCardsRaw] = useState(EMPTY_CARDS);
  const [assets, setAssetsRaw] = useState(EMPTY_ASSETS);
  const [plan, setPlanRaw] = useState({});
  const [budgets, setBudgetsRaw] = useState(INIT_BUDGETS);
  const [names, setNamesRaw] = useState({ husband: "남편", wife: "와이프" });

  // 개인 설정
  const [sliderCfg, setSliderCfgRaw] = useState({ ...DEFAULT_SLIDER_CFG });
  const [theme, setThemeRaw] = useState("dark");
  const [modal, setModal] = useState(null);

  const storeGet = useCallback(async (key) => {
    try { return await window.storage.get(key); } catch { return null; }
  }, []);

  const loadShared = useCallback(async (hid) => {
    const k = (key) => `${hid}_${key}`;
    const load = async (key, fallback) => {
      try {
        const r = await storeGet(key);
        return r ? JSON.parse(r.value) : fallback;
      } catch { return fallback; }
    };
    const [savedTx, savedFixed, savedInstall, savedCards, savedAssets, savedBudgets, savedNames, savedPlan] =
      await Promise.all([
        load(k("tx"), EMPTY_TX),
        load(k("fixed"), EMPTY_FIXED),
        load(k("install"), EMPTY_INSTALL),
        load(k("cards"), EMPTY_CARDS),
        load(k("assets"), EMPTY_ASSETS),
        load(k("budgets"), INIT_BUDGETS),
        load(k("names"), { husband: "남편", wife: "와이프" }),
        load(k("plan"), {}),
      ]);
    setTxRaw(savedTx);
    setFixedRaw(savedFixed);
    setInstallRaw(savedInstall);
    setCardsRaw(savedCards);
    setAssetsRaw(savedAssets);
    setBudgetsRaw(savedBudgets);
    setNamesRaw(savedNames);
    setPlanRaw(savedPlan);
  }, [storeGet]);

  useEffect(() => {
    (async () => {
      try {
        const safeGet = async (key) => {
          try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
          catch { return null; }
        };
        const [savedHid, savedRole, savedSlider, savedTheme] = await Promise.all([
          safeGet("householdId"),
          safeGet("myRole"),
          safeGet("sliderCfg"),
          safeGet("theme"),
        ]);
        if (savedSlider) setSliderCfgRaw(savedSlider);
        if (savedTheme) setThemeRaw(savedTheme);
        if (savedHid) {
          setHouseholdId(savedHid);
          setMyRole(savedRole || "husband");
          await loadShared(savedHid);
          setSetupDone(true);
        }
      } catch (e) { console.error("load error:", e); }
      finally { setReady(true); }
    })();
  }, [loadShared]);

  const pollRef = useRef(null);
  useEffect(() => {
    if (!setupDone || !householdId) return;
    const poll = async () => {
      setSyncStatus("syncing");
      try {
        await loadShared(householdId);
        setSyncStatus("ok");
        setLastSync(new Date());
      } catch { setSyncStatus("error"); }
    };
    pollRef.current = setInterval(poll, 5000);
    return () => clearInterval(pollRef.current);
  }, [setupDone, householdId, loadShared]);

  const saveShared = useCallback(async (key, value) => {
    try { await window.storage.set(`${householdId}_${key}`, JSON.stringify(value)); }
    catch (e) { console.error("save error:", e); }
  }, [householdId]);

  const savePrivate = useCallback(async (key, value) => {
    try { await window.storage.set(key, JSON.stringify(value)); }
    catch (e) { console.error("save error:", e); }
  }, []);

  const setTx = useCallback(updater => {
    setTxRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("tx", next); return next;
    });
  }, [saveShared]);

  const setFixed = useCallback(updater => {
    setFixedRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("fixed", next); return next;
    });
  }, [saveShared]);

  const setInstall = useCallback(updater => {
    setInstallRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("install", next); return next;
    });
  }, [saveShared]);

  const setCards = useCallback(updater => {
    setCardsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("cards", next); return next;
    });
  }, [saveShared]);

  const setAssets = useCallback(updater => {
    setAssetsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("assets", next); return next;
    });
  }, [saveShared]);

  const setPlan = useCallback(updater => {
    setPlanRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("plan", next); return next;
    });
  }, [saveShared]);

  const setBudgets = useCallback(updater => {
    setBudgetsRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveShared("budgets", next); return next;
    });
  }, [saveShared]);

  const setNames = useCallback(v => {
    setNamesRaw(v); saveShared("names", v);
  }, [saveShared]);

  const setSliderCfg = useCallback(updater => {
    setSliderCfgRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePrivate("sliderCfg", next); return next;
    });
  }, [savePrivate]);

  const setTheme = useCallback(v => {
    setThemeRaw(v); savePrivate("theme", v);
  }, [savePrivate]);

  const addTx = useCallback(t => setTx(ts => [...ts, { ...t, id: Date.now() }]), [setTx]);
  const deleteTx = useCallback(id => setTx(ts => ts.filter(t => t.id !== id)), [setTx]);

  const resetAll = useCallback(async () => {
    setTxRaw(EMPTY_TX); await saveShared("tx", EMPTY_TX);
    setFixedRaw(EMPTY_FIXED); await saveShared("fixed", EMPTY_FIXED);
    setInstallRaw(EMPTY_INSTALL); await saveShared("install", EMPTY_INSTALL);
    setCardsRaw(EMPTY_CARDS); await saveShared("cards", EMPTY_CARDS);
    setAssetsRaw(EMPTY_ASSETS); await saveShared("assets", EMPTY_ASSETS);
    setPlanRaw({}); await saveShared("plan", {});
    setBudgetsRaw(INIT_BUDGETS); await saveShared("budgets", INIT_BUDGETS);
  }, [saveShared]);

  const leaveHousehold = useCallback(async () => {
    clearInterval(pollRef.current);
    await savePrivate("householdId", null);
    setHouseholdId(""); setSetupDone(false);
    setTxRaw(EMPTY_TX); setFixedRaw(EMPTY_FIXED);
    setInstallRaw(EMPTY_INSTALL); setCardsRaw(EMPTY_CARDS);
    setAssetsRaw(EMPTY_ASSETS); setBudgetsRaw(INIT_BUDGETS);
    setNamesRaw({ husband: "남편", wife: "와이프" });
  }, [savePrivate]);

  const handleSetupDone = useCallback(async (hid, role) => {
    setHouseholdId(hid);
    setMyRole(role);
    await loadShared(hid);
    setSetupDone(true);
  }, [loadShared]);

  if (!ready) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root" style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⟳</div>
        <div style={{ fontSize: 13, color: "var(--text2)" }}>불러오는 중...</div>
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
        <span>{syncStatus === "error" ? "동기화 오류" : syncStatus === "syncing" ? "동기화 중..." : "실시간 연결됨"}</span>
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
          {view === "home" && <HomeView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} onAdd={setModal} sliderCfg={sliderCfg} />}
          {view === "entry" && <EntryView names={names} onSave={addTx} onDelete={deleteTx} tx={tx} cards={cards} />}
          {view === "report" && <ReportView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} cards={cards} plan={plan} setPlan={setPlan} />}
          {view === "asset" && <AssetView assets={assets} setAssets={setAssets} />}
          {view === "fixed" && <FixedView fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} setCards={setCards} tx={tx} names={names} sliderCfg={sliderCfg} />}
          {view === "settings" && <SettingsView names={names} setNames={setNames} budgets={budgets} setBudgets={setBudgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} theme={theme} setTheme={setTheme} resetAll={resetAll} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} />}
        </div>
        <Nav view={view} setView={setView} />
        {modal && <InputModal defaultWho={modal} names={names} onClose={() => setModal(null)} onSave={addTx} />}
      </div>
    </>
  );
}
