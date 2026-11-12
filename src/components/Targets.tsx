import moment from 'moment';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import Select from 'react-select';
import { toast } from 'react-toastify';
import { APP_EVENTS, DATA_EVENTS, DATE_FORMAT_MONTH, TransactionType } from '../commons/constants';
import type { TargetSummaryResponse, TargetType } from '../commons/types';
import {
  formatCurrency,
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  parseNumberInput,
} from '../commons/utils';
import { useDataEvents } from '../hooks';
import { targetService } from '../services';
import { DatePickerField, FormModal, ListSkeleton, MonthFilter, StatCard } from './common';
import {
  ACTION_BTN_EDIT,
  ACTIONS_CELL,
  ALERT_ERROR,
  AlertTriangle,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CATEGORY_BADGE,
  cx,
  filterBarClass,
  FORM_GROUP,
  MOBILE_ACTION_EDIT,
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
  MODAL_FORM_BODY,
  MODAL_SHELL_FOOTER,
  Pencil,
  SUMMARY_GRID,
  TABLE,
  TABLE_CONTAINER,
  Target as TargetIcon,
  TITLE_CELL,
  TXN_AMOUNT,
  toneBadgeClass,
  type BadgeTone,
} from './ui';

const TARGET_TYPE_OPTIONS: { value: TargetType; label: string }[] = [
  { value: TransactionType.EXPENSE, label: 'Hạn mức Chi tiêu' },
  { value: TransactionType.INVESTMENT, label: 'Mục tiêu Đầu tư' },
];

type TargetStatus = 'OVER_BUDGET' | 'COMPLETED' | 'NORMAL' | 'NOT_SET';

interface TargetProgress {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  status: TargetStatus;
}

interface TargetRow extends TargetProgress {
  id: TargetType;
  type: TargetType;
  title: string;
}

const TARGET_ROW_TITLE: Record<TargetType, string> = {
  [TransactionType.EXPENSE]: 'Hạn mức Chi tiêu Tháng',
  [TransactionType.INVESTMENT]: 'Mục tiêu Đầu tư Tháng',
};

const NOT_SET: TargetProgress = {
  targetAmount: 0,
  currentAmount: 0,
  remainingAmount: 0,
  status: 'NOT_SET',
};

const toTargetRow = (type: TargetType, progress?: TargetProgress): TargetRow => ({
  id: type,
  type,
  title: TARGET_ROW_TITLE[type],
  ...(progress ?? NOT_SET),
});

const STATUS_TONE: Record<TargetStatus, BadgeTone> = {
  OVER_BUDGET: 'expense',
  COMPLETED: 'income',
  NORMAL: 'primary',
  NOT_SET: 'primary',
};

/** Status badge text of a row; `percent` is its progress. */
const statusBadgeText = (row: TargetRow, percent: number) =>
  row.targetAmount === 0
    ? 'Chưa thiết lập'
    : row.status === 'OVER_BUDGET'
      ? '🚨 Vượt hạn mức'
      : row.status === 'COMPLETED'
        ? '🎉 Đã hoàn thành'
        : `${percent}% hoàn thành`;

