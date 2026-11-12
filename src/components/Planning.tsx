import { SlidingTabs } from './ui';
import { Tags, Target } from './ui';
import { useEffect, useState } from 'react';
import { APP_EVENTS } from '../commons/constants';
import Categories from './Categories';
import Targets from './Targets';
import { cx, PAGE_HEADER_BTN, PAGE_ROOT, TABS_NAV, TABS_UNDERLINE, tabClass } from './ui';
import { PageHeader } from './common';

export type PlanningSubTab = 'targets' | 'categories';

export interface PlanningProps {
  initialSubTab?: PlanningSubTab;
  onSubTabChange?: (subTab: PlanningSubTab) => void;
}

export default function Planning({ initialSubTab = 'targets', onSubTabChange }: PlanningProps) {
  const [activeSubTab, setActiveSubTab] = useState<PlanningSubTab>(initialSubTab);

  // Sync internal state if initialSubTab prop changes (e.g. via parent navigation)
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const handleTabChange = (tab: PlanningSubTab) => {
    setActiveSubTab(tab);
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  return (
    <div className={cx(PAGE_ROOT, 'planning-hub-container')}>
      {/* 1. Planning Page Header with Action Button */}
      <PageHeader
        title="Kế hoạch"
        actions={
          activeSubTab === 'targets' ? (
            <button
              type="button"
              className={PAGE_HEADER_BTN}
              onClick={() =>
                window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_ADD_TARGET_MODAL))
              }
            >
              <Target size={16} /> Thêm mục tiêu
            </button>
          ) : (
            <button
              type="button"
              className={PAGE_HEADER_BTN}
              onClick={() =>
                window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_ADD_CATEGORY_MODAL))
              }
            >
              <Tags size={16} /> Tạo danh mục
            </button>
          )
        }
      />

      {/* 2. Hub Navigation Segmented Tabs (Below Page Title) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <SlidingTabs
          variant="underline"
          className={TABS_UNDERLINE}
          role="tablist"
          aria-label="Phân mục Kế hoạch"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'targets'}
            className={tabClass(activeSubTab === 'targets', 'underline')}
            onClick={() => handleTabChange('targets')}
          >
            <Target size={16} />
            <span>Mục tiêu & Ngân sách</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'categories'}
            className={tabClass(activeSubTab === 'categories', 'underline')}
            onClick={() => handleTabChange('categories')}
          >
            <Tags size={16} />
            <span>Danh mục thu chi</span>
          </button>
        </SlidingTabs>
      </div>

      {/* 3. Sub-view Content Area */}
      <div className="w-full animate-fade-in" key={activeSubTab}>
        {activeSubTab === 'targets' ? <Targets /> : <Categories />}
      </div>
    </div>
  );
}
