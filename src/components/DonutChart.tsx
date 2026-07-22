import React, { useState } from 'react';

interface DonutChartItem {
  categoryName: string;
  totalAmount: number;
  percentage: number;
}

interface DonutChartProps {
  items: DonutChartItem[];
  centerLabel?: string;
}

const COLORS = ['#38bdf8', '#8b5cf6', '#34d399', '#f59e0b', '#ec4899', '#14b8a6'];

export const DonutChart: React.FC<DonutChartProps> = ({ items, centerLabel = 'Tổng chi tiêu' }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter out items with 0 or negative amounts to avoid drawing invalid segments
  const validItems = items.filter((item) => item.totalAmount > 0);
  const totalAmountSum = validItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // If no items, show a placeholder
  if (validItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <p className="text-slate-400">Không có dữ liệu {centerLabel.toLowerCase()}</p>
      </div>
    );
  }

  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius; // ~219.91

  const chartSegments = validItems.map((item, index) => {
    // If the items don't have perfect percentages, calculate based on totalAmountSum
    const pct = totalAmountSum > 0 ? (item.totalAmount / totalAmountSum) * 100 : 0;
    const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;

    // Sum the percentages of all items before the current index to calculate offset
    const previousPercentageSum = validItems.slice(0, index).reduce((sum, it) => {
      const itPct = totalAmountSum > 0 ? (it.totalAmount / totalAmountSum) * 100 : 0;
      return sum + itPct;
    }, 0);

    const strokeDashoffset = -((previousPercentageSum / 100) * circumference);
    const color = COLORS[index % COLORS.length];

    return {
      ...item,
      color,
      strokeDasharray,
      strokeDashoffset,
      index,
    };
  });

  return (
    <div className="donut-chart-wrapper">
      <div className="donut-chart-container">
        <svg viewBox="0 0 100 100" className="donut-svg">
          {chartSegments.map((segment) => {
            const isHighlighted = activeIndex === null || activeIndex === segment.index;
            return (
              <circle
                key={segment.index}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={segment.color}
                strokeWidth={isHighlighted ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                className="donut-segment"
                style={{
                  opacity: isHighlighted ? 1 : 0.4,
                }}
                onMouseEnter={() => setActiveIndex(segment.index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>
        <div className="donut-center-info">
          {activeIndex !== null ? (
            <>
              <span className="donut-center-label">{chartSegments[activeIndex].categoryName}</span>
              <span className="donut-center-value">
                {chartSegments[activeIndex].totalAmount.toLocaleString('vi-VN')}đ
              </span>
              <span className="donut-center-percentage">
                {chartSegments[activeIndex].percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="donut-center-label">{centerLabel}</span>
              <span className="donut-center-value main-total">
                {totalAmountSum.toLocaleString('vi-VN')}đ
              </span>
            </>
          )}
        </div>
      </div>

      <div className="donut-legend-list">
        {chartSegments.map((segment) => {
          const isHighlighted = activeIndex === null || activeIndex === segment.index;
          return (
            <div
              key={segment.index}
              className={`donut-legend-item ${isHighlighted ? 'active' : 'inactive'}`}
              onMouseEnter={() => setActiveIndex(segment.index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="legend-label-group">
                <div className="legend-color-dot" style={{ backgroundColor: segment.color }} />
                <span className="legend-name">{segment.categoryName}</span>
              </div>
              <div className="legend-value-group">
                <span className="legend-amount">
                  {segment.totalAmount.toLocaleString('vi-VN')}đ
                </span>
                <span className="legend-percent">({segment.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
