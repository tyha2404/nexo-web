import type { InvestmentStatus, TransactionType } from '../commons/constants';
import type { TagSummary, Transaction } from '../commons/types';
import { request } from './client';
import { CRUDService } from './crudService';

export interface CreateTransactionDTO {
  categoryId: string;
  walletId?: string;
  amount: number;
  type: TransactionType;
  status?: InvestmentStatus;
  realizedPnl?: number;
  description?: string;
  receiptUrl?: string;
  tags?: string[];
  transactionDate: string;
}

/** Fields to change. `tags` replaces the whole tag list ([] clears it); omit it to keep it. */
export type UpdateTransactionDTO = Partial<CreateTransactionDTO>;

class TransactionService extends CRUDService<
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO
> {
  constructor() {
    super('/transactions');
  }

  /** Tags used on the user's transactions, most recently used first. */
  async listTags(options: RequestInit = {}): Promise<TagSummary[]> {
    return request<TagSummary[]>('/tags', { method: 'GET', ...options });
  }

  /** Undo a delete: restores the soft-deleted transaction and its wallet effect. */
  async restore(id: string): Promise<Transaction> {
    return request<Transaction>(`${this.basePath}/${id}/restore`, { method: 'POST' });
  }
}

export const transactionService = new TransactionService();
