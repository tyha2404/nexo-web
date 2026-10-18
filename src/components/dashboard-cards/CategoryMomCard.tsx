import { ArrowDownRight, ArrowUpRight, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import moment from 'moment';
import { useMemo } from 'react';
import type { Category, CategoryBreakdownItem, SummaryReport } from '../../commons/types';
import { formatCurrency, getCategoryIcon } from '../../commons/utils';

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
    <div className="glass-card dashboard-card breakdown-card">
      <div className="card-section-header">
        <div className="card-title-wrap">
          <h3
            className="clickable-title"
            onClick={() => onNavigate?.('categories')}
            title="Quản lý Danh mục"
          >
            Biến động Chi tiêu (vs Tháng trước)
          </h3>
        </div>
      </div>

      <div className="breakdown-card-body">
        {categoryBreakdown.length > 0 ? (
          <>
            {/* MoM Quick Summary Banner */}
            <div className="mom-summary-banner">
              <div className="mom-banner-left">
                <span className="mom-banner-label">Tổng chi tiêu thay đổi</span>
                <div className="mom-banner-delta">
                  <span
                    className={`mom-delta-amount ${
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
                      className={`mom-banner-badge ${
                        momExpenseDeltaPercent > 0
                          ? 'mom-badge-increase'
                          : momExpenseDeltaPercent < 0
                            ? 'mom-badge-decrease'
                            : 'mom-badge-neutral'
                      }`}
                    >
                      {momExpenseDeltaPercent > 0
                        ? `+${momExpenseDeltaPercent.toFixed(1)}% ▲`
                        : `${momExpenseDeltaPercent.toFixed(1)}% ▼`}
                    </span>
                  )}
                </div>
              </div>

              <div className="mom-prev-month-box">
                <span className="mom-prev-label">
                  Tháng {moment(selectedMonth, 'YYYY-MM').subtract(1, 'month').format('MM/YYYY')}
                </span>
                <span className="mom-prev-value">{formatCurrency(prevTotalExpense)}</span>
              </div>
            </div>

            {/* Category List with MoM tags */}
            <div className="mom-categories-list">
              {momCategoryList.map((item) => {
                const icon = getCategoryIcon(item.categoryName, 'EXPENSE');

                return (
                  <div key={item.categoryId} className="category-progress-row">
                    <div className="cat-row-header">
                      <div className="cat-identity">
                        <span className="cat-emoji">{icon}</span>
                        <span className="cat-name">{item.categoryName}</span>
                      </div>
                      <div className="cat-amounts">
                        <span className="cat-amount-val">{formatCurrency(item.totalAmount)}</span>
                        {item.isNew ? (
                          <span className="mom-cat-change-tag change-new">
                            <Sparkles size={10} /> Mới
                          </span>
                        ) : item.deltaPct !== null ? (
                          <span
                            className={`mom-cat-change-tag ${
                              item.deltaPct > 0
                                ? 'change-increase'
                                : item.deltaPct < 0
                                  ? 'change-decrease'
                                  : 'change-flat'
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
                          <span className="mom-cat-change-tag change-flat">0%</span>
                        )}
                      </div>
                    </div>

                    <div className="cat-progress-track">
                      <div
                        className="cat-progress-fill"
                        style={{
                          width: `${Math.min(100, item.percentage)}%`,
                          background:
                            item.hasBudget && item.budgetUtil > 100 ? '#f43f5e' : undefined,
                        }}
                      />
                    </div>

                    {item.hasBudget && item.budgetLimit && (
                      <div className="cat-budget-meta">
                        <span
                          className={`cat-budget-status ${
                            item.budgetUtil > 100
                              ? 'text-danger'
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
          <div className="empty-state-box">
            <div className="empty-icon-circle">
              <ShoppingBag size={28} className="text-muted" />
            </div>
            <p className="empty-state-title">Chưa có dữ liệu chi tiêu</p>
            <p className="empty-state-sub">
              Chưa ghi nhận khoản chi nào trong tháng{' '}
              {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate?.('expenses')}
            >
              <Plus size={14} /> Ghi chi tiêu mới
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
