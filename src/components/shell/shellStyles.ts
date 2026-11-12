/**
 * App shell styling, modelled on the VS Code workbench: title bar, activity bar, side bar,
 * editor (tabs + breadcrumbs) and status bar on desktop. `mobile:` swaps them for the fixed
 * mobile header + bottom nav. `!` transitions beat the global unlayered `button` rule.
 */
import { cx, MOTION_MENU } from '../ui';

export const BRAND_CLICKABLE =
  'cursor-pointer select-none [-webkit-tap-highlight-color:transparent] transition-opacity duration-100 hover:opacity-90';
const BTN_TRANSITION = 'transition-[background-color,color]! duration-100! ease-out!';
export const MOBILE_HEADER_BTN = `flex size-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[5px] border-none p-0 [-webkit-tap-highlight-color:transparent] ${BTN_TRANSITION} [&:hover]:bg-hover active:bg-hover`;
/** VS Code `.action-item`: 22px square, 5px radius, toolbar hover fill. */
export const TOOLBAR_BTN = `inline-flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-main ${BTN_TRANSITION} hover:bg-hover`;
export const ACTIVITY_BTN = `relative flex h-12 w-12 cursor-pointer items-center justify-center border-none bg-transparent p-0 ${BTN_TRANSITION}`;
export const STATUS_ITEM = `inline-flex h-full cursor-pointer items-center gap-1 border-none bg-transparent px-[5px] text-[12px] text-statusbar-fg ${BTN_TRANSITION} hover:bg-statusbar-hover [&_svg]:size-[14px]`;
/** VS Code context menu: blue selection on hover. */
export const MENU_PANEL = `${MOTION_MENU} z-100 min-w-[220px] rounded-md border border-line bg-widget p-1 text-[13px] shadow-app-lg`;
export const MENU_ITEM =
  'flex h-[26px] w-full cursor-pointer items-center gap-2 rounded-[3px] border-none bg-transparent px-2 text-left text-[13px] text-main hover:bg-primary hover:text-white [&_svg]:size-4 mobile:h-10 mobile:text-[15px]';
export const TREE_ITEM =
  'flex h-[22px] w-full cursor-pointer items-center gap-[6px] border border-transparent pr-3 text-left text-[13px] text-main hover:bg-list-hover focus-visible:border-primary focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0';
export const ACCOUNT_ITEM =
  'flex min-h-10 w-full cursor-pointer items-center gap-[0.6rem] rounded-[3px] border-none bg-transparent p-[0.6rem] text-[0.875rem] active:bg-hover [&:hover]:bg-hover';
/** One slot of the mobile bottom nav (tabs and the "Ghi mới" button). */
export const BOTTOM_NAV_BTN =
  'group relative flex h-full min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-none bg-transparent px-px py-[3px] [-webkit-tap-highlight-color:transparent] focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary';
export const bottomNavTabClass = (active: boolean) =>
  cx(
    BOTTOM_NAV_BTN,
    'transition-[color]! duration-100! ease-out!',
    active ? 'text-activity' : 'text-activity-inactive'
  );
