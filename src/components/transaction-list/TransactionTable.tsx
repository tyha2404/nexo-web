import {
  ACTIONS_CELL,
  CATEGORY_BADGE,
  Image as ImageIcon,
  Pencil,
  TABLE,
  TABLE_CONTAINER,
  TITLE_CELL,
  Trash2,
} from '../ui';
import { InvestmentStatus, TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import { getAmountSign, INVESTMENT_STATUS_LABELS } from './constants';
import { statusBadgeClass } from './listStyles';
import { TagChips } from './TagChips';
import type { TransactionListProps } from './types';
import {
  ACTION_BTN_DELETE,
  ACTION_BTN_EDIT,
  ACTION_BUTTONS_WRAPPER,
  TXN_AMOUNT,
  TXN_DATE,
} from '../ui';
import { WalletBadge } from './WalletBadge';

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
  onTagClick,
}: TransactionListProps) {
  const isInvestment = activeType === TransactionType.INVESTMENT;
  return (
    <div className={`${TABLE_CONTAINER} animate-fade-in`}>
      <table className={TABLE}>
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
                <td className={TITLE_CELL}>
                  <div className="flex items-center gap-2">
                    <span>{txn.description}</span>
                    {txn.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(txn.receiptUrl!)}
                        className="rounded-sm p-0 text-primary transition-colors duration-100 ease-out hover:bg-hover hover:text-link"
                        title="Xem hóa đơn / chứng từ"
                      >
                        <ImageIcon size={16} />
                      </button>
                    )}
                  </div>
                  <TagChips tags={txn.tags} onTagClick={onTagClick} className="mt-0.5" />
                </td>
                <td className={`${TXN_AMOUNT} ${amountColor(activeType)}`}>
                  {getAmountSign(activeType)}
                  {formatCurrency(Math.abs(txn.amount))}
                </td>
                {isInvestment && (
                  <td>
                    <span className={statusBadgeClass(status)}>
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
                        className={`${TXN_AMOUNT} ${txn.realizedPnl >= 0 ? 'text-income' : 'text-expense'}`}
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
                  <span className={CATEGORY_BADGE}>{getCategoryName(txn.categoryId)}</span>
                </td>
                <td>
                  {wallet ? <WalletBadge wallet={wallet} /> : <span className="text-muted">—</span>}
                </td>
                <td className={TXN_DATE}>{formatDate(txn.transactionDate)}</td>
                <td className={ACTIONS_CELL}>
                  <div className={ACTION_BUTTONS_WRAPPER}>
                    <button
                      type="button"
                      onClick={() => onEdit(txn)}
                      className={ACTION_BTN_EDIT}
                      aria-label={`Chỉnh sửa ${label}`}
                      title={`Chỉnh sửa ${label}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(txn)}
                      className={ACTION_BTN_DELETE}
                      aria-label={`Xóa ${label}`}
                      title={`Xóa ${label}`}
                    >
                      <Trash2 size={16} />
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
