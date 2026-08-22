import type { TransactionType } from '../constants';

export interface Preset {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  amount: number;
  type: TransactionType;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface CreatePresetDTO {
  categoryId: string;
  name: string;
  amount: number;
  type: TransactionType;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export type UpdatePresetDTO = Partial<CreatePresetDTO>;
