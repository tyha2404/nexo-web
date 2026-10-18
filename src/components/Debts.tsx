import React, { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { Search, Plus, Trash2, Handshake, X, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../commons/utils';
import { debtService } from '../services';
import type { Debt, DebtType } from '../types/debt';
import { useDataEvents, useModal } from '../hooks';
import { ConfirmModal, DatePickerField, MonthFilter } from './common';
import {
  ACTIONS_CELL,
  CATEGORY_BADGE,
  LOADING_SPINNER,
  MOBILE_CARD,
  MOBILE_CARD_ACTIONS,
  MOBILE_CARD_AMOUNT,
  MOBILE_CARD_DATE,
  MOBILE_CARD_LEFT,
  MOBILE_CARD_TAGS,
  MOBILE_CARD_TITLE,
  mobileIconBadgeClass,
  PAGE_HEADER,
  PAGE_TITLE,
  PAGE_TITLE_H2,
  PAGE_VIEW,
  TABLE,
  TABLE_CONTAINER,
  TITLE_CELL,
  MOBILE_CARDS,
} from './transaction-list/listStyles';
import {
  ACTION_BTN_DELETE,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  btnClass,
  cx,
  EMPTY_STATE,
  filterBarClass,
  FORM_GROUP,
  FORM_ROW_2COL,
  HEADER_ACTIONS,
  MOBILE_ACTION_DELETE,
  MOBILE_ACTION_EDIT,
  PAGE_HEADER_BTN,
  SEARCH_ICON,
  SEARCH_INPUT,
  SEARCH_WRAPPER,
  SPINNER_SECTION,
  statValueClass,
  SUMMARY_GRID,
  SUMMARY_STAT_CARD,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_TITLE,
  TXN_AMOUNT,
  TXN_DATE,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_FOOTER,
  MODAL_HEADER,
  MODAL_PANEL,
} from './ui';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Month & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  const [filterType, setFilterType] = useState<string>(''); // '' | 'PAYABLE' | 'RECEIVABLE'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState<boolean>(false);
  const createDialogRef = useModal(isCreateModalOpen, () => setIsCreateModalOpen(false));
  const repayDialogRef = useModal(isRepayModalOpen, () => setIsRepayModalOpen(false));
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Create / Edit Form State
  const [formType, setFormType] = useState<DebtType>('PAYABLE');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<Date | null>(moment().toDate());
  const [formDueDate, setFormDueDate] = useState<Date | null>(null);
  const [formNotes, setFormNotes] = useState<string>('');

  // Repay Form State
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');

  const fetchDebtData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const debtList = await debtService.getDebts(
        filterType ? (filterType as DebtType) : undefined
      );
      setDebts(Array.isArray(debtList) ? debtList : (debtList as { data?: Debt[] })?.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu khoản vay/nợ');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchDebtData();
  }, [fetchDebtData]);

  // Repayments from the AI assistant or another device arrive via realtime
  useDataEvents(['debts-changed'], fetchDebtData);

  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    setter(formatNumberInput(val));
  };

  const openCreateModal = (defaultType: DebtType = 'PAYABLE') => {
    setFormType(defaultType);
    setFormTitle('');
    setFormAmount('');
    setFormStartDate(moment().toDate());
    setFormDueDate(null);
    setFormNotes('');
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

    try {
      await debtService.createDebt({
        type: formType,
        title: formTitle,
        totalAmount: parsedAmount,
        // Keep the local calendar day (UTC+7) instead of shifting to the previous UTC day
        startDate: formStartDate ? moment(formStartDate).startOf('day').format() : undefined,
        dueDate: formDueDate ? moment(formDueDate).startOf('day').format() : undefined,
        notes: formNotes,
      });

      toast.success('Đã tạo khoản vay/nợ thành công!');
      window.dispatchEvent(new Event('debts-changed'));
      setIsCreateModalOpen(false);
      fetchDebtData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi tạo khoản vay/nợ');
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const parsedAmount = parseNumberInput(repayAmount);

    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await debtService.addRepayment(selectedDebt.id, {
        amount: parsedAmount,
        notes: repayNotes,
      });

      toast.success('Đã ghi nhận thanh toán thành công!');
      window.dispatchEvent(new Event('debts-changed'));
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

  const filteredDebts = (Array.isArray(debts) ? debts : []).filter((d) => {
    if (!d) return false;
    const debtTitle = d.title || '';
    const matchSearch =
      debtTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const debtDate = d.startDate || d.createdAt;
    if (!debtDate) return matchSearch;
    const m = moment(debtDate);
    const matchMonth = m.isBetween(startOfMonth, endOfMonth, undefined, '[]');

    return matchSearch && matchMonth;
  });

  const displayPayable = filteredDebts
    .filter((d) => d.type === 'PAYABLE')
    .reduce((sum, d) => sum + (d.remaining ?? d.totalAmount ?? 0), 0);

  const displayReceivable = filteredDebts
    .filter((d) => d.type === 'RECEIVABLE')
    .reduce((sum, d) => sum + (d.remaining ?? d.totalAmount ?? 0), 0);

  return (
    <div className={PAGE_VIEW}>
      <header className={`${PAGE_HEADER} animate-fade-in`}>
        <div className={PAGE_TITLE}>
          <h2 className={PAGE_TITLE_H2}>Vay & Nợ</h2>
        </div>
        <div className={HEADER_ACTIONS}>
          <button className={PAGE_HEADER_BTN} onClick={() => openCreateModal('PAYABLE')}>
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        </div>
      </header>

      {error && (
        <div className="animate-fade-in">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Tôi nợ</span>
          </div>
          <div className={statValueClass('expense')}>
            {formatCurrency(Math.abs(displayPayable))}
          </div>
        </div>

        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Người khác nợ tôi</span>
          </div>
          <div className={statValueClass('income')}>
            {formatCurrency(Math.abs(displayReceivable))}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - 100% Matching Transactions.tsx */}
      <div className={cx(filterBarClass(), 'animate-fade-in')}>
        <div className={SEARCH_WRAPPER}>
          <Search size={16} className={SEARCH_ICON} />
          <input
            className={SEARCH_INPUT}
            type="text"
            aria-label="Tìm khoản nợ theo tiêu đề hoặc ghi chú"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-select-wrapper w-full min-w-[180px] flex-1">
          <Select
            options={[
              { value: '', label: 'Tất cả loại nợ' },
              { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
              { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
            ]}
            value={
              [
                { value: '', label: 'Tất cả loại nợ' },
                { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
              ].find((opt) => opt.value === filterType) || null
            }
            onChange={(option) => setFilterType(option ? option.value : '')}
            classNamePrefix="react-select"
            placeholder="Loại nợ"
            menuPortalTarget={document.body}
          />
        </div>

        <div>
          <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {loading ? (
        <div className={`${LOADING_SPINNER} animate-fade-in`}>
          <div className={SPINNER_SECTION}></div>
          <p>Đang tải danh sách khoản vay...</p>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div
          className={cx(EMPTY_STATE, 'animate-fade-in')}
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
            <Handshake size={44} className="empty-icon" />
          </div>
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main)',
            }}
          >
            Không tìm thấy khoản vay/nợ nào phù hợp!
          </h4>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              maxWidth: '400px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            Tạo khoản nợ mới hoặc điều chỉnh bộ lọc để theo dõi các khoản nợ cần trả và cần thu.
          </p>
          <button
            onClick={() => openCreateModal('PAYABLE')}
            className={BTN_PRIMARY}
            style={{ padding: '0.65rem 1.5rem', minHeight: '42px', fontWeight: 600 }}
          >
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        </div>
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
                  <th>Loại</th>
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
                      <td>
                        <span className={CATEGORY_BADGE}>
                          {debt.type === 'PAYABLE' ? 'Tôi nợ' : 'Phải thu'}
                        </span>
                      </td>
                      <td className={TXN_AMOUNT}>{formatCurrency(debt.totalAmount)}</td>
                      <td className="cell-paid">{formatCurrency(debt.paidAmount)}</td>
                      <td
                        className="cell-remaining"
                        style={{
                          fontWeight: 700,
                          color: debt.type === 'PAYABLE' ? 'var(--expense)' : 'var(--income)',
                        }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </td>
                      <td className={TXN_DATE}>
                        {debt.startDate ? moment(debt.startDate).format('DD/MM/YYYY') : '—'}
                      </td>
                      <td className={TXN_DATE}>
                        {debt.dueDate ? moment(debt.dueDate).format('DD/MM/YYYY') : '—'}
                      </td>
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
                                setSelectedDebt(debt);
                                setRepayAmount('');
                                setIsRepayModalOpen(true);
                              }}
                              className={cx(
                                btnClass('secondary', 'px-[0.85rem] py-[0.45rem] text-[0.85rem]'),
                                'min-h-9'
                              )}
                              title="Ghi nhận trả/thu tiền"
                            >
                              <ArrowRightLeft size={14} /> Trả tiền
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(debt.id)}
                            className={ACTION_BTN_DELETE}
                            aria-label="Xóa khoản vay"
                            title="Xóa"
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

          {/* Mobile Card View (<768px) */}
          <div className={`${MOBILE_CARDS} animate-fade-in`}>
            {filteredDebts.map((debt) => {
              const isPayable = debt.type === 'PAYABLE';
              const percent = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));

              return (
                <div key={`m-debt-${debt.id}`} className={MOBILE_CARD}>
                  <div className="mobile-card-top">
                    <div className={MOBILE_CARD_LEFT}>
                      <div className={mobileIconBadgeClass(isPayable ? 'expense' : 'income')}>
                        <Handshake size={18} />
                      </div>
                      <div className="mobile-card-info">
                        <div className={MOBILE_CARD_TITLE}>{debt.title}</div>
                        {debt.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {debt.notes}
                          </div>
                        )}
                        <div className={MOBILE_CARD_DATE}>
                          <span>
                            {debt.startDate ? moment(debt.startDate).format('DD/MM/YYYY') : '—'}
                            {debt.dueDate
                              ? ` → Hạn: ${moment(debt.dueDate).format('DD/MM/YYYY')}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-amount-group">
                      <div
                        className={`${MOBILE_CARD_AMOUNT} text-main`}
                        style={{ color: isPayable ? 'var(--expense)' : 'var(--income)' }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Tổng: {formatCurrency(debt.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className={MOBILE_CARD_TAGS}>
                    <span className={CATEGORY_BADGE}>{isPayable ? 'Tôi nợ' : 'Phải thu'}</span>
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
                          setSelectedDebt(debt);
                          setRepayAmount('');
                          setIsRepayModalOpen(true);
                        }}
                        className={MOBILE_ACTION_EDIT}
                        title="Ghi nhận trả/thu tiền"
                      >
                        <ArrowRightLeft size={14} /> Trả tiền
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(debt.id)}
                      className={MOBILE_ACTION_DELETE}
                      title="Xóa khoản nợ"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
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
              aria-label="Tạo khoản nợ mới"
              tabIndex={-1}
              className={MODAL_PANEL}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_HEADER}>
                <h3>Tạo khoản nợ mới</h3>
                <button
                  className={MODAL_CLOSE_BTN}
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className={FORM_GROUP}>
                  <label htmlFor="debt-title">Khoản nợ / Đối tác</label>
                  <input
                    id="debt-title"
                    type="text"
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
                      classNamePrefix="react-select"
                      menuPortalTarget={document.body}
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-amount">Số tiền gốc (đ)</label>
                    <input
                      id="debt-amount"
                      type="text"
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
                      value={formStartDate ? moment(formStartDate).format('YYYY-MM-DD') : ''}
                      onChange={(value) => {
                        const date = moment(value, 'YYYY-MM-DD', true);
                        setFormStartDate(date.isValid() ? date.toDate() : null);
                      }}
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="debt-duedate">Hạn thanh toán</label>
                    <DatePickerField
                      id="debt-duedate"
                      label="Hạn thanh toán"
                      value={formDueDate ? moment(formDueDate).format('YYYY-MM-DD') : ''}
                      onChange={(value) => {
                        const date = moment(value, 'YYYY-MM-DD', true);
                        setFormDueDate(date.isValid() ? date.toDate() : null);
                      }}
                    />
                  </div>
                </div>

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
                    Tạo khoản nợ
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
                  <X size={18} />
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
                  <label htmlFor="repay-amount">Số tiền trả đợt này (đ)</label>
                  <input
                    id="repay-amount"
                    type="text"
                    placeholder={`Ví dụ: ${formatCurrency(selectedDebt.remaining)}`}
                    value={repayAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setRepayAmount)}
                    required
                  />
                </div>

                <div className={FORM_GROUP}>
                  <label htmlFor="repay-notes">Ghi chú</label>
                  <input
                    id="repay-notes"
                    type="text"
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
