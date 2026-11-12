import {
  Calendar,
  CATEGORY_BADGE,
  Image as ImageIcon,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_AMOUNT_GROUP,
  MOBILE_CARD_DATE,
  MOBILE_CARD_FOOTER,
  MOBILE_CARD_INFO,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_TOP,
  MOBILE_CARDS,
  mobileAmountColor,
  mobileIconBadgeClass,
  Pencil,
  Trash2,
} from '../ui';
import { InvestmentStatus, TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import { WalletBadge } from './WalletBadge';
import { getAmountSign, INVESTMENT_STATUS_LABELS } from './constants';
import { TransactionTypeIcon } from './TransactionTypeIcon';
import { statusBadgeClass } from './listStyles';
import { TagChips } from './TagChips';
import type { TransactionListProps } from './types';
import { MOBILE_ACTION_BTN, MOBILE_ACTION_DELETE, MOBILE_ACTION_EDIT, pnlBadgeClass } from '../ui';

/** Touch-friendly card list shown below 768px instead of the table. */
export function TransactionMobileCards({
  transactions,
  activeType,
  getCategoryName,
  getWallet,
  onEdit,
  onDelete,
  onViewReceipt,
  onTagClick,
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
            <div className={MOBILE_CARD_TOP}>
              <div className={MOBILE_CARD_LEFT}>
                <div className={mobileIconBadgeClass(typeClass)}>
                  <TransactionTypeIcon type={activeType} />
                </div>
                <div className={MOBILE_CARD_INFO}>
                  <div className={MOBILE_CARD_TITLE}>{txn.description}</div>
                  <div className={MOBILE_CARD_DATE}>
                    <Calendar size={12} className="mobile-date-icon" />
                    <span>{formatDate(txn.transactionDate)}</span>
                  </div>
                </div>
              </div>
              <div className={MOBILE_CARD_AMOUNT_GROUP}>
                <div className={`${MOBILE_CARD_AMOUNT} ${mobileAmountColor(typeClass)}`}>
                  {getAmountSign(activeType)}
                  {formatCurrency(Math.abs(txn.amount))}
                </div>
              </div>
            </div>

            <div className={MOBILE_CARD_FOOTER}>
              <div className={MOBILE_CARD_TAGS}>
                <span className={CATEGORY_BADGE}>{getCategoryName(txn.categoryId)}</span>
                {wallet && <WalletBadge wallet={wallet} />}
                <TagChips tags={txn.tags} onTagClick={onTagClick} />
                {activeType === TransactionType.INVESTMENT && (
                  <span className={statusBadgeClass(status)}>
                    {INVESTMENT_STATUS_LABELS[status]}
                  </span>
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
                    <ImageIcon size={16} />
                    <span>Ảnh</span>
                  </button>
                )}
                <button
                  type="button"
                  className={MOBILE_ACTION_EDIT}
                  onClick={() => onEdit(txn)}
                  aria-label={`Chỉnh sửa ${label}`}
                >
                  <Pencil size={16} />
                  <span>Sửa</span>
                </button>
                <button
                  type="button"
                  className={MOBILE_ACTION_DELETE}
                  onClick={() => onDelete(txn)}
                  aria-label={`Xóa ${label}`}
                >
                  <Trash2 size={16} />
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
