import {
  AlertTriangle,
  Calendar,
  Gem,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { TransactionType } from '../commons/constants';
import type {
  Category,
  InvestmentStatus,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { formatCurrency, formatDate, toISODateString } from '../commons/utils';
import { categoryService, transactionService, walletService } from '../services/api';
import type { CreateTransactionDTO } from '../services/transactionService';
import AddTransactionModal from './AddTransactionModal';
import { MonthFilter } from './common';
import Pagination from './Pagination';
import './Transactions.css';
import ConfirmModal from './common/ConfirmModal';

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
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));

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
  const [modalType, setModalType] = useState<TransactionType>(initialType);

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
        const startOfMonth = moment(selectedMonth, 'YYYY-MM').startOf('month').toDate();
        const endOfMonth = moment(selectedMonth, 'YYYY-MM').endOf('month').toDate();

        const res = await transactionService.list({
          type: activeType,
          categoryId: selectedCategoryFilter || undefined,
          status:
            activeType === TransactionType.INVESTMENT && selectedStatusFilter
              ? (selectedStatusFilter as InvestmentStatus)
              : undefined,
          startDate: toISODateString(startOfMonth),
          endDate: toISODateString(endOfMonth),
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
    selectedMonth,
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

  const filteredCategories = categories;

  const openAddModal = () => {
    setEditingTransaction(null);
    setModalType(activeType);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type as TransactionType);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Confirm Modal state for deletion
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    description: string;
  } | null>(null);

  const handleDelete = (id: string, itemDescription: string) => {
    setDeleteConfirm({ isOpen: true, id, description: itemDescription });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { id, description } = deleteConfirm;
    setDeleteConfirm(null);

    // Capture the full transaction so we can restore it on undo
    const original = transactions.find((t) => t.id === id);

    try {
      await transactionService.delete(id);
      setRefreshKey((prev) => prev + 1);
      window.dispatchEvent(new Event('transactions-changed'));
      toast.success(
        ({ closeToast }) => (
          <span>
            Đã xóa "{description}".
            <button
              type="button"
              className="toast-undo-btn"
              onClick={async () => {
                closeToast();
                if (!original) return;
                try {
                  const restorePayload: CreateTransactionDTO = {
                    amount: original.amount,
                    categoryId: original.categoryId,
                    transactionDate: original.transactionDate,
                    type: original.type as TransactionType,
                    description: original.description,
                    walletId: original.walletId,
                    status: original.status as CreateTransactionDTO['status'],
                    realizedPnl: original.realizedPnl,
                  };
                  await transactionService.create(restorePayload);
                  setRefreshKey((prev) => prev + 1);
                  window.dispatchEvent(new Event('transactions-changed'));
                  toast.success('Đã hoàn tác xóa giao dịch!');
                } catch {
                  /* ignore restore errors */
                }
              }}
            >
              Hoàn tác
            </button>
          </span>
        ),
        { autoClose: 6000 }
      );
    } catch (err: any) {
      toast.error(err.message || 'Xóa giao dịch thất bại');
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
      {/* 1. Standard Header with Action */}
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
          <button type="button" className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Thêm{' '}
            {activeType === TransactionType.INCOME
              ? 'thu nhập'
              : activeType === TransactionType.INVESTMENT
                ? 'đầu tư'
                : 'chi tiêu'}
          </button>
        </div>
      </header>

      {/* 2. Transaction Type Segmented Tabs Switcher (Below Page Title) */}
      <div className="category-tabs-nav animate-fade-in">
        <div
          className="category-tabs"
          role="tablist"
          aria-label="Phân loại giao dịch (Chi tiêu, Thu nhập, Đầu tư)"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.EXPENSE}
            className={`category-tab flex items-center gap-1.5 ${
              activeType === TransactionType.EXPENSE ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.EXPENSE)}
          >
            <ShoppingBag size={14} />
            <span>Chi tiêu</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INCOME}
            className={`category-tab flex items-center gap-1.5 ${
              activeType === TransactionType.INCOME ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.INCOME)}
          >
            <TrendingUp size={14} />
            <span>Thu nhập</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INVESTMENT}
            className={`category-tab flex items-center gap-1.5 ${
              activeType === TransactionType.INVESTMENT ? 'active' : ''
            }`}
            onClick={() => handleTabSwitch(TransactionType.INVESTMENT)}
          >
            <Gem size={14} />
            <span>Đầu tư</span>
          </button>
        </div>
      </div>

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
                </div>
                <div className="summary-stat-value value-income">
                  {formatCurrency(Math.abs(sumAmount))}
                </div>
                <div className="summary-stat-subtitle">Tổng khoản thu nhập trong kỳ</div>
              </div>

              <div className="summary-stat-card">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Số Giao Dịch Thu</span>
                </div>
                <div className="summary-stat-value">{count} khoản</div>
                <div className="summary-stat-subtitle">Tổng số đợt nhận thu nhập</div>
              </div>

              <div className="summary-stat-card">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Trung Bình / Khoản</span>
                </div>
                <div className="summary-stat-value">{formatCurrency(Math.abs(avg))}</div>
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
              <div className="summary-stat-card">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tiền Đang Đầu Tư (Holding)</span>
                </div>
                <div className="summary-stat-value">{formatCurrency(holdingAmount)}</div>
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

              <div className="summary-stat-card">
                <div className="summary-stat-header">
                  <span className="summary-stat-title">Tổng Vốn Tích Lũy</span>
                </div>
                <div className="summary-stat-value">{formatCurrency(sumAmount)}</div>
                <div className="summary-stat-subtitle">
                  Tổng {count} đợt rót vốn đầu tư trong kỳ
                </div>
              </div>
            </div>
          );
        }

        // Default: EXPENSE
        const today = moment().startOf('day');
        const start = moment(selectedMonth, 'YYYY-MM').startOf('month');
        const end = moment(selectedMonth, 'YYYY-MM').endOf('month');

        const effectiveEnd = end.isAfter(today) ? today : end;
        const daysCount = Math.max(1, effectiveEnd.diff(start, 'days') + 1);
        const dailyAvg = (summary.sumAmountForAverage ?? summary.sumAmount) / daysCount;

        return (
          <div className="summary-cards-grid animate-fade-in">
            <div className="summary-stat-card accent-expense">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Tổng Chi Tiêu</span>
              </div>
              <div className="summary-stat-value value-expense">
                {formatCurrency(Math.abs(sumAmount))}
              </div>
              <div className="summary-stat-subtitle">Tổng tiền đã chi trong kỳ</div>
            </div>

            <div className="summary-stat-card">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Trung Bình / Ngày</span>
              </div>
              <div className="summary-stat-value">{formatCurrency(Math.abs(dailyAvg))}</div>
              <div className="summary-stat-subtitle">
                Chi tiêu bình quân trong {daysCount} ngày (tới hôm nay)
                {summary.sumAmountForAverage !== undefined &&
                  summary.sumAmountForAverage !== summary.sumAmount &&
                  ' - không tính danh mục đã loại trừ'}
              </div>
            </div>

            <div className="summary-stat-card">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Trung Bình / Lần Chi</span>
              </div>
              <div className="summary-stat-value">{formatCurrency(Math.abs(avg))}</div>
              <div className="summary-stat-subtitle">Mức chi trung bình mỗi giao dịch</div>
            </div>

            <div className="summary-stat-card">
              <div className="summary-stat-header">
                <span className="summary-stat-title">Số Lần Chi Tiêu</span>
              </div>
              <div className="summary-stat-value">{count} giao dịch</div>
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
        <div className="date-range-filter-col">
          <MonthFilter
            value={selectedMonth}
            onChange={(mStr) => {
              setSelectedMonth(mStr);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* 5. Transactions Table (Desktop) & Cards (Mobile) */}
      {loading ? (
        <div className="txn-skeleton animate-fade-in" aria-busy="true">
          <div className="skeleton txn-skeleton-row" />
          <div className="skeleton txn-skeleton-row" />
          <div className="skeleton txn-skeleton-row" />
          <div className="skeleton txn-skeleton-row" />
          <div className="skeleton txn-skeleton-row" />
          <div className="skeleton txn-skeleton-row" />
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
            className="btn btn-primary"
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

      {/* 6. Reusable Create/Edit Modal */}
      <AddTransactionModal
        open={isModalOpen}
        initialType={modalType}
        transaction={editingTransaction}
        onSaved={handleSaved}
        onClose={() => setIsModalOpen(false)}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm?.isOpen)}
        title="Xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch "${deleteConfirm?.description || ''}"? Thao tác này có thể hoàn tác trong vài giây.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
