import React, { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyTrendItem } from '../commons/types';
import { formatCompactCurrency, formatCurrency } from '../commons/utils';
import {
  CARD_SECTION_HEADER,
  CARD_TITLE,
  CARD_TITLE_WRAP,
  cx,
  DASHBOARD_CARD,
  SPINNER_MICRO,
} from './ui';

const dotCls = 'inline-block h-[7px] w-[7px] rounded-full';
const emptyCls = 'flex h-[200px] items-center justify-center text-[0.875rem] text-muted';
const filterBtnCls = (active: boolean) =>
  `inline-flex cursor-pointer items-center gap-[0.4rem] rounded-sm border border-solid px-[0.65rem] py-[0.3rem] text-[0.775rem] whitespace-nowrap transition-all duration-150 mobile:justify-center mobile:px-1 mobile:text-center mobile:text-[0.725rem] ${
    active
      ? 'border-line-hover bg-card font-semibold text-main shadow-app-sm'
      : 'border-transparent bg-transparent font-medium text-muted line-through opacity-45 hover:bg-hover hover:text-main'
  }`;

interface MonthlyTrendChartProps {
  items: MonthlyTrendItem[];
  averageExpense: number;
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="min-w-[190px] rounded-md border border-line bg-card px-[0.9rem] py-3 shadow-app-md [backdrop-filter:var(--glass-blur)]">
      <div className="mb-2 border-b border-line pb-[0.35rem] text-[0.8rem] font-semibold text-muted">
        Tháng {label}
      </div>
      <div className="flex flex-col gap-[0.35rem]">
        {payload.map((entry) => (
          <div
            key={entry.dataKey}
            className="flex items-center justify-between gap-3 text-[0.8rem]"
          >
            <span className="flex items-center gap-[0.4rem] text-muted">
              <span className={dotCls} style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-semibold text-main">
              {formatCurrency(entry.value || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  items,
  averageExpense,
  loading = false,
}) => {
  const [visibleSeries, setVisibleSeries] = useState({
    expense: true,
    income: true,
    target: true,
    avgExpense: true,
  });

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className={cx(DASHBOARD_CARD, 'mb-3 w-full')}>
        <div className={CARD_SECTION_HEADER}>
          <div className={CARD_TITLE_WRAP}>
            <h3 className={CARD_TITLE}>Xu hướng Chi tiêu & Thu nhập (12 Tháng)</h3>
          </div>
        </div>
        <div className={emptyCls}>
          <div className={cx(SPINNER_MICRO, 'size-5')} />
        </div>
      </div>
    );
  }

  // Enhance items with average expense value
  const chartData = (items || []).map((item) => ({
    ...item,
    avgExpense: averageExpense,
  }));

  return (
    <div className={cx(DASHBOARD_CARD, 'animate-fade-in mb-3 w-full')}>
      <div className={cx(CARD_SECTION_HEADER, 'flex-wrap gap-3 mobile:flex-col mobile:gap-2')}>
        <div className="flex flex-col gap-[0.2rem]">
          <div className={CARD_TITLE_WRAP}>
            <h3 className={CARD_TITLE}>Xu hướng Chi tiêu & Thu nhập (12 Tháng)</h3>
          </div>
          <p className="m-0 text-[0.8rem] text-muted">
            Chi tiêu trung bình:{' '}
            <strong className="font-mono font-semibold text-main">
              {formatCurrency(averageExpense)}/tháng
            </strong>
          </p>
        </div>

        {/* Legend / Filter Controls */}
        <div className="inline-flex flex-wrap items-center gap-[2px] rounded-sm border border-line bg-input p-[2px] mobile:grid mobile:w-full mobile:grid-cols-[repeat(4,1fr)] mobile:max-[481px]:grid-cols-[repeat(2,1fr)]">
          <button
            type="button"
            onClick={() => toggleSeries('expense')}
            className={filterBtnCls(visibleSeries.expense)}
            title="Bật/tắt cột Chi tiêu"
          >
            <span className={`${dotCls} rounded-xs`} style={{ background: '#6366f1' }} />
            Chi tiêu
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('income')}
            className={filterBtnCls(visibleSeries.income)}
            title="Bật/tắt đường Thu nhập"
          >
            <span className={dotCls} style={{ background: '#10b981' }} />
            Thu nhập
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('target')}
            className={filterBtnCls(visibleSeries.target)}
            title="Bật/tắt đường Ngân sách"
          >
            <span className={dotCls} style={{ background: '#f59e0b' }} />
            Ngân sách
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('avgExpense')}
            className={filterBtnCls(visibleSeries.avgExpense)}
            title="Bật/tắt đường Chi tiêu Trung bình"
          >
            <span
              className={dotCls}
              style={{ background: '#94a3b8', borderRadius: 0, height: 2, width: 8 }}
            />
            TB Chi tiêu
          </button>
        </div>
      </div>

      <div className="relative h-[300px] w-full mobile:h-[250px]">
        {chartData.length === 0 ? (
          <div className={emptyCls}>Chưa có dữ liệu giao dịch 12 tháng qua</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="trendExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatCompactCurrency(val)}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Bar: Chi tiêu */}
              {visibleSeries.expense && (
                <Bar
                  dataKey="expense"
                  name="Chi tiêu"
                  fill="url(#trendExpenseGradient)"
                  stroke="#6366f1"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              )}

              {/* Line 1: Thu nhập */}
              {visibleSeries.income && (
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Thu nhập"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: '#10b981' }}
                />
              )}

              {/* Line 2: Ngân sách / Mục tiêu */}
              {visibleSeries.target && (
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Ngân sách"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#f59e0b' }}
                />
              )}

              {/* Line 3: Chi tiêu trung bình */}
              {visibleSeries.avgExpense && (
                <Line
                  type="monotone"
                  dataKey="avgExpense"
                  name="TB Chi tiêu"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
