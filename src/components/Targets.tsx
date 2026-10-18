import React, { useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { Plus, Pencil, X, AlertTriangle, Target as TargetIcon } from 'lucide-react';
import { targetService } from '../services';
import { TransactionType } from '../commons/constants';
import type { TargetSummaryResponse, TargetType } from '../commons/types';
import {
  formatCurrency,
  formatNumberInput,
  parseNumberInput,
  getErrorMessage,
} from '../commons/utils';
import { toast } from 'react-toastify';
import { useModal } from '../hooks';
import { DatePickerField, MonthFilter } from './common';
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
  TABLE,
  TABLE_CONTAINER,
  TITLE_CELL,
  MOBILE_CARDS,
} from './transaction-list/listStyles';
import {
  ACTION_BTN_EDIT,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  cx,
  EMPTY_STATE,
  filterBarClass,
  FORM_GROUP,
  MOBILE_ACTION_EDIT,
  SPINNER_SECTION,
  statValueClass,
  SUMMARY_GRID,
  SUMMARY_STAT_CARD,
  SUMMARY_STAT_HEADER,
  SUMMARY_STAT_SUBTITLE,
  SUMMARY_STAT_TITLE,
  TXN_AMOUNT,
  TXN_DATE,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_FORM_BODY,
  MODAL_FORM_SHELL_PANEL,
  MODAL_SHELL_FOOTER,
  MODAL_SHELL_HEADER,
} from './ui';

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: TransactionType.EXPENSE, label: 'Hạn mức Chi tiêu' },
  { value: TransactionType.INVESTMENT, label: 'Mục tiêu Đầu tư' },
];

