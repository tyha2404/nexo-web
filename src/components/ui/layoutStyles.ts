/**
 * Page layout rules shared by every tab view (Dashboard, Transactions, Debts, Planning).
 * The constants below are the only source of block spacing, card surface and card padding;
 * page components compose them instead of writing their own margins/paddings.
 *
 * Page anatomy, top to bottom. Each block ends with BLOCK_GAP, so every page has the same rhythm:
 *   1. PAGE_HEADER     h2 title on the left; on the right the page's own create action
 *                      (PAGE_HEADER_BTN) or a page-wide control (the Dashboard month).
 *   2. Section tabs    TABS_UNDERLINE: switches between sub-pages that have their own URL
 *                      (Planning: Mục tiêu / Danh mục). Nowhere else.
 *   3. Type tabs       TABS (pill): switches the type of the same list
 *                      (Chi tiêu / Thu nhập / Đầu tư). Never used for optional filters.
 *   4. ALERT_ERROR     load/save error of the page.
 *   5. SUMMARY_GRID    a row of SUMMARY_STAT_CARD tiles: any row of headline numbers.
 *   6. Filter bar      filterBarClass(): search, optional filters as dropdowns that start at
 *                      "Tất cả …", then the month.
 *   7. Content         list: TABLE_CONTAINER on desktop, LIST_ITEM_CARD rows on phones;
 *                      or DASHBOARD_CARD panels. A list is never wrapped in another card.
 *   8. Pagination
 *
 * Cards:
 *   - A card is CARD_SURFACE (6px radius, 1px border, bg-card, no shadow; shadows belong to
 *     floating overlays: modals, menus, toasts).
 *   - Panels and stat tiles use CARD_PAD; list rows use LIST_ITEM_PAD.
 *   - Cards never nest. Inside a card, group content with SUB_TILE (filled, no border) or a
 *     divider (border-t border-line).
 *   - Loading: a list shows <ListSkeleton>; a panel shows SPINNER_MICRO.
 *   - Empty: a page list shows <EmptyState>; a panel shows EMPTY_BOX.
 */
import { cx } from './styles';

/** Space below every top-level block of a page (12px, 10px on phones). */
export const BLOCK_GAP = 'mb-3 mobile:mb-2.5';

/** Space between items of a grid or list inside a block (8px). */
export const ITEM_GAP = 'gap-2';

/** Root of a tab view. */
export const PAGE_ROOT = 'mx-auto box-border w-full max-w-full p-0';

/** Surface shared by every card. */
export const CARD_SURFACE = 'box-border rounded-md border border-line bg-card';

/** Padding of panels and stat tiles. */
export const CARD_PAD = 'px-4 py-3 mobile:px-3 mobile:py-2.5';

/** Padding of list rows (category items, mobile transaction/debt/target cards). */
export const LIST_ITEM_PAD = 'px-3 py-2.5';

/** Grouped content inside a card: filled, no border, so it never reads as a nested card. */
export const SUB_TILE = 'rounded-sm bg-input px-3 py-2 light:bg-hover';

/** Section heading between blocks of a page (Dashboard "Tài sản tích lũy…"). */
export const SECTION_TITLE = 'mb-2 text-[0.95rem] font-bold text-main';

/** Page-level error message. */
export const ALERT_ERROR = cx(
  BLOCK_GAP,
  'flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] text-expense',
  'border-[color-mix(in_srgb,var(--expense)_35%,transparent)] bg-[color-mix(in_srgb,var(--expense)_10%,transparent)]',
  '[&_svg]:shrink-0'
);
