import type { TransactionType } from '../../commons/constants';
import type { Transaction, Wallet } from '../../commons/types';

export interface TransactionListProps {
  transactions: Transaction[];
  activeType: TransactionType;
  getCategoryName: (categoryId: string) => string;
  getWallet: (walletId?: string) => Wallet | null;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onViewReceipt: (url: string) => void;
}
