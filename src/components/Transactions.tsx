import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { transactionService, categoryService } from '../services/api';
import type { Transaction, Category } from '../commons/types';
import { TransactionType, DATE_FORMAT_INPUT } from '../commons/constants';
import { formatCurrency, formatDate, toISODateString } from '../commons/utils';
import { toast } from 'react-toastify';
import './Transactions.css';

export interface TransactionsProps {
  type?: TransactionType;
}

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
    zIndex: 99999,
  }),
  menuPortal: (provided: any) => ({
    ...provided,
    zIndex: 99999,
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

export default function Transactions({ type = TransactionType.EXPENSE }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [transactionsData, categoriesData] = await Promise.all([
          transactionService.list({ type }),
          categoryService.list({ type }),
        ]);
        setTransactions(transactionsData || []);
        setCategories(categoriesData || []);
      } catch (err: any) {
        setError(err.message || 'Lấy dữ liệu thất bại');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type]);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const filteredCategories = categories;

  // Predefined quick options for Income/Expense
  const presetOptions =
    type === TransactionType.INCOME
      ? [
          { label: 'Lương tháng', amount: '15000000', categoryKeyword: 'Lương' },
          { label: 'Thưởng', amount: '2000000', categoryKeyword: 'Thưởng' },
          { label: 'Lãi tiết kiệm', amount: '500000', categoryKeyword: 'Đầu tư' },
          { label: 'Freelance', amount: '3000000', categoryKeyword: 'Thu nhập' },
        ]
      : [
          { label: 'Ăn sáng / Cà phê', amount: '50000', categoryKeyword: 'Ăn uống' },
          { label: 'Ăn trưa / tối', amount: '80000', categoryKeyword: 'Ăn uống' },
          { label: 'Đổ xăng', amount: '70000', categoryKeyword: 'Di chuyển' },
          { label: 'Đi chợ / siêu thị', amount: '200000', categoryKeyword: 'Ăn uống' },
          { label: 'Tiền điện nước', amount: '1200000', categoryKeyword: 'Tiền nhà' },
          { label: 'Internet', amount: '250000', categoryKeyword: 'Tiền nhà' },
        ];

  const handleAmountChange = (val: string) => {
    // Remove all non-digit characters
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setAmount('');
      return;
    }
    // Format with dot separators for display
    const formatted = parseInt(cleanNumber, 10).toLocaleString('vi-VN');
    setAmount(formatted);
  };

  const handleApplyPreset = (preset: (typeof presetOptions)[0]) => {
    setTitle(preset.label);

    // Preset amount is raw number, format it
    const formattedAmount = parseInt(preset.amount, 10).toLocaleString('vi-VN');
    setAmount(formattedAmount);

    // Find category that matches keyword
    const matchedCategory =
      filteredCategories.find((cat) =>
        cat.name.toLowerCase().includes(preset.categoryKeyword.toLowerCase())
      ) || filteredCategories[0];

    if (matchedCategory) {
      setCategoryId(matchedCategory.id);
    }
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setTitle('');
    setAmount('');
    setCategoryId(filteredCategories.length > 0 ? filteredCategories[0].id : '');
    setTransactionDate(formatDate(moment(), DATE_FORMAT_INPUT));
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTitle(transaction.description || '');
    // Convert backend float to integer display string with separators
    const rawVal = Math.round(transaction.amount).toString();
    const formattedAmount = parseInt(rawVal, 10).toLocaleString('vi-VN');
    setAmount(formattedAmount);
    setCategoryId(transaction.categoryId);
    setTransactionDate(formatDate(transaction.transactionDate, DATE_FORMAT_INPUT));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId || !transactionDate) {
      showFeedback('Vui lòng điền đầy đủ các trường bắt buộc', 'error');
      return;
    }

    // Parse display formatted string back to raw number
    const rawAmount = parseFloat(amount.replace(/\./g, ''));

    const payload = {
      description: title.trim(),
      amount: rawAmount,
      categoryId,
      transactionDate: toISODateString(transactionDate),
      type,
    };

    try {
      if (editingTransaction) {
        const updated = await transactionService.update(editingTransaction.id, payload);
        setTransactions((prev) =>
          prev.map((item) => (item.id === editingTransaction.id ? updated : item))
        );
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
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa giao dịch "${itemDescription}" không?`
    );
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

  // Filter transactions client-side
  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch = (txn.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter
      ? txn.categoryId === selectedCategoryFilter
      : true;

    let matchesDate = true;
    const txnMoment = moment(txn.transactionDate);
    if (startDate) {
      matchesDate = matchesDate && txnMoment.isSameOrAfter(moment(startDate).startOf('day'));
    }
    if (endDate) {
      matchesDate = matchesDate && txnMoment.isSameOrBefore(moment(endDate).endOf('day'));
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>{type === TransactionType.INCOME ? 'Quản lý Thu nhập' : 'Quản lý Chi tiêu'}</h2>
          <p className="subtitle">
            Theo dõi và quản lý các khoản{' '}
            {type === TransactionType.INCOME ? 'thu nhập' : 'chi tiêu'} của bạn
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Thêm {type === TransactionType.INCOME ? 'thu nhập' : 'chi tiêu'}
          </button>
        </div>
      </header>

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
          <Select
            options={[
              { value: '', label: 'Tất cả Danh mục' },
              ...filteredCategories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
            value={
              [
                { value: '', label: 'Tất cả Danh mục' },
                ...filteredCategories.map((cat) => ({ value: cat.id, label: cat.name })),
              ].find((opt) => opt.value === selectedCategoryFilter) || null
            }
            onChange={(option) => setSelectedCategoryFilter(option ? option.value : '')}
            styles={customSelectStyles}
            placeholder="Tất cả Danh mục"
            isSearchable={true}
            menuPortalTarget={document.body}
          />
        </div>
        <div className="date-range-wrapper">
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            isClearable={true}
            placeholderText="Chọn khoảng ngày"
            dateFormat="dd/MM/yyyy"
            className="react-datepicker-input"
            portalId="date-picker-portal"
          />
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
                  <td className="txn-amount">{formatCurrency(txn.amount)}</td>
                  <td>
                    <span className="txn-category-badge">{getCategoryName(txn.categoryId)}</span>
                  </td>
                  <td className="txn-date">{formatDate(txn.transactionDate)}</td>
                  <td className="txn-actions-cell">
                    <button
                      onClick={() => openEditModal(txn)}
                      className="action-btn edit-btn"
                      style={{ marginRight: '0.5rem' }}
                      aria-label={`Sửa ${txn.description || ''}`}
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
                      onClick={() => handleDelete(txn.id, txn.description || '')}
                      className="action-btn delete-btn"
                      aria-label={`Xóa ${txn.description || ''}`}
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
              {!editingTransaction && (
                <div className="form-group">
                  <label>Chọn nhanh (Mẫu giao dịch)</label>
                  <div className="presets-container">
                    {presetOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="preset-tag-btn"
                        onClick={() => handleApplyPreset(opt)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                <label htmlFor="txn-amount">Số tiền (đ)</label>
                <input
                  id="txn-amount"
                  type="text"
                  placeholder="Ví dụ: 50.000"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-category">Danh mục</label>
                <Select
                  id="txn-category"
                  options={filteredCategories.map((cat) => ({ value: cat.id, label: cat.name }))}
                  value={
                    filteredCategories
                      .map((cat) => ({ value: cat.id, label: cat.name }))
                      .find((opt) => opt.value === categoryId) || null
                  }
                  onChange={(option) => setCategoryId(option ? option.value : '')}
                  styles={customSelectStyles}
                  placeholder="Chọn Danh mục"
                  isSearchable={true}
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-incurred">Ngày thực hiện</label>
                <DatePicker
                  id="txn-incurred"
                  selected={transactionDate ? moment(transactionDate).toDate() : null}
                  onChange={(date: Date | null) =>
                    setTransactionDate(date ? moment(date).format('YYYY-MM-DD') : '')
                  }
                  dateFormat="dd/MM/yyyy"
                  portalId="date-picker-portal"
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
