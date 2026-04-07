/**
 * ParentKidsMgmtView — 부모용 아이 관리 화면
 *
 * 구조:
 *   KidSelector (탭) → KidGoalCard → MissionList → AddMissionSheet
 */
import { useState, useCallback } from 'react';
import { useKidsStore } from '../stores/kidsStore.js';
import { useBudget } from '../context/BudgetContext.jsx';
import { db } from '../utils/supabase.js';
import { BottomSheet } from '../components/BottomSheet.jsx';
import { NumericInput } from '../components/NumericInput.jsx';
import { fmtC } from '../utils/helpers.js';

/**
 * @typedef {import('../context/BudgetContext.jsx').KidProfile} KidProfile
 * @typedef {import('../context/BudgetContext.jsx').KidsMission} KidsMission
 */

export function ParentKidsMgmtView() {
  const { householdId } = useBudget();
  const { kidsProfiles, kidsMissions, addMission, rewardMission, addProfile } = useKidsStore();

  const [selectedKidId, setSelectedKidId] = useState(/** @type {string|null} */ (kidsProfiles[0]?.id ?? null));
  const [showAddMission, setShowAddMission] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);

  const selectedKid = kidsProfiles.find(p => p.id === selectedKidId) ?? null;
  const missions = kidsMissions.filter(m => m.kid_id === selectedKidId);
  const goalPct = selectedKid && selectedKid.goal_amount > 0
    ? Math.min(100, Math.round((selectedKid.saved_amount / selectedKid.goal_amount) * 100))
    : 0;

  const handleReward = useCallback(
    /** @param {KidsMission} mission */
    async (mission) => {
      if (mission.status !== 'done') return;
      try {
        await db.completeAndRewardMission(mission.id);
        rewardMission(mission.id, mission.kid_id, mission.reward);
      } catch (e) {
        console.error('[ParentKidsMgmtView] 보상 지급 실패:', e);
        window.alert('보상 지급 실패: ' + (e.message || e));
      }
    },
    [rewardMission]
  );

  const handleMarkDone = useCallback(
    /** @param {KidsMission} mission */
    async (mission) => {
      if (mission.status !== 'pending') return;
      try {
        await db.completeMission(mission.id, 'done');
        const { useKidsStore: store } = await import('../stores/kidsStore.js');
        store.getState().setKidsMissions(
          kidsMissions.map(m => m.id === mission.id ? { ...m, status: /** @type {'done'} */ ('done') } : m)
        );
      } catch (e) {
        console.error('[ParentKidsMgmtView] 미션 완료 처리 실패:', e);
        window.alert('미션 완료 처리 실패: ' + (e.message || e));
      }
    },
    [kidsMissions]
  );

  const handleAddMission = useCallback(
    /** @param {{ title: string, reward: number }} params */
    async ({ title, reward }) => {
      if (!selectedKidId) return;
      try {
        const newMission = await db.createMission(selectedKidId, { title, reward, status: 'pending' });
        addMission(newMission);
        setShowAddMission(false);
      } catch (e) {
        console.error('[ParentKidsMgmtView] 미션 추가 실패:', e);
        window.alert('미션 추가 실패: ' + (e.message || e));
      }
    },
    [selectedKidId, addMission]
  );

  const handleAddKid = useCallback(
    /** @param {{ name: string, avatar: string, goal_label: string, goal_amount: number }} params */
    async (params) => {
      if (!householdId) {
        window.alert('가계부 아이디(HID)를 찾을 수 없습니다. 동기화 상태를 확인해주세요.');
        return;
      }
      try {
        const newProfile = await db.createKidProfile(householdId, { ...params, saved_amount: 0 });
        addProfile(newProfile);
        setSelectedKidId(newProfile.id);
        setShowAddKid(false);
      } catch (e) {
        console.error('[ParentKidsMgmtView] 아이 추가 실패:', e);
        window.alert('아이 추가 실패: ' + (e.message || e));
      }
    },
    [householdId, addProfile]
  );

  return (
    <div style={{ padding: '16px 16px 120px', overflowY: 'auto', height: '100%', background: 'var(--bg)' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>👶 아이 관리</div>

      {/* 아이 선택 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {kidsProfiles.map(kid => (
          <button
            key={kid.id}
            onClick={() => setSelectedKidId(kid.id)}
            style={{
              padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
              background: selectedKidId === kid.id ? 'var(--gold)' : 'var(--bg2)',
              color: selectedKidId === kid.id ? '#fff' : 'var(--text2)',
              fontWeight: 700, fontSize: 13,
            }}
          >
            {kid.avatar} {kid.name}
          </button>
        ))}
        <button
          onClick={() => setShowAddKid(true)}
          style={{
            padding: '8px 14px', borderRadius: 99, border: '1px dashed var(--border2)',
            background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 12,
          }}
        >
          + 아이 추가
        </button>
      </div>

      {kidsProfiles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: 13 }}>
          아이를 추가하고 저금통 목표를 설정해보세요 🐷
        </div>
      )}

      {selectedKid && (
        <>
          {/* 목표 게이지 카드 */}
          <div style={{ background: 'var(--bg2)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>🎯 {selectedKid.goal_label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
              <span>{fmtC(selectedKid.saved_amount)}원</span>
              <span>{goalPct}%</span>
            </div>
            <div style={{ height: 10, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${goalPct}%`,
                background: goalPct >= 100 ? '#22c55e' : 'var(--gold)',
                transition: 'width 0.5s ease',
              }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>
              목표: {fmtC(selectedKid.goal_amount)}원
            </div>
          </div>

          {/* 미션 목록 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>미션 목록</span>
              <button onClick={() => setShowAddMission(true)}
                style={{ background: 'var(--goldD)', color: 'var(--gold)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                + 미션 추가
              </button>
            </div>
            {missions.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '20px 0' }}>
                미션을 추가해서 아이에게 동기를 주세요!
              </div>
            )}
            {missions.map(m => {
              const isPenalty = m.reward < 0;
              return (
                <div key={m.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--bg2)', borderRadius: 12, padding: '12px 14px', marginBottom: 8,
                  border: `1px solid ${m.status === 'rewarded' ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: isPenalty ? '#ef4444' : 'var(--gold)' }}>
                      {isPenalty ? `${fmtC(m.reward)}원 차감` : `+${fmtC(m.reward)}원`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {m.status === 'pending' && (
                      <button onClick={() => handleMarkDone(m)}
                        style={{ background: 'var(--bg3)', color: 'var(--text2)', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, cursor: 'pointer' }}>
                        완료 확인
                      </button>
                    )}
                    {m.status === 'done' && (
                      <button onClick={() => handleReward(m)}
                        style={{ background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        보상 지급
                      </button>
                    )}
                    {m.status === 'pending' && <span style={{ fontSize: 18 }}>⏳</span>}
                    {m.status === 'rewarded' && <span style={{ fontSize: 18 }}>✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <AddMissionSheet isOpen={showAddMission} onAdd={handleAddMission} onClose={() => setShowAddMission(false)} />
      <AddKidSheet isOpen={showAddKid} onAdd={handleAddKid} onClose={() => setShowAddKid(false)} />
    </div>
  );
}

// ── AddMissionSheet ─────────────────────────────────────────────────────────

/**
 * @param {{ isOpen: boolean, onAdd: (p: { title: string, reward: number }) => void, onClose: () => void }} props
 */
function AddMissionSheet({ isOpen, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState(0);
  const [isPenalty, setIsPenalty] = useState(false);

  const handleSubmit = () => {
    const r = Number(reward);
    if (!title.trim() || !r) return;
    onAdd({ title: title.trim(), reward: r * (isPenalty ? -1 : 1) });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>미션 추가</div>
        <input
          placeholder="미션 내용 (예: 레고 정리하기)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
        />
        <NumericInput
          placeholder="보상 금액 (원)"
          value={reward}
          onChange={v => setReward(v)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setIsPenalty(p => !p)}
            style={{
              padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: isPenalty ? '#ef4444' : 'var(--bg3)',
              color: isPenalty ? '#fff' : 'var(--text3)',
            }}
          >
            {isPenalty ? '⚠ 패널티 미션' : '패널티로 전환'}
          </button>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {isPenalty ? '차감 미션: 규칙 위반 시 저금 감소' : '보상 미션: 완료 시 저금 증가'}
          </span>
        </div>
        <button onClick={handleSubmit}
          style={{ width: '100%', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          미션 등록
        </button>
      </div>
    </BottomSheet>
  );
}

// ── AddKidSheet ─────────────────────────────────────────────────────────────

const AVATAR_OPTIONS = ['🐶', '🐱', '🐸', '🐼', '🦊', '🐧', '🐨', '🦁'];

/**
 * @param {{ isOpen: boolean, onAdd: (p: { name: string, avatar: string, goal_label: string, goal_amount: number }) => void, onClose: () => void }} props
 */
function AddKidSheet({ isOpen, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🐶');
  const [goalLabel, setGoalLabel] = useState('');
  const [goalAmount, setGoalAmount] = useState(0);

  const handleSubmit = () => {
    const amount = Number(goalAmount);
    if (!name.trim() || !goalLabel.trim() || !amount) return;
    onAdd({ name: name.trim(), avatar, goal_label: goalLabel.trim(), goal_amount: amount });
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>아이 추가</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {AVATAR_OPTIONS.map(a => (
            <button key={a} onClick={() => setAvatar(a)}
              style={{ fontSize: 28, background: avatar === a ? 'var(--goldD)' : 'var(--bg3)', border: `2px solid ${avatar === a ? 'var(--gold)' : 'transparent'}`, borderRadius: 12, padding: 8, cursor: 'pointer' }}>
              {a}
            </button>
          ))}
        </div>
        <input placeholder="이름" value={name} onChange={e => setName(e.target.value)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
        <input placeholder="목표 (예: 레고 테크닉 42151)" value={goalLabel} onChange={e => setGoalLabel(e.target.value)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' }} />
        <NumericInput placeholder="목표 금액 (원)" value={goalAmount} onChange={v => setGoalAmount(v)}
          style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 14, marginBottom: 20, outline: 'none', boxSizing: 'border-box' }} />
        <button onClick={handleSubmit}
          style={{ width: '100%', background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          추가
        </button>
      </div>
    </BottomSheet>
  );
}
