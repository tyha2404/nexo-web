import { TransactionType } from '../../commons/constants';
import { SlidingTabs, tabClass, TABS } from '../ui';
import { TRANSACTION_TYPE_TABS } from './constants';
import { TransactionTypeIcon } from './TransactionTypeIcon';

export interface TypeTabsProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  /** Accessible name of the tablist. */
  ariaLabel: string;
  /** Classes of the tablist (TABS by default). */
  className?: string;
  /** Classes of one tab (pill tabClass by default). */
  tabClassName?: (active: boolean) => string;
}

/** Chi tiêu / Thu nhập / Đầu tư pill tabs (ui/layoutStyles block 3: type tabs). */
export function TypeTabs({
  value,
  onChange,
  ariaLabel,
  className = TABS,
  tabClassName = (active) => tabClass(active),
}: TypeTabsProps) {
  return (
    <SlidingTabs className={className} role="tablist" aria-label={ariaLabel}>
      {TRANSACTION_TYPE_TABS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          role="tab"
          aria-selected={value === type}
          className={tabClassName(value === type)}
          onClick={() => onChange(type)}
        >
          <TransactionTypeIcon type={type} size={16} />
          <span>{label}</span>
        </button>
      ))}
    </SlidingTabs>
  );
}
