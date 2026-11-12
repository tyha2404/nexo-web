import moment from 'moment';
import { useEffect, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import {
  DATA_EVENTS,
  DATE_FORMAT_MONTH,
  InvestmentStatus,
  TransactionType,
} from '../commons/constants';
import type { Category, Transaction, TransactionSummary } from '../commons/types';
import {
  getErrorMessage,
  isTouchDevice,
  SEARCH_INPUT_PROPS,
  toISODateString,
} from '../commons/utils';
import { useDataEvents, useWallets } from '../hooks';
import { categoryService, transactionService } from '../services';
import AddTransactionModal from './AddTransactionModal';
import {
  ConfirmModal,
  EmptyState,
  ListSkeleton,
  MonthFilter,
  PageHeader,
  ReceiptModal,
} from './common';
import Pagination from './Pagination';
import {
  getTypeLabel,
  INVESTMENT_STATUS_FILTER_OPTIONS,
  SpendingCalendar,
  TRANSACTION_TYPE_LABEL,
  TransactionMobileCards,
  TransactionSummaryCards,
  TransactionTable,
  type TransactionListProps,
  TypeTabs,
} from './transaction-list';
import {
  ALERT_ERROR,
  AlertTriangle,
  BLOCK_GAP,
  CHIP_BTN,
  cx,
  FILTER_FULL_ROW,
  filterBarClass,
  PAGE_VIEW,
  Receipt,
  Search,
  SEARCH_ICON,
  SEARCH_INPUT,
  SEARCH_WRAPPER,
  TABS_NAV,
  Tags,
  X,
} from './ui';

export interface TransactionsProps {
  /** Type from the URL (/#/transactions/income); the type tabs switch it locally. */
  type: TransactionType;
}

export default function Transactions({ type }: TransactionsProps) {
  const [activeType, setActiveType] = useState<TransactionType>(type);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // Wallet badges; refreshed on 'wallets-changed' (a save moves balances, a wallet is renamed).
  const wallets = useWallets();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<InvestmentStatus | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    moment().format(DATE_FORMAT_MONTH)
  );
  // Day picked in the calendar ('YYYY-MM-DD'); narrows the list to that day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Tag picked by tapping a "#tag" chip in the list.
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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
  const [modalType, setModalType] = useState<TransactionType>(type);

  // Follow the URL when the parent navigates to another type
  useEffect(() => {
    setActiveType(type);
  }, [type]);

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
        const startOfMonth = selectedDay
          ? moment(selectedDay)
          : moment(selectedMonth, DATE_FORMAT_MONTH).startOf('month');
        const endOfMonth = selectedDay
          ? moment(selectedDay)
          : moment(selectedMonth, DATE_FORMAT_MONTH).endOf('month');

        const res = await transactionService.list(
          {
            type: activeType,
            keyword: debouncedSearch.trim() || undefined,
            categoryId: selectedCategoryFilter || undefined,
            tag: selectedTag || undefined,
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
    selectedDay,
    selectedTag,
    currentPage,
    itemsPerPage,
    refreshKey,
  ]);

  // Saves here, in the quick-add modal, by the AI assistant or on another device (realtime
  // echo; useRealtimeSync also re-fires it when the app comes back online or resumes).
  useDataEvents([DATA_EVENTS.TRANSACTIONS_CHANGED], () => setRefreshKey((key) => key + 1));

  // Handle switching transaction type tabs
  const handleTabSwitch = (newType: TransactionType) => {
    if (activeType === newType) return;
    setActiveType(newType);
    setCurrentPage(1);
    setSelectedCategoryFilter('');
    setSelectedStatusFilter('');
    setSearchQuery('');
    setSelectedDay(null);
    setSelectedTag(null);
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

  // Transaction waiting for the delete confirmation.
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  // Undo a delete: the API clears the soft delete and re-applies the wallet effect,
  // so the transaction keeps its id, timestamps and receipt.
  const restoreTransaction = async (id: string) => {
    try {
      await transactionService.restore(id);
      // The list (and the always-mounted Dashboard) refresh on this event.
      window.dispatchEvent(new Event(DATA_EVENTS.TRANSACTIONS_CHANGED));
      toast.success('Đã hoàn tác xóa giao dịch!');
    } catch (err) {
      console.error('Failed to restore transaction', err);
      toast.error(`Không thể hoàn tác: ${getErrorMessage(err, 'lỗi không xác định')}.`);
    }
  };

  const executeDelete = async () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    const description = pendingDelete.description || '';
    setPendingDelete(null);

    try {
      await transactionService.delete(id);
      window.dispatchEvent(new Event(DATA_EVENTS.TRANSACTIONS_CHANGED));
      toast.success(
        ({ closeToast }) => (
          <span>
            Đã xóa "{description}".
            <button
              type="button"
              className="ml-3 cursor-pointer rounded-sm border-none bg-primary px-[0.6rem] py-[0.2rem] text-[0.8rem] font-semibold text-white transition-all duration-200 ease-[ease] hover:scale-[1.03] hover:bg-primary-hover hover:opacity-90"
              onClick={() => {
                closeToast();
                void restoreTransaction(id);
              }}
            >
              Hoàn tác
            </button>
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

  const listProps: TransactionListProps = {
    transactions,
    activeType,
    getCategoryName,
    getWallet: getWalletInfo,
    onEdit: openEditModal,
    onDelete: setPendingDelete,
    onViewReceipt: setSelectedReceiptUrl,
    onTagClick: (tag) => {
      setSelectedTag(tag);
      setCurrentPage(1);
    },
  };

  // Calculate total pages from totalItems from server
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const isInvestment = activeType === TransactionType.INVESTMENT;

  return (
    <div className={PAGE_VIEW}>
      {/* 1. Standard Header with Action */}
      <PageHeader title={TRANSACTION_TYPE_LABEL[activeType]} />

      {/* 2. Transaction Type Segmented Tabs Switcher (Below Page Title) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <TypeTabs
          value={activeType}
          onChange={handleTabSwitch}
          ariaLabel="Phân loại giao dịch (Chi tiêu, Thu nhập, Đầu tư)"
        />
      </div>

      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} /> {error}
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
            {...SEARCH_INPUT_PROPS}
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
            isSearchable={!isTouchDevice()}
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
              setSelectedDay(null);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {selectedTag && (
        <div className={cx(BLOCK_GAP, 'flex items-center gap-2 text-[13px] text-muted')}>
          <span>Đang lọc theo tag</span>
          <button
            type="button"
            className={CHIP_BTN}
            onClick={() => {
              setSelectedTag(null);
              setCurrentPage(1);
            }}
            aria-label={`Bỏ lọc tag ${selectedTag}`}
          >
            <Tags size={12} className="text-muted" />
            {selectedTag}
            <X size={12} />
          </button>
        </div>
      )}

      {/* 5. Daily calendar of the month (taps filter the list to one day) */}
      <SpendingCalendar
        month={selectedMonth}
        type={activeType}
        refreshKey={refreshKey}
        selectedDay={selectedDay}
        onSelectDay={(day) => {
          setSelectedDay(day);
          setCurrentPage(1);
        }}
      />

      {/* 6. Transactions Table (Desktop) & Cards (Mobile) */}
      {loading ? (
        <ListSkeleton label="Đang tải giao dịch" />
      ) : transactions.length === 0 ? (
        <EmptyState
          className="animate-fade-in"
          icon={<Receipt />}
          title="Chưa có giao dịch"
          description="Đổi bộ lọc hoặc thêm giao dịch."
          actionLabel={`Thêm ${getTypeLabel(activeType)} ngay`}
          onAction={openAddModal}
        />
      ) : (
        <>
          <TransactionTable {...listProps} />
          <TransactionMobileCards {...listProps} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
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
        onClose={() => setIsModalOpen(false)}
      />

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={!!pendingDelete}
        title="Xóa giao dịch"
        message={`Bạn có chắc chắn muốn xóa giao dịch "${pendingDelete?.description || ''}"? Thao tác này có thể hoàn tác trong vài giây.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setPendingDelete(null)}
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
