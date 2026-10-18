import { SlidingTabs } from './ui';
import { Tags, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import Categories from './Categories';
import Targets from './Targets';
import { PAGE_HEADER, PAGE_TITLE, PAGE_TITLE_H2 } from './transaction-list/listStyles';
import { HEADER_ACTIONS, PAGE_HEADER_BTN, TABS_NAV, TABS_UNDERLINE, tabClass } from './ui';

export type PlanningSubTab = 'targets' | 'categories';

export interface PlanningProps {
  initialSubTab?: PlanningSubTab;
  onSubTabChange?: (subTab: PlanningSubTab) => void;
  onNavigate?: (tab: string) => void;
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
    <div className="planning-hub-container mx-auto flex w-full max-w-full flex-col gap-0 p-0">
      {/* 1. Planning Page Header with Action Button */}
      <header className={`${PAGE_HEADER} animate-fade-in`}>
        <div className={PAGE_TITLE}>
          <h2 className={PAGE_TITLE_H2}>Kế hoạch</h2>
        </div>
        <div className={HEADER_ACTIONS}>
          {activeSubTab === 'targets' ? (
            <button
              type="button"
              className={PAGE_HEADER_BTN}
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-target-modal'))}
            >
              <Target size={16} /> Thêm mục tiêu
            </button>
          ) : (
            <button
              type="button"
              className={PAGE_HEADER_BTN}
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-category-modal'))}
            >
              <Tags size={16} /> Tạo danh mục
            </button>
          )}
        </div>
      </header>

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
            <Target size={14} />
            <span>Mục tiêu & Ngân sách</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'categories'}
            className={tabClass(activeSubTab === 'categories', 'underline')}
            onClick={() => handleTabChange('categories')}
          >
            <Tags size={14} />
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
