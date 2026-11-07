import moment from 'moment';

/** Days of the month that must have passed before a projection means anything. */
export const MIN_FORECAST_DAYS = 3;

/**
 * Straight-line month-end projection: spending so far ÷ days elapsed × days in the month,
 * rounded to the thousand. Only for the current month, once MIN_FORECAST_DAYS have passed;
 * returns null otherwise (a past month is already final, a future one has no data).
 */
export function projectMonthEnd(
  spent: number,
  month: string,
  now: moment.Moment = moment()
): number | null {
  const start = moment(month, 'YYYY-MM', true);
  if (!start.isValid() || !now.isSame(start, 'month')) return null;
  const elapsed = now.date();
  if (elapsed < MIN_FORECAST_DAYS || !(spent > 0)) return null;
  return Math.round(((spent / elapsed) * start.daysInMonth()) / 1000) * 1000;
}
