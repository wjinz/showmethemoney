/**
 * BudgetContext — 전역 공유 상태 Context API (Task 3-1)
 *
 * 목적: App.jsx → View 컴포넌트 간의 prop drilling 제거.
 * 전환 전략: 신규 컴포넌트부터 Context를 사용하고,
 *            기존 View는 점진적으로 전환한다.
 */
import { createContext, useContext } from "react";

/**
 * @typedef {Object} BudgetContextValue
 * @property {import('../constants').TxItem[]} tx
 * @property {(v: import('../constants').TxItem[] | ((prev: import('../constants').TxItem[]) => import('../constants').TxItem[])) => void} setTx
 * @property {object} budgets
 * @property {(v: object | ((prev: object) => object)) => void} setBudgets
 * @property {object} plan
 * @property {(v: object | ((prev: object) => object)) => void} setPlan
 * @property {object} names
 * @property {(v: object) => void} setNames
 * @property {object[]} fixed
 * @property {(v: object[] | ((prev: object[]) => object[])) => void} setFixed
 * @property {object[]} install
 * @property {(v: object[] | ((prev: object[]) => object[])) => void} setInstall
 * @property {object[]} cards
 * @property {(v: object[] | ((prev: object[]) => object[])) => void} setCards
 * @property {object[]} assets
 * @property {(v: object[] | ((prev: object[]) => object[])) => void} setAssets
 * @property {string} syncStatus
 * @property {string} householdId
 * @property {string} myRole
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
