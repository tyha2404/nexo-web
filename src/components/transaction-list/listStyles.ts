/**
 * Class lists only the transaction list uses (tag chips, investment status badges).
 * Page-level list styles (header, table, mobile cards) live in components/ui/listStyles.
 */
import { cx, NO_WRAP_BADGE } from '../ui';

/** A transaction tag: codicon `tag` + name, in the same badge shape as WALLET_BADGE. */
export const TAG_CHIP = cx(
  'relative inline-flex max-w-[12rem] items-center gap-1 rounded-xs border border-line bg-hover px-[6px] py-[2px] align-middle text-[12px] leading-[1.2] font-normal text-main [&_svg]:shrink-0 [&_svg]:text-muted',
  'enabled:cursor-pointer enabled:transition-[background-color] enabled:duration-100 enabled:[&:hover]:bg-input-hover',
  'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary',
  // Small badge: on phones it gets a 44px-tall invisible tap area.
  "mobile:enabled:after:absolute mobile:enabled:after:-inset-x-1 mobile:enabled:after:-inset-y-3 mobile:enabled:after:content-['']",
  NO_WRAP_BADGE
);

const STATUS_BADGE_BASE = `inline-block rounded-full border px-3 py-1 text-[0.8rem] font-semibold ${NO_WRAP_BADGE}`;
const STATUS_BADGE_VARIANT: Record<string, string> = {
  holding:
    'bg-primary-glow text-primary border-[color-mix(in_srgb,var(--primary)_30%,transparent)]',
  sold: 'bg-[color-mix(in_srgb,var(--income)_15%,transparent)] text-income border-[color-mix(in_srgb,var(--income)_30%,transparent)]',
  matured:
    'bg-[color-mix(in_srgb,var(--purple)_15%,transparent)] text-purple border-[color-mix(in_srgb,var(--purple)_30%,transparent)]',
  cancelled:
    'bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-expense border-[color-mix(in_srgb,var(--expense)_30%,transparent)]',
};
export const statusBadgeClass = (status: string) =>
  `${STATUS_BADGE_BASE} ${STATUS_BADGE_VARIANT[status.toLowerCase()] ?? 'border-0'}`;
