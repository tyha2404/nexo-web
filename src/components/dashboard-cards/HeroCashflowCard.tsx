import moment from 'moment';
import type { SummaryReport, TargetSummaryResponse } from '../../commons/types';
import { formatCurrency } from '../../commons/utils';
import type { DebtSummary } from '../../types/debt';
import { BLOCK_GAP, cx, GLASS_CARD, MONEY, MOTION_ENTER, SUB_TILE } from '../ui';

// Groups inside the hero are SUB_TILEs (filled, no border): cards never nest.
const submetricCls = cx(
  SUB_TILE,
  'flex cursor-pointer items-center gap-2 transition-colors duration-100 ease-out [&:hover]:bg-hover'
);
const submetricTitleCls =
  'overflow-hidden text-[0.725rem] font-semibold text-ellipsis whitespace-nowrap text-muted';
const submetricNumberCls = cx(
  MONEY,
  'overflow-hidden text-[0.95rem] text-ellipsis whitespace-nowrap'
);
const progressBoxCls = cx(SUB_TILE, 'flex flex-col justify-between');
const statusBadgeCls =
  'inline-flex items-center gap-[0.3rem] rounded-full px-2 py-[0.15rem] text-[0.7rem] font-bold tracking-[0.02em] whitespace-nowrap';
const setLinkCls =
  'inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[0.875rem] font-semibold text-primary hover:underline';
const trackCls =
  'mb-2 h-[7px] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)] light:bg-[rgba(0,0,0,0.06)]';
const barCls =
  'origin-left motion-safe:animate-[nexo-progress-enter_480ms_var(--motion-ease)_backwards] h-full rounded-full transition-[width] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]';
