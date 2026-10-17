import { InvestmentStatus, TransactionType } from '../../commons/constants';

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  [InvestmentStatus.HOLDING]: 'Đang đầu tư',
  [InvestmentStatus.SOLD]: 'Đã bán',
  [InvestmentStatus.MATURED]: 'Đã đáo hạn',
  [InvestmentStatus.CANCELLED]: 'Đã hủy',
};

export const INVESTMENT_STATUS_FILTER_OPTIONS: { value: InvestmentStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả Trạng thái' },
  ...Object.values(InvestmentStatus).map((value) => ({
    value,
    label: INVESTMENT_STATUS_LABELS[value],
  })),
];

/** Lower-case Vietnamese noun for a transaction type ("chi tiêu", ...). */
export const getTypeLabel = (type: TransactionType) =>
  type === TransactionType.INCOME
    ? 'thu nhập'
    : type === TransactionType.INVESTMENT
      ? 'đầu tư'
      : 'chi tiêu';

/** Sign shown before an amount: income adds, expense subtracts, investment is neutral. */
export const getAmountSign = (type: TransactionType) =>
  type === TransactionType.INCOME ? '+' : type === TransactionType.EXPENSE ? '-' : '';
