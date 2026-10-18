import { Calendar, Image as ImageIcon, Pencil, Trash2, Wallet } from 'lucide-react';
import { InvestmentStatus, TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import { getAmountSign, INVESTMENT_STATUS_LABELS } from './constants';
import { TransactionTypeIcon } from './TransactionTypeIcon';
import {
  CATEGORY_BADGE,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_DATE,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  mobileAmountColor,
  mobileIconBadgeClass,
  statusBadgeClass,
  MOBILE_CARDS,
} from './listStyles';
import type { TransactionListProps } from './types';
import {
  MOBILE_ACTION_BTN,
  MOBILE_ACTION_DELETE,
  MOBILE_ACTION_EDIT,
  pnlBadgeClass,
  WALLET_BADGE,
} from '../ui';

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
    <div className={`${MOBILE_CARDS} animate-fade-in`}>
      {transactions.map((txn) => {
        const wallet = getWallet(txn.walletId);
        const status = txn.status || InvestmentStatus.HOLDING;
        const label = txn.description || 'giao dịch';
        return (
          <div key={txn.id} className={MOBILE_CARD}>
            <div className="mobile-card-top">
              <div className={MOBILE_CARD_LEFT}>
                <div className={mobileIconBadgeClass(typeClass)}>
                  <TransactionTypeIcon type={activeType} />
                </div>
                <div className="mobile-card-info">
                  <div className={MOBILE_CARD_TITLE}>{txn.description}</div>
                  <div className={MOBILE_CARD_DATE}>
                    <Calendar size={12} className="mobile-date-icon" />
                    <span>{formatDate(txn.transactionDate)}</span>
                  </div>
                </div>
              </div>
              <div className="mobile-card-amount-group">
                <div className={`${MOBILE_CARD_AMOUNT} ${mobileAmountColor(typeClass)}`}>
                  {getAmountSign(activeType)}
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            </div>

            <div className={MOBILE_CARD_TAGS}>
              <span className={CATEGORY_BADGE}>{getCategoryName(txn.categoryId)}</span>
              {wallet && (
                <span className={WALLET_BADGE}>
                  <Wallet size={12} />
                  <span>
                    {wallet.icon ? `${wallet.icon} ` : ''}
                    {wallet.name}
                  </span>
                </span>
              )}
              {activeType === TransactionType.INVESTMENT && (
                <span className={statusBadgeClass(status)}>{INVESTMENT_STATUS_LABELS[status]}</span>
              )}
              {activeType === TransactionType.INVESTMENT &&
                txn.status &&
                txn.status !== InvestmentStatus.HOLDING &&
                txn.realizedPnl !== undefined && (
                  <span className={pnlBadgeClass(txn.realizedPnl >= 0)}>
                    {txn.realizedPnl >= 0 ? 'Lãi: +' : 'Lỗ: '}
                    {formatCurrency(Math.abs(txn.realizedPnl))}
                  </span>
                )}
            </div>

            <div className={MOBILE_CARD_ACTIONS}>
              {txn.receiptUrl && (
                <button
                  type="button"
                  className={MOBILE_ACTION_BTN}
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
                className={MOBILE_ACTION_EDIT}
                onClick={() => onEdit(txn)}
                aria-label={`Chỉnh sửa ${label}`}
              >
                <Pencil size={14} />
                <span>Sửa</span>
              </button>
              <button
                type="button"
                className={MOBILE_ACTION_DELETE}
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
