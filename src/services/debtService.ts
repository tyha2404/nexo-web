import type {
  AddRepaymentPayload,
  CreateDebtPayload,
  Debt,
  DebtStatus,
  DebtSummary,
  DebtType,
} from '../types/debt';
import { request } from './client';

export const debtService = {
  getSummary: async (options: RequestInit = {}): Promise<DebtSummary> => {
    return request<DebtSummary>('/debts/summary', {
      method: 'GET',
      ...options,
    });
  },

  getDebts: async (type?: DebtType, status?: DebtStatus): Promise<Debt[]> => {
    const searchParams = new URLSearchParams();
    if (type) searchParams.append('type', type);
    if (status) searchParams.append('status', status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Debt[]>('/debts' + query, {
      method: 'GET',
    });
  },

  createDebt: async (data: CreateDebtPayload): Promise<Debt> => {
    return request<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addRepayment: async (debtId: string, data: AddRepaymentPayload): Promise<Debt> => {
    return request<Debt>(`/debts/${debtId}/repayments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteDebt: async (debtId: string): Promise<void> => {
    return request<void>(`/debts/${debtId}`, {
      method: 'DELETE',
    });
  },
};
