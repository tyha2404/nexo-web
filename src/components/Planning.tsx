import { Tags, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import Categories from './Categories';
import './Planning.css';
import Targets from './Targets';

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
    <div className="planning-hub-container">
      {/* 1. Planning Page Header with Action Button */}
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Kế hoạch & Mục tiêu</h2>
          <p className="subtitle">
            Thiết lập hạn mức ngân sách, mục tiêu đầu tư và danh mục thu chi tài chính
          </p>
        </div>
        <div className="header-actions">
          {activeSubTab === 'targets' ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-target-modal'))}
            >
              <Target size={16} /> Thêm mục tiêu
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.dispatchEvent(new CustomEvent('open-add-category-modal'))}
            >
              <Tags size={16} /> Tạo danh mục
            </button>
          )}
        </div>
      </header>

      {/* 2. Hub Navigation Segmented Tabs (Below Page Title) */}
      <div className="planning-hub-nav-wrapper animate-fade-in">
        <div className="category-tabs" role="tablist" aria-label="Phân mục Kế hoạch">
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'targets'}
            className={`category-tab flex items-center gap-1.5 ${activeSubTab === 'targets' ? 'active' : ''}`}
            onClick={() => handleTabChange('targets')}
          >
            <Target size={14} />
            <span>Mục tiêu & Ngân sách</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'categories'}
            className={`category-tab flex items-center gap-1.5 ${activeSubTab === 'categories' ? 'active' : ''}`}
            onClick={() => handleTabChange('categories')}
          >
            <Tags size={14} />
            <span>Danh mục thu chi</span>
          </button>
        </div>
      </div>

      {/* 3. Sub-view Content Area */}
      <div className="planning-hub-content animate-fade-in" key={activeSubTab}>
        {activeSubTab === 'targets' ? <Targets /> : <Categories />}
      </div>
    </div>
  );
}
