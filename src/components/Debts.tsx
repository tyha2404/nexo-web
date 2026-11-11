import moment from 'moment';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATE_FORMAT_INPUT } from '../commons/constants';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumberInput,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  parseNumberInput,
  SEARCH_INPUT_PROPS,
  TEXT_DONE_INPUT_PROPS,
  TEXT_NEXT_INPUT_PROPS,
} from '../commons/utils';
import { useDataEvents, useModal } from '../hooks';
import type { Wallet } from '../commons/types';
import { debtService, walletService } from '../services';
import type { Debt, DebtType } from '../types/debt';
import {
  ConfirmModal,
  DatePickerField,
  DayCalendar,
  type DayMarker,
  type DayMarkerTone,
  EmptyState,
  ListSkeleton,
  MonthFilter,
} from './common';
import {
  ACTIONS_CELL,
  CATEGORY_BADGE,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_AMOUNT_GROUP,
  MOBILE_CARD_DATE,
  MOBILE_CARD_FOOTER,
  MOBILE_CARD_INFO,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_SUB_AMOUNT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  MOBILE_CARD_TOP,
  MOBILE_CARDS,
  mobileIconBadgeClass,
  PAGE_HEADER,
  PAGE_TITLE,
  PAGE_TITLE_H2,
  PAGE_VIEW,
  TABLE,
  TABLE_CONTAINER,
  TITLE_CELL,
} from './transaction-list/listStyles';
import {
  ALERT_ERROR,
  ACTION_BTN_DELETE,
  ACTION_BTN_EDIT,
  AlertTriangle,
  ArrowRightLeft,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  btnClass,
  CHIP_BTN,
  cx,
  FILTER_FULL_ROW,
  filterBarClass,
  FORM_GROUP,
  FORM_ROW_2COL,
  Handshake,
  HEADER_ACTIONS,
  MOBILE_ACTION_DELETE,
  MOBILE_ACTION_EDIT,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_FOOTER,
  MODAL_HEADER,
  MODAL_PANEL,
  PAGE_HEADER_BTN,
  Pencil,
  Plus,
  Search,
  SEARCH_ICON,
  SEARCH_INPUT,
  SEARCH_WRAPPER,
  SlidingTabs,
  statValueClass,
  SUMMARY_GRID,
  SUMMARY_STAT_CARD,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_SUBTITLE,
  SUMMARY_STAT_TITLE,
  tabClass,
  TABS,
  TABS_NAV,
  Trash2,
  TrendingUp,
  TXN_AMOUNT,
  TXN_DATE,
  X,
} from './ui';

const DEBT_TABS: { type: DebtType; label: string }[] = [
  { type: 'PAYABLE', label: 'Tôi nợ' },
  { type: 'RECEIVABLE', label: 'Người khác nợ tôi' },
];

/**
 * Local calendar day ('YYYY-MM-DD') of an API date, or null. startDate/dueDate already come as
 * 'YYYY-MM-DD' (like transaction dates); paidAt/createdAt are timestamps.
 */
const dayOf = (value?: string | null) => (value ? moment(value).format(DATE_FORMAT_INPUT) : null);

/** Day the debt started: its start date, or the day it was recorded. */
const startDayOf = (debt: Debt) => dayOf(debt.startDate || debt.createdAt);

/** 'DD/MM/YYYY' of an API date, or '—'. */
const formatDayOrDash = (value?: string | null) => (value ? formatDate(value) : '—');

/** Unsettled and past its due date (the API only flags OVERDUE on read, so check the date too). */
const isDebtLate = (debt: Debt, today: string) =>
  debt.status !== 'COMPLETED' &&
  (debt.status === 'OVERDUE' || (dayOf(debt.dueDate) ?? '9999-12-31') < today);

/**
 * Which debts the list shows. MONTH and DONE follow the month filter (by start date); OPEN and
 * OVERDUE ignore it, so "what do I still owe?" has one answer whatever month is picked.
 */
type DebtScope = 'MONTH' | 'OPEN' | 'OVERDUE' | 'DONE';

