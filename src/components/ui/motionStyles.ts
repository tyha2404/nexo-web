/** Shared motion uses backwards fill only: hover/focus transforms work after entry. */
export const MOTION_ENTER =
  'motion-safe:animate-[nexo-item-enter_280ms_var(--motion-ease)_backwards]';
export const MOTION_FADE = 'motion-safe:animate-[fadeIn_180ms_ease-out_backwards]';
export const MOTION_MENU =
  'origin-top-right motion-safe:animate-[nexo-menu-enter_160ms_var(--motion-ease)_backwards]';
export const MOTION_PRESS = 'motion-safe:enabled:active:scale-[0.97]';

/** Delay is capped at 125ms, even for long lists. */
export const STAGGER_CHILDREN =
  'motion-safe:[&>*]:animate-[nexo-item-enter_280ms_var(--motion-ease)_backwards] motion-safe:[&>:nth-child(2)]:[animation-delay:25ms] motion-safe:[&>:nth-child(3)]:[animation-delay:50ms] motion-safe:[&>:nth-child(4)]:[animation-delay:75ms] motion-safe:[&>:nth-child(5)]:[animation-delay:100ms] motion-safe:[&>:nth-child(n+6)]:[animation-delay:125ms]';
export const MOTION_TABLE_ROWS =
  'motion-safe:[&_tbody>tr]:animate-[fadeIn_220ms_ease-out_backwards] motion-safe:[&_tbody>tr:nth-child(2)]:[animation-delay:25ms] motion-safe:[&_tbody>tr:nth-child(3)]:[animation-delay:50ms] motion-safe:[&_tbody>tr:nth-child(n+4)]:[animation-delay:75ms] [&_td]:transition-colors [&_td]:duration-150';
