import { request } from './client';
import type { CreditCardStatement, StatementListResponse } from '../commons/types';

export interface CreateStatementPayload {
  walletId: string;
  statementMonth: number;
  statementYear: number;
  statementDate: string;
  dueDate: string;
  statementBalance: number;
  minimumPayment?: number;
  previousBalance?: number;
  paidAmount?: number;
  note?: string;
}

export interface UpdateStatementPayload {
  statementMonth?: number;
  statementYear?: number;
  statementDate?: string;
  dueDate?: string;
  statementBalance?: number;
  minimumPayment?: number;
  previousBalance?: number;
  paidAmount?: number;
  status?: string;
  note?: string;
}

export interface PayStatementPayload {
  amount: number;
  sourceWalletId?: string;
  paymentDate?: string;
  note?: string;
}

export const statementService = {
  async list(params?: {
    walletId?: string;
    year?: number;
    month?: number;
  }): Promise<StatementListResponse> {
    const query = new URLSearchParams();
    if (params?.walletId) query.append('walletId', params.walletId);
    if (params?.year) query.append('year', params.year.toString());
    if (params?.month) query.append('month', params.month.toString());

    const qs = query.toString();
    const url = `/credit-card-statements${qs ? `?${qs}` : ''}`;
    return await request<StatementListResponse>(url, { method: 'GET' });
  },

  async get(id: string): Promise<CreditCardStatement> {
    return await request<CreditCardStatement>(`/credit-card-statements/${id}`, { method: 'GET' });
  },

  async create(payload: CreateStatementPayload): Promise<CreditCardStatement> {
    return await request<CreditCardStatement>('/credit-card-statements', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateStatementPayload): Promise<CreditCardStatement> {
    return await request<CreditCardStatement>(`/credit-card-statements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async pay(id: string, payload: PayStatementPayload): Promise<CreditCardStatement> {
    return await request<CreditCardStatement>(`/credit-card-statements/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<void> {
    await request<any>(`/credit-card-statements/${id}`, {
      method: 'DELETE',
    });
  },
};
