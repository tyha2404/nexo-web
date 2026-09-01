export type StatementStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface CreditCardStatement {
  id: string;
  userId: string;
  walletId: string;
  walletName?: string;
  walletIcon?: string;
  statementMonth: number;
  statementYear: number;
  statementDate: string;
  dueDate: string;
  statementBalance: number;
  minimumPayment: number;
  previousBalance: number;
  paidAmount: number;
  remainingAmount: number;
  status: StatementStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatementListResponse {
  items: CreditCardStatement[];
  total: number;
  totalBalance: number;
  totalPaid: number;
  totalRemaining: number;
}
