import moment from 'moment';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import type {
  Category,
  CategoryBreakdownItem,
  SummaryReport,
  TargetSummaryResponse,
} from '../commons/types';
import { formatCurrency } from '../commons/utils';
import {
  categoryService,
  reportService,
  targetService,
  transactionService,
  debtService,
} from '../services/api';
import type { DebtSummary } from '../types/debt';
import { QuickInputModal } from './QuickInputModal';
import './Dashboard.css';
import { DonutChart } from './DonutChart';

const api = {
  reports: reportService,
  transactions: transactionService,
  categories: categoryService,
  targets: targetService,
};

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isQuickInputOpen, setIsQuickInputOpen] = useState<boolean>(false);

  const fetchDashboardData = async (monthStr: string) => {
    try {
      setLoading(true);
      setError(null);

      const m = moment(monthStr, 'YYYY-MM');
      const startOfMonth = m.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = m.endOf('month').format('YYYY-MM-DD');
      const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };
      const targetParams = { month: m.month() + 1, year: m.year() };

      // Fetch summary, category breakdown, targets, and debt summary
      const [summaryData, allTimeData, breakdownData, categoriesData, targetData, debtData] =
        await Promise.all([
          api.reports.summary(dateFilters),
          api.reports.summary({ allTime: true }),
          api.reports.categoryBreakdown(dateFilters),
          api.categories.list(),
          api.targets.getSummary(targetParams).catch(() => null),
          debtService.getSummary().catch(() => null),
        ]);

      setSummary(summaryData);
      setAllTimeSummary(allTimeData);
      setCategoryBreakdown(breakdownData.items || []);
      setCategories(categoriesData.items || []);
      setTargetSummary(targetData);
      setDebtSummary(debtData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard analytics');
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

    return () => {
      window.removeEventListener('transactions-changed', handleDataChanged);
      window.removeEventListener('categories-changed', handleDataChanged);
      window.removeEventListener('targets-changed', handleDataChanged);
      window.removeEventListener('debts-changed', handleDataChanged);
    };
  }, [selectedMonth]);

  // All-time metrics adjusted by Debt & Loan module (Net Assets = AllTimeNet + Receivables - Payables)
  // All-time metrics: Total Assets = Total Income + Active Investment + Receivables - Total Expense - Payables
  const allTimeIncome = allTimeSummary?.totalIncome ?? 0;
  const allTimeExpense = allTimeSummary?.totalExpense ?? 0;
  const allTimeInvestment = allTimeSummary?.totalInvestment ?? 0;
  const debtPayable = debtSummary?.totalPayable ?? 0;
  const debtReceivable = debtSummary?.totalReceivable ?? 0;
  const allTimeNetAssets =
    allTimeIncome + allTimeInvestment + debtReceivable - allTimeExpense - debtPayable;
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header animate-fade-in">
        <div>
          <h2>Bảng điều khiển Phân tích</h2>
          <p className="subtitle">Hiệu suất tài chính và phân tích chi tiết thời gian thực</p>
        </div>
        <div className="dashboard-header-actions">
          <button
            onClick={() => setIsQuickInputOpen(true)}
            className="btn btn-primary dashboard-nlp-btn"
          >
            <span>🤖 Nhập nhanh NLP</span>
          </button>
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
      </div>

      <QuickInputModal
        isOpen={isQuickInputOpen}
        onClose={() => setIsQuickInputOpen(false)}
        onTransactionCreated={() => fetchDashboardData(selectedMonth)}
      />

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

      {/* Top Priority Section: Monthly Financial Overview & Targets */}
      <div className="glass-card dashboard-section animate-fade-in">
        <h3 className="dashboard-section-title">
          <span>Kết quả Tài chính Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}</span>
        </h3>

        {/* Summary Cards Grid */}
        <div className="summary-cards" style={{ marginBottom: '1.25rem' }}>
          <div
            className="summary-stat-card accent-income clickable-card"
            onClick={() => onNavigate?.('income')}
            title="Xem quản lý Thu nhập"
          >
            <div className="summary-stat-header">
              <span className="summary-stat-title">Tổng Thu nhập ↗</span>
              <div className="summary-stat-icon icon-income">💵</div>
            </div>
            <div className="summary-stat-value value-income">{formatCurrency(totalIncome)}</div>
            <div className="summary-stat-subtitle">Dòng tiền thu về trong tháng</div>
          </div>

          <div
            className="summary-stat-card accent-expense clickable-card"
            onClick={() => onNavigate?.('expenses')}
            title="Xem quản lý Chi tiêu"
          >
            <div className="summary-stat-header">
              <span className="summary-stat-title">Tổng Chi tiêu ↗</span>
              <div className="summary-stat-icon icon-expense">🛍️</div>
            </div>
            <div className="summary-stat-value value-expense">{formatCurrency(totalExpense)}</div>
            <div className="summary-stat-subtitle">Tổng tiền đã chi tiêu</div>
          </div>

          <div className="summary-stat-card accent-purple">
            <div className="summary-stat-header">
              <span className="summary-stat-title">Tổng Tài sản Tích lũy</span>
              <div className="summary-stat-icon icon-purple">💎</div>
            </div>
            <div
              className={`summary-stat-value ${allTimeNetAssets >= 0 ? 'positive-balance' : 'negative-balance'}`}
            >
              {formatCurrency(allTimeNetAssets)}
            </div>
            <div className="summary-stat-subtitle">
              {debtPayable > 0
                ? `Đã trừ nợ phải trả (${formatCurrency(debtPayable)})`
                : 'Bao gồm thu nhập, đầu tư & các khoản nợ/vay'}
            </div>
          </div>
        </div>

        {/* Target Analytics Section inside Monthly Card */}
        <div className="target-cards-grid">
          {/* Monthly Expense Target Card */}
          <div
            className={`glass-card target-card clickable-card ${targetSummary?.expense?.isOverBudget ? 'over-budget' : ''}`}
            onClick={() => onNavigate?.('targets')}
            title="Xem Quản lý Mục tiêu tài chính"
          >
            <div className="target-card-header">
              <div className="target-card-title">
                <span className="target-name">Hạn mức Chi tiêu Tháng ↗</span>
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
          <div
            className="glass-card target-card clickable-card"
            onClick={() => onNavigate?.('targets')}
            title="Xem Quản lý Mục tiêu tài chính"
          >
            <div className="target-card-header">
              <div className="target-card-title">
                <span className="target-name">Mục Tiêu Đầu Tư Tháng ↗</span>
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

      {/* Second Section: Investment & Debt / Loan Overview */}
      <div className="glass-card dashboard-section animate-fade-in">
        <h3
          className="dashboard-section-title clickable-title"
          onClick={() => onNavigate?.('debts')}
          title="Bấm để chuyển sang Quản lý Vay & Nợ hoặc Đầu tư"
        >
          <span>Tổng quan Đầu tư & Vay Nợ ↗</span>
        </h3>

        <div className="summary-cards">
          <div
            className="summary-stat-card accent-primary clickable-card"
            onClick={() => onNavigate?.('investment')}
            title="Xem Quản lý Đầu tư"
          >
            <div className="summary-stat-header">
              <span className="summary-stat-title">Đầu tư Từ Trước Đến Giờ ↗</span>
              <div className="summary-stat-icon icon-primary">📈</div>
            </div>
            <div className="summary-stat-value value-primary">
              {formatCurrency(allTimeSummary?.totalInvestment ?? 0)}
            </div>
            <div className="summary-stat-subtitle">
              Đầu tư tháng này: {formatCurrency(summary?.totalInvestment ?? 0)}
            </div>
          </div>

          <div
            className="summary-stat-card accent-expense clickable-card"
            onClick={() => onNavigate?.('debts')}
            title="Bấm để xem chi tiết khoản vay/nợ"
          >
            <div className="summary-stat-header">
              <span className="summary-stat-title">Tôi Nợ (Phải Trả) ↗</span>
              <div className="summary-stat-icon icon-payable">💸</div>
            </div>
            <div className="summary-stat-value value-payable">
              {debtSummary ? formatCurrency(debtSummary.totalPayable) : '0 đ'}
            </div>
            <div className="summary-stat-subtitle">Tổng tiền đang nợ người khác / ngân hàng</div>
          </div>

          <div
            className="summary-stat-card accent-income clickable-card"
            onClick={() => onNavigate?.('debts')}
            title="Bấm để xem chi tiết khoản cho vay"
          >
            <div className="summary-stat-header">
              <span className="summary-stat-title">Người Khác Nợ (Phải Thu) ↗</span>
              <div className="summary-stat-icon icon-receivable">💰</div>
            </div>
            <div className="summary-stat-value value-receivable">
              {debtSummary ? formatCurrency(debtSummary.totalReceivable) : '0 đ'}
            </div>
            <div className="summary-stat-subtitle">Tổng tiền cho vay / cần thu về</div>
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Card */}
      <div className="animate-fade-in" style={{ width: '100%' }}>
        {/* Category Breakdown Card */}
        <div className="glass-card breakdown-card" style={{ width: '100%' }}>
          <div className="card-header flex-col sm:flex-row gap-3">
            <h3
              className="clickable-title"
              onClick={() => onNavigate?.('categories')}
              title="Xem Quản lý Danh mục"
            >
              Phân tích Danh mục ↗
            </h3>
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
      </div>
    </div>
  );
}
