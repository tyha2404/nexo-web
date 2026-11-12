import { ChevronRight, cx, Plus } from '../ui';
import { TAB_ICON_CLASS, type ActiveTab, type NavItem } from './navigation';
import { TOOLBAR_BTN } from './shellStyles';

export interface EditorHeaderProps {
  activeTab: ActiveTab;
  activeNav: NavItem;
  breadcrumbs: string[];
  onQuickAdd: () => void;
}

/** Desktop editor tab strip (current page + "Ghi giao dịch") and breadcrumbs. */
export function EditorHeader({ activeTab, activeNav, breadcrumbs, onQuickAdd }: EditorHeaderProps) {
  return (
    <>
      <div className="flex h-[35px] shrink-0 items-stretch bg-tabs mobile:hidden">
        <div className="relative flex min-w-0 items-center gap-[6px] border-r border-line bg-tab-active pr-4 pl-[10px] text-[13px] text-main before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-primary">
          <activeNav.Icon size={16} className={cx('shrink-0', TAB_ICON_CLASS[activeTab])} />
          <span className="truncate">{activeNav.label}</span>
        </div>
        <div className="flex flex-1 items-center justify-end gap-[2px] border-b border-line px-2">
          <button
            type="button"
            className={cx(TOOLBAR_BTN, 'w-auto gap-1 px-[6px] text-[12px]')}
            onClick={onQuickAdd}
            aria-label="Ghi giao dịch mới"
            title="Ghi giao dịch mới"
          >
            <Plus size={16} />
            <span>Ghi giao dịch</span>
          </button>
        </div>
      </div>
      <nav
        aria-label="Breadcrumb"
        className="flex h-[22px] shrink-0 items-center gap-[2px] px-3 text-[13px] text-muted mobile:hidden"
      >
        <span>nexo</span>
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb} className="flex items-center gap-[2px]">
            <ChevronRight size={16} className="shrink-0" />
            <span className={index === breadcrumbs.length - 1 ? 'text-main' : undefined}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>
    </>
  );
}
