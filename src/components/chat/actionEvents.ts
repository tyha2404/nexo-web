import { DATA_EVENTS, type DataEvent } from '../../commons/constants';
import type { ActionCard } from '../../services';
import { ACTION_TYPES, isCardOfType, type ChatWriteTool, type PendingActionData } from './types';

/** Window events pages refresh on (useDataEvents / Dashboard) after a confirmed AI write. */
const EVENTS_BY_TOOL: Record<ChatWriteTool, readonly DataEvent[]> = {
  // A transaction with a wallet also moves the wallet balance.
  create_transaction: [DATA_EVENTS.TRANSACTIONS_CHANGED, DATA_EVENTS.WALLETS_CHANGED],
  create_category: [DATA_EVENTS.CATEGORIES_CHANGED],
  transfer_between_wallets: [DATA_EVENTS.WALLETS_CHANGED],
  create_debt: [DATA_EVENTS.DEBTS_CHANGED],
  record_debt_repayment: [DATA_EVENTS.DEBTS_CHANGED],
  set_budget: [DATA_EVENTS.BUDGETS_CHANGED],
  set_financial_target: [DATA_EVENTS.TARGETS_CHANGED],
};

/** The data events to dispatch once `proposal` was executed (resultCard = the executed card). */
export function dataEventsAfterConfirm(
  proposal: PendingActionData,
  resultCard?: ActionCard
): DataEvent[] {
  const events = [...(EVENTS_BY_TOOL[proposal.toolName] ?? [])];
  const newCategory =
    proposal.toolName === 'create_transaction' &&
    (isCardOfType(resultCard, ACTION_TYPES.TRANSACTION_CREATED)
      ? resultCard.data.isNewCategoryCreated
      : proposal.isNewCategoryCreated);
  if (newCategory) events.push(DATA_EVENTS.CATEGORIES_CHANGED);
  return events;
}
