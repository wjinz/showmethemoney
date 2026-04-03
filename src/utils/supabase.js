import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] 환경 변수가 설정되지 않았습니다. .env.local을 확인하세요. (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  // 특정 가계부 아이디(hid)의 모든 데이터를 불러옵니다.
  // tx는 연도별 키(tx_YYYY)로 저장되므로 여기서는 제외됩니다.
  async loadAll(hid) {
    const { data, error } = await supabase
      .from('household_data')
      .select('key, value')
      .eq('id', hid);

    if (error) throw error;

    // [{key: 'tx', value: [...]}, ...] 형태를 {tx: [...], ...} 형태로 변환
    // tx_YYYY 키들은 별도로 처리되므로 그대로 반환
    return data.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
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

  // 특정 가계부 아이디의 특정 키(fixed, plan 등) 데이터를 저장(upsert)합니다.
  async save(hid, key, value) {
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: hid, key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
  },

  // 실시간 구독 설정 — tx_YYYY 키 변경도 처리
  subscribe(hid, onUpdate) {
    return supabase
      .channel(`realtime:household:${hid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => {
          onUpdate(payload.new.key, payload.new.value);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'household_data', filter: `id=eq.${hid}` },
        (payload) => {
          onUpdate(payload.new.key, payload.new.value);
        }
      )
      .subscribe();
  }
};
