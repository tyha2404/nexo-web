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
import Pagination from './Pagination';
import './Transactions.css';

export interface TransactionsProps {
  type?: TransactionType;
}

export default function Transactions({ type = TransactionType.EXPENSE }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    moment().startOf('month').toDate(),
    moment().endOf('month').toDate(),
  ]);
  const [startDate, endDate] = dateRange;

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');

  useEffect(() => {
    // Reset page and filters when transaction type tab changes
    setCurrentPage(1);
    setSelectedCategoryFilter('');
    setSearchQuery('');

    const fetchCategoriesData = async () => {
      try {
        const categoriesData = await categoryService.list({ type });
        setCategories(categoriesData.items || []);
      } catch (err: any) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategoriesData();
  }, [type]);

  useEffect(() => {
    const fetchTransactionsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await transactionService.list({
          type,
          categoryId: selectedCategoryFilter || undefined,
          startDate: startDate ? toISODateString(startDate) : undefined,
          endDate: endDate ? toISODateString(endDate) : undefined,
          page: currentPage,
          limit: itemsPerPage,
        });
        setTransactions(res.items || []);
        setTotalItems(res.total || 0);
      } catch (err: any) {
        setError(err.message || 'Lấy danh sách giao dịch thất bại');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionsData();
  }, [type, selectedCategoryFilter, startDate, endDate, currentPage, itemsPerPage]);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const filteredCategories = categories;

  // Predefined quick options for Income/Expense/Investment
  const presetOptions =
    type === TransactionType.INCOME
      ? [
          { label: 'Lương tháng', amount: '15000000', categoryKeyword: 'Lương' },
          { label: 'Thưởng', amount: '2000000', categoryKeyword: 'Thưởng' },
          { label: 'Lãi tiết kiệm', amount: '500000', categoryKeyword: 'Đầu tư' },
          { label: 'Freelance', amount: '3000000', categoryKeyword: 'Thu nhập' },
        ]
      : type === TransactionType.INVESTMENT
        ? [
            { label: 'Mua cổ phiếu', amount: '5000000', categoryKeyword: 'Cổ phiếu' },
            { label: 'Chứng chỉ tiền gửi', amount: '10000000', categoryKeyword: 'chứng chỉ' },
            { label: 'Gửi tiết kiệm', amount: '20000000', categoryKeyword: 'tiết kiệm' },
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

  // Filter transactions client-side for search query if needed
  const filteredTransactions = transactions.filter((txn) => {
    return (txn.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Calculate total pages from totalItems from server
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>
            {type === TransactionType.INCOME
              ? 'Quản lý Thu nhập'
              : type === TransactionType.INVESTMENT
                ? 'Quản lý Đầu tư'
                : 'Quản lý Chi tiêu'}
          </h2>
          <p className="subtitle">
            Theo dõi và quản lý các khoản{' '}
            {type === TransactionType.INCOME
              ? 'thu nhập'
              : type === TransactionType.INVESTMENT
                ? 'đầu tư'
                : 'chi tiêu'}{' '}
            của bạn
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={openAddModal}>
            + Thêm{' '}
            {type === TransactionType.INCOME
              ? 'thu nhập'
              : type === TransactionType.INVESTMENT
                ? 'đầu tư'
                : 'chi tiêu'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <span className="error-icon">⚠️</span> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      {(() => {
        const sumAmount = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);
        const count = totalItems || filteredTransactions.length;
        const avg = filteredTransactions.length > 0 ? sumAmount / filteredTransactions.length : 0;

        if (type === TransactionType.INCOME) {
          return (
            <div className="summary-cards-grid animate-fade-in">
              <div className="summary-stat-card accent-income">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Thu Nhập</span>
                  <div
                    className="summary-stat-icon"
                    style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}
                  >
                    💵
                  </div>
                </div>
                <div className="summary-stat-value" style={{ color: '#34d399' }}>
                  {formatCurrency(sumAmount)}
                </div>
                <div className="summary-stat-subtitle">Tổng khoản thu nhập trong kỳ</div>
              </div>

              <div className="summary-stat-card accent-purple">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Số Giao Dịch Thu</span>
                  <div
                    className="summary-stat-icon"
                    style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}
                  >
                    📊
                  </div>
                </div>
                <div className="summary-stat-value" style={{ color: '#a855f7' }}>
                  {count} khoản
                </div>
                <div className="summary-stat-subtitle">Tổng số đợt nhận thu nhập</div>
              </div>

              <div className="summary-stat-card accent-primary">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Trung Bình / Khoản</span>
                  <div
                    className="summary-stat-icon"
                    style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
                  >
                    ⚖️
                  </div>
                </div>
                <div className="summary-stat-value" style={{ color: '#38bdf8' }}>
                  {formatCurrency(avg)}
                </div>
                <div className="summary-stat-subtitle">Giá trị thu nhập trung bình</div>
              </div>
            </div>
          );
        }

        if (type === TransactionType.INVESTMENT) {
          return (
            <div className="summary-cards-grid animate-fade-in">
              <div className="summary-stat-card accent-primary">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Tiền Đầu Tư</span>
                  <div className="summary-stat-icon icon-primary">💎</div>
                </div>
                <div className="summary-stat-value value-primary">{formatCurrency(sumAmount)}</div>
                <div className="summary-stat-subtitle">Tổng số tiền đã tích lũy / đầu tư</div>
              </div>

              <div className="summary-stat-card accent-income">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Số Đợt Tích Lũy</span>
                  <div className="summary-stat-icon icon-income">📈</div>
                </div>
                <div className="summary-stat-value value-income">{count} đợt</div>
                <div className="summary-stat-subtitle">Số lần rót vốn đầu tư</div>
              </div>

              <div className="summary-stat-card accent-purple">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Trung Bình / Đợt</span>
                  <div className="summary-stat-icon icon-purple">🎯</div>
                </div>
                <div className="summary-stat-value value-purple">{formatCurrency(avg)}</div>
                <div className="summary-stat-subtitle">Giá trị đầu tư trung bình</div>
              </div>
            </div>
          );
        }

        // Default: EXPENSE
        const today = moment().startOf('day');
        const start = startDate ? moment(startDate).startOf('day') : moment().startOf('month');
        const end = endDate ? moment(endDate).startOf('day') : moment().endOf('month');

        // Effective end date is capped at today if selected date range extends into the future or is current month
        const effectiveEnd = end.isAfter(today) ? today : end;
        const daysCount = Math.max(1, effectiveEnd.diff(start, 'days') + 1);
        const dailyAvg = sumAmount / daysCount;

        return (
          <div className="summary-cards-grid animate-fade-in">
            <div className="summary-stat-card accent-expense">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Tổng Chi Tiêu</span>
                <div className="summary-stat-icon icon-expense">🛍️</div>
              </div>
              <div className="summary-stat-value value-expense">{formatCurrency(sumAmount)}</div>
              <div className="summary-stat-subtitle">Tổng tiền đã chi trong kỳ</div>
            </div>

            <div className="summary-stat-card accent-warning">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Trung Bình / Ngày</span>
                <div className="summary-stat-icon icon-warning">📅</div>
              </div>
              <div className="summary-stat-value value-warning">{formatCurrency(dailyAvg)}</div>
              <div className="summary-stat-subtitle">
                Chi tiêu bình quân trong {daysCount} ngày (tới hôm nay)
              </div>
            </div>

            <div className="summary-stat-card accent-primary">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Trung Bình / Lần Chi</span>
                <div className="summary-stat-icon icon-primary">💸</div>
              </div>
              <div className="summary-stat-value value-primary">{formatCurrency(avg)}</div>
              <div className="summary-stat-subtitle">Mức chi trung bình mỗi giao dịch</div>
            </div>

            <div className="summary-stat-card accent-purple">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Số Lần Chi Tiêu</span>
                <div className="summary-stat-icon icon-purple">🧾</div>
              </div>
              <div className="summary-stat-value value-purple">{count} giao dịch</div>
              <div className="summary-stat-subtitle">Tổng số hóa đơn / giao dịch chi</div>
            </div>
          </div>
        );
      })()}

      {/* Filter and Search controls */}
      <div className="filter-bar animate-fade-in">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tiêu đề..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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
            onChange={(option) => {
              setSelectedCategoryFilter(option ? option.value : '');
              setCurrentPage(1);
            }}
            classNamePrefix="react-select"
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
            onChange={(update) => {
              setDateRange(update);
              setCurrentPage(1);
            }}
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
        <>
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
                      <div className="action-buttons-wrapper">
                        <button
                          onClick={() => openEditModal(txn)}
                          className="action-btn edit-btn"
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
            totalItems={totalItems}
          />
        </>
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
                  classNamePrefix="react-select"
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