const debtScopeOptions = (isPayable: boolean): { value: DebtScope; label: string }[] => [
  { value: 'MONTH', label: 'Tất cả trạng thái' },
  { value: 'OPEN', label: isPayable ? 'Đang nợ · mọi tháng' : 'Chưa thu · mọi tháng' },
  { value: 'OVERDUE', label: 'Quá hạn · mọi tháng' },
  { value: 'DONE', label: 'Đã xong' },
];

/** Wallet picker options; empty value = leave wallet balances alone. */
const walletOptions = (wallets: Wallet[]) => [
  { value: '', label: 'Không ghi vào ví' },
  ...wallets.map((w) => ({
    value: w.id,
    label: `${w.name} · ${formatCompactCurrency(w.balance)}`,
  })),
];

/** Sends a picked day as local midnight (like startDate); today is left to the server's clock. */
const toPaidAt = (day: string) =>
  day === moment().format('YYYY-MM-DD')
    ? undefined
    : moment(day, 'YYYY-MM-DD').startOf('day').format();

/** Whether the debt was started, repaid or falls due on `day`. */
const debtTouchesDay = (debt: Debt, day: string) =>
  startDayOf(debt) === day ||
  dayOf(debt.dueDate) === day ||
  (debt.repayments ?? []).some((r) => dayOf(r.paidAt) === day);

/** Dot legend of the debt calendar, worded for the side of the ledger. */
const debtMarkerLegend = (isPayable: boolean): Record<DayMarkerTone, string> => ({
  success: isPayable ? 'Đã trả' : 'Đã thu',
  warning: isPayable ? 'Chưa trả xong' : 'Chưa thu đủ',
  danger: isPayable ? 'Quá hạn chưa trả' : 'Quá hạn chưa thu',
});

/**
 * Calendar data for one debt type and month: money moved per day (new debts on their start
 * date + repayments on their payment date) and status icons:
 *   - start day: the debt's current status, so a debt listed this month always shows whether
 *     it is settled, even when it was repaid in another month or has no due date;
 *   - repayment day: green (money paid / received that day);
 *   - due day: green if settled, amber if still open, red if the date has passed.
 */
