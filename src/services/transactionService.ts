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

export interface ParsedTransactionDraft {
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string;
  categoryId?: string;
  walletId?: string;
  status?: InvestmentStatus;
  tags?: string[];
  confidence: number;
  rawNotes?: string;
}

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

  /** Analyze a receipt photo or bank transfer screenshot with AI. */
  async parseImage(file: File): Promise<ParsedTransactionDraft> {
    const formData = new FormData();
    formData.append('image', file);
    return request<ParsedTransactionDraft>(`${this.basePath}/parse-image`, {
      method: 'POST',
      body: formData,
    });
  }
}

export const transactionService = new TransactionService();
