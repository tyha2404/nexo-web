/**
 * Tailwind class lists shared by the list pages (Transactions, Debts, Targets, Planning,
 * Categories, Dashboard): page header, desktop table, mobile cards, badges. Marker classes
 * kept at the front (`transactions-header`, `transactions-table-container`,
 * `transactions-mobile-cards`, ...) are markers for tests.
 */
import { NO_WRAP_BADGE } from './cardStyles';
import { BLOCK_GAP, CARD_SURFACE, LIST_ITEM_PAD, MONEY, PAGE_ROOT } from './layoutStyles';
import { MOTION_TABLE_ROWS, STAGGER_CHILDREN } from './motionStyles';
import { cx } from './styles';

export const PAGE_HEADER = cx(
  BLOCK_GAP,
  'transactions-header flex flex-wrap items-center justify-between gap-2 mobile:gap-[0.65rem]'
);
export const PAGE_TITLE = 'transactions-title text-left mobile:min-w-0';
export const PAGE_TITLE_H2 =
  'm-0 mb-[0.15rem] text-[1.35rem] font-bold tracking-[-0.025em] text-main mobile:mb-0 mobile:text-[1.15rem]';
/** Root of a list page; `transactions-view` hides stat-tile subtitles on phones. */
export const PAGE_VIEW = cx('transactions-view', PAGE_ROOT);

/** The table is the card: no extra wrapper card around it. */
export const TABLE_CONTAINER = cx(
  CARD_SURFACE,
  'transactions-table-container overflow-x-auto mobile:hidden'
);
export const TABLE =
  `${MOTION_TABLE_ROWS} transactions-table w-full min-w-[600px] border-collapse text-left text-[0.95rem] ` +
  '[&_th]:border-b [&_th]:border-line [&_th]:bg-input [&_th]:px-6 [&_th]:py-4 [&_th]:font-semibold [&_th]:text-muted ' +
  '[&_td]:border-b [&_td]:border-line [&_td]:px-6 [&_td]:py-[1.2rem] [&_td]:align-middle [&_td]:text-muted ' +
  '[&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-hover [&_tr:hover_td]:text-main';
export const TITLE_CELL = 'text-left font-medium';
export const ACTIONS_CELL = 'whitespace-nowrap';

export const CATEGORY_BADGE = `inline-flex items-center rounded-full border border-primary-glow bg-primary-glow px-3 py-1 align-middle text-[0.8rem] leading-[1.2] font-medium text-primary ${NO_WRAP_BADGE}`;

export type BadgeTone = 'expense' | 'income' | 'primary';
const TONE_BADGE: Record<BadgeTone, string> = {
  expense:
    'border-[color-mix(in_srgb,var(--expense)_30%,transparent)]! bg-[color-mix(in_srgb,var(--expense)_15%,transparent)]! text-expense!',
  income:
    'border-[color-mix(in_srgb,var(--income)_30%,transparent)]! bg-[color-mix(in_srgb,var(--income)_15%,transparent)]! text-income!',
  primary:
    'border-[color-mix(in_srgb,var(--primary)_30%,transparent)]! bg-primary-glow! text-primary!',
};
/** CATEGORY_BADGE in a status colour (Targets: over budget / completed / in progress). */
export const toneBadgeClass = (tone: BadgeTone) => cx(CATEGORY_BADGE, TONE_BADGE[tone]);

/** Mobile card list (replaces the table on phones); children enter staggered. */
export const MOBILE_CARDS = cx(
  'transactions-mobile-cards hidden mobile:flex mobile:flex-col mobile:gap-2',
  STAGGER_CHILDREN
);

/** One row of a list rendered as cards (mobile lists, category grid). */
export const LIST_ITEM_CARD = cx(
  CARD_SURFACE,
  LIST_ITEM_PAD,
  'transition-[border-color,background-color] duration-150 ease-[ease] [-webkit-tap-highlight-color:transparent] hover:border-line-hover hover:bg-card-hover light:bg-white'
);
export const MOBILE_CARD = cx(
  LIST_ITEM_CARD,
  'transaction-mobile-card flex select-none flex-col gap-[0.35rem]'
);
/** Title block on the left, amount on the right. */
export const MOBILE_CARD_TOP = 'mobile-card-top flex items-start justify-between gap-3';
export const MOBILE_CARD_LEFT = 'flex min-w-0 flex-1 items-center gap-3';
export const MOBILE_CARD_INFO = 'mobile-card-info flex min-w-0 flex-col gap-[0.2rem]';
export const MOBILE_CARD_AMOUNT_GROUP = 'mobile-card-amount-group shrink-0 text-right';
export const MOBILE_CARD_SUB_AMOUNT = 'text-[0.72rem] text-muted';
const MOBILE_ICON_BADGE_BASE =
  'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-sm border text-[1.15rem]';
const MOBILE_ICON_BADGE_VARIANT: Record<string, string> = {
  expense:
    'bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-expense border-[color-mix(in_srgb,var(--expense)_25%,transparent)]',
  income:
    'bg-[color-mix(in_srgb,var(--income)_15%,transparent)] text-income border-[color-mix(in_srgb,var(--income)_25%,transparent)]',
  investment:
    'bg-primary-glow text-primary border-[color-mix(in_srgb,var(--primary)_25%,transparent)]',
};
export const mobileIconBadgeClass = (variant: string) =>
  `${MOBILE_ICON_BADGE_BASE} ${MOBILE_ICON_BADGE_VARIANT[variant] ?? 'border-0'}`;
export const MOBILE_CARD_TITLE =
  'overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem] font-semibold text-main';
export const MOBILE_CARD_DATE = 'flex items-center gap-1 text-[0.75rem] text-muted';
export const MOBILE_CARD_AMOUNT = cx(
  MONEY,
  'whitespace-nowrap text-right text-[1.05rem] leading-[1.3]'
);
const MOBILE_AMOUNT_COLOR: Record<string, string> = {
  expense: 'text-expense',
  income: 'text-income',
};
export const mobileAmountColor = (variant: string) => MOBILE_AMOUNT_COLOR[variant] ?? 'text-main';
/** Tags on the left and actions on the right share one row; actions wrap below when crowded. */
export const MOBILE_CARD_FOOTER =
  'flex flex-wrap items-center justify-between gap-2 border-t border-line pt-[0.5rem]';
export const MOBILE_CARD_TAGS = 'flex min-w-0 flex-wrap items-center gap-[0.4rem]';
export const MOBILE_CARD_ACTIONS = 'ml-auto flex shrink-0 items-center gap-2';
