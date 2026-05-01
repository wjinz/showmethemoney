import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const db = {
  /**
   * @typedef {Object} BudgetData
   * @property {import('../constants/index.js').TxItem[]} [tx]
   * @property {import('../constants/index.js').FixedItem[]} [fixed]
   * @property {import('../constants/index.js').InstallItem[]} [install]
   * @property {import('../constants/index.js').CardItem[]} [cards]
   * @property {import('../constants/index.js').SettlementItem[]} [settlements]
   * @property {Object[]} [assets]
   * @property {Record<string, number>} [budgets]
   * @property {{ husband: string, wife: string }} [names]
   * @property {Object} [plan]
   * @property {Object} [taxConfig]
   * @property {Object} [widgetLayout]
   * @property {Object} [homeLayout]
   * @property {boolean} [kidsMode]
   * @property {boolean} [migrated_to_rdb]
   * @property {any} [key] // For dynamic tx_YYYY keys, we might still need some flexibility or a catch-all
   */

  // 특정 가계부 아이디(hid)의 모든 데이터를 불러옵니다.
  // tx는 연도별 키(tx_YYYY)로 저장되므로 여기서는 제외됩니다.
  /** @param {string} hid @returns {Promise<Record<string, BudgetData[keyof BudgetData]>>} */
  async loadAll(hid) {
    const { data, error } = await supabase
      .from('household_data')
      .select('key, value')
      .eq('id', hid);

    if (error) throw error;

    // [{key: 'tx', value: [...]}, ...] 형태를 {tx: [...], ...} 형태로 변환
    // tx_YYYY 키들은 별도로 처리되므로 그대로 반환
    /** @type {Record<string, BudgetData[keyof BudgetData]>} */
    const result = {};
    for (const row of data) result[row.key] = row.value;
    return result;
  },

  /**
   * 특정 연도의 tx 데이터를 불러옵니다.
   * @param {string} hid - 가계부 ID
   * @param {number} year - 연도 (예: 2026)
   * @returns {Promise<Array>}
   */
  async loadTx(hid, year) {
    const { data, error } = await supabase
      .from('household_data')
      .select('value')
      .eq('id', hid)
      .eq('key', `tx_${year}`)
      .maybeSingle();
    if (error) throw error;
    return Array.isArray(data?.value) ? data.value : [];
  },

  /**
   * 특정 연도의 tx 데이터를 저장합니다.
   * @param {string} hid - 가계부 ID
   * @param {number} year - 연도 (예: 2026)
   * @param {Array} value - 거래 배열
   */
  async saveTx(hid, year, value) {
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: hid, key: `tx_${year}`, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  /**
   * 해당 가계부의 모든 연도별 지출 내역(tx_YYYY)을 일괄 삭제합니다.
   * @param {string} hid - 가계부 ID
   */
  async clearAllTransactions(hid) {
    const { error } = await supabase
      .from('household_data')
      .delete()
      .eq('id', hid)
      .like('key', 'tx_%');
    if (error) throw error;
  },

  // 특정 가계부 아이디의 특정 키(fixed, plan 등) 데이터를 저장(upsert)합니다.
  /** @param {string} hid @param {string} key @param {BudgetData[keyof BudgetData]} value */
  async save(hid, key, value) {
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: hid, key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
  },

  /**
   * 버그 리포트를 글로벌 시스템 영역에 저장합니다.
   * @param {string} hid - 가계부 ID
   * @param {object} data - 버그 내용 및 환경 정보
   */
  async reportBug(hid, data) {
    const key = `bug_${Date.now()}_${hid}`;
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: 'GLOBAL_SYSTEM', key, value: data, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  /**
   * 모든 버그 리포트를 불러옵니다 (관리자용).
   */
  async loadBugs() {
    const { data, error } = await supabase
      .from('household_data')
      .select('*')
      .eq('id', 'GLOBAL_SYSTEM')
      .like('key', 'bug_%')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  /**
   * 특정 버그 리포트의 상태를 업데이트합니다.
   * @param {string} key - 버그 리포트 키
   * @param {object} newValue - 업데이트할 버그 데이터 객체
   */
  async updateBugStatus(key, newValue) {
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: 'GLOBAL_SYSTEM', key, value: newValue, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  // B10: 채널 중복 방지 — 이미 구독 중인 채널 재사용
  /** @type {Map<string, ReturnType<NonNullable<typeof supabase>['channel']>>} */
  _channels: new Map(),

  // B5: DELETE 이벤트 포함 — 실시간 구독 설정
  /**
   * @param {string} hid
   * @param {(key: string, value: BudgetData[keyof BudgetData], deleted?: boolean) => void} onUpdate
   */
  subscribe(hid, onUpdate) {
    const channelName = `realtime:household:${hid}`;
    // B10: 중복 채널 방지
    if (this._channels.has(channelName)) {
      return this._channels.get(channelName);
    }
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => { onUpdate(payload.new.key, payload.new.value); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => { onUpdate(payload.new.key, payload.new.value); }
      )
      .on(
        'postgres_changes',
        // B5: DELETE 이벤트 — key를 빈 배열로 처리해 UI 반영
        // Hotfix-D1 (2026-04-30): diaries 키는 DELETE 이벤트로도 빈 배열을 강제하지 않음.
        // Realtime payload truncation으로 row가 잠시 사라진 것처럼 보일 수 있어 데이터 유실 위험.
        { event: 'DELETE', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => {
          const k = payload.old?.key;
          if (!k) return;
          if (k === 'diaries') {
            console.warn('[Sync] diaries DELETE event ignored to prevent data loss');
            return;
          }
          onUpdate(k, [], true);
        }
      )
      .subscribe();
    this._channels.set(channelName, ch);
    return ch;
  },

  /** @param {string} hid */
  unsubscribe(hid) {
    const channelName = `realtime:household:${hid}`;
    const ch = this._channels.get(channelName);
    if (ch) { supabase.removeChannel(ch); this._channels.delete(channelName); }
  },

  /**
   * P2-3: RLS 활성화 시 사용. 클라이언트 세션에 household_id를 set.
   * RPC가 정의되어 있지 않으면 무시 (단계적 배포 호환).
   * @param {string} hid
   */
  async setHouseholdContext(hid) {
    try {
      const { error } = await supabase.rpc('set_household_id', { hid });
      if (error && error.code !== '42883' /* function does not exist */) {
        console.warn('[RLS] set_household_id failed:', error.message);
      }
    } catch (e) {
      console.warn('[RLS] set_household_id throw:', e);
    }
  },

  /**
   * SOS 채널만 해제 (P0-2)
   * @param {string} hid
   */
  unsubscribeSos(hid) {
    const channelName = `sos:${hid}`;
    const ch = this._channels.get(channelName);
    if (ch) { supabase.removeChannel(ch); this._channels.delete(channelName); }
  },

  /**
   * 해당 household의 모든 활성 채널을 일제 정리 (P0-2 보강)
   * @param {string} hid
   */
  unsubscribeAll(hid) {
    const prefixes = [`realtime:household:${hid}`, `sos:${hid}`];
    for (const name of prefixes) {
      const ch = this._channels.get(name);
      if (ch) { supabase.removeChannel(ch); this._channels.delete(name); }
    }
  },

  // ── transactions 테이블 CRUD ──────────────────────────────────────────

  /**
   * 단건 insert
   * @param {string} hid
   * @param {import('../constants/index.js').TxItem & { is_private?: boolean }} tx
   */
  async insertTx(hid, tx) {
    const { error } = await supabase.from('transactions').insert({
      household_id: hid,
      date:         tx.date,
      amount:       tx.amount,
      cat:          tx.cat,
      memo:         tx.memo,
      who:          tx.who,
      pay_method:   tx.payMethod,
      card_id:      tx.cardId ?? null,
      is_private:   tx.is_private ?? false,
      tx_type:      tx.type ?? 'expense',
    });
    if (error) throw error;
  },

  /**
   * 다건 bulk insert — CardScanSheet, 마이그레이션 등
   * @param {string} hid
   * @param {Array<import('../constants/index.js').TxItem & { is_private?: boolean }>} txList
   */
  async insertTxBatch(hid, txList) {
    if (!txList.length) return;
    const rows = txList.map(tx => ({
      household_id: hid,
      date:         tx.date,
      amount:       tx.amount,
      cat:          tx.cat,
      memo:         tx.memo,
      who:          tx.who,
      pay_method:   tx.payMethod,
      card_id:      tx.cardId ?? null,
      is_private:   tx.is_private ?? false,
      tx_type:      tx.type ?? 'expense',
    }));
    const { error } = await supabase.from('transactions').insert(rows);
    if (error) throw error;
  },

  /**
   * 월별 총지출 집계 RPC 호출
   * @param {string} hid
   * @param {number} year
   * @param {number} month
   * @returns {Promise<Array<{ who: string, total: number }>>}
   */
  async getMonthlyTotals(hid, year, month) {
    const { data, error } = await supabase.rpc('get_monthly_total_expenses', {
      p_household_id: hid, p_year: year, p_month: month,
    });
    if (error) throw error;
    return /** @type {Array<{ who: string, total: number }>} */ (data ?? []);
  },

  // ── SOS 가불 시스템 ────────────────────────────────────────────────────

  /**
   * SOS 가불 요청 생성
   * @param {string} hid
   * @param {{ requester: string, amount: number, reason: string, repay_plan: string }} req
   * @returns {Promise<import('../constants/index.js').SosRequest>}
   */
  async createSosRequest(hid, req) {
    const { data, error } = await supabase.from('sos_requests').insert({
      household_id: hid,
      requester:    req.requester,
      amount:       req.amount,
      reason:       req.reason,
      repay_plan:   req.repay_plan,
      status:       'pending',
    }).select().single();
    if (error) throw error;
    return /** @type {import('../constants/index.js').SosRequest} */ (data);
  },

  /**
   * SOS 승인/거절 — SQL 트리거(trg_sos_approved)가 approved 시 transactions 자동 insert
   * @param {number} id
   * @param {'approved'|'rejected'} status
   */
  async resolveSos(id, status) {
    const { error } = await supabase.from('sos_requests')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * SOS 요청 수정 (금액, 사유 등)
   * @param {number} id
   * @param {Partial<import('../constants/index.js').SosRequest>} updates
   */
  async updateSos(id, updates) {
    const { error } = await supabase.from('sos_requests')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * SOS 요청 삭제 (취소)
   * @param {number} id
   */
  async deleteSos(id) {
    const { error } = await supabase.from('sos_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * pending 상태 SOS 요청 목록 조회
   * @param {string} hid
   * @returns {Promise<import('../constants/index.js').SosRequest[]>}
   */
  async loadPendingSos(hid) {
    const { data, error } = await supabase.from('sos_requests')
      .select('*').eq('household_id', hid)
      .eq('status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    return /** @type {import('../constants/index.js').SosRequest[]} */ (data ?? []);
  },

  /**
   * SOS 채널 실시간 구독
   * @param {string} hid
   * @param {(req: import('../constants/index.js').SosRequest) => void} onInsert
   */
  subscribeSos(hid, onInsert) {
    const channelName = `sos:${hid}`;
    if (this._channels.has(channelName)) return this._channels.get(channelName);
    const ch = supabase.channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_requests', filter: `household_id=eq.${hid}` },
        (payload) => { onInsert(/** @type {import('../constants/index.js').SosRequest} */ (payload.new)); }
      )
      .subscribe();
    this._channels.set(channelName, ch);
    return ch;
  },

  // ── Kids CRUD ─────────────────────────────────────────────────────────────

  /**
   * 아이 프로필 생성
   * @param {string} hid
   * @param {Omit<import('../context/BudgetContext.jsx').KidProfile, 'id'|'created_at'|'household_id'>} profile
   * @returns {Promise<import('../context/BudgetContext.jsx').KidProfile>}
   */
  async createKidProfile(hid, profile) {
    const { data, error } = await supabase
      .from('kids_profiles')
      .insert({ household_id: hid, ...profile })
      .select()
      .single();
    if (error) throw error;
    return /** @type {import('../context/BudgetContext.jsx').KidProfile} */ (data);
  },

  /**
   * 아이 프로필 업데이트
   * @param {string} kidId
   * @param {Partial<Omit<import('../context/BudgetContext.jsx').KidProfile, 'id'|'household_id'|'created_at'>>} updates
   */
  async updateKidProfile(kidId, updates) {
    const { error } = await supabase
      .from('kids_profiles')
      .update(updates)
      .eq('id', kidId);
    if (error) throw error;
  },

  /**
   * 미션 생성
   * @param {string} kidId
   * @param {Omit<import('../context/BudgetContext.jsx').KidsMission, 'id'|'created_at'|'completed_at'|'kid_id'>} mission
   * @returns {Promise<import('../context/BudgetContext.jsx').KidsMission>}
   */
  async createMission(kidId, mission) {
    const { data, error } = await supabase
      .from('kids_missions')
      .insert({ kid_id: kidId, ...mission })
      .select()
      .single();
    if (error) throw error;
    return /** @type {import('../context/BudgetContext.jsx').KidsMission} */ (data);
  },

  /**
   * 미션 상태 업데이트 (done | rewarded)
   * @param {number} missionId
   * @param {'done'|'rewarded'} status
   */
  async completeMission(missionId, status) {
    const { error } = await supabase
      .from('kids_missions')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', missionId);
    if (error) throw error;
  },

  /**
   * complete_and_reward_mission RPC — 원자적으로 미션 완료 + 저금 증감
   * @param {number} missionId
   */
  async completeAndRewardMission(missionId) {
    const { error } = await supabase.rpc('complete_and_reward_mission', {
      p_mission_id: missionId,
    });
    if (error) throw error;
  },

  /**
   * 아이 저금액 증감 (increment_kid_savings RPC)
   * @param {string} kidId
   * @param {number} amount
   */
  async rewardKid(kidId, amount) {
    const { error } = await supabase.rpc('increment_kid_savings', {
      p_kid_id: kidId,
      p_amount: amount,
    });
    if (error) throw error;
  },

  /**
   * 가계부의 아이 프로필 목록 로드
   * @param {string} hid
   * @returns {Promise<import('../context/BudgetContext.jsx').KidProfile[]>}
   */
  async loadKidProfiles(hid) {
    const { data, error } = await supabase
      .from('kids_profiles')
      .select('*')
      .eq('household_id', hid);
    if (error) throw error;
    return /** @type {import('../context/BudgetContext.jsx').KidProfile[]} */ (data ?? []);
  },

  /**
   * 아이 목록에 해당하는 미션 전체 로드
   * @param {string[]} kidIds
   * @returns {Promise<import('../context/BudgetContext.jsx').KidsMission[]>}
   */
  async loadKidsMissions(kidIds) {
    if (!kidIds.length) return [];
    const { data, error } = await supabase
      .from('kids_missions')
      .select('*')
      .in('kid_id', kidIds);
    if (error) throw error;
    return /** @type {import('../context/BudgetContext.jsx').KidsMission[]} */ (data ?? []);
  },
};
