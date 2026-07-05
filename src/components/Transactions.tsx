import React, { useState, useEffect } from 'react';
import { transactionService, categoryService } from '../services/api';
import type { Transaction, Category, TransactionType } from '../services/api';
import './Transactions.css';

export interface TransactionsProps {
  type?: TransactionType;
}

export default function Transactions({ type = 'EXPENSE' }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [transactionsData, categoriesData] = await Promise.all([
        transactionService.list({ type }),
        categoryService.list(),
      ]);
      setTransactions(transactionsData);
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

  const filteredCategories = categories.filter((cat) => cat.type === type);

  const openAddModal = () => {
    setEditingTransaction(null);
    setTitle('');
    setAmount('');
    setCategoryId(filteredCategories.length > 0 ? filteredCategories[0].id : '');
    setTransactionDate(new Date().toISOString().substring(0, 10));
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTitle(transaction.description || '');
    setAmount(transaction.amount.toString());
    setCategoryId(transaction.categoryId);
    setTransactionDate(new Date(transaction.transactionDate).toISOString().substring(0, 10));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId || !transactionDate) {
      showFeedback('Vui lòng điền đầy đủ các trường bắt buộc', 'error');
      return;
    }

    const payload = {
      description: title.trim(),
      amount: parseFloat(amount),
      categoryId,
      transactionDate: new Date(transactionDate).toISOString(),
      type,
    };

    try {
      if (editingTransaction) {
        const updated = await transactionService.update(editingTransaction.id, payload);
        setTransactions((prev) => prev.map((item) => (item.id === editingTransaction.id ? updated : item)));
        showFeedback('Cập nhật giao dịch thành công!', 'success');
      } else {
        const created = await transactionService.create(payload);
        setTransactions((prev) => [created, ...prev]);
        showFeedback('Thêm giao dịch thành công!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showFeedback(err.message || 'Lưu giao dịch thất bại', 'error');
    }
  };

  const handleDelete = async (id: string, itemDescription: string) => {
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa giao dịch "${itemDescription}" không?`);
    if (!confirmDelete) return;

    try {
      await transactionService.delete(id);
      setTransactions((prev) => prev.filter((item) => item.id !== id));
      showFeedback('Xóa giao dịch thành công!', 'success');
    } catch (err: any) {
      showFeedback(err.message || 'Xóa giao dịch thất bại', 'error');
    }
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : 'Chưa phân loại';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  // Filter transactions client-side
  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = (txn.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter ? txn.categoryId === selectedCategoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>{type === 'INCOME' ? 'Quản lý Thu nhập' : 'Quản lý Chi tiêu'}</h2>
          <p className="subtitle">Theo dõi và quản lý các khoản {type === 'INCOME' ? 'thu nhập' : 'chi tiêu'} của bạn</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Thêm {type === 'INCOME' ? 'thu nhập' : 'chi tiêu'}
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
            {filteredCategories.map((cat) => (
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
      ) : filteredTransactions.length === 0 ? (
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
              {filteredTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="txn-title-cell">{txn.description}</td>
                  <td className="txn-amount">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td>
                    <span className="txn-category-badge">
                      {getCategoryName(txn.categoryId)}
                    </span>
                  </td>
                  <td className="txn-date">
                    {new Date(txn.transactionDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="txn-actions-cell">
                    <button
                      onClick={() => openEditModal(txn)}
                      className="action-btn edit-btn"
                      style={{ marginRight: '0.5rem' }}
                      aria-label={`Sửa ${txn.description || ''}`}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(txn.id, txn.description || '')}
                      className="action-btn delete-btn"
                      aria-label={`Xóa ${txn.description || ''}`}
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
              <h3>{editingTransaction ? 'Sửa giao dịch' : 'Thêm giao dịch'}</h3>
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
                  {filteredCategories.map((cat) => (
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
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>

              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Cập nhật' : 'Thêm'} giao dịch
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
