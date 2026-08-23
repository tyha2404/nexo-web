import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import {
  Plus,
  Pencil,
  Trash2,
  FolderPlus,
  X,
  ShoppingBag,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { categoryService } from '../services/api';
import { TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import { toast } from 'react-toastify';
import Pagination from './Pagination';
import './Categories.css';

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

  const fetchCategories = async (
    selectedType: TransactionType,
    page: number = currentPage,
    limit: number = itemsPerPage
  ) => {
    try {
      setLoading(true);
      setError(null);
      const res = await categoryService.list({ type: selectedType, page, limit });
      setCategories(res.items || []);
      setTotalItems(res.total || 0);
    } catch (err: any) {
      setError(err.message || 'Lấy danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(activeTab, currentPage, itemsPerPage);
  }, [activeTab, currentPage, itemsPerPage]);

  const formatBudgetVal = (val: string) => {
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') return '';
    return parseInt(cleanNumber, 10).toLocaleString('vi-VN');
  };

  const handleBudgetChange = (val: string) => {
    setBudgetLimit(formatBudgetVal(val));
  };

  const handleEditBudgetChange = (val: string) => {
    setEditBudgetLimit(formatBudgetVal(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Parse dot formatted string back to raw number
    const parsedBudget = budgetLimit.trim()
      ? parseFloat(budgetLimit.replace(/\./g, ''))
      : undefined;

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
    } catch (err: any) {
      showFeedback(err.message || 'Tạo danh mục thất bại', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    // Parse dot formatted string back to raw number
    const parsedEditBudget = editBudgetLimit.trim()
      ? parseFloat(editBudgetLimit.replace(/\./g, ''))
      : undefined;

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
    } catch (err: any) {
      showFeedback(err.message || 'Cập nhật danh mục thất bại', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}" không?`);
    if (!confirmDelete) return;

    try {
      setError(null);
      await categoryService.delete(id);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      showFeedback('Xóa danh mục thành công!', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'Xóa danh mục thất bại', 'error');
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

  const getTabTypeName = (tab: TransactionType) => {
    if (tab === TransactionType.INCOME) return 'thu nhập';
    if (tab === TransactionType.INVESTMENT) return 'đầu tư';
    return 'chi tiêu';
  };

  return (
    <div className="categories-view">
      <header className="categories-header animate-fade-in">
        <div className="categories-title-row">
          <div>
            <h2>Quản lý Danh mục</h2>
            <p className="subtitle">Tổ chức và phân loại chi phí, thu nhập & đầu tư của bạn</p>
          </div>
          <button className="btn btn-primary create-category-btn" onClick={openCreateModal}>
            <Plus size={16} /> Tạo danh mục
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <AlertTriangle size={18} className="error-icon" /> {error}
        </div>
      )}

      {/* Main List Section */}
      <div className="categories-single-column animate-fade-in">
        <div className="glass-card list-card">
          <div className="list-header-tabs">
            <h3>Danh mục hiện có</h3>
            <div className="category-tabs">
              <button
                type="button"
                className={`category-tab flex items-center gap-1.5 ${activeTab === TransactionType.EXPENSE ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.EXPENSE)}
              >
                <ShoppingBag size={15} />
                <span>Chi tiêu</span>
              </button>
              <button
                type="button"
                className={`category-tab flex items-center gap-1.5 ${activeTab === TransactionType.INCOME ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.INCOME)}
              >
                <Wallet size={15} />
                <span>Thu nhập</span>
              </button>
              <button
                type="button"
                className={`category-tab flex items-center gap-1.5 ${activeTab === TransactionType.INVESTMENT ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.INVESTMENT)}
              >
                <TrendingUp size={15} />
                <span>Đầu tư</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tải danh mục...</p>
            </div>
          ) : categories.length === 0 ? (
            <div
              className="empty-state"
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
                className="btn btn-primary"
                onClick={openCreateModal}
                style={{ marginTop: '0.5rem' }}
              >
                <Plus size={16} /> Tạo danh mục {getTabTypeName(activeTab)}
              </button>
            </div>
          ) : (
            <>
              <div className="categories-list">
                {categories.map((cat) => (
                  <div key={cat.id} className="category-item-card">
                    <div className="category-item-info">
                      <div className="category-item-title-row">
                        <h4>
                          {cat.name}{' '}
                          {cat.budgetLimit !== undefined && (
                            <span className="text-xs text-slate-400 font-normal ml-1">
                              (Hạn mức: {cat.budgetLimit.toLocaleString('vi-VN')}đ)
                            </span>
                          )}
                          {cat.excludeFromAverageDaily && (
                            <span className="exclude-avg-badge">
                              Không tính vào trung bình ngày
                            </span>
                          )}
                        </h4>
                      </div>
                      {cat.description ? (
                        <p className="category-item-desc">{cat.description}</p>
                      ) : (
                        <p className="category-item-desc no-desc">Không có mô tả</p>
                      )}
                    </div>
                    <div className="category-item-actions">
                      <button
                        onClick={() => startEdit(cat)}
                        className="action-btn edit-btn"
                        aria-label={`Chỉnh sửa danh mục ${cat.name}`}
                        title={`Chỉnh sửa danh mục ${cat.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="action-btn delete-btn"
                        aria-label={`Xóa danh mục ${cat.name}`}
                        title={`Xóa danh mục ${cat.name}`}
                      >
                        <Trash2 size={14} />
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
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
              <button type="button" className="close-btn" onClick={closeModal} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            {editingCategory ? (
              <form onSubmit={handleUpdate}>
                <div className="form-group">
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
                <div className="form-group">
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
                    <div className="form-group">
                      <label htmlFor="edit-budget">Hạn mức chi tiêu hàng tháng (đ)</label>
                      <input
                        id="edit-budget"
                        type="text"
                        value={editBudgetLimit}
                        onChange={(e) => handleEditBudgetChange(e.target.value)}
                        placeholder="Ví dụ: 5.000.000"
                      />
                    </div>
                    <div className="form-group form-check">
                      <label className="checkbox-label">
                        <input
                          id="edit-exclude-avg"
                          type="checkbox"
                          checked={editExcludeFromAverageDaily}
                          onChange={(e) => setEditExcludeFromAverageDaily(e.target.checked)}
                        />
                        Không tính vào chi tiêu trung bình ngày
                      </label>
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label htmlFor="edit-desc">Mô tả</label>
                  <textarea
                    id="edit-desc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Mô tả ngắn về danh mục này..."
                    rows={3}
                  />
                </div>
                <div className="button-group">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Lưu danh mục
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreate}>
                <div className="form-group">
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
                <div className="form-group">
                  <label htmlFor="new-type">Loại danh mục</label>
                  <Select
                    id="new-type"
                    options={typeOptions}
                    value={typeOptions.find((opt) => opt.value === type) || null}
                    onChange={(option) =>
                      setType((option ? option.value : TransactionType.EXPENSE) as TransactionType)
                    }
                    classNamePrefix="react-select"
                    placeholder="Chọn Loại danh mục"
                    menuPortalTarget={document.body}
                  />
                </div>
                {type === TransactionType.EXPENSE && (
                  <>
                    <div className="form-group">
                      <label htmlFor="new-budget">Hạn mức chi tiêu hàng tháng (đ)</label>
                      <input
                        id="new-budget"
                        type="text"
                        value={budgetLimit}
                        onChange={(e) => handleBudgetChange(e.target.value)}
                        placeholder="Ví dụ: 5.000.000"
                      />
                    </div>
                    <div className="form-group form-check">
                      <label className="checkbox-label">
                        <input
                          id="new-exclude-avg"
                          type="checkbox"
                          checked={excludeFromAverageDaily}
                          onChange={(e) => setExcludeFromAverageDaily(e.target.checked)}
                        />
                        Không tính vào chi tiêu trung bình ngày
                      </label>
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label htmlFor="new-desc">Mô tả</label>
                  <textarea
                    id="new-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn về danh mục này..."
                    rows={3}
                  />
                </div>
                <div className="button-group">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Thêm danh mục
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
