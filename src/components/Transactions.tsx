import { SlidingTabs } from './ui';
import { AlertTriangle, Plus, Receipt, Search } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { InvestmentStatus, TransactionType } from '../commons/constants';
import type { Category, Transaction, TransactionSummary, Wallet } from '../commons/types';
import { getErrorMessage, toISODateString } from '../commons/utils';
import {
  categoryService,
  transactionService,
  walletService,
  type CreateTransactionDTO,
} from '../services';
import AddTransactionModal from './AddTransactionModal';
import { ConfirmModal, MonthFilter, ReceiptModal } from './common';
import Pagination from './Pagination';
import {
  getTypeLabel,
  INVESTMENT_STATUS_FILTER_OPTIONS,
  TransactionMobileCards,
  TransactionSummaryCards,
  TransactionTable,
  TransactionTypeIcon,
  type TransactionListProps,
} from './transaction-list';
import { PAGE_HEADER, PAGE_TITLE, PAGE_TITLE_H2, PAGE_VIEW } from './transaction-list/listStyles';
import {
  btnClass,
  cx,
  EMPTY_STATE,
  FILTER_FULL_ROW,
  filterBarClass,
  SEARCH_ICON,
  SEARCH_INPUT,
  SEARCH_WRAPPER,
  SKELETON,
  tabClass,
  TABS,
  TABS_NAV,
} from './ui';

export interface TransactionsProps {
  type?: TransactionType;
  initialType?: TransactionType;
}

