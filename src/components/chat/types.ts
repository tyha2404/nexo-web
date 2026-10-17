import type { TransactionType } from '../../commons/constants';

/** Loosely-typed payload of an AI action card (the backend mixes camelCase and snake_case). */
export interface ActionCardData {
  id?: string;
  transactionId?: string;
  transaction_id?: string;
  amount?: number | string;
  type?: TransactionType;
  categoryId?: string;
  category_id?: string;
  categoryName?: string;
  walletId?: string;
  wallet_id?: string;
  walletName?: string;
  date?: string;
  note?: string;
  description?: string;
  isNewCategoryCreated?: boolean;
}
