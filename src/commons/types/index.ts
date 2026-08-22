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
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  description?: string;
  budgetLimit?: number;
  excludeFromAverageDaily?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentStatus = 'HOLDING' | 'SOLD' | 'MATURED' | 'CANCELLED';

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  description?: string;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  status?: InvestmentStatus;
  realizedPnl?: number;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryReport {
  totalIncome: number;
  totalExpense: number;
  totalInvestment?: number;
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

export type TargetType = 'EXPENSE' | 'INVESTMENT';

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
export * from './preset';
