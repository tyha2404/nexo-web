import moment from 'moment';
import { Calendar, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import './DateRangeFilter.css';

export type DateRange = [Date | null, Date | null];

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholderText?: string;
}

interface Preset {
  key: string;
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  {
    key: 'today',
    label: 'Hôm nay',
    range: () => [moment().startOf('day').toDate(), moment().endOf('day').toDate()],
  },
  {
    key: 'week',
    label: 'Tuần này',
    range: () => [moment().startOf('week').toDate(), moment().endOf('week').toDate()],
  },
  {
    key: 'month',
    label: 'Tháng này',
    range: () => [moment().startOf('month').toDate(), moment().endOf('month').toDate()],
  },
  {
    key: 'lastMonth',
    label: 'Tháng trước',
    range: () => [
      moment().subtract(1, 'month').startOf('month').toDate(),
      moment().subtract(1, 'month').endOf('month').toDate(),
    ],
  },
  {
    key: 'last30',
    label: '30 ngày',
    range: () => [
      moment().subtract(29, 'days').startOf('day').toDate(),
      moment().endOf('day').toDate(),
    ],
  },
];

export default function DateRangeFilter({
  value,
  onChange,
  placeholderText = 'Chọn khoảng ngày',
}: DateRangeFilterProps) {
  const [startDate, endDate] = value;

  const isActive = (preset: Preset): boolean => {
    const [s, e] = preset.range();
    return (
      !!startDate &&
      !!endDate &&
      moment(startDate).isSame(s, 'day') &&
      moment(endDate).isSame(e, 'day')
    );
  };

  const clearRange = () => onChange([null, null]);

  return (
    <div className="date-range-filter">
      <div className="date-range-wrapper">
        <Calendar size={16} className="date-range-icon" />
        <DatePicker
          selectsRange={true}
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => onChange(update)}
          isClearable={false}
          placeholderText={placeholderText}
          dateFormat="dd/MM/yyyy"
          className="react-datepicker-input"
          portalId="date-picker-portal"
          shouldCloseOnSelect={false}
        />
        {startDate && (
          <button
            type="button"
            className="date-range-clear"
            onClick={clearRange}
            aria-label="Xóa lọc ngày"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="presets-container" role="group" aria-label="Lọc ngày nhanh">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`preset-tag-btn ${isActive(preset) ? 'active' : ''}`}
            onClick={() => onChange(preset.range())}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
