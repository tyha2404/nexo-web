import { request } from './client';
import type { Wallet, WalletType } from '../commons/types';

/** Group a wallet type counts in (model.WalletGroup on the API). */
export type WalletGroup = 'AVAILABLE' | 'SAVINGS' | 'INVESTMENT' | 'CREDIT';

/** One slice of the balance breakdown; `key` is a wallet id or a WalletGroup. */
export interface BalanceShare {
  key: string;
  label: string;
  balance: number;
  /** Share of total assets, 0-100. */
  percent: number;
  /** Wallets in the slice. */
  count: number;
}

export interface CreditSummary {
  cards: number;
  totalLimit: number;
  totalDebt: number;
  availableCredit: number;
}

export interface WalletBreakdown {
  totalAssets: number;
  totalDebt: number;
  /** totalAssets - totalDebt */
  /** Negative balances of non-credit wallets (usually an unrecorded income). */
  overdrawn: number;
  overdrawnWallets: BalanceShare[];
  netWorth: number;
  byWallet: BalanceShare[];
  /** Only the groups that hold money, biggest first. */
  byGroup: BalanceShare[];
  /** The INVESTMENT group split by wallet type (CD, STOCK, OTHER_ASSET); `key` is the type. */
  investment: BalanceShare[];
  credit: CreditSummary;
}

export interface WalletSummaryResponse {
  totalBalance: number;
  wallets: Wallet[];
  totalWallets: number;
  breakdown?: WalletBreakdown;
  baseCurrency?: string;
  /** Totals of the wallets included in the total, per currency (no FX conversion). */
  totalsByCurrency?: Record<string, number>;
  /** Transactions without a wallet: they never moved a wallet balance. */
  unlinkedTransactions?: number;
}

export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  fee?: number;
  note?: string;
}

export interface CreateWalletRequest {
  name: string;
  type: WalletType;
  balance?: number;
  currency?: string;
  icon?: string;
  jarCategory?: string;
  /** 'YYYY-MM-DD'; '' clears it on update. */
  maturityDate?: string;
  /** % per year; 0 clears it on update. */
  interestRate?: number;
  allocationPercent?: number;
  isIncludedInTotal?: boolean;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  statementBalance?: number;
  minimumPayment?: number;
  previousBalance?: number;
}

export type UpdateWalletRequest = Partial<CreateWalletRequest>;

export const walletService = {
  getWallets: async (): Promise<WalletSummaryResponse> => {
    return request<WalletSummaryResponse>('/wallets', {
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

  transfer: async (data: TransferRequest): Promise<void> => {
    return request<void>('/wallets/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteWallet: async (id: string): Promise<void> => {
    return request<void>(`/wallets/${id}`, {
      method: 'DELETE',
    });
  },
};
