import { useEffect, useMemo, useState } from 'react';
import { TransactionType } from '../../commons/constants';
import type { DailyReport, DailyReportItem } from '../../commons/types';
import { getErrorMessage } from '../../commons/utils';
import { reportService } from '../../services';
import { DayCalendar } from '../common';

const BY_TYPE: Record<
  TransactionType,
  { pick: (item: DailyReportItem) => number; tone: string; label: string; emptyText: string }
> = {
  [TransactionType.EXPENSE]: {
    pick: (item) => item.expense,
    tone: 'var(--expense)',
    label: 'Lịch chi tiêu theo ngày',
    emptyText: 'không chi',
  },
  [TransactionType.INCOME]: {
    pick: (item) => item.income,
    tone: 'var(--income)',
    label: 'Lịch thu nhập theo ngày',
    emptyText: 'không có thu',
  },
  [TransactionType.INVESTMENT]: {
    pick: (item) => item.investment ?? 0,
    tone: 'var(--investment)',
    label: 'Lịch đầu tư theo ngày',
    emptyText: 'không đầu tư',
  },
};

export interface SpendingCalendarProps {
  /** Month in 'YYYY-MM' format (the page's month filter). */
  month: string;
  /** Which daily total to show. */
  type: TransactionType;
  /** Bump to refetch (the page's refresh key). */
  refreshKey: number;
  /** Selected day 'YYYY-MM-DD', or null for the whole month. */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * Daily calendar of the Transactions page (expense, income or investment), from
 * GET /reports/daily. Totals cover every category (the category/search filters only apply
 * to the list). Investment counts the amount put in that day, whatever its status.
 */
export function SpendingCalendar({
  month,
  type,
  refreshKey,
  selectedDay,
  onSelectDay,
}: SpendingCalendarProps) {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    reportService
      .daily(month, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setReport(res);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'Không tải được lịch'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, refreshKey]);

  const config = BY_TYPE[type];
  const values = useMemo(() => {
    const out: Record<string, number> = {};
    if (report?.month === month) {
      for (const item of report.items) out[item.date] = config.pick(item);
    }
    return out;
  }, [report, month, config]);

  return (
    <DayCalendar
      month={month}
      values={values}
      tone={config.tone}
      label={config.label}
      emptyText={config.emptyText}
      selectedDay={selectedDay}
      onSelectDay={onSelectDay}
      // Keep showing the previous numbers while a refresh is in flight.
      loading={loading && report?.month !== month}
      error={error}
    />
  );
}
