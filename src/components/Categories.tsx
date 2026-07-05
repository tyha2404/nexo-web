import React, { useState, useEffect } from 'react';
import { categoryService } from '../services/api';
import type { Category, TransactionType } from '../services/api';
import './Categories.css';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [description, setDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TransactionType>('EXPENSE');
  const [editDescription, setEditDescription] = useState('');

  // Notifications/Feedback messages
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.list();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Lấy danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setError(null);
      const newCat = await categoryService.create({
        name: name.trim(),
        type,
        description: description.trim() || undefined
      });
      setCategories((prev) => [...prev, newCat]);
      setName('');
      setType('EXPENSE');
      setDescription('');
      showFeedback('Tạo danh mục thành công!', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'Tạo danh mục thất bại', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    try {
      setError(null);
      const updatedCat = await categoryService.update(editingCategory.id, {
        name: editName.trim(),
        type: editType,
        description: editDescription.trim() || undefined
      });
      setCategories((prev) => prev.map((cat) => (cat.id === editingCategory.id ? updatedCat : cat)));
      setEditingCategory(null);
      setEditName('');
      setEditType('EXPENSE');
      setEditDescription('');
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
    setEditType(category.type);
    setEditDescription(category.description || '');
  };

  return (
    <div className="categories-view">
      <header className="categories-header animate-fade-in">
        <h2>Quản lý Danh mục</h2>
        <p className="subtitle">Tổ chức và phân loại chi phí của bạn theo danh mục</p>
      </header>

      {feedback && (
        <div className={`feedback-alert ${feedback.type} animate-fade-in`}>
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="error-banner animate-fade-in">
          <span className="error-icon">⚠️</span> {error}
        </div>
      )}

      <div className="categories-grid">
        {/* Left Column: Form */}
        <div className="form-column">
          {editingCategory ? (
            <div className="glass-card form-card animate-scale-in">
              <h3>Sửa danh mục</h3>
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
                  <select
                    id="edit-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                    required
                  >
                    <option value="EXPENSE">Khoản chi (Expense)</option>
                    <option value="INCOME">Khoản thu (Income)</option>
                  </select>
                </div>
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
                  <button type="submit" className="btn btn-primary">Sửa danh mục</button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingCategory(null);
                      setEditName('');
                      setEditType('EXPENSE');
                      setEditDescription('');
                    }}
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="glass-card form-card animate-scale-in">
              <h3>Thêm danh mục</h3>
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
                  <select
                    id="new-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    required
                  >
                    <option value="EXPENSE">Khoản chi (Expense)</option>
                    <option value="INCOME">Khoản thu (Income)</option>
                  </select>
                </div>
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
                <button type="submit" className="btn btn-primary btn-block">Thêm danh mục</button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: List */}
        <div className="list-column animate-fade-in">
          <div className="glass-card list-card">
            <h3>Danh mục hiện có</h3>
            
            {loading ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Đang tải danh mục...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="empty-state">
                <p>Không tìm thấy danh mục nào. Hãy tạo danh mục đầu tiên của bạn ở bên trái!</p>
              </div>
            ) : (
              <div className="categories-list">
                {categories.map((cat) => (
                  <div key={cat.id} className="category-item-card">
                    <div className="category-item-info">
                      <div className="category-item-title-row">
                        <h4>{cat.name}</h4>
                        <span className={`type-badge ${cat.type.toLowerCase()}`}>
                          {cat.type === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}
                        </span>
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
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="action-btn delete-btn"
                        aria-label={`Xóa danh mục ${cat.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
