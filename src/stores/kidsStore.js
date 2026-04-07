/**
 * kidsStore.js — Kids 전용 Zustand 스토어
 *
 * BudgetContext 대신 Zustand를 사용해 Kids 관련 상태를 격리.
 * tx 업데이트 시 Kids 구독 컴포넌트만 리렌더링됨.
 */
import { create } from 'zustand';
import { supabase } from '../utils/supabase.js';
import { db } from '../utils/supabase.js';

/**
 * @typedef {import('../context/BudgetContext.jsx').KidProfile} KidProfile
 * @typedef {import('../context/BudgetContext.jsx').KidsMission} KidsMission
 */

/**
 * @typedef {Object} KidsState
 * @property {KidProfile[]} kidsProfiles
 * @property {KidsMission[]} kidsMissions
 * @property {boolean} loading
 */

/**
 * @typedef {Object} KidsActions
 * @property {(profiles: KidProfile[]) => void} setKidsProfiles
 * @property {(missions: KidsMission[]) => void} setKidsMissions
 * @property {(householdId: string) => Promise<void>} loadKids
 * @property {(profile: KidProfile) => void} addProfile
 * @property {(kidId: string, updates: Partial<KidProfile>) => void} updateProfile
 * @property {(mission: KidsMission) => void} addMission
 * @property {(missionId: number, kidId: string, amount: number) => void} rewardMission
 */

/** @typedef {KidsState & KidsActions} KidsStore */

export const useKidsStore = create(
  /** @returns {KidsStore} */
  () => ({
    kidsProfiles: [],
    kidsMissions: [],
    loading: false,

    /** @param {KidProfile[]} profiles */
    setKidsProfiles: (profiles) =>
      useKidsStore.setState({ kidsProfiles: profiles }),

    /** @param {KidsMission[]} missions */
    setKidsMissions: (missions) =>
      useKidsStore.setState({ kidsMissions: missions }),

    /** @param {string} householdId */
    loadKids: async (householdId) => {
      if (!householdId || !supabase) return;
      useKidsStore.setState({ loading: true });
      try {
        const profiles = await db.loadKidProfiles(householdId);
        const kidIds = profiles.map(p => p.id);
        const missions = await db.loadKidsMissions(kidIds);
        useKidsStore.setState({ kidsProfiles: profiles, kidsMissions: missions });
      } catch (e) {
        console.error('[kidsStore] loadKids 실패:', e);
      } finally {
        useKidsStore.setState({ loading: false });
      }
    },

    /** @param {KidProfile} profile */
    addProfile: (profile) =>
      useKidsStore.setState(s => ({ kidsProfiles: [...s.kidsProfiles, profile] })),

    /**
     * @param {string} kidId
     * @param {Partial<KidProfile>} updates
     */
    updateProfile: (kidId, updates) =>
      useKidsStore.setState(s => ({
        kidsProfiles: s.kidsProfiles.map(p =>
          p.id === kidId ? { ...p, ...updates } : p
        ),
      })),

    /** @param {KidsMission} mission */
    addMission: (mission) =>
      useKidsStore.setState(s => ({ kidsMissions: [...s.kidsMissions, mission] })),

    /**
     * 미션 보상 지급 낙관적 업데이트 (saved_amount 음수 방지)
     * @param {number} missionId
     * @param {string} kidId
     * @param {number} amount
     */
    rewardMission: (missionId, kidId, amount) =>
      useKidsStore.setState(s => ({
        kidsMissions: s.kidsMissions.map(m =>
          m.id === missionId ? { ...m, status: /** @type {'rewarded'} */ ('rewarded') } : m
        ),
        kidsProfiles: s.kidsProfiles.map(p =>
          p.id === kidId
            ? { ...p, saved_amount: Math.max(0, p.saved_amount + amount) }
            : p
        ),
      })),
  })
);
