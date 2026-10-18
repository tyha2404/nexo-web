import moment from 'moment';
import type { SummaryReport, TargetSummaryResponse } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import type { DebtSummary } from '../../types/debt';

interface HeroCashflowCardProps {
  selectedMonth: string;
  summary: SummaryReport | null;
  allTimeSummary: SummaryReport | null;
  targetSummary: TargetSummaryResponse | null;
  debtSummary: DebtSummary | null;
  onNavigate?: (tab: string) => void;
}

export function HeroCashflowCard({
  selectedMonth,
  summary,
  allTimeSummary,
  targetSummary,
  debtSummary,
  onNavigate,
}: HeroCashflowCardProps) {
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
            className={`net-assets-value ${availableCash >= 0 ? 'text-income' : 'text-expense'}`}
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
            <span className="submetric-number text-income" title={formatCurrency(totalIncome)}>
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
            <span className="submetric-number text-expense" title={formatCurrency(totalExpense)}>
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
                Chưa đặt hạn mức chi tiêu tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}
                .
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
  );
}
