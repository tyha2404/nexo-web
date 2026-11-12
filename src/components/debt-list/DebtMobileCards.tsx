import { debtStatusLabel, formatCurrency } from '../../commons/utils';
import {
  ArrowRightLeft,
  CATEGORY_BADGE,
  cx,
  Handshake,
  MOBILE_ACTION_DELETE,
  MOBILE_ACTION_EDIT,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_AMOUNT_GROUP,
  MOBILE_CARD_DATE,
  MOBILE_CARD_FOOTER,
  MOBILE_CARD_INFO,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_SUB_AMOUNT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_TOP,
  MOBILE_CARDS,
  mobileIconBadgeClass,
  Pencil,
  Trash2,
} from '../ui';
import { formatDayOrDash } from './constants';
import type { DebtListProps } from './types';

/** Phone debt list: one card per debt (replaces DebtTable below the mobile breakpoint). */
export function DebtMobileCards({ debts, todayKey, onRepay, onEdit, onDelete }: DebtListProps) {
  return (
    <div className={`${MOBILE_CARDS} animate-fade-in`}>
      {debts.map((debt) => {
        const isPayable = debt.type === 'PAYABLE';

        return (
          <div key={`m-debt-${debt.id}`} className={MOBILE_CARD}>
            <div className={MOBILE_CARD_TOP}>
              <div className={MOBILE_CARD_LEFT}>
                <div className={mobileIconBadgeClass(isPayable ? 'expense' : 'income')}>
                  <Handshake size={16} />
                </div>
                <div className={MOBILE_CARD_INFO}>
                  <div className={MOBILE_CARD_TITLE}>{debt.title}</div>
                  {debt.notes && <div className="text-[0.75rem] text-muted">{debt.notes}</div>}
                  <div className={MOBILE_CARD_DATE}>
                    <span>
                      {formatDayOrDash(debt.startDate)}
                      {debt.dueDate ? ` → Hạn: ${formatDayOrDash(debt.dueDate)}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className={MOBILE_CARD_AMOUNT_GROUP}>
                <div className={cx(MOBILE_CARD_AMOUNT, isPayable ? 'text-expense' : 'text-income')}>
                  {formatCurrency(Math.abs(debt.remaining))}
                </div>
                <div className={MOBILE_CARD_SUB_AMOUNT}>
                  Tổng: {formatCurrency(debt.totalAmount)}
                </div>
              </div>
            </div>

            <div className={MOBILE_CARD_FOOTER}>
              <div className={MOBILE_CARD_TAGS}>
                <span className={CATEGORY_BADGE}>{debtStatusLabel(debt, todayKey)}</span>
              </div>

              <div className={MOBILE_CARD_ACTIONS}>
                {debt.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      onRepay(debt);
                    }}
                    className={MOBILE_ACTION_EDIT}
                    title="Ghi nhận trả/thu tiền"
                  >
                    <ArrowRightLeft size={16} /> Trả tiền
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(debt)}
                  className={MOBILE_ACTION_EDIT}
                  aria-label={`Sửa khoản ${debt.title}`}
                >
                  <Pencil size={16} /> Sửa
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(debt)}
                  className={MOBILE_ACTION_DELETE}
                  title="Xóa khoản nợ"
                >
                  <Trash2 size={16} /> Xóa
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
