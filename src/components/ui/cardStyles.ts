/**
 * Shared Tailwind class lists for cards, stat tiles, badges, loading/empty states and the
 * filter bar (formerly .glass-card / .summary-stat-* / .txn-*-badge / .spinner / .filter-bar
 * in components.css). Each constant is the final result of all the old stacked rules
 * (hover, light theme, phone layout).
 *
 * `[&:hover]` is used where the old rule was a plain `:hover` (it also fires on a tap on iOS);
 * `hover:` only where the old rule was inside `@media (hover: hover)`.
 */
import { cx } from './styles';

/* ---------- Cards ---------- */

const GLASS_CARD_BASE =
  'box-border rounded-lg border border-line bg-card px-4 py-[0.85rem] shadow-app-sm mobile:rounded-md mobile:px-[0.65rem] mobile:py-[0.65rem]';

/** Plain glass card. */
export const GLASS_CARD = cx(
  GLASS_CARD_BASE,
  'transition-[border-color,box-shadow] duration-200 ease-[ease] [&:hover]:border-line-hover [&:hover]:shadow-app-lg'
);

const CLICKABLE_BASE =
  'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-[ease] [&:hover]:[transform:translateY(-2px)] [&:hover]:border-primary!';

/** Lift + primary border on hover; add to any clickable tile (for a glass card use CLICKABLE_GLASS_CARD). */
export const CLICKABLE_CARD = cx(
  CLICKABLE_BASE,
  'hover:shadow-app-lg [@media(hover:none)]:[&:hover]:shadow-[0_6px_18px_rgba(0,0,0,0.25)]'
);

/** Glass card that navigates somewhere. */
export const CLICKABLE_GLASS_CARD = cx(GLASS_CARD_BASE, CLICKABLE_BASE, '[&:hover]:shadow-app-lg');

/** Dashboard panel: a glass card stretched to its grid row. */
export const DASHBOARD_CARD = cx(
  GLASS_CARD,
  'flex h-full flex-col mobile:w-full mobile:max-w-full mobile:overflow-hidden'
);

export const CARD_SECTION_HEADER = 'mb-[0.65rem] flex items-center justify-between';
export const CARD_TITLE_WRAP = 'flex items-center gap-[0.45rem]';
/** h3 of a dashboard card (clickable link to the related page). */
export const CARD_TITLE =
  'mt-0 mb-3 cursor-pointer text-[1.05rem] font-bold text-main transition-[color] duration-150 ease-[ease] [&:hover]:text-primary mobile:mb-2';

/* ---------- Summary stat tiles ---------- */

/** Staggered entrance for list/grid children (prefers-reduced-motion: no-preference). */
export const STAGGER_CHILDREN =
  'motion-safe:[&>*]:animate-[nexo-item-enter_280ms_var(--motion-ease)_both] motion-safe:[&>:nth-child(2)]:[animation-delay:25ms] motion-safe:[&>:nth-child(3)]:[animation-delay:50ms] motion-safe:[&>:nth-child(4)]:[animation-delay:75ms] motion-safe:[&>:nth-child(5)]:[animation-delay:100ms] motion-safe:[&>:nth-child(6)]:[animation-delay:125ms]';

/** Grid of stat tiles; a horizontal swipe row on phones. */
export const SUMMARY_GRID = cx(
  'mb-[0.85rem] grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3',
  'mobile:-mx-[0.65rem] mobile:mb-[0.65rem] mobile:grid-flow-col mobile:auto-cols-[minmax(150px,46%)] mobile:grid-cols-none mobile:gap-[0.45rem] mobile:snap-x mobile:snap-mandatory mobile:scroll-px-[0.65rem] mobile:overflow-x-auto mobile:px-[0.65rem] mobile:py-0',
  'mobile:[&>div]:col-auto mobile:[&>div]:min-h-0 mobile:[&>div]:snap-start mobile:[&>div:last-child:nth-child(odd)]:col-[1/-1]',
  STAGGER_CHILDREN
);

