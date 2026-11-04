import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import { DATE_FORMAT_INPUT, MOBILE_MEDIA_QUERY, TransactionType } from '../../commons/constants';
import type { DailyReport } from '../../commons/types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getErrorMessage,
} from '../../commons/utils';
import { reportService } from '../../services';
import {
  BLOCK_GAP,
  CARD_PAD,
  CARD_SURFACE,
  ChevronDown,
  CHIP_BTN,
  cx,
  MONEY,
  SPINNER_MICRO,
  X,
} from '../ui';

const OPEN_STORAGE_KEY = 'nexo-tx-calendar';
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Remembered choice, else open on desktop and collapsed on phones (the list stays in view). */
function readOpen(): boolean {
  try {
    const saved = localStorage.getItem(OPEN_STORAGE_KEY);
    if (saved) return saved === 'open';
  } catch {
    // Storage unavailable: fall back to the default below.
  }
  return !window.matchMedia?.(MOBILE_MEDIA_QUERY).matches;
}

function saveOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, open ? 'open' : 'closed');
  } catch {
    // Storage unavailable (private mode): the toggle just isn't remembered.
  }
}

export interface SpendingCalendarProps {
  /** Month in 'YYYY-MM' format (the page's month filter). */
  month: string;
  /** Which daily total to show: expense or income. */
  type: TransactionType.EXPENSE | TransactionType.INCOME;
  /** Bump to refetch (the page's refresh key). */
  refreshKey: number;
  /** Selected day 'YYYY-MM-DD', or null for the whole month. */
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}

/**
 * Month calendar of daily totals for the Transactions page. Each day is shaded by its share
 * of the month's busiest day; tapping a day filters the list below to that day.
 * Totals cover every category (the category/search filters only apply to the list).
 */
export function SpendingCalendar({
  month,
  type,
  refreshKey,
  selectedDay,
  onSelectDay,
}: SpendingCalendarProps) {
  const [open, setOpen] = useState(readOpen);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    reportService
      .daily(month, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setReport(res);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(getErrorMessage(err, 'Không tải được lịch'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, open, refreshKey]);

  const isIncome = type === TransactionType.INCOME;
  const tone = isIncome ? 'var(--income)' : 'var(--expense)';
  const valueOf = (item: { income: number; expense: number }) =>
    isIncome ? item.income : item.expense;

  const { cells, max, total } = useMemo(() => {
    const start = moment(month, 'YYYY-MM').startOf('month');
    const items = report?.month === month ? report.items : [];
    const values = items.map(valueOf);
    // Leading blanks so the 1st lands under its weekday (weeks start on Monday).
    const blanks: null[] = Array(start.isoWeekday() - 1).fill(null);
    return {
      cells: [...blanks, ...items],
      max: Math.max(0, ...values),
      total: values.reduce((sum, v) => sum + v, 0),
    };
    // valueOf only depends on isIncome
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, month, isIncome]);

  const today = moment().format(DATE_FORMAT_INPUT);

  const pickDay = (day: string | null) => {
    onSelectDay(day);
    // On a phone the open calendar fills the screen: fold it (without remembering that) so
    // the filtered list shows right under it. The "Ngày dd/mm ×" chip stays in the header.
    if (day && window.matchMedia?.(MOBILE_MEDIA_QUERY).matches) setOpen(false);
  };

  const toggle = () => {
    setOpen((prev) => {
      saveOpen(!prev);
      return !prev;
    });
  };

  return (
    <section
      className={cx(CARD_SURFACE, CARD_PAD, BLOCK_GAP, 'animate-fade-in')}
      aria-label={isIncome ? 'Lịch thu nhập theo ngày' : 'Lịch chi tiêu theo ngày'}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 self-stretch border-none bg-transparent p-0 text-left text-[0.9rem] font-bold text-main mobile:-my-2.5 mobile:min-h-11 mobile:py-2.5"
          aria-expanded={open}
          onClick={toggle}
        >
          <ChevronDown
            size={16}
            className={cx('shrink-0 transition-transform duration-150', !open && '-rotate-90')}
          />
          <span className="truncate">Lịch theo ngày</span>
        </button>
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
          open &&
          report && (
            <span className={cx(MONEY, 'shrink-0 text-[12px] text-muted')}>
              Tổng {formatCurrency(total)}
            </span>
          )
        )}
      </div>

      {open && (
        <div className="mt-2.5">
          {error ? (
            <p className="m-0 py-3 text-center text-[13px] text-expense">{error}</p>
          ) : !report && loading ? (
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
              {cells.map((item, i) => {
                if (!item) return <div key={`blank-${i}`} />;
                const value = valueOf(item);
                const selected = item.date === selectedDay;
                const isToday = item.date === today;
                // 10%..45% of the type colour, by share of the month's busiest day.
                const shade = value > 0 && max > 0 ? Math.round(10 + (value / max) * 35) : 0;
                const label = `${formatDate(item.date)}: ${
                  value > 0 ? formatCurrency(value) : isIncome ? 'không có thu' : 'không chi'
                }`;
                return (
                  <button
                    key={item.date}
                    type="button"
                    role="gridcell"
                    aria-label={label}
                    aria-selected={selected}
                    title={label}
                    disabled={value === 0 && !selected}
                    onClick={() => pickDay(selected ? null : item.date)}
                    className={cx(
                      'flex min-h-[3.1rem] min-w-0 flex-col justify-between rounded-sm border px-1 py-1 text-left mobile:min-h-[2.75rem] mobile:px-0.5',
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
                      {moment(item.date, DATE_FORMAT_INPUT).date()}
                    </span>
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
      )}
    </section>
  );
}
