import { useState, useEffect } from 'react';
import { reportService, transactionService, categoryService } from '../services/api';
import { TransactionType } from '../commons/constants';
import type { Transaction, SummaryReport, CategoryBreakdownItem, Category } from '../commons/types';
import { formatCurrency, formatDate, compareDatesDesc } from '../commons/utils';
import { DonutChart } from './DonutChart';
import './Dashboard.css';

const api = {
  reports: reportService,
  transactions: transactionService,
  categories: categoryService,
};

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter tabs for visualization
  const [chartTab, setChartTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [txnFilter, setTxnFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary and category breakdown using the api wrapper
      const [summaryData, breakdownData, transactionsData, categoriesData] = await Promise.all([
        api.reports.summary(),
        api.reports.categoryBreakdown(),
        api.transactions.list(),
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
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Đang tải phân tích và báo cáo tài chính...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchDashboardData} className="btn btn-secondary btn-retry">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Calculate Net Balance dynamically if not loaded or if summary doesn't exist
  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const netBalance = summary?.netBalance ?? totalIncome - totalExpense;

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header animate-fade-in">
        <h2>Bảng điều khiển Phân tích</h2>
        <p className="subtitle">Hiệu suất tài chính và phân tích chi tiết thời gian thực</p>
      </div>

      {/* Summary Cards Grid */}
      <div className="summary-cards animate-fade-in">
        <div className="summary-card income-card">
          <div className="card-glow-bg"></div>
          <div className="card-content">
            <span className="card-label">Tổng Thu nhập</span>
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

        <div className="summary-card expense-card">
          <div className="card-glow-bg"></div>
          <div className="card-content">
            <span className="card-label">Tổng Chi tiêu</span>
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

        <div className="summary-card balance-card">
          <div className="card-glow-bg"></div>
          <div className="card-content">
            <span className="card-label">Số dư Ròng</span>
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
            <div className="dashboard-tab-group">
              <button
                className={`dashboard-tab-btn ${chartTab === 'EXPENSE' ? 'active' : ''}`}
                onClick={() => setChartTab('EXPENSE')}
              >
                Chi tiêu
              </button>
              <button
                className={`dashboard-tab-btn ${chartTab === 'INCOME' ? 'active' : ''}`}
                onClick={() => setChartTab('INCOME')}
              >
                Thu nhập
              </button>
            </div>
          </div>
          <div className="p-4">
            {(() => {
              const filteredBreakdown = categoryBreakdown.filter((item) => {
                const category = categories.find((c) => c.id === item.categoryId);
                return category ? category.type === chartTab : false;
              });

              // Re-calculate percentages for this specific breakdown tab
              const tabTotal = filteredBreakdown.reduce((sum, item) => sum + item.totalAmount, 0);
              const itemsWithAdjustedPercentages = filteredBreakdown.map((item) => ({
                ...item,
                percentage: tabTotal > 0 ? (item.totalAmount / tabTotal) * 100 : 0,
              }));

              return (
                <>
                  <DonutChart
                    items={itemsWithAdjustedPercentages}
                    centerLabel={chartTab === 'EXPENSE' ? 'Tổng chi tiêu' : 'Tổng thu nhập'}
                  />

                  {/* Budget Utilization Section (only for EXPENSE chartTab) */}
                  {chartTab === 'EXPENSE' &&
                    (() => {
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
                        <div className="mt-6 pt-6 border-t border-slate-700/50">
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
          <div className="card-header flex-col sm:flex-row gap-3">
            <h3>Hoạt động Gần đây</h3>
            <div className="dashboard-tab-group">
              <button
                className={`dashboard-tab-btn ${txnFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setTxnFilter('ALL')}
              >
                Tất cả
              </button>
              <button
                className={`dashboard-tab-btn ${txnFilter === 'EXPENSE' ? 'active' : ''}`}
                onClick={() => setTxnFilter('EXPENSE')}
              >
                Chi tiêu
              </button>
              <button
                className={`dashboard-tab-btn ${txnFilter === 'INCOME' ? 'active' : ''}`}
                onClick={() => setTxnFilter('INCOME')}
              >
                Thu nhập
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
                      <span className={`txn-amount ${isIncome ? 'txn-income' : 'txn-expense'}`}>
                        {isIncome ? '+' : '-'}
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
