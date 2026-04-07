import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";

/**
 * @typedef {import('./constants/index.js').TxItem} TxItem
 * @typedef {import('./constants/index.js').FixedItem} FixedItem
 * @typedef {import('./constants/index.js').InstallItem} InstallItem
 * @typedef {import('./constants/index.js').CardItem} CardItem
 * @typedef {import('./constants/index.js').SosRequest} SosRequest
 * @typedef {import('./constants/index.js').WidgetLayoutItem} WidgetLayoutItem
 */
import { G } from "./styles/globalStyles.js";
import "./styles/theme.css";
import { validate } from "./utils/validate.js";
import { flush as flushOfflineQueue, enqueue as enqueueOffline, hasQueued, flushTxQueue, hasTxQueued } from "./utils/offlineQueue.js";
import { idbEnqueue } from "./utils/offlineIDB.js";
import { useKidsStore } from "./stores/kidsStore.js";
import {
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS, EMPTY_PLAN,
  DEFAULT_WIDGET_LAYOUT, DEFAULT_HOME_LAYOUT,
  getYear,
} from "./constants/index.js";
import { useTheme } from "./hooks/useTheme.js";
import { SyncSetup } from "./views/SyncSetup.jsx";
const HomeView           = lazy(() => import("./views/HomeView.jsx").then(m => ({ default: m.HomeView })));
const EntryView          = lazy(() => import("./views/EntryView.jsx").then(m => ({ default: m.EntryView })));
const ReportView         = lazy(() => import("./views/ReportView.jsx").then(m => ({ default: m.ReportView })));
const SettingsView       = lazy(() => import("./views/SettingsView.jsx").then(m => ({ default: m.SettingsView })));
const WidgetView         = lazy(() => import("./views/WidgetView.jsx").then(m => ({ default: m.WidgetView })));
const DashboardView      = lazy(() => import("./views/DashboardView.jsx").then(m => ({ default: m.DashboardView })));
const PrivateWalletView  = lazy(() => import("./views/PrivateWalletView.jsx").then(m => ({ default: m.PrivateWalletView })));
const BudgetView         = lazy(() => import("./views/BudgetView.jsx").then(m => ({ default: m.BudgetView })));
const AdminView          = lazy(() => import("./views/AdminView.jsx").then(m => ({ default: m.AdminView })));
const KidsView           = lazy(() => import("./views/KidsView.jsx").then(m => ({ default: m.KidsView })));
const ParentKidsMgmtView = lazy(() => import("./views/ParentKidsMgmtView.jsx").then(m => ({ default: m.ParentKidsMgmtView })));
import { Nav } from "./components/Nav.jsx";
import { InputModal } from "./components/InputModal.jsx";
import { BugReportModal } from "./components/BugReportModal.jsx";
import { AdminLoginModal } from "./components/AdminLoginModal.jsx";
import { QuickEntrySheet } from "./components/QuickEntrySheet.jsx";
import { SosPendingSheet } from "./components/SosPendingSheet.jsx";
import { SosRequestSheet } from "./components/SosRequestSheet.jsx";
import { useToast, ToastContainer } from "./components/Toast.jsx";
import { db, isSupabaseConfigured } from "./utils/supabase.js";
import { BudgetContext } from "./context/BudgetContext.jsx";
import { CardScanSheet } from "./components/CardScanSheet.jsx";

