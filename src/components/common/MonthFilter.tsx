import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
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
          <span className="month-picker-display" aria-hidden="true">
            <CalendarDays size={18} />
            {moment(value, 'YYYY-MM', true).format('MM/YYYY')}
          </span>
          <input
            type="month"
            min="0001-01"
            max="9999-12"
            aria-label="Tháng hiển thị"
            value={value}
            onChange={(event) => {
              if (moment(event.target.value, 'YYYY-MM', true).isValid())
                onChange(event.target.value);
            }}
            className="month-datepicker-input"
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
