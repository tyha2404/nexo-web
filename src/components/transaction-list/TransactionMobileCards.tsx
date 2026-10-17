import { Calendar, Image as ImageIcon, Pencil, Trash2, Wallet } from 'lucide-react';
import { InvestmentStatus, TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import { getAmountSign, INVESTMENT_STATUS_LABELS } from './constants';
import { TransactionTypeIcon } from './TransactionTypeIcon';
import type { TransactionListProps } from './types';

/** Touch-friendly card list shown below 768px instead of the table. */
export function TransactionMobileCards({
  transactions,
  activeType,
  getCategoryName,
  getWallet,
  onEdit,
  onDelete,
  onViewReceipt,
}: TransactionListProps) {
  const typeClass = activeType.toLowerCase();
  return (
    <div className="transactions-mobile-cards animate-fade-in">
      {transactions.map((txn) => {
        const wallet = getWallet(txn.walletId);
        const status = txn.status || InvestmentStatus.HOLDING;
        const label = txn.description || 'giao dịch';
        return (
          <div key={txn.id} className="transaction-mobile-card">
            <div className="mobile-card-top">
              <div className="mobile-card-left">
                <div className={`mobile-card-icon-badge icon-${typeClass}`}>
                  <TransactionTypeIcon type={activeType} />
                </div>
                <div className="mobile-card-info">
                  <div className="mobile-card-title">{txn.description}</div>
                  <div className="mobile-card-date">
                    <Calendar size={12} className="mobile-date-icon" />
                    <span>{formatDate(txn.transactionDate)}</span>
                  </div>
                </div>
              </div>
              <div className="mobile-card-amount-group">
                <div className={`mobile-card-amount amount-${typeClass}`}>
                  {getAmountSign(activeType)}
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            </div>

            <div className="mobile-card-tags">
              <span className="txn-category-badge">{getCategoryName(txn.categoryId)}</span>
              {wallet && (
                <span className="txn-wallet-badge">
                  <Wallet size={12} />
                  <span>
                    {wallet.icon ? `${wallet.icon} ` : ''}
                    {wallet.name}
                  </span>
                </span>
              )}
              {activeType === TransactionType.INVESTMENT && (
                <span className={`txn-status-badge status-${status.toLowerCase()}`}>
                  {INVESTMENT_STATUS_LABELS[status]}
                </span>
              )}
              {activeType === TransactionType.INVESTMENT &&
                txn.status &&
                txn.status !== InvestmentStatus.HOLDING &&
                txn.realizedPnl !== undefined && (
                  <span
                    className={`txn-pnl-badge ${txn.realizedPnl >= 0 ? 'pnl-profit' : 'pnl-loss'}`}
                  >
                    {txn.realizedPnl >= 0 ? 'Lãi: +' : 'Lỗ: '}
                    {formatCurrency(Math.abs(txn.realizedPnl))}
                  </span>
                )}
            </div>

            <div className="mobile-card-actions">
              {txn.receiptUrl && (
                <button
                  type="button"
                  className="mobile-action-btn text-primary!"
                  onClick={() => onViewReceipt(txn.receiptUrl!)}
                  aria-label="Xem hóa đơn"
                  title="Xem hóa đơn"
                >
                  <ImageIcon size={14} />
                  <span>Ảnh</span>
                </button>
              )}
              <button
                type="button"
                className="mobile-action-btn edit-btn"
                onClick={() => onEdit(txn)}
                aria-label={`Chỉnh sửa ${label}`}
              >
                <Pencil size={14} />
                <span>Sửa</span>
              </button>
              <button
                type="button"
                className="mobile-action-btn delete-btn"
                onClick={() => onDelete(txn)}
                aria-label={`Xóa ${label}`}
              >
                <Trash2 size={14} />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
