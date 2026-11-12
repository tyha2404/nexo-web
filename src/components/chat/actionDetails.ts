import { TransactionType } from '../../commons/constants';
import { formatCurrency, formatDate } from '../../commons/utils';
import type { ActionCard } from '../../services';
import { ACTION_TYPES, isCardOfType, type PendingActionData } from './types';

/** Field-by-field details of an AI action card (pure data; ActionCardView renders them). */

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  INCOME: 'Thu nhập',
  EXPENSE: 'Chi tiêu',
  INVESTMENT: 'Đầu tư',
};

export interface Detail {
  label: string;
  value: string;
  /** Amount colour; omitted for plain text. */
  tone?: 'income' | 'expense' | 'neutral';
  tag?: boolean;
}

const money = (label: string, amount: number, tone: Detail['tone'] = 'neutral'): Detail => ({
  label,
  value: formatCurrency(Math.abs(amount)),
  tone,
});

/** What the proposal will write, field by field. */
function proposalDetails(data: PendingActionData): Detail[] {
  switch (data.toolName) {
    case 'create_transaction': {
      const isIncome = data.type === TransactionType.INCOME;
      const amount = money('Số tiền', data.amount, isIncome ? 'income' : 'expense');
      return [
        { ...amount, value: `${isIncome ? '+' : '-'}${amount.value}` },
        {
          label: 'Danh mục',
          value: data.isNewCategoryCreated ? `${data.categoryName} (mới)` : data.categoryName,
          tag: true,
        },
        ...(data.walletName ? [{ label: 'Ví / TK', value: data.walletName }] : []),
        ...(data.date ? [{ label: 'Ngày', value: formatDate(data.date) }] : []),
      ];
    }
    case 'create_category':
      return [
        { label: 'Danh mục', value: data.name, tag: true },
        { label: 'Loại', value: CATEGORY_TYPE_LABELS[data.type] ?? data.type },
      ];
    case 'transfer_between_wallets':
      return [
        money('Số tiền', data.amount),
        { label: 'Từ ví', value: data.fromWalletName },
        { label: 'Sang ví', value: data.toWalletName },
        ...(data.fee > 0 ? [money('Phí', data.fee)] : []),
      ];
    case 'create_debt':
      return [
        money('Số tiền', data.amount, data.debtType === 'RECEIVABLE' ? 'income' : 'expense'),
        { label: 'Loại', value: data.debtType === 'RECEIVABLE' ? 'Cho vay' : 'Đi vay' },
        { label: 'Khoản', value: data.title },
        ...(data.dueDate ? [{ label: 'Hạn', value: formatDate(data.dueDate) }] : []),
      ];
    case 'record_debt_repayment':
      return [
        money('Số tiền', data.amount),
        { label: 'Khoản', value: data.title },
        money('Còn lại', data.remaining),
      ];
    case 'set_budget':
      return [
        money('Hạn mức', data.amount),
        { label: 'Danh mục', value: data.categoryName, tag: true },
        ...(data.date ? [{ label: 'Từ', value: formatDate(data.date) }] : []),
      ];
    case 'set_financial_target':
      return [
        money('Số tiền', data.amount),
        {
          label: 'Loại',
          value: data.targetType === 'INVESTMENT' ? 'Đầu tư / tiết kiệm' : 'Hạn mức chi tiêu',
        },
        { label: 'Tháng', value: `${data.month}/${data.year}` },
      ];
    default:
      return [];
  }
}

/** Fields shown under a card's description. */
export function cardDetails(card: ActionCard): Detail[] {
  if (isCardOfType(card, ACTION_TYPES.PENDING_CONFIRMATION)) return proposalDetails(card.data);
  if (isCardOfType(card, ACTION_TYPES.TRANSACTION_CREATED)) {
    const { data } = card;
    const isIncome = data.type === TransactionType.INCOME;
    const amount = money('Số tiền', data.amount, isIncome ? 'income' : 'expense');
    return [
      { ...amount, value: `${isIncome ? '+' : '-'}${amount.value}` },
      ...(data.category ? [{ label: 'Danh mục', value: data.category, tag: true }] : []),
      ...(data.wallet ? [{ label: 'Ví / TK', value: data.wallet }] : []),
    ];
  }
  return [];
}
