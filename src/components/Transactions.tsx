import moment from 'moment';
import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATE_FORMAT_INPUT, TransactionType } from '../commons/constants';
import type { Category, InvestmentStatus, Transaction } from '../commons/types';
import { formatCurrency, formatDate, toISODateString } from '../commons/utils';
import { categoryService, transactionService } from '../services/api';
import Pagination from './Pagination';
import './Transactions.css';

export interface TransactionsProps {
  type?: TransactionType;
}

const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  HOLDING: 'Đang đầu tư',
  SOLD: 'Đã bán',
  MATURED: 'Đã đáo hạn',
  CANCELLED: 'Đã hủy',
};

export default function Transactions({ type = TransactionType.EXPENSE }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    moment().startOf('month').toDate(),
    moment().endOf('month').toDate(),
  ]);
  const [startDate, endDate] = dateRange;

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<{
    sumAmount: number;
    sumAmountForAverage?: number;
    total: number;
    holdingAmount?: number;
    holdingCount?: number;
    realizedPnl?: number;
  }>({ sumAmount: 0, total: 0, holdingAmount: 0, holdingCount: 0, realizedPnl: 0 });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [status, setStatus] = useState<InvestmentStatus>('HOLDING');
  const [realizedPnl, setRealizedPnl] = useState<string>('0');

  useEffect(() => {
    // Reset page and filters when transaction type tab changes
    setCurrentPage(1);
    setSelectedCategoryFilter('');
    setSelectedStatusFilter('');
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
          status:
            type === TransactionType.INVESTMENT && selectedStatusFilter
              ? (selectedStatusFilter as InvestmentStatus)
              : undefined,
          startDate: startDate ? toISODateString(startDate) : undefined,
          endDate: endDate ? toISODateString(endDate) : undefined,
          page: currentPage,
          limit: itemsPerPage,
        });
        setTransactions(res.items || []);
        setTotalItems(res.total || 0);
        if (res.summary) {
          setSummary(res.summary);
        } else {
          setSummary({ sumAmount: 0, total: 0, holdingAmount: 0, holdingCount: 0, realizedPnl: 0 });
        }
      } catch (err: any) {
        setError(err.message || 'Lấy danh sách giao dịch thất bại');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionsData();
  }, [
    type,
    selectedCategoryFilter,
    selectedStatusFilter,
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

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
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setAmount('');
      return;
    }
    const formatted = parseInt(cleanNumber, 10).toLocaleString('vi-VN');
    setAmount(formatted);
  };

  const handlePnlChange = (val: string) => {
    const isNegative = val.trim().startsWith('-');
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setRealizedPnl(isNegative ? '-' : '');
      return;
    }
    const formatted = parseInt(cleanNumber, 10).toLocaleString('vi-VN');
    setRealizedPnl(isNegative ? `-${formatted}` : formatted);
  };

  const handleApplyPreset = (preset: (typeof presetOptions)[0]) => {
    setTitle(preset.label);

    const formattedAmount = parseInt(preset.amount, 10).toLocaleString('vi-VN');
    setAmount(formattedAmount);

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
    setStatus('HOLDING');
    setRealizedPnl('0');
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTitle(transaction.description || '');
    const rawVal = Math.round(transaction.amount).toString();
    const formattedAmount = parseInt(rawVal, 10).toLocaleString('vi-VN');
    setAmount(formattedAmount);
    setCategoryId(transaction.categoryId);
    setTransactionDate(formatDate(transaction.transactionDate, DATE_FORMAT_INPUT));
    setStatus(transaction.status || 'HOLDING');
    if (transaction.realizedPnl !== undefined && transaction.realizedPnl !== null) {
      const pnlVal = Math.round(transaction.realizedPnl);
      const isNeg = pnlVal < 0;
      const formattedPnl = Math.abs(pnlVal).toLocaleString('vi-VN');
      setRealizedPnl(isNeg ? `-${formattedPnl}` : formattedPnl);
    } else {
      setRealizedPnl('0');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId || !transactionDate) {
      showFeedback('Vui lòng điền đầy đủ các trường bắt buộc', 'error');
      return;
    }

    const rawAmount = parseFloat(amount.replace(/\./g, ''));
    let rawPnl = 0;
    if (realizedPnl) {
      const cleanPnl = realizedPnl.replace(/\./g, '');
      rawPnl = parseFloat(cleanPnl) || 0;
    }

    const payload: any = {
      description: title.trim(),
      amount: rawAmount,
      categoryId,
      transactionDate: toISODateString(transactionDate),
      type,
    };

    if (type === TransactionType.INVESTMENT) {
      payload.status = status;
      payload.realizedPnl = status === 'HOLDING' ? 0 : rawPnl;
    }

    try {
      if (editingTransaction) {
        await transactionService.update(editingTransaction.id, payload);
        showFeedback('Cập nhật giao dịch thành công!', 'success');
      } else {
        await transactionService.create(payload);
        showFeedback('Thêm giao dịch thành công!', 'success');
      }
      setRefreshKey((prev) => prev + 1);
      window.dispatchEvent(new Event('transactions-changed'));
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
      setRefreshKey((prev) => prev + 1);
      window.dispatchEvent(new Event('transactions-changed'));
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
        const sumAmount = summary.sumAmount;
        const count = summary.total;
        const avg = count > 0 ? sumAmount / count : 0;

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
          const holdingAmount = summary.holdingAmount ?? 0;
          const totalRealizedPnl = summary.realizedPnl ?? 0;
          const holdingCount = summary.holdingCount ?? 0;

          return (
            <div className="summary-cards-grid animate-fade-in">
              <div className="summary-stat-card accent-primary">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tiền Đang Đầu Tư (Holding)</span>
                  <div className="summary-stat-icon icon-primary">💎</div>
                </div>
                <div className="summary-stat-value value-primary">
                  {formatCurrency(holdingAmount)}
                </div>
                <div className="summary-stat-subtitle">
                  Giá trị các khoản đang giữ vốn ({holdingCount} mục)
                </div>
              </div>

              <div className="summary-stat-card accent-income">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Lãi / Lỗ Đã Thực Hiện</span>
                  <div className="summary-stat-icon icon-income">
                    {totalRealizedPnl >= 0 ? '📈' : '📉'}
                  </div>
                </div>
                <div
                  className="summary-stat-value"
                  style={{ color: totalRealizedPnl >= 0 ? '#34d399' : '#f87171' }}
                >
                  {totalRealizedPnl > 0 ? '+' : ''}
                  {formatCurrency(totalRealizedPnl)}
                </div>
                <div className="summary-stat-subtitle">
                  Tổng tiền lời / lỗ từ khoản đã bán/đáo hạn
                </div>
              </div>

              <div className="summary-stat-card accent-purple">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Vốn Tích Lũy</span>
                  <div className="summary-stat-icon icon-purple">🎯</div>
                </div>
                <div className="summary-stat-value value-purple">{formatCurrency(sumAmount)}</div>
                <div className="summary-stat-subtitle">
                  Tổng {count} đợt rót vốn đầu tư trong kỳ
                </div>
              </div>
            </div>
          );
        }

        // Default: EXPENSE
        const today = moment().startOf('day');
        const start = startDate ? moment(startDate).startOf('day') : moment().startOf('month');
        const end = endDate ? moment(endDate).startOf('day') : moment().endOf('month');

        const effectiveEnd = end.isAfter(today) ? today : end;
        const daysCount = Math.max(1, effectiveEnd.diff(start, 'days') + 1);
        const dailyAvg = (summary.sumAmountForAverage ?? summary.sumAmount) / daysCount;

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
                {summary.sumAmountForAverage !== undefined &&
                  summary.sumAmountForAverage !== summary.sumAmount &&
                  ' - không tính danh mục đã loại trừ'}
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
        {type === TransactionType.INVESTMENT && (
          <div className="status-select-wrapper">
            <Select
              options={[
                { value: '', label: 'Tất cả Trạng thái' },
                { value: 'HOLDING', label: 'Đang đầu tư' },
                { value: 'SOLD', label: 'Đã bán' },
                { value: 'MATURED', label: 'Đã đáo hạn' },
                { value: 'CANCELLED', label: 'Đã hủy' },
              ]}
              value={
                [
                  { value: '', label: 'Tất cả Trạng thái' },
                  { value: 'HOLDING', label: 'Đang đầu tư' },
                  { value: 'SOLD', label: 'Đã bán' },
                  { value: 'MATURED', label: 'Đã đáo hạn' },
                  { value: 'CANCELLED', label: 'Đã hủy' },
                ].find((opt) => opt.value === selectedStatusFilter) || null
              }
              onChange={(option) => {
                setSelectedStatusFilter(option ? option.value : '');
                setCurrentPage(1);
              }}
              classNamePrefix="react-select"
              placeholder="Trạng thái"
              isSearchable={false}
              menuPortalTarget={document.body}
            />
          </div>
        )}
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
        <div
          className="empty-state animate-fade-in"
          style={{ padding: '3rem 1.5rem', textAlign: 'center' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
            {type === TransactionType.INVESTMENT
              ? '📈'
              : type === TransactionType.INCOME
                ? '💵'
                : '🛍️'}
          </div>
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main)',
            }}
          >
            Không tìm thấy giao dịch nào
          </h4>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              maxWidth: '400px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            Hãy thử điều chỉnh bộ lọc tìm kiếm hoặc thêm giao dịch mới để theo dõi tài chính chính
            xác hơn!
          </p>
          <button
            onClick={openAddModal}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', minHeight: '42px', fontWeight: 600 }}
          >
            + Thêm{' '}
            {type === TransactionType.INVESTMENT
              ? 'đầu tư'
              : type === TransactionType.INCOME
                ? 'thu nhập'
                : 'chi tiêu'}{' '}
            ngay
          </button>
        </div>
      ) : (
        <>
          <div className="transactions-table-container animate-fade-in">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Tiêu đề / Nội dung</th>
                  <th>Số tiền</th>
                  {type === TransactionType.INVESTMENT && <th>Trạng thái</th>}
                  {type === TransactionType.INVESTMENT && <th>Lãi / Lỗ</th>}
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
                    {type === TransactionType.INVESTMENT && (
                      <td>
                        <span
                          className={`txn-status-badge status-${(txn.status || 'HOLDING').toLowerCase()}`}
                        >
                          {INVESTMENT_STATUS_LABELS[txn.status || 'HOLDING']}
                        </span>
                      </td>
                    )}
                    {type === TransactionType.INVESTMENT && (
                      <td className="txn-pnl-cell">
                        {txn.status && txn.status !== 'HOLDING' && txn.realizedPnl !== undefined ? (
                          <span
                            style={{
                              color: txn.realizedPnl >= 0 ? '#34d399' : '#f87171',
                              fontWeight: 600,
                            }}
                          >
                            {txn.realizedPnl > 0 ? '+' : ''}
                            {formatCurrency(txn.realizedPnl)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    )}
                    <td>
                      <span className="txn-category-badge">{getCategoryName(txn.categoryId)}</span>
                    </td>
                    <td className="txn-date">{formatDate(txn.transactionDate)}</td>
                    <td className="txn-actions-cell">
                      <div className="action-buttons-wrapper">
                        <button
                          onClick={() => openEditModal(txn)}
                          className="action-btn edit-btn"
                          aria-label={`Chỉnh sửa ${txn.description || 'giao dịch'}`}
                          title={`Chỉnh sửa ${txn.description || 'giao dịch'}`}
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
                          aria-label={`Xóa ${txn.description || 'giao dịch'}`}
                          title={`Xóa ${txn.description || 'giao dịch'}`}
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
                  placeholder={
                    type === TransactionType.INCOME
                      ? 'Ví dụ: Lương tháng 8, Thưởng dự án...'
                      : type === TransactionType.INVESTMENT
                        ? 'Ví dụ: Mua cổ phiếu Vinamilk, Gửi tiết kiệm...'
                        : 'Ví dụ: Mua sắm tạp hóa, Ăn uống...'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="txn-amount">
                  {type === TransactionType.INCOME
                    ? 'Số tiền thu nhập (đ)'
                    : type === TransactionType.INVESTMENT
                      ? 'Số tiền đầu tư (đ)'
                      : 'Số tiền chi tiêu (đ)'}
                </label>
                <input
                  id="txn-amount"
                  type="text"
                  placeholder={
                    type === TransactionType.INCOME
                      ? 'Ví dụ: 15.000.000'
                      : type === TransactionType.INVESTMENT
                        ? 'Ví dụ: 10.000.000'
                        : 'Ví dụ: 50.000'
                  }
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                />
              </div>

              {type === TransactionType.INVESTMENT && (
                <div className="form-group">
                  <label htmlFor="txn-status">Trạng thái đầu tư</label>
                  <Select
                    id="txn-status"
                    options={[
                      { value: 'HOLDING', label: 'Đang đầu tư' },
                      { value: 'SOLD', label: 'Đã bán' },
                      { value: 'MATURED', label: 'Đã đáo hạn' },
                      { value: 'CANCELLED', label: 'Đã hủy' },
                    ]}
                    value={
                      [
                        { value: 'HOLDING', label: 'Đang đầu tư' },
                        { value: 'SOLD', label: 'Đã bán' },
                        { value: 'MATURED', label: 'Đã đáo hạn' },
                        { value: 'CANCELLED', label: 'Đã hủy' },
                      ].find((opt) => opt.value === status) || null
                    }
                    onChange={(option) =>
                      setStatus((option?.value as InvestmentStatus) || 'HOLDING')
                    }
                    classNamePrefix="react-select"
                    placeholder="Chọn Trạng thái"
                    isSearchable={false}
                    menuPortalTarget={document.body}
                  />
                </div>
              )}

              {type === TransactionType.INVESTMENT && status !== 'HOLDING' && (
                <div className="form-group">
                  <label htmlFor="txn-pnl">Số tiền Lãi / Lỗ thực tế (đ)</label>
                  <input
                    id="txn-pnl"
                    type="text"
                    placeholder="Dương cho Lãi (VD: 500.000), Âm cho Lỗ (VD: -200.000)"
                    value={realizedPnl}
                    onChange={(e) => handlePnlChange(e.target.value)}
                  />
                  <small
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    Nhập số dương nếu có lãi, hoặc dấu trừ (-) ở đầu nếu bị lỗ.
                  </small>
                </div>
              )}

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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTransaction ? 'Cập nhật' : 'Thêm'} giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
