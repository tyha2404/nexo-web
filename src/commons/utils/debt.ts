import moment from 'moment';
import type { Debt } from '../types';
import { DATE_FORMAT_INPUT } from '../constants';

/**
 * Local calendar day ('YYYY-MM-DD') of an API date, or null. Debt startDate/dueDate already
 * come as 'YYYY-MM-DD' (like transaction dates); paidAt/createdAt are timestamps.
 */
export const localDayOf = (value?: string | null) =>
  value ? moment(value).format(DATE_FORMAT_INPUT) : null;

/** Unsettled and past its due date (the API only flags OVERDUE on read, so check the date too). */
export const isDebtLate = (debt: Debt, today: string) =>
  debt.status !== 'COMPLETED' &&
  (debt.status === 'OVERDUE' || (localDayOf(debt.dueDate) ?? '9999-12-31') < today);

/** Share of the debt already paid, 0–100 (0 when the total is 0). */
export const debtPaidPercent = (debt: Debt) =>
  debt.totalAmount > 0
    ? Math.min(100, Math.max(0, Math.round((debt.paidAmount / debt.totalAmount) * 100)))
    : 0;

/** Status badge text of a debt, the same in the table and on the phone cards. */
export const debtStatusLabel = (debt: Debt, today: string) => {
  if (debt.status === 'COMPLETED') return '🎉 Đã xong';
  if (isDebtLate(debt, today)) return '🚨 Quá hạn';
  return `${debt.type === 'RECEIVABLE' ? 'Đã thu' : 'Đã trả'} ${debtPaidPercent(debt)}%`;
};
