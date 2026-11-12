import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { NetWorthPoint, NetWorthReport } from '../commons/types';
import { formatCompactCurrency, formatCurrency } from '../commons/utils';
import {
  BLOCK_GAP,
  CARD_SECTION_HEADER,
  CARD_TITLE,
  CARD_TITLE_WRAP,
  cx,
  DASHBOARD_CARD,
  MONEY,
  CHART_TOOLTIP,
} from './ui';

const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatCurrency(Math.abs(value))}`;

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NetWorthPoint }>;
}

/** Month-end value, then what moved it that month. Text stays in text tokens. */
function NetWorthTooltip({ active, payload }: TooltipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  const rows: [string, number][] = [
    ['Thu nhập', point.income],
    ['Chi tiêu', -point.expense],
  ];
  if (point.realizedPnL !== 0) rows.push(['Lãi/lỗ đầu tư', point.realizedPnL]);
  return (
    <div className={cx(CHART_TOOLTIP, 'min-w-50 px-3 py-2.5 text-[0.8rem]')}>
      <div className="mb-1.5 border-b border-line pb-1 font-semibold text-muted">
        Cuối tháng {point.label.replace(/^T/, '')}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted">Tài sản ròng</span>
        <span className={cx(MONEY, 'text-main')}>{formatCurrency(point.netWorth)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-muted">Trong tháng</span>
        <span className={cx(MONEY, 'text-main')}>{signed(point.change)}</span>
      </div>
      <div className="mt-1 flex flex-col gap-0.5 border-t border-line pt-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-muted">
            <span>{label}</span>
            <span className={MONEY}>{signed(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface NetWorthChartProps {
  report: NetWorthReport;
}

/**
 * Net worth over the last months: the current figure and its change over the period up top,
 * then one line of month-end values. A single series, so no legend: the title names it.
 * The y-axis fits the data (not zero-based), so it is a line, never a filled area; a zero
 * line appears only when net worth crosses it.
 */
export function NetWorthChart({ report }: NetWorthChartProps) {
  const { items, current, opening, periodChange } = report;
  const first = items[0];
  const pct = opening !== 0 ? (periodChange / Math.abs(opening)) * 100 : null;
  const crossesZero = items.some((p) => p.netWorth < 0) && items.some((p) => p.netWorth > 0);
  const up = periodChange > 0;
  const down = periodChange < 0;

  return (
    <section
      className={cx(DASHBOARD_CARD, BLOCK_GAP, 'animate-fade-in w-full')}
      aria-labelledby="net-worth-title"
    >
      <div className={cx(CARD_SECTION_HEADER, 'items-start')}>
        <div className="flex min-w-0 flex-col gap-1">
          <div className={CARD_TITLE_WRAP}>
            <h3 id="net-worth-title" className={CARD_TITLE}>
              Tài sản ròng
            </h3>
          </div>
          <div className={cx(MONEY, 'text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.1] text-main')}>
            {formatCurrency(current)}
          </div>
          {first && (
            <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted">
              <span
                className={cx(
                  MONEY,
                  'font-semibold',
                  up ? 'text-income' : down ? 'text-expense' : 'text-main'
                )}
              >
                {/* Arrow + sign, so the direction never rests on colour alone. */}
                {up ? '▲ ' : down ? '▼ ' : ''}
                {signed(periodChange)}
                {pct !== null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
              </span>
              <span>so với đầu {first.label.replace(/^T/, 'tháng ')}</span>
            </p>
          )}
        </div>
      </div>

      <div className="h-60 w-full mobile:h-50" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={items} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.6}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval="preserveStartEnd"
              minTickGap={14}
            />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => formatCompactCurrency(v)}
            />
            {crossesZero && <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />}
            <Tooltip
              content={<NetWorthTooltip />}
              cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="linear"
              dataKey="netWorth"
              name="Tài sản ròng"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              // 10px hover marker with a surface ring so it reads on the line.
              activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* The chart is drawn for sighted users; screen readers get the numbers. */}
      <table className="sr-only">
        <caption>Tài sản ròng cuối mỗi tháng</caption>
        <thead>
          <tr>
            <th scope="col">Tháng</th>
            <th scope="col">Tài sản ròng</th>
            <th scope="col">Thay đổi trong tháng</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.month}>
              <th scope="row">{p.label}</th>
              <td>{formatCurrency(p.netWorth)}</td>
              <td>{signed(p.change)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
