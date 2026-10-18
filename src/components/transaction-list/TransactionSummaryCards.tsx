import moment from 'moment';
import type { ReactNode } from 'react';
import { TransactionType } from '../../commons/constants';
import type { TransactionSummary } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import {
  cx,
  statValueClass,
  SUMMARY_GRID,
  SUMMARY_STAT_CARD,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_SUBTITLE,
  SUMMARY_STAT_TITLE,
  type StatTone,
} from '../ui';

export interface TransactionSummaryCardsProps {
  activeType: TransactionType;
  summary: TransactionSummary;
  /** Month in 'YYYY-MM' format. */
  selectedMonth: string;
}

function StatCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className={SUMMARY_STAT_CARD}>
      <div className={SUMMARY_STAT_HEADER}>
        <span className={SUMMARY_STAT_TITLE}>{title}</span>
      </div>
      <div className={statValueClass(tone)}>{value}</div>
      {subtitle && <div className={SUMMARY_STAT_SUBTITLE}>{subtitle}</div>}
    </div>
  );
}

export function TransactionSummaryCards({
  activeType,
  summary,
  selectedMonth,
}: TransactionSummaryCardsProps) {
  const sumAmount = summary.sumAmount;
  const count = summary.total;
  const avg = count > 0 ? sumAmount / count : 0;

  if (activeType === TransactionType.INCOME) {
    return (
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <StatCard title="Tổng thu" tone="income" value={formatCurrency(Math.abs(sumAmount))} />
        <StatCard title="Số khoản thu" value={`${count} khoản`} />
        <StatCard title="TB / khoản" value={formatCurrency(Math.abs(avg))} />
      </div>
    );
  }

  if (activeType === TransactionType.INVESTMENT) {
    const holdingAmount = summary.holdingAmount ?? 0;
    const totalRealizedPnl = summary.realizedPnl ?? 0;
    const holdingCount = summary.holdingCount ?? 0;
    const profit = totalRealizedPnl >= 0;
    return (
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <StatCard
          title="Vốn đang giữ"
          value={formatCurrency(holdingAmount)}
          subtitle={`${holdingCount} khoản đang giữ`}
        />
        <StatCard
          title="Lãi / lỗ đã chốt"
          tone={profit ? 'income' : 'expense'}
          value={formatCurrency(totalRealizedPnl)}
        />
        <StatCard
          title="Vốn tích lũy"
          value={formatCurrency(sumAmount)}
          subtitle={`${count} lần góp vốn`}
        />
      </div>
    );
  }

  // Expense: daily average over the elapsed days of the month (up to today)
  const today = moment().startOf('day');
  const start = moment(selectedMonth, 'YYYY-MM').startOf('month');
  const end = moment(selectedMonth, 'YYYY-MM').endOf('month');
  const effectiveEnd = end.isAfter(today) ? today : end;
  const daysCount = Math.max(1, effectiveEnd.diff(start, 'days') + 1);
  const dailyAvg = (summary.sumAmountForAverage ?? summary.sumAmount) / daysCount;

  return (
    <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
      <StatCard title="Tổng chi" tone="expense" value={formatCurrency(Math.abs(sumAmount))} />
      <StatCard
        title="TB / ngày"
        value={formatCurrency(Math.abs(dailyAvg))}
        subtitle={
          <>
            {daysCount} ngày
            {summary.sumAmountForAverage !== undefined &&
              summary.sumAmountForAverage !== summary.sumAmount &&
              ' · Đã loại trừ danh mục'}
          </>
        }
      />
      <StatCard title="TB / giao dịch" value={formatCurrency(Math.abs(avg))} />
      <StatCard title="Số giao dịch" value={`${count} giao dịch`} />
    </div>
  );
}
