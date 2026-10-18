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
  subtitle: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className={SUMMARY_STAT_CARD}>
      <div className={SUMMARY_STAT_HEADER}>
        <span className={SUMMARY_STAT_TITLE}>{title}</span>
      </div>
      <div className={statValueClass(tone)}>{value}</div>
      <div className={SUMMARY_STAT_SUBTITLE}>{subtitle}</div>
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
        <StatCard
          title="Tổng Thu Nhập"
          tone="income"
          value={formatCurrency(Math.abs(sumAmount))}
          subtitle="Tổng khoản thu nhập trong kỳ"
        />
        <StatCard
          title="Số Giao Dịch Thu"
          value={`${count} khoản`}
          subtitle="Tổng số đợt nhận thu nhập"
        />
        <StatCard
          title="Trung Bình / Khoản"
          value={formatCurrency(Math.abs(avg))}
          subtitle="Giá trị thu nhập trung bình"
        />
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
          title="Tiền Đang Đầu Tư (Holding)"
          value={formatCurrency(holdingAmount)}
          subtitle={`Giá trị các khoản đang giữ vốn (${holdingCount} mục)`}
        />
        <StatCard
          title="Lãi / Lỗ Đã Thực Hiện"
          tone={profit ? 'income' : 'expense'}
          value={formatCurrency(totalRealizedPnl)}
          subtitle="Tổng tiền lời / lỗ từ khoản đã bán/đáo hạn"
        />
        <StatCard
          title="Tổng Vốn Tích Lũy"
          value={formatCurrency(sumAmount)}
          subtitle={`Tổng ${count} đợt rót vốn đầu tư trong kỳ`}
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
      <StatCard
        title="Tổng Chi Tiêu"
        tone="expense"
        value={formatCurrency(Math.abs(sumAmount))}
        subtitle="Tổng tiền đã chi trong kỳ"
      />
      <StatCard
        title="Trung Bình / Ngày"
        value={formatCurrency(Math.abs(dailyAvg))}
        subtitle={
          <>
            Chi tiêu bình quân trong {daysCount} ngày (tới hôm nay)
            {summary.sumAmountForAverage !== undefined &&
              summary.sumAmountForAverage !== summary.sumAmount &&
              ' - không tính danh mục đã loại trừ'}
          </>
        }
      />
      <StatCard
        title="Trung Bình / Lần Chi"
        value={formatCurrency(Math.abs(avg))}
        subtitle="Mức chi trung bình mỗi giao dịch"
      />
      <StatCard
        title="Số Lần Chi Tiêu"
        value={`${count} giao dịch`}
        subtitle="Tổng số hóa đơn / giao dịch chi"
      />
    </div>
  );
}
