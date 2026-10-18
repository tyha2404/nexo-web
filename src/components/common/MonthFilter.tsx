import { ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import { DatePickerField } from './DatePickerField';
import { CONTROL_FRAME, cx } from '../ui';

export interface MonthFilterProps {
  /** Month in 'YYYY-MM' format (e.g. '2026-09') */
  value: string;
  onChange: (monthStr: string) => void;
}

const NAV_ARROW =
  'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border-none bg-transparent text-muted hover:bg-hover hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default function MonthFilter({ value, onChange }: MonthFilterProps) {
  const handlePrevMonth = () => {
    const prev = moment(value, 'YYYY-MM').subtract(1, 'month').format('YYYY-MM');
    onChange(prev);
  };

  const handleNextMonth = () => {
    const next = moment(value, 'YYYY-MM').add(1, 'month').format('YYYY-MM');
    onChange(next);
  };

  return (
    <div className="flex w-full min-w-0 items-center">
      <div
        className={cx(
          CONTROL_FRAME,
          'month-filter-control inline-flex w-full min-w-0 items-center justify-between gap-0 px-px'
        )}
      >
        <button
          type="button"
          className={NAV_ARROW}
          onClick={handlePrevMonth}
          title="Tháng trước"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="relative flex h-10 min-w-0 flex-1 items-center justify-center gap-1">
          <DatePickerField
            label="Tháng hiển thị"
            value={value}
            mode="month"
            onChange={onChange}
            required
            compact
          />
        </div>

        <button
          type="button"
          className={NAV_ARROW}
          onClick={handleNextMonth}
          title="Tháng kế tiếp"
          aria-label="Tháng kế tiếp"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
