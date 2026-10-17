import { CloudOff } from 'lucide-react';
import { TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import type { QueuedTransaction } from '../../services';

export interface PendingTransactionListProps {
  items: QueuedTransaction[];
  getCategoryName?: (categoryId: string) => string | undefined;
}

/** Transactions saved offline that have not reached the server yet. */
export function PendingTransactionList({ items, getCategoryName }: PendingTransactionListProps) {
  if (!items.length) return null;
  return (
    <ul
      aria-label="Giao dịch chờ đồng bộ"
      className="pending-sync-list m-0 mb-4 flex list-none flex-col gap-2 p-0"
    >
      {items.map(({ localId, payload }) => {
        const sign =
          payload.type === TransactionType.INCOME
            ? '+'
            : payload.type === TransactionType.EXPENSE
              ? '-'
              : '';
        const category = getCategoryName?.(payload.categoryId);
        return (
          <li
            key={localId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-dashed border-warning bg-card px-4 py-3"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold text-main">
                {payload.description || category || 'Giao dịch'}
              </span>
              <span className="text-xs text-muted">
                {formatDate(payload.transactionDate)}
                {category ? ` · ${category}` : ''}
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`font-semibold ${payload.type === TransactionType.INCOME ? 'text-income' : payload.type === TransactionType.EXPENSE ? 'text-expense' : 'text-main'}`}
              >
                {sign}
                {formatCurrency(Math.abs(payload.amount))}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-glow)] px-2 py-0.5 text-xs font-semibold text-warning">
                <CloudOff size={12} /> Chờ đồng bộ
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
