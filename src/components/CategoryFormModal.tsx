import { useState, type FormEvent } from 'react';
import Select from 'react-select';
import { TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import {
  formatNumberInput,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  TEXT_NEXT_INPUT_PROPS,
} from '../commons/utils';
import { FormModal } from './common';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  cx,
  FORM_CHECK,
  FORM_CHECK_INPUT,
  FORM_CHECK_LABEL,
  FORM_GROUP,
  MODAL_FORM_BODY,
  MODAL_SHELL_FOOTER,
} from './ui';

export interface CategoryFormValues {
  name: string;
  type: TransactionType;
  description: string;
  /** Formatted money input ('5.000.000'), '' = no limit. */
  budgetLimit: string;
  excludeFromAverageDaily: boolean;
}

export interface CategoryFormModalProps {
  open: boolean;
  /** The category being edited, or null to create one. */
  category: Category | null;
  /** Type preselected when creating (the active tab). */
  defaultType: TransactionType;
  onClose: () => void;
  /** Saves the values; the page updates its list, shows the toast and closes the dialog. */
  onSubmit: (values: CategoryFormValues) => void | Promise<void>;
}

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: TransactionType.EXPENSE, label: 'Chi tiêu' },
  { value: TransactionType.INCOME, label: 'Thu nhập' },
  { value: TransactionType.INVESTMENT, label: 'Đầu tư' },
];

const initialValues = (category: Category | null, defaultType: TransactionType) =>
  category
    ? {
        name: category.name,
        type: category.type,
        description: category.description || '',
        budgetLimit:
          category.budgetLimit !== undefined
            ? formatNumberInput(Math.round(category.budgetLimit))
            : '',
        excludeFromAverageDaily: category.excludeFromAverageDaily ?? false,
      }
    : {
        name: '',
        type: defaultType,
        description: '',
        budgetLimit: '',
        excludeFromAverageDaily: false,
      };

/** Create / edit a category. */
export function CategoryFormModal({
  open,
  category,
  defaultType,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={category ? 'Sửa danh mục' : 'Thêm danh mục'}
      titleId="category-modal-title"
    >
      {/* Mounted only while open, so every opening starts from fresh values. */}
      <CategoryForm
        category={category}
        defaultType={defaultType}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </FormModal>
  );
}

function CategoryForm({
  category,
  defaultType,
  onClose,
  onSubmit,
}: Omit<CategoryFormModalProps, 'open'>) {
  const [form, setForm] = useState<CategoryFormValues>(() => initialValues(category, defaultType));
  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  // Field ids kept per mode ('new-name' / 'edit-name', ...).
  const id = (field: string) => `${category ? 'edit' : 'new'}-${field}`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    return onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={MODAL_FORM_BODY}>
        <div className={FORM_GROUP}>
          <label htmlFor={id('name')}>Tên danh mục</label>
          <input
            id={id('name')}
            {...TEXT_NEXT_INPUT_PROPS}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ví dụ: Ăn uống, Tiền nhà, Giải trí"
            required
          />
        </div>
        <div className={FORM_GROUP}>
          <label htmlFor={id('type')}>Loại danh mục</label>
          <Select
            id={id('type')}
            options={TYPE_OPTIONS}
            value={TYPE_OPTIONS.find((opt) => opt.value === form.type) || null}
            onChange={(option) => set('type', option ? option.value : TransactionType.EXPENSE)}
            classNamePrefix="react-select"
            isSearchable={!isTouchDevice()}
            placeholder="Chọn Loại danh mục"
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        </div>
        {form.type === TransactionType.EXPENSE && (
          <>
            <div className={FORM_GROUP}>
              <label htmlFor={id('budget')}>Hạn mức tháng (đ)</label>
              <input
                id={id('budget')}
                {...MONEY_INPUT_PROPS}
                value={form.budgetLimit}
                onChange={(e) => set('budgetLimit', formatNumberInput(e.target.value))}
                placeholder="Ví dụ: 5.000.000"
              />
            </div>
            <div className={FORM_CHECK}>
              <label className={FORM_CHECK_LABEL}>
                <input
                  id={id('exclude-avg')}
                  type="checkbox"
                  className={FORM_CHECK_INPUT}
                  checked={form.excludeFromAverageDaily}
                  onChange={(e) => set('excludeFromAverageDaily', e.target.checked)}
                />
                Không tính vào chi tiêu trung bình ngày
              </label>
            </div>
          </>
        )}
        <div className={FORM_GROUP}>
          <label htmlFor={id('desc')}>Mô tả</label>
          <textarea
            id={id('desc')}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Mô tả..."
            rows={3}
          />
        </div>
      </div>
      <div className={MODAL_SHELL_FOOTER}>
        <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
          {category ? 'Lưu danh mục' : 'Thêm danh mục'}
        </button>
      </div>
    </form>
  );
}
