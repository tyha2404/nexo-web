import type {
  CategoryBreakdownReport,
  DailyReport,
  MonthlyTrendReport,
  NetWorthReport,
  SummaryReport,
} from '../commons/types';
import { request } from './client';

export const reportService = {
  summary: async (
    params?: {
      startDate?: string;
      endDate?: string;
      allTime?: boolean;
    },
    options: RequestInit = {}
  ): Promise<SummaryReport> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.allTime) searchParams.append('allTime', 'true');
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<SummaryReport>(`/reports/summary${query}`, {
      method: 'GET',
      ...options,
    });
  },

  categoryBreakdown: async (
    params?: {
      startDate?: string;
      endDate?: string;
    },
    options: RequestInit = {}
  ): Promise<CategoryBreakdownReport> => {
    const query =
      params?.startDate && params?.endDate
        ? `?startDate=${params.startDate}&endDate=${params.endDate}`
        : '';
    return request<CategoryBreakdownReport>(`/reports/category-breakdown${query}`, {
      method: 'GET',
      ...options,
    });
  },

  monthlyTrend: async (
    months: number = 12,
    options: RequestInit = {}
  ): Promise<MonthlyTrendReport> => {
    return request<MonthlyTrendReport>(`/reports/monthly-trend?months=${months}`, {
      method: 'GET',
      ...options,
    });
  },

  /** Month-end net worth for the last `months` months (max 36), ending this month. */
  netWorth: async (months: number = 12, options: RequestInit = {}): Promise<NetWorthReport> => {
    return request<NetWorthReport>(`/reports/net-worth?months=${months}`, {
      method: 'GET',
      ...options,
    });
  },

  /** Per-day income/expense of a month ('YYYY-MM'), for the spending calendar. */
  daily: async (month: string, options: RequestInit = {}): Promise<DailyReport> => {
    return request<DailyReport>(`/reports/daily?month=${encodeURIComponent(month)}`, {
      method: 'GET',
      ...options,
    });
  },
};
