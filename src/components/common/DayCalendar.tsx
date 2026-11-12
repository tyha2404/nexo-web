import moment from 'moment';
import { useMemo, type ReactNode } from 'react';
import { DATE_FORMAT_INPUT, DATE_FORMAT_MONTH } from '../../commons/constants';
import { formatCompactCurrency, formatCurrency, formatDate } from '../../commons/utils';
import {
  AlertCircle,
  BLOCK_GAP,
  CARD_PAD,
  CARD_SURFACE,
  Check,
  CHIP_BTN,
  Clock,
  cx,
  type IconComponent,
  MONEY,
  PANEL_TITLE,
  SPINNER_MICRO,
  SUB_TILE,
  X,
} from '../ui';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
/** Full weekday names by ISO weekday (1 = Monday), for the selected-day panel. */
const WEEKDAY_NAMES = [
  '',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
  'Chủ Nhật',
];

/** Meaning of a day's status icon: done (green), still open (amber), late (red). */
export type DayMarkerTone = 'success' | 'warning' | 'danger';

export interface DayMarker {
  tone: DayMarkerTone;
  /** Short reason for screen readers and the day panel, e.g. 'Đã trả 200.000 ₫: Anh A'. */
  text: string;
}

/** Most urgent first: that is the order the icons are drawn in and the legend lists them. */
const MARKER_TONES: DayMarkerTone[] = ['danger', 'warning', 'success'];

/** Shape and colour both carry the status, so it still reads without colour. */
const MARKER_ICON: Record<DayMarkerTone, { Icon: IconComponent; color: string }> = {
  success: { Icon: Check, color: 'text-income' },
  warning: { Icon: Clock, color: 'text-warning' },
  danger: { Icon: AlertCircle, color: 'text-expense' },
};

function MarkerIcon({ tone, size = 12 }: { tone: DayMarkerTone; size?: number }) {
  const { Icon, color } = MARKER_ICON[tone];
  return <Icon size={size} className={cx('shrink-0', color)} aria-hidden="true" />;
}

