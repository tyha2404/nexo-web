/**
 * Window events fired after data changed (a local save, a Supabase realtime echo, an app
 * resume). Pages refetch on them through useDataEvents.
 */
export const DATA_EVENTS = {
  TRANSACTIONS_CHANGED: 'transactions-changed',
  WALLETS_CHANGED: 'wallets-changed',
  BUDGETS_CHANGED: 'budgets-changed',
  DEBTS_CHANGED: 'debts-changed',
  CATEGORIES_CHANGED: 'categories-changed',
  TARGETS_CHANGED: 'targets-changed',
} as const;

export type DataEvent = (typeof DATA_EVENTS)[keyof typeof DATA_EVENTS];

/** App-level window events (auth state, opening global UI from anywhere). */
export const APP_EVENTS = {
  AUTH_CHANGED: 'auth-changed',
  /** A request outside /auth got a 401 (services/client.ts); App logs the user out. */
  AUTH_EXPIRED: 'auth-expired',
  OPEN_AI_CHAT: 'open-ai-chat',
  OPEN_ADD_CATEGORY_MODAL: 'open-add-category-modal',
  OPEN_ADD_TARGET_MODAL: 'open-add-target-modal',
} as const;
