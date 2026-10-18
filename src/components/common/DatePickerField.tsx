import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import moment from 'moment';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DatePicker from 'react-datepicker';
import { DATE_FORMAT_DISPLAY, DATE_FORMAT_INPUT } from '../../commons/constants';
import { useModal } from '../../hooks';

type PickerMode = 'date' | 'month';

// `font: inherit` split into longhands so the font-size utility always wins.
const INHERIT_FONT = 'font-[inherit] [font-style:inherit] leading-[inherit]';
const TRIGGER = `box-border flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-sm text-main ${INHERIT_FONT} text-[16px] tabular-nums transition-[border-color,background-color] duration-[160ms] ease-[ease] hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:shrink-0 [&_svg]:text-muted`;
const TRIGGER_DEFAULT =
  'justify-between border border-line bg-input px-3.5 py-2.5 [font-weight:inherit]';
const TRIGGER_COMPACT =
  'flex-row-reverse justify-center border-none bg-transparent px-2 py-0 font-semibold';
// Marker classes kept for tests/selectors.
const PRESS = 'motion-safe:enabled:active:[transform:scale(0.97)]';
const ICON_BUTTON = `date-picker-icon-button inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-muted hover:bg-hover hover:text-primary ${PRESS}`;
const TEXT_BUTTON = `date-picker-text-button min-h-11 cursor-pointer rounded-md border-0 bg-transparent p-2 text-primary ${INHERIT_FONT} text-[14px] font-semibold hover:bg-primary-glow ${PRESS}`;
const SELECT = `min-h-11 min-w-0 flex-1 rounded-sm border-0 bg-input p-1 text-main ${INHERIT_FONT} [font-weight:inherit] text-[16px]`;

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
    <div
      className="fixed inset-0 z-[1000001] box-border flex items-center justify-center bg-[rgb(0_0_0/55%)] p-[max(12px,env(safe-area-inset-top))_max(12px,env(safe-area-inset-right))_max(12px,env(safe-area-inset-bottom))_max(12px,env(safe-area-inset-left))] backdrop-blur-[6px] animate-[date-picker-backdrop-in_160ms_ease-out] motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="date-picker-panel w-[360px] max-w-full max-h-[calc(var(--modal-viewport-height,100dvh)-max(12px,env(safe-area-inset-top))-max(12px,env(safe-area-inset-bottom)))] overflow-x-hidden overflow-y-auto rounded-xl border border-line bg-card text-main shadow-app-lg outline-none animate-[date-picker-panel-in_200ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none"
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <h3 id={titleId} className="m-0 text-base font-semibold text-main">
            {label}
          </h3>
          <button type="button" className={ICON_BUTTON} aria-label="Đóng lịch" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="px-2.5 pt-0 pb-3">
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
                <div className="flex items-center gap-1 pb-2">
                  <button
                    type="button"
                    className={ICON_BUTTON}
                    aria-label={mode === 'month' ? 'Năm trước' : 'Tháng trước'}
                    onClick={mode === 'month' ? decreaseYear : decreaseMonth}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {mode === 'date' && (
                    <select
                      aria-label="Chọn tháng"
                      className={SELECT}
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
                    className={SELECT}
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
                    className={ICON_BUTTON}
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
        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
          <button type="button" className={TEXT_BUTTON} onClick={() => select(moment().toDate())}>
            {mode === 'month' ? 'Tháng này' : 'Hôm nay'}
          </button>
          {!required && (
            <button type="button" className={TEXT_BUTTON} onClick={() => select(null)}>
              Xóa ngày
            </button>
          )}
          <button type="button" className={TEXT_BUTTON} onClick={onClose}>
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
    <div className="w-full min-w-0">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`${TRIGGER} ${compact ? TRIGGER_COMPACT : TRIGGER_DEFAULT}`}
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
