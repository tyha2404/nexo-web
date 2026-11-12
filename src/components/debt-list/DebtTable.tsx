import { debtStatusLabel, formatCurrency } from '../../commons/utils';
import {
  ACTION_BTN_DELETE,
  ACTION_BTN_EDIT,
  ACTIONS_CELL,
  ArrowRightLeft,
  btnClass,
  CATEGORY_BADGE,
  cx,
  Pencil,
  TABLE,
  TABLE_CONTAINER,
  TITLE_CELL,
  Trash2,
  TXN_AMOUNT,
  TXN_DATE,
} from '../ui';
import { formatDayOrDash } from './constants';
import type { DebtListProps } from './types';

/** Desktop debt list (hidden on phones, where DebtMobileCards replaces it). */
export function DebtTable({ debts, todayKey, onRepay, onEdit, onDelete }: DebtListProps) {
  return (
    <div className={`debts-table-container ${TABLE_CONTAINER} max-w-full animate-fade-in`}>
      <table
        className={`debts-table ${TABLE} [&_th]:whitespace-nowrap [&_th]:text-left [&_th]:text-[0.8rem] [&_th]:uppercase [&_th]:tracking-[0.05em] [&_td]:text-[0.875rem]`}
      >
        <thead>
          <tr>
            <th>Khoản nợ / Đối tác</th>
            <th className="text-right!">Tổng số tiền</th>
            <th className="text-right!">Đã thanh toán</th>
            <th className="text-right!">Còn lại</th>
            <th>Ngày vay/cho vay</th>
            <th>Hạn chót</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {debts.map((debt) => {
            return (
              <tr key={debt.id}>
                <td className={TITLE_CELL}>
                  <div className="max-w-[220px] break-words font-semibold">{debt.title}</div>
                  {debt.notes && (
                    <div className="mt-0.5 text-[0.78rem] text-muted">{debt.notes}</div>
                  )}
                </td>
                <td className={TXN_AMOUNT}>{formatCurrency(debt.totalAmount)}</td>
                <td className={cx('cell-paid', TXN_AMOUNT)}>{formatCurrency(debt.paidAmount)}</td>
                <td
                  className={cx(
                    'cell-remaining',
                    TXN_AMOUNT,
                    debt.type === 'PAYABLE' ? 'text-expense!' : 'text-income!'
                  )}
                >
                  {formatCurrency(Math.abs(debt.remaining))}
                </td>
                <td className={TXN_DATE}>{formatDayOrDash(debt.startDate)}</td>
                <td className={TXN_DATE}>{formatDayOrDash(debt.dueDate)}</td>
                <td>
                  <span className={CATEGORY_BADGE}>{debtStatusLabel(debt, todayKey)}</span>
                </td>
                <td className={ACTIONS_CELL}>
                  <div className="flex items-center gap-2">
                    {debt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          onRepay(debt);
                        }}
                        className={cx(
                          btnClass('secondary', 'px-[0.85rem] py-[0.45rem] text-[0.85rem]'),
                          'min-h-9'
                        )}
                        title="Ghi nhận trả/thu tiền"
                      >
                        <ArrowRightLeft size={16} /> Trả tiền
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(debt)}
                      className={ACTION_BTN_EDIT}
                      aria-label={`Sửa khoản ${debt.title}`}
                      title="Sửa"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(debt)}
                      className={ACTION_BTN_DELETE}
                      aria-label="Xóa khoản vay"
                      title="Xóa"
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
