export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  INVESTMENT = 'INVESTMENT',
}

export enum InvestmentStatus {
  HOLDING = 'HOLDING',
  SOLD = 'SOLD',
  MATURED = 'MATURED',
  CANCELLED = 'CANCELLED',
}

/** Window event that opens the global quick-add transaction modal (detail: TransactionType). */
export const OPEN_ADD_TRANSACTION_EVENT = 'open-add-transaction';
