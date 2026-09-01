import { ChevronLeft, ChevronRight } from 'lucide-react';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import './MonthFilter.css';

export interface MonthFilterProps {
  /** Month in 'YYYY-MM' format (e.g. '2026-09') */
  value: string;
  onChange: (monthStr: string) => void;
  showQuickButtons?: boolean;
}

export default function MonthFilter({
  value,
  onChange,
  showQuickButtons = true,
}: MonthFilterProps) {
  const currentMonthStr = moment().format('YYYY-MM');
  const lastMonthStr = moment().subtract(1, 'month').format('YYYY-MM');

  const isCurrentMonthActive = value === currentMonthStr;
  const isLastMonthActive = value === lastMonthStr;

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
      {showQuickButtons && (
        <div className="quick-period-buttons" role="group" aria-label="Chọn kỳ nhanh">
          <button
            type="button"
            className={`period-pill-btn ${isCurrentMonthActive ? 'active' : ''}`}
            onClick={() => onChange(currentMonthStr)}
          >
            Tháng này
          </button>
          <button
            type="button"
            className={`period-pill-btn ${isLastMonthActive ? 'active' : ''}`}
            onClick={() => onChange(lastMonthStr)}
          >
            Tháng trước
          </button>
        </div>
      )}

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
          <DatePicker
            id="shared-month-picker"
            selected={value ? moment(value, 'YYYY-MM').toDate() : new Date()}
            onChange={(date: Date | null) => {
              if (date) {
                onChange(moment(date).format('YYYY-MM'));
              }
            }}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            portalId="date-picker-portal"
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
