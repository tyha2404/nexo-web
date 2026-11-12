/**
 * Shared Tailwind class lists for cards, stat tiles, badges, loading/empty states and the
 * filter bar (formerly .glass-card / .summary-stat-* / .txn-*-badge / .spinner / .filter-bar
 * in components.css). Each constant is the final result of all the old stacked rules
 * (hover, light theme, phone layout).
 *
 * `[&:hover]` is used where the old rule was a plain `:hover` (it also fires on a tap on iOS);
 * `hover:` only where the old rule was inside `@media (hover: hover)`.
 */
import { CONTROL_FRAME } from './controlStyles';
import { BLOCK_GAP, CARD_PAD, CARD_SURFACE, ITEM_GAP, MONEY } from './layoutStyles';
import { MOTION_ENTER, STAGGER_CHILDREN } from './motionStyles';
import { cx } from './styles';

/* ---------- Cards ---------- */

const GLASS_CARD_BASE = cx(CARD_SURFACE, CARD_PAD);

/** Plain glass card. */
export const GLASS_CARD = cx(
  GLASS_CARD_BASE,
  'transition-[border-color] duration-100 ease-out [&:hover]:border-line-hover'
);

const CLICKABLE_BASE =
  'cursor-pointer transition-[background-color,border-color] duration-100 ease-out [&:hover]:border-primary!';

/** Primary border + hover background on a clickable tile. */
const CLICKABLE_CARD = cx(CLICKABLE_BASE, '[&:hover]:bg-list-hover');

/** Dashboard panel: a glass card stretched to its grid row. */
export const DASHBOARD_CARD = cx(
  GLASS_CARD,
  'flex h-full flex-col mobile:w-full mobile:max-w-full mobile:overflow-hidden'
);

export const CARD_SECTION_HEADER = 'mb-[0.65rem] flex items-center justify-between';
export const CARD_TITLE_WRAP = 'flex items-center gap-[0.45rem]';
/** Heading of a panel that is not a link (VS Code pane header: 11px, bold, uppercase). */
export const PANEL_TITLE =
  'm-0 min-w-0 truncate text-[11px] font-bold tracking-[0.04em] text-main uppercase mobile:text-[12px]';
/** h3 of a dashboard card (clickable link to the related page). */
export const CARD_TITLE =
  'mt-0 mb-3 cursor-pointer text-[11px] font-bold tracking-[0.04em] text-main uppercase transition-[color] duration-100 ease-out [&:hover]:text-link mobile:mb-2 mobile:text-[12px]';

/* ---------- Summary stat tiles ---------- */

/** Grid of stat tiles; a horizontal swipe row on phones. */
export const SUMMARY_GRID = cx(
  BLOCK_GAP,
  'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3',
  'mobile:-mx-[0.65rem] mobile:grid-flow-col mobile:auto-cols-[minmax(150px,46%)] mobile:grid-cols-none mobile:gap-[0.45rem] mobile:snap-x mobile:snap-mandatory mobile:scroll-px-[0.65rem] mobile:overflow-x-auto mobile:px-[0.65rem] mobile:py-0',
  // One or two tiles fit side by side: split the row instead of leaving a gap on the right.
  'mobile:[&:not(:has(>:nth-child(3)))]:auto-cols-fr',
  'mobile:[&>div]:col-auto mobile:[&>div]:min-h-0 mobile:[&>div]:snap-start',
  STAGGER_CHILDREN
);

export const SUMMARY_STAT_CARD = cx(
  CARD_SURFACE,
  CARD_PAD,
  'relative flex min-h-[84px] flex-col justify-between overflow-hidden transition-[border-color] duration-100 ease-out [&:hover]:border-line-hover mobile:min-h-0 mobile:justify-start'
);
/** Stat tile that navigates somewhere (Dashboard). */
export const CLICKABLE_STAT_CARD = cx(SUMMARY_STAT_CARD, CLICKABLE_BASE, '[&:hover]:bg-list-hover');
export const SUMMARY_STAT_HEADER =
  'mb-2 flex items-center justify-between align-middle leading-[1.2] [&_svg]:block [&_svg]:shrink-0 mobile:mb-1';
export const SUMMARY_STAT_TITLE = 'text-[11px] font-bold tracking-[0.04em] text-muted uppercase';
/** Hidden on phones inside the Transactions/Debts pages. */
export const SUMMARY_STAT_SUBTITLE =
  'mt-[0.35rem] text-[0.8rem] text-muted mobile:text-[0.7rem] mobile:[.transactions-view_&]:hidden';

const STAT_VALUE_BASE = cx(
  MONEY,
  'my-1 text-[1.45rem] leading-[1.2] mobile:my-[0.15rem] mobile:text-[1.1rem]'
);
const STAT_VALUE_TONE = {
  default: 'text-main',
  income: 'text-income',
  expense: 'text-expense',
} as const;
export type StatTone = keyof typeof STAT_VALUE_TONE;
export const statValueClass = (tone: StatTone = 'default') =>
  cx(STAT_VALUE_BASE, STAT_VALUE_TONE[tone]);

/** Surface of a chart tooltip (a floating overlay, so it keeps a shadow). */
export const CHART_TOOLTIP = 'rounded-md border border-line bg-card shadow-app-md';

/* ---------- Badges & transaction text ---------- */

/** Badges never wrap or shrink (was the global `[class*='badge'], .tag, .chip` rule). */
export const NO_WRAP_BADGE = 'shrink-0 whitespace-nowrap [word-break:keep-all]';

