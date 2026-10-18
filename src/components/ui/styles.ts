/**
 * Shared Tailwind class lists for buttons, form controls and segmented tabs
 * (formerly .btn / .action-btn / .form-group / .category-tab in components.css).
 *
 * Global element defaults that still apply on top of these live in styles/base.css
 * (select/textarea radius, 16px control font on touch-sized screens, checkbox size).
 * `close-btn` is a marker; the modal close button is MODAL_CLOSE_BTN in modalStyles.ts.
 */

import { MOTION_PRESS } from './motionStyles';

/** Joins the truthy class strings. */
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */

export const BTN_BASE = `${MOTION_PRESS} inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md align-middle leading-[1.2] font-semibold whitespace-nowrap [word-break:keep-all] select-none [-webkit-tap-highlight-color:transparent] transition-[background-color,border-color,color,box-shadow,transform] duration-[180ms] ease-out`;

/** Default button size; pass another size to `btnClass` instead of fighting it with `!`. */
export const BTN_MD = 'px-[1.15rem] py-[0.65rem] text-[0.9rem]';

const BTN_SKIN = {
  primary:
    'border border-primary bg-primary text-white shadow-[0_2px_8px_var(--primary-glow)] hover:border-primary-hover hover:shadow-[0_4px_14px_var(--primary-glow)] enabled:hover:bg-primary-hover',
  secondary:
    'border border-line bg-input text-(--text-muted) shadow-none hover:border-line-hover hover:bg-hover hover:text-main enabled:hover:bg-input-hover light:border-[#e2e8f0] light:bg-[#f1f5f9] light:text-[#475569] light:hover:border-[#cbd5e1] light:hover:bg-[#e2e8f0] light:hover:text-[#0f172a] light:enabled:hover:bg-input-hover',
  danger:
    'border-none bg-[#ef4444] text-white hover:bg-[#dc2626] hover:shadow-[0_4px_12px_rgba(239,68,68,0.3)]',
} as const;

export type ButtonVariant = keyof typeof BTN_SKIN;

export const btnClass = (variant: ButtonVariant, size: string = BTN_MD) =>
  cx(BTN_BASE, size, BTN_SKIN[variant]);

export const BTN_PRIMARY = btnClass('primary');
export const BTN_SECONDARY = btnClass('secondary');
export const BTN_DANGER = btnClass('danger');

/** Buttons sharing a modal footer split the width equally. */
export const BTN_FILL = 'grow basis-[0%]';

/** Primary action in a page header: becomes a compact outlined button on phones. */
export const PAGE_HEADER_BTN = cx(
  BTN_PRIMARY,
  'mobile:min-h-[34px] mobile:border-primary mobile:bg-transparent mobile:px-3 mobile:py-0 mobile:text-[0.8rem] mobile:text-primary mobile:shadow-none'
);

/** Wrapper for the page-header action buttons (a flex item of the page header). */
export const HEADER_ACTIONS =
  'inline-flex flex-wrap items-center gap-3 mobile:w-auto mobile:flex-none mobile:flex-nowrap';

/* Icon-only row actions (desktop tables, category cards). */
const ACTION_BTN_BASE = `${MOTION_PRESS} inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0 align-middle text-[1rem] leading-[1.2] whitespace-nowrap [word-break:keep-all] shadow-none transition-all duration-200 ease-[ease] hover:-translate-y-px mobile:min-h-11 mobile:min-w-11 pointer-coarse:min-h-11 pointer-coarse:min-w-11`;
export const ACTION_BTN_EDIT = cx(
  ACTION_BTN_BASE,
  'text-(--text-muted) hover:bg-hover hover:text-primary'
);
export const ACTION_BTN_DELETE = cx(
  ACTION_BTN_BASE,
  'text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#dc2626]'
);
export const ACTION_BUTTONS_WRAPPER = 'inline-flex items-center gap-3';

/* Labelled actions on mobile cards. `[&:hover]` keeps iOS's tap-hover feedback. */
const MOBILE_ACTION_BASE =
  'inline-flex min-h-[38px] cursor-pointer items-center gap-[0.35rem] rounded-md border border-line bg-input px-[0.85rem] py-[0.4rem] text-[0.82rem] font-medium select-none [-webkit-tap-highlight-color:transparent] transition-all duration-200 ease-[ease] active:-translate-y-px [&:hover]:-translate-y-px light:bg-[#f8fafc]';
