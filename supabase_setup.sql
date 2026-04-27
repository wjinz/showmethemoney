-- 1. kids_profiles 테이블 생성
CREATE TABLE IF NOT EXISTS kids_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  text NOT NULL REFERENCES household_data(id) ON DELETE CASCADE,
  name          text NOT NULL,
  avatar        text,
  goal_label    text NOT NULL,
  goal_amount   int  NOT NULL DEFAULT 0,
  saved_amount  int  NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE kids_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kids_own_household" ON kids_profiles
  FOR ALL USING (household_id = current_setting('app.household_id', true));

-- 2. kids_missions 테이블 생성
CREATE TABLE IF NOT EXISTS kids_missions (
  id           bigserial PRIMARY KEY,
  kid_id       uuid NOT NULL REFERENCES kids_profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  reward       int  NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'rewarded')),
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

-- 3. 기존 테이블 RLS 확인 및 보강
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_own_household" ON transactions
  FOR ALL USING (household_id = current_setting('app.household_id', true));

ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sos_own_household" ON sos_requests
  FOR ALL USING (household_id = current_setting('app.household_id', true));

-- 4. transactions 테이블 컬럼 추가
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS kid_id uuid REFERENCES kids_profiles(id);

-- 5. Supabase RPC (함수) 생성: 패널티 차감 시 0원 미만 방지 포함
CREATE OR REPLACE FUNCTION increment_kid_savings(
  p_kid_id     uuid,
  p_amount     int
) RETURNS void AS $$
  UPDATE kids_profiles
  SET saved_amount = GREATEST(0, saved_amount + p_amount)
  WHERE id = p_kid_id;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_and_reward_mission(p_mission_id bigint)
RETURNS void AS $$
DECLARE v_reward int; v_kid_id uuid;
BEGIN
  SELECT reward, kid_id INTO v_reward, v_kid_id FROM kids_missions WHERE id = p_mission_id;
  UPDATE kids_missions SET status = 'rewarded', completed_at = now() WHERE id = p_mission_id;
  UPDATE kids_profiles SET saved_amount = GREATEST(0, saved_amount + v_reward) WHERE id = v_kid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- P2-3: household_data RLS 정책 (claude 단계적 배포 가이드)
-- ============================================================
-- 1단계: set_household_id RPC 먼저 배포 (RLS는 아직 OFF)
CREATE OR REPLACE FUNCTION set_household_id(hid text)
RETURNS void AS $$
  SELECT set_config('app.household_id', hid, true);
$$ LANGUAGE sql SECURITY DEFINER;

-- 2단계: 클라이언트가 db.subscribe/loadAll 직전마다 RPC를 호출하도록 검증
--        (src/utils/supabase.js setHouseholdContext)
-- 3단계: 충분히 검증 후 아래 정책을 활성화
--        ALTER TABLE household_data ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "household_data_select" ON household_data
--   FOR SELECT USING (
--     id = current_setting('app.household_id', true)
--     OR id = 'GLOBAL_SYSTEM'
--   );
--
-- CREATE POLICY "household_data_write" ON household_data
--   FOR ALL USING (id = current_setting('app.household_id', true))
--   WITH CHECK (id = current_setting('app.household_id', true));