export const WALLET_BADGE = cx(
  'inline-flex items-center gap-[0.35rem] rounded-xs border border-line bg-hover px-[6px] py-[2px] align-middle text-[12px] leading-[1.2] font-normal text-main [&_svg]:block [&_svg]:shrink-0',
  NO_WRAP_BADGE
);

const PNL_BADGE_BASE = cx(
  MONEY,
  'inline-block rounded-xs px-[6px] py-[2px] text-[12px]',
  NO_WRAP_BADGE
);
/** Realized profit/loss pill (bordered). */
export const pnlBadgeClass = (profit: boolean) =>
  cx(
    PNL_BADGE_BASE,
    profit
      ? 'border border-[color-mix(in_srgb,var(--income)_30%,transparent)] bg-[color-mix(in_srgb,var(--income)_15%,transparent)] text-income'
      : 'border border-[color-mix(in_srgb,var(--expense)_30%,transparent)] bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-expense'
  );
/** Borderless variant used in the dashboard's recent transactions. */
export const pnlBadgeSoftClass = (profit: boolean) =>
  cx(
    PNL_BADGE_BASE,
    profit
      ? 'bg-[color-mix(in_srgb,var(--income)_15%,transparent)] text-income'
      : 'bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-expense'
  );

export const TXN_AMOUNT = MONEY;
export const TXN_DATE = 'text-[0.875rem] text-muted';

/* ---------- Dashboard ---------- */

/** Category breakdown + recent transactions; `dashboard-main-grid` is a test locator. */
export const DASHBOARD_MAIN_GRID = cx(
  STAGGER_CHILDREN,
  BLOCK_GAP,
  'dashboard-main-grid grid grid-cols-[1fr_1fr] items-stretch gap-3 max-[1025px]:grid-cols-[1fr] mobile:w-full mobile:gap-2.5'
);

export const TIMELINE_LIST = cx(
  'flex flex-1 flex-col gap-[0.45rem] mobile:[&>:nth-child(n+5)]:hidden',
  STAGGER_CHILDREN
);
export const RECENT_TXN_ROW = cx(
  'flex items-center justify-between rounded-xs border border-transparent bg-transparent px-2 py-[0.45rem] [&:hover]:bg-list-hover mobile:items-start mobile:gap-[10px] mobile:p-3',
  CLICKABLE_CARD
);
export const TXN_TITLE =
  'max-w-[220px] overflow-hidden text-[13px] font-normal text-ellipsis whitespace-nowrap text-main mobile:max-w-none mobile:text-[0.9375rem] mobile:leading-[1.4] mobile:whitespace-normal mobile:[overflow-wrap:anywhere]';

/* ---------- Empty / loading states ---------- */

export const EMPTY_STATE = `${MOTION_ENTER} px-6 py-12 text-center text-muted`;
export const EMPTY_BOX = `${MOTION_ENTER} flex flex-col items-center justify-center px-3 py-5 text-center`;
export const EMPTY_ICON_CIRCLE =
  'mb-2 flex size-11 items-center justify-center rounded-full bg-hover';
export const EMPTY_TITLE = 'mb-[0.2rem] text-[0.9rem] font-bold text-main';
export const EMPTY_SUB = 'mb-3 max-w-[280px] text-[0.78rem] text-muted';
export const EMPTY_ACTIONS = 'flex flex-wrap items-center justify-center gap-2';

const SPINNER_BASE =
  'm-0 inline-block shrink-0 rounded-full border-solid align-middle animate-[spin_1s_linear_infinite]';
/** Full-page loader (app boot). */
export const SPINNER_PAGE = cx(SPINNER_BASE, 'size-12 border-4 border-primary-glow border-l-main');
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
export const SKELETON_CARD = cx(SKELETON_BASE, 'rounded-md border border-line bg-card');

/* ---------- Filter bar ---------- */

/**
 * Search / select / month filters above a list. `filter-bar` stays as a marker: vendor.css
 * styles the inputs inside it. Pass `withStatus` when a fourth (status) column is shown.
 */
export const filterBarClass = (withStatus = false) =>
  cx(
    BLOCK_GAP,
    CARD_SURFACE,
    'filter-bar grid grid-cols-[1fr] items-start gap-2 px-3 py-2 min-[640px]:grid-cols-[2fr_1fr]',
    withStatus
      ? 'min-[1024px]:grid-cols-[1.5fr_1fr_1fr_1.2fr]'
      : 'min-[1024px]:grid-cols-[2fr_1fr_1.2fr]',
    'mobile:grid-cols-[1fr_1fr]! mobile:gap-[0.4rem] mobile:px-[0.6rem] mobile:py-[0.45rem] mobile:[&>*]:min-w-0!',
    '[&_:is(input,select):focus]:border-primary [&_:is(input,select):focus]:shadow-none [&_:is(input,select):focus]:outline-none'
  );
/** Spans the whole row on phones. */
export const FILTER_FULL_ROW = 'mobile:col-span-full';
export const SEARCH_WRAPPER = cx('relative w-full', FILTER_FULL_ROW);
export const SEARCH_ICON =
  'pointer-events-none absolute top-1/2 left-[0.85rem] z-2 -translate-y-1/2 text-muted';
/** `!` beats the unlayered vendor.css `.filter-bar input` padding. */
export const SEARCH_INPUT = cx(
  CONTROL_FRAME,
  'w-full h-(--control-height)! min-h-(--control-height)! pl-[2.3rem]! py-0! text-(length:--control-font-size)! placeholder:text-muted'
);

export const CATEGORIES_LIST = cx(
  STAGGER_CHILDREN,
  ITEM_GAP,
  'grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] mobile:grid-cols-[1fr]'
);
