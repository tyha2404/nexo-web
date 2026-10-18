import { SlidingTabs } from './ui';
import {
  AlertTriangle,
  FolderPlus,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
  getErrorMessage,
} from '../commons/utils';
import { useDataEvents, useModal } from '../hooks';
import { categoryService } from '../services';
import { LOADING_SPINNER } from './transaction-list/listStyles';
import Pagination from './Pagination';
import { ConfirmModal } from './common';
import {
  ACTION_BTN_DELETE,
  ACTION_BTN_EDIT,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CATEGORIES_LIST,
  cx,
  EMPTY_STATE,
  FORM_CHECK,
  FORM_CHECK_INPUT,
  FORM_CHECK_LABEL,
  FORM_GROUP,
  GLASS_CARD,
  SPINNER_SECTION,
  tabClass,
  TABS,
  TABS_NAV,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_FORM_BODY,
  MODAL_FORM_SHELL_PANEL,
  MODAL_SHELL_FOOTER,
  MODAL_SHELL_HEADER,
} from './ui';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [description, setDescription] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [excludeFromAverageDaily, setExcludeFromAverageDaily] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editDescription, setEditDescription] = useState('');
  const [editBudgetLimit, setEditBudgetLimit] = useState('');
  const [editExcludeFromAverageDaily, setEditExcludeFromAverageDaily] = useState(false);

  const typeOptions = [
    { value: TransactionType.EXPENSE, label: 'Chi tiêu' },
    { value: TransactionType.INCOME, label: 'Thu nhập' },
    { value: TransactionType.INVESTMENT, label: 'Đầu tư' },
  ];

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

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
  useDataEvents(['categories-changed', 'budgets-changed'], () =>
    fetchCategories(activeTab, currentPage, itemsPerPage)
  );

  const handleBudgetChange = (val: string) => {
    setBudgetLimit(formatNumberInput(val));
  };

  const handleEditBudgetChange = (val: string) => {
    setEditBudgetLimit(formatNumberInput(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedBudget = budgetLimit.trim() ? parseNumberInput(budgetLimit) : undefined;

    try {
      setError(null);
      const newCat = await categoryService.create({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        budgetLimit: type === TransactionType.EXPENSE ? parsedBudget : undefined,
        excludeFromAverageDaily:
          type === TransactionType.EXPENSE ? excludeFromAverageDaily : undefined,
      });
      if (type === activeTab) {
        setCategories((prev) => [...prev, newCat]);
      }
      setName('');
      setType(TransactionType.EXPENSE);
      setDescription('');
      setBudgetLimit('');
      setExcludeFromAverageDaily(false);
      setIsModalOpen(false);
      showFeedback('Tạo danh mục thành công!', 'success');
    } catch (err) {
      showFeedback(getErrorMessage(err, 'Tạo danh mục thất bại'), 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    const parsedEditBudget = editBudgetLimit.trim() ? parseNumberInput(editBudgetLimit) : undefined;

    try {
      setError(null);
      const updatedCat = await categoryService.update(editingCategory.id, {
        name: editName.trim(),
        type: editType,
        description: editDescription.trim() || undefined,
        budgetLimit: editType === TransactionType.EXPENSE ? parsedEditBudget : undefined,
        excludeFromAverageDaily:
          editType === TransactionType.EXPENSE ? editExcludeFromAverageDaily : undefined,
      });
      if (editType === activeTab) {
        setCategories((prev) =>
          prev.map((cat) => (cat.id === editingCategory.id ? updatedCat : cat))
        );
      } else {
        setCategories((prev) => prev.filter((cat) => cat.id !== editingCategory.id));
      }
      setEditingCategory(null);
      setEditName('');
      setEditType(TransactionType.EXPENSE);
      setEditDescription('');
      setEditBudgetLimit('');
      setEditExcludeFromAverageDaily(false);
      setIsModalOpen(false);
      showFeedback('Cập nhật danh mục thành công!', 'success');
    } catch (err) {
      showFeedback(getErrorMessage(err, 'Cập nhật danh mục thất bại'), 'error');
    }
  };

  // Confirm Modal state
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  } | null>(null);

  const handleDelete = (id: string, name: string) => {
    setDeleteCatConfirm({ isOpen: true, id, name });
  };

  const executeDelete = async () => {
    if (!deleteCatConfirm) return;
    const { id, name } = deleteCatConfirm;
    setDeleteCatConfirm(null);

    try {
      setError(null);
      await categoryService.delete(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      showFeedback(`Đã xóa danh mục "${name}"!`, 'success');
    } catch (err) {
      showFeedback(getErrorMessage(err, 'Xóa danh mục thất bại'), 'error');
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditType(category.type as TransactionType);
    setEditDescription(category.description || '');
    setEditExcludeFromAverageDaily(category.excludeFromAverageDaily ?? false);
    setEditBudgetLimit(
      category.budgetLimit !== undefined
        ? Math.round(category.budgetLimit).toLocaleString('vi-VN')
        : ''
    );
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setType(activeTab);
    setDescription('');
    setBudgetLimit('');
    setExcludeFromAverageDaily(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };
  const categoryDialogRef = useModal(isModalOpen, closeModal);

  const getTabTypeName = (tab: TransactionType) => {
    if (tab === TransactionType.INCOME) return 'thu nhập';
    if (tab === TransactionType.INVESTMENT) return 'đầu tư';
    return 'chi tiêu';
  };

  const openCreateModalRef = useRef(openCreateModal);
  useEffect(() => {
    openCreateModalRef.current = openCreateModal;
  });
  useEffect(() => {
    const handleOpenModal = () => openCreateModalRef.current();
    window.addEventListener('open-add-category-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-add-category-modal', handleOpenModal);
    };
  }, []);

  return (
    <div className="categories-subview mx-auto w-full max-w-full p-0">
      {/* Category Type Tabs Switcher (Below Page Title) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <SlidingTabs className={TABS} role="tablist" aria-label="Loại danh mục">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TransactionType.EXPENSE}
            className={tabClass(activeTab === TransactionType.EXPENSE)}
            onClick={() => setActiveTab(TransactionType.EXPENSE)}
          >
            <ShoppingBag size={14} />
            <span>Chi tiêu</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TransactionType.INCOME}
            className={tabClass(activeTab === TransactionType.INCOME)}
            onClick={() => setActiveTab(TransactionType.INCOME)}
          >
            <Wallet size={14} />
            <span>Thu nhập</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TransactionType.INVESTMENT}
            className={tabClass(activeTab === TransactionType.INVESTMENT)}
            onClick={() => setActiveTab(TransactionType.INVESTMENT)}
          >
            <TrendingUp size={14} />
            <span>Đầu tư</span>
          </button>
        </SlidingTabs>
      </div>

      {error && (
        <div className="animate-fade-in">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Main List Section */}
      <div className="categories-single-column animate-fade-in">
        <div className={GLASS_CARD}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 mobile:mb-2 mobile:text-[1.05rem]">
              Danh mục ({categories.length})
            </h3>
          </div>

          {loading ? (
            <div className={LOADING_SPINNER}>
              <div className={SPINNER_SECTION}></div>
              <p>Đang tải danh mục...</p>
            </div>
          ) : categories.length === 0 ? (
            <div
              className={EMPTY_STATE}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--border)',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  background: 'var(--primary-glow)',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)',
                }}
              >
                <FolderPlus size={32} className="empty-icon" />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Chưa có danh mục {getTabTypeName(activeTab)}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '380px' }}>
                  Hãy tạo danh mục đầu tiên để dễ dàng phân loại và theo dõi ngân sách tài chính của
                  bạn.
                </p>
              </div>
              <button
                className={BTN_PRIMARY}
                onClick={openCreateModal}
                style={{ marginTop: '0.5rem' }}
              >
                <Plus size={16} /> Tạo danh mục {getTabTypeName(activeTab)}
              </button>
            </div>
          ) : (
            <>
              <div className={CATEGORIES_LIST}>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="box-border flex w-full max-w-full items-center justify-between overflow-hidden rounded-lg border border-line bg-card px-5 py-4 text-left transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] [-webkit-backdrop-filter:var(--glass-blur)] [backdrop-filter:var(--glass-blur)] hover:-translate-y-0.5 hover:border-line-hover hover:bg-card-hover hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.25),0_0_0_1px_var(--primary-glow)] mobile:rounded-md mobile:px-[0.65rem] mobile:py-[0.55rem]"
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
                              <span className="inline-flex shrink-0 items-center whitespace-nowrap [word-break:keep-all] rounded-full bg-[var(--bg-warning,rgba(245,158,11,0.15))] px-[0.45rem] py-[0.15rem] text-[0.7rem] font-semibold text-[var(--text-warning,#d97706)]">
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
                        onClick={() => handleDelete(cat.id, cat.name)}
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
      </div>

      {/* Modal Popup for Create / Edit Category */}
      {isModalOpen &&
        // Portal: the tab container is animated (transform), which would trap position: fixed
        createPortal(
          <div className={MODAL_BACKDROP} onClick={closeModal}>
            <div
              ref={categoryDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-modal-title"
              tabIndex={-1}
              className={MODAL_FORM_SHELL_PANEL}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_SHELL_HEADER}>
                <h3 id="category-modal-title">
                  {editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
                </h3>
                <button
                  type="button"
                  className={MODAL_CLOSE_BTN}
                  onClick={closeModal}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              {editingCategory ? (
                <form onSubmit={handleUpdate}>
                  <div className={MODAL_FORM_BODY}>
                    <div className={FORM_GROUP}>
                      <label htmlFor="edit-name">Tên danh mục</label>
                      <input
                        id="edit-name"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Ví dụ: Ăn uống, Tiền nhà, Giải trí"
                        required
                      />
                    </div>
                    <div className={FORM_GROUP}>
                      <label htmlFor="edit-type">Loại danh mục</label>
                      <Select
                        id="edit-type"
                        options={typeOptions}
                        value={typeOptions.find((opt) => opt.value === editType) || null}
                        onChange={(option) =>
                          setEditType(
                            (option ? option.value : TransactionType.EXPENSE) as TransactionType
                          )
                        }
                        classNamePrefix="react-select"
                        placeholder="Chọn Loại danh mục"
                        menuPortalTarget={document.body}
                      />
                    </div>
                    {editType === TransactionType.EXPENSE && (
                      <>
                        <div className={FORM_GROUP}>
                          <label htmlFor="edit-budget">Hạn mức tháng (đ)</label>
                          <input
                            id="edit-budget"
                            type="text"
                            value={editBudgetLimit}
                            onChange={(e) => handleEditBudgetChange(e.target.value)}
                            placeholder="Ví dụ: 5.000.000"
                          />
                        </div>
                        <div className={FORM_CHECK}>
                          <label className={FORM_CHECK_LABEL}>
                            <input
                              id="edit-exclude-avg"
                              type="checkbox"
                              className={FORM_CHECK_INPUT}
                              checked={editExcludeFromAverageDaily}
                              onChange={(e) => setEditExcludeFromAverageDaily(e.target.checked)}
                            />
                            Không tính vào chi tiêu trung bình ngày
                          </label>
                        </div>
                      </>
                    )}
                    <div className={FORM_GROUP}>
                      <label htmlFor="edit-desc">Mô tả</label>
                      <textarea
                        id="edit-desc"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Mô tả..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className={MODAL_SHELL_FOOTER}>
                    <button
                      type="button"
                      className={cx(BTN_SECONDARY, BTN_FILL)}
                      onClick={closeModal}
                    >
                      Hủy
                    </button>
                    <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
                      Lưu danh mục
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleCreate}>
                  <div className={MODAL_FORM_BODY}>
                    <div className={FORM_GROUP}>
                      <label htmlFor="new-name">Tên danh mục</label>
                      <input
                        id="new-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ví dụ: Ăn uống, Tiền nhà, Giải trí"
                        required
                      />
                    </div>
                    <div className={FORM_GROUP}>
                      <label htmlFor="new-type">Loại danh mục</label>
                      <Select
                        id="new-type"
                        options={typeOptions}
                        value={typeOptions.find((opt) => opt.value === type) || null}
                        onChange={(option) =>
                          setType(
                            (option ? option.value : TransactionType.EXPENSE) as TransactionType
                          )
                        }
                        classNamePrefix="react-select"
                        placeholder="Chọn Loại danh mục"
                        menuPortalTarget={document.body}
                      />
                    </div>
                    {type === TransactionType.EXPENSE && (
                      <>
                        <div className={FORM_GROUP}>
                          <label htmlFor="new-budget">Hạn mức tháng (đ)</label>
                          <input
                            id="new-budget"
                            type="text"
                            value={budgetLimit}
                            onChange={(e) => handleBudgetChange(e.target.value)}
                            placeholder="Ví dụ: 5.000.000"
                          />
                        </div>
                        <div className={FORM_CHECK}>
                          <label className={FORM_CHECK_LABEL}>
                            <input
                              id="new-exclude-avg"
                              type="checkbox"
                              className={FORM_CHECK_INPUT}
                              checked={excludeFromAverageDaily}
                              onChange={(e) => setExcludeFromAverageDaily(e.target.checked)}
                            />
                            Không tính vào chi tiêu trung bình ngày
                          </label>
                        </div>
                      </>
                    )}
                    <div className={FORM_GROUP}>
                      <label htmlFor="new-desc">Mô tả</label>
                      <textarea
                        id="new-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Mô tả..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className={MODAL_SHELL_FOOTER}>
                    <button
                      type="button"
                      className={cx(BTN_SECONDARY, BTN_FILL)}
                      onClick={closeModal}
                    >
                      Hủy
                    </button>
                    <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
                      Thêm danh mục
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteCatConfirm?.isOpen)}
        title="Xóa danh mục"
        message={`Bạn có chắc chắn muốn xóa danh mục "${deleteCatConfirm?.name || ''}" không? Các giao dịch liên kết có thể cần được phân loại lại.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteCatConfirm(null)}
      />
    </div>
  );
}
