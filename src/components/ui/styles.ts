/**
 * Shared Tailwind class lists for buttons, form controls and segmented tabs
 * (formerly .btn / .action-btn / .form-group / .category-tab in components.css).
 *
 * Global element defaults that still apply on top of these live in styles/base.css
 * (select/textarea radius, 16px control font on touch-sized screens, checkbox size).
 * `close-btn` is a marker; the modal close button is MODAL_CLOSE_BTN in modalStyles.ts.
 */

/** Joins the truthy class strings. */
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */

const BTN_BASE = `inline-flex shrink-0 cursor-pointer items-center justify-center gap-[6px] rounded-sm align-middle leading-[18px] font-normal whitespace-nowrap [word-break:keep-all] select-none [-webkit-tap-highlight-color:transparent] transition-[background-color,border-color,color] duration-100 ease-out disabled:cursor-default disabled:opacity-50`;

/** Default button size (VS Code `.monaco-button`: 26px, 13px/18px text); 36px on phones. */
const BTN_MD =
  'min-h-[26px] px-3 py-[3px] text-[13px] mobile:min-h-9 mobile:px-3.5 mobile:text-[14px]';

const BTN_SKIN = {
  primary:
    'border border-btn-border bg-primary text-white shadow-none enabled:hover:bg-primary-hover',
  secondary:
    'border border-btn-border bg-btn-secondary text-btn-secondary-fg shadow-none enabled:hover:bg-btn-secondary-hover',
  danger: 'border border-btn-border bg-[#c72e0f] text-white shadow-none enabled:hover:bg-[#a52a10]',
} as const;

type ButtonVariant = keyof typeof BTN_SKIN;

export const btnClass = (variant: ButtonVariant, size: string = BTN_MD) =>
  cx(BTN_BASE, size, BTN_SKIN[variant]);

export const BTN_PRIMARY = btnClass('primary');
export const BTN_SECONDARY = btnClass('secondary');
export const BTN_DANGER = btnClass('danger');

/** Dialog footer button: right-aligned at its own width on desktop (VS Code dialogs), equal halves on phones. */
export const BTN_FILL = 'min-w-20 mobile:grow mobile:basis-[0%]';

/** Primary action in a page header: becomes a compact outlined button on phones. */
export const PAGE_HEADER_BTN = cx(
  BTN_PRIMARY,
  'mobile:min-h-8 mobile:border-primary mobile:bg-transparent mobile:px-2.5 mobile:py-0 mobile:text-[13px] mobile:text-link mobile:shadow-none'
);

/** Wrapper for the page-header action buttons (a flex item of the page header). */
export const HEADER_ACTIONS =
  'inline-flex flex-wrap items-center gap-2 mobile:w-auto mobile:flex-none mobile:flex-nowrap';

/* Icon-only row actions (desktop tables, category cards). */
const ACTION_BTN_BASE = `inline-flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-none bg-transparent p-0 align-middle text-[1rem] leading-[1.2] whitespace-nowrap [word-break:keep-all] shadow-none transition-colors duration-100 ease-out hover:bg-hover [&_svg]:size-4 mobile:min-h-9 mobile:min-w-9 pointer-coarse:min-h-9 pointer-coarse:min-w-9`;
export const ACTION_BTN_EDIT = cx(ACTION_BTN_BASE, 'text-main');
export const ACTION_BTN_DELETE = cx(ACTION_BTN_BASE, 'text-expense');
export const ACTION_BUTTONS_WRAPPER = 'inline-flex items-center gap-1';

/* Labelled actions on mobile cards. `[&:hover]` keeps iOS's tap-hover feedback. */
const MOBILE_ACTION_BASE =
  'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-btn-border bg-btn-secondary px-2.5 py-1 text-[13px] font-normal text-btn-secondary-fg select-none [-webkit-tap-highlight-color:transparent] transition-colors duration-100 ease-out active:bg-btn-secondary-hover';
export const MOBILE_ACTION_BTN = cx(MOBILE_ACTION_BASE, 'text-link!');
export const MOBILE_ACTION_EDIT = MOBILE_ACTION_BASE;
export const MOBILE_ACTION_DELETE = cx(MOBILE_ACTION_BASE, 'text-expense!');

/**
 * On phones, grows a small control's tappable area to ~44px tall with an invisible ::after,
 * without changing its layout. Keep ≥ 8px between neighbours so the areas don't overlap much.
 */
const TOUCH_HIT =
  "relative mobile:after:absolute mobile:after:-inset-x-1 mobile:after:-inset-y-3 mobile:after:content-['']";

/**
 * Small chip button in the VS Code badge style (same shape as WALLET_BADGE: 3px radius, panel
 * border, toolbar-hover fill, 12px text, codicon at 12px). Used for removable filters and tags.
 * 32px tall on phones and 44px tappable with TOUCH_HIT; 1px focusBorder ring on keyboard focus.
 */
