import moment from 'moment';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { TransactionType } from '../commons/constants';
import type {
  Category,
  CategoryBreakdownItem,
  SummaryReport,
  TargetSummaryResponse,
  Transaction,
} from '../commons/types';
import { compareDatesDesc, formatCurrency, formatDate } from '../commons/utils';
import { categoryService, reportService, targetService, transactionService } from '../services/api';
import './Dashboard.css';
import { DonutChart } from './DonutChart';

const api = {
  reports: reportService,
  transactions: transactionService,
  categories: categoryService,
  targets: targetService,
};

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [allTimeSummary, setAllTimeSummary] = useState<SummaryReport | null>(null);
  const [targetSummary, setTargetSummary] = useState<TargetSummaryResponse | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Filter tabs for visualization
  const [txnFilter, setTxnFilter] = useState<'ALL' | TransactionType>('ALL');

  const fetchDashboardData = async (monthStr: string) => {
    try {
      setLoading(true);
      setError(null);

      const m = moment(monthStr, 'YYYY-MM');
      const startOfMonth = m.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = m.endOf('month').format('YYYY-MM-DD');
      const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };
      const targetParams = { month: m.month() + 1, year: m.year() };

      // Fetch summary, category breakdown, targets using the api wrapper
      const [
        summaryData,
        allTimeData,
        breakdownData,
        transactionsData,
        categoriesData,
        targetData,
      ] = await Promise.all([
        api.reports.summary(dateFilters),
        api.reports.summary({ allTime: true }),
        api.reports.categoryBreakdown(dateFilters),
        api.transactions.list(dateFilters),
        api.categories.list(),
        api.targets.getSummary(targetParams).catch(() => null),
      ]);

      setSummary(summaryData);
      setAllTimeSummary(allTimeData);
      setCategoryBreakdown(breakdownData.items || []);
      setCategories(categoriesData.items || []);
      setAllTransactions(transactionsData.items || []);
      setTargetSummary(targetData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedMonth);
  }, [selectedMonth]);

  // All-time metrics
  const allTimeNetAssets = allTimeSummary?.netBalance ?? 0;
  const allTimeInvestment = allTimeSummary?.totalInvestment ?? 0;

  // Calculate Monthly Net Balance dynamically if not loaded or if summary doesn't exist
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const totalInvestment =
    summary?.totalInvestment ??
    allTransactions
      .filter((t) => t.type === TransactionType.INVESTMENT)
      .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = summary?.netBalance ?? totalIncome - totalExpense - totalInvestment;

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2>Bảng điều khiển Phân tích</h2>
          <p className="subtitle">Hiệu suất tài chính và phân tích chi tiết thời gian thực</p>
        </div>
        <div className="month-filter-wrapper">
          <label htmlFor="month-picker" className="month-filter-label">
            {loading ? (
              <div
                className="spinner-sm"
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--primary-glow)',
                  borderLeftColor: 'var(--primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              ></div>
            ) : null}
            <span>Tháng:</span>
          </label>
          <DatePicker
            id="month-picker"
            selected={selectedMonth ? moment(selectedMonth, 'YYYY-MM').toDate() : new Date()}
            onChange={(date: Date | null) => {
              if (date) {
                setSelectedMonth(moment(date).format('YYYY-MM'));
              }
            }}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            portalId="date-picker-portal"
            className="month-filter-input"
          />
        </div>
      </div>

      {error && (
        <div className="error-banner animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => fetchDashboardData(selectedMonth)}
            className="btn btn-secondary btn-retry"
            style={{ marginLeft: 'auto' }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* All-Time Financial Overview Section */}
      <div className="glass-card dashboard-section animate-fade-in">
        <h3 className="dashboard-section-title">
          <span>Tổng quan Tài sản & Đầu tư (Từ trước đến giờ)</span>
        </h3>
        <div className="alltime-cards">
          <div className="glass-panel-interactive summary-card alltime-assets">
            <div className="card-accent-border alltime-assets-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Tổng Tài sản Tích lũy</span>
              </div>
              <h3
                className={`card-value ${allTimeNetAssets >= 0 ? 'positive-balance' : 'negative-balance'}`}
              >
                {formatCurrency(allTimeNetAssets)}
              </h3>
              <div className="card-trend info">
                <span>Giá trị Ròng Toàn Thời Gian</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-interactive summary-card alltime-investment">
            <div className="card-accent-border alltime-investment-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Đầu tư Từ Trước Đến Giờ</span>
              </div>
              <h3
                className={`card-value ${allTimeInvestment >= 0 ? '' : 'negative-balance'}`}
                style={{ color: allTimeInvestment >= 0 ? '#3b82f6' : undefined }}
              >
                {formatCurrency(allTimeInvestment)}
              </h3>
              <div
                className="card-trend info"
                style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}
              >
                <span>Danh mục Tích lũy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Summary Section */}
      <div className="glass-card dashboard-section animate-fade-in">
        <h3 className="dashboard-section-title">
          <span>Kết quả Tài chính Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}</span>
        </h3>

        {/* Summary Cards Grid */}
        <div className="summary-cards">
          <div className="glass-panel-interactive summary-card income-card">
            <div className="card-accent-border income-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Tổng Thu nhập</span>
              </div>
              <h3 className="card-value">{formatCurrency(totalIncome)}</h3>
              <div className="card-trend upward">
                <span>Dòng tiền Ổn định</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-interactive summary-card expense-card">
            <div className="card-accent-border expense-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Tổng Chi tiêu</span>
              </div>
              <h3 className="card-value">{formatCurrency(totalExpense)}</h3>
              <div className="card-trend downward">
                <span>Kiểm soát Chi tiêu</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-interactive summary-card investment-card">
            <div className="card-accent-border investment-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Tổng Đầu tư</span>
              </div>
              <h3 className="card-value">{formatCurrency(totalInvestment)}</h3>
              <div className="card-trend info">
                <span>Tích lũy Tài sản</span>
              </div>
            </div>
          </div>

          <div className="glass-panel-interactive summary-card balance-card">
            <div className="card-accent-border balance-accent"></div>
            <div className="card-content">
              <div className="card-header-with-icon">
                <span className="card-label">Số dư Ròng</span>
              </div>
              <h3
                className={`card-value ${netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}
              >
                {formatCurrency(netBalance)}
              </h3>
              <div className="card-trend info">
                <span>Tình hình Chung</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Analytics Section */}
      <div className="dashboard-section animate-fade-in">
        <div className="target-cards-grid">
          {/* Monthly Expense Target Card */}
          <div
            className={`glass-card target-card ${targetSummary?.expense?.isOverBudget ? 'over-budget' : ''}`}
          >
            <div className="target-card-header">
              <div className="target-card-title">
                <span className="target-name">Hạn mức Chi tiêu Tháng</span>
              </div>
              {targetSummary?.expense?.isOverBudget ? (
                <span className="badge badge-danger">Vượt hạn mức</span>
              ) : (
                <span className="target-status-text">
                  {targetSummary?.expense?.targetAmount
                    ? `${Math.min(100, Math.round((targetSummary.expense.spentAmount / targetSummary.expense.targetAmount) * 100))}% đã chi`
                    : 'Chưa đặt mục tiêu'}
                </span>
              )}
            </div>

            {targetSummary?.expense?.targetAmount ? (
              <>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${targetSummary.expense.isOverBudget ? 'fill-danger' : 'fill-expense'}`}
                    style={{
                      width: `${Math.min(100, (targetSummary.expense.spentAmount / targetSummary.expense.targetAmount) * 100)}%`,
                    }}
                  />
                </div>

                <div className="target-metrics-row">
                  <div>
                    <div className="metric-label">Hạn mức</div>
                    <div className="metric-value">
                      {formatCurrency(targetSummary.expense.targetAmount)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="metric-label">Đã chi</div>
                    <div className="metric-value">
                      {formatCurrency(targetSummary.expense.spentAmount)}
                    </div>
                  </div>
                </div>

                {targetSummary.expense.isOverBudget ? (
                  <div className="target-alert-box alert-danger">
                    <div className="alert-title">Bạn đã chi vượt quá hạn mức!</div>
                    <div className="alert-sub">
                      Vượt mức:{' '}
                      <strong>{formatCurrency(targetSummary.expense.overspentAmount)}</strong>
                    </div>
                    <div className="alert-sub highlight">
                      Hạn mức chi tiêu mỗi ngày còn lại: 0 đ
                    </div>
                  </div>
                ) : (
                  <div className="target-alert-box alert-success">
                    <div className="alert-row">
                      <span className="alert-sub">Còn lại có thể chi:</span>
                      <span className="alert-value positive">
                        {formatCurrency(targetSummary.expense.remainingAmount)}
                      </span>
                    </div>
                    <div className="alert-tip">
                      <span>Gợi ý chi mỗi ngày ({targetSummary.daysRemaining} ngày còn lại): </span>
                      <strong style={{ color: 'var(--primary)' }}>
                        {formatCurrency(Math.round(targetSummary.expense.dailyAllowance))}/ngày
                      </strong>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-target-msg">
                Bấm vào nút bên trên để đặt hạn mức chi tiêu cho tháng này.
              </div>
            )}
          </div>

          {/* Monthly Investment Target Card */}
          <div className="glass-card target-card">
            <div className="target-card-header">
              <div className="target-card-title">
                <span className="target-name">Mục Tiêu Đầu Tư Tháng</span>
              </div>
              {targetSummary?.investment?.isTargetReached ? (
                <span className="badge badge-success">Đã hoàn thành</span>
              ) : (
                <span className="target-status-text">
                  {targetSummary?.investment?.targetAmount
                    ? `${Math.min(100, Math.round((targetSummary.investment.investedAmount / targetSummary.investment.targetAmount) * 100))}% hoàn thành`
                    : 'Chưa đặt mục tiêu'}
                </span>
              )}
            </div>

            {targetSummary?.investment?.targetAmount ? (
              <>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${targetSummary.investment.isTargetReached ? 'fill-success' : 'fill-investment'}`}
                    style={{
                      width: `${Math.min(100, (targetSummary.investment.investedAmount / targetSummary.investment.targetAmount) * 100)}%`,
                    }}
                  />
                </div>

                <div className="target-metrics-row">
                  <div>
                    <div className="metric-label">Mục tiêu</div>
                    <div className="metric-value">
                      {formatCurrency(targetSummary.investment.targetAmount)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="metric-label">Đã đầu tư</div>
                    <div className="metric-value investment">
                      {formatCurrency(targetSummary.investment.investedAmount)}
                    </div>
                  </div>
                </div>

                {targetSummary.investment.isTargetReached ? (
                  <div className="target-alert-box alert-success">
                    <div className="alert-title">Đã hoàn thành mục tiêu đầu tư!</div>
                    {targetSummary.investment.surplusAmount > 0 && (
                      <div className="alert-sub">
                        Vượt chỉ tiêu:{' '}
                        <strong>+{formatCurrency(targetSummary.investment.surplusAmount)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="target-alert-box alert-info">
                    <div className="alert-row">
                      <span className="alert-sub">Số tiền còn thiếu:</span>
                      <span className="alert-value investment">
                        {formatCurrency(targetSummary.investment.remainingAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="no-target-msg">
                Vào mục 🎯 Quản lý Mục tiêu trên thanh điều hướng để đặt mục tiêu cho tháng này.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Breakdown & Recent Activities Grid */}
      <div className="dashboard-grid animate-fade-in">
        {/* Category Breakdown Card */}
        <div className="glass-card breakdown-card">
          <div className="card-header flex-col sm:flex-row gap-3">
            <h3>Phân tích Danh mục</h3>
          </div>
          <div className="p-4">
            {(() => {
              // Calculate total for all breakdown items
              const totalSum = categoryBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);
              const itemsWithAdjustedPercentages = categoryBreakdown.map((item) => ({
                ...item,
                percentage: totalSum > 0 ? (item.totalAmount / totalSum) * 100 : 0,
              }));

              return (
                <>
                  <DonutChart items={itemsWithAdjustedPercentages} centerLabel="Tổng danh mục" />

                  {/* Budget Utilization Section */}
                  {(() => {
                    const budgetItems = itemsWithAdjustedPercentages
                      .map((item) => {
                        const category = categories.find((c) => c.id === item.categoryId);
                        if (category && category.budgetLimit) {
                          const utilization = (item.totalAmount / category.budgetLimit) * 100;
                          return {
                            ...item,
                            budgetLimit: category.budgetLimit,
                            utilization,
                          };
                        }
                        return null;
                      })
                      .filter((item): item is NonNullable<typeof item> => item !== null);

                    if (budgetItems.length === 0) return null;

                    return (
                      <div className="mt-6 pt-6">
                        <h4 className="text-sm font-semibold text-[color:var(--text-main)] mb-4">
                          Hạn mức chi tiêu
                        </h4>
                        <div className="flex flex-col gap-4">
                          {budgetItems.map((item) => {
                            let progressColor = 'bg-emerald-500';
                            let textColor = 'text-emerald-400';
                            if (item.utilization >= 80 && item.utilization <= 100) {
                              progressColor = 'bg-amber-500';
                              textColor = 'text-amber-400';
                            } else if (item.utilization > 100) {
                              progressColor = 'bg-rose-500';
                              textColor = 'text-rose-400';
                            }

                            return (
                              <div key={item.categoryId} className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-medium">
                                  <span className="text-[color:var(--text-main)]">
                                    {item.categoryName}
                                  </span>
                                  <span className={textColor}>
                                    Đã dùng {item.utilization.toFixed(1)}% ngân sách (Hạn mức:{' '}
                                    {item.budgetLimit.toLocaleString('vi-VN')}đ)
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${progressColor} transition-all duration-500`}
                                    style={{ width: `${Math.min(item.utilization, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              );
            })()}
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="glass-card activities-card">
          <div className="card-header">
            <h3>Hoạt động Gần đây</h3>
            <div className="dashboard-tab-group">
              <button
                className={`dashboard-tab-btn ${txnFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setTxnFilter('ALL')}
              >
                Tất cả
              </button>
              <button
                className={`dashboard-tab-btn ${txnFilter === TransactionType.EXPENSE ? 'active' : ''}`}
                onClick={() => setTxnFilter(TransactionType.EXPENSE)}
              >
                Chi tiêu
              </button>
              <button
                className={`dashboard-tab-btn ${txnFilter === TransactionType.INCOME ? 'active' : ''}`}
                onClick={() => setTxnFilter(TransactionType.INCOME)}
              >
                Thu nhập
              </button>
              <button
                className={`dashboard-tab-btn ${txnFilter === TransactionType.INVESTMENT ? 'active' : ''}`}
                onClick={() => setTxnFilter(TransactionType.INVESTMENT)}
              >
                Đầu tư
              </button>
            </div>
          </div>
          <div className="activity-list">
            {(() => {
              const filteredTxns = allTransactions
                .filter((txn) => txnFilter === 'ALL' || txn.type === txnFilter)
                .sort((a, b) => compareDatesDesc(a.transactionDate, b.transactionDate))
                .slice(0, 5);

              if (filteredTxns.length === 0) {
                return <p className="no-data">Không tìm thấy giao dịch nào.</p>;
              }

              return filteredTxns.map((txn) => {
                const isIncome = txn.type === TransactionType.INCOME;
                const isInvestment = txn.type === TransactionType.INVESTMENT;
                const amountClass = isIncome
                  ? 'txn-income'
                  : isInvestment
                    ? 'txn-investment'
                    : 'txn-expense';
                const prefix = isIncome ? '+' : isInvestment ? '📊 ' : '-';

                return (
                  <div key={txn.id} className="activity-item animate-fade-in">
                    <div className="activity-details">
                      <span className="activity-title">{txn.description || 'Giao dịch'}</span>
                      <div className="activity-meta">
                        <span className="activity-category">
                          {txn.categoryName || 'Chưa phân loại'}
                        </span>
                        <span className="activity-dot">•</span>
                        <span className="activity-date">{formatDate(txn.transactionDate)}</span>
                      </div>
                    </div>
                    <div className="activity-value">
                      <span className={`txn-amount ${amountClass}`}>
                        {prefix}
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
