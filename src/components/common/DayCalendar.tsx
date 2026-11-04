import moment from 'moment';
import { useMemo, type ReactNode } from 'react';
import { DATE_FORMAT_INPUT } from '../../commons/constants';
import { formatCompactCurrency, formatCurrency, formatDate } from '../../commons/utils';
import { BLOCK_GAP, CARD_PAD, CARD_SURFACE, CHIP_BTN, cx, MONEY, SPINNER_MICRO, X } from '../ui';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export interface DayCalendarProps {
  /** Month in 'YYYY-MM' format. */
  month: string;
  /** Amount per day ('YYYY-MM-DD' → amount); missing days are 0. */
  values: Record<string, number>;
  /** Days to flag with a dot (e.g. a debt falls due), with a short reason for screen readers. */
  markers?: Record<string, string>;
  /** Spoken/tooltip breakdown of a day's amount, replacing the plain total (e.g. 'Vay 1 tr · Trả 200k'). */
  details?: Record<string, string>;
  /** Header text on the right when no day is selected; defaults to "Tổng <sum>". */
  summary?: ReactNode;
  /** CSS colour the days are shaded with, e.g. 'var(--expense)'. */
  tone: string;
  /** Accessible name of the calendar region. */
  label: string;
  /** Spoken for a day without amount, e.g. 'không chi'. */
  emptyText: string;
  /** Selected day 'YYYY-MM-DD', or null for the whole month. */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  loading?: boolean;
  error?: string | null;
  title?: string;
}

/**
 * Month grid of daily amounts, always visible (no collapse). Each day is shaded by its share
 * of the month's biggest day; tapping a day selects it (tap again or the chip to clear).
 * Days with neither an amount nor a marker can't be picked.
 */
export function DayCalendar({
  month,
  values,
  markers = {},
  details = {},
  summary,
  tone,
  label,
  emptyText,
  selectedDay,
  onSelectDay,
  loading = false,
  error = null,
  title = 'Lịch theo ngày',
}: DayCalendarProps) {
  const { cells, max, total } = useMemo(() => {
    const start = moment(month, 'YYYY-MM').startOf('month');
    const days = Array.from({ length: start.daysInMonth() }, (_, i) =>
      start
        .clone()
        .date(i + 1)
        .format(DATE_FORMAT_INPUT)
    );
    const amounts = days.map((d) => values[d] ?? 0);
    // Leading blanks so the 1st lands under its weekday (weeks start on Monday).
    const blanks: null[] = Array(start.isoWeekday() - 1).fill(null);
    return {
      cells: [...blanks, ...days],
      max: Math.max(0, ...amounts),
      total: amounts.reduce((sum, v) => sum + v, 0),
    };
  }, [month, values]);

  const today = moment().format(DATE_FORMAT_INPUT);

  return (
    <section
      className={cx(CARD_SURFACE, CARD_PAD, BLOCK_GAP, 'animate-fade-in')}
      aria-label={label}
    >
      <div className="flex min-h-7 items-center justify-between gap-2 mobile:min-h-8">
        <h3 className="m-0 min-w-0 truncate text-[0.9rem] font-bold text-main">{title}</h3>
        {selectedDay ? (
          <button
            type="button"
            className={cx(CHIP_BTN, 'border border-primary bg-transparent text-main')}
            onClick={() => onSelectDay(null)}
            aria-label="Bỏ lọc theo ngày"
          >
            Ngày {formatDate(selectedDay, 'DD/MM')}
            <X size={12} />
          </button>
        ) : (
          !loading &&
          !error && (
            <span className={cx(MONEY, 'shrink-0 text-[12px] text-muted')}>
              {summary ?? `Tổng ${formatCurrency(total)}`}
            </span>
          )
        )}
      </div>

      <div className="mt-2.5">
        {error ? (
          <p className="m-0 py-3 text-center text-[13px] text-expense">{error}</p>
        ) : loading ? (
          <div className="flex justify-center py-6">
            <div className={cx(SPINNER_MICRO, 'size-5')} />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1" role="grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-0.5 text-center text-[11px] font-semibold text-muted">
                {d}
              </div>
            ))}
            {cells.map((date, i) => {
              if (!date) return <div key={`blank-${i}`} />;
              const value = values[date] ?? 0;
              const marker = markers[date];
              const selected = date === selectedDay;
              const isToday = date === today;
              // 10%..45% of the tone, by share of the month's biggest day.
              const shade = value > 0 && max > 0 ? Math.round(10 + (value / max) * 35) : 0;
              const dayLabel = [
                `${formatDate(date)}: ${details[date] ?? (value > 0 ? formatCurrency(value) : emptyText)}`,
                marker,
              ]
                .filter(Boolean)
                .join(', ');
              return (
                <button
                  key={date}
                  type="button"
                  role="gridcell"
                  aria-label={dayLabel}
                  aria-selected={selected}
                  title={dayLabel}
                  disabled={value === 0 && !marker && !selected}
                  onClick={() => onSelectDay(selected ? null : date)}
                  className={cx(
                    'relative flex min-h-[3.1rem] min-w-0 flex-col justify-between rounded-sm border px-1 py-1 text-left mobile:min-h-[2.75rem] mobile:px-0.5',
                    'cursor-pointer transition-[border-color,background-color] duration-100 enabled:[&:hover]:border-line-hover disabled:cursor-default',
                    selected
                      ? 'border-primary!'
                      : isToday
                        ? 'border-line-hover'
                        : 'border-transparent',
                    shade === 0 && 'bg-input light:bg-hover'
                  )}
                  style={
                    shade > 0
                      ? { backgroundColor: `color-mix(in srgb, ${tone} ${shade}%, transparent)` }
                      : undefined
                  }
                >
                  <span
                    className={cx(
                      'text-[11px] leading-none',
                      isToday ? 'font-bold text-main' : 'text-muted'
                    )}
                  >
                    {moment(date, DATE_FORMAT_INPUT).date()}
                  </span>
                  {marker && (
                    <span
                      className="absolute top-1 right-1 size-1.5 rounded-full bg-warning"
                      aria-hidden="true"
                    />
                  )}
                  {value > 0 && (
                    <span
                      className={cx(
                        MONEY,
                        'truncate text-[11px] leading-tight text-main mobile:text-[10px]'
                      )}
                    >
                      {formatCompactCurrency(value)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
