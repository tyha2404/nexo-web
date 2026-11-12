import { useCallback, useEffect, useRef, useState } from 'react';

import { toast } from 'react-toastify';
import { APP_EVENTS, DATA_EVENTS, TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import { formatCurrency, getErrorMessage, parseNumberInput } from '../commons/utils';
import { useDataEvents } from '../hooks';
import { categoryService } from '../services';
import { CategoryFormModal, type CategoryFormValues } from './CategoryFormModal';
import Pagination from './Pagination';
import { ConfirmModal, EmptyState, ListSkeleton } from './common';
import { getTypeLabel, TypeTabs } from './transaction-list';
import {
  ACTION_BTN_DELETE,
  ACTION_BTN_EDIT,
  ALERT_ERROR,
  AlertTriangle,
  CATEGORIES_LIST,
  cx,
  FolderPlus,
  LIST_ITEM_CARD,
  Pencil,
  TABS_NAV,
  Trash2,
} from './ui';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  // Category form: null = closed; category null = create.
  const [categoryForm, setCategoryForm] = useState<{ category: Category | null } | null>(null);
  // Category waiting for the delete confirmation.
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchCategories = useCallback(
    async (selectedType: TransactionType, page: number, limit: number) => {
      try {
        setLoading(true);
        setError(null);
        const res = await categoryService.list({ type: selectedType, page, limit });
        setCategories(res.items || []);
        setTotalItems(res.total || 0);
      } catch (err) {
        setError(getErrorMessage(err, 'Lấy danh mục thất bại'));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCategories(activeTab, currentPage, itemsPerPage);
  }, [fetchCategories, activeTab, currentPage, itemsPerPage]);

  // Categories created by the AI assistant or another device; budgets affect usage bars
  useDataEvents([DATA_EVENTS.CATEGORIES_CHANGED, DATA_EVENTS.BUDGETS_CHANGED], () =>
    fetchCategories(activeTab, currentPage, itemsPerPage)
  );

  const closeModal = () => setCategoryForm(null);

  const handleSave = async (values: CategoryFormValues) => {
    if (!values.name.trim()) return;
    const editingCategory = categoryForm?.category ?? null;
    const isExpense = values.type === TransactionType.EXPENSE;
    const parsedBudget = values.budgetLimit.trim()
      ? parseNumberInput(values.budgetLimit)
      : undefined;
    const payload = {
      name: values.name.trim(),
      type: values.type,
      description: values.description.trim() || undefined,
      budgetLimit: isExpense ? parsedBudget : undefined,
      excludeFromAverageDaily: isExpense ? values.excludeFromAverageDaily : undefined,
    };

    try {
      setError(null);
      if (editingCategory) {
        const updatedCat = await categoryService.update(editingCategory.id, payload);
        if (values.type === activeTab) {
          setCategories((prev) =>
            prev.map((cat) => (cat.id === editingCategory.id ? updatedCat : cat))
          );
        } else {
          setCategories((prev) => prev.filter((cat) => cat.id !== editingCategory.id));
        }
      } else {
        const newCat = await categoryService.create(payload);
        if (values.type === activeTab) {
          setCategories((prev) => [...prev, newCat]);
        }
      }
      closeModal();
      toast.success(editingCategory ? 'Cập nhật danh mục thành công!' : 'Tạo danh mục thành công!');
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          editingCategory ? 'Cập nhật danh mục thất bại' : 'Tạo danh mục thất bại'
        )
      );
    }
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);

    try {
      setError(null);
      await categoryService.delete(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      toast.success(`Đã xóa danh mục "${name}"!`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa danh mục thất bại'));
    }
  };

  const startEdit = (category: Category) => setCategoryForm({ category });
  const openCreateModal = () => setCategoryForm({ category: null });

  const openCreateModalRef = useRef(openCreateModal);
  useEffect(() => {
    openCreateModalRef.current = openCreateModal;
  });
  useEffect(() => {
    const handleOpenModal = () => openCreateModalRef.current();
    window.addEventListener(APP_EVENTS.OPEN_ADD_CATEGORY_MODAL, handleOpenModal);
    return () => {
      window.removeEventListener(APP_EVENTS.OPEN_ADD_CATEGORY_MODAL, handleOpenModal);
    };
  }, []);

  return (
    <div className="categories-subview w-full">
      {/* Category Type Tabs Switcher (Below Page Title) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <TypeTabs value={activeTab} onChange={setActiveTab} ariaLabel="Loại danh mục" />
      </div>

      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Main List Section */}
      <div className="categories-single-column animate-fade-in">
        {loading ? (
          <ListSkeleton rows={4} label="Đang tải danh mục" />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<FolderPlus />}
            title={`Chưa có danh mục ${getTypeLabel(activeTab)}`}
            description="Tạo danh mục đầu tiên để phân loại và theo dõi ngân sách."
            actionLabel={`Tạo danh mục ${getTypeLabel(activeTab)}`}
            onAction={openCreateModal}
          />
        ) : (
          <>
            <div className={CATEGORIES_LIST}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={cx(
                    LIST_ITEM_CARD,
                    'flex w-full max-w-full items-center justify-between overflow-hidden text-left'
                  )}
                >
                  <div className="min-w-0 flex-auto pr-2">
                    <div className="mb-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-[0.35rem]">
                      <h4 className="m-0 break-words text-[1rem] font-semibold text-main">
                        {cat.name}
                      </h4>
                      {(cat.budgetLimit !== undefined || cat.excludeFromAverageDaily) && (
                        <div className="inline-flex flex-wrap items-center gap-[0.35rem]">
                          {cat.budgetLimit !== undefined && (
                            <span className="whitespace-nowrap rounded-sm border border-line bg-input px-[0.45rem] py-[0.15rem] text-[0.72rem] font-medium text-muted">
                              Hạn mức: {formatCurrency(cat.budgetLimit)}
                            </span>
                          )}
                          {cat.excludeFromAverageDaily && (
                            <span className="inline-flex shrink-0 items-center whitespace-nowrap [word-break:keep-all] rounded-full bg-[var(--bg-warning,color-mix(in_srgb,var(--warning)_15%,transparent))] px-[0.45rem] py-[0.15rem] text-[0.7rem] font-semibold text-[var(--text-warning,var(--warning))]">
                              <span className="inline mobile:hidden">
                                Không tính vào trung bình ngày
                              </span>
                              <span className="hidden mobile:inline">Không tính TB ngày</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {cat.description && (
                      <p className="m-0 line-clamp-2 text-[0.875rem] text-muted mobile:hidden">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className={ACTION_BTN_EDIT}
                      aria-label={`Chỉnh sửa danh mục ${cat.name}`}
                      title={`Chỉnh sửa danh mục ${cat.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setPendingDelete(cat)}
                      className={ACTION_BTN_DELETE}
                      aria-label={`Xóa danh mục ${cat.name}`}
                      title={`Xóa danh mục ${cat.name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              onPageChange={(page: number) => setCurrentPage(page)}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(size: number) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              totalItems={totalItems}
            />
          </>
        )}
      </div>

      {/* Modal Popup for Create / Edit Category */}
      <CategoryFormModal
        open={!!categoryForm}
        category={categoryForm?.category ?? null}
        defaultType={activeTab}
        onClose={closeModal}
        onSubmit={handleSave}
      />

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Xóa danh mục"
        message={`Bạn có chắc chắn muốn xóa danh mục "${pendingDelete?.name || ''}" không? Các giao dịch liên kết có thể cần được phân loại lại.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