const linkActionCls =
  'cursor-pointer border-none bg-transparent p-0 text-[0.8rem] font-semibold text-primary underline underline-offset-2 hover:text-primary-hover';

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
    <div
      className={cx(
        GLASS_CARD,
        MOTION_ENTER,
        BLOCK_GAP,
        'relative overflow-hidden light:bg-white light:[&:hover]:border-line'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mobile:flex-col mobile:items-start mobile:gap-[0.35rem]">
        <div className="hero-flow-info">
          <div className="mb-1 inline-flex items-center gap-[0.35rem] align-middle text-[0.75rem] leading-[1.2] font-semibold tracking-[0.05em] text-muted uppercase">
            <span>Dòng tiền Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className={`${MONEY} text-[length:clamp(1.6rem,2.8vw,2.2rem)] leading-[1.1] ${
                monthlyNetCashFlow >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {monthlyNetCashFlow > 0 ? '+' : ''}
              {formatCurrency(monthlyNetCashFlow)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end text-right mobile:w-full mobile:items-start mobile:[border-top:1px_dashed_var(--border)] mobile:pt-[0.35rem] mobile:text-left">
          <div className="mb-1 inline-flex items-center gap-[0.35rem] align-middle text-[0.75rem] leading-[1.2] font-semibold tracking-[0.04em] text-muted uppercase">
            <span>Tiền khả dụng thực tế</span>
          </div>
          <div
            className={`${MONEY} text-[length:clamp(1.15rem,1.8vw,1.45rem)] whitespace-nowrap ${availableCash >= 0 ? 'text-income' : 'text-expense'}`}
            title={`Tiền mặt khả dụng: ${formatCurrency(availableCash)}`}
          >
            {formatCurrency(availableCash)}
          </div>
          <div className="mt-[0.35rem] inline-flex items-center gap-[0.35rem] rounded-sm border border-line bg-input px-2 py-[0.15rem] text-[0.75rem] text-muted mobile:px-[0.45rem]">
            <span>Tổng tài sản:</span>
            <strong className={cx(MONEY, 'text-primary')}>{formatCurrency(totalNetWorth)}</strong>
          </div>
        </div>
      </div>

      {/* Hero Sub-metrics Row */}
      <div className="mt-2 grid grid-cols-[repeat(3,1fr)] gap-2 border-t border-line pt-2 mobile:mt-[0.35rem] mobile:grid-cols-[1fr] mobile:gap-[0.35rem] mobile:pt-[0.35rem]">
        <div
          className={`metric-income ${submetricCls}`}
          onClick={() => onNavigate?.('income')}
          title="Xem chi tiết Thu nhập"
        >
          <div className="flex min-w-0 flex-col gap-[0.1rem] text-left">
            <span className={submetricTitleCls}>Tổng Thu nhập ↗</span>
            <span
              className={`${submetricNumberCls} text-income`}
              title={formatCurrency(totalIncome)}
            >
              +{formatCurrency(totalIncome)}
            </span>
          </div>
        </div>

        <div
          className={`metric-expense ${submetricCls}`}
          onClick={() => onNavigate?.('expenses')}
          title="Xem chi tiết Chi tiêu"
        >
          <div className="flex min-w-0 flex-col gap-[0.1rem] text-left">
            <span className={submetricTitleCls}>Tổng Chi tiêu ↗</span>
            <span
              className={`${submetricNumberCls} text-expense`}
              title={formatCurrency(totalExpense)}
            >
              -{formatCurrency(totalExpense)}
            </span>
          </div>
        </div>

        <div
          className={`metric-invest ${submetricCls}`}
          onClick={() => onNavigate?.('investment')}
          title="Xem chi tiết Đầu tư"
        >
          <div className="flex min-w-0 flex-col gap-[0.1rem] text-left">
            <span className={submetricTitleCls}>Tổng Đầu tư ↗</span>
            <span
              className={submetricNumberCls}
              title={formatCurrency(summary?.totalInvestment ?? 0)}
            >
              {formatCurrency(summary?.totalInvestment ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Budget & Investment Progress Section */}
      <div className="mt-2 grid grid-cols-[repeat(2,1fr)] gap-2 mobile:mt-[0.35rem] mobile:grid-cols-[1fr] mobile:gap-[0.35rem]">
        {/* 1. Expense Budget Progress */}
        <div className={progressBoxCls}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-[0.4rem] text-[0.8125rem] font-semibold text-main">
              Hạn mức Ngân sách Chi tiêu
            </span>
            {budgetLimit > 0 ? (
              <span
                className={`${statusBadgeCls} ${
                  isOverBudget
                    ? 'bg-[color-mix(in_srgb,var(--expense)_15%,transparent)] text-expense'
                    : budgetPercent >= 80
                      ? 'bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning'
                      : ''
                }`}
              >
                {isOverBudget
                  ? `Vượt +${formatCurrency(targetSummary?.expense?.overspentAmount ?? 0)}`
                  : `Đã chi ${budgetPercent}%`}
              </span>
            ) : (
              <button type="button" className={setLinkCls} onClick={() => onNavigate?.('targets')}>
                + Đặt hạn mức ↗
              </button>
            )}
          </div>

          {budgetLimit > 0 ? (
            <>
              <div className={trackCls}>
                <div
                  className={`${barCls} ${
                    isOverBudget ? 'bg-expense' : budgetPercent >= 80 ? 'bg-warning' : 'bg-income'
                  }`}
                  style={{ width: `${Math.min(100, budgetPercent)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.875rem] text-muted">
                <span>
                  Đã chi: <strong>{formatCurrency(budgetSpent)}</strong> /{' '}
                  {formatCurrency(budgetLimit)}
                </span>
                {targetSummary?.expense?.dailyAllowance !== undefined &&
                targetSummary.expense.dailyAllowance > 0 &&
                !isOverBudget ? (
                  <span className="text-primary">
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
            <div className="flex items-center justify-between text-[0.8rem] text-muted">
              <span>
                Chưa đặt hạn mức chi tiêu tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}
                .
              </span>
              <button
                type="button"
                className={linkActionCls}
                onClick={() => onNavigate?.('targets')}
              >
                Thiết lập
              </button>
            </div>
          )}
        </div>

        {/* 2. Monthly Investment Target Progress */}
        <div className={progressBoxCls}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-[0.4rem] text-[0.8125rem] font-semibold text-main">
              Mục tiêu Đầu tư Tháng
            </span>
            {investmentTarget > 0 ? (
              <span
                className={`${statusBadgeCls} ${
                  isInvestReached
                    ? ''
                    : investPercent >= 50
                      ? 'bg-primary-glow text-primary'
                      : 'bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning'
                }`}
              >
                {isInvestReached
                  ? `Đạt mục tiêu 🎉 (+${formatCurrency(investSurplus)})`
                  : `Đã đạt ${investPercent}% (Thiếu ${formatCurrency(investRemaining)})`}
              </span>
            ) : (
              <button type="button" className={setLinkCls} onClick={() => onNavigate?.('targets')}>
                + Đặt mục tiêu đầu tư ↗
              </button>
            )}
          </div>

          {investmentTarget > 0 ? (
            <>
              <div className={trackCls}>
                <div
                  className={`${barCls} bg-primary`}
                  style={{ width: `${Math.min(100, investPercent)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[0.875rem] text-muted">
                <span>
                  Đã đầu tư: <strong>{formatCurrency(investedAmount)}</strong> /{' '}
                  {formatCurrency(investmentTarget)}
                </span>
                {isInvestReached && (
                  <span style={{ color: 'var(--income)', fontWeight: 600 }}>
                    Vượt chỉ tiêu: <strong>+{formatCurrency(investSurplus)}</strong> 🎉
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between text-[0.8rem] text-muted">
              <span>
                Chưa đặt mục tiêu tích lũy/đầu tư tháng{' '}
                {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}.
              </span>
              <button
                type="button"
                className={linkActionCls}
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
