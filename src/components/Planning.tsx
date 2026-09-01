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
      {/* Hub Navigation Segmented Pills */}
      <div className="planning-hub-nav-wrapper animate-fade-in">
        <div
          className="planning-hub-tabs"
          role="tablist"
          aria-label="Planning and Management Sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'targets'}
            className={`planning-hub-tab ${activeSubTab === 'targets' ? 'active' : ''}`}
            onClick={() => handleTabChange('targets')}
          >
            <div className="tab-icon-wrapper">
              <Target size={18} className="tab-icon" />
            </div>
            <div className="tab-text-group">
              <span className="tab-primary-label">Mục tiêu & Ngân sách</span>
              <span className="tab-secondary-label">Hạn mức chi & đầu tư</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'categories'}
            className={`planning-hub-tab ${activeSubTab === 'categories' ? 'active' : ''}`}
            onClick={() => handleTabChange('categories')}
          >
            <div className="tab-icon-wrapper">
              <Tags size={18} className="tab-icon" />
            </div>
            <div className="tab-text-group">
              <span className="tab-primary-label">Danh mục thu chi</span>
              <span className="tab-secondary-label">Phân loại & định mức</span>
            </div>
          </button>
        </div>
      </div>

      {/* Sub-view Content Area */}
      <div className="planning-hub-content animate-fade-in" key={activeSubTab}>
        {activeSubTab === 'targets' ? <Targets /> : <Categories />}
      </div>
    </div>
  );
}
