import { Image as ImageIcon, Pencil, Trash2, Wallet } from 'lucide-react';
import { InvestmentStatus, TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import { getAmountSign, INVESTMENT_STATUS_LABELS } from './constants';
import type { TransactionListProps } from './types';

const amountColor = (type: TransactionType) =>
  type === TransactionType.INCOME
    ? 'text-income!'
    : type === TransactionType.EXPENSE
      ? 'text-expense!'
      : 'text-main!';

/** Desktop table view of a page of transactions. */
export function TransactionTable({
  transactions,
  activeType,
  getCategoryName,
  getWallet,
  onEdit,
  onDelete,
  onViewReceipt,
}: TransactionListProps) {
  const isInvestment = activeType === TransactionType.INVESTMENT;
  return (
    <div className="transactions-table-container animate-fade-in">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Tiêu đề / Nội dung</th>
            <th>Số tiền</th>
            {isInvestment && <th>Trạng thái</th>}
            {isInvestment && <th>Lãi / Lỗ</th>}
            <th>Danh mục</th>
            <th>Ví / Nguồn</th>
            <th>Ngày thực hiện</th>
            <th className="text-center!">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const wallet = getWallet(txn.walletId);
            const status = txn.status || InvestmentStatus.HOLDING;
            const label = txn.description || 'giao dịch';
            return (
              <tr key={txn.id}>
                <td className="txn-title-cell">
                  <div className="flex items-center gap-2">
                    <span>{txn.description}</span>
                    {txn.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(txn.receiptUrl!)}
                        className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                        title="Xem hóa đơn / chứng từ"
                      >
                        <ImageIcon size={15} />
                      </button>
                    )}
                  </div>
                </td>
                <td className={`txn-amount font-semibold ${amountColor(activeType)}`}>
                  {getAmountSign(activeType)}
                  {formatCurrency(Math.abs(txn.amount))}
                </td>
                {isInvestment && (
                  <td>
                    <span className={`txn-status-badge status-${status.toLowerCase()}`}>
                      {INVESTMENT_STATUS_LABELS[status]}
                    </span>
                  </td>
                )}
                {isInvestment && (
                  <td className="txn-pnl-cell">
                    {txn.status &&
                    txn.status !== InvestmentStatus.HOLDING &&
                    txn.realizedPnl !== undefined ? (
                      <span
                        className={`font-semibold ${txn.realizedPnl >= 0 ? 'text-income' : 'text-expense'}`}
                      >
                        {txn.realizedPnl >= 0 ? '+' : ''}
                        {formatCurrency(txn.realizedPnl)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
                <td>
                  <span className="txn-category-badge">{getCategoryName(txn.categoryId)}</span>
                </td>
                <td>
                  {wallet ? (
                    <span className="txn-wallet-badge">
                      <Wallet size={12} />
                      <span>
                        {wallet.icon ? `${wallet.icon} ` : ''}
                        {wallet.name}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="txn-date">{formatDate(txn.transactionDate)}</td>
                <td className="txn-actions-cell">
                  <div className="action-buttons-wrapper">
                    <button
                      type="button"
                      onClick={() => onEdit(txn)}
                      className="action-btn edit-btn"
                      aria-label={`Chỉnh sửa ${label}`}
                      title={`Chỉnh sửa ${label}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(txn)}
                      className="action-btn delete-btn"
                      aria-label={`Xóa ${label}`}
                      title={`Xóa ${label}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
