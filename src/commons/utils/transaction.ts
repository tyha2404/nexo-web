import { OPEN_ADD_TRANSACTION_EVENT, TransactionType } from '../constants';

/** Open the app-wide "add transaction" modal from any screen. */
export const openAddTransaction = (type: TransactionType = TransactionType.EXPENSE) => {
  window.dispatchEvent(
    new CustomEvent<TransactionType>(OPEN_ADD_TRANSACTION_EVENT, { detail: type })
  );
};
