import moment from 'moment';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import {
  formatCurrency,
  getErrorMessage,
  isDebtLate,
  localDayOf,
  SEARCH_INPUT_PROPS,
} from '../commons/utils';
import { DATA_EVENTS, DATE_FORMAT_INPUT, DATE_FORMAT_MONTH } from '../commons/constants';
import { useDataEvents, useWallets } from '../hooks';
import type { Debt, DebtType } from '../commons/types';
import { debtService } from '../services';
import {
  buildDebtCalendar,
  DEBT_TABS,
  DebtFormModal,
  DebtMobileCards,
  type DebtScope,
  debtScopeOptions,
  DebtTable,
  debtTouchesDay,
  RepayModal,
  startDayOf,
} from './debt-list';
import {
  ConfirmModal,
  DayCalendar,
  EmptyState,
  ListSkeleton,
  MonthFilter,
  PageHeader,
  StatCard,
} from './common';
import {
  ALERT_ERROR,
  AlertTriangle,
  cx,
  FILTER_FULL_ROW,
  filterBarClass,
  Handshake,
  PAGE_HEADER_BTN,
  PAGE_VIEW,
  Plus,
  Search,
  SEARCH_ICON,
  SEARCH_INPUT,
  SEARCH_WRAPPER,
  SlidingTabs,
  SUMMARY_GRID,
  tabClass,
  TABS,
  TABS_NAV,
  TrendingUp,
} from './ui';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  // Only the first load shows the skeleton; refreshes after a save update the list in place.
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Month & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    moment().format(DATE_FORMAT_MONTH)
  );
  // Pill tabs: which side of the ledger is listed
  const [activeType, setActiveType] = useState<DebtType>('PAYABLE');
  // Day picked in the calendar ('YYYY-MM-DD'); lists debts started, repaid or due that day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [scope, setScope] = useState<DebtScope>('MONTH');
  // Wallets for the optional "which wallet moved" pickers; the page works without them.
  const wallets = useWallets();

  // Modals: the debt form (create when debt is null) and the repayment form.
  const [debtForm, setDebtForm] = useState<{ debt: Debt | null; type: DebtType } | null>(null);
  const [repayDebt, setRepayDebt] = useState<Debt | null>(null);
  // Debt waiting for the delete confirmation.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const fetchDebtData = useCallback(async () => {
    try {
      setError(null);
      // Both types at once: switching tabs is then instant and needs no refetch.
      setDebts(await debtService.getDebts());
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải dữ liệu khoản vay/nợ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebtData();
  }, [fetchDebtData]);

  // The only refresh path: local saves, the AI assistant and other devices (realtime) all
  // dispatch 'debts-changed'.
  useDataEvents([DATA_EVENTS.DEBTS_CHANGED], fetchDebtData);

  const openCreateModal = (type: DebtType = 'PAYABLE') => setDebtForm({ debt: null, type });
  const openEditModal = (debt: Debt) => setDebtForm({ debt, type: debt.type });

  const executeDeleteDebt = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    try {
      await debtService.deleteDebt(id);
      toast.success('Đã xóa khoản vay/nợ thành công');
      window.dispatchEvent(new Event(DATA_EVENTS.DEBTS_CHANGED));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi xóa khoản vay/nợ'));
    }
  };

  const startOfMonth = moment(selectedMonth, DATE_FORMAT_MONTH).startOf('month');
  const endOfMonth = moment(selectedMonth, DATE_FORMAT_MONTH).endOf('month');
  const isPayableTab = activeType === 'PAYABLE';

  const typeDebts = useMemo(() => debts.filter((d) => d.type === activeType), [debts, activeType]);

  const calendar = useMemo(
    () => buildDebtCalendar(typeDebts, selectedMonth, activeType === 'PAYABLE'),
    [typeDebts, selectedMonth, activeType]
  );

  const todayKey = moment().format(DATE_FORMAT_INPUT);
  const scopeIgnoresMonth = scope === 'OPEN' || scope === 'OVERDUE';
  const filteredDebts = typeDebts.filter((d) => {
    const query = searchQuery.toLowerCase();
    const matchSearch =
      (d.title || '').toLowerCase().includes(query) ||
      (d.notes || '').toLowerCase().includes(query);
    if (!matchSearch) return false;
    if (scope === 'OPEN' && d.status === 'COMPLETED') return false;
    if (scope === 'OVERDUE' && !isDebtLate(d, todayKey)) return false;
    if (scope === 'DONE' && d.status !== 'COMPLETED') return false;
    // A picked day lists every debt with activity that day, whatever month it started in.
    if (selectedDay) return debtTouchesDay(d, selectedDay);
    if (scopeIgnoresMonth) return true;

    const startDay = startDayOf(d);
    if (!startDay) return true;
    return moment(startDay, DATE_FORMAT_INPUT).isBetween(startOfMonth, endOfMonth, 'day', '[]');
  });
  // Unsettled debts across months: the soonest due first, those without a due date last.
  if (scopeIgnoresMonth) {
    filteredDebts.sort((a, b) =>
      (localDayOf(a.dueDate) ?? '9999-12-31').localeCompare(localDayOf(b.dueDate) ?? '9999-12-31')
    );
  }

  const totalRemaining = filteredDebts.reduce(
    (sum, d) => sum + Math.abs(d.remaining ?? d.totalAmount ?? 0),
    0
  );
  const totalPaid = filteredDebts.reduce((sum, d) => sum + (d.paidAmount ?? 0), 0);
  // Same rule as the "Quá hạn" filter.
  const overdueCount = filteredDebts.filter((d) => isDebtLate(d, todayKey)).length;

  const listProps = {
    debts: filteredDebts,
    todayKey,
    onRepay: setRepayDebt,
    onEdit: openEditModal,
    onDelete: (debt: Debt) => setPendingDeleteId(debt.id),
  };

  const switchTab = (type: DebtType) => {
    if (type === activeType) return;
    setActiveType(type);
    setSelectedDay(null);
    setSearchQuery('');
  };

  return (
    <div className={PAGE_VIEW}>
      <PageHeader
        title="Vay & Nợ"
        actions={
          <button className={PAGE_HEADER_BTN} onClick={() => openCreateModal(activeType)}>
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        }
      />

      {/* Type tabs (same pill tabs as Chi tiêu / Thu nhập / Đầu tư) */}
      <div className={`${TABS_NAV} animate-fade-in`}>
        <SlidingTabs className={TABS} role="tablist" aria-label="Loại khoản nợ">
          {DEBT_TABS.map(({ type, label }) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={activeType === type}
              className={tabClass(activeType === type)}
              onClick={() => switchTab(type)}
            >
              {type === 'PAYABLE' ? <Handshake size={16} /> : <TrendingUp size={16} />}
              <span>{label}</span>
            </button>
          ))}
        </SlidingTabs>
      </div>

      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Summary Cards Grid (follows the tab, month/day and search) */}
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <StatCard
          title={isPayableTab ? 'Còn phải trả' : 'Còn phải thu'}
          tone={isPayableTab ? 'expense' : 'income'}
          value={formatCurrency(totalRemaining)}
        />
        <StatCard title={isPayableTab ? 'Đã trả' : 'Đã thu'} value={formatCurrency(totalPaid)} />
        <StatCard
          title="Số khoản"
          value={`${filteredDebts.length} khoản`}
          subtitle={overdueCount > 0 ? `${overdueCount} khoản quá hạn` : undefined}
        />
      </div>

      {/* Filter and search bar (same layout as Transactions) */}
      {/* Search + month only (the type is the tab above), so two columns on wide screens */}
      <div className={cx(filterBarClass(), 'animate-fade-in')}>
        <div className={SEARCH_WRAPPER}>
          <Search size={16} className={SEARCH_ICON} />
          <input
            className={SEARCH_INPUT}
            {...SEARCH_INPUT_PROPS}
            aria-label="Tìm khoản nợ theo tiêu đề hoặc ghi chú"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={cx('w-full', FILTER_FULL_ROW)}>
          <Select
            aria-label="Lọc theo trạng thái"
            options={debtScopeOptions(isPayableTab)}
            value={debtScopeOptions(isPayableTab).find((o) => o.value === scope) || null}
            onChange={(option) => {
              setScope(option?.value ?? 'MONTH');
              setSelectedDay(null);
            }}
            classNamePrefix="react-select"
            isSearchable={false}
            menuPortalTarget={document.body}
          />
        </div>

        <div className={FILTER_FULL_ROW}>
          <MonthFilter
            value={selectedMonth}
            onChange={(month) => {
              setSelectedMonth(month);
              setSelectedDay(null);
            }}
          />
        </div>
      </div>

      {/* Daily calendar: money moved per day, dots = paid / due / overdue; tap a day to filter */}
      <DayCalendar
        month={selectedMonth}
        values={calendar.values}
        details={calendar.details}
        markers={calendar.markers}
        markerLegend={calendar.legend}
        summary={calendar.summary}
        tone={isPayableTab ? 'var(--expense)' : 'var(--income)'}
        label={isPayableTab ? 'Lịch khoản tôi nợ theo ngày' : 'Lịch khoản cho vay theo ngày'}
        emptyText="không có giao dịch nợ"
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        loading={loading}
      />

      {loading ? (
        <ListSkeleton label="Đang tải danh sách khoản vay" />
      ) : filteredDebts.length === 0 ? (
        <EmptyState
          className="animate-fade-in"
          icon={<Handshake />}
          title={isPayableTab ? 'Không có khoản bạn đang nợ' : 'Không có khoản ai nợ bạn'}
          description={
            scopeIgnoresMonth
              ? 'Không còn khoản nào ở trạng thái này.'
              : 'Tạo khoản mới hoặc đổi tháng / ngày / trạng thái để xem các khoản khác.'
          }
          actionLabel={isPayableTab ? 'Ghi khoản tôi nợ' : 'Ghi khoản cho vay'}
          onAction={() => openCreateModal(activeType)}
        />
      ) : (
        <>
          <DebtTable {...listProps} />
          <DebtMobileCards {...listProps} />
        </>
      )}

      <DebtFormModal
        open={!!debtForm}
        debt={debtForm?.debt ?? null}
        defaultType={debtForm?.type ?? activeType}
        wallets={wallets}
        onClose={() => setDebtForm(null)}
      />
      <RepayModal debt={repayDebt} wallets={wallets} onClose={() => setRepayDebt(null)} />

      {/* Delete Debt Confirm Modal */}
      <ConfirmModal
        isOpen={!!pendingDeleteId}
        title="Xóa khoản vay / nợ"
        message="Bạn có chắc chắn muốn xóa khoản vay/nợ này không? Toàn bộ lịch sử thanh toán liên quan sẽ bị xóa."
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDeleteDebt}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
