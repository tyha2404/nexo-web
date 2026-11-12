import type { Debt } from '../../commons/types';

export interface DebtListProps {
  debts: Debt[];
  /** Today ('YYYY-MM-DD'), for the late / overdue status. */
  todayKey: string;
  onRepay: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
}
