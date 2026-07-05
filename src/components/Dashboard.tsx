import { useState, useEffect } from 'react';
import { reportService, costService, categoryService } from '../services/api';
import type { Cost, SummaryReport, CategoryBreakdownItem } from '../services/api';
import './Dashboard.css';

// Aliasing as requested to fetch summary data using api.reports.summary(), categoryBreakdown using api.reports.categoryBreakdown(), and api.costs.list()
const api = {
  reports: reportService,
  costs: costService,
  categories: categoryService,
};

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [recentCosts, setRecentCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary and category breakdown using the api wrapper
      const [summaryData, breakdownData, costsData] = await Promise.all([
        api.reports.summary(),
        api.reports.categoryBreakdown(),
        api.costs.list(),
      ]);

      setSummary(summaryData);
      setCategoryBreakdown(breakdownData.items || []);

      // Sort costs by incurredAt descending to get the most recent transactions
      const sorted = [...costsData].sort(
        (a, b) => new Date(b.incurredAt).getTime() - new Date(a.incurredAt).getTime()
      );
      setRecentCosts(sorted.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
  const netBalance = summary?.netBalance ?? (totalIncome - totalExpense);

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
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
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
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
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
            <h3 className={`card-value ${netBalance >= 0 ? 'positive-balance' : 'negative-balance'}`}>
              {formatCurrency(netBalance)}
            </h3>
            <div className="card-trend info">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
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
          <div className="card-header">
            <h3>Phân tích theo Danh mục</h3>
            <span className="header-badge">Theo Danh mục</span>
          </div>
          <div className="breakdown-list">
            {categoryBreakdown.length === 0 ? (
              <p className="no-data">Chưa có danh mục chi tiêu nào để hiển thị.</p>
            ) : (
              categoryBreakdown.map((item, index) => {
                // Color palette gradient per category row
                const hue = (index * 45) % 360;
                const strokeColor = `hsl(${hue}, 85%, 60%)`;
                const glowColor = `hsl(${hue}, 85%, 60%, 0.3)`;

                return (
                  <div key={item.categoryId || index} className="breakdown-item animate-fade-in">
                    <div className="breakdown-info">
                      <span className="category-name">{item.categoryName}</span>
                      <span className="category-amount">{formatCurrency(item.totalAmount)}</span>
                    </div>

                    {/* Premium SVG Progress Bar with Custom HSL Gradient and Glow */}
                    <div className="progress-container">
                      <svg width="100%" height="8" className="svg-progress-bar" style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}>
                        <rect x="0" y="0" width="100%" height="8" rx="4" fill="rgba(255, 255, 255, 0.05)" />
                        <rect
                          x="0"
                          y="0"
                          width={`${Math.min(Math.max(item.percentage, 0), 100)}%`}
                          height="8"
                          rx="4"
                          fill={strokeColor}
                          className="progress-fill-animate"
                        />
                      </svg>
                      <span className="percentage-badge" style={{ color: strokeColor }}>
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Transactions Card */}
        <div className="glass-card activities-card">
          <div className="card-header">
            <h3>Hoạt động Gần đây</h3>
            <span className="header-badge">5 giao dịch gần nhất</span>
          </div>
          <div className="activity-list">
            {recentCosts.length === 0 ? (
              <p className="no-data">Không tìm thấy giao dịch gần đây.</p>
            ) : (
              recentCosts.map((cost) => (
                <div key={cost.id} className="activity-item animate-fade-in">
                  <div className="activity-details">
                    <span className="activity-title">{cost.title}</span>
                    <div className="activity-meta">
                      <span className="activity-category">{cost.categoryName || 'Chưa phân loại'}</span>
                      <span className="activity-dot">•</span>
                      <span className="activity-date">{formatDate(cost.incurredAt)}</span>
                    </div>
                  </div>
                  <div className="activity-value">
                    <span className="txn-amount">{formatCurrency(cost.amount, cost.currency)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