export default function Transactions({
  type,
  initialType = TransactionType.EXPENSE,
}: TransactionsProps) {
  // Internal active transaction type state (defaults to `type` prop or `initialType`)
  const [activeType, setActiveType] = useState<TransactionType>(type || initialType);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<InvestmentStatus | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  // Debounce typing, then restart from the first page
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);
  const [summary, setSummary] = useState<TransactionSummary>({
    sumAmount: 0,
    total: 0,
    holdingAmount: 0,
    holdingCount: 0,
    realizedPnl: 0,
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
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
      } catch (err) {
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
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategoriesData();
  }, [activeType]);

  // Fetch transactions list
  useEffect(() => {
    const controller = new AbortController();
    const fetchTransactionsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const startOfMonth = moment(selectedMonth, 'YYYY-MM').startOf('month');
        const endOfMonth = moment(selectedMonth, 'YYYY-MM').endOf('month');

        const res = await transactionService.list(
          {
            type: activeType,
            keyword: debouncedSearch.trim() || undefined,
            categoryId: selectedCategoryFilter || undefined,
            status:
              activeType === TransactionType.INVESTMENT && selectedStatusFilter
                ? selectedStatusFilter
                : undefined,
            startDate: toISODateString(startOfMonth),
            endDate: toISODateString(endOfMonth),
            page: currentPage,
            limit: itemsPerPage,
          },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setTransactions(res.items || []);
        setTotalItems(res.total || 0);
        if (res.summary) {
          setSummary(res.summary);
        } else {
          setSummary({ sumAmount: 0, total: 0, holdingAmount: 0, holdingCount: 0, realizedPnl: 0 });
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(getErrorMessage(err, 'Lấy danh sách giao dịch thất bại'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchTransactionsData();
    return () => controller.abort();
  }, [
    debouncedSearch,
    activeType,
    selectedCategoryFilter,
    selectedStatusFilter,
    selectedMonth,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

  useEffect(() => {
    // Debounced: a save fires both a local event and a realtime echo, resume fires several
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshKey((key) => key + 1);
      }, 150);
    };
    window.addEventListener('transactions-changed', refresh);
    window.addEventListener('online', refresh);
    const resume = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('transactions-changed', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', resume);
    };
  }, []);

  // Handle switching transaction type tabs
  const handleTabSwitch = (newType: TransactionType) => {
    if (activeType === newType) return;
    setActiveType(newType);
    setCurrentPage(1);
    setSelectedCategoryFilter('');
    setSelectedStatusFilter('');
    setSearchQuery('');
  };

  const openAddModal = () => {
    setEditingTransaction(null);
    setModalType(activeType);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type);
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

  const handleDelete = (txn: Transaction) => {
    setDeleteConfirm({ isOpen: true, id: txn.id, description: txn.description || '' });
  };

  // Re-create a deleted transaction from its captured snapshot (every writable field)
  const restoreTransaction = async (original: Transaction) => {
    const restorePayload: CreateTransactionDTO = {
      amount: original.amount,
      categoryId: original.categoryId,
      transactionDate: toISODateString(original.transactionDate),
      type: original.type,
      description: original.description,
      walletId: original.walletId || undefined,
      status: original.status,
      realizedPnl: original.realizedPnl,
      receiptUrl: original.receiptUrl || '',
    };
    try {
      await transactionService.create(restorePayload);
      setRefreshKey((prev) => prev + 1);
      window.dispatchEvent(new Event('transactions-changed'));
      toast.success('Đã hoàn tác xóa giao dịch!');
    } catch (err) {
      console.error('Failed to restore transaction', err);
      toast.error(
        `Không thể hoàn tác: ${getErrorMessage(err, 'lỗi không xác định')}. Vui lòng tạo lại giao dịch.`
      );
    }
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
            {original && (
              <button
                type="button"
                className="ml-3 cursor-pointer rounded-sm border-none bg-primary px-[0.6rem] py-[0.2rem] text-[0.8rem] font-semibold text-white transition-all duration-200 ease-[ease] hover:scale-[1.03] hover:bg-primary-hover hover:opacity-90"
                onClick={() => {
                  closeToast();
                  void restoreTransaction(original);
                }}
              >
                Hoàn tác
              </button>
            )}
          </span>
        ),
        { autoClose: 6000 }
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Xóa giao dịch thất bại'));
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

  const filteredTransactions = transactions;
  const listProps: TransactionListProps = {
    transactions: filteredTransactions,
    activeType,
    getCategoryName,
    getWallet: getWalletInfo,
    onEdit: openEditModal,
    onDelete: handleDelete,
    onViewReceipt: setSelectedReceiptUrl,
  };

  // Calculate total pages from totalItems from server
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const isInvestment = activeType === TransactionType.INVESTMENT;

  return (
    <div className={PAGE_VIEW}>
      {/* 1. Standard Header with Action */}
      <header className={`${PAGE_HEADER} animate-fade-in`}>
        <div className={PAGE_TITLE}>
          <h2 className={PAGE_TITLE_H2}>
            {activeType === TransactionType.INCOME
              ? 'Thu nhập'
              : activeType === TransactionType.INVESTMENT
                ? 'Đầu tư'
                : 'Chi tiêu'}
          </h2>
        </div>
      </header>

      {/* 2. Transaction Type Segmented Tabs Switcher (Below Page Title) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <SlidingTabs
          className={TABS}
          role="tablist"
          aria-label="Phân loại giao dịch (Chi tiêu, Thu nhập, Đầu tư)"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.EXPENSE}
            className={tabClass(activeType === TransactionType.EXPENSE)}
            onClick={() => handleTabSwitch(TransactionType.EXPENSE)}
          >
            <TransactionTypeIcon type={TransactionType.EXPENSE} size={14} />
            <span>Chi tiêu</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INCOME}
            className={tabClass(activeType === TransactionType.INCOME)}
            onClick={() => handleTabSwitch(TransactionType.INCOME)}
          >
            <TransactionTypeIcon type={TransactionType.INCOME} size={14} />
            <span>Thu nhập</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeType === TransactionType.INVESTMENT}
            className={tabClass(activeType === TransactionType.INVESTMENT)}
            onClick={() => handleTabSwitch(TransactionType.INVESTMENT)}
          >
            <TransactionTypeIcon type={TransactionType.INVESTMENT} size={14} />
            <span>Đầu tư</span>
          </button>
        </SlidingTabs>
      </div>

      {error && (
        <div className="animate-fade-in">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* 3. Summary Cards Grid */}
      <TransactionSummaryCards
        activeType={activeType}
        summary={summary}
        selectedMonth={selectedMonth}
      />

      {/* 4. Filter and Search controls */}
      <div className={cx(filterBarClass(isInvestment), 'animate-fade-in')}>
        <div className={SEARCH_WRAPPER}>
          <Search size={16} className={SEARCH_ICON} />
          <input
            className={SEARCH_INPUT}
            type="text"
            aria-label="Tìm giao dịch"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
          />
        </div>
        <div className="category-select-wrapper w-full">
          <Select
            options={[
              { value: '', label: 'Tất cả Danh mục' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
            value={
              [
                { value: '', label: 'Tất cả Danh mục' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
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
        {isInvestment && (
          <div className="status-select-wrapper w-full">
            <Select
              options={INVESTMENT_STATUS_FILTER_OPTIONS}
              value={
                INVESTMENT_STATUS_FILTER_OPTIONS.find(
                  (opt) => opt.value === selectedStatusFilter
                ) || null
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
        <div className={isInvestment ? FILTER_FULL_ROW : undefined}>
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
        <div className="animate-fade-in" aria-busy="true">
          <div className={SKELETON} />
          <div className={SKELETON} />
          <div className={SKELETON} />
          <div className={SKELETON} />
          <div className={SKELETON} />
          <div className={SKELETON} />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className={cx(EMPTY_STATE, 'animate-fade-in')}>
          <div className="mb-3 flex justify-center text-muted">
            <Receipt size={44} className="empty-icon" />
          </div>
          <h4 className="mx-0 mt-0 mb-2 text-[1.15rem] font-semibold text-main">
            Chưa có giao dịch
          </h4>
          <p className="mx-auto mt-0 mb-5 max-w-[400px] text-[0.9rem] text-muted">
            Đổi bộ lọc hoặc thêm giao dịch.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className={cx(btnClass('primary', 'px-6 py-[0.65rem] text-[0.9rem]'), 'min-h-[42px]')}
          >
            <Plus size={16} /> Thêm {getTypeLabel(activeType)} ngay
          </button>
        </div>
      ) : (
        <>
          <TransactionTable {...listProps} />
          <TransactionMobileCards {...listProps} />

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

      {/* 8. Receipt Image Lightbox Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedReceiptUrl)}
        imageUrl={selectedReceiptUrl || undefined}
        onClose={() => setSelectedReceiptUrl(null)}
      />
    </div>
  );
}
