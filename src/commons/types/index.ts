import type { InvestmentStatus, TransactionType } from '../constants';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  description?: string;
  budgetLimit?: number;
  excludeFromAverageDaily?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  walletId?: string;
  walletName?: string;
  amount: number;
  description?: string;
  type: TransactionType;
  status?: InvestmentStatus;
  realizedPnl?: number;
  receiptUrl?: string;
  /** Free-form labels across categories (e.g. "Du lịch Đà Lạt"). */
  tags?: string[];
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

/** A tag the user has used, with all-time totals (GET /tags, most recent first). */
export interface TagSummary {
  name: string;
  count: number;
  totalExpense: number;
  totalIncome: number;
  /** 'YYYY-MM-DD' of the latest transaction carrying the tag. */
  lastUsed: string;
}

export interface SummaryReport {
  totalIncome: number;
  totalExpense: number;
  totalInvestment?: number;
  realizedPnL?: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  percentage: number;
}

export interface CategoryBreakdownReport {
  items: CategoryBreakdownItem[];
  totalExpense: number;
}

export interface MonthlyTrendItem {
  month: string;
  label: string;
  expense: number;
  income: number;
  target: number;
}

export interface MonthlyTrendReport {
  averageExpense: number;
  items: MonthlyTrendItem[];
}

/** Net worth at the end of one month (GET /reports/net-worth). */
export interface NetWorthPoint {
  /** 'YYYY-MM' */
  month: string;
  /** e.g. 'T11/26' */
  label: string;
  income: number;
  expense: number;
  realizedPnL: number;
  /** income − expense + realizedPnL of the month. */
  change: number;
  netWorth: number;
}

/**
 * Month-end net worth, oldest first, ending with the current month. Net worth = cumulative
 * income − expense + realized PnL: the dashboard's "Tổng tài sản".
 */
export interface NetWorthReport {
  items: NetWorthPoint[];
  /** Net worth just before the first month shown. */
  opening: number;
  current: number;
  /** current − opening */
  periodChange: number;
}

export interface DailyReportItem {
  /** 'YYYY-MM-DD' */
  date: string;
  income: number;
  expense: number;
  /** Amount invested that day (INVESTMENT of any status). */
  investment: number;
  /** Transactions of any type that day. */
  count: number;
}

/** Every day of one month (days without transactions are zero). */
export interface DailyReport {
  /** 'YYYY-MM' */
  month: string;
  items: DailyReportItem[];
  totalIncome: number;
  totalExpense: number;
  totalInvestment: number;
  maxExpense: number;
}

export interface TransactionSummary {
  sumAmount: number;
  sumAmountForAverage?: number;
  total: number;
  holdingAmount?: number;
  holdingCount?: number;
  realizedPnl?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  summary?: TransactionSummary;
}

export type TargetType = TransactionType.EXPENSE | TransactionType.INVESTMENT;

export interface UpsertTargetRequest {
  targetType: TargetType;
  targetAmount: number;
  month: number;
  year: number;
}

export interface ExpenseSummary {
  targetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  dailyAllowance: number;
  isOverBudget: boolean;
  overspentAmount: number;
}

export interface InvestmentSummary {
  targetAmount: number;
  investedAmount: number;
  remainingAmount: number;
  isTargetReached: boolean;
  surplusAmount: number;
}

export interface TargetSummaryResponse {
  month: number;
  year: number;
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;
  expense: ExpenseSummary;
  investment: InvestmentSummary;
}
export type WalletType = 'CASH' | 'BANK' | 'E_WALLET' | 'SAVINGS' | 'CREDIT' | 'JAR';

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  icon?: string;
  jarCategory?: string;
  allocationPercent?: number;
  isIncludedInTotal: boolean;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  statementBalance?: number;
  minimumPayment?: number;
  previousBalance?: number;
  availableCredit?: number;
  outstandingDebt?: number;
  createdAt: string;
  updatedAt: string;
}

export * from './preset';
export * from './statement';