export const CHIP_BTN = cx(
  'inline-flex max-w-full shrink-0 cursor-pointer items-center gap-1 rounded-xs border border-line bg-hover px-[6px] py-[2px] text-[12px] leading-4 font-normal text-main select-none [-webkit-tap-highlight-color:transparent] [&_svg]:shrink-0',
  'transition-[background-color,color] duration-100 ease-out [&:hover]:bg-input-hover',
  'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50',
  'mobile:min-h-8 mobile:px-2 mobile:text-[13px]',
  TOUCH_HIT
);
/** Quieter chip (an offer, not a value): no fill until hovered, description foreground. */
export const CHIP_BTN_GHOST = 'bg-transparent text-muted [&:hover]:text-main';

/* ---------- Forms ---------- */

/** Field wrapper: styles its label and the input/select/textarea inside it. */
export const FORM_GROUP =
  'mb-4 min-w-0 max-w-full text-left ' +
  '[&_label]:mb-[6px] [&_label]:block [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-main ' +
  '[&_:is(input,select,textarea)]:box-border [&_:is(input,select,textarea)]:w-full [&_:is(input,select,textarea)]:rounded-sm [&_:is(input,select,textarea)]:border [&_:is(input,select,textarea)]:border-line-hover [&_:is(input,select,textarea)]:bg-input [&_:is(input,select,textarea)]:px-[8px] [&_:is(input,select,textarea)]:py-[4px] [&_:is(input,select,textarea)]:[font-family:inherit] [&_:is(input,select,textarea)]:text-(length:--control-font-size) [&_:is(input,select,textarea)]:text-main [&_:is(input,select,textarea)]:transition-[border-color,box-shadow] [&_:is(input,select,textarea)]:duration-200 [&_:is(input,select,textarea)]:ease-[ease] ' +
  '[&_:is(input,select,textarea):focus]:border-primary [&_:is(input,select,textarea):focus]:shadow-none [&_:is(input,select,textarea):focus]:[outline:none]';

/** Checkbox row (label wraps the checkbox). */
export const FORM_CHECK = 'mb-4 flex min-w-0 max-w-full items-center text-left';
export const FORM_CHECK_LABEL =
  'flex cursor-pointer items-center gap-2 text-[0.875rem] font-medium text-main';
export const FORM_CHECK_INPUT = 'm-0 cursor-pointer accent-primary';

/** Two fields side by side, stacked on narrow screens. */
export const FORM_ROW_2COL = 'grid grid-cols-2 gap-3 max-[601px]:grid-cols-1 max-[601px]:gap-0';

/* ---------- Segmented tabs ---------- */

/** Row holding a tab bar; spaced like any other page block (BLOCK_GAP). */
export const TABS_NAV = 'mb-3 mobile:mb-2.5 flex w-full items-center justify-start';

const TABS_BASE = 'box-border inline-flex max-w-full items-center mobile:flex mobile:w-full';
/** Pill switcher (Transactions, Categories, add-transaction modal). */
export const TABS = cx(
  TABS_BASE,
  'gap-[2px] rounded-md border border-line bg-card p-[2px] mobile:justify-between mobile:gap-[2px] mobile:p-[2px]'
);
/** Underlined section nav (Planning hub). */
export const TABS_UNDERLINE = cx(TABS_BASE, 'gap-5 p-0 mobile:justify-start');

const TAB_BASE = `inline-flex min-h-6 shrink-0 cursor-pointer items-center justify-center align-middle text-[13px] leading-[1.2] font-normal mobile:min-h-[30px] whitespace-nowrap [word-break:keep-all] select-none [-webkit-tap-highlight-color:transparent] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] [&_svg]:size-4 [&_svg]:shrink-0 mobile:min-w-0 mobile:gap-[0.35rem] mobile:overflow-hidden mobile:text-center mobile:text-[0.78rem] mobile:text-ellipsis`;
const TAB_PILL =
  'rounded-sm border border-transparent px-3 py-[3px] mobile:flex-[1_1_0] mobile:px-[0.35rem]';
const TAB_PILL_IDLE = 'bg-transparent text-(--text-muted) hover:bg-hover hover:text-main';
const TAB_PILL_ACTIVE = 'bg-transparent text-white';
const TAB_LINE =
  '-mb-px rounded-none border-0 border-b-2 bg-transparent px-[0.1rem] py-2 mobile:flex-none';
const TAB_LINE_IDLE = 'border-b-transparent text-(--text-muted) hover:text-main';
const TAB_LINE_ACTIVE = 'border-b-transparent text-main';

/**
 * One tab of `TABS` (pill) or `TABS_UNDERLINE` (underline).
 * `gap` is the icon/label gap on desktop; phones always use 0.35rem.
 */
export const tabClass = (active: boolean, variant: 'pill' | 'underline' = 'pill', gap = 'gap-2') =>
  variant === 'pill'
    ? cx(TAB_BASE, gap, TAB_PILL, active ? TAB_PILL_ACTIVE : TAB_PILL_IDLE)
    : cx(TAB_BASE, gap, TAB_LINE, active ? TAB_LINE_ACTIVE : TAB_LINE_IDLE);
