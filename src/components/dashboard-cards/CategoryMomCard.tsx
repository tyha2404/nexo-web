import { ArrowDownRight, ArrowUpRight, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import type { Category, CategoryBreakdownItem, SummaryReport } from '../../commons/types';
import { formatCurrency, getCategoryIcon } from '../../commons/utils';
import {
  BTN_PRIMARY,
  CARD_SECTION_HEADER,
  CARD_TITLE,
  CARD_TITLE_WRAP,
  cx,
  DASHBOARD_CARD,
  EMPTY_BOX,
  EMPTY_ICON_CIRCLE,
  EMPTY_SUB,
  EMPTY_TITLE,
} from '../ui';

const changeTagCls =
  'inline-flex items-center gap-[0.2rem] rounded-sm px-[0.35rem] py-[0.1rem] font-mono text-[0.725rem] font-bold';

interface CategoryMomCardProps {
  selectedMonth: string;
  summary: SummaryReport | null;
  prevSummary: SummaryReport | null;
  categoryBreakdown: CategoryBreakdownItem[];
  prevCategoryBreakdown: CategoryBreakdownItem[];
  categories: Category[];
  onNavigate?: (tab: string) => void;
}

export function CategoryMomCard({
  selectedMonth,
  summary,
  prevSummary,
  categoryBreakdown,
  prevCategoryBreakdown,
  categories,
  onNavigate,
}: CategoryMomCardProps) {
  const totalExpense = summary?.totalExpense ?? 0;

  // MoM Expense calculations
  const prevTotalExpense = prevSummary?.totalExpense ?? 0;
  const momExpenseDelta = totalExpense - prevTotalExpense;
  const momExpenseDeltaPercent =
    prevTotalExpense > 0 ? (momExpenseDelta / prevTotalExpense) * 100 : null;

  // Sorted categories with MoM comparison (take top 6)
  const momCategoryList = useMemo(() => {
    return [...categoryBreakdown]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 6)
      .map((item) => {
        const prevItem = prevCategoryBreakdown.find((p) => p.categoryId === item.categoryId);
        const prevAmt = prevItem ? prevItem.totalAmount : 0;
        const delta = item.totalAmount - prevAmt;
        const deltaPct = prevAmt > 0 ? (delta / prevAmt) * 100 : null;
        const isNew = !prevItem || prevAmt === 0;

        const catMeta = categories.find((c) => c.id === item.categoryId);
        const hasBudget = catMeta?.budgetLimit && catMeta.budgetLimit > 0;
        const budgetUtil = hasBudget ? (item.totalAmount / catMeta.budgetLimit!) * 100 : 0;

        return {
          ...item,
          prevAmount: prevAmt,
          delta,
          deltaPct,
          isNew,
          hasBudget,
          budgetLimit: catMeta?.budgetLimit,
          budgetUtil,
        };
      });
  }, [categoryBreakdown, prevCategoryBreakdown, categories]);

  return (
    <div className={cx('breakdown-card', DASHBOARD_CARD)}>
      <div className={CARD_SECTION_HEADER}>
        <div className={CARD_TITLE_WRAP}>
          <h3
            className={CARD_TITLE}
            onClick={() => onNavigate?.('categories')}
            title="Quản lý Danh mục"
          >
            Biến động Chi tiêu (vs Tháng trước)
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between">
        {categoryBreakdown.length > 0 ? (
          <>
            {/* MoM Quick Summary Banner */}
            <div className="mb-[0.85rem] flex items-center justify-between gap-3 rounded-md border border-line bg-hover px-4 py-[0.85rem] mobile:gap-[0.4rem] mobile:px-[0.65rem] mobile:py-[0.55rem]">
              <div className="flex flex-col gap-1 text-left">
                <span className="inline-flex items-center gap-[0.35rem] text-[0.75rem] font-semibold text-muted">
                  Tổng chi tiêu thay đổi
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[1.15rem] font-bold tracking-[-0.02em] mobile:text-[0.95rem] ${
                      momExpenseDelta > 0
                        ? 'text-expense'
                        : momExpenseDelta < 0
                          ? 'text-income'
                          : 'text-muted'
                    }`}
                  >
                    {momExpenseDelta > 0 ? '+' : ''}
                    {formatCurrency(momExpenseDelta)}
                  </span>
                  {momExpenseDeltaPercent !== null && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-[0.2rem] font-mono text-[0.725rem] font-bold tracking-[-0.01em] whitespace-nowrap ${
                        momExpenseDeltaPercent > 0
                          ? 'border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.12)] text-expense'
                          : momExpenseDeltaPercent < 0
                            ? 'border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.12)] text-income'
                            : 'border-line bg-card text-muted'
                      }`}
                    >
                      {momExpenseDeltaPercent > 0
                        ? `+${momExpenseDeltaPercent.toFixed(1)}% ▲`
                        : `${momExpenseDeltaPercent.toFixed(1)}% ▼`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end rounded-sm border border-line bg-card px-3 py-[0.45rem] text-right shadow-app-sm transition-all duration-200 hover:border-line-hover mobile:px-[0.45rem] mobile:py-[0.3rem]">
                <span className="mb-[0.15rem] text-[0.7rem] font-semibold text-muted mobile:text-[0.8125rem]">
                  Tháng {moment(selectedMonth, 'YYYY-MM').subtract(1, 'month').format('MM/YYYY')}
                </span>
                <span className="font-mono text-[0.9rem] font-bold tracking-[-0.01em] text-main mobile:text-[0.875rem]">
                  {formatCurrency(prevTotalExpense)}
                </span>
              </div>
            </div>

            {/* Category List with MoM tags */}
            <div className="flex flex-1 flex-col gap-2">
              {momCategoryList.map((item) => {
                const icon = getCategoryIcon(item.categoryName, 'EXPENSE');

                return (
                  <div key={item.categoryId} className="flex flex-col gap-[0.3rem] text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-[0.4rem]">
                        <span className="text-[1rem]">{icon}</span>
                        <span className="text-[0.85rem] font-semibold text-main">
                          {item.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-[0.45rem] mobile:gap-[0.3rem]">
                        <span className="font-mono text-[0.85rem] font-bold text-main mobile:text-[0.8rem]">
                          {formatCurrency(item.totalAmount)}
                        </span>
                        {item.isNew ? (
                          <span
                            className={`${changeTagCls} bg-[rgba(99,102,241,0.1)] text-primary`}
                          >
                            <Sparkles size={10} /> Mới
                          </span>
                        ) : item.deltaPct !== null ? (
                          <span
                            className={`${changeTagCls} ${
                              item.deltaPct > 0
                                ? 'bg-[rgba(244,63,94,0.1)] text-expense'
                                : item.deltaPct < 0
                                  ? 'bg-[rgba(16,185,129,0.1)] text-income'
                                  : 'bg-hover text-muted'
                            }`}
                          >
                            {item.deltaPct > 0 ? (
                              <ArrowUpRight size={11} />
                            ) : item.deltaPct < 0 ? (
                              <ArrowDownRight size={11} />
                            ) : null}
                            {item.deltaPct > 0 ? '+' : ''}
                            {item.deltaPct.toFixed(0)}%
                          </span>
                        ) : (
                          <span className={`${changeTagCls} bg-hover text-muted`}>0%</span>
                        )}
                      </div>
                    </div>

                    <div className="h-[6px] overflow-hidden rounded-full bg-hover">
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          background:
                            item.hasBudget && item.budgetUtil > 100 ? '#f43f5e' : undefined,
                        }}
                      />
                    </div>

                    {item.hasBudget && item.budgetLimit && (
                      <div className="text-[0.725rem]">
                        <span
                          className={`cat-budget-status ${
                            item.budgetUtil > 100
                              ? 'text-expense'
                              : item.budgetUtil >= 80
                                ? 'text-warning'
                                : 'text-muted'
                          }`}
                        >
                          {item.budgetUtil > 100
                            ? `⚠️ Vượt hạn mức (+${formatCurrency(item.totalAmount - item.budgetLimit)})`
                            : `Đã dùng ${item.budgetUtil.toFixed(0)}% hạn mức (${formatCurrency(item.budgetLimit)})`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={EMPTY_BOX}>
            <div className={EMPTY_ICON_CIRCLE}>
              <ShoppingBag size={28} className="text-muted" />
            </div>
            <p className={EMPTY_TITLE}>Chưa có dữ liệu chi tiêu</p>
            <p className={EMPTY_SUB}>
              Chưa ghi nhận khoản chi nào trong tháng{' '}
              {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
            </p>
            <button type="button" className={BTN_PRIMARY} onClick={() => onNavigate?.('expenses')}>
              <Plus size={14} /> Ghi chi tiêu mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
