import { Plus, SlidingTabs } from '../ui';
import { NAV_ITEMS, type ActiveTab, type NavItem } from './navigation';
import { bottomNavTabClass } from './shellStyles';

export interface BottomNavProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onQuickAdd: () => void;
}

/** Mobile PWA bottom navigation: 5 evenly spaced tabs plus a floating "Ghi mới" button. */
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
        <div className="flex h-[30px] w-[56px] items-center justify-center rounded-full">
          <Icon size={active ? 21 : 20} />
        </div>
        <span
          className={`text-[10.5px] leading-[14px] tracking-normal whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}
        >
          {short}
        </span>
      </button>
    );
  };

  return (
    <>
      <SlidingTabs
        as="nav"
        variant="icon"
        className="bottom-nav fixed inset-x-0 bottom-0 z-[9990] hidden keyboard:hidden! h-[calc(60px+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-line/60 bg-activitybar/80 backdrop-blur-xl backdrop-saturate-150 [&>[data-tab-indicator]]:rounded-full [&>[data-tab-indicator]]:bg-(--primary-glow) pt-[4px] pr-[max(6px,env(safe-area-inset-right,0px))] pb-[env(safe-area-inset-bottom,0px)] pl-[max(6px,env(safe-area-inset-left,0px))] mobile:flex"
        aria-label="Điều hướng chính"
      >
        {NAV_ITEMS.map(renderItem)}
      </SlidingTabs>

      <button
        type="button"
        onClick={onQuickAdd}
        aria-label="Ghi giao dịch mới"
        className="fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(60px+env(safe-area-inset-bottom,0px)+16px)] z-[9991] hidden keyboard:hidden! size-14 cursor-pointer items-center justify-center rounded-full border-none bg-primary p-0 text-white shadow-[0_6px_16px_var(--primary-glow),0_2px_6px_rgba(0,0,0,0.3)] transition-[background-color,transform]! duration-100! [-webkit-tap-highlight-color:transparent] active:scale-95 active:bg-primary-hover mobile:flex"
      >
        <Plus size={26} />
      </button>
    </>
  );
}
