import { InvestmentStatus, TransactionType } from '../../commons/constants';

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  [InvestmentStatus.HOLDING]: 'Đang đầu tư',
  [InvestmentStatus.SOLD]: 'Đã bán',
  [InvestmentStatus.MATURED]: 'Đã đáo hạn',
  [InvestmentStatus.CANCELLED]: 'Đã hủy',
};

export const INVESTMENT_STATUS_OPTIONS: { value: InvestmentStatus; label: string }[] =
  Object.values(InvestmentStatus).map((value) => ({
    value,
    label: INVESTMENT_STATUS_LABELS[value],
  }));

export const INVESTMENT_STATUS_FILTER_OPTIONS: { value: InvestmentStatus | ''; label: string }[] = [
  { value: '', label: 'Tất cả Trạng thái' },
  ...INVESTMENT_STATUS_OPTIONS,
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

/** Pill tabs that switch a list between the three transaction types, in display order. */
export const TRANSACTION_TYPE_TABS: readonly { type: TransactionType; label: string }[] = [
  { type: TransactionType.EXPENSE, label: 'Chi tiêu' },
  { type: TransactionType.INCOME, label: 'Thu nhập' },
  { type: TransactionType.INVESTMENT, label: 'Đầu tư' },
];

/** Capitalised name of a transaction type ("Chi tiêu", ...): page titles, breadcrumbs. */
export const TRANSACTION_TYPE_LABEL = Object.fromEntries(
  TRANSACTION_TYPE_TABS.map(({ type, label }) => [type, label])
) as Record<TransactionType, string>;
