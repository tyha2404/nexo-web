import type { TransactionType } from '../commons/constants';
import { request } from './client';

export interface ParseNLPResponse {
  amount: number;
  type: TransactionType;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  transactionDate?: string;
}

export const nlpService = {
  async parseNLP(text: string): Promise<ParseNLPResponse> {
    return request<ParseNLPResponse>('/transactions/parse-nlp', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },
};
