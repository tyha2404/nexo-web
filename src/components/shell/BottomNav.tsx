import { Plus, SlidingTabs } from '../ui';
import { NAV_ITEMS, type ActiveTab, type NavItem } from './navigation';
import { BOTTOM_NAV_BTN, bottomNavTabClass } from './shellStyles';

export interface BottomNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onQuickAdd: () => void;
}

/** Mobile PWA bottom navigation (styled as the activity bar), "Ghi mới" in the middle. */
export function BottomNav({ activeTab, onNavigate, onQuickAdd }: BottomNavProps) {
  const renderItem = ({ tab, label, short, Icon }: NavItem) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        className={bottomNavTabClass(active)}
        aria-current={active ? 'page' : undefined}
        onClick={() => onNavigate(tab)}
        aria-label={label}
      >
        <div className="flex h-[30px] w-[38px] items-center justify-center rounded-[5px]">
          <Icon size={20} />
        </div>
        <span
          className={`text-[10px] leading-[14px] tracking-normal whitespace-nowrap ${active ? 'font-semibold' : 'font-normal'}`}
        >
          {short}
        </span>
      </button>
    );
  };

  return (
    <SlidingTabs
      as="nav"
      variant="icon"
      className={`bottom-nav fixed inset-x-0 bottom-0 z-[9990] hidden keyboard:hidden! h-[calc(60px+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-line bg-activitybar pt-[4px] pr-[max(6px,env(safe-area-inset-right,0px))] pb-[env(safe-area-inset-bottom,0px)] pl-[max(6px,env(safe-area-inset-left,0px))] mobile:flex`}
      aria-label="Điều hướng chính"
    >
      {NAV_ITEMS.slice(0, 2).map(renderItem)}

      <button
        type="button"
        className={`${BOTTOM_NAV_BTN} text-activity`}
        onClick={onQuickAdd}
        aria-label="Ghi giao dịch mới"
      >
        <div className="flex h-[30px] w-[38px] items-center justify-center rounded-md border border-btn-border bg-primary text-white transition-[background-color] duration-100 group-active:bg-primary-hover">
          <Plus size={22} />
        </div>
        <span className="text-[10px] leading-[14px] font-semibold tracking-normal whitespace-nowrap">
          Ghi mới
        </span>
      </button>

      {NAV_ITEMS.slice(2).map(renderItem)}
    </SlidingTabs>
  );
}
