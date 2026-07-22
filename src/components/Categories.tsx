import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { categoryService } from '../services/api';
import { TransactionType } from '../commons/constants';
import type { Category } from '../commons/types';
import { toast } from 'react-toastify';
import './Categories.css';

/* eslint-disable @typescript-eslint/no-explicit-any */
const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    background: 'var(--bg-input)',
    borderColor: state.isFocused ? 'var(--primary)' : 'var(--border)',
    borderRadius: '10px',
    color: 'var(--text-main)',
    minHeight: '42px',
    boxShadow: state.isFocused ? '0 0 0 3px var(--primary-glow)' : 'none',
    '&:hover': {
      borderColor: 'var(--border-hover)',
    },
  }),
  menu: (provided: any) => ({
    ...provided,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    background: state.isSelected
      ? 'var(--primary)'
      : state.isFocused
        ? 'var(--bg-hover)'
        : 'transparent',
    color: state.isSelected ? 'var(--text-dark)' : 'var(--text-main)',
    cursor: 'pointer',
    '&:active': {
      background: 'var(--primary)',
      color: 'var(--text-dark)',
    },
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: 'var(--text-main)',
  }),
  input: (provided: any) => ({
    ...provided,
    color: 'var(--text-main)',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: 'var(--text-muted)',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (provided: any, state: any) => ({
    ...provided,
    color: state.isFocused ? 'var(--primary)' : 'var(--text-muted)',
    '&:hover': {
      color: 'var(--primary)',
    },
  }),
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [description, setDescription] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [editDescription, setEditDescription] = useState('');
  const [editBudgetLimit, setEditBudgetLimit] = useState('');

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

  const fetchCategories = async (selectedType: TransactionType) => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.list({ type: selectedType });
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message || 'Lấy danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(activeTab);
  }, [activeTab]);

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
      });
      if (type === activeTab) {
        setCategories((prev) => [...prev, newCat]);
      }
      setName('');
      setType(TransactionType.EXPENSE);
      setDescription('');
      setBudgetLimit('');
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '6px' }}
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Tạo danh mục
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <span className="error-icon">⚠️</span> {error}
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
                className={`category-tab ${activeTab === TransactionType.EXPENSE ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.EXPENSE)}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                className={`category-tab ${activeTab === TransactionType.INCOME ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.INCOME)}
              >
                Thu nhập
              </button>
              <button
                type="button"
                className={`category-tab ${activeTab === TransactionType.INVESTMENT ? 'active' : ''}`}
                onClick={() => setActiveTab(TransactionType.INVESTMENT)}
              >
                Đầu tư
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Đang tải danh mục...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <p>
                Không tìm thấy danh mục {getTabTypeName(activeTab)} nào. Hãy nhấn "Tạo danh mục" ở
                trên để tạo mới!
              </p>
            </div>
          ) : (
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
                      aria-label={`Sửa danh mục ${cat.name}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="action-btn delete-btn"
                      aria-label={`Xóa danh mục ${cat.name}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Popup for Create / Edit Category */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
              <button type="button" className="close-btn" onClick={closeModal}>
                &times;
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
                    styles={customSelectStyles}
                    placeholder="Chọn Loại danh mục"
                    menuPortalTarget={document.body}
                  />
                </div>
                {editType === TransactionType.EXPENSE && (
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
                  <button type="submit" className="btn btn-primary">
                    Lưu danh mục
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Hủy
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
                    styles={customSelectStyles}
                    placeholder="Chọn Loại danh mục"
                    menuPortalTarget={document.body}
                  />
                </div>
                {type === TransactionType.EXPENSE && (
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
                  <button type="submit" className="btn btn-primary">
                    Thêm danh mục
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    Hủy
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
