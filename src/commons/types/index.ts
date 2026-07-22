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
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  description?: string;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface SummaryReport {
  totalIncome: number;
  totalExpense: number;
  totalInvestment?: number;
  netBalance: number;
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
