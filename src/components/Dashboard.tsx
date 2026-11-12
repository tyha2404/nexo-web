import { AlertCircle } from './ui';
import moment from 'moment';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type {
  Category,
  CategoryBreakdownItem,
  DebtSummary,
  MonthlyTrendReport,
  NetWorthReport,
  SummaryReport,
  TargetSummaryResponse,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { DATA_EVENTS, DATE_FORMAT_INPUT, DATE_FORMAT_MONTH } from '../commons/constants';
import { getErrorMessage } from '../commons/utils';
import { useDataEvents } from '../hooks';
import {
  categoryService,
  debtService,
  reportService,
  targetService,
  transactionService,
  walletService,
} from '../services';
const MonthlyTrendChart = lazy(() =>
  import('./MonthlyTrendChart').then((module) => ({ default: module.MonthlyTrendChart }))
);
const NetWorthChart = lazy(() =>
  import('./NetWorthChart').then((module) => ({ default: module.NetWorthChart }))
);
import { MonthFilter, PageHeader } from './common';
import {
  CategoryMomCard,
  DashboardSkeleton,
  HeroCashflowCard,
  RecentTransactionsCard,
  SecondaryStatsSection,
} from './dashboard-cards';
import { ALERT_ERROR, BTN_SECONDARY, cx, DASHBOARD_MAIN_GRID, PAGE_ROOT } from './ui';

export interface DashboardProps {
  onNavigate?: (tab: string) => void;
}

const DASHBOARD_EVENTS = [
  DATA_EVENTS.TRANSACTIONS_CHANGED,
  DATA_EVENTS.CATEGORIES_CHANGED,
  DATA_EVENTS.TARGETS_CHANGED,
  DATA_EVENTS.BUDGETS_CHANGED,
  DATA_EVENTS.DEBTS_CHANGED,
  DATA_EVENTS.WALLETS_CHANGED,
] as const;

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    moment().format(DATE_FORMAT_MONTH)
  );
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
  const [netWorth, setNetWorth] = useState<NetWorthReport | null>(null);
  const [prevSummary, setPrevSummary] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedMonth, setLoadedMonth] = useState('');
  const requestNumber = useRef(0);

  const fetchDashboardData = useCallback(async (monthStr: string, signal: AbortSignal) => {
    const requestId = ++requestNumber.current;
    const options = { signal };
    try {
      setLoading(true);
      setError(null);

      const m = moment(monthStr, DATE_FORMAT_MONTH);
      const startOfMonth = m.startOf('month').format(DATE_FORMAT_INPUT);
      const endOfMonth = m.endOf('month').format(DATE_FORMAT_INPUT);
      const dateFilters = { startDate: startOfMonth, endDate: endOfMonth };
      const targetParams = { month: m.month() + 1, year: m.year() };

      const prevM = m.clone().subtract(1, 'month');
      const prevDateFilters = {
        startDate: prevM.startOf('month').format(DATE_FORMAT_INPUT),
        endDate: prevM.endOf('month').format(DATE_FORMAT_INPUT),
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
        netWorthData,
      ] = await Promise.all([
        reportService.summary(dateFilters, options),
        reportService.summary({ allTime: true }, options),
        reportService.categoryBreakdown(dateFilters, options),
        reportService
          .categoryBreakdown(prevDateFilters, options)
          .catch(() => ({ items: [], totalExpense: 0 })),
        reportService
          .summary(prevDateFilters, options)
          .catch(() => ({ totalIncome: 0, totalExpense: 0 })),
        categoryService.list(undefined, options),
        targetService.getSummary(targetParams, options).catch(() => null),
        debtService.getSummary(options).catch(() => null),
        walletService.getWallets().catch(() => ({ wallets: [] })),
        transactionService
          .list(
            {
              startDate: startOfMonth,
              endDate: endOfMonth,
              limit: 6,
              page: 1,
            },
            options
          )
          .catch(() => ({ items: [] })),
        reportService.monthlyTrend(12, options).catch(() => null),
        // Optional: the dashboard works without the net worth chart.
        reportService.netWorth(12, options).catch(() => null),
      ]);

      if (signal.aborted || requestId !== requestNumber.current) return;
      setLoadedMonth(monthStr);
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
      setNetWorth(netWorthData);
    } catch (err: unknown) {
      if (!signal.aborted && requestId === requestNumber.current)
        setError(getErrorMessage(err, 'Không thể tải dữ liệu bảng điều khiển'));
    } finally {
      if (!signal.aborted && requestId === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboardData(selectedMonth, controller.signal);
    return () => controller.abort();
  }, [selectedMonth, refreshKey, fetchDashboardData]);

  // Any data the dashboard summarises; useRealtimeSync also re-fires the table events when the
  // app comes back online or resumes.
  useDataEvents(DASHBOARD_EVENTS, () => setRefreshKey((key) => key + 1));

  return (
    <div className={cx(PAGE_ROOT, 'animate-fade-in')}>
      {/* 1. Page header: title + the page-wide month (same slot as other pages' action) */}
      <PageHeader
        title="Tổng quan"
        titleClassName="dashboard-title-group"
        actionsClassName="w-[260px] mobile:w-full"
        actions={
          <MonthFilter value={selectedMonth} onChange={(newMonth) => setSelectedMonth(newMonth)} />
        }
      />

      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className={cx(BTN_SECONDARY, 'ml-auto')}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 2. Hero Balance & Cash Flow Card */}
      {!summary || loadedMonth !== selectedMonth ? (
        <DashboardSkeleton />
      ) : (
        <>
          <HeroCashflowCard
            selectedMonth={selectedMonth}
            summary={summary}
            allTimeSummary={allTimeSummary}
            targetSummary={targetSummary}
            debtSummary={debtSummary}
            onNavigate={onNavigate}
          />

          {/* 2.4 Net worth over the last 12 months (hidden until there is any data) */}
          {netWorth?.items?.some((p) => p.netWorth !== 0 || p.change !== 0) && (
            <Suspense fallback={<p role="status">Đang tải biểu đồ...</p>}>
              <NetWorthChart report={netWorth} />
            </Suspense>
          )}

          {/* 2.5 Monthly Trend Chart (12 Months) */}
          {(loading || (monthlyTrend?.items?.length ?? 0) > 0) && (
            <Suspense fallback={<p role="status">Đang tải biểu đồ...</p>}>
              <MonthlyTrendChart
                items={monthlyTrend?.items || []}
                averageExpense={monthlyTrend?.averageExpense || 0}
                loading={loading}
              />
            </Suspense>
          )}

          {/* 3. Analytics Main Grid: Category Breakdown & Recent Transactions */}
          <div className={cx(DASHBOARD_MAIN_GRID, 'animate-fade-in')}>
            {/* Left: MoM Spending & Category Comparison */}
            <CategoryMomCard
              selectedMonth={selectedMonth}
              summary={summary}
              prevSummary={prevSummary}
              categoryBreakdown={categoryBreakdown}
              prevCategoryBreakdown={prevCategoryBreakdown}
              categories={categories}
              onNavigate={onNavigate}
            />

            {/* Right: Recent Transactions Feed */}
            <RecentTransactionsCard
              selectedMonth={selectedMonth}
              recentTransactions={recentTransactions}
              wallets={wallets}
              onNavigate={onNavigate}
            />
          </div>

          {/* 6. Secondary Summary Section: Assets, Investment & Debts */}
          <SecondaryStatsSection
            summary={summary}
            allTimeSummary={allTimeSummary}
            debtSummary={debtSummary}
            onNavigate={onNavigate}
          />
        </>
      )}
    </div>
  );
}
