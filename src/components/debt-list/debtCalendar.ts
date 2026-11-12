import moment from 'moment';
import { DATE_FORMAT_INPUT } from '../../commons/constants';
import type { Debt } from '../../commons/types';
import { formatCompactCurrency, formatCurrency, isDebtLate, localDayOf } from '../../commons/utils';
import type { DayMarker, DayMarkerTone } from '../common';

/** Day the debt started: its start date, or the day it was recorded. */
export const startDayOf = (debt: Debt) => localDayOf(debt.startDate || debt.createdAt);

/** Sends a picked day as local midnight (like startDate); today is left to the server's clock. */
export const toPaidAt = (day: string) =>
  day === moment().format(DATE_FORMAT_INPUT)
    ? undefined
    : moment(day, DATE_FORMAT_INPUT).startOf('day').format();

/** Whether the debt was started, repaid or falls due on `day`. */
export const debtTouchesDay = (debt: Debt, day: string) =>
  startDayOf(debt) === day ||
  localDayOf(debt.dueDate) === day ||
  (debt.repayments ?? []).some((r) => localDayOf(r.paidAt) === day);

/** Dot legend of the debt calendar, worded for the side of the ledger. */
export const debtMarkerLegend = (isPayable: boolean): Record<DayMarkerTone, string> => ({
  success: isPayable ? 'Đã trả' : 'Đã thu',
  warning: isPayable ? 'Chưa trả xong' : 'Chưa thu đủ',
  danger: isPayable ? 'Quá hạn chưa trả' : 'Quá hạn chưa thu',
});

/**
 * Calendar data for one debt type and month: money moved per day (new debts on their start
 * date + repayments on their payment date) and status icons:
 *   - start day: the debt's current status, so a debt listed this month always shows whether
 *     it is settled, even when it was repaid in another month or has no due date;
 *   - repayment day: green (money paid / received that day);
 *   - due day: green if settled, amber if still open, red if the date has passed.
 */
export function buildDebtCalendar(debts: Debt[], month: string, isPayable: boolean) {
  const inMonth = (day: string | null): day is string => !!day && day.startsWith(month);
  const today = moment().format(DATE_FORMAT_INPUT);
  const opened: Record<string, number> = {};
  const repaid: Record<string, number> = {};
  const markers: Record<string, DayMarker[]> = {};
  const mark = (day: string, tone: DayMarkerTone, text: string) =>
    (markers[day] ??= []).push({ tone, text });
  const paidWord = isPayable ? 'Đã trả' : 'Đã thu';
  const unpaidWord = isPayable ? 'chưa trả' : 'chưa thu';
  const settledWord = isPayable ? 'Đã trả xong' : 'Đã thu đủ';
  const unsettledWord = isPayable ? 'Chưa trả xong' : 'Chưa thu đủ';
  for (const debt of debts) {
    const settled = debt.status === 'COMPLETED';
    const dueDay = localDayOf(debt.dueDate);
    const late = isDebtLate(debt, today);
    const left = formatCurrency(Math.abs(debt.remaining ?? debt.totalAmount));
    const start = startDayOf(debt);
    if (inMonth(start)) {
      opened[start] = (opened[start] ?? 0) + debt.totalAmount;
      if (settled) mark(start, 'success', `${settledWord}: ${debt.title}`);
      else if (late) mark(start, 'danger', `Quá hạn, ${unpaidWord} ${left}: ${debt.title}`);
      else mark(start, 'warning', `${unsettledWord}, còn ${left}: ${debt.title}`);
    }
    // This debt's repayments per day, so several payments on one day read as one line.
    const paidOn: Record<string, number> = {};
    for (const r of debt.repayments ?? []) {
      const paid = localDayOf(r.paidAt);
      if (!inMonth(paid)) continue;
      repaid[paid] = (repaid[paid] ?? 0) + r.amount;
      paidOn[paid] = (paidOn[paid] ?? 0) + r.amount;
    }
    for (const [day, amount] of Object.entries(paidOn)) {
      mark(day, 'success', `${paidWord} ${formatCurrency(amount)}: ${debt.title}`);
    }
    // Due on the start day: the start-day icon already says it.
    if (!inMonth(dueDay) || dueDay === start) continue;
    if (settled) {
      mark(dueDay, 'success', `${settledWord}: ${debt.title}`);
    } else {
      mark(
        dueDay,
        late ? 'danger' : 'warning',
        `${late ? 'Quá hạn' : 'Đến hạn'}, ${unpaidWord} ${left}: ${debt.title}`
      );
    }
  }
  const openWord = isPayable ? 'Vay' : 'Cho vay';
  const repayWord = isPayable ? 'Trả' : 'Thu';
  const values: Record<string, number> = {};
  const details: Record<string, string> = {};
  for (const day of new Set([...Object.keys(opened), ...Object.keys(repaid)])) {
    values[day] = (opened[day] ?? 0) + (repaid[day] ?? 0);
    details[day] = [
      opened[day] && `${openWord} ${formatCurrency(opened[day])}`,
      repaid[day] && `${repayWord} ${formatCurrency(repaid[day])}`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  const summary = `${openWord} ${formatCompactCurrency(sum(opened))} · ${repayWord} ${formatCompactCurrency(sum(repaid))}`;
  return { values, details, markers, summary, legend: debtMarkerLegend(isPayable) };
}