export default function Targets() {
  // Month in 'YYYY-MM' format
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
  const [targetSummary, setTargetSummary] = useState<TargetSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter by target type ('' = all)
  const [filterType, setFilterType] = useState<TargetType | ''>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const targetDialogRef = useModal(isModalOpen, () => setIsModalOpen(false));
  const [targetTypeForm, setTargetTypeForm] = useState<TargetType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');

  const fetchTargetData = async (month: string) => {
    try {
      setLoading(true);
      setError(null);
      const m = moment(month, 'YYYY-MM');
      const targetParams = { month: m.month() + 1, year: m.year() };
      const data = await targetService.getSummary(targetParams);
      setTargetSummary(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải dữ liệu mục tiêu tài chính'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargetData(selectedMonth);
  }, [selectedMonth]);

  const handleAmountChange = (val: string) => {
    setAmount(formatNumberInput(val));
  };

  const openAddModal = useCallback(
    (defaultType: TargetType = TransactionType.EXPENSE) => {
      setTargetTypeForm(defaultType);

      const existingAmount =
        defaultType === TransactionType.EXPENSE
          ? targetSummary?.expense?.targetAmount
          : targetSummary?.investment?.targetAmount;

      setAmount(existingAmount ? formatNumberInput(existingAmount) : '');
      setIsModalOpen(true);
    },
    [targetSummary]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseNumberInput(amount);
    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền mục tiêu hợp lệ');
      return;
    }

    try {
      const m = moment(selectedMonth, 'YYYY-MM');
      await targetService.upsertTarget({
        targetType: targetTypeForm,
        targetAmount: parsedAmount,
        month: m.month() + 1,
        year: m.year(),
      });

      toast.success(
        `Đã thiết lập ${targetTypeForm === TransactionType.EXPENSE ? 'hạn mức chi tiêu' : 'mục tiêu đầu tư'} thành công!`
      );
      setIsModalOpen(false);
      fetchTargetData(selectedMonth);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi khi lưu mục tiêu tài chính'));
    }
  };

  // Prepare table rows from targetSummary
  const targetRows: {
    id: TargetType;
    type: TargetType;
    title: string;
    targetAmount: number;
    currentAmount: number;
    remainingAmount: number;
    status: 'OVER_BUDGET' | 'COMPLETED' | 'NORMAL' | 'NOT_SET';
  }[] = [];
  if (targetSummary?.expense) {
    targetRows.push({
      id: TransactionType.EXPENSE,
      type: TransactionType.EXPENSE,
      title: 'Hạn mức Chi tiêu Tháng',
      targetAmount: targetSummary.expense.targetAmount,
      currentAmount: targetSummary.expense.spentAmount,
      remainingAmount: targetSummary.expense.remainingAmount,
      status: targetSummary.expense.isOverBudget ? 'OVER_BUDGET' : 'NORMAL',
    });
  } else {
    targetRows.push({
      id: TransactionType.EXPENSE,
      type: TransactionType.EXPENSE,
      title: 'Hạn mức Chi tiêu Tháng',
      targetAmount: 0,
      currentAmount: 0,
      remainingAmount: 0,
      status: 'NOT_SET',
    });
  }

  if (targetSummary?.investment) {
    targetRows.push({
      id: TransactionType.INVESTMENT,
      type: TransactionType.INVESTMENT,
      title: 'Mục tiêu Đầu tư Tháng',
      targetAmount: targetSummary.investment.targetAmount,
      currentAmount: targetSummary.investment.investedAmount,
      remainingAmount: targetSummary.investment.remainingAmount,
      status: targetSummary.investment.isTargetReached ? 'COMPLETED' : 'NORMAL',
    });
  } else {
    targetRows.push({
      id: TransactionType.INVESTMENT,
      type: TransactionType.INVESTMENT,
      title: 'Mục tiêu Đầu tư Tháng',
      targetAmount: 0,
      currentAmount: 0,
      remainingAmount: 0,
      status: 'NOT_SET',
    });
  }

  const openAddModalRef = useRef(openAddModal);
  useEffect(() => {
    openAddModalRef.current = openAddModal;
  }, [openAddModal]);
  useEffect(() => {
    const handleOpenModal = () => openAddModalRef.current(TransactionType.EXPENSE);
    window.addEventListener('open-add-target-modal', handleOpenModal);
    return () => {
      window.removeEventListener('open-add-target-modal', handleOpenModal);
    };
  }, []);

  const filteredRows = targetRows.filter((row) => {
    if (!filterType) return true;
    return row.type === filterType;
  });

  return (
    <div className="targets-subview mx-auto w-full max-w-full p-0">
      {error && (
        <div className="animate-fade-in">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Hạn mức chi</span>
          </div>
          <div className={statValueClass('expense')}>
            {targetSummary?.expense
              ? formatCurrency(targetSummary.expense.targetAmount)
              : 'Chưa đặt'}
          </div>
          <div className={SUMMARY_STAT_SUBTITLE}>
            {targetSummary?.expense
              ? `Đã chi: ${formatCurrency(Math.abs(targetSummary.expense.spentAmount))} (Còn lại: ${formatCurrency(Math.abs(targetSummary.expense.remainingAmount))})`
              : 'Chưa có hạn mức'}
          </div>
        </div>

        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Mục tiêu đầu tư</span>
          </div>
          <div className={statValueClass()}>
            {targetSummary?.investment
              ? formatCurrency(targetSummary.investment.targetAmount)
              : 'Chưa đặt'}
          </div>
          <div className={SUMMARY_STAT_SUBTITLE}>
            {targetSummary?.investment
              ? `Đã đầu tư: ${formatCurrency(targetSummary.investment.investedAmount)}`
              : 'Chưa có mục tiêu'}
          </div>
        </div>

        <div className={SUMMARY_STAT_CARD}>
          <div className={SUMMARY_STAT_HEADER}>
            <span className={SUMMARY_STAT_TITLE}>Có thể chi / ngày</span>
          </div>
          <div
            className={statValueClass(targetSummary?.expense?.isOverBudget ? 'expense' : 'default')}
          >
            {targetSummary?.expense && targetSummary.expense.dailyAllowance > 0
              ? `${formatCurrency(Math.round(targetSummary.expense.dailyAllowance))}/ngày`
              : targetSummary?.expense?.isOverBudget
                ? `🚨 ${formatCurrency(Math.abs(targetSummary.expense.overspentAmount))} (Vượt)`
                : '—'}
          </div>
          <div className={SUMMARY_STAT_SUBTITLE}>
            {targetSummary?.daysRemaining
              ? `Còn ${targetSummary.daysRemaining} ngày`
              : 'Chưa có hạn mức'}
          </div>
        </div>
      </div>

      {/* Filter bar aligned with system design */}
      <div className={cx(filterBarClass(), 'animate-fade-in')}>
        <div className="category-select-wrapper w-full" style={{ minWidth: '220px' }}>
          <Select
            options={[{ value: '', label: 'Tất cả Mục tiêu' }, ...TARGET_TYPE_OPTIONS]}
            value={
              [{ value: '' as const, label: 'Tất cả Mục tiêu' }, ...TARGET_TYPE_OPTIONS].find(
                (opt) => opt.value === filterType
              ) || null
            }
            onChange={(option) => setFilterType(option ? option.value : '')}
            classNamePrefix="react-select"
            placeholder="Tất cả Mục tiêu"
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
          <p>Đang tải mục tiêu tài chính...</p>
        </div>
      ) : filteredRows.length === 0 ? (
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
            <TargetIcon size={44} className="empty-icon" />
          </div>
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main)',
            }}
          >
            Chưa có mục tiêu nào được thiết lập cho tháng này!
          </h4>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              maxWidth: '400px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            Đặt hạn mức chi tiêu hoặc mục tiêu tích lũy để quản lý ngân sách tháng hiệu quả.
          </p>
          <button
            onClick={() => openAddModal(TransactionType.EXPENSE)}
            className={BTN_PRIMARY}
            style={{ padding: '0.65rem 1.5rem', minHeight: '42px', fontWeight: 600 }}
          >
            <Plus size={16} /> Thêm mục tiêu
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className={`${TABLE_CONTAINER} animate-fade-in`}>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th>Loại mục tiêu</th>
                  <th>Số tiền mục tiêu</th>
                  <th>Thực tế hiện tại</th>
                  <th>Trạng thái / Tiến độ</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const percent =
                    row.targetAmount > 0
                      ? Math.min(100, Math.round((row.currentAmount / row.targetAmount) * 100))
                      : 0;

                  return (
                    <tr key={row.id}>
                      <td className={TITLE_CELL}>
                        <span>{row.title}</span>
                      </td>
                      <td className={TXN_AMOUNT}>
                        {row.targetAmount > 0 ? formatCurrency(row.targetAmount) : 'Chưa đặt'}
                      </td>
                      <td className={TXN_DATE}>{formatCurrency(row.currentAmount)}</td>
                      <td>
                        {row.targetAmount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span
                              className={CATEGORY_BADGE}
                              style={{
                                alignSelf: 'flex-start',
                                background:
                                  row.status === 'OVER_BUDGET'
                                    ? 'rgba(244, 63, 94, 0.15)'
                                    : row.status === 'COMPLETED'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'var(--primary-glow)',
                                color:
                                  row.status === 'OVER_BUDGET'
                                    ? '#f43f5e'
                                    : row.status === 'COMPLETED'
                                      ? '#10b981'
                                      : 'var(--primary)',
                                border:
                                  row.status === 'OVER_BUDGET'
                                    ? '1px solid rgba(244, 63, 94, 0.3)'
                                    : row.status === 'COMPLETED'
                                      ? '1px solid rgba(16, 185, 129, 0.3)'
                                      : '1px solid rgba(99, 102, 241, 0.3)',
                              }}
                            >
                              {row.status === 'OVER_BUDGET'
                                ? '🚨 Vượt hạn mức'
                                : row.status === 'COMPLETED'
                                  ? '🎉 Đã hoàn thành'
                                  : `${percent}% hoàn thành`}
                            </span>
                          </div>
                        ) : (
                          <span className={CATEGORY_BADGE} style={{ color: 'var(--text-muted)' }}>
                            Chưa thiết lập
                          </span>
                        )}
                      </td>
                      <td className={ACTIONS_CELL}>
                        <button
                          onClick={() => openAddModal(row.type)}
                          className={ACTION_BTN_EDIT}
                          aria-label={`Chỉnh sửa ${row.title}`}
                          title={`Chỉnh sửa ${row.title}`}
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className={`${MOBILE_CARDS} animate-fade-in`}>
            {filteredRows.map((row) => {
              const percent =
                row.targetAmount > 0
                  ? Math.min(100, Math.round((row.currentAmount / row.targetAmount) * 100))
                  : 0;
              const isExpense = row.type === TransactionType.EXPENSE;

              return (
                <div key={`m-target-${row.id}`} className={MOBILE_CARD}>
                  <div className="mobile-card-top">
                    <div className={MOBILE_CARD_LEFT}>
                      <div className={mobileIconBadgeClass(isExpense ? 'expense' : 'investment')}>
                        <TargetIcon size={18} />
                      </div>
                      <div className="mobile-card-info">
                        <div className={MOBILE_CARD_TITLE}>{row.title}</div>
                        <div className={MOBILE_CARD_DATE}>
                          <span>
                            Thực tế: <strong>{formatCurrency(row.currentAmount)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-amount-group">
                      <div
                        className={`${MOBILE_CARD_AMOUNT} text-main`}
                        style={{ color: 'var(--text-main)' }}
                      >
                        {row.targetAmount > 0 ? formatCurrency(row.targetAmount) : 'Chưa đặt'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {row.targetAmount > 0 ? `Tiến độ: ${percent}%` : 'Hạn mức mục tiêu'}
                      </div>
                    </div>
                  </div>

                  <div className={MOBILE_CARD_TAGS}>
                    <span
                      className={CATEGORY_BADGE}
                      style={{
                        background:
                          row.status === 'OVER_BUDGET'
                            ? 'rgba(244, 63, 94, 0.15)'
                            : row.status === 'COMPLETED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'var(--primary-glow)',
                        color:
                          row.status === 'OVER_BUDGET'
                            ? '#f43f5e'
                            : row.status === 'COMPLETED'
                              ? '#10b981'
                              : 'var(--primary)',
                        border:
                          row.status === 'OVER_BUDGET'
                            ? '1px solid rgba(244, 63, 94, 0.3)'
                            : row.status === 'COMPLETED'
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      {row.targetAmount === 0
                        ? 'Chưa thiết lập'
                        : row.status === 'OVER_BUDGET'
                          ? '🚨 Vượt hạn mức'
                          : row.status === 'COMPLETED'
                            ? '🎉 Đã hoàn thành'
                            : `${percent}% hoàn thành`}
                    </span>
                  </div>

                  <div className={MOBILE_CARD_ACTIONS}>
                    <button
                      type="button"
                      onClick={() => openAddModal(row.type)}
                      className={MOBILE_ACTION_EDIT}
                      title="Thiết lập / Chỉnh sửa mục tiêu"
                    >
                      <Pencil size={14} /> {row.targetAmount > 0 ? 'Chỉnh sửa' : 'Thiết lập'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Form Modal overlay (100% cloned from Transactions modal) */}
      {isModalOpen &&
        // Portal: the tab container is animated (transform), which would trap position: fixed
        createPortal(
          <div className={MODAL_BACKDROP} onClick={() => setIsModalOpen(false)}>
            <div
              ref={targetDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="target-modal-title"
              tabIndex={-1}
              className={MODAL_FORM_SHELL_PANEL}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={MODAL_SHELL_HEADER}>
                <h3 id="target-modal-title">Thêm mục tiêu</h3>
                <button
                  type="button"
                  className={MODAL_CLOSE_BTN}
                  onClick={() => setIsModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className={MODAL_FORM_BODY}>
                  <div className={FORM_GROUP}>
                    <label htmlFor="target-type-select">Loại mục tiêu</label>
                    <Select
                      id="target-type-select"
                      options={TARGET_TYPE_OPTIONS}
                      value={
                        TARGET_TYPE_OPTIONS.find((opt) => opt.value === targetTypeForm) || null
                      }
                      onChange={(option) => {
                        if (option) {
                          const newType = option.value;
                          setTargetTypeForm(newType);
                          const existing =
                            newType === TransactionType.EXPENSE
                              ? targetSummary?.expense?.targetAmount
                              : targetSummary?.investment?.targetAmount;
                          setAmount(existing ? existing.toLocaleString('vi-VN') : '');
                        }
                      }}
                      classNamePrefix="react-select"
                      menuPortalTarget={document.body}
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="target-amount-input">Số tiền (đ)</label>
                    <input
                      id="target-amount-input"
                      type="text"
                      placeholder="Ví dụ: 10.000.000"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      required
                    />
                  </div>

                  <div className={FORM_GROUP}>
                    <label htmlFor="target-month">Tháng áp dụng</label>
                    <div className="target-datepicker-wrapper">
                      <DatePickerField
                        id="target-month"
                        label="Tháng áp dụng"
                        mode="month"
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className={MODAL_SHELL_FOOTER}>
                  <button
                    type="button"
                    className={cx(BTN_SECONDARY, BTN_FILL)}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
                    Lưu mục tiêu
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