export const SUMMARY_STAT_CARD =
  'relative flex min-h-[84px] flex-col justify-between overflow-hidden rounded-md border border-line bg-card px-4 py-[0.85rem] shadow-app-sm [-webkit-backdrop-filter:var(--glass-blur)] [backdrop-filter:var(--glass-blur)] transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] [&:hover]:[transform:translateY(-2px)] [&:hover]:border-line-hover [&:hover]:shadow-app-md mobile:min-h-[72px] mobile:px-3 mobile:py-[0.65rem]';
export const SUMMARY_STAT_HEADER =
  'mb-2 flex items-center justify-between align-middle leading-[1.2] [&_svg]:block [&_svg]:shrink-0 mobile:mb-1';
export const SUMMARY_STAT_TITLE = 'text-[0.75rem] font-bold tracking-[0.05em] text-muted uppercase';
/** Hidden on phones inside the Transactions/Debts pages. */
export const SUMMARY_STAT_SUBTITLE =
  'mt-[0.35rem] text-[0.8rem] text-muted mobile:text-[0.7rem] mobile:[.transactions-view_&]:hidden';

const STAT_VALUE_BASE =
  'my-1 font-mono text-[1.45rem] leading-[1.2] font-bold tracking-[-0.02em] tabular-nums mobile:my-[0.15rem] mobile:text-[1.1rem]';
const STAT_VALUE_TONE = {
  default: 'text-main',
  income: 'text-income',
  expense: 'text-expense',
} as const;
export type StatTone = keyof typeof STAT_VALUE_TONE;
export const statValueClass = (tone: StatTone = 'default') =>
  cx(STAT_VALUE_BASE, STAT_VALUE_TONE[tone]);

/* ---------- Badges & transaction text ---------- */

/** Badges never wrap or shrink (was the global `[class*='badge'], .tag, .chip` rule). */
export const NO_WRAP_BADGE = 'shrink-0 whitespace-nowrap [word-break:keep-all]';

export const WALLET_BADGE = cx(
  'inline-flex items-center gap-[0.35rem] rounded-full border border-line bg-[rgba(148,163,184,0.12)] px-[0.65rem] py-1 align-middle text-[0.8rem] leading-[1.2] font-medium text-muted [&_svg]:block [&_svg]:shrink-0',
  NO_WRAP_BADGE
);

const PNL_BADGE_BASE = cx(
  'inline-block rounded-full px-[0.65rem] py-1 text-[0.8rem] font-semibold',
  NO_WRAP_BADGE
);
/** Realized profit/loss pill (bordered). */
export const pnlBadgeClass = (profit: boolean) =>
  cx(
    PNL_BADGE_BASE,
    profit
      ? 'border border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.15)] text-income'
      : 'border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.15)] text-expense'
  );
/** Borderless variant used in the dashboard's recent transactions. */
export const pnlBadgeSoftClass = (profit: boolean) =>
  cx(
    PNL_BADGE_BASE,
    profit ? 'bg-[rgba(16,185,129,0.15)] text-income' : 'bg-[rgba(239,68,68,0.15)] text-expense'
  );

export const TXN_AMOUNT = 'font-mono font-semibold';
export const TXN_DATE = 'text-[0.875rem] text-muted';

/* ---------- Dashboard ---------- */

/** Category breakdown + recent transactions; `dashboard-main-grid` is a test locator. */
export const DASHBOARD_MAIN_GRID =
  'dashboard-main-grid mb-3 grid grid-cols-[1fr_1fr] items-stretch gap-3 max-[1025px]:grid-cols-[1fr] mobile:mb-2 mobile:w-full mobile:gap-2';

export const TIMELINE_LIST = cx(
  'flex flex-1 flex-col gap-[0.45rem] mobile:[&>:nth-child(n+5)]:hidden',
  STAGGER_CHILDREN
);
export const RECENT_TXN_ROW = cx(
  'flex items-center justify-between rounded-md border border-line bg-input px-3 py-[0.55rem] [&:hover]:bg-hover light:border-[#e2e8f0] light:bg-[#f8fafc] light:[&:hover]:bg-[#f8fafc] mobile:items-start mobile:gap-[10px] mobile:p-3',
  CLICKABLE_CARD
);
export const TXN_TITLE =
  'max-w-[220px] overflow-hidden text-[0.875rem] font-semibold text-ellipsis whitespace-nowrap text-main mobile:max-w-none mobile:text-[0.9375rem] mobile:leading-[1.4] mobile:whitespace-normal mobile:[overflow-wrap:anywhere]';

