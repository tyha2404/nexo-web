/* Shared Tailwind class lists for the chat widget. */

/** Buttons: the unlayered global `button { transition }` rule beats plain utilities. */
export const BTN_TRANSITION = 'transition-all! duration-200! ease-[ease]!';

/** Mirrors the global `[class*='chip'], [class*='badge'], .tag` no-wrap rule these elements used to match. */
export const NO_WRAP = 'whitespace-nowrap! shrink-0! [word-break:keep-all]!';

export const SIDEBAR_PANEL =
  'absolute top-0 right-0 bottom-0 flex flex-col z-20 bg-[rgba(13,21,37,0.95)] backdrop-blur-[16px] border-l border-[rgba(255,255,255,0.1)] shadow-[-8px_0_24px_rgba(0,0,0,0.45)] animate-[chatSlideInRight_0.24s_cubic-bezier(0.16,1,0.3,1)] light:bg-[rgba(248,250,252,0.96)] light:border-[#e2e8f0] light:shadow-[-8px_0_24px_rgba(0,0,0,0.12)] mobile:w-full! mobile:max-w-full!';

export const SIDEBAR_HEADER =
  'flex justify-between items-center px-[14px] py-3 border-b border-[rgba(255,255,255,0.06)] light:border-[#e2e8f0]';

export const SIDEBAR_TITLE =
  'flex items-center gap-[7px] text-[12.5px] font-semibold text-[#f1f5f9] light:text-[#0f172a]';

export const SIDEBAR_CLOSE_BTN = `bg-transparent border-0 text-[#94a3b8] cursor-pointer p-1 rounded-sm flex items-center justify-center ${BTN_TRANSITION} hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f8fafc] light:text-[#64748b] light:hover:bg-[#e2e8f0] light:hover:text-[#0f172a]`;
