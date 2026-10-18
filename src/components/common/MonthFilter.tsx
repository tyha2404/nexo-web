import { ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import { DatePickerField } from './DatePickerField';
import './MonthFilter.css';

export interface MonthFilterProps {
  /** Month in 'YYYY-MM' format (e.g. '2026-09') */
  value: string;
  onChange: (monthStr: string) => void;
}

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
    <div className="month-filter-container">
      <div className="month-picker-pill">
        <button
          type="button"
          className="month-nav-arrow"
          onClick={handlePrevMonth}
          title="Tháng trước"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="month-picker-label-wrap">
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
          className="month-nav-arrow"
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