export default function Targets() {
  // Month in 'YYYY-MM' format
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    moment().format(DATE_FORMAT_MONTH)
  );
  const [targetSummary, setTargetSummary] = useState<TargetSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter by target type ('' = all)
  const [filterType, setFilterType] = useState<TargetType | ''>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetTypeForm, setTargetTypeForm] = useState<TargetType>(TransactionType.EXPENSE);
  const [amount, setAmount] = useState<string>('');

  /** `quiet`: refresh in place (after a save), without the loading skeleton. */
  const fetchTargetData = async (month: string, quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const m = moment(month, DATE_FORMAT_MONTH);
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

  // Saved here or confirmed in the AI chat; the Dashboard listens for the same event.
  useDataEvents([DATA_EVENTS.TARGETS_CHANGED], () => fetchTargetData(selectedMonth, true));

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
      const m = moment(selectedMonth, DATE_FORMAT_MONTH);
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
      window.dispatchEvent(new Event(DATA_EVENTS.TARGETS_CHANGED));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Lỗi khi lưu mục tiêu tài chính'));
    }
  };

  // One row per target type; a type without a target this month is NOT_SET.
  const expense = targetSummary?.expense;
  const investment = targetSummary?.investment;
  const targetRows: TargetRow[] = [
    toTargetRow(
      TransactionType.EXPENSE,
      expense && {
        targetAmount: expense.targetAmount,
        currentAmount: expense.spentAmount,
        remainingAmount: expense.remainingAmount,
        status: expense.isOverBudget ? 'OVER_BUDGET' : 'NORMAL',
      }
    ),
    toTargetRow(
      TransactionType.INVESTMENT,
      investment && {
        targetAmount: investment.targetAmount,
        currentAmount: investment.investedAmount,
        remainingAmount: investment.remainingAmount,
        status: investment.isTargetReached ? 'COMPLETED' : 'NORMAL',
      }
    ),
  ];

  // The form edits the month's existing target of the picked type when there is one.
  const isEditingTarget = Boolean(
    targetTypeForm === TransactionType.EXPENSE
      ? targetSummary?.expense?.targetAmount
      : targetSummary?.investment?.targetAmount
  );

  const openAddModalRef = useRef(openAddModal);
  useEffect(() => {
    openAddModalRef.current = openAddModal;
  }, [openAddModal]);
  useEffect(() => {
    const handleOpenModal = () => openAddModalRef.current(TransactionType.EXPENSE);
    window.addEventListener(APP_EVENTS.OPEN_ADD_TARGET_MODAL, handleOpenModal);
    return () => {
      window.removeEventListener(APP_EVENTS.OPEN_ADD_TARGET_MODAL, handleOpenModal);
    };
  }, []);

  const filteredRows = targetRows.filter((row) => {
    if (!filterType) return true;
    return row.type === filterType;
  });

  return (
    <div className="targets-subview w-full">
      {error && (
        <div className={cx(ALERT_ERROR, 'animate-fade-in')} role="alert">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className={cx(SUMMARY_GRID, 'animate-fade-in')}>
        <StatCard
          title="Hạn mức chi"
          tone="expense"
          value={
            targetSummary?.expense ? formatCurrency(targetSummary.expense.targetAmount) : 'Chưa đặt'
          }
          subtitle={
            targetSummary?.expense
              ? `Đã chi: ${formatCurrency(Math.abs(targetSummary.expense.spentAmount))} (Còn lại: ${formatCurrency(Math.abs(targetSummary.expense.remainingAmount))})`
              : 'Chưa có hạn mức'
          }
        />

        <StatCard
          title="Mục tiêu đầu tư"
          value={
            targetSummary?.investment
              ? formatCurrency(targetSummary.investment.targetAmount)
              : 'Chưa đặt'
          }
          subtitle={
            targetSummary?.investment
              ? `Đã đầu tư: ${formatCurrency(targetSummary.investment.investedAmount)}`
              : 'Chưa có mục tiêu'
          }
        />

        <StatCard
          title="Có thể chi / ngày"
          tone={targetSummary?.expense?.isOverBudget ? 'expense' : 'default'}
          value={
            targetSummary?.expense && targetSummary.expense.dailyAllowance > 0
              ? formatCurrency(Math.round(targetSummary.expense.dailyAllowance))
              : targetSummary?.expense?.isOverBudget
                ? `🚨 ${formatCurrency(Math.abs(targetSummary.expense.overspentAmount))} (Vượt)`
                : '—'
          }
          subtitle={
            targetSummary?.daysRemaining
              ? `Còn ${targetSummary.daysRemaining} ngày`
              : 'Chưa có hạn mức'
          }
        />
      </div>

      {/* Filter bar aligned with system design */}
      <div className={cx(filterBarClass(), 'animate-fade-in')}>
        <div className="category-select-wrapper w-full">
          <Select
            options={[{ value: '', label: 'Tất cả Mục tiêu' }, ...TARGET_TYPE_OPTIONS]}
            value={
              [{ value: '' as const, label: 'Tất cả Mục tiêu' }, ...TARGET_TYPE_OPTIONS].find(
                (opt) => opt.value === filterType
              ) || null
            }
            onChange={(option) => setFilterType(option ? option.value : '')}
            classNamePrefix="react-select"
            isSearchable={!isTouchDevice()}
            placeholder="Tất cả Mục tiêu"
            menuPortalTarget={document.body}
          />
        </div>
        <div>
          <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={2} label="Đang tải mục tiêu tài chính" />
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
                      <td className={TXN_AMOUNT}>{formatCurrency(row.currentAmount)}</td>
                      <td>
                        {row.targetAmount > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span
                              className={cx(toneBadgeClass(STATUS_TONE[row.status]), 'self-start')}
                            >
                              {statusBadgeText(row, percent)}
                            </span>
                          </div>
                        ) : (
                          <span className={cx(CATEGORY_BADGE, 'text-muted!')}>Chưa thiết lập</span>
                        )}
                      </td>
                      <td className={ACTIONS_CELL}>
                        <button
                          onClick={() => openAddModal(row.type)}
                          className={ACTION_BTN_EDIT}
                          aria-label={`Chỉnh sửa ${row.title}`}
                          title={`Chỉnh sửa ${row.title}`}
                        >
                          <Pencil size={16} />
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
                  <div className={MOBILE_CARD_TOP}>
                    <div className={MOBILE_CARD_LEFT}>
                      <div className={mobileIconBadgeClass(isExpense ? 'expense' : 'investment')}>
                        <TargetIcon size={16} />
                      </div>
                      <div className={MOBILE_CARD_INFO}>
                        <div className={MOBILE_CARD_TITLE}>{row.title}</div>
                        <div className={MOBILE_CARD_DATE}>
                          <span>
                            Thực tế: <strong>{formatCurrency(row.currentAmount)}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={MOBILE_CARD_AMOUNT_GROUP}>
                      <div className={`${MOBILE_CARD_AMOUNT} text-main`}>
                        {row.targetAmount > 0 ? formatCurrency(row.targetAmount) : 'Chưa đặt'}
                      </div>
                      <div className={MOBILE_CARD_SUB_AMOUNT}>
                        {row.targetAmount > 0 ? `Tiến độ: ${percent}%` : 'Hạn mức mục tiêu'}
                      </div>
                    </div>
                  </div>

                  <div className={MOBILE_CARD_FOOTER}>
                    <div className={MOBILE_CARD_TAGS}>
                      <span className={toneBadgeClass(STATUS_TONE[row.status])}>
                        {statusBadgeText(row, percent)}
                      </span>
                    </div>

                    <div className={MOBILE_CARD_ACTIONS}>
                      <button
                        type="button"
                        onClick={() => openAddModal(row.type)}
                        className={MOBILE_ACTION_EDIT}
                        title="Thiết lập / Chỉnh sửa mục tiêu"
                      >
                        <Pencil size={16} /> {row.targetAmount > 0 ? 'Chỉnh sửa' : 'Thiết lập'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Form modal: same shell as the transaction modal */}
      <FormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditingTarget ? 'Sửa mục tiêu' : 'Thêm mục tiêu'}
        titleId="target-modal-title"
      >
        <form onSubmit={handleSubmit}>
          <div className={MODAL_FORM_BODY}>
            <div className={FORM_GROUP}>
              <label htmlFor="target-type-select">Loại mục tiêu</label>
              <Select
                id="target-type-select"
                options={TARGET_TYPE_OPTIONS}
                value={TARGET_TYPE_OPTIONS.find((opt) => opt.value === targetTypeForm) || null}
                onChange={(option) => {
                  if (option) {
                    const newType = option.value;
                    setTargetTypeForm(newType);
                    const existing =
                      newType === TransactionType.EXPENSE
                        ? targetSummary?.expense?.targetAmount
                        : targetSummary?.investment?.targetAmount;
                    setAmount(existing ? formatNumberInput(existing) : '');
                  }
                }}
                classNamePrefix="react-select"
                isSearchable={!isTouchDevice()}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>

            <div className={FORM_GROUP}>
              <label htmlFor="target-amount-input">Số tiền (đ)</label>
              <input
                id="target-amount-input"
                {...MONEY_INPUT_PROPS}
                placeholder="Ví dụ: 10.000.000"
                value={amount}
                onChange={(e) => setAmount(formatNumberInput(e.target.value))}
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
      </FormModal>
    </div>
  );
}