export const MOBILE_ACTION_BTN = cx(
  MOBILE_ACTION_BASE,
  'text-primary light:[&:hover]:bg-[#f1f5f9]'
);
export const MOBILE_ACTION_EDIT = cx(
  MOBILE_ACTION_BASE,
  'text-(--text-muted) active:border-primary active:bg-primary-glow active:text-primary [&:hover]:border-primary [&:hover]:text-primary dark:[&:hover]:bg-primary-glow light:[&:hover]:bg-[#f1f5f9]'
);
export const MOBILE_ACTION_DELETE = cx(
  MOBILE_ACTION_BASE,
  'text-[#ef4444] active:border-expense active:bg-[rgba(244,63,94,0.1)] [&:hover]:border-expense [&:hover]:bg-[rgba(239,68,68,0.12)] [&:hover]:text-[#dc2626]'
);

/* ---------- Forms ---------- */

/** Field wrapper: styles its label and the input/select/textarea inside it. */
export const FORM_GROUP =
  'mb-5 min-w-0 max-w-full text-left ' +
  '[&_label]:mb-2 [&_label]:block [&_label]:text-[0.875rem] [&_label]:font-medium [&_label]:text-muted ' +
  '[&_:is(input,select,textarea)]:box-border [&_:is(input,select,textarea)]:w-full [&_:is(input,select,textarea)]:rounded-sm [&_:is(input,select,textarea)]:border [&_:is(input,select,textarea)]:border-line [&_:is(input,select,textarea)]:bg-input [&_:is(input,select,textarea)]:px-4 [&_:is(input,select,textarea)]:py-3 [&_:is(input,select,textarea)]:[font-family:inherit] [&_:is(input,select,textarea)]:text-[0.95rem] [&_:is(input,select,textarea)]:text-main [&_:is(input,select,textarea)]:transition-[border-color,box-shadow] [&_:is(input,select,textarea)]:duration-200 [&_:is(input,select,textarea)]:ease-[ease] ' +
  '[&_:is(input,select,textarea):focus]:border-primary [&_:is(input,select,textarea):focus]:shadow-[0_0_0_3px_var(--primary-glow)] [&_:is(input,select,textarea):focus]:[outline:none]';

/** Checkbox row (label wraps the checkbox). */
export const FORM_CHECK = 'mb-5 flex min-w-0 max-w-full items-center text-left';
export const FORM_CHECK_LABEL =
  'flex cursor-pointer items-center gap-2 text-[0.875rem] font-medium text-main';
export const FORM_CHECK_INPUT = 'm-0 cursor-pointer accent-primary';

/** Two fields side by side, stacked on narrow screens. */
export const FORM_ROW_2COL = 'grid grid-cols-2 gap-4 max-[601px]:grid-cols-1 max-[601px]:gap-3';

/* ---------- Segmented tabs ---------- */

export const TABS_NAV = 'mb-[0.85rem] flex w-full items-center justify-start mobile:mb-3';

const TABS_BASE =
  'box-border inline-flex min-h-10 max-w-full items-center mobile:flex mobile:w-full';
/** Pill switcher (Transactions, Categories, add-transaction modal). */
export const TABS = cx(
  TABS_BASE,
  'gap-1 rounded-md border border-line bg-card p-1 [-webkit-backdrop-filter:var(--glass-blur)] [backdrop-filter:var(--glass-blur)] mobile:justify-between mobile:gap-[3px] mobile:p-[3px]'
);
/** Underlined section nav (Planning hub). */
export const TABS_UNDERLINE = cx(TABS_BASE, 'gap-5 p-0 mobile:justify-start');

const TAB_BASE = `${MOTION_PRESS} inline-flex min-h-[34px] shrink-0 cursor-pointer items-center justify-center align-middle text-[0.85rem] leading-[1.2] font-semibold whitespace-nowrap [word-break:keep-all] select-none [-webkit-tap-highlight-color:transparent] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] [&_svg]:size-[14px] [&_svg]:shrink-0 mobile:min-w-0 mobile:gap-[0.35rem] mobile:overflow-hidden mobile:text-center mobile:text-[0.78rem] mobile:text-ellipsis`;
const TAB_PILL =
  'rounded-sm border border-transparent px-4 py-[0.45rem] mobile:flex-[1_1_0] mobile:px-[0.35rem]';
const TAB_PILL_IDLE =
  'bg-transparent text-(--text-muted) hover:border-line-hover hover:bg-hover hover:text-main';
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
