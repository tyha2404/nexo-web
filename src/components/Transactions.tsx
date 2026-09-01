import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Gem,
  Pencil,
  Plus,
  Receipt,
  Scale,
  Search,
  ShoppingBag,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATE_FORMAT_INPUT, TransactionType } from '../commons/constants';
import type {
  Category,
  InvestmentStatus,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { formatCurrency, formatDate, toISODateString } from '../commons/utils';
import { categoryService, transactionService, walletService } from '../services/api';
import Pagination from './Pagination';
import './Transactions.css';

export interface TransactionsProps {
  type?: TransactionType;
  initialType?: TransactionType;
}

const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  HOLDING: 'Đang đầu tư',
  SOLD: 'Đã bán',
  MATURED: 'Đã đáo hạn',
  CANCELLED: 'Đã hủy',
};

export default function Transactions({
  type,
  initialType = TransactionType.EXPENSE,
}: TransactionsProps) {
  // Internal active transaction type state (defaults to `type` prop or `initialType`)
  const [activeType, setActiveType] = useState<TransactionType>(type || initialType);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletModel[]>([]);
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
  const [walletId, setWalletId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [status, setStatus] = useState<InvestmentStatus>('HOLDING');
  const [realizedPnl, setRealizedPnl] = useState<string>('0');

  // Sync internal activeType if parent passes or updates the `type` prop
  useEffect(() => {
    if (type) {
      setActiveType(type);
    }
  }, [type]);

  // Load wallets list for wallet badges and selector
  useEffect(() => {
    const fetchWalletsData = async () => {
      try {
        const res = await walletService.getWallets();
        setWallets(res.wallets || []);
      } catch (err: any) {
        console.error('Failed to load wallets', err);
      }
    };
    fetchWalletsData();
  }, []);

  // Reload categories whenever the active transaction type changes
  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const categoriesData = await categoryService.list({ type: activeType });
        setCategories(categoriesData.items || []);
      } catch (err: any) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategoriesData();
  }, [activeType]);

  // Fetch transactions list
  useEffect(() => {
    const fetchTransactionsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await transactionService.list({
          type: activeType,
          categoryId: selectedCategoryFilter || undefined,
          status:
            activeType === TransactionType.INVESTMENT && selectedStatusFilter
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
    activeType,
    selectedCategoryFilter,
    selectedStatusFilter,
    startDate,
    endDate,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

  // Handle switching transaction type tabs
  const handleTabSwitch = (newType: TransactionType) => {
    if (activeType === newType) return;
    setActiveType(newType);
    setCurrentPage(1);
    setSelectedCategoryFilter('');
    setSelectedStatusFilter('');
    setSearchQuery('');
  };

  const showFeedback = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  };

  const filteredCategories = categories;

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

  const openAddModal = () => {
    setEditingTransaction(null);
    setTitle('');
    setAmount('');
    setCategoryId(filteredCategories.length > 0 ? filteredCategories[0].id : '');
    setWalletId('');
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
    setWalletId(transaction.walletId || '');
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
      type: activeType,
    };

    if (walletId) {
      payload.walletId = walletId;
    }

    if (activeType === TransactionType.INVESTMENT) {
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

  const getWalletInfo = (wId?: string) => {
    if (!wId) return null;
    return wallets.find((w) => w.id === wId) || null;
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
      {/* 1. Transaction Type Segmented Switcher Header */}
      <div className="txn-type-switch-wrapper animate-fade-in">
        <div
          className="txn-type-switch"
          role="tablist"
          aria-label="Phân loại giao dịch (Chi tiêu, Thu nhập, Đầu tư)"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.EXPENSE}
            className={`txn-type-btn btn-expense ${
              activeType === TransactionType.EXPENSE ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.EXPENSE)}
          >
            <div className="txn-type-icon-wrapper">
              <ShoppingBag size={18} className="txn-type-icon" />
            </div>
            <div className="txn-type-text-group">
              <span className="txn-type-primary-label">Chi tiêu</span>
              <span className="txn-type-secondary-label">Khoản chi hàng ngày</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INCOME}
            className={`txn-type-btn btn-income ${
              activeType === TransactionType.INCOME ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.INCOME)}
          >
            <div className="txn-type-icon-wrapper">
              <TrendingUp size={18} className="txn-type-icon" />
            </div>
            <div className="txn-type-text-group">
              <span className="txn-type-primary-label">Thu nhập</span>
              <span className="txn-type-secondary-label">Tiền về & nguồn thu</span>
            </div>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INVESTMENT}
            className={`txn-type-btn btn-investment ${
              activeType === TransactionType.INVESTMENT ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.INVESTMENT)}
          >
            <div className="txn-type-icon-wrapper">
              <Gem size={18} className="txn-type-icon" />
            </div>
            <div className="txn-type-text-group">
              <span className="txn-type-primary-label">Đầu tư</span>
              <span className="txn-type-secondary-label">Tích lũy & sinh lời</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Standard Header with Action */}
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>
            {activeType === TransactionType.INCOME
              ? 'Quản lý Thu nhập'
              : activeType === TransactionType.INVESTMENT
                ? 'Quản lý Đầu tư'
                : 'Quản lý Chi tiêu'}
          </h2>
          <p className="subtitle">
            Theo dõi và quản lý các khoản{' '}
            {activeType === TransactionType.INCOME
              ? 'thu nhập'
              : activeType === TransactionType.INVESTMENT
                ? 'đầu tư'
                : 'chi tiêu'}{' '}
            của bạn
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`btn btn-primary btn-add-${activeType.toLowerCase()}`}
            onClick={openAddModal}
          >
            <Plus size={16} /> Thêm{' '}
            {activeType === TransactionType.INCOME
              ? 'thu nhập'
              : activeType === TransactionType.INVESTMENT
                ? 'đầu tư'
                : 'chi tiêu'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <AlertTriangle size={18} className="error-icon" /> {error}
        </div>
      )}

      {/* 3. Summary Cards Grid */}
      {(() => {
        const sumAmount = summary.sumAmount;
        const count = summary.total;
        const avg = count > 0 ? sumAmount / count : 0;

        if (activeType === TransactionType.INCOME) {
          return (
            <div className="summary-cards-grid animate-fade-in">
              <div className="summary-stat-card accent-income">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Thu Nhập</span>
                  <div className="kpi-icon-badge kpi-badge-emerald">
                    <Wallet size={20} />
                  </div>
                </div>
                <div className="summary-stat-value value-income">
                  {formatCurrency(Math.abs(sumAmount))}
                </div>
                <div className="summary-stat-subtitle">Tổng khoản thu nhập trong kỳ</div>
              </div>

              <div className="summary-stat-card accent-purple">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Số Giao Dịch Thu</span>
                  <div className="kpi-icon-badge kpi-badge-indigo">
                    <BarChart3 size={20} />
                  </div>
                </div>
                <div className="summary-stat-value value-purple">{count} khoản</div>
                <div className="summary-stat-subtitle">Tổng số đợt nhận thu nhập</div>
              </div>

              <div className="summary-stat-card accent-primary">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Trung Bình / Khoản</span>
                  <div className="kpi-icon-badge kpi-badge-sky">
                    <Scale size={20} />
                  </div>
                </div>
                <div className="summary-stat-value value-primary">
                  {formatCurrency(Math.abs(avg))}
                </div>
                <div className="summary-stat-subtitle">Giá trị thu nhập trung bình</div>
              </div>
            </div>
          );
        }

        if (activeType === TransactionType.INVESTMENT) {
          const holdingAmount = summary.holdingAmount ?? 0;
          const totalRealizedPnl = summary.realizedPnl ?? 0;
          const holdingCount = summary.holdingCount ?? 0;

          return (
            <div className="summary-cards-grid animate-fade-in">
              <div className="summary-stat-card accent-primary">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tiền Đang Đầu Tư (Holding)</span>
                  <div className="kpi-icon-badge kpi-badge-sky">
                    <Gem size={20} />
                  </div>
                </div>
                <div className="summary-stat-value value-primary">
                  {formatCurrency(holdingAmount)}
                </div>
                <div className="summary-stat-subtitle">
                  Giá trị các khoản đang giữ vốn ({holdingCount} mục)
                </div>
              </div>

              <div
                className={`summary-stat-card ${
                  totalRealizedPnl >= 0 ? 'accent-income' : 'accent-expense'
                }`}
              >
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Lãi / Lỗ Đã Thực Hiện</span>
                  <div
                    className={`kpi-icon-badge ${
                      totalRealizedPnl >= 0 ? 'kpi-badge-emerald' : 'kpi-badge-rose'
                    }`}
                  >
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div
                  className={`summary-stat-value ${
                    totalRealizedPnl >= 0 ? 'value-income' : 'value-expense'
                  }`}
                >
                  {formatCurrency(Math.abs(totalRealizedPnl))}
                </div>
                <div className="summary-stat-subtitle">
                  Tổng tiền lời / lỗ từ khoản đã bán/đáo hạn
                </div>
              </div>

              <div className="summary-stat-card accent-purple">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Vốn Tích Lũy</span>
                  <div className="kpi-icon-badge kpi-badge-purple">
                    <Target size={20} />
                  </div>
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
                <div className="kpi-icon-badge kpi-badge-rose">
                  <ShoppingBag size={20} />
                </div>
              </div>
              <div className="summary-stat-value value-expense">
                {formatCurrency(Math.abs(sumAmount))}
              </div>
              <div className="summary-stat-subtitle">Tổng tiền đã chi trong kỳ</div>
            </div>

            <div className="summary-stat-card accent-warning">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Trung Bình / Ngày</span>
                <div className="kpi-icon-badge kpi-badge-amber">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="summary-stat-value value-warning">
                {formatCurrency(Math.abs(dailyAvg))}
              </div>
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
                <div className="kpi-icon-badge kpi-badge-sky">
                  <Wallet size={20} />
                </div>
              </div>
              <div className="summary-stat-value value-primary">
                {formatCurrency(Math.abs(avg))}
              </div>
              <div className="summary-stat-subtitle">Mức chi trung bình mỗi giao dịch</div>
            </div>

            <div className="summary-stat-card accent-purple">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Số Lần Chi Tiêu</span>
                <div className="kpi-icon-badge kpi-badge-indigo">
                  <Receipt size={20} />
                </div>
              </div>
              <div className="summary-stat-value value-purple">{count} giao dịch</div>
              <div className="summary-stat-subtitle">Tổng số hóa đơn / giao dịch chi</div>
            </div>
          </div>
        );
      })()}

      {/* 4. Filter and Search controls */}
      <div className="filter-bar animate-fade-in">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
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
        {activeType === TransactionType.INVESTMENT && (
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

      {/* 5. Transactions Table (Desktop) & Cards (Mobile) */}
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <Receipt size={44} className="empty-icon" />
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
            type="button"
            onClick={openAddModal}
            className={`btn btn-primary btn-add-${activeType.toLowerCase()}`}
            style={{ padding: '0.65rem 1.5rem', minHeight: '42px', fontWeight: 600 }}
          >
            <Plus size={16} /> Thêm{' '}
            {activeType === TransactionType.INVESTMENT
              ? 'đầu tư'
              : activeType === TransactionType.INCOME
                ? 'thu nhập'
                : 'chi tiêu'}{' '}
            ngay
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="transactions-table-container animate-fade-in">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Tiêu đề / Nội dung</th>
                  <th>Số tiền</th>
                  {activeType === TransactionType.INVESTMENT && <th>Trạng thái</th>}
                  {activeType === TransactionType.INVESTMENT && <th>Lãi / Lỗ</th>}
                  <th>Danh mục</th>
                  <th>Ví / Nguồn</th>
                  <th>Ngày thực hiện</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn) => {
                  const walletObj = getWalletInfo(txn.walletId);
                  return (
                    <tr key={txn.id}>
                      <td className="txn-title-cell">{txn.description}</td>
                      <td
                        className="txn-amount"
                        style={{
                          color:
                            activeType === TransactionType.INCOME
                              ? 'var(--income)'
                              : activeType === TransactionType.EXPENSE
                                ? 'var(--expense)'
                                : 'var(--text-main)',
                          fontWeight: 600,
                        }}
                      >
                        {activeType === TransactionType.INCOME
                          ? '+'
                          : activeType === TransactionType.EXPENSE
                            ? '-'
                            : ''}
                        {formatCurrency(Math.abs(txn.amount))}
                      </td>
                      {activeType === TransactionType.INVESTMENT && (
                        <td>
                          <span
                            className={`txn-status-badge status-${(
                              txn.status || 'HOLDING'
                            ).toLowerCase()}`}
                          >
                            {INVESTMENT_STATUS_LABELS[txn.status || 'HOLDING']}
                          </span>
                        </td>
                      )}
                      {activeType === TransactionType.INVESTMENT && (
                        <td className="txn-pnl-cell">
                          {txn.status &&
                          txn.status !== 'HOLDING' &&
                          txn.realizedPnl !== undefined ? (
                            <span
                              style={{
                                color: txn.realizedPnl >= 0 ? 'var(--income)' : 'var(--expense)',
                                fontWeight: 600,
                              }}
                            >
                              {txn.realizedPnl >= 0 ? '+' : ''}
                              {formatCurrency(txn.realizedPnl)}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      )}
                      <td>
                        <span className="txn-category-badge">
                          {getCategoryName(txn.categoryId)}
                        </span>
                      </td>
                      <td>
                        {walletObj ? (
                          <span className="txn-wallet-badge">
                            <Wallet size={12} />
                            <span>
                              {walletObj.icon ? `${walletObj.icon} ` : ''}
                              {walletObj.name}
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="txn-date">{formatDate(txn.transactionDate)}</td>
                      <td className="txn-actions-cell">
                        <div className="action-buttons-wrapper">
                          <button
                            type="button"
                            onClick={() => openEditModal(txn)}
                            className="action-btn edit-btn"
                            aria-label={`Chỉnh sửa ${txn.description || 'giao dịch'}`}
                            title={`Chỉnh sửa ${txn.description || 'giao dịch'}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(txn.id, txn.description || '')}
                            className="action-btn delete-btn"
                            aria-label={`Xóa ${txn.description || 'giao dịch'}`}
                            title={`Xóa ${txn.description || 'giao dịch'}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Touch-Friendly Card View (<768px) */}
          <div className="transactions-mobile-cards animate-fade-in">
            {filteredTransactions.map((txn) => {
              const walletObj = getWalletInfo(txn.walletId);
              return (
                <div key={txn.id} className="transaction-mobile-card">
                  <div className="mobile-card-top">
                    <div className="mobile-card-left">
                      <div className={`mobile-card-icon-badge icon-${activeType.toLowerCase()}`}>
                        {activeType === TransactionType.INCOME ? (
                          <TrendingUp size={18} />
                        ) : activeType === TransactionType.INVESTMENT ? (
                          <Gem size={18} />
                        ) : (
                          <ShoppingBag size={18} />
                        )}
                      </div>
                      <div className="mobile-card-info">
                        <div className="mobile-card-title">{txn.description}</div>
                        <div className="mobile-card-date">
                          <Calendar size={12} className="mobile-date-icon" />
                          <span>{moment(txn.transactionDate).format('DD/MM/YYYY')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mobile-card-amount-group">
                      <div className={`mobile-card-amount amount-${activeType.toLowerCase()}`}>
                        {activeType === TransactionType.INCOME
                          ? '+'
                          : activeType === TransactionType.EXPENSE
                            ? '-'
                            : ''}
                        {formatCurrency(Math.abs(txn.amount))}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-tags">
                    <span className="txn-category-badge">{getCategoryName(txn.categoryId)}</span>
                    {walletObj && (
                      <span className="txn-wallet-badge">
                        <Wallet size={12} />
                        <span>
                          {walletObj.icon ? `${walletObj.icon} ` : ''}
                          {walletObj.name}
                        </span>
                      </span>
                    )}
                    {activeType === TransactionType.INVESTMENT && (
                      <span
                        className={`txn-status-badge status-${(
                          txn.status || 'HOLDING'
                        ).toLowerCase()}`}
                      >
                        {INVESTMENT_STATUS_LABELS[txn.status || 'HOLDING']}
                      </span>
                    )}
                    {activeType === TransactionType.INVESTMENT &&
                      txn.status &&
                      txn.status !== 'HOLDING' &&
                      txn.realizedPnl !== undefined && (
                        <span
                          className={`txn-pnl-badge ${
                            txn.realizedPnl >= 0 ? 'pnl-profit' : 'pnl-loss'
                          }`}
                        >
                          {txn.realizedPnl >= 0 ? 'Lãi: +' : 'Lỗ: '}
                          {formatCurrency(Math.abs(txn.realizedPnl))}
                        </span>
                      )}
                  </div>

                  <div className="mobile-card-actions">
                    <button
                      type="button"
                      className="mobile-action-btn edit-btn"
                      onClick={() => openEditModal(txn)}
                      aria-label={`Chỉnh sửa ${txn.description || 'giao dịch'}`}
                    >
                      <Pencil size={14} />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-action-btn delete-btn"
                      onClick={() => handleDelete(txn.id, txn.description || '')}
                      aria-label={`Xóa ${txn.description || 'giao dịch'}`}
                    >
                      <Trash2 size={14} />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* 6. Form / Modal Overlay for Create & Edit */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingTransaction
                  ? 'Chỉnh sửa giao dịch'
                  : activeType === TransactionType.INCOME
                    ? 'Thêm thu nhập mới'
                    : activeType === TransactionType.INVESTMENT
                      ? 'Thêm khoản đầu tư mới'
                      : 'Thêm chi tiêu mới'}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="txn-title">Tiêu đề / Nội dung</label>
                <input
                  id="txn-title"
                  type="text"
                  placeholder={
                    activeType === TransactionType.INCOME
                      ? 'Ví dụ: Lương tháng 8, Thưởng dự án...'
                      : activeType === TransactionType.INVESTMENT
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
                  {activeType === TransactionType.INCOME
                    ? 'Số tiền thu nhập (đ)'
                    : activeType === TransactionType.INVESTMENT
                      ? 'Số tiền đầu tư (đ)'
                      : 'Số tiền chi tiêu (đ)'}
                </label>
                <input
                  id="txn-amount"
                  type="text"
                  placeholder={
                    activeType === TransactionType.INCOME
                      ? 'Ví dụ: 15.000.000'
                      : activeType === TransactionType.INVESTMENT
                        ? 'Ví dụ: 10.000.000'
                        : 'Ví dụ: 50.000'
                  }
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

              {/* Wallet Selection Dropdown */}
              {wallets.length > 0 && (
                <div className="form-group">
                  <label htmlFor="txn-wallet">Ví / Nguồn thanh toán (Tùy chọn)</label>
                  <Select
                    id="txn-wallet"
                    options={[
                      { value: '', label: '-- Không chọn ví cụ thể --' },
                      ...wallets.map((w) => ({
                        value: w.id,
                        label: `${w.icon ? `${w.icon} ` : '💳 '}${w.name} (${formatCurrency(w.balance)})`,
                      })),
                    ]}
                    value={
                      [
                        { value: '', label: '-- Không chọn ví cụ thể --' },
                        ...wallets.map((w) => ({
                          value: w.id,
                          label: `${w.icon ? `${w.icon} ` : '💳 '}${w.name} (${formatCurrency(w.balance)})`,
                        })),
                      ].find((opt) => opt.value === walletId) || null
                    }
                    onChange={(option) => setWalletId(option ? option.value : '')}
                    classNamePrefix="react-select"
                    placeholder="Chọn ví hoặc tài khoản"
                    isSearchable={true}
                    menuPortalTarget={document.body}
                  />
                </div>
              )}

              {activeType === TransactionType.INVESTMENT && (
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

              {activeType === TransactionType.INVESTMENT && status !== 'HOLDING' && (
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
                <button
                  type="submit"
                  className={`btn btn-primary btn-add-${activeType.toLowerCase()}`}
                >
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
