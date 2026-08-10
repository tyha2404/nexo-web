import type { TargetSummaryResponse, UpsertTargetRequest } from '../commons/types';
import { request } from './client';

export const targetService = {
  getSummary: async (params?: {
    month?: number;
    year?: number;
  }): Promise<TargetSummaryResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.year) searchParams.append('year', params.year.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<TargetSummaryResponse>(`/targets/summary${query}`, {
      method: 'GET',
    });
  },

  upsertTarget: async (data: UpsertTargetRequest): Promise<void> => {
    return request<void>('/targets/monthly', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
