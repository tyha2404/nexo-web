import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Plus,
  ReceiptText,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import moment from 'moment';
import { useEffect, useMemo, useState } from 'react';
import type {
  Category,
  CategoryBreakdownItem,
  MonthlyTrendReport,
  SummaryReport,
  TargetSummaryResponse,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { formatCurrency, getCategoryIcon } from '../commons/utils';
import {
  categoryService,
  debtService,
  reportService,
  targetService,
  transactionService,
  walletService,
} from '../services/api';
import type { DebtSummary } from '../types/debt';
import './Dashboard.css';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { MonthFilter } from './common';

export { getCategoryIcon };

export interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [allTimeSummary, setAllTimeSummary] = useState<SummaryReport | null>(null);
  const [targetSummary, setTargetSummary] = useState<TargetSummaryResponse | null>(null);
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [prevCategoryBreakdown, setPrevCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletModel[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrendReport | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (monthStr: string) => {
    try {
      setLoading(true);
      setError(null);

      const m = moment(monthStr, 'YYYY-MM');
      const startOfMonth = m.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = m.endOf('month').format('YYYY-MM-DD');
      const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };
      const targetParams = { month: m.month() + 1, year: m.year() };

      const prevM = m.clone().subtract(1, 'month');
      const prevDateFilters = {
        startDate: prevM.startOf('month').format('YYYY-MM-DD'),
        endDate: prevM.endOf('month').format('YYYY-MM-DD'),
      };

      const [
        summaryData,
        allTimeData,
        breakdownData,
        prevBreakdownData,
        prevSummaryData,
        categoriesData,
        targetData,
        debtData,
        walletsData,
        txnsData,
        monthlyTrendData,
      ] = await Promise.all([
        reportService.summary(dateFilters),
        reportService.summary({ allTime: true }),
        reportService.categoryBreakdown(dateFilters),
        reportService
          .categoryBreakdown(prevDateFilters)
          .catch(() => ({ items: [], totalExpense: 0 })),
        reportService.summary(prevDateFilters).catch(() => ({ totalIncome: 0, totalExpense: 0 })),
        categoryService.list(),
        targetService.getSummary(targetParams).catch(() => null),
        debtService.getSummary().catch(() => null),
        walletService.getWallets().catch(() => ({ wallets: [] })),
        transactionService
          .list({
            startDate: startOfMonth,
            endDate: endOfMonth,
            limit: 6,
            page: 1,
          })
          .catch(() => ({ items: [] })),
        reportService.monthlyTrend(12).catch(() => null),
      ]);

      setSummary(summaryData);
      setAllTimeSummary(allTimeData);
      setCategoryBreakdown(breakdownData.items || []);
      setPrevCategoryBreakdown(prevBreakdownData.items || []);
      setPrevSummary(prevSummaryData);
      setCategories(categoriesData.items || []);
      setTargetSummary(targetData);
      setDebtSummary(debtData);
      setWallets(walletsData.wallets || []);
      setRecentTransactions(txnsData.items || []);
      setMonthlyTrend(monthlyTrendData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu bảng điều khiển');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    const handleDataChanged = () => {
      fetchDashboardData(selectedMonth);
    };

    window.addEventListener('transactions-changed', handleDataChanged);
    window.addEventListener('categories-changed', handleDataChanged);
    window.addEventListener('targets-changed', handleDataChanged);
    window.addEventListener('debts-changed', handleDataChanged);
    window.addEventListener('wallets-changed', handleDataChanged);

    return () => {
      window.removeEventListener('transactions-changed', handleDataChanged);
      window.removeEventListener('categories-changed', handleDataChanged);
      window.removeEventListener('targets-changed', handleDataChanged);
      window.removeEventListener('debts-changed', handleDataChanged);
      window.removeEventListener('wallets-changed', handleDataChanged);
    };
  }, [selectedMonth]);

  // Net Asset & Available Cash Calculations (Single Pool)
  const allTimeIncome = allTimeSummary?.totalIncome ?? 0;
  const allTimeExpense = allTimeSummary?.totalExpense ?? 0;
  const allTimeInvestment = allTimeSummary?.totalInvestment ?? 0; // Đang đầu tư (HOLDING)
  const allTimeRealizedPnL = allTimeSummary?.realizedPnL ?? 0; // Lãi đã chốt từ đầu tư
  const debtPayable = debtSummary?.totalPayable ?? 0;
  const debtReceivable = debtSummary?.totalReceivable ?? 0;

  // Tiền mặt khả dụng ngoài đời: (Thu - Chi + Lãi đầu tư đã chốt) - Đang đầu tư - Cho vay (chưa thu) + Đi vay (chưa trả)
  const availableCash =
    allTimeIncome -
    allTimeExpense +
    allTimeRealizedPnL -
    allTimeInvestment -
    debtReceivable +
    debtPayable;

  // Tổng tài sản tích lũy (Net Worth): Tiền mặt khả dụng + Đang đầu tư + Cho vay - Đi vay = Thu - Chi + Lãi đầu tư đã chốt
  const totalNetWorth = allTimeIncome - allTimeExpense + allTimeRealizedPnL;

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const monthlyNetCashFlow = totalIncome - totalExpense;

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

  // Budget progress calculations
  const budgetSpent = targetSummary?.expense?.spentAmount ?? totalExpense;
  const budgetLimit = targetSummary?.expense?.targetAmount ?? 0;
  const budgetPercent =
    budgetLimit > 0 ? Math.min(100, Math.round((budgetSpent / budgetLimit) * 100)) : 0;
  const isOverBudget = targetSummary?.expense?.isOverBudget ?? false;

  // Investment target calculations
  const investmentTarget = targetSummary?.investment?.targetAmount ?? 0;
  const investedAmount = targetSummary?.investment?.investedAmount ?? summary?.totalInvestment ?? 0;
  const investRemaining = targetSummary?.investment?.remainingAmount ?? 0;
  const isInvestReached = targetSummary?.investment?.isTargetReached ?? false;
  const investSurplus = targetSummary?.investment?.surplusAmount ?? 0;
  const investPercent =
    investmentTarget > 0 ? Math.min(100, Math.round((investedAmount / investmentTarget) * 100)) : 0;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* 1. Dashboard Header & Period Switcher */}
      <div className="dashboard-header animate-fade-in">
        <div className="dashboard-title-group">
          <h2>Tổng quan Tài chính</h2>
          <p className="subtitle">Dòng tiền & phân tích thông minh thời gian thực</p>
        </div>

        <MonthFilter value={selectedMonth} onChange={(newMonth) => setSelectedMonth(newMonth)} />
      </div>

      {error && (
        <div className="error-banner animate-fade-in" style={{ marginBottom: '1.25rem' }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData(selectedMonth)}
            className="btn btn-secondary btn-retry"
            style={{ marginLeft: 'auto' }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Hero Balance & Cash Flow Card */}
      {loading && !summary ? (
        <div className="dashboard-skeleton animate-fade-in" aria-busy="true">
          <div className="skeleton skeleton-card" style={{ height: '210px' }} />
          <div className="skeleton" style={{ height: '72px', marginTop: '1rem' }} />
          <div
            className="skeleton-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div className="skeleton skeleton-card" style={{ height: '360px' }} />
            <div className="skeleton skeleton-card" style={{ height: '360px' }} />
          </div>
          <div
            className="skeleton-grid2"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div className="skeleton skeleton-card" style={{ height: '110px' }} />
            <div className="skeleton skeleton-card" style={{ height: '110px' }} />
            <div className="skeleton skeleton-card" style={{ height: '110px' }} />
          </div>
        </div>
      ) : (
        <>
          <div className="hero-cashflow-card glass-card animate-fade-in">
            <div className="hero-top-row">
              <div className="hero-flow-info">
                <div className="hero-pill-badge">
                  <span>Dòng tiền Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}</span>
                </div>
                <div className="hero-main-amount-row">
                  <span
                    className={`hero-main-amount ${
                      monthlyNetCashFlow >= 0 ? 'text-income' : 'text-expense'
                    }`}
                  >
                    {monthlyNetCashFlow > 0 ? '+' : ''}
                    {formatCurrency(monthlyNetCashFlow)}
                  </span>
                </div>
              </div>

              <div className="hero-net-assets-box">
                <div className="net-assets-label">
                  <span>Tiền khả dụng thực tế</span>
                </div>
                <div
                  className={`net-assets-value ${
                    availableCash >= 0 ? 'text-income' : 'text-expense'
                  }`}
                  title={`Tiền mặt khả dụng: ${formatCurrency(availableCash)}`}
                >
                  {formatCurrency(availableCash)}
                </div>
                <div className="hero-total-networth-tag">
                  <span>Tổng tài sản:</span>
                  <strong>{formatCurrency(totalNetWorth)}</strong>
                </div>
              </div>
            </div>

            {/* Hero Sub-metrics Row */}
            <div className="hero-submetrics-grid">
              <div
                className="hero-submetric-item metric-income clickable-card"
                onClick={() => onNavigate?.('income')}
                title="Xem chi tiết Thu nhập"
              >
                <div className="submetric-details">
                  <span className="submetric-title">Tổng Thu nhập ↗</span>
                  <span
                    className="submetric-number text-income"
                    title={formatCurrency(totalIncome)}
                  >
                    +{formatCurrency(totalIncome)}
                  </span>
                </div>
              </div>

              <div
                className="hero-submetric-item metric-expense clickable-card"
                onClick={() => onNavigate?.('expenses')}
                title="Xem chi tiết Chi tiêu"
              >
                <div className="submetric-details">
                  <span className="submetric-title">Tổng Chi tiêu ↗</span>
                  <span
                    className="submetric-number text-expense"
                    title={formatCurrency(totalExpense)}
                  >
                    -{formatCurrency(totalExpense)}
                  </span>
                </div>
              </div>

              <div
                className="hero-submetric-item metric-invest clickable-card"
                onClick={() => onNavigate?.('investment')}
                title="Xem chi tiết Đầu tư"
              >
                <div className="submetric-details">
                  <span className="submetric-title">Tổng Đầu tư ↗</span>
                  <span
                    className="submetric-number"
                    title={formatCurrency(summary?.totalInvestment ?? 0)}
                  >
                    {formatCurrency(summary?.totalInvestment ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Budget & Investment Progress Section */}
            <div className="hero-targets-dual-grid">
              {/* 1. Expense Budget Progress */}
              <div className="hero-budget-progress-box">
                <div className="budget-progress-header">
                  <span className="budget-progress-title">Hạn mức Ngân sách Chi tiêu</span>
                  {budgetLimit > 0 ? (
                    <span
                      className={`budget-status-badge ${
                        isOverBudget
                          ? 'badge-danger'
                          : budgetPercent >= 80
                            ? 'badge-warning'
                            : 'badge-safe'
                      }`}
                    >
                      {isOverBudget
                        ? `Vượt +${formatCurrency(targetSummary?.expense?.overspentAmount ?? 0)}`
                        : `Đã chi ${budgetPercent}%`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="budget-set-link"
                      onClick={() => onNavigate?.('targets')}
                    >
                      + Đặt hạn mức ↗
                    </button>
                  )}
                </div>

                {budgetLimit > 0 ? (
                  <>
                    <div className="budget-progress-track">
                      <div
                        className={`budget-progress-bar ${
                          isOverBudget
                            ? 'fill-danger'
                            : budgetPercent >= 80
                              ? 'fill-warning'
                              : 'fill-emerald'
                        }`}
                        style={{ width: `${Math.min(100, budgetPercent)}%` }}
                      />
                    </div>
                    <div className="budget-progress-footer">
                      <span>
                        Đã chi: <strong>{formatCurrency(budgetSpent)}</strong> /{' '}
                        {formatCurrency(budgetLimit)}
                      </span>
                      {targetSummary?.expense?.dailyAllowance !== undefined &&
                      targetSummary.expense.dailyAllowance > 0 &&
                      !isOverBudget ? (
                        <span className="budget-allowance-hint">
                          Gợi ý:{' '}
                          <strong>
                            {formatCurrency(Math.round(targetSummary.expense.dailyAllowance))}/ngày
                          </strong>{' '}
                          (còn {targetSummary.daysRemaining || 0} ngày)
                        </span>
                      ) : isOverBudget ? (
                        <span style={{ color: 'var(--expense)', fontWeight: 600 }}>
                          Vượt ngân sách:{' '}
                          <strong>
                            {formatCurrency(
                              Math.abs(
                                targetSummary?.expense?.overspentAmount ?? budgetSpent - budgetLimit
                              )
                            )}
                          </strong>
                        </span>
                      ) : targetSummary?.expense?.remainingAmount !== undefined ? (
                        <span>
                          Còn lại:{' '}
                          <strong>{formatCurrency(targetSummary.expense.remainingAmount)}</strong>
                        </span>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="budget-empty-hint">
                    <span>
                      Chưa đặt hạn mức chi tiêu tháng{' '}
                      {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
                    </span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={() => onNavigate?.('targets')}
                    >
                      Thiết lập
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Monthly Investment Target Progress */}
              <div className="hero-budget-progress-box hero-invest-progress-box">
                <div className="budget-progress-header">
                  <span className="budget-progress-title">Mục tiêu Đầu tư Tháng</span>
                  {investmentTarget > 0 ? (
                    <span
                      className={`budget-status-badge ${
                        isInvestReached
                          ? 'badge-safe'
                          : investPercent >= 50
                            ? 'badge-info'
                            : 'badge-warning'
                      }`}
                    >
                      {isInvestReached
                        ? `Đạt mục tiêu 🎉 (+${formatCurrency(investSurplus)})`
                        : `Đã đạt ${investPercent}% (Thiếu ${formatCurrency(investRemaining)})`}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="budget-set-link link-sky"
                      onClick={() => onNavigate?.('targets')}
                    >
                      + Đặt mục tiêu đầu tư ↗
                    </button>
                  )}
                </div>

                {investmentTarget > 0 ? (
                  <>
                    <div className="budget-progress-track">
                      <div
                        className="budget-progress-bar fill-sky"
                        style={{ width: `${Math.min(100, investPercent)}%` }}
                      />
                    </div>
                    <div className="budget-progress-footer">
                      <span>
                        Đã đầu tư: <strong>{formatCurrency(investedAmount)}</strong> /{' '}
                        {formatCurrency(investmentTarget)}
                      </span>
                      {isInvestReached && (
                        <span style={{ color: '#10b981', fontWeight: 600 }}>
                          Vượt chỉ tiêu: <strong>+{formatCurrency(investSurplus)}</strong> 🎉
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="budget-empty-hint">
                    <span>
                      Chưa đặt mục tiêu tích lũy/đầu tư tháng{' '}
                      {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
                    </span>
                    <button
                      type="button"
                      className="btn-link-action link-sky"
                      onClick={() => onNavigate?.('targets')}
                    >
                      Thiết lập
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2.5 Monthly Trend Chart (12 Months) */}
          <MonthlyTrendChart
            items={monthlyTrend?.items || []}
            averageExpense={monthlyTrend?.averageExpense || 0}
            loading={loading}
          />

          {/* 3. Analytics Main Grid: Category Breakdown & Recent Transactions */}
          <div className="dashboard-main-grid animate-fade-in">
            {/* Left: MoM Spending & Category Comparison */}
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
                          Tháng{' '}
                          {moment(selectedMonth, 'YYYY-MM').subtract(1, 'month').format('MM/YYYY')}
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
                                <span className="cat-amount-val">
                                  {formatCurrency(item.totalAmount)}
                                </span>
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

            {/* Right: Recent 5 Transactions Feed */}
            <div className="glass-card dashboard-card recent-txns-card">
              <div className="card-section-header">
                <div className="card-title-wrap">
                  <h3
                    className="clickable-title"
                    onClick={() => onNavigate?.('transactions')}
                    title="Xem tất cả giao dịch"
                  >
                    Giao dịch Gần đây
                  </h3>
                </div>
              </div>

              <div className="recent-txns-body">
                {recentTransactions.length > 0 ? (
                  <div className="txns-timeline-list">
                    {recentTransactions.map((txn) => {
                      const matchedWallet = wallets.find((w) => w.id === txn.walletId);
                      const walletLabel = txn.walletName || matchedWallet?.name || 'Ví mặc định';

                      return (
                        <div
                          key={txn.id}
                          className="recent-txn-row clickable-card"
                          onClick={() => onNavigate?.('transactions')}
                          title="Bấm để xem danh sách giao dịch"
                        >
                          <div className="txn-left-col">
                            <div className="txn-info-meta">
                              <span className="txn-title">
                                {txn.description || txn.categoryName || 'Giao dịch'}
                              </span>
                              <div className="txn-subtags">
                                <span className="txn-cat-badge">
                                  {txn.categoryName || 'Không phân loại'}
                                </span>
                                <span className="txn-wallet-badge">
                                  <CreditCard size={11} /> {walletLabel}
                                </span>
                                <span className="txn-date-tag">
                                  {moment(txn.transactionDate).format('DD/MM/YYYY')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="txn-right-col">
                            <span
                              className={`txn-amount-val ${
                                txn.type === 'INCOME'
                                  ? 'text-income'
                                  : txn.type === 'INVESTMENT'
                                    ? ''
                                    : 'text-expense'
                              }`}
                            >
                              {txn.type === 'INCOME'
                                ? `+${formatCurrency(txn.amount)}`
                                : txn.type === 'INVESTMENT'
                                  ? formatCurrency(txn.amount)
                                  : `-${formatCurrency(txn.amount)}`}
                            </span>
                            {txn.type === 'INVESTMENT' &&
                              txn.realizedPnl !== undefined &&
                              txn.realizedPnl !== 0 && (
                                <span
                                  className={`txn-pnl-badge ${
                                    txn.realizedPnl > 0 ? 'pnl-positive' : 'pnl-negative'
                                  }`}
                                >
                                  {txn.realizedPnl > 0 ? '+' : ''}
                                  {formatCurrency(txn.realizedPnl)}
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state-box">
                    <div className="empty-icon-circle">
                      <ReceiptText size={28} className="text-muted" />
                    </div>
                    <p className="empty-state-title">Chưa có giao dịch nào</p>
                    <p className="empty-state-sub">
                      Chưa có giao dịch thu chi trong tháng{' '}
                      {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
                    </p>
                    <div className="empty-actions-row">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onNavigate?.('expenses')}
                      >
                        <Plus size={14} /> Ghi giao dịch
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Secondary Summary Section: Assets, Investment & Debts */}
          <div className="dashboard-secondary-section animate-fade-in">
            <div className="secondary-section-title">
              <span>Tài sản Tích lũy, Đầu tư & Vay Nợ</span>
            </div>

            <div className="secondary-cards-grid">
              {/* Investment Portfolio Card */}
              <div
                className="secondary-stat-card glass-card clickable-card"
                onClick={() => onNavigate?.('investment')}
                title="Xem chi tiết Quản lý Đầu tư"
              >
                <div className="secondary-card-head">
                  <span className="secondary-card-label">Danh mục Đầu tư ↗</span>
                </div>
                <div className="secondary-card-value">
                  {formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
                </div>
                <div className="secondary-card-sub">
                  <span>
                    Tháng này: <strong>{formatCurrency(summary?.totalInvestment ?? 0)}</strong>
                  </span>
                </div>
              </div>

              {/* Debts Payable Card */}
              <div
                className="secondary-stat-card glass-card clickable-card"
                onClick={() => onNavigate?.('debts')}
                title="Xem chi tiết các khoản nợ phải trả"
              >
                <div className="secondary-card-head">
                  <span className="secondary-card-label">Tôi Nợ (Phải Trả) ↗</span>
                </div>
                <div className="secondary-card-value">
                  {formatCurrency(Math.abs(debtSummary?.totalPayable ?? 0))}
                </div>
                <div className="secondary-card-sub">
                  <span>Đang nợ người khác / thẻ tín dụng</span>
                </div>
              </div>

              {/* Debts Receivable Card */}
              <div
                className="secondary-stat-card glass-card clickable-card"
                onClick={() => onNavigate?.('debts')}
                title="Xem chi tiết các khoản cho vay / cần thu"
              >
                <div className="secondary-card-head">
                  <span className="secondary-card-label">Người Khác Nợ (Phải Thu) ↗</span>
                </div>
                <div className="secondary-card-value">
                  {formatCurrency(Math.abs(debtSummary?.totalReceivable ?? 0))}
                </div>
                <div className="secondary-card-sub">
                  <span>Các khoản cho vay cần thu hồi</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
