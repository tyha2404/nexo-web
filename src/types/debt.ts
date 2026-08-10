export type DebtType = 'PAYABLE' | 'RECEIVABLE';
export type DebtStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

export interface Repayment {
  id: string;
  debtId: string;
  amount: number;
  paidAt: string;
  notes?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  type: DebtType;
  title: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  startDate?: string;
  dueDate?: string;
  status: DebtStatus;
  notes?: string;
  repayments?: Repayment[];
  createdAt: string;
  updatedAt: string;
}

export interface DebtSummary {
  totalPayable: number;
  totalReceivable: number;
  overdueCount: number;
  pendingCount: number;
}

export interface CreateDebtPayload {
  type: DebtType;
  title: string;
  totalAmount: number;
  startDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface AddRepaymentPayload {
  amount: number;
  paidAt?: string;
  notes?: string;
}
