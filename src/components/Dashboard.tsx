import { useState, useEffect } from 'react';
import { reportService, transactionService, categoryService } from '../services/api';
import { TransactionType } from '../commons/constants';
import type { Transaction, SummaryReport, CategoryBreakdownItem, Category } from '../commons/types';
import { formatCurrency, formatDate, compareDatesDesc } from '../commons/utils';
import { DonutChart } from './DonutChart';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import './Dashboard.css';

const api = {
  reports: reportService,
  transactions: transactionService,
  categories: categoryService,
};

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  const [summary, setSummary] = useState<SummaryReport | null>(null);
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

      const startOfMonth = moment(monthStr, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
      const endOfMonth = moment(monthStr, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');
      const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };

      // Fetch summary and category breakdown using the api wrapper
      const [summaryData, breakdownData, transactionsData, categoriesData] = await Promise.all([
        api.reports.summary(dateFilters),
        api.reports.categoryBreakdown(dateFilters),
        api.transactions.list(dateFilters),
        api.categories.list(),
      ]);

      setSummary(summaryData);
      setCategoryBreakdown(breakdownData.items || []);
      setCategories(categoriesData || []);
      setAllTransactions(transactionsData || []);
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
