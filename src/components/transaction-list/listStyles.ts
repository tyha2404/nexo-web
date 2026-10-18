/**
 * Tailwind class lists shared by the Transactions, Debts, Targets and Planning pages
 * (page header, desktop table, mobile cards, badges). Marker classes kept at the front
 * (`transactions-header`, `transactions-table-container`, `transactions-mobile-cards`, ...)
 * are markers for tests.
 */
import { NO_WRAP_BADGE, STAGGER_CHILDREN, MOTION_TABLE_ROWS } from '../ui';

export const PAGE_HEADER =
  'transactions-header mb-[0.85rem] flex flex-wrap items-center justify-between gap-2 mobile:mb-3 mobile:gap-[0.65rem]';
export const PAGE_TITLE = 'transactions-title text-left mobile:min-w-0';
export const PAGE_TITLE_H2 =
  'm-0 mb-[0.15rem] text-[1.35rem] font-bold tracking-[-0.025em] text-main mobile:mb-0 mobile:text-[1.15rem]';
export const PAGE_SUBTITLE = 'subtitle m-0 text-[0.8125rem] text-muted mobile:hidden';
export const PAGE_VIEW = 'transactions-view mx-auto w-full max-w-full p-0';

export const TABLE_CONTAINER =
  'transactions-table-container overflow-x-auto rounded-lg border border-line bg-card shadow-app-md backdrop-blur-[16px] transition-[box-shadow,border-color] duration-[250ms] ease-[ease] mobile:hidden';
export const TABLE =
  `${MOTION_TABLE_ROWS} transactions-table w-full min-w-[600px] border-collapse text-left text-[0.95rem] ` +
  '[&_th]:border-b [&_th]:border-line [&_th]:bg-input [&_th]:px-6 [&_th]:py-4 [&_th]:font-semibold [&_th]:text-muted ' +
  '[&_td]:border-b [&_td]:border-line [&_td]:px-6 [&_td]:py-[1.2rem] [&_td]:align-middle [&_td]:text-muted ' +
  '[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-hover [&_tr:hover_td]:text-main';
export const TITLE_CELL = 'text-left font-medium';
export const ACTIONS_CELL = 'whitespace-nowrap';

export const CATEGORY_BADGE = `inline-flex items-center rounded-full border border-primary-glow bg-primary-glow px-3 py-1 align-middle text-[0.8rem] leading-[1.2] font-medium text-primary ${NO_WRAP_BADGE}`;

const STATUS_BADGE_BASE = `inline-block rounded-full border px-3 py-1 text-[0.8rem] font-semibold ${NO_WRAP_BADGE}`;
const STATUS_BADGE_VARIANT: Record<string, string> = {
  holding: 'bg-primary-glow text-primary border-[rgba(99,102,241,0.3)]',
  sold: 'bg-[rgba(16,185,129,0.15)] text-income border-[rgba(16,185,129,0.3)]',
  matured: 'bg-[rgba(168,85,247,0.15)] text-purple border-[rgba(168,85,247,0.3)]',
  cancelled: 'bg-[rgba(244,63,94,0.15)] text-expense border-[rgba(244,63,94,0.3)]',
};
export const statusBadgeClass = (status: string) =>
  `${STATUS_BADGE_BASE} ${STATUS_BADGE_VARIANT[status.toLowerCase()] ?? 'border-0'}`;

/** Mobile card list (replaces the table on phones); children enter staggered. */
export const MOBILE_CARDS = `transactions-mobile-cards hidden mobile:flex mobile:flex-col mobile:gap-[0.45rem] ${STAGGER_CHILDREN}`;

export const MOBILE_CARD =
  'transaction-mobile-card flex select-none flex-col gap-[0.35rem] rounded-md border border-line bg-card px-[0.65rem] py-[0.55rem] shadow-app-sm transition-[transform,border-color] duration-150 ease-[ease] [-webkit-tap-highlight-color:transparent] hover:border-line-hover hover:bg-card-hover light:border-line light:bg-white light:shadow-[0_2px_8px_rgba(0,0,0,0.04)]';
export const MOBILE_CARD_LEFT = 'flex min-w-0 items-center gap-3';
const MOBILE_ICON_BADGE_BASE =
  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-sm border text-[1.15rem]';
const MOBILE_ICON_BADGE_VARIANT: Record<string, string> = {
  expense: 'bg-[rgba(244,63,94,0.15)] text-expense border-[rgba(244,63,94,0.25)]',
  income: 'bg-[rgba(16,185,129,0.15)] text-income border-[rgba(16,185,129,0.25)]',
  investment: 'bg-primary-glow text-primary border-[rgba(99,102,241,0.25)]',
};
export const mobileIconBadgeClass = (variant: string) =>
  `${MOBILE_ICON_BADGE_BASE} ${MOBILE_ICON_BADGE_VARIANT[variant] ?? 'border-0'}`;
export const MOBILE_CARD_TITLE =
  'overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem] font-semibold text-main';
export const MOBILE_CARD_DATE = 'text-[0.75rem] text-muted';
export const MOBILE_CARD_AMOUNT =
  'whitespace-nowrap text-right font-mono text-[1.05rem] font-bold leading-[1.3]';
const MOBILE_AMOUNT_COLOR: Record<string, string> = {
  expense: 'text-expense',
  income: 'text-income',
};
export const mobileAmountColor = (variant: string) => MOBILE_AMOUNT_COLOR[variant] ?? 'text-main';
export const MOBILE_CARD_TAGS = 'flex flex-wrap items-center gap-[0.4rem]';
export const MOBILE_CARD_ACTIONS =
  'flex items-center justify-end gap-2 border-t border-line pt-[0.6rem]';

export const LOADING_SPINNER = 'flex flex-col items-center justify-center py-12 text-muted';
