import React, { useState } from 'react';

interface DonutChartItem {
  categoryName: string;
  totalAmount: number;
  percentage: number;
}

interface DonutChartProps {
  items: DonutChartItem[];
}

const COLORS = ['#38bdf8', '#8b5cf6', '#34d399', '#f59e0b', '#ec4899', '#14b8a6'];

export const DonutChart: React.FC<DonutChartProps> = ({ items }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Filter out items with 0 or negative amounts to avoid drawing invalid segments
  const validItems = items.filter((item) => item.totalAmount > 0);
  const totalAmountSum = validItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // If no items, show a placeholder
  if (validItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <p className="text-slate-400">Không có dữ liệu chi tiêu</p>
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
    <div className="flex flex-col md:flex-row items-center justify-around gap-8 p-6 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
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
                className="transition-all duration-300 cursor-pointer"
                style={{
                  opacity: isHighlighted ? 1 : 0.4,
                }}
                onMouseEnter={() => setActiveIndex(segment.index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          {activeIndex !== null ? (
            <>
              <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
                {chartSegments[activeIndex].categoryName}
              </span>
              <span className="text-base font-bold text-white">
                {chartSegments[activeIndex].totalAmount.toLocaleString('vi-VN')}đ
              </span>
              <span className="text-xs text-indigo-400 font-semibold">
                {chartSegments[activeIndex].percentage.toFixed(1)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-slate-400 font-medium">Tổng chi tiêu</span>
              <span className="text-lg font-bold text-white">
                {totalAmountSum.toLocaleString('vi-VN')}đ
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 w-full">
        {chartSegments.map((segment) => {
          const isHighlighted = activeIndex === null || activeIndex === segment.index;
          return (
            <div
              key={segment.index}
              className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 cursor-pointer ${
                isHighlighted ? 'bg-slate-700/30' : 'opacity-40'
              }`}
              onMouseEnter={() => setActiveIndex(segment.index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm text-slate-200 font-medium">{segment.categoryName}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-white">
                  {segment.totalAmount.toLocaleString('vi-VN')}đ
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  ({segment.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
