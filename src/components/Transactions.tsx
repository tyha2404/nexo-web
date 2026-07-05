import React, { useState, useEffect } from 'react';
import { costService, categoryService } from '../services/api';
import type { Cost, Category } from '../services/api';
import './Transactions.css';

export default function Transactions() {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [incurredAt, setIncurredAt] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [costsData, categoriesData] = await Promise.all([
        costService.list(),
        categoryService.list(),
      ]);
      setCosts(costsData);
      setCategories(categoriesData);
    } catch (err: any) {
      setError(err.message || 'Lấy dữ liệu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const openAddModal = () => {
    setEditingCost(null);
    setTitle('');
    setAmount('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setIncurredAt(new Date().toISOString().substring(0, 10));
    setCurrency('USD');
    setIsModalOpen(true);
  };

  const openEditModal = (cost: Cost) => {
    setEditingCost(cost);
    setTitle(cost.title);
    setAmount(cost.amount.toString());
    setCategoryId(cost.categoryId);
    setIncurredAt(new Date(cost.incurredAt).toISOString().substring(0, 10));
    setCurrency(cost.currency || 'USD');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId || !incurredAt) {
      showFeedback('Vui lòng điền đầy đủ các trường bắt buộc', 'error');
      return;
    }

    const payload = {
      title: title.trim(),
      amount: parseFloat(amount),
      categoryId,
      incurredAt: new Date(incurredAt).toISOString(),
      currency,
    };

    try {
      if (editingCost) {
        const updated = await costService.update(editingCost.id, payload);
        setCosts((prev) => prev.map((item) => (item.id === editingCost.id ? updated : item)));
        showFeedback('Cập nhật giao dịch thành công!', 'success');
      } else {
        const created = await costService.create(payload);
        setCosts((prev) => [created, ...prev]);
        showFeedback('Thêm giao dịch thành công!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showFeedback(err.message || 'Lưu giao dịch thất bại', 'error');
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa giao dịch "${itemTitle}" không?`);
    if (!confirmDelete) return;

    try {
      await costService.delete(id);
      setCosts((prev) => prev.filter((item) => item.id !== id));
      showFeedback('Xóa giao dịch thành công!', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'Xóa giao dịch thất bại', 'error');
    }
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Chưa phân loại';
  };

  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(val);
  };

  // Filter costs client-side
  const filteredCosts = costs.filter((cost) => {
    const matchesSearch = cost.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter ? cost.categoryId === selectedCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Sổ giao dịch</h2>
          <p className="subtitle">Theo dõi và quản lý các khoản chi tiêu và chi phí của bạn</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Thêm giao dịch
        </button>
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

      {/* Filter and Search controls */}
      <div className="filter-bar animate-fade-in">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="category-select-wrapper">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả Danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner animate-fade-in">
          <div className="spinner"></div>
          <p>Đang tải giao dịch...</p>
        </div>
      ) : filteredCosts.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <p>Không tìm thấy giao dịch nào. Hãy thử điều chỉnh bộ lọc hoặc thêm giao dịch mới!</p>
        </div>
      ) : (
        <div className="transactions-table-container animate-fade-in">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Tiêu đề / Nội dung</th>
                <th>Số tiền</th>
                <th>Danh mục</th>
                <th>Ngày thực hiện</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map((cost) => (
                <tr key={cost.id}>
                  <td className="txn-title-cell">{cost.title}</td>
                  <td className="txn-amount">
                    {formatCurrency(cost.amount, cost.currency || 'USD')}
                  </td>
                  <td>
                    <span className="txn-category-badge">
                      {getCategoryName(cost.categoryId)}
                    </span>
                  </td>
                  <td className="txn-date">
                    {new Date(cost.incurredAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="txn-actions-cell">
                    <button
                      onClick={() => openEditModal(cost)}
                      className="action-btn edit-btn"
                      style={{ marginRight: '0.5rem' }}
                      aria-label={`Sửa ${cost.title}`}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(cost.id, cost.title)}
                      className="action-btn delete-btn"
                      aria-label={`Xóa ${cost.title}`}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form / Modal overlay */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCost ? 'Sửa giao dịch' : 'Thêm giao dịch'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="txn-title">Tiêu đề / Nội dung</label>
                <input
                  id="txn-title"
                  type="text"
                  placeholder="Ví dụ: Mua sắm tạp hóa"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-amount">Số tiền</label>
                <input
                  id="txn-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-category">Danh mục</label>
                <select
                  id="txn-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Chọn Danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="txn-incurred">Ngày thực hiện</label>
                <input
                  id="txn-incurred"
                  type="date"
                  value={incurredAt}
                  onChange={(e) => setIncurredAt(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-currency">Tiền tệ</label>
                <select
                  id="txn-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  {editingCost ? 'Cập nhật' : 'Thêm'} giao dịch
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
