import type { DebtType, Wallet } from '../../commons/types';
import { formatCompactCurrency, formatDate } from '../../commons/utils';

export const DEBT_TABS: { type: DebtType; label: string }[] = [
  { type: 'PAYABLE', label: 'Tôi nợ' },
  { type: 'RECEIVABLE', label: 'Người khác nợ tôi' },
];

export const DEBT_TYPE_OPTIONS: { value: DebtType; label: string }[] = [
  { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
  { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
];

/** 'DD/MM/YYYY' of an API date, or '—'. */
export const formatDayOrDash = (value?: string | null) => (value ? formatDate(value) : '—');

/**
 * Which debts the list shows. MONTH and DONE follow the month filter (by start date); OPEN and
 * OVERDUE ignore it, so "what do I still owe?" has one answer whatever month is picked.
 */
export type DebtScope = 'MONTH' | 'OPEN' | 'OVERDUE' | 'DONE';

export const debtScopeOptions = (isPayable: boolean): { value: DebtScope; label: string }[] => [
  { value: 'MONTH', label: 'Tất cả trạng thái' },
  { value: 'OPEN', label: isPayable ? 'Đang nợ · mọi tháng' : 'Chưa thu · mọi tháng' },
  { value: 'OVERDUE', label: 'Quá hạn · mọi tháng' },
  { value: 'DONE', label: 'Đã xong' },
];

/** Wallet picker options; empty value = leave wallet balances alone. */
export const walletOptions = (wallets: Wallet[]) => [
  { value: '', label: 'Không ghi vào ví' },
  ...wallets.map((w) => ({
    value: w.id,
    label: `${w.name} · ${formatCompactCurrency(w.balance)}`,
  })),
];