export interface DayCalendarProps {
  /** Month in 'YYYY-MM' format. */
  month: string;
  /** Amount per day ('YYYY-MM-DD' → amount); missing days are 0. */
  values: Record<string, number>;
  /** Days to flag with status icons (one per distinct tone), e.g. a debt repaid or falling due. */
  markers?: Record<string, DayMarker[]>;
  /** Legend for the status tones that appear this month, e.g. { success: 'Đã trả' }. */
  markerLegend?: Partial<Record<DayMarkerTone, string>>;
  /** Breakdown of a day's amount, replacing the plain total (e.g. 'Vay 1 tr · Trả 200k'). */
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
 * Month grid of daily amounts, always visible (no collapse). Days without activity stay
 * unfilled so the active ones stand out; those are shaded by their share of the month's
 * biggest day. Status icons (check / clock / alert) flag days that need attention. Tapping a
 * day selects it and opens its breakdown under the grid (phones have no hover tooltip); tap
 * again or the chip to clear. Days with neither an amount nor a marker can't be picked.
 */
export function DayCalendar({
  month,
  values,
  markers = {},
  markerLegend,
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
    const start = moment(month, DATE_FORMAT_MONTH).startOf('month');
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

  const legend = useMemo(() => {
    if (!markerLegend) return [];
    const present = new Set(
      Object.entries(markers)
        .filter(([day]) => day.startsWith(month))
        .flatMap(([, list]) => list.map((m) => m.tone))
    );
    return MARKER_TONES.filter((t) => present.has(t) && markerLegend[t]);
  }, [markers, markerLegend, month]);

  const dayAmountText = (date: string) => {
    const value = values[date] ?? 0;
    return details[date] ?? (value > 0 ? formatCurrency(value) : emptyText);
  };

  const selected = selectedDay?.startsWith(month) ? selectedDay : null;
  const selectedMarkers = selected
    ? [...(markers[selected] ?? [])].sort(
        (a, b) => MARKER_TONES.indexOf(a.tone) - MARKER_TONES.indexOf(b.tone)
      )
    : [];

  return (
    <section
      className={cx(CARD_SURFACE, CARD_PAD, BLOCK_GAP, 'animate-fade-in')}
      aria-label={label}
    >
      <div className="flex min-h-7 items-center justify-between gap-2 mobile:min-h-8">
        <h3 className={PANEL_TITLE}>{title}</h3>
        {selectedDay ? (
          <button
            type="button"
            className={CHIP_BTN}
            onClick={() => onSelectDay(null)}
            aria-label="Bỏ lọc theo ngày"
          >
            Ngày {formatDate(selectedDay, 'DD/MM')}
            <X size={12} />
          </button>
        ) : (
          !loading &&
          !error && (
            <span className={cx(MONEY, 'shrink-0 text-[12px] text-muted mobile:text-[13px]')}>
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
          <>
            <div className="grid grid-cols-7 gap-1" role="grid">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cx(
                    'pb-1 text-center text-[11px] font-bold tracking-[0.04em] uppercase',
                    // Weekend columns a step brighter, so the weeks are easy to follow.
                    i >= 5 ? 'text-main' : 'text-muted'
                  )}
                >
                  {d}
                </div>
              ))}
              {cells.map((date, i) => {
                if (!date) return <div key={`blank-${i}`} />;
                const value = values[date] ?? 0;
                const dayMarkers = markers[date] ?? [];
                const tones = MARKER_TONES.filter((t) => dayMarkers.some((m) => m.tone === t));
                const active = value > 0 || dayMarkers.length > 0;
                const isSelected = date === selectedDay;
                const isToday = date === today;
                // 12%..48% of the tone, by share of the month's biggest day.
                const shade = value > 0 && max > 0 ? Math.round(12 + (value / max) * 36) : 0;
                const dayLabel = [
                  `${formatDate(date)}: ${dayAmountText(date)}`,
                  ...dayMarkers.map((m) => m.text),
                ].join(', ');
                return (
                  <button
                    key={date}
                    type="button"
                    role="gridcell"
                    aria-label={dayLabel}
                    aria-selected={isSelected}
                    title={dayLabel}
                    disabled={!active && !isSelected}
                    onClick={() => onSelectDay(isSelected ? null : date)}
                    className={cx(
                      // VS Code list conventions: 3px radius, flat fill, 1px focusBorder ring for
                      // the selection and keyboard focus, a quiet ring on hover (the fill is data).
                      'relative flex min-h-[3.25rem] min-w-0 flex-col justify-between rounded-xs border-none px-1.5 py-1 text-left mobile:min-h-[2.9rem] mobile:px-1',
                      'cursor-pointer transition-[background-color,outline-color] duration-100 ease-out disabled:cursor-default',
                      'focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary',
                      isSelected
                        ? 'outline-2 -outline-offset-2 outline-primary'
                        : 'enabled:[&:hover]:outline-1 enabled:[&:hover]:-outline-offset-1 enabled:[&:hover]:outline-line-hover',
                      // Quiet days have no fill; a day with only a status gets the neutral fill.
                      shade === 0 &&
                        (isSelected
                          ? 'bg-list-active'
                          : active
                            ? 'bg-hover light:bg-list-hover'
                            : 'bg-transparent')
                    )}
                    style={
                      shade > 0
                        ? { backgroundColor: `color-mix(in srgb, ${tone} ${shade}%, transparent)` }
                        : undefined
                    }
                  >
                    <span className="flex items-start justify-between gap-0.5">
                      <span
                        className={cx(
                          'text-[12px] leading-[15px] tabular-nums',
                          // Today: a small filled badge, like VS Code's count badges.
                          isToday
                            ? 'rounded-xs bg-primary px-[3px] font-bold text-white'
                            : active
                              ? 'text-main'
                              : 'text-muted opacity-70'
                        )}
                      >
                        {moment(date, DATE_FORMAT_INPUT).date()}
                      </span>
                      {tones.length > 0 && (
                        <span className="flex gap-px pt-px">
                          {tones.map((t) => (
                            <MarkerIcon key={t} tone={t} />
                          ))}
                        </span>
                      )}
                    </span>
                    {value > 0 && (
                      <span
                        className={cx(
                          MONEY,
                          'truncate text-[11px] leading-tight text-main mobile:text-[11px]'
                        )}
                      >
                        {formatCompactCurrency(value)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selected ? (
              // Breakdown of the picked day: phones can't show the cells' tooltips.
              <div className={cx(SUB_TILE, 'mt-2.5 animate-fade-in')} aria-live="polite">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-main">
                    {WEEKDAY_NAMES[moment(selected, DATE_FORMAT_INPUT).isoWeekday()]},{' '}
                    {formatDate(selected)}
                  </span>
                  {(values[selected] ?? 0) > 0 && !details[selected] && (
                    <span className={cx(MONEY, 'shrink-0 text-[13px] text-main')}>
                      {formatCurrency(values[selected] ?? 0)}
                    </span>
                  )}
                </div>
                {details[selected] && (
                  <p className="m-0 mt-1 text-[13px] text-main">{details[selected]}</p>
                )}
                {!details[selected] && !(values[selected] ?? 0) && selectedMarkers.length === 0 && (
                  <p className="m-0 mt-1 text-[13px] text-muted">{emptyText}</p>
                )}
                {selectedMarkers.length > 0 && (
                  <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
                    {selectedMarkers.map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[13px] text-main">
                        <span className="pt-[3px]">
                          <MarkerIcon tone={m.tone} />
                        </span>
                        <span className="min-w-0">{m.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              legend.length > 0 && (
                <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-[12px] text-muted mobile:text-[13px]">
                  {legend.map((t) => (
                    <li key={t} className="flex items-center gap-1">
                      <MarkerIcon tone={t} />
                      {markerLegend?.[t]}
                    </li>
                  ))}
                </ul>
              )
            )}
          </>
        )}
      </div>
    </section>
  );
}
