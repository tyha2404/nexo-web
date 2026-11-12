import type { TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import { CRUDService } from './crudService';

export interface CreateCategoryDTO {
  name: string;
  type: TransactionType;
  description?: string;
  budgetLimit?: number;
  excludeFromAverageDaily?: boolean;
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

class CategoryService extends CRUDService<Category, CreateCategoryDTO, UpdateCategoryDTO> {
  constructor() {
    super('/categories');
  }
}

export const categoryService = new CategoryService();
