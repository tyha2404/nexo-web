import { AlertCircle } from 'lucide-react';
import moment from 'moment';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type {
  Category,
  CategoryBreakdownItem,
  MonthlyTrendReport,
  SummaryReport,
  TargetSummaryResponse,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { getCategoryIcon } from '../commons/utils';
import {
  categoryService,
  debtService,
  reportService,
  targetService,
  transactionService,
  walletService,
} from '../services';
import type { DebtSummary } from '../types/debt';
import './Dashboard.css';
const MonthlyTrendChart = lazy(() =>
  import('./MonthlyTrendChart').then((module) => ({ default: module.MonthlyTrendChart }))
);
import { MonthFilter } from './common';
import {
  CategoryMomCard,
  DashboardSkeleton,
  HeroCashflowCard,
  RecentTransactionsCard,
  SecondaryStatsSection,
} from './dashboard-cards';

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

  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedMonth, setLoadedMonth] = useState('');
  const requestNumber = useRef(0);

  const fetchDashboardData = useCallback(async (monthStr: string, signal: AbortSignal) => {
    const requestId = ++requestNumber.current;
    const options = { signal };
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
    } catch (err: unknown) {
      if (!signal.aborted && requestId === requestNumber.current)
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu bảng điều khiển');
    } finally {
      if (!signal.aborted && requestId === requestNumber.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboardData(selectedMonth, controller.signal);
    return () => controller.abort();
  }, [selectedMonth, refreshKey, fetchDashboardData]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setRefreshKey((key) => key + 1), 150);
    };
    const events = [
      'transactions-changed',
      'categories-changed',
      'targets-changed',
      'budgets-changed',
      'debts-changed',
      'wallets-changed',
      'online',
    ];
    const resume = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    for (const event of events) window.addEventListener(event, refresh);
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, refresh);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

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
            onClick={() => setRefreshKey((key) => key + 1)}
            className="btn btn-secondary btn-retry"
            style={{ marginLeft: 'auto' }}
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
          <div className="dashboard-main-grid animate-fade-in">
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
