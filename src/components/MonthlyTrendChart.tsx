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
import './MonthlyTrendChart.css';

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
    <div className="trend-tooltip">
      <div className="trend-tooltip-title">Tháng {label}</div>
      <div className="trend-tooltip-list">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="trend-tooltip-row">
            <span className="trend-tooltip-label">
              <span className="trend-dot-indicator" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="trend-tooltip-value">{formatCurrency(entry.value || 0)}</span>
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
      <div className="glass-card dashboard-card monthly-trend-card">
        <div className="card-section-header">
          <div className="card-title-wrap">
            <h3 className="clickable-title">Xu hướng Chi tiêu & Thu nhập (12 Tháng)</h3>
          </div>
        </div>
        <div className="trend-empty-state">
          <div className="spinner-micro" style={{ width: 20, height: 20 }} />
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
    <div className="glass-card dashboard-card monthly-trend-card animate-fade-in">
      <div className="card-section-header trend-card-header">
        <div className="trend-title-container">
          <div className="card-title-wrap">
            <h3 className="clickable-title">Xu hướng Chi tiêu & Thu nhập (12 Tháng)</h3>
          </div>
          <p className="trend-card-subtitle">
            Chi tiêu trung bình: <strong>{formatCurrency(averageExpense)}/tháng</strong>
          </p>
        </div>

        {/* Legend / Filter Controls */}
        <div className="trend-legend-controls">
          <button
            type="button"
            onClick={() => toggleSeries('expense')}
            className={`trend-filter-btn ${visibleSeries.expense ? 'active' : 'inactive'}`}
            title="Bật/tắt cột Chi tiêu"
          >
            <span className="trend-dot-indicator bar-dot" style={{ background: '#6366f1' }} />
            Chi tiêu
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('income')}
            className={`trend-filter-btn ${visibleSeries.income ? 'active' : 'inactive'}`}
            title="Bật/tắt đường Thu nhập"
          >
            <span className="trend-dot-indicator" style={{ background: '#10b981' }} />
            Thu nhập
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('target')}
            className={`trend-filter-btn ${visibleSeries.target ? 'active' : 'inactive'}`}
            title="Bật/tắt đường Ngân sách"
          >
            <span className="trend-dot-indicator" style={{ background: '#f59e0b' }} />
            Ngân sách
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('avgExpense')}
            className={`trend-filter-btn ${visibleSeries.avgExpense ? 'active' : 'inactive'}`}
            title="Bật/tắt đường Chi tiêu Trung bình"
          >
            <span
              className="trend-dot-indicator"
              style={{ background: '#94a3b8', borderRadius: 0, height: 2, width: 8 }}
            />
            TB Chi tiêu
          </button>
        </div>
      </div>

      <div className="trend-chart-container">
        {chartData.length === 0 ? (
          <div className="trend-empty-state">Chưa có dữ liệu giao dịch 12 tháng qua</div>
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
