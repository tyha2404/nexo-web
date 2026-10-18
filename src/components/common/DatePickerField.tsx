import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import moment from 'moment';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { DATE_FORMAT_DISPLAY, DATE_FORMAT_INPUT } from '../../commons/constants';
import { useModal } from '../../hooks';
import './DatePickerField.css';

type PickerMode = 'date' | 'month';

interface DatePickerFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode?: PickerMode;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

interface PickerPanelProps extends DatePickerFieldProps {
  onClose: () => void;
}

function PickerPanel({
  value,
  onChange,
  mode = 'date',
  required,
  label,
  onClose,
}: PickerPanelProps) {
  const ref = useModal(true, onClose);
  const titleId = useId();
  const inputFormat = mode === 'month' ? 'YYYY-MM' : DATE_FORMAT_INPUT;
  const parsed = moment(value, inputFormat, true);
  const selected = parsed.isValid() ? parsed.toDate() : null;
  const select = (date: Date | null) => {
    onChange(date ? moment(date).format(inputFormat) : '');
    onClose();
  };

  return createPortal(
    <div className="date-picker-overlay" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="date-picker-panel"
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="date-picker-panel-header">
          <h3 id={titleId} className="m-0 text-base font-semibold text-main">
            {label}
          </h3>
          <button
            type="button"
            className="date-picker-icon-button"
            aria-label="Đóng lịch"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="date-picker-calendar-body">
          <DatePicker
            inline
            selected={selected}
            onChange={select}
            onSelect={onClose}
            showMonthYearPicker={mode === 'month'}
            dateFormat={mode === 'month' ? 'MM/yyyy' : 'dd/MM/yyyy'}
            locale="vi"
            renderMonthContent={(month) => `Tháng ${String(month + 1).padStart(2, '0')}`}
            calendarStartDay={1}
            calendarClassName="nexo-calendar"
            formatWeekDay={(name) =>
              ({
                'thứ hai': 'T2',
                'thứ ba': 'T3',
                'thứ tư': 'T4',
                'thứ năm': 'T5',
                'thứ sáu': 'T6',
                'thứ bảy': 'T7',
                'chủ nhật': 'CN',
              })[name.toLowerCase()] || name.slice(0, 2)
            }
            renderCustomHeader={({
              date,
              changeMonth,
              changeYear,
              decreaseMonth,
              increaseMonth,
              decreaseYear,
              increaseYear,
            }) => {
              const shown = moment(date);
              const year = shown.year();
              const firstYear = Math.min(1900, year - 50);
              const lastYear = Math.max(moment().year() + 50, year + 50);
              return (
                <div className="date-picker-calendar-header">
                  <button
                    type="button"
                    className="date-picker-icon-button"
                    aria-label={mode === 'month' ? 'Năm trước' : 'Tháng trước'}
                    onClick={mode === 'month' ? decreaseYear : decreaseMonth}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {mode === 'date' && (
                    <select
                      aria-label="Chọn tháng"
                      value={shown.month()}
                      onChange={(event) => changeMonth(Number(event.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, month) => (
                        <option
                          key={month}
                          value={month}
                        >{`Tháng ${String(month + 1).padStart(2, '0')}`}</option>
                      ))}
                    </select>
                  )}
                  <select
                    aria-label="Chọn năm"
                    value={year}
                    onChange={(event) => changeYear(Number(event.target.value))}
                  >
                    {Array.from(
                      { length: lastYear - firstYear + 1 },
                      (_, index) => firstYear + index
                    ).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="date-picker-icon-button"
                    aria-label={mode === 'month' ? 'Năm kế tiếp' : 'Tháng kế tiếp'}
                    onClick={mode === 'month' ? increaseYear : increaseMonth}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              );
            }}
          />
        </div>
        <div className="date-picker-panel-footer">
          <button
            type="button"
            className="date-picker-text-button"
            onClick={() => select(moment().toDate())}
          >
            {mode === 'month' ? 'Tháng này' : 'Hôm nay'}
          </button>
          {!required && (
            <button
              type="button"
              className="date-picker-text-button text-muted"
              onClick={() => select(null)}
            >
              Xóa ngày
            </button>
          )}
          <button type="button" className="date-picker-text-button" onClick={onClose}>
            Xong
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function DatePickerField(props: DatePickerFieldProps) {
  const { id, label, value, mode = 'date', disabled, compact } = props;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const date = moment(value, mode === 'month' ? 'YYYY-MM' : DATE_FORMAT_INPUT, true);
  const text = date.isValid()
    ? date.format(mode === 'month' ? 'MM/YYYY' : DATE_FORMAT_DISPLAY)
    : mode === 'month'
      ? 'MM/YYYY'
      : 'DD/MM/YYYY';

  return (
    <div className={`date-picker-field ${compact ? 'date-picker-field-compact' : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="date-picker-trigger"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <span className={date.isValid() ? '' : 'text-muted'}>{text}</span>
        <CalendarDays size={18} aria-hidden="true" />
      </button>
      {open && <PickerPanel {...props} onClose={close} />}
    </div>
  );
}
