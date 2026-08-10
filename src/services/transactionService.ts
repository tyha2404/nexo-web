import type { TransactionType } from '../commons/constants';
import type { Transaction } from '../commons/types';
import { CRUDService } from './crudService';

export interface CreateTransactionDTO {
  categoryId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  transactionDate: string;
}

export interface UpdateTransactionDTO {
  categoryId?: string;
  amount?: number;
  type?: TransactionType;
  description?: string;
  transactionDate?: string;
}

class TransactionService extends CRUDService<
  Transaction,
  CreateTransactionDTO,
  UpdateTransactionDTO
> {
  constructor() {
    super('/transactions');
  }
}

export const transactionService = new TransactionService();
