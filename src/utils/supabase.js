import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const db = {
  // 특정 가계부 아이디(hid)의 모든 데이터를 불러옵니다.
  // tx는 연도별 키(tx_YYYY)로 저장되므로 여기서는 제외됩니다.
  /** @param {string} hid @returns {Promise<Record<string,any>>} */
  async loadAll(hid) {
    const { data, error } = await supabase
      .from('household_data')
      .select('key, value')
      .eq('id', hid);

    if (error) throw error;

    // [{key: 'tx', value: [...]}, ...] 형태를 {tx: [...], ...} 형태로 변환
    // tx_YYYY 키들은 별도로 처리되므로 그대로 반환
    /** @type {Record<string,any>} */
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
   * @param {(key: string, value: any, deleted?: boolean) => void} onUpdate
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
        { event: 'DELETE', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => { if (payload.old?.key) onUpdate(payload.old.key, [], true); }
      )
      .subscribe();
    this._channels.set(channelName, ch);
    return ch;
  },

  unsubscribe(hid) {
    const channelName = `realtime:household:${hid}`;
    const ch = this._channels.get(channelName);
    if (ch) { supabase.removeChannel(ch); this._channels.delete(channelName); }
  }
};
