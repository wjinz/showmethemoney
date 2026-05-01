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
import { idbEnqueue, idbDequeueDiaries, idbRemove, idbSaveDiariesSnapshot, idbLoadDiariesSnapshot } from "./utils/offlineIDB.js";
import { LS_KEYS, lsGet, lsSet, lsRemove, lsMigrateLegacy } from "./utils/ls.js";
import { useKidsStore } from "./stores/kidsStore.js";
import {
  CATS, INIT_BUDGETS, DEFAULT_SLIDER_CFG, DEFAULT_TAX_CONFIG,
  EMPTY_TX, EMPTY_FIXED, EMPTY_INSTALL, EMPTY_CARDS, EMPTY_ASSETS, EMPTY_PLAN, EMPTY_SETTLEMENTS, EMPTY_DIARIES,
  DEFAULT_WIDGET_LAYOUT, DEFAULT_HOME_LAYOUT,
  getYear,
} from "./constants/index.js";
import { SyncSetup } from "./views/SyncSetup.jsx";
const HomeView = lazy(() => import("./views/HomeView.jsx").then(m => ({ default: m.HomeView })));
const DiaryView = lazy(() => import("./views/DiaryView.jsx").then(m => ({ default: m.DiaryView })));
const HistoryView = lazy(() => import("./views/HistoryView.jsx").then(m => ({ default: m.HistoryView })));
const EntryView = lazy(() => import("./views/EntryView.jsx").then(m => ({ default: m.EntryView })));
const ReportView = lazy(() => import("./views/ReportView.jsx").then(m => ({ default: m.ReportView })));
const SettingsView = lazy(() => import("./views/SettingsView.jsx").then(m => ({ default: m.SettingsView })));
const WidgetView = lazy(() => import("./views/WidgetView.jsx").then(m => ({ default: m.WidgetView })));
const DashboardView = lazy(() => import("./views/DashboardView.jsx").then(m => ({ default: m.DashboardView })));
const PrivateWalletView = lazy(() => import("./views/PrivateWalletView.jsx").then(m => ({ default: m.PrivateWalletView })));
const BudgetView = lazy(() => import("./views/BudgetView.jsx").then(m => ({ default: m.BudgetView })));
const AdminView = lazy(() => import("./views/AdminView.jsx").then(m => ({ default: m.AdminView })));
const SettlementView = lazy(() => import("./views/SettlementView.jsx").then(m => ({ default: m.SettlementView })));
const KidsView = lazy(() => import("./views/KidsView.jsx").then(m => ({ default: m.KidsView })));
const AssetView = lazy(() => import("./views/AssetView.jsx").then(m => ({ default: m.AssetView })));
const TaxOptimizerView = lazy(() => import("./views/TaxOptimizerView.jsx").then(m => ({ default: m.TaxOptimizerView })));
const DataImportView = lazy(() => import("./views/DataImportView.jsx").then(m => ({ default: m.DataImportView })));
const CalendarView = lazy(() => import("./views/CalendarView.jsx").then(m => ({ default: m.CalendarView })));
import { ParentKidsMgmtView } from "./views/ParentKidsMgmtView.jsx";
import { Nav } from "./components/Nav.jsx";
import { InputModal } from "./components/InputModal.jsx";
import { InputSheet } from "./components/InputSheet.jsx";
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
  const [view, setView] = useState("diary");
  const [syncStatus, setSyncStatus] = useState("ok");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [lastSync, setLastSync] = useState(/** @type {Date|null} */(null));

  // 위젯 레이아웃 상태
  const [widgetLayout, setWidgetLayoutRaw] = useState(DEFAULT_WIDGET_LAYOUT);
  const [homeLayout, setHomeLayoutRaw] = useState(DEFAULT_HOME_LAYOUT);

  // SOS 상태 통합 관리 (내가 보낸 요청 & 받은 요청 모두)
  const [sosRequests, setSosRequests] = useState(/** @type {SosRequest[]} */([]));
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

  const [kidsMode, setKidsModeRaw] = useState(false);


  // 공유 데이터 필드들
  const [tx, setTxRaw] = useState(EMPTY_TX);
  const [fixed, setFixedRaw] = useState(EMPTY_FIXED);
  const [install, setInstallRaw] = useState(EMPTY_INSTALL);
  const [cards, setCardsRaw] = useState(EMPTY_CARDS);
  const [settlements, setSettlementsRaw] = useState(EMPTY_SETTLEMENTS);
  const [assets, setAssetsRaw] = useState(EMPTY_ASSETS);
  const [plan, setPlanRaw] = useState(EMPTY_PLAN);
  const [budgets, setBudgetsRaw] = useState(INIT_BUDGETS);
  const [names, setNamesRaw] = useState({ husband: "남편", wife: "와이프" });
  const [taxConfig, setTaxConfigRaw] = useState(DEFAULT_TAX_CONFIG);
  const [diaries, setDiariesRaw] = useState(EMPTY_DIARIES);
  // Hotfix (2026-04-30): handleDiarySave 사이즈 가드용 latest diaries ref
  const diariesRef = useRef(diaries);
  useEffect(() => { diariesRef.current = diaries; }, [diaries]);
  const [currentUser, setCurrentUser] = useState(/** @type {'husband'|'wife'} */('husband'));

  // -- 입력 지연(Debounce) 타이머 관리 (Task 15-1) --
  /** @type {React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>} */
  const saveTimers = useRef({});

  // P2-5: 언마운트 시 모든 디바운스 타이머 정리
  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const key of Object.keys(timers)) {
        clearTimeout(timers[key]);
      }
    };
  }, []);

  // 개인 설정 필드들
  const [sliderCfg, setSliderCfgRaw] = useState({ ...DEFAULT_SLIDER_CFG });
  const [theme, setThemeRaw] = useState("dark");
  const [modal, setModal] = useState(null);
  const [diarySheet, setDiarySheet] = useState(null);
  const [showWidget, setShowWidget] = useState(false);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [showCardScan, setShowCardScan] = useState(false);
  const { toasts, addToast } = useToast();

  // kidsMode 토글 — localStorage + DB에 동기화
  const setKidsMode = useCallback(/** @param {boolean} v */(v) => {
    setKidsModeRaw(v);
    lsSet(LS_KEYS.KIDS_MODE, v);
    if (householdId) db.save(householdId, 'kidsMode', v).catch(console.error);
  }, [householdId]);

  // 로컬/비공개 데이터 저장소
  const savePrivate = useCallback((key, value) => {
    if (value === null || value === undefined) { lsRemove(key); return; }
    lsSet(key, value);
  }, []);

  // 로드된 연도 추적 (tx Lazy Loading용)
  const loadedTxYears = useRef(/** @type {Set<number>} */(new Set()));
  // tx가 로컬에서 변경됐는지 추적 (서버 로드 시 false, 로컬 변경 시 true)
  const txDirty = useRef(false);
  // 디바운스 저장 타이머
  const txSaveTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */(null));

  // 공유 데이터 상태 업데이트 핸들러 (실시간 반영용)
  // Hotfix-1: 의도적 다이어리 초기화 플래그 (resetDiaries / resetAll 사용)
  const intentionalDiaryReset = useRef(false);

  const updateSharedState = useCallback(/** @param {string} key @param {any} value */ (key, value) => {
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
    switch (key) {
      case 'tx': setTxRaw(value); break; // 레거시 키 호환
      case 'fixed': setFixedRaw(value); break;
      case 'install': setInstallRaw(value); break;
      case 'cards': setCardsRaw(value); break;
      case 'settlements': setSettlementsRaw(value); break;
      case 'assets': setAssetsRaw(value); break;
      case 'budgets': setBudgetsRaw(value); break;
      case 'names': setNamesRaw(value); break;
      case 'plan': setPlanRaw(value); break;
      case 'taxConfig': setTaxConfigRaw(value); break;
      case 'widgetLayout': setWidgetLayoutRaw(value); break;
      case 'homeLayout': setHomeLayoutRaw(value || DEFAULT_HOME_LAYOUT); break;
      case 'kidsMode': setKidsModeRaw(value); break;
      case 'diaries': {
        // Hotfix-1 (2026-04-30): Realtime echo / payload truncation 방어
        // - 비배열 수신 시 무시 (truncation)
        // - 길이 감소 + 의도적 reset 아닌 경우 무시 후 server 재조회
        if (!Array.isArray(value)) {
          console.warn('[Sync] diaries non-array received, ignored:', typeof value);
          break;
        }
        setDiariesRaw(/** @type {(prev: import('./constants/index.js').DiaryItem[]) => import('./constants/index.js').DiaryItem[]} */(prev => {
          if (intentionalDiaryReset.current) {
            intentionalDiaryReset.current = false;
            return value;
          }
          if (value.length < prev.length) {
            console.warn('[Sync] diaries echo shorter than local — refetch', { incoming: value.length, local: prev.length });
            db.loadAll(householdId).then(d => {
              if (Array.isArray(d.diaries) && d.diaries.length >= prev.length) {
                setDiariesRaw(d.diaries);
              }
            }).catch(err => console.error('[Sync] diaries refetch fail:', err));
            return prev;
          }
          return value;
        }));
        break;
      }
      default: break;
    }
    setLastSync(new Date());
  }, [householdId]);

  // Supabase 데이터 로드
  const loadShared = useCallback(async (hid) => {
    setSyncStatus("syncing");
    try {
      // P2-3: RLS 활성화 시 세션 컨텍스트 설정 (RPC 미배포 환경에서는 무시됨)
      await db.setHouseholdContext(hid);
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
      if (allData.settlements) setSettlementsRaw(allData.settlements);
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
              husband: loadedPlan.monthlyIncome || 0,
              wife: 0,
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
      if (allData.homeLayout) {
        let needsMigrate = false;
        const migrate = (layout) => layout.map(l => {
          if (['progress_ring', 'summary_bars', 'scan_banner'].includes(l.i)) {
            needsMigrate = true;
            return { ...l, i: 'execution_summary', h: 6 }; // 대략적인 새 높이
          }
          return l;
        }).filter((l, idx, self) => self.findIndex(t => t.i === l.i) === idx); // 중복 제거

        if (allData.homeLayout.mobile?.some(l => ['progress_ring', 'summary_bars', 'scan_banner'].includes(l.i)) ||
          allData.homeLayout.desktop?.some(l => ['progress_ring', 'summary_bars', 'scan_banner'].includes(l.i))) {
          const migrated = {
            mobile: migrate(allData.homeLayout.mobile || []),
            desktop: migrate(allData.homeLayout.desktop || []),
          };
          setHomeLayoutRaw(migrated);
          await db.save(hid, "homeLayout", migrated);
          console.log('[home-migrate] 구버전 위젯 마이그레이션 완료');
        } else {
          setHomeLayoutRaw(allData.homeLayout);
        }
      }
      if (typeof allData.kidsMode === 'boolean') setKidsModeRaw(allData.kidsMode);
      // Hotfix-2 (2026-04-30): server vs LKG 비교 — 길이가 더 긴 쪽을 신뢰
      let serverDiaries = Array.isArray(allData.diaries) ? allData.diaries : [];
      try {
        const lkg = await idbLoadDiariesSnapshot(hid);
        if (lkg && Array.isArray(lkg.payload) && lkg.payload.length > serverDiaries.length) {
          console.warn('[Recovery] LKG > server, restoring', { lkg: lkg.payload.length, server: serverDiaries.length });
          serverDiaries = lkg.payload;
          // 서버에 다시 동기화 (전체 데이터 손실 복구)
          await db.save(hid, 'diaries', serverDiaries).catch(err => console.error('[Recovery] resync fail:', err));
        }
      } catch (err) {
        console.warn('[Recovery] LKG load fail:', err);
      }
      setDiariesRaw(serverDiaries);

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
    } catch (e) {
      console.error("Supabase load error:", e);
      setSyncStatus("error");
    }
  }, []);

  // 초기 실행 및 개인 설정 로드
  useEffect(() => {
    (async () => {
      try {
        lsMigrateLegacy();
        const savedHid = lsGet(LS_KEYS.HOUSEHOLD_ID);
        const savedRole = lsGet(LS_KEYS.MY_ROLE);
        const savedSlider = lsGet(LS_KEYS.SLIDER_CFG);
        const savedTheme = lsGet(LS_KEYS.THEME);
        const savedIsAdmin = lsGet(LS_KEYS.IS_ADMIN);

        if (savedSlider) {
          setSliderCfgRaw(prev => ({ ...DEFAULT_SLIDER_CFG, ...savedSlider }));
        }
        if (savedTheme) setThemeRaw(savedTheme);
        if (savedIsAdmin) setIsAdmin(true);
        const savedKidsMode = lsGet(LS_KEYS.KIDS_MODE);
        if (typeof savedKidsMode === 'boolean') setKidsModeRaw(savedKidsMode);
        if (savedHid) {
          setHouseholdId(savedHid);
          setMyRole(savedRole || "husband");
          setCurrentUser(savedRole || "husband");
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
    return () => { db.unsubscribe(householdId); };
  }, [setupDone, householdId, updateSharedState]);

  // Task 5-3: 온라인 복구 시 오프라인 큐 flush
  useEffect(() => {
    if (!setupDone || !householdId) return;

    /**
     * IDB에 큐잉된 다이어리 항목들을 Supabase에 일괄 반영
     * @param {string} hid
     * @returns {Promise<number>}
     */
    const flushIdbDiaries = async (hid) => {
      try {
        const queued = await idbDequeueDiaries();
        if (queued.length === 0) return 0;
        const fresh = await db.loadAll(hid);
        const existing = Array.isArray(fresh.diaries) ? fresh.diaries : [];
        const merged = [...existing];
        const knownIds = new Set(existing.map(d => d.id));
        for (const item of queued) {
          if (item.householdId !== hid) continue;
          if (!item.payload || knownIds.has(item.payload.id)) continue;
          merged.push(item.payload);
          knownIds.add(item.payload.id);
        }
        await db.save(hid, 'diaries', merged);
        const ids = queued.filter(q => typeof q.idbId === 'number').map(q => /** @type {number} */(q.idbId));
        if (ids.length > 0) await idbRemove(ids);
        return queued.length;
      } catch (err) {
        console.warn('[idb-diary] flush fail:', err);
        return 0;
      }
    };

    const handleOnline = async () => {
      if (!hasQueued() && !hasTxQueued()) return;
      console.log('[offlineQueue] 온라인 복구 감지 — 큐 flush 시작');
      setSyncStatus("syncing");
      const [kvCount, txCount, diaryCount] = await Promise.all([
        flushOfflineQueue(db, householdId),
        flushTxQueue(db, householdId),
        flushIdbDiaries(householdId),
      ]);
      const total = kvCount + txCount + diaryCount;
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
    /** @param {CustomEvent<{ type: string, buf?: ArrayBuffer, name?: string, text?: string }>} e */
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
    // P0-2: SOS 채널 cleanup 명시
    return () => { db.unsubscribeSos(householdId); };
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
  // P2-1: rawSetter 호출은 호출자가 functional update로 직접 처리하므로 보존하되 옵션화
  const setShared = useCallback(async (key, value, rawSetter) => {
    const newValue = value;
    // P2-2: cards는 strict 모드 (스키마 어긋나면 dev에서 throw)
    validate(key, newValue, { strict: key === 'cards' });
    if (typeof rawSetter === 'function') rawSetter(newValue); // 호환성 (구 호출자)

    // -- 입력 지연(Debounce) 대상 필드 처리 (Task 15-2) --
    // Hotfix (2026-04-30): diaries도 debounce 대상에 포함 (사진 첨부 후 race 방지)
    /** @type {Record<string, number>} */
    const debounceMap = { names: 800, budgets: 800, taxConfig: 800, diaries: 300 };
    const debounceMs = debounceMap[key];

    if (typeof debounceMs === 'number') {
      if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);

      saveTimers.current[key] = setTimeout(async () => {
        setSyncStatus("syncing");
        try {
          // Hotfix-2: diaries 저장 직전 LKG snapshot 저장
          if (key === 'diaries' && Array.isArray(newValue)) {
            await idbSaveDiariesSnapshot(householdId, /** @type {import('./constants/index.js').DiaryItem[]} */(newValue))
              .catch(err => console.warn('[LKG] snapshot save fail:', err));
          }
          await db.save(householdId, key, newValue);
          setSyncStatus("ok");
        } catch (e) {
          console.error("Save error:", e);
          setSyncStatus("error");
          addToast(`${key} 저장 중 오류가 발생했습니다.`);
        }
      }, debounceMs);
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
  const setTx = useCallback(/** @param {((prev: TxItem[]) => TxItem[]) | TxItem[]} v */(v) => {
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
  // P2-1: functional update 패턴으로 deps 최소화 (setShared만 의존)
  // Hotfix (2026-04-30): closure race 제거 — useRef로 latest를 안전하게 캡처
  /** @type {React.MutableRefObject<Record<string, unknown>>} */
  const setterLatest = useRef({});
  /**
   * @template T
   * @param {string} key
   * @param {(updater: (prev: T) => T) => void} rawSetter
   * @returns {(v: T | ((prev: T) => T)) => void}
   */
  const _makeSetter = (key, rawSetter) => (v) => {
    rawSetter(/** @param {T} prev */(prev) => {
      const next = typeof v === 'function' ? /** @type {(p: T) => T} */(v)(prev) : v;
      setterLatest.current[key] = next;
      return next;
    });
    queueMicrotask(() => {
      const latest = setterLatest.current[key];
      setShared(key, latest, undefined);
    });
  };

  const setFixed = useCallback(_makeSetter("fixed", setFixedRaw), [setShared]);
  const setInstall = useCallback(_makeSetter("install", setInstallRaw), [setShared]);
  const setCards = useCallback(_makeSetter("cards", setCardsRaw), [setShared]);
  const setSettlements = useCallback(_makeSetter("settlements", setSettlementsRaw), [setShared]);
  const setAssets = useCallback(_makeSetter("assets", setAssetsRaw), [setShared]);
  const setTaxConfig = useCallback(_makeSetter("taxConfig", setTaxConfigRaw), [setShared]);
  const setPlan = useCallback(_makeSetter("plan", setPlanRaw), [setShared]);
  const setBudgets = useCallback(_makeSetter("budgets", setBudgetsRaw), [setShared]);
  const setNames = useCallback(_makeSetter("names", setNamesRaw), [setShared]);
  const setDiaries = useCallback(_makeSetter("diaries", setDiariesRaw), [setShared]);

  const setSliderCfg = useCallback(v => { setSliderCfgRaw(v); savePrivate(LS_KEYS.SLIDER_CFG, v); }, [savePrivate]);
  const setTheme = useCallback(v => { setThemeRaw(v); savePrivate(LS_KEYS.THEME, v); }, [savePrivate]);

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
    /** @param {{ type: 'kv', householdId: string, key: string, value: import('./constants/index.js').TxItem[] | object | boolean | string | number } | { type: 'tx', householdId: string, rows: object[] } | { type: 'diary', householdId: string, payload: import('./constants/index.js').DiaryItem }} item */
    async (item) => {
      await idbEnqueue(item);
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const reg = /** @type {ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }} */ (await navigator.serviceWorker.ready);
          await reg.sync.register('offline-queue-flush');
        } catch { }
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

  const editTx = useCallback(/** @param {number} id @param {Partial<TxItem>} updates */(id, updates) =>
    setTx(/** @param {TxItem[]} ts */ ts => ts.map(t => t.id === id ? { ...t, ...updates } : t)),
    [setTx]);

  const addDiary = useCallback(/** @param {Omit<import('./constants/index.js').DiaryItem, 'id'>} d */ d =>
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => [
      ...ds,
      { ...d, id: Date.now() * 1000 + (Math.random() * 1000 | 0), totalSpent: Math.max(0, d.totalSpent || 0) }
    ]),
    [setDiaries]);

  const editDiary = useCallback(/** @param {import('./constants/index.js').DiaryItem} d */ d =>
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => ds.map(x => x.id === d.id ? { ...x, ...d } : x)),
    [setDiaries]);

  const deleteDiary = useCallback(/** @param {number} id */ id =>
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => ds.filter(x => x.id !== id)),
    [setDiaries]);

  /**
   * P1-2: diary 편집 + 연결된 tx 동시 동기화 (롤백 가드 포함)
   * @param {import('./constants/index.js').DiaryItem} updated
   */
  const editDiaryWithTx = useCallback((updated) => {
    /** @type {import('./constants/index.js').DiaryItem | undefined} */
    let prevDiary;
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => {
      prevDiary = ds.find(x => x.id === updated.id);
      return ds.map(x => x.id === updated.id ? { ...x, ...updated } : x);
    });
    try {
      if (updated.type === 'expense') {
        setTx(/** @param {TxItem[]} ts */ ts => ts.map(t =>
          t.source_id === updated.id
            ? {
                ...t,
                amount: updated.totalSpent || t.amount,
                memo: (typeof updated.content === 'string' && updated.content.trim().length > 0) ? updated.content : t.memo,
                date: updated.date || t.date,
                cat: updated.cat || t.cat,
                payMethod: updated.payMethod || t.payMethod,
                cardId: updated.cardId !== undefined ? updated.cardId : t.cardId,
              }
            : t
        ));
      }
    } catch (e) {
      console.error('[editDiaryWithTx] tx sync fail, rollback diary:', e);
      if (prevDiary) {
        const restored = prevDiary;
        setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds =>
          ds.map(x => x.id === restored.id ? restored : x)
        );
      }
    }
  }, [setDiaries, setTx]);

  /**
   * P1-2: diary 삭제 + 연결된 tx도 함께 삭제 (고아 tx 방지)
   * @param {number} id
   */
  const deleteDiaryWithTx = useCallback((id) => {
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => ds.filter(x => x.id !== id));
    setTx(/** @param {TxItem[]} ts */ ts => ts.filter(t => t.source_id !== id));
  }, [setDiaries, setTx]);

  /**
   * 다이어리 저장 + (지출 모드인 경우) tx 자동 동기화 (Antigravity-4)
   * source_id로 양 데이터 연결, DashboardView/Report 통계에도 자동 반영.
   * @param {Omit<import('./constants/index.js').DiaryItem, 'id'>} draft
   * @returns {boolean} 저장 성공 시 true, 사이즈 가드로 차단되면 false
   */
  const handleDiarySave = useCallback((draft) => {
    // Realtime broadcast(약 256KB)와 Postgres row 한계 고려. 380KB까지 허용하고 80% 초과 시 사전 경고.
    const LIMIT_KB = 380;
    const photos = Array.isArray(draft.photos) ? draft.photos : [];
    const newItemBytes = photos.reduce((s, p) => s + (typeof p === 'string' ? p.length : 0), 0)
      + (draft.content || '').length + 256;
    const existingBytes = diariesRef.current.reduce((s, d) => {
      const ps = Array.isArray(d.photos) ? d.photos : [];
      const photoBytes = ps.reduce((ss, p) => ss + (typeof p === 'string' ? p.length : 0), 0);
      const contentBytes = typeof d.content === 'string' ? d.content.length : 0;
      return s + photoBytes + contentBytes;
    }, 0);
    const estimatedKB = Math.round((existingBytes + newItemBytes) / 1024);
    if (estimatedKB > LIMIT_KB) {
      addToast(
        `저장 공간 한도 초과(${estimatedKB}KB / ${LIMIT_KB}KB). 사진을 줄이거나 오래된 다이어리를 정리한 후 다시 저장해주세요. 입력 내용은 유지됩니다.`,
        'error'
      );
      return false;
    }
    if (estimatedKB > Math.round(LIMIT_KB * 0.8)) {
      addToast(`다이어리 사용량 ${estimatedKB}KB / ${LIMIT_KB}KB — 곧 한도에 도달합니다.`, 'warning');
    }
    const diaryId = Date.now() * 1000 + (Math.random() * 1000 | 0);
    /** @type {import('./constants/index.js').DiaryItem} */
    const diaryItem = {
      id: diaryId,
      type: draft.type,
      date: draft.date,
      who: draft.who,
      emoji: draft.emoji,
      content: draft.content,
      totalSpent: Math.max(0, draft.totalSpent || 0),
      shared: !!draft.shared,
      time: draft.time,
      photos: Array.isArray(draft.photos) ? draft.photos : [],
      expenseItems: draft.expenseItems,
      cat: draft.cat,
      payMethod: draft.payMethod,
      cardId: draft.cardId,
      mask_details: draft.mask_details,
    };
    setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => [...ds, diaryItem]);

    if (typeof navigator !== 'undefined' && !navigator.onLine && Array.isArray(diaryItem.photos) && diaryItem.photos.length > 0) {
      enqueueWithSync({ type: 'diary', householdId, payload: diaryItem }).catch(err => {
        // P0-5: quota 초과 시 사용자 알림
        if (err && err.message === 'STORAGE_QUOTA_EXCEEDED') {
          addToast('저장 공간이 부족합니다. 온라인 상태에서 다시 시도해주세요.', 'error');
        } else {
          console.warn('[idb-diary] enqueue fail:', err);
        }
      });
    }

    if (draft.type !== 'expense') return true;
    const items = Array.isArray(draft.expenseItems) ? draft.expenseItems : [];
    // P1-5: 부분 실패 보상 — addTxBatch/addTx 실패 시 diary 롤백
    try {
      if (items.length > 0) {
        /** @type {Omit<import('./constants/index.js').TxItem, 'id'>[]} */
        const txItems = items
          .filter(it => (it.amount || 0) > 0)
          .map(it => ({
            date: draft.date,
            amount: it.amount || 0,
            cat: it.cat || draft.cat || 'etc',
            memo: it.label || draft.content || '',
            who: draft.who,
            payMethod: it.payMethod || draft.payMethod || 'credit',
            cardId: it.cardId || draft.cardId || '',
            source_id: diaryId,
            label: it.label || '',
          }));
        if (txItems.length > 0) addTxBatch(txItems);
      } else if ((draft.totalSpent || 0) > 0) {
        addTx({
          date: draft.date,
          amount: Math.max(0, draft.totalSpent || 0),
          cat: draft.cat || 'etc',
          memo: draft.content || '',
          who: draft.who,
          payMethod: draft.payMethod || 'credit',
          cardId: draft.cardId || '',
          source_id: diaryId,
          label: '다이어리 지출',
        });
      }
    } catch (e) {
      console.error('[handleDiarySave] tx sync fail, rollback diary:', e);
      setDiaries(/** @param {import('./constants/index.js').DiaryItem[]} ds */ ds => ds.filter(x => x.id !== diaryId));
      addToast('지출 저장 실패 — 다이어리를 복원합니다', 'error');
      return false;
    }
    return true;
  }, [setDiaries, addTx, addTxBatch, addToast]);

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

  /** 5. 다이어리만 초기화 */
  const resetDiaries = useCallback(async () => {
    setSyncStatus("syncing");
    intentionalDiaryReset.current = true;
    await db.save(householdId, "diaries", EMPTY_DIARIES);
    await idbSaveDiariesSnapshot(householdId, EMPTY_DIARIES).catch(() => {});
    setDiariesRaw(EMPTY_DIARIES);
    setSyncStatus("ok");
    addToast("다이어리가 초기화되었습니다.");
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
      db.save(householdId, "settlements", EMPTY_SETTLEMENTS),
      db.save(householdId, "assets", EMPTY_ASSETS),
      db.save(householdId, "plan", {}),
      db.save(householdId, "budgets", INIT_BUDGETS),
      db.save(householdId, "taxConfig", DEFAULT_TAX_CONFIG),
      db.save(householdId, "diaries", EMPTY_DIARIES)
    ]);
    intentionalDiaryReset.current = true;
    await idbSaveDiariesSnapshot(householdId, EMPTY_DIARIES).catch(() => {});
    await loadShared(householdId);
    setSyncStatus("ok");
    addToast("전체 데이터가 초기화되었습니다.");
  }, [householdId, loadShared, addToast]);

  const leaveHousehold = useCallback(async () => {
    await savePrivate(LS_KEYS.HOUSEHOLD_ID, null);
    setHouseholdId(""); setSetupDone(false);
  }, [savePrivate]);

  const handleSetupDone = useCallback(async (hid, role) => {
    setHouseholdId(hid);
    setMyRole(role);
    await savePrivate(LS_KEYS.HOUSEHOLD_ID, hid);
    await savePrivate(LS_KEYS.MY_ROLE, role);
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

  const handleSosUpdate = useCallback(
    /** @param {number} id @param {Partial<SosRequest>} updates */
    async (id, updates) => {
      await db.updateSos(id, updates);
      setSosRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      addToast('가불 요청을 수정했습니다.');
    },
    [addToast]
  );

  const handleSosCancel = useCallback(
    /** @param {number} id */
    async (id) => {
      if (!confirm('가불 요청을 취소하시겠습니까?')) return;
      await db.deleteSos(id);
      setSosRequests(prev => prev.filter(r => r.id !== id));
      addToast('가불 요청이 취소되었습니다.');
    },
    [addToast]
  );

  const handleAdminLogin = useCallback(async () => {
    setIsAdmin(true);
    await savePrivate(LS_KEYS.IS_ADMIN, true);
    setView("admin");
  }, [savePrivate]);

  const handleAdminLogout = useCallback(async () => {
    setIsAdmin(false);
    await savePrivate(LS_KEYS.IS_ADMIN, false);
    setView("settings");
  }, [savePrivate]);

  if (!isSupabaseConfigured) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root" style={{ maxWidth: 480, margin: "0 auto", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div className="serif" style={{ fontSize: 20 }}>설정 오류</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Supabase 환경 변수가 설정되지 않았습니다.<br />
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
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>초기화 중...</div>
      </div>
    </>
  );

  if (!setupDone) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root">
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
      background: syncStatus === "error" ? "var(--danger-bg1)" : "var(--nav-bg)",
      backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${syncStatus === "error" ? "rgba(170,32,32,.3)" : "var(--border)"}`,
      fontSize: 10, color: syncStatus === "error" ? "var(--danger)" : "var(--text-faint)",
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
          background: syncStatus === "syncing" ? "var(--primary)" : syncStatus === "error" ? "var(--danger)" : "var(--success)",
          animation: syncStatus === "syncing" ? "spin 1s linear infinite" : "none",
          boxShadow: `0 0 8px ${syncStatus === "syncing" ? "var(--primary)" : syncStatus === "error" ? "var(--danger)" : "var(--success)"}80`
        }} />
        <span style={{ fontWeight: 600 }}>
          {syncStatus === "error" ? "서버 연결 오류" : syncStatus === "syncing" ? "동기화 중..." : "클라우드 실시간 연결됨 ⟳"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ letterSpacing: ".08em", fontWeight: 700, color: "var(--primary)" }}>{householdId}</span>
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
    fixed, setFixed, install, setInstall, cards, setCards, settlements, setSettlements, assets, setAssets,
    syncStatus, householdId, myRole,
    kidsMode, setKidsMode,
    diaries, setDiaries, addDiary, editDiary, editDiaryWithTx, deleteDiary, deleteDiaryWithTx, currentUser, setCurrentUser,
    addToast,
  };

  const lazyFallback = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-faint)", fontSize: 24 }}>
      ⟳
    </div>
  );

  return (
    <BudgetContext.Provider value={budgetContextValue}>
      <style dangerouslySetInnerHTML={{ __html: G }} />
      <div className="app-root" style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SyncBar />
        <div style={{ flex: 1, overflow: "hidden", marginTop: 28 }}>
          <Suspense fallback={lazyFallback}>
            {(() => {
              console.log("[App Routing] view:", view, "kidsMode:", kidsMode);

              // 1. 아이 관리 화면은 어떤 모드에서든 최우선으로 보여줌
              if (view === "kids-mgmt") return <ParentKidsMgmtView />;

              // 2. 키즈 모드인 경우
              if (kidsMode) {
                if (view === "settings") {
                  return <SettingsView names={names} setNames={setNames} budgets={budgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed} resetBudgets={resetBudgets} resetSetup={resetSetup} resetDiaries={resetDiaries} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} onBugReport={() => setShowBugReport(true)} onAdminTrigger={() => setShowAdminLogin(true)} isAdmin={isAdmin} onNavigate={setView} />;
                }
                return <KidsView />;
              }

              // 3. 일반 모드인 경우
              switch (view) {
                case "diary": return <DiaryView onOpenSheet={(who) => setDiarySheet(who || myRole)} />;
                case "history": return <HistoryView />;
                case "home": return <HomeView tx={tx} budgets={budgets} fixed={fixed} install={install} names={names} onAdd={setModal} sliderCfg={sliderCfg} onWidget={() => setShowWidget(true)} onScan={() => setShowCardScan(true)} plan={plan} setPlan={setPlan} cards={cards} onEdit={editTx} onDelete={deleteTx} onSettings={(v) => v === "budget" ? setView("budget") : setView("settings")} sosPending={sosPending} onSosResolve={handleSosResolve} homeLayout={homeLayout} setHomeLayout={setHomeLayout} />;
                case "entry": return <EntryView names={names} plan={plan} onSave={addTx} onDelete={deleteTx} onEdit={editTx} tx={tx} cards={cards} />;
                case "budget": return <BudgetView plan={plan} setPlan={setPlan} budgets={budgets} setBudgets={setBudgets} tx={tx} fixed={fixed} setFixed={setFixed} install={install} setInstall={setInstall} cards={cards} setCards={setCards} names={names} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} />;
                case "report": return <ReportView tx={tx} budgets={budgets} setBudgets={setBudgets} fixed={fixed} install={install} names={names} cards={cards} plan={plan} setPlan={setPlan} taxConfig={taxConfig} setTaxConfig={setTaxConfig} onEdit={editTx} onDelete={deleteTx} loadTxYear={loadTxYear} assets={assets} setAssets={setAssets} onGoToBudget={() => setView("budget")} />;
                case "settlement": return <SettlementView onBack={() => setView("settings")} />;
                case "settings": return <SettingsView names={names} setNames={setNames} budgets={budgets} sliderCfg={sliderCfg} setSliderCfg={setSliderCfg} resetAll={resetAll} resetTx={resetTx} resetFixed={resetFixed} resetBudgets={resetBudgets} resetSetup={resetSetup} resetDiaries={resetDiaries} householdId={householdId} myRole={myRole} leaveHousehold={leaveHousehold} tx={tx} onBugReport={() => setShowBugReport(true)} onAdminTrigger={() => setShowAdminLogin(true)} isAdmin={isAdmin} onNavigate={setView} />;
                case "admin": return isAdmin ? <AdminView onClose={handleAdminLogout} addToast={addToast} /> : null;
                case "dashboard": return <DashboardView />;
                case "private": return <PrivateWalletView plan={plan} tx={tx} myRole={myRole} names={names} householdId={householdId} onSosSubmit={handleSosSubmit} onAdd={() => setModal({ who: myRole, isPrivate: true })} onSettings={() => setView("settings")} onSosRequest={() => setShowSosRequest(true)} />;
                case "asset": return <AssetView assets={assets} setAssets={setAssets} />;
                case "tax": return <TaxOptimizerView tx={tx} names={names} taxConfig={taxConfig} setTaxConfig={setTaxConfig} />;
                case "dataImport": return <DataImportView plan={plan} setPlan={setPlan} onGoToPlan={() => setView("budget")} />;
                case "calendar": return <CalendarView tx={tx} cards={cards} names={names} budgets={budgets} onEdit={editTx} onDelete={deleteTx} loadTxYear={loadTxYear} />;
                default: return <DiaryView onOpenSheet={(who) => setDiarySheet(who || myRole)} />;
              }
            })()}
          </Suspense>
        </div>
        <Nav view={showQuickEntry ? "quickEntry" : view} setView={v => { if (v === "quickEntry") { setShowQuickEntry(true); return; } if (v === "diary-input") { setDiarySheet(myRole); return; } setView(v); }} syncStatus={syncStatus} kidsMode={kidsMode} />
        {modal && (
          <InputModal
            defaultWho={typeof modal === 'string' ? modal : modal.who}
            defaultIsPrivate={typeof modal === 'object' ? !!modal.isPrivate : false}
            names={names} plan={plan} cards={cards}
            onClose={() => setModal(null)} onSave={addTx}
            onCardScan={() => { setModal(null); setShowCardScan(true); }}
          />
        )}
        {diarySheet && (
          <InputSheet
            defaultWho={typeof diarySheet === 'string' ? diarySheet : diarySheet.who}
            onClose={() => setDiarySheet(null)}
            onSave={handleDiarySave}
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