export default function App() {
  const [ready, setReady] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [householdId, setHouseholdId] = useState("");
  const [myRole, setMyRole] = useState("husband");
  const [view, setView] = useState("home");
  const [syncStatus, setSyncStatus] = useState("ok");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [lastSync, setLastSync] = useState(/** @type {Date|null} */ (null));

  // 위젯 레이아웃 상태
  const [widgetLayout, setWidgetLayoutRaw] = useState(DEFAULT_WIDGET_LAYOUT);
  const [homeLayout, setHomeLayoutRaw] = useState(DEFAULT_HOME_LAYOUT);

  // SOS 상태 통합 관리 (내가 보낸 요청 & 받은 요청 모두)
  const [sosRequests, setSosRequests] = useState(/** @type {SosRequest[]} */ ([]));
  const [showSosRequest, setShowSosRequest] = useState(false);
  const [showSosPending, setShowSosPending] = useState(false);

  // 펜딩된 요청들 (상대방이 보낸 것)
  const sosPending = useMemo(() => 
    sosRequests.filter(r => r.requester !== myRole && r.status === 'pending'),
    [sosRequests, myRole]
  );
  // 내가 보낸 펜딩 요청 (진행 상황 확인용)
  const mySosPending = useMemo(() =>
    sosRequests.filter(r => r.requester === myRole && r.status === 'pending'),
    [sosRequests, myRole]
  );

  // Kids Mode 상태 (useTheme보다 먼저 선언)
  const [kidsMode, setKidsModeRaw] = useState(false);

  // 뷰에 따른 테마 전환 (joint ↔ private ↔ kids)
  useTheme(view, kidsMode);

  // 공유 데이터 필드들
  const [tx, setTxRaw] = useState(EMPTY_TX);
  const [fixed, setFixedRaw] = useState(EMPTY_FIXED);
  const [install, setInstallRaw] = useState(EMPTY_INSTALL);
  const [cards, setCardsRaw] = useState(EMPTY_CARDS);
  const [assets, setAssetsRaw] = useState(EMPTY_ASSETS);
  const [plan, setPlanRaw] = useState(EMPTY_PLAN);
  const [budgets, setBudgetsRaw] = useState(INIT_BUDGETS);
  const [names, setNamesRaw] = useState({ husband: "남편", wife: "와이프" });
  const [taxConfig, setTaxConfigRaw] = useState(DEFAULT_TAX_CONFIG);

  // -- 입력 지연(Debounce) 타이머 관리 (Task 15-1) --
  const saveTimers = useRef({});

  // 개인 설정 필드들
  const [sliderCfg, setSliderCfgRaw] = useState({ ...DEFAULT_SLIDER_CFG });
  const [theme, setThemeRaw] = useState("dark");
  const [modal, setModal] = useState(null);
  const [showWidget, setShowWidget] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showCardScan, setShowCardScan] = useState(false);
  const { toasts, addToast } = useToast();

  // kidsMode 토글 — localStorage + DB에 동기화
  const setKidsMode = useCallback(/** @param {boolean} v */ (v) => {
    setKidsModeRaw(v);
    try { localStorage.setItem('kidsMode', JSON.stringify(v)); } catch {}
    if (householdId) db.save(householdId, 'kidsMode', v).catch(console.error);
  }, [householdId]);

  // 로컬/비공개 데이터 저장소
  const savePrivate = useCallback((key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error("private save error:", e); }
  }, []);

  // 로드된 연도 추적 (tx Lazy Loading용)
  const loadedTxYears = useRef(/** @type {Set<number>} */ (new Set()));
  // tx가 로컬에서 변경됐는지 추적 (서버 로드 시 false, 로컬 변경 시 true)
  const txDirty = useRef(false);
  // 디바운스 저장 타이머
  const txSaveTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));

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
      case 'widgetLayout': setWidgetLayoutRaw(value); break;
      case 'homeLayout': setHomeLayoutRaw(value || DEFAULT_HOME_LAYOUT); break;
      case 'kidsMode': setKidsModeRaw(value); break;
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
      txDirty.current = false; // 서버에서 로드 — 저장 트리거 방지
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
      if (allData.widgetLayout) setWidgetLayoutRaw(allData.widgetLayout);
      if (allData.homeLayout) setHomeLayoutRaw(allData.homeLayout);
      if (typeof allData.kidsMode === 'boolean') setKidsModeRaw(allData.kidsMode);

      // SOS 요청 초기 로드
      const sosData = await db.loadPendingSos(hid);
      setSosRequests(sosData);

      // migrateToRdb: tx_YYYY 데이터를 transactions 테이블로 마이그레이션 (1회성)
      if (allData['migrated_to_rdb'] !== true) {
        const txEntries = Object.entries(allData)
          .filter(([k]) => /^tx_\d{4}$/.test(k))
          .flatMap(([, rows]) => Array.isArray(rows) ? rows : []);
        if (txEntries.length > 0) {
          try {
            await db.insertTxBatch(hid, txEntries);
            console.log('[migrate] tx → transactions 완료:', txEntries.length, '건');
          } catch (e) {
            console.warn('[migrate] insertTxBatch 실패 (transactions 테이블 없을 수 있음):', e);
          }
        }
        try {
          await db.save(hid, 'migrated_to_rdb', true);
        } catch (e) {
          console.warn('[migrate] 플래그 저장 실패:', e);
        }
      }

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
        const savedIsAdmin = safeGet("isAdmin");

        if (savedSlider) {
          setSliderCfgRaw(prev => ({ ...DEFAULT_SLIDER_CFG, ...savedSlider }));
        }
        if (savedTheme) setThemeRaw(savedTheme);
        if (savedIsAdmin) setIsAdmin(true);
        const savedKidsMode = safeGet('kidsMode');
        if (typeof savedKidsMode === 'boolean') setKidsModeRaw(savedKidsMode);
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
      if (!hasQueued() && !hasTxQueued()) return;
      console.log('[offlineQueue] 온라인 복구 감지 — 큐 flush 시작');
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

    window.addEventListener('online', handleOnline);
    return () => { window.removeEventListener('online', handleOnline); };
  }, [setupDone, householdId, loadShared, addToast]);
  
  // PWA Share Target 핸들러 (Task 2-3)
  useEffect(() => {
    /** @param {any} e */
    const handleShare = (e) => {
      const { type, buf, name, text } = e.detail;
      if (type === 'SHARE_IMAGE' && buf) {
        // 이미지가 공유된 경우: 카드 스캔 레이어로 전달
        const blob = new Blob([buf], { type: 'image/png' });
        const file = new File([blob], name || 'shared_receipt.png', { type: 'image/png' });
        // 로컬 상태로 보관하거나 바로 스캔 로직 트리거
        // 여기서는 CardScanSheet가 열릴 때 이 파일을 감지하도록 유도하거나 
        // 간단하게 window 전역/ref에 보관 후 Sheet를 엽니다.
        // @ts-ignore
        window.__sharedFile = file; 
        setShowCardScan(true);
        addToast("📸 이미지가 공유되었습니다. 스캔을 시작합니다.");
      } else if (text) {
        // 텍스트(SMS 등)가 공유된 경우: 퀵 엔트리 모달 열고 입력창에 채움
        // @ts-ignore
        window.__sharedText = text;
        setShowQuickEntry(true);
        addToast("📝 텍스트가 공유되었습니다.");
      }
    };
    window.addEventListener('sw-share', handleShare);
    return () => window.removeEventListener('sw-share', handleShare);
  }, [addToast]);

  // Kids 데이터 로드 (setupDone 이후)
  const loadKids = useKidsStore(s => s.loadKids);
  useEffect(() => {
    if (!setupDone || !householdId) return;
    loadKids(householdId);
  }, [setupDone, householdId, loadKids]);

  // SOS Realtime 구독 — 파트너의 가불 요청 수신
  useEffect(() => {
    if (!setupDone || !householdId) return;
    db.subscribeSos(householdId, (req) => {
      // 내 요청이든 파트너 요청이든 상태 배열에 추가
      setSosRequests(prev => {
        if (prev.find(p => p.id === req.id)) return prev;
        return [...prev, req];
      });
      if (req.requester !== myRole) {
        setShowSosPending(true);
        addToast(`🆘 가불 요청이 도착했습니다 (${req.amount.toLocaleString()}원)`, 'warning');
      }
    });
    // SOS 채널은 household 채널과 함께 unsubscribe
  }, [setupDone, householdId, myRole, addToast]);

  // B1/B2/B7: tx 디바운스 저장 effect
  // - B1: setTx가 functional update를 사용하므로 상태는 항상 올바름, 여기서 최종 값을 저장
  // - B2: navigator.onLine 체크 후 오프라인 시 큐 등록
  // - B7: loadedTxYears에 있는 연도만 저장 (불필요한 연도 저장 방지)
  useEffect(() => {
    if (!setupDone || !householdId || !txDirty.current) return;
    clearTimeout(txSaveTimerRef.current ?? undefined);
    txSaveTimerRef.current = setTimeout(async () => {
      if (!txDirty.current) return;
      txDirty.current = false;

      /** @type {Record<number, TxItem[]>} */
      const byYear = {};
      tx.forEach(/** @param {TxItem} t */ t => {
        const year = Number(String(t.date ?? '').slice(0, 4));
        if (!isNaN(year) && year > 2000) {
          if (!byYear[year]) byYear[year] = [];
          byYear[year].push(t);
        }
      });

      // B7: 로드된 연도만 저장 (미로드 연도는 건드리지 않음)
      const yearsToSave = Array.from(loadedTxYears.current);

      // B2: 오프라인 시 큐 등록 후 리턴
      if (!navigator.onLine) {
        yearsToSave.forEach(y => enqueueOffline(`tx_${y}`, byYear[y] ?? []));
        setSyncStatus("error");
        return;
      }

      let retries = 0;
      while (retries < 3) {
        try {
          await Promise.all(yearsToSave.map(y => db.saveTx(householdId, y, byYear[y] ?? [])));
          setSyncStatus("ok");
          return;
        } catch (e) {
          retries++;
          if (retries === 3) {
            console.error('[tx-save] 저장 실패 (3회 시도):', e);
            yearsToSave.forEach(y => enqueueOffline(`tx_${y}`, byYear[y] ?? []));
            setSyncStatus("error");
          } else {
            await new Promise(r => setTimeout(r, 1000 * retries));
          }
        }
      }
    }, 300);
    return () => { clearTimeout(txSaveTimerRef.current ?? undefined); };
  }, [tx, householdId, setupDone]);

  // 공유 데이터 저장 도우미 (Supabase 전송) — validate + 지수 백오프 재시도 포함
  const setShared = useCallback(async (key, value, rawSetter) => {
    const newValue = value;
    validate(key, newValue); // 스키마 불일치 경고 (Task 2-4)
    rawSetter(newValue);     // 낙관적 UI 업데이트 (즉시 반영)
    
    // -- 입력 지연(Debounce) 대상 필드 처리 (Task 15-2) --
    const isDebounced = ["names", "budgets", "taxConfig"].includes(key);
    
    if (isDebounced) {
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
      
      saveTimers.current[key] = setTimeout(async () => {
        setSyncStatus("syncing");
        try {
          await db.save(householdId, key, newValue);
          setSyncStatus("ok");
        } catch (e) {
          console.error("Save error:", e);
          setSyncStatus("error");
          addToast(`${key} 저장 중 오류가 발생했습니다.`);
        }
      }, 800); // 800ms 지연 후 저장
      return;
    }

    // -- 비-지연 필드 (즉시 저장) --
    if (!navigator.onLine) {
      enqueueOffline(key, newValue);
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    let retries = 0;
    while (retries < 3) {
      try {
        await db.save(householdId, key, newValue);
        setSyncStatus("ok");
        return;
      } catch (e) {
        retries++;
        if (retries === 3) {
          // 저장 실패 시 큐에 보관 (Task 5-3)
          enqueueOffline(key, newValue);
          console.error(`[sync] 저장 실패 (3회 시도) key=${key}:`, e);
          setSyncStatus("error");
        } else {
          await new Promise(r => setTimeout(r, 1000 * retries)); // 1s → 2s 백오프
        }
      }
    }
  }, [householdId, addToast]);

  // B1 fix: setTx를 functional update로 변경 — 빠른 연속 호출 시 stale closure 방지
  // 저장 로직은 아래 txSave useEffect에서 처리 (B2 offline, B7 최적화 포함)
  const setTx = useCallback(/** @param {((prev: TxItem[]) => TxItem[]) | TxItem[]} v */ (v) => {
    txDirty.current = true;
    setSyncStatus("syncing");
    setTxRaw(/** @param {TxItem[]} prev */ prev => {
      const newTx = typeof v === 'function' ? v(prev) : v;
      validate('tx', newTx);
      return newTx;
    });
  }, []); // deps 불필요: tx 클로저 제거됨

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
  const setNames = useCallback(v => setShared("names", typeof v === 'function' ? v(names) : v, setNamesRaw), [names, setShared]);

  const setSliderCfg = useCallback(v => { setSliderCfgRaw(v); savePrivate("sliderCfg", v); }, [savePrivate]);
  const setTheme = useCallback(v => { setThemeRaw(v); savePrivate("theme", v); }, [savePrivate]);

  // 위젯 레이아웃 저장
  const setWidgetLayout = useCallback(
    /** @param {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} v */
    v => setShared("widgetLayout", v, setWidgetLayoutRaw),
    [setShared]
  );

  // 홈 화면 레이아웃 저장
  const setHomeLayout = useCallback(
    /** @param {{ mobile: WidgetLayoutItem[], desktop: WidgetLayoutItem[] }} v */
    v => setShared("homeLayout", v, setHomeLayoutRaw),
    [setShared]
  );

  // IDB 큐에 항목 저장 후 Background Sync 등록 (SyncManager 미지원 시 handleOnline fallback)
  const enqueueWithSync = useCallback(
    /** @param {import('./utils/offlineIDB.js').IDBQueueItem} item */
    async (item) => {
      await idbEnqueue(item);
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const reg = /** @type {ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }} */ (await navigator.serviceWorker.ready);
          await reg.sync.register('offline-queue-flush');
        } catch {}
      }
    },
    []
  );

  // B4: id = ms * 1000 + 난수 → 동시 다건 추가 시 충돌 방지
  // setTx가 functional update이므로 연속 호출 시 prev가 항상 최신 상태 (B1 fix)
  const addTx = useCallback(/** @param {Omit<TxItem, 'id'>} t */ t =>
    setTx(/** @param {TxItem[]} ts */ ts => [
      ...ts,
      { ...t, id: Date.now() * 1000 + (Math.random() * 1000 | 0) }
    ]),
  [setTx]);

  // B1: 벌크 저장용 — 한 번의 상태 업데이트로 여러 건 추가 (race condition 완전 방지)
  const addTxBatch = useCallback(/** @param {Omit<TxItem, 'id'>[]} items */ items =>
    setTx(/** @param {TxItem[]} ts */ ts => [
      ...ts,
      ...items.map((t, i) => ({ ...t, id: Date.now() * 1000 + i })),
    ]),
  [setTx]);

  const deleteTx = useCallback(/** @param {number} id */ id =>
    setTx(/** @param {TxItem[]} ts */ ts => ts.filter(t => t.id !== id)),
  [setTx]);

  const editTx = useCallback(/** @param {number} id @param {Partial<TxItem>} updates */ (id, updates) =>
    setTx(/** @param {TxItem[]} ts */ ts => ts.map(t => t.id === id ? { ...t, ...updates } : t)),
  [setTx]);
  
  // -- 세분화된 초기화 함수들 (Task 12-1) --
  
  /** 1. 지출 내역만 초기화 */
  const resetTx = useCallback(async () => {
    setSyncStatus("syncing");
    await db.clearAllTransactions(householdId);
    // 레거시 'tx' 키도 혹시 모르니 정리
    await db.save(householdId, "tx", EMPTY_TX);
    txDirty.current = false; // 서버에서 직접 삭제했으므로 saveEffect 불필요
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
    setPlanRaw(EMPTY_PLAN);
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

  // SOS 핸들러
  const handleSosSubmit = useCallback(
    /** @param {{ requester: string, amount: number, reason: string, repay_plan: string }} req */
    async (req) => {
      await db.createSosRequest(householdId, req);
      addToast('가불 요청을 파트너에게 전송했습니다.');
    },
    [householdId, addToast]
  );

  const handleSosResolve = useCallback(
    /** @param {number} id @param {'approved'|'rejected'} status */
    async (id, status) => {
      await db.resolveSos(id, status);
      setSosRequests(prev => prev.map(r => r.id === id ? { ...r, status, resolved_at: new Date().toISOString() } : r));
      addToast(status === 'approved' ? '가불을 승인했습니다.' : '가불을 거절했습니다.');
    },
    [addToast]
  );

  const handleAdminLogin = useCallback(async () => {
    setIsAdmin(true);
    await savePrivate("isAdmin", true);
    setView("admin");
  }, [savePrivate]);

  const handleAdminLogout = useCallback(async () => {
    setIsAdmin(false);
    await savePrivate("isAdmin", false);
    setView("settings");
  }, [savePrivate]);

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
      <div className={`app-root ${theme !== "dark" ? theme : ""}`.trim()}>
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
      background: syncStatus === "error" ? "var(--redD)" : "var(--nav-bg)",
      backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${syncStatus === "error" ? "rgba(170,32,32,.3)" : "var(--border)"}`,
      fontSize: 10, color: syncStatus === "error" ? "var(--red)" : "var(--text3)",
      transition: "all .3s"
    }}>
      <div 
        onClick={() => window.location.reload()}
        style={{ 
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer", 
          padding: "2px 6px", borderRadius: 8, transition: "background .2s" 
        }}
        onMouseOver={e => e.currentTarget.style.background = "var(--dim)"}
        onMouseOut={e => e.currentTarget.style.background = "transparent"}
        title="새로고침"
      >
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: syncStatus === "syncing" ? "var(--gold)" : syncStatus === "error" ? "var(--red)" : "var(--green)",
          animation: syncStatus === "syncing" ? "spin 1s linear infinite" : "none",
          boxShadow: `0 0 8px ${syncStatus === "syncing" ? "var(--gold)" : syncStatus === "error" ? "var(--red)" : "var(--green)"}80`
        }} />
        <span style={{ fontWeight: 600 }}>
          {syncStatus === "error" ? "서버 연결 오류" : syncStatus === "syncing" ? "동기화 중..." : "클라우드 실시간 연결됨 ⟳"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ letterSpacing: ".08em", fontWeight: 700, color: "var(--gold)" }}>{householdId}</span>
        <span style={{
          background: myRole === "husband" ? "var(--hD)" : "var(--wD)",
          color: myRole === "husband" ? "var(--h)" : "var(--w)",
          padding: "1px 7px", borderRadius: 99, fontWeight: 700, fontSize: 9,
          border: `1px solid ${myRole === "husband" ? "var(--h)" : "var(--w)"}30`
        }}>{myRole === "husband" ? names.husband : names.wife}</span>
      </div>
    </div>
  );

  const budgetContextValue = {
    tx, setTx, addTx, deleteTx, editTx, addTxBatch, loadTxYear,
    budgets, setBudgets, plan, setPlan, names, setNames,
    fixed, setFixed, install, setInstall, cards, setCards, assets, setAssets,
    syncStatus, householdId, myRole,
    kidsMode, setKidsMode,
  };

  const lazyFallback = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text3)", fontSize: 24 }}>
      ⟳
    </div>
  );

  return (
    <BudgetContext.Provider value={budgetContextValue}>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className={`app-root ${theme === "light" ? "light" : ""}`.trim()}
        data-theme={kidsMode ? "kids" : view === "private" ? "private" : "joint"}
        data-color-scheme={theme}
        style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SyncBar />
        <div style={{ flex: 1, overflow: "hidden", marginTop: 28 }}>
          <Suspense fallback={lazyFallback}>
            {kidsMode ? (
              // Kids Mode 라우팅 가드: settings만 허용, 나머지는 KidsView로
              view === "settings"
                ? <SettingsView names={names} setNames={setNames} budgets={budgets} setBudgets={setBudgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} theme={theme} setTheme={setTheme} resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed} resetBudgets={resetBudgets} resetSetup={resetSetup} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} plan={plan} onBugReport={() => setShowBugReport(true)} onAdminTrigger={() => setShowAdminLogin(true)} isAdmin={isAdmin} onClose={() => setView("home")} onNavigate={setView} />
                : <KidsView />
            ) : (
              <>
                {view === "home" && <HomeView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} onAdd={setModal} sliderCfg={sliderCfg} onWidget={() => setShowWidget(true)} onScan={() => setShowCardScan(true)} plan={plan} setPlan={setPlan} cards={cards} onEdit={editTx} onDelete={deleteTx} onSettings={(v) => v === "budget" ? setView("budget") : setView("settings")} sosPending={sosPending} onSosResolve={handleSosResolve} homeLayout={homeLayout} setHomeLayout={setHomeLayout} />}
                {view === "entry" && <EntryView names={names} plan={plan} onSave={addTx} onDelete={deleteTx} onEdit={editTx} tx={tx} cards={cards} />}
                {view === "budget" && <BudgetView plan={plan} setPlan={setPlan} budgets={budgets} setBudgets={setBudgets} tx={tx} fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} setCards={setCards} names={names} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} />}
                {view === "report" && <ReportView tx={tx} budgets={budgets} setBudgets={setBudgets} fixed={fixed} install={install} names={names} cards={cards} plan={plan} setPlan={setPlan} taxConfig={taxConfig} setTaxConfig={setTaxConfig} onEdit={editTx} onDelete={deleteTx} loadTxYear={loadTxYear} assets={assets} setAssets={setAssets} onGoToBudget={() => setView("budget")} />}
                {view === "settings" && <SettingsView names={names} setNames={setNames} budgets={budgets} setBudgets={setBudgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} theme={theme} setTheme={setTheme} resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed} resetBudgets={resetBudgets} resetSetup={resetSetup} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} plan={plan} onBugReport={() => setShowBugReport(true)} onAdminTrigger={() => setShowAdminLogin(true)} isAdmin={isAdmin} onClose={() => setView("home")} onNavigate={setView} />}
                {view === "admin" && isAdmin && <AdminView onClose={handleAdminLogout} addToast={addToast} />}
                {view === "dashboard" && (
                  <DashboardView
                    plan={plan} setPlan={setPlan} budgets={budgets} tx={tx} fixed={fixed} names={names}
                    myRole={myRole} mySosPending={mySosPending}
                    widgetLayout={widgetLayout} setWidgetLayout={setWidgetLayout}
                    onSettings={() => setView("settings")}
                  />
                )}
                {view === "private" && (
                  <PrivateWalletView
                    plan={plan} tx={tx} myRole={myRole} names={names}
                    householdId={householdId} onSosSubmit={handleSosSubmit}
                    onAdd={() => setModal({ who: myRole, isPrivate: true })} onSettings={() => setView("settings")}
                    onSosRequest={() => setShowSosRequest(true)}
                  />
                )}
                {view === "kids-mgmt" && <ParentKidsMgmtView />}
              </>
            )}
          </Suspense>
        </div>
        <Nav view={showQuickEntry ? "quickEntry" : view} setView={v => v === "quickEntry" ? setShowQuickEntry(true) : setView(v)} syncStatus={syncStatus} kidsMode={kidsMode} />
        {modal && (
          <InputModal 
            defaultWho={typeof modal === 'string' ? modal : modal.who} 
            defaultIsPrivate={typeof modal === 'object' ? !!modal.isPrivate : false}
            names={names} plan={plan} cards={cards} 
            onClose={() => setModal(null)} onSave={addTx} 
          />
        )}
        {showWidget && <WidgetView tx={tx} budgets={budgets} names={names} onClose={() => setShowWidget(false)} />}
        {showQuickEntry && <QuickEntrySheet names={names} plan={plan} cards={cards} tx={tx} onSave={addTx} onClose={() => setShowQuickEntry(false)} onCardScan={() => { setShowQuickEntry(false); setShowCardScan(true); }} onSosRequest={() => setShowSosRequest(true)} myRole={myRole} />}
        {showCardScan && <CardScanSheet who={myRole} onSave={addTx} onSaveAll={addTxBatch} onClose={() => setShowCardScan(false)} />}
        {showBugReport && <BugReportModal householdId={householdId} onClose={() => setShowBugReport(false)} addToast={addToast} />}
        {showAdminLogin && <AdminLoginModal onLogin={handleAdminLogin} onClose={() => setShowAdminLogin(false)} addToast={addToast} />}
        {showSosRequest && (
          <SosRequestSheet 
            myRole={myRole} 
            allowance={0} // PrivateWalletView 내부 계산 로직 유지 
            spentPct={0} 
            onSubmit={handleSosSubmit} 
            onClose={() => setShowSosRequest(false)} 
            names={names}
          />
        )}
        {showSosPending && sosPending.length > 0 && (
          <SosPendingSheet
            requests={sosPending} names={names}
            onResolve={handleSosResolve}
            onClose={() => setShowSosPending(false)}
          />
        )}
        <ToastContainer toasts={toasts} />
      </div>
    </BudgetContext.Provider>
  );
}