function buildDebtCalendar(debts: Debt[], month: string, isPayable: boolean) {
  const inMonth = (day: string | null): day is string => !!day && day.startsWith(month);
  const today = moment().format('YYYY-MM-DD');
  const opened: Record<string, number> = {};
  const repaid: Record<string, number> = {};
  const markers: Record<string, DayMarker[]> = {};
  const mark = (day: string, tone: DayMarkerTone, text: string) =>
    (markers[day] ??= []).push({ tone, text });
  const paidWord = isPayable ? 'Đã trả' : 'Đã thu';
  const unpaidWord = isPayable ? 'chưa trả' : 'chưa thu';
  const settledWord = isPayable ? 'Đã trả xong' : 'Đã thu đủ';
  const unsettledWord = isPayable ? 'Chưa trả xong' : 'Chưa thu đủ';
  for (const debt of debts) {
    const settled = debt.status === 'COMPLETED';
    const dueDay = dayOf(debt.dueDate);
    const late = !settled && (debt.status === 'OVERDUE' || (!!dueDay && dueDay < today));
    const left = formatCurrency(Math.abs(debt.remaining ?? debt.totalAmount));
    const start = startDayOf(debt);
    if (inMonth(start)) {
      opened[start] = (opened[start] ?? 0) + debt.totalAmount;
      if (settled) mark(start, 'success', `${settledWord}: ${debt.title}`);
      else if (late) mark(start, 'danger', `Quá hạn, ${unpaidWord} ${left}: ${debt.title}`);
      else mark(start, 'warning', `${unsettledWord}, còn ${left}: ${debt.title}`);
    }
    // This debt's repayments per day, so several payments on one day read as one line.
    const paidOn: Record<string, number> = {};
    for (const r of debt.repayments ?? []) {
      const paid = dayOf(r.paidAt);
      if (!inMonth(paid)) continue;
      repaid[paid] = (repaid[paid] ?? 0) + r.amount;
      paidOn[paid] = (paidOn[paid] ?? 0) + r.amount;
    }
    for (const [day, amount] of Object.entries(paidOn)) {
      mark(day, 'success', `${paidWord} ${formatCurrency(amount)}: ${debt.title}`);
    }
    // Due on the start day: the start-day icon already says it.
    if (!inMonth(dueDay) || dueDay === start) continue;
    if (settled) {
      mark(dueDay, 'success', `${settledWord}: ${debt.title}`);
    } else {
      mark(
        dueDay,
        late ? 'danger' : 'warning',
        `${late ? 'Quá hạn' : 'Đến hạn'}, ${unpaidWord} ${left}: ${debt.title}`
      );
    }
  }
  const openWord = isPayable ? 'Vay' : 'Cho vay';
  const repayWord = isPayable ? 'Trả' : 'Thu';
  const values: Record<string, number> = {};
  const details: Record<string, string> = {};
  for (const day of new Set([...Object.keys(opened), ...Object.keys(repaid)])) {
    values[day] = (opened[day] ?? 0) + (repaid[day] ?? 0);
    details[day] = [
      opened[day] && `${openWord} ${formatCurrency(opened[day])}`,
      repaid[day] && `${repayWord} ${formatCurrency(repaid[day])}`,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  const summary = `${openWord} ${formatCompactCurrency(sum(opened))} · ${repayWord} ${formatCompactCurrency(sum(repaid))}`;
  return { values, details, markers, summary, legend: debtMarkerLegend(isPayable) };
}

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Month & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  // Pill tabs: which side of the ledger is listed
  const [activeType, setActiveType] = useState<DebtType>('PAYABLE');
  // Day picked in the calendar ('YYYY-MM-DD'); lists debts started, repaid or due that day.
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [scope, setScope] = useState<DebtScope>('MONTH');
  // Wallets for the optional "which wallet moved" pickers; the page works without them.
  const [wallets, setWallets] = useState<Wallet[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState<boolean>(false);
  const createDialogRef = useModal(isCreateModalOpen, () => setIsCreateModalOpen(false));
  const repayDialogRef = useModal(isRepayModalOpen, () => setIsRepayModalOpen(false));
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Create / Edit Form State (dates are picked days, 'YYYY-MM-DD' or '')
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [formType, setFormType] = useState<DebtType>('PAYABLE');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<string>(() => moment().format('YYYY-MM-DD'));
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formWalletId, setFormWalletId] = useState<string>('');

  // Repay Form State
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');
  const [repayDate, setRepayDate] = useState<string>('');
  const [repayWalletId, setRepayWalletId] = useState<string>('');

  const fetchDebtData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Both types at once: switching tabs is then instant and needs no refetch.
      const debtList = await debtService.getDebts();
      setDebts(Array.isArray(debtList) ? debtList : (debtList as { data?: Debt[] })?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu khoản vay/nợ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebtData();
  }, [fetchDebtData]);

  // Repayments from the AI assistant or another device arrive via realtime
  useDataEvents(['debts-changed'], fetchDebtData);

  const fetchWallets = useCallback(() => {
    walletService
      .getWallets()
      .then((res) => setWallets(res.wallets || []))
      .catch(() => {
        // Optional: without wallets the pickers are simply hidden.
      });
  }, []);
  useEffect(fetchWallets, [fetchWallets]);
  useDataEvents(['wallets-changed'], fetchWallets);

  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    setter(formatNumberInput(val));
  };

  const openCreateModal = (defaultType: DebtType = 'PAYABLE') => {
    setEditingDebt(null);
    setFormType(defaultType);
    setFormTitle('');
    setFormAmount('');
    setFormStartDate(moment().format('YYYY-MM-DD'));
    setFormDueDate('');
    setFormNotes('');
    setFormWalletId('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setFormType(debt.type);
    setFormTitle(debt.title);
    setFormAmount(formatNumberInput(String(Math.round(debt.totalAmount))));
    setFormStartDate(startDayOf(debt) ?? '');
    setFormDueDate(dayOf(debt.dueDate) ?? '');
    setFormNotes(debt.notes ?? '');
    // Keep the linked wallet even if it was deleted, so saving does not silently unlink it.
    setFormWalletId(debt.walletId ?? '');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseNumberInput(formAmount);

    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tên khoản nợ / đối tác');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (editingDebt && parsedAmount < Math.round(editingDebt.paidAmount)) {
      toast.error(
        `Số tiền gốc không được nhỏ hơn số đã thanh toán (${formatCurrency(editingDebt.paidAmount)})`
      );
      return;
    }
    if (formStartDate && formDueDate && formDueDate < formStartDate) {
      toast.error('Hạn thanh toán phải từ ngày bắt đầu trở đi');
      return;
    }

    // Days go out as 'YYYY-MM-DD', like transaction dates.
    const startDate = formStartDate || undefined;
    const dueDate = formDueDate || undefined;
    try {
      if (editingDebt) {
        await debtService.updateDebt(editingDebt.id, {
          title: formTitle,
          totalAmount: parsedAmount,
          startDate,
          dueDate: dueDate ?? null,
          notes: formNotes,
          walletId: formWalletId || null,
        });
        toast.success('Đã cập nhật khoản vay/nợ');
      } else {
        await debtService.createDebt({
          type: formType,
          title: formTitle,
          totalAmount: parsedAmount,
          startDate,
          dueDate,
          notes: formNotes,
          walletId: formWalletId || undefined,
        });
        toast.success('Đã tạo khoản vay/nợ thành công!');
      }

      window.dispatchEvent(new Event('debts-changed'));
      if (formWalletId || editingDebt?.walletId) {
        window.dispatchEvent(new Event('wallets-changed'));
      }
      setIsCreateModalOpen(false);
      setEditingDebt(null);
      fetchDebtData();
    } catch (err: unknown) {
      const fallback = editingDebt ? 'Lỗi khi cập nhật khoản vay/nợ' : 'Lỗi khi tạo khoản vay/nợ';
      toast.error(err instanceof Error ? err.message : fallback);
    }
  };

  const openRepayModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setRepayAmount('');
    setRepayNotes('');
    setRepayDate(moment().format('YYYY-MM-DD'));
    // Default to the wallet the debt came from/went to, when it still exists.
    setRepayWalletId(
      debt.walletId && wallets.some((w) => w.id === debt.walletId) ? debt.walletId : ''
    );
    setIsRepayModalOpen(true);
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const parsedAmount = parseNumberInput(repayAmount);

    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (parsedAmount > Math.round(Math.abs(selectedDebt.remaining))) {
      toast.error(
        `Số tiền vượt quá số còn lại (${formatCurrency(Math.abs(selectedDebt.remaining))})`
      );
      return;
    }
    const today = moment().format('YYYY-MM-DD');
    const startDay = startDayOf(selectedDebt);
    if (!repayDate || repayDate > today) {
      toast.error('Ngày thanh toán không được ở tương lai');
      return;
    }
    if (startDay && repayDate < startDay) {
      toast.error(`Ngày thanh toán phải từ ngày vay (${moment(startDay).format('DD/MM/YYYY')})`);
      return;
    }

    try {
      await debtService.addRepayment(selectedDebt.id, {
        amount: parsedAmount,
        notes: repayNotes,
        paidAt: toPaidAt(repayDate),
        walletId: repayWalletId || undefined,
      });

      toast.success('Đã ghi nhận thanh toán thành công!');
      window.dispatchEvent(new Event('debts-changed'));
      if (repayWalletId) window.dispatchEvent(new Event('wallets-changed'));
      setIsRepayModalOpen(false);
      setSelectedDebt(null);
      setRepayAmount('');
      setRepayNotes('');
      fetchDebtData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi ghi nhận thanh toán');
    }
  };

  // Confirm Modal State
  const [deleteDebtConfirm, setDeleteDebtConfirm] = useState<{
    isOpen: boolean;
    id: string;
  } | null>(null);

  const handleDelete = (debtId: string) => {
    setDeleteDebtConfirm({ isOpen: true, id: debtId });
  };

  const executeDeleteDebt = async () => {
    if (!deleteDebtConfirm) return;
    const { id } = deleteDebtConfirm;
    setDeleteDebtConfirm(null);
    try {
      await debtService.deleteDebt(id);
      toast.success('Đã xóa khoản vay/nợ thành công');
      window.dispatchEvent(new Event('debts-changed'));
      fetchDebtData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa khoản vay/nợ');
    }
  };

  const startOfMonth = moment(selectedMonth, 'YYYY-MM').startOf('month');
  const endOfMonth = moment(selectedMonth, 'YYYY-MM').endOf('month');
  const isPayableTab = activeType === 'PAYABLE';

  const typeDebts = useMemo(
    () => (Array.isArray(debts) ? debts : []).filter((d) => d && d.type === activeType),
    [debts, activeType]
  );

  const calendar = useMemo(
    () => buildDebtCalendar(typeDebts, selectedMonth, activeType === 'PAYABLE'),
    [typeDebts, selectedMonth, activeType]
  );

  const todayKey = moment().format('YYYY-MM-DD');
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
    return moment(startDay, 'YYYY-MM-DD').isBetween(startOfMonth, endOfMonth, 'day', '[]');
  });
  // Unsettled debts across months: the soonest due first, those without a due date last.
  if (scopeIgnoresMonth) {
    filteredDebts.sort((a, b) =>
      (dayOf(a.dueDate) ?? '9999-12-31').localeCompare(dayOf(b.dueDate) ?? '9999-12-31')
    );
  }

  const totalRemaining = filteredDebts.reduce(
    (sum, d) => sum + Math.abs(d.remaining ?? d.totalAmount ?? 0),
    0
  );
  const totalPaid = filteredDebts.reduce((sum, d) => sum + (d.paidAmount ?? 0), 0);
  const overdueCount = filteredDebts.filter((d) => d.status === 'OVERDUE').length;

  // Create/edit wallet picker; a deleted wallet still linked to the edited debt stays listed.
  const editWalletOptions =
    editingDebt?.walletId && !wallets.some((w) => w.id === editingDebt.walletId)
      ? [...walletOptions(wallets), { value: editingDebt.walletId, label: 'Ví đã xóa' }]
      : walletOptions(wallets);

  const switchTab = (type: DebtType) => {
    if (type === activeType) return;
    setActiveType(type);
    setSelectedDay(null);
    setSearchQuery('');
  };

  return (
    <div className={PAGE_VIEW}>
      <header className={`${PAGE_HEADER} animate-fade-in`}>
        <div className={PAGE_TITLE}>
          <h2 className={PAGE_TITLE_H2}>Vay & Nợ</h2>
        </div>
        <div className={HEADER_ACTIONS}>
          <button className={PAGE_HEADER_BTN} onClick={() => openCreateModal(activeType)}>
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        </div>
      </header>

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
        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>
              {isPayableTab ? 'Còn phải trả' : 'Còn phải thu'}
            </span>
          </div>
          <div className={statValueClass(isPayableTab ? 'expense' : 'income')}>
            {formatCurrency(totalRemaining)}
          </div>
        </div>

        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>{isPayableTab ? 'Đã trả' : 'Đã thu'}</span>
          </div>
          <div className={statValueClass()}>{formatCurrency(totalPaid)}</div>
        </div>

        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Số khoản</span>
          </div>
          <div className={statValueClass()}>{filteredDebts.length} khoản</div>
          {overdueCount > 0 && (
            <div className={SUMMARY_STAT_SUBTITLE}>{overdueCount} khoản quá hạn</div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar - 100% Matching Transactions.tsx */}
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
        loading={loading && debts.length === 0}
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
          {/* Desktop Table View */}
          <div className={`debts-table-container ${TABLE_CONTAINER} max-w-full animate-fade-in`}>
            <table
              className={`debts-table ${TABLE} [&_th]:whitespace-nowrap [&_th]:text-left [&_th]:text-[0.8rem] [&_th]:uppercase [&_th]:tracking-[0.05em] [&_td]:text-[0.875rem]`}
            >
              <thead>
                <tr>
                  <th>Khoản nợ / Đối tác</th>
                  <th className="text-right!">Tổng số tiền</th>
                  <th className="text-right!">Đã thanh toán</th>
                  <th className="text-right!">Còn lại</th>
                  <th>Ngày vay/cho vay</th>
                  <th>Hạn chót</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.map((debt) => {
                  const percent = Math.min(
                    100,
                    Math.round((debt.paidAmount / debt.totalAmount) * 100)
                  );

                  return (
                    <tr key={debt.id}>
                      <td className={TITLE_CELL}>
                        <div className="max-w-[220px] break-words font-semibold">{debt.title}</div>
                        {debt.notes && (
                          <div className="mt-0.5 text-[0.78rem] text-muted">{debt.notes}</div>
                        )}
                      </td>
                      <td className={TXN_AMOUNT}>{formatCurrency(debt.totalAmount)}</td>
                      <td className={cx('cell-paid', TXN_AMOUNT)}>
                        {formatCurrency(debt.paidAmount)}
                      </td>
                      <td
                        className={cx('cell-remaining', TXN_AMOUNT)}
                        style={{
                          color: debt.type === 'PAYABLE' ? 'var(--expense)' : 'var(--income)',
                        }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </td>
                      <td className={TXN_DATE}>{formatDayOrDash(debt.startDate)}</td>
                      <td className={TXN_DATE}>{formatDayOrDash(debt.dueDate)}</td>
                      <td>
                        <span className={CATEGORY_BADGE}>
                          {debt.status === 'COMPLETED'
                            ? '🎉 Đã xong'
                            : debt.status === 'OVERDUE'
                              ? '🚨 Quá hạn'
                              : `Đang nợ (${percent}%)`}
                        </span>
                      </td>
                      <td className={ACTIONS_CELL}>
                        <div className="flex items-center gap-2">
                          {debt.status !== 'COMPLETED' && (
                            <button
                              onClick={() => {
                                openRepayModal(debt);
                              }}
                              className={cx(
                                btnClass('secondary', 'px-[0.85rem] py-[0.45rem] text-[0.85rem]'),
                                'min-h-9'
                              )}
                              title="Ghi nhận trả/thu tiền"
                            >
                              <ArrowRightLeft size={16} /> Trả tiền
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(debt)}
                            className={ACTION_BTN_EDIT}
                            aria-label={`Sửa khoản ${debt.title}`}
                            title="Sửa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(debt.id)}
                            className={ACTION_BTN_DELETE}
                            aria-label="Xóa khoản vay"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className={`${MOBILE_CARDS} animate-fade-in`}>
            {filteredDebts.map((debt) => {
              const isPayable = debt.type === 'PAYABLE';
              const percent = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));

              return (
                <div key={`m-debt-${debt.id}`} className={MOBILE_CARD}>
                  <div className={MOBILE_CARD_TOP}>
                    <div className={MOBILE_CARD_LEFT}>
                      <div className={mobileIconBadgeClass(isPayable ? 'expense' : 'income')}>
                        <Handshake size={16} />
                      </div>
                      <div className={MOBILE_CARD_INFO}>
                        <div className={MOBILE_CARD_TITLE}>{debt.title}</div>
                        {debt.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {debt.notes}
                          </div>
                        )}
                        <div className={MOBILE_CARD_DATE}>
                          <span>
                            {formatDayOrDash(debt.startDate)}
                            {debt.dueDate ? ` → Hạn: ${formatDayOrDash(debt.dueDate)}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={MOBILE_CARD_AMOUNT_GROUP}>
                      <div
                        className={`${MOBILE_CARD_AMOUNT} text-main`}
                        style={{ color: isPayable ? 'var(--expense)' : 'var(--income)' }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </div>
                      <div className={MOBILE_CARD_SUB_AMOUNT}>
                        Tổng: {formatCurrency(debt.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className={MOBILE_CARD_FOOTER}>
                    <div className={MOBILE_CARD_TAGS}>
                      <span className={CATEGORY_BADGE}>
                        {debt.status === 'COMPLETED'
                          ? '🎉 Đã xong'
                          : debt.status === 'OVERDUE'
                            ? '🚨 Quá hạn'
                            : `Đã trả ${percent}% (${formatCurrency(debt.paidAmount)})`}
                      </span>
                    </div>

                    <div className={MOBILE_CARD_ACTIONS}>
                      {debt.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => {
                            openRepayModal(debt);
                          }}
                          className={MOBILE_ACTION_EDIT}
                          title="Ghi nhận trả/thu tiền"
                        >
                          <ArrowRightLeft size={16} /> Trả tiền
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(debt)}
                        className={MOBILE_ACTION_EDIT}
                        aria-label={`Sửa khoản ${debt.title}`}
                      >
                        <Pencil size={16} /> Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(debt.id)}
                        className={MOBILE_ACTION_DELETE}
                        title="Xóa khoản nợ"
                      >
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen &&
        createPortal(
          <div className={MODAL_BACKDROP} onClick={() => setIsCreateModalOpen(false)}>
            <div
              ref={createDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={editingDebt ? 'Sửa khoản nợ' : 'Tạo khoản nợ mới'}
              tabIndex={-1}
              className={MODAL_PANEL}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_HEADER}>
                <h3>{editingDebt ? 'Sửa khoản nợ' : 'Tạo khoản nợ mới'}</h3>
                <button
                  className={MODAL_CLOSE_BTN}
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className={FORM_GROUP}>
                  <label htmlFor="debt-title">Khoản nợ / Đối tác</label>
                  <input
                    id="debt-title"
                    {...TEXT_NEXT_INPUT_PROPS}
                    placeholder="Ví dụ: Vay mua xe TPBank, Anh Tuấn..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={FORM_ROW_2COL}>
                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-type-select">Loại nợ</label>
                    <Select
                      id="debt-type-select"
                      options={[
                        { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                        { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
                      ]}
                      value={
                        [
                          { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                          { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
                        ].find((opt) => opt.value === formType) || null
                      }
                      onChange={(option) => {
                        if (option) setFormType(option.value as DebtType);
                      }}
                      // The type sets the direction of every repayment, so it is fixed once created.
                      isDisabled={!!editingDebt}
                      classNamePrefix="react-select"
                      isSearchable={!isTouchDevice()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-amount">Số tiền gốc (đ)</label>
                    <input
                      id="debt-amount"
                      {...MONEY_INPUT_PROPS}
                      placeholder="Ví dụ: 5.000.000"
                      value={formAmount}
                      onChange={(e) => handleAmountChange(e.target.value, setFormAmount)}
                      required
                    />
                  </div>
                </div>

                <div className={FORM_ROW_2COL}>
                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-startdate">Ngày bắt đầu</label>
                    <DatePickerField
                      id="debt-startdate"
                      label="Ngày bắt đầu"
                      value={formStartDate}
                      onChange={setFormStartDate}
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-duedate">Hạn thanh toán</label>
                    <DatePickerField
                      id="debt-duedate"
                      label="Hạn thanh toán"
                      value={formDueDate}
                      onChange={setFormDueDate}
                    />
                  </div>
                </div>

                {(wallets.length > 0 || !!editingDebt?.walletId) && (
                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-wallet">
                      {formType === 'PAYABLE' ? 'Nhận tiền vào ví' : 'Chi tiền từ ví'}{' '}
                      <span className="text-muted">(tùy chọn)</span>
                    </label>
                    <Select
                      inputId="debt-wallet"
                      options={editWalletOptions}
                      value={editWalletOptions.find((o) => o.value === formWalletId) || null}
                      onChange={(option) => setFormWalletId(option?.value ?? '')}
                      classNamePrefix="react-select"
                      isSearchable={!isTouchDevice()}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                    />
                    {editingDebt?.walletId && (
                      <div className="mt-1 text-[0.8rem] text-muted">
                        Đổi ví hoặc số tiền gốc sẽ điều chỉnh lại số dư ví tương ứng.
                      </div>
                    )}
                  </div>
                )}

                <div className={FORM_GROUP}>
                  <label htmlFor="debt-notes">Ghi chú</label>
                  <textarea
                    id="debt-notes"
                    rows={2}
                    placeholder="Ghi chú thêm..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>

                <div className={MODAL_FOOTER}>
                  <button
                    type="button"
                    className={cx(BTN_SECONDARY, BTN_FILL)}
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
                    {editingDebt ? 'Lưu thay đổi' : 'Tạo khoản nợ'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Repay Modal */}
      {isRepayModalOpen &&
        selectedDebt &&
        createPortal(
          <div className={MODAL_BACKDROP} onClick={() => setIsRepayModalOpen(false)}>
            <div
              ref={repayDialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Ghi nhận trả / thu tiền"
              tabIndex={-1}
              className={MODAL_PANEL}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_HEADER}>
                <h3>Ghi nhận trả / thu tiền</h3>
                <button
                  className={MODAL_CLOSE_BTN}
                  onClick={() => setIsRepayModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleRepaySubmit}>
                <div className="mb-4 rounded-sm border border-line bg-input p-[0.8rem]">
                  <div className="font-bold">{selectedDebt.title}</div>
                  <div
                    className="mt-[0.2rem] text-[0.85rem] text-primary"
                    style={{
                      color: selectedDebt.type === 'PAYABLE' ? 'var(--expense)' : 'var(--income)',
                      fontWeight: 600,
                    }}
                  >
                    Còn lại: {formatCurrency(Math.abs(selectedDebt.remaining))}
                  </div>
                </div>

                <div className={FORM_GROUP}>
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="repay-amount">Số tiền trả đợt này (đ)</label>
                    <button
                      type="button"
                      className={CHIP_BTN}
                      onClick={() =>
                        setRepayAmount(
                          formatNumberInput(String(Math.round(Math.abs(selectedDebt.remaining))))
                        )
                      }
                    >
                      {selectedDebt.type === 'PAYABLE' ? 'Trả hết' : 'Thu đủ'}{' '}
                      {formatCompactCurrency(Math.abs(selectedDebt.remaining))}
                    </button>
                  </div>
                  <input
                    id="repay-amount"
                    {...MONEY_INPUT_PROPS}
                    placeholder={`Ví dụ: ${formatCurrency(selectedDebt.remaining)}`}
                    value={repayAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setRepayAmount)}
                    required
                  />
                </div>

                <div className={FORM_ROW_2COL}>
                  <div className={FORM_GROUP}>
                    <label htmlFor="repay-date">Ngày thanh toán</label>
                    <DatePickerField
                      id="repay-date"
                      label="Ngày thanh toán"
                      value={repayDate}
                      onChange={setRepayDate}
                      required
                    />
                  </div>
                  {wallets.length > 0 && (
                    <div className={FORM_GROUP}>
                      <label htmlFor="repay-wallet">
                        {selectedDebt.type === 'PAYABLE' ? 'Trả từ ví' : 'Nhận vào ví'}
                      </label>
                      <Select
                        inputId="repay-wallet"
                        options={walletOptions(wallets)}
                        value={
                          walletOptions(wallets).find((o) => o.value === repayWalletId) || null
                        }
                        onChange={(option) => setRepayWalletId(option?.value ?? '')}
                        classNamePrefix="react-select"
                        isSearchable={!isTouchDevice()}
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </div>
                  )}
                </div>

                <div className={FORM_GROUP}>
                  <label htmlFor="repay-notes">Ghi chú</label>
                  <input
                    id="repay-notes"
                    {...TEXT_DONE_INPUT_PROPS}
                    placeholder="VD: Trả đợt 1..."
                    value={repayNotes}
                    onChange={(e) => setRepayNotes(e.target.value)}
                  />
                </div>

                <div className={MODAL_FOOTER}>
                  <button
                    type="button"
                    className={cx(BTN_SECONDARY, BTN_FILL)}
                    onClick={() => setIsRepayModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
                    Xác nhận thanh toán
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Debt Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteDebtConfirm?.isOpen)}
        title="Xóa khoản vay / nợ"
        message="Bạn có chắc chắn muốn xóa khoản vay/nợ này không? Toàn bộ lịch sử thanh toán liên quan sẽ bị xóa."
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDeleteDebt}
        onCancel={() => setDeleteDebtConfirm(null)}
      />
    </div>
  );
}
