/**
 * BudgetContext — 전역 공유 상태 Context API (Task 3-1)
 *
 * 목적: App.jsx → View 컴포넌트 간의 prop drilling 제거.
 * 전환 전략: 신규 컴포넌트부터 Context를 사용하고,
 *            기존 View는 점진적으로 전환한다.
 */
import { createContext, useContext } from "react";

/**
 * @typedef {Object} KidProfile
 * @property {string} id
 * @property {string} household_id
 * @property {string} name
 * @property {string} avatar
 * @property {string} goal_label
 * @property {number} goal_amount
 * @property {number} saved_amount
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} KidsMission
 * @property {number} id
 * @property {string} kid_id
 * @property {string} title
 * @property {number} reward
 * @property {'pending'|'done'|'rewarded'} status
 * @property {string|null} [completed_at]
 * @property {string} [created_at]
 */

/**
 * @typedef {Object} BudgetContextValue
 * @property {import('../constants').TxItem[]} tx
 * @property {(v: import('../constants').TxItem[] | ((prev: import('../constants').TxItem[]) => import('../constants').TxItem[])) => void} setTx
 * @property {(t: Omit<import('../constants').TxItem, 'id'>) => void} addTx
 * @property {(id: number) => void} deleteTx
 * @property {(id: number, updates: Partial<import('../constants').TxItem>) => void} editTx
 * @property {(items: Omit<import('../constants').TxItem, 'id'>[]) => void} addTxBatch
 * @property {(year: number) => Promise<void>} loadTxYear
 * @property {object} budgets
 * @property {(v: object | ((prev: object) => object)) => void} setBudgets
 * @property {object} plan
 * @property {(v: object | ((prev: object) => object)) => void} setPlan
 * @property {object} names
 * @property {(v: object) => void} setNames
 * @property {import('../constants').FixedItem[]} fixed
 * @property {(v: import('../constants').FixedItem[] | ((prev: import('../constants').FixedItem[]) => import('../constants').FixedItem[])) => void} setFixed
 * @property {import('../constants').InstallItem[]} install
 * @property {(v: import('../constants').InstallItem[] | ((prev: import('../constants').InstallItem[]) => import('../constants').InstallItem[])) => void} setInstall
 * @property {import('../constants').CardItem[]} cards
 * @property {(v: import('../constants').CardItem[] | ((prev: import('../constants').CardItem[]) => import('../constants').CardItem[])) => void} setCards
 * @property {import('../constants').SettlementItem[]} settlements
 * @property {(v: import('../constants').SettlementItem[] | ((prev: import('../constants').SettlementItem[]) => import('../constants').SettlementItem[])) => void} setSettlements
 * @property {object[]} assets
 * @property {(v: object[] | ((prev: object[]) => object[])) => void} setAssets
 * @property {string} syncStatus
 * @property {string} householdId
 * @property {string} myRole
 * @property {boolean} kidsMode
 * @property {(v: boolean) => void} setKidsMode
 * @property {import('../constants').DiaryItem[]} diaries
 * @property {(v: import('../constants').DiaryItem[] | ((prev: import('../constants').DiaryItem[]) => import('../constants').DiaryItem[])) => void} setDiaries
 * @property {(d: import('../constants').DiaryItem) => void} addDiary
 * @property {(d: import('../constants').DiaryItem) => void} editDiary
 * @property {(d: import('../constants').DiaryItem) => void} editDiaryWithTx
 * @property {(id: number) => void} deleteDiary
 * @property {(id: number) => void} deleteDiaryWithTx
 * @property {'husband'|'wife'} currentUser
 * @property {(v: 'husband'|'wife') => void} setCurrentUser
 */

/** @type {import('react').Context<BudgetContextValue | null>} */
export const BudgetContext = createContext(null);

/**
 * BudgetContext 소비 훅.
 * BudgetProvider 외부에서 호출 시 명시적 오류를 던집니다.
 * @returns {BudgetContextValue}
 */
export function useBudget() {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget must be used within a BudgetContext.Provider");
  }
  return ctx;
}
