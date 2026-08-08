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
      const [summaryData, breakdownData, transactionsData, categoriesData, targetData] =
        await Promise.all([
          api.reports.summary(dateFilters),
          api.reports.categoryBreakdown(dateFilters),
          api.transactions.list(dateFilters),
          api.categories.list(),
          api.targets.getSummary(targetParams).catch(() => null),
        ]);

      setSummary(summaryData);
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

  // Calculate Net Balance dynamically if not loaded or if summary doesn't exist
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const totalInvestment =
    summary?.totalInvestment ??
    allTransactions
      .filter((t) => t.type === TransactionType.INVESTMENT)
      .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = summary?.netBalance ?? totalIncome - totalExpense;

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
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="month-filter-svg"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            )}
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

      {/* Summary Cards Grid */}
      <div className="summary-cards animate-fade-in">
        <div className="glass-panel-interactive summary-card income-card">
          <div className="card-accent-border income-accent"></div>
          <div className="card-content">
            <div className="card-header-with-icon">
              <span className="card-label">Tổng Thu nhập</span>
              <span className="card-icon-wrapper income-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="12" x="2" y="6" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </span>
            </div>
            <h3 className="card-value">{formatCurrency(totalIncome)}</h3>
            <div className="card-trend upward">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
              <span>Dòng tiền Ổn định</span>
            </div>
          </div>
        </div>

        <div className="glass-panel-interactive summary-card expense-card">
          <div className="card-accent-border expense-accent"></div>
          <div className="card-content">
            <div className="card-header-with-icon">
              <span className="card-label">Tổng Chi tiêu</span>
              <span className="card-icon-wrapper expense-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
            </div>
            <h3 className="card-value">{formatCurrency(totalExpense)}</h3>
            <div className="card-trend downward">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                <polyline points="17 18 23 18 23 12"></polyline>
              </svg>
              <span>Kiểm soát Chi tiêu</span>
            </div>
          </div>
        </div>

        <div className="glass-panel-interactive summary-card investment-card">
          <div className="card-accent-border investment-accent"></div>
          <div className="card-content">
            <div className="card-header-with-icon">
              <span className="card-label">Tổng Đầu tư</span>
              <span className="card-icon-wrapper investment-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                </svg>
              </span>
            </div>
            <h3 className="card-value">{formatCurrency(totalInvestment)}</h3>
            <div className="card-trend info">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <path d="m19 9-5 5-4-4-3 3" />
                <path d="M3 3v18h18" />
              </svg>
              <span>Tích lũy Tài sản</span>
            </div>
          </div>
        </div>

        <div className="glass-panel-interactive summary-card balance-card">
          <div className="card-accent-border balance-accent"></div>
          <div className="card-content">
            <div className="card-header-with-icon">
              <span className="card-label">Số dư Ròng</span>
              <span className="card-icon-wrapper balance-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
            </div>
            <h3
              className={`card-value ${netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}
            >
              {formatCurrency(netBalance)}
            </h3>
            <div className="card-trend info">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>Tình hình Chung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Analytics Section */}
      <div
        className="target-section animate-fade-in"
        style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              🎯 Mục tiêu Tài chính Tháng
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Theo dõi tiến độ chi tiêu & đầu tư cá nhân
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Monthly Expense Target Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: '1rem',
              position: 'relative',
              border: targetSummary?.expense?.isOverBudget
                ? '1px solid #ef4444'
                : '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🛒</span>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Hạn mức Chi tiêu Tháng</span>
              </div>
              {targetSummary?.expense?.isOverBudget ? (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                  }}
                >
                  🚨 Vượt hạn mức
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {targetSummary?.expense?.targetAmount
                    ? `${Math.min(100, Math.round((targetSummary.expense.spentAmount / targetSummary.expense.targetAmount) * 100))}% đã chi`
                    : 'Chưa đặt mục tiêu'}
                </span>
              )}
            </div>

            {targetSummary?.expense?.targetAmount ? (
              <>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (targetSummary.expense.spentAmount / targetSummary.expense.targetAmount) * 100)}%`,
                      background: targetSummary.expense.isOverBudget
                        ? '#ef4444'
                        : 'linear-gradient(90deg, #10b981, #f59e0b)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hạn mức</div>
                    <div style={{ fontWeight: 600 }}>
                      {formatCurrency(targetSummary.expense.targetAmount)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã chi</div>
                    <div style={{ fontWeight: 600 }}>
                      {formatCurrency(targetSummary.expense.spentAmount)}
                    </div>
                  </div>
                </div>

                {targetSummary.expense.isOverBudget ? (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                      color: '#ef4444',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      🚨 Bạn đã chi vượt quá hạn mức!
                    </div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      Vượt mức:{' '}
                      <strong>{formatCurrency(targetSummary.expense.overspentAmount)}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 600 }}>
                      ⚠️ Hạn mức chi tiêu mỗi ngày còn lại: 0 đ
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.3rem',
                      }}
                    >
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Còn lại có thể chi:
                      </span>
                      <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>
                        {formatCurrency(targetSummary.expense.remainingAmount)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>📅</span>
                      <span>
                        Gợi ý chi mỗi ngày ({targetSummary.daysRemaining} ngày còn lại):{' '}
                        <strong style={{ color: 'var(--primary)' }}>
                          {formatCurrency(Math.round(targetSummary.expense.dailyAllowance))}/ngày
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '1rem 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Bấm vào nút bên trên để đặt hạn mức chi tiêu cho tháng này.
              </div>
            )}
          </div>

          {/* Monthly Investment Target Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: '1rem',
              position: 'relative',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📈</span>
                <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Mục Tiêu Đầu Tư Tháng</span>
              </div>
              {targetSummary?.investment?.isTargetReached ? (
                <span
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                  }}
                >
                  🎉 Đã hoàn thành
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {targetSummary?.investment?.targetAmount
                    ? `${Math.min(100, Math.round((targetSummary.investment.investedAmount / targetSummary.investment.targetAmount) * 100))}% hoàn thành`
                    : 'Chưa đặt mục tiêu'}
                </span>
              )}
            </div>

            {targetSummary?.investment?.targetAmount ? (
              <>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, (targetSummary.investment.investedAmount / targetSummary.investment.targetAmount) * 100)}%`,
                      background: targetSummary.investment.isTargetReached
                        ? '#10b981'
                        : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.9rem',
                    marginBottom: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mục tiêu</div>
                    <div style={{ fontWeight: 600 }}>
                      {formatCurrency(targetSummary.investment.targetAmount)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã đầu tư</div>
                    <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                      {formatCurrency(targetSummary.investment.investedAmount)}
                    </div>
                  </div>
                </div>

                {targetSummary.investment.isTargetReached ? (
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                      color: '#10b981',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      🎉 Đã hoàn thành mục tiêu đầu tư!
                    </div>
                    {targetSummary.investment.surplusAmount > 0 && (
                      <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        Vượt chỉ tiêu:{' '}
                        <strong>+{formatCurrency(targetSummary.investment.surplusAmount)}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Số tiền còn thiếu:
                    </span>
                    <span style={{ fontWeight: 700, color: '#3b82f6', fontSize: '0.95rem' }}>
                      {formatCurrency(targetSummary.investment.remainingAmount)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '1rem 0',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                }}
              >
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
