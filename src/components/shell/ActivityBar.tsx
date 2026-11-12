import type { ReactNode } from 'react';
import { cx, Plus, SlidingTabs } from '../ui';
import { NAV_ITEMS, type ActiveTab } from './navigation';
import { ACTIVITY_BTN } from './shellStyles';

export interface ActivityBarProps {
  activeTab: ActiveTab;
  onTabClick: (tab: ActiveTab) => void;
  onQuickAdd: () => void;
  /** The settings menu (AccountMenu variant="desktop"). */
  accountMenu: ReactNode;
}

/** Desktop icon column: main tabs, then quick add and settings at the bottom. */
export function ActivityBar({ activeTab, onTabClick, onQuickAdd, accountMenu }: ActivityBarProps) {
  return (
    <div className="flex w-12 flex-col border-r border-line bg-activitybar">
      <SlidingTabs
        as="nav"
        variant="activity"
        className="nav-menu flex flex-col"
        aria-label="Điều hướng chính"
      >
        {NAV_ITEMS.map(({ tab, label, Icon }) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabClick(tab)}
              className={cx(
                ACTIVITY_BTN,
                active ? 'text-activity' : 'text-activity-inactive hover:text-activity'
              )}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={24} />
            </button>
          );
        })}
      </SlidingTabs>
      <div className="mt-auto flex flex-col">
        <button
          type="button"
          className={cx(ACTIVITY_BTN, 'text-activity-inactive hover:text-activity')}
          onClick={onQuickAdd}
          aria-label="Ghi giao dịch"
          title="Ghi giao dịch"
        >
          <Plus size={24} />
        </button>
        {accountMenu}
      </div>
    </div>
  );
}
