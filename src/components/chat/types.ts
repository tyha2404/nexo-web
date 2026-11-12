import moment from 'moment';
import type { TransactionType } from '../../commons/constants';
import type { ActionCard } from '../../services';
import type { Debt, DebtType } from '../../commons/types';

/**
 * Payloads of the AI action cards, per `actionType`, as the Go API sends them
 * (nexo-app-api/internal/service/chat_write_proposals.go and financial_tools*.go).
 */

/**
 * Every `actionType` the API attaches to a reply (data-carrying ones are typed in
 * ActionCardDataMap; the rest are display-only cards).
 */
export const ACTION_TYPES = {
  PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
  TRANSACTION_CREATED: 'TRANSACTION_CREATED',
  CATEGORY_CREATED: 'CATEGORY_CREATED',
  WALLET_TRANSFER: 'WALLET_TRANSFER',
  DEBT_CREATED: 'DEBT_CREATED',
  DEBT_REPAID: 'DEBT_REPAID',
  BUDGET_SET: 'BUDGET_SET',
  BUDGET_ALERT: 'BUDGET_ALERT',
  TARGET_SET: 'TARGET_SET',
  TARGET_STATUS: 'TARGET_STATUS',
  KNOWLEDGE_SOURCE: 'KNOWLEDGE_SOURCE',
  FINANCIAL_SUMMARY: 'FINANCIAL_SUMMARY',
} as const;

export type AnyActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

/** Lifecycle of an AI write proposal (service.PendingActionStatus). */
export type PendingActionStatus = 'PENDING' | 'EXECUTING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

/** AI tools that change data; they run only after the user confirms (chatWriteTools). */
export type ChatWriteTool =
  | 'create_transaction'
  | 'create_category'
  | 'transfer_between_wallets'
  | 'create_debt'
  | 'record_debt_repayment'
  | 'set_budget'
  | 'set_financial_target';

type CategoryKind = 'INCOME' | 'EXPENSE' | 'INVESTMENT';

/** Preview fields of each write tool (writeProposal.data). */
interface ProposalPreview {
  create_transaction: {
    amount: number;
    type: TransactionType.INCOME | TransactionType.EXPENSE;
    categoryName: string;
    walletName: string;
    description: string;
    date: string;
    isNewCategoryCreated: boolean;
  };
  create_category: { name: string; type: CategoryKind; categoryName: string; description: string };
  transfer_between_wallets: {
    amount: number;
    fee: number;
    walletName: string;
    fromWalletName: string;
    toWalletName: string;
    description: string;
  };
  create_debt: {
    amount: number;
    debtType: DebtType;
    title: string;
    /** 'YYYY-MM-DD' or '' */
    dueDate: string;
    date: string;
    description: string;
  };
  record_debt_repayment: {
    amount: number;
    title: string;
    debtId: string;
    remaining: number;
    description: string;
  };
  set_budget: { amount: number; categoryName: string; date: string };
  set_financial_target: {
    amount: number;
    targetType: 'EXPENSE' | 'INVESTMENT';
    month: number;
    year: number;
  };
}

/** Fields every PENDING_CONFIRMATION card carries, whatever the tool. */
interface PendingMeta {
  actionId: string;
  kind: string;
  status: PendingActionStatus;
  /** RFC 3339 */
  expiresAt: string;
  /** Card of the executed action, once confirmed. */
  resultCard?: ActionCard;
}

/** data of a PENDING_CONFIRMATION card, discriminated by toolName. */
export type PendingActionData = {
  [Tool in ChatWriteTool]: PendingMeta & { toolName: Tool } & ProposalPreview[Tool];
}[ChatWriteTool];

export interface TransactionCreatedData {
  id: string;
  amount: number;
  type: TransactionType.INCOME | TransactionType.EXPENSE;
  category: string;
  wallet: string;
  description: string;
  date: string;
  isNewCategoryCreated: boolean;
}

export interface CategoryCreatedData {
  id: string;
  name: string;
  type: CategoryKind;
  description?: string;
  /** The category already existed; nothing was written. */
  isDuplicate?: boolean;
}

/** data of each card type. */
export interface ActionCardDataMap {
  PENDING_CONFIRMATION: PendingActionData;
  TRANSACTION_CREATED: TransactionCreatedData;
  CATEGORY_CREATED: CategoryCreatedData;
  WALLET_TRANSFER: {
    id: string;
    fromWalletId: string;
    toWalletId: string;
    amount: number;
    fee: number;
    note?: string;
    transferDate: string;
  };
  DEBT_CREATED: Debt;
  DEBT_REPAID: Debt;
  BUDGET_SET: {
    id: string;
    categoryId: string;
    categoryName: string;
    amount: number;
    periodType: string;
    periodStart: string;
  };
  TARGET_SET: {
    targetType: 'EXPENSE' | 'INVESTMENT';
    targetAmount: number;
    month: number;
    year: number;
  };
}

export type ActionType = keyof ActionCardDataMap;

/** Narrows a card to one action type, so its data is typed. */
export const isCardOfType = <T extends ActionType>(
  card: ActionCard | undefined,
  type: T
): card is ActionCard & { actionType: T; data: ActionCardDataMap[T] } =>
  card?.actionType === type && typeof card.data === 'object' && card.data !== null;

/** Pending status as shown: a PENDING proposal past its expiry can no longer be confirmed. */
export const effectiveStatus = (data: PendingActionData): PendingActionStatus =>
  data.status === 'PENDING' && data.expiresAt && moment().isAfter(moment(data.expiresAt))
    ? 'EXPIRED'
    : data.status;
