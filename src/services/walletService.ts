import { request } from './client';
import type { Wallet, WalletType } from '../commons/types';

export interface WalletSummaryResponse {
  totalBalance: number;
  wallets: Wallet[];
  totalWallets: number;
}

export interface CreateWalletRequest {
  name: string;
  type: WalletType;
  balance?: number;
  currency?: string;
  icon?: string;
  jarCategory?: string;
  allocationPercent?: number;
  isIncludedInTotal?: boolean;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  statementBalance?: number;
  minimumPayment?: number;
  previousBalance?: number;
}

export interface UpdateWalletRequest {
  name?: string;
  type?: WalletType;
  balance?: number;
  currency?: string;
  icon?: string;
  jarCategory?: string;
  allocationPercent?: number;
  isIncludedInTotal?: boolean;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  statementBalance?: number;
  minimumPayment?: number;
  previousBalance?: number;
}

export interface TransferMoneyRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fee?: number;
  note?: string;
  transferDate?: string;
}

export const walletService = {
  getWallets: async (): Promise<WalletSummaryResponse> => {
    return request<WalletSummaryResponse>('/wallets', {
      method: 'GET',
    });
  },

  getWalletById: async (id: string): Promise<Wallet> => {
    return request<Wallet>(`/wallets/${id}`, {
      method: 'GET',
    });
  },

  createWallet: async (data: CreateWalletRequest): Promise<Wallet> => {
    return request<Wallet>('/wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateWallet: async (id: string, data: UpdateWalletRequest): Promise<Wallet> => {
    return request<Wallet>(`/wallets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteWallet: async (id: string): Promise<void> => {
    return request<void>(`/wallets/${id}`, {
      method: 'DELETE',
    });
  },

  transferMoney: async (data: TransferMoneyRequest): Promise<any> => {
    return request<any>('/wallets/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