/* ---------- Empty / loading states ---------- */

export const EMPTY_STATE = 'px-6 py-12 text-center text-muted';
export const EMPTY_BOX = 'flex flex-col items-center justify-center px-3 py-5 text-center';
export const EMPTY_ICON_CIRCLE =
  'mb-2 flex size-11 items-center justify-center rounded-full bg-hover';
export const EMPTY_TITLE = 'mb-[0.2rem] text-[0.9rem] font-bold text-main';
export const EMPTY_SUB = 'mb-3 max-w-[280px] text-[0.78rem] text-muted';
export const EMPTY_ACTIONS = 'flex flex-wrap items-center justify-center gap-2';

const SPINNER_BASE =
  'm-0 inline-block shrink-0 rounded-full border-solid align-middle animate-[spin_1s_linear_infinite]';
/** Full-page loader (app boot). */
export const SPINNER_PAGE = cx(SPINNER_BASE, 'size-12 border-4 border-primary-glow border-l-main');
/** Loader inside a LOADING_SPINNER block. */
export const SPINNER_SECTION = cx(
  SPINNER_BASE,
  'size-10 border-[3px] border-primary-glow border-t-primary'
);
/** Inline loader inside a button (takes the text colour). */
export const SPINNER_BUTTON = cx(
  SPINNER_BASE,
  'size-4 border-2 border-current border-l-transparent'
);
/** Tiny loader; set the size at the call site. */
export const SPINNER_MICRO =
  'rounded-full border-2 border-solid border-line border-t-primary animate-[spin_0.8s_linear_infinite]';

const SKELETON_BASE =
  "relative overflow-hidden after:absolute after:inset-0 after:[transform:translateX(-100%)] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] after:content-[''] after:animate-[skeleton-shimmer_1.4s_infinite] motion-reduce:after:animate-none";
export const SKELETON = cx(SKELETON_BASE, 'rounded-md bg-input');
export const SKELETON_CARD = cx(SKELETON_BASE, 'rounded-lg bg-card p-5');

/* ---------- Filter bar ---------- */

/**
 * Search / select / month filters above a list. `filter-bar` stays as a marker: vendor.css
 * styles the inputs inside it. Pass `withStatus` when a fourth (status) column is shown.
 */
export const filterBarClass = (withStatus = false) =>
  cx(
    'filter-bar mb-[0.85rem] grid grid-cols-[1fr] items-start gap-2 rounded-md border border-line bg-card px-3 py-2 backdrop-blur-[12px] min-[640px]:grid-cols-[2fr_1fr]',
    withStatus
      ? 'min-[1024px]:grid-cols-[1.5fr_1fr_1fr_1.2fr]'
      : 'min-[1024px]:grid-cols-[2fr_1fr_1.2fr]',
    'mobile:mb-[0.65rem] mobile:grid-cols-[1fr_1fr]! mobile:gap-[0.4rem] mobile:px-[0.6rem] mobile:py-[0.45rem] mobile:[&>*]:min-w-0!',
    '[&_:is(input,select):focus]:border-primary [&_:is(input,select):focus]:shadow-[0_0_0_3px_var(--primary-glow)] [&_:is(input,select):focus]:outline-none'
  );
/** Spans the whole row on phones. */
export const FILTER_FULL_ROW = 'mobile:col-span-full';
export const SEARCH_WRAPPER = cx('relative w-full', FILTER_FULL_ROW);
export const SEARCH_ICON =
  'pointer-events-none absolute top-1/2 left-[0.85rem] z-2 -translate-y-1/2 text-muted';
/** `!` beats the unlayered vendor.css `.filter-bar input` padding. */
export const SEARCH_INPUT = 'h-[42px]! pl-[2.65rem]!';

export const CATEGORIES_LIST =
  'grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 pr-1 mobile:grid-cols-[1fr] mobile:gap-2';
