import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://epspmlslonvkkxorulbg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4Q2Yu0N55fGAcLwXGljgMQ_ayqEaa7q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
  // 특정 가계부 아이디(hid)의 모든 데이터를 불러옵니다.
  async loadAll(hid) {
    const { data, error } = await supabase
      .from('household_data')
      .select('key, value')
      .eq('id', hid);

    if (error) throw error;
    
    // [{key: 'tx', value: [...]}, ...] 형태를 {tx: [...], ...} 형태로 변환
    return data.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  },

  // 특정 가계부 아이디의 특정 키(tx, fixed 등) 데이터를 저장(upsert)합니다.
  async save(hid, key, value) {
    const { error } = await supabase
      .from('household_data')
      .upsert({ id: hid, key, value, updated_at: new Date().toISOString() });
    
    if (error) throw error;
  },

  // 실시간 구독 설정
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
