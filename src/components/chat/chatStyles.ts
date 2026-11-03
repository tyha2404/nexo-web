/* Shared Tailwind class lists for the chat widget. */

/** Buttons: the unlayered global `button { transition }` rule beats plain utilities. */
export const BTN_TRANSITION = 'transition-all! duration-200! ease-[ease]!';

/** Mirrors the global `[class*='chip'], [class*='badge'], .tag` no-wrap rule these elements used to match. */
export const NO_WRAP = 'whitespace-nowrap! shrink-0! [word-break:keep-all]!';

export const SIDEBAR_PANEL =
  'absolute top-0 right-0 bottom-0 flex flex-col z-20 bg-[var(--bg-widget)] backdrop-blur-[16px] border-l border-line shadow-[-8px_0_24px_rgba(0,0,0,0.45)] animate-[chatSlideInRight_0.24s_cubic-bezier(0.16,1,0.3,1)] light:bg-[var(--bg-widget)] light:shadow-[-8px_0_24px_rgba(0,0,0,0.12)] mobile:w-full! mobile:max-w-full!';

export const SIDEBAR_HEADER =
  'flex justify-between items-center px-[14px] py-3 border-b border-line';

export const SIDEBAR_TITLE =
  'flex items-center gap-[7px] text-[12.5px] font-semibold text-[var(--text-main)] light:text-[var(--text-main)]';

/** VS Code toolbar action (same shape as ACTION_BTN_* in ui/styles.ts). */
export const SIDEBAR_CLOSE_BTN = `inline-flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-0 bg-transparent p-0 text-main ${BTN_TRANSITION} hover:bg-hover pointer-coarse:size-11`;
