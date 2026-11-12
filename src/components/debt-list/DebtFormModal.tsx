import moment from 'moment';
import { useState, type FormEvent } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATA_EVENTS, DATE_FORMAT_INPUT } from '../../commons/constants';
import type { Debt, DebtType, Wallet } from '../../commons/types';
import {
  formatCurrency,
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  localDayOf,
  MONEY_INPUT_PROPS,
  parseNumberInput,
  TEXT_NEXT_INPUT_PROPS,
} from '../../commons/utils';
import { debtService } from '../../services';
import { DatePickerField, FormModal } from '../common';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  cx,
  FORM_GROUP,
  FORM_ROW_2COL,
  MODAL_FOOTER,
} from '../ui';
import { DEBT_TYPE_OPTIONS, walletOptions } from './constants';
import { startDayOf } from './debtCalendar';

export interface DebtFormModalProps {
  open: boolean;
  /** The debt being edited, or null to create one. */
  debt: Debt | null;
  /** Type preselected when creating (the active tab). */
  defaultType: DebtType;
  wallets: Wallet[];
  onClose: () => void;
}

/** Form values; dates are picked days, 'YYYY-MM-DD' or ''. */
interface DebtFormValues {
  type: DebtType;
  title: string;
  amount: string;
  startDate: string;
  dueDate: string;
  notes: string;
  walletId: string;
}

const initialValues = (debt: Debt | null, defaultType: DebtType): DebtFormValues =>
  debt
    ? {
        type: debt.type,
        title: debt.title,
        amount: formatNumberInput(String(Math.round(debt.totalAmount))),
        startDate: startDayOf(debt) ?? '',
        dueDate: localDayOf(debt.dueDate) ?? '',
        notes: debt.notes ?? '',
        // Keep the linked wallet even if it was deleted, so saving does not silently unlink it.
        walletId: debt.walletId ?? '',
      }
    : {
        type: defaultType,
        title: '',
        amount: '',
        startDate: moment().format(DATE_FORMAT_INPUT),
        dueDate: '',
        notes: '',
        walletId: '',
      };

/** Create / edit a debt. */
export function DebtFormModal({ open, debt, defaultType, wallets, onClose }: DebtFormModalProps) {
  const title = debt ? 'Sửa khoản nợ' : 'Tạo khoản nợ mới';
  return (
    <FormModal open={open} onClose={onClose} title={title} ariaLabel={title} variant="scroll">
      {/* Mounted only while open, so every opening starts from fresh values. */}
      <DebtForm debt={debt} defaultType={defaultType} wallets={wallets} onClose={onClose} />
    </FormModal>
  );
}

function DebtForm({ debt, defaultType, wallets, onClose }: Omit<DebtFormModalProps, 'open'>) {
  const [form, setForm] = useState<DebtFormValues>(() => initialValues(debt, defaultType));
  const set = <K extends keyof DebtFormValues>(key: K, value: DebtFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Wallet picker; a deleted wallet still linked to the edited debt stays listed.
  const editWalletOptions =
    debt?.walletId && !wallets.some((w) => w.id === debt.walletId)
      ? [...walletOptions(wallets), { value: debt.walletId, label: 'Ví đã xóa' }]
      : walletOptions(wallets);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseNumberInput(form.amount);

    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tên khoản nợ / đối tác');
      return;
    }
    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (debt && parsedAmount < Math.round(debt.paidAmount)) {
      toast.error(
        `Số tiền gốc không được nhỏ hơn số đã thanh toán (${formatCurrency(debt.paidAmount)})`
      );
      return;
    }
    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      toast.error('Hạn thanh toán phải từ ngày bắt đầu trở đi');
      return;
    }

    // Days go out as 'YYYY-MM-DD', like transaction dates.
    const startDate = form.startDate || undefined;
    const dueDate = form.dueDate || undefined;
    try {
      if (debt) {
        await debtService.updateDebt(debt.id, {
          title: form.title,
          totalAmount: parsedAmount,
          startDate,
          dueDate: dueDate ?? null,
          notes: form.notes,
          walletId: form.walletId || null,
        });
        toast.success('Đã cập nhật khoản vay/nợ');
      } else {
        await debtService.createDebt({
          type: form.type,
          title: form.title,
          totalAmount: parsedAmount,
          startDate,
          dueDate,
          notes: form.notes,
          walletId: form.walletId || undefined,
        });
        toast.success('Đã tạo khoản vay/nợ thành công!');
      }

      window.dispatchEvent(new Event(DATA_EVENTS.DEBTS_CHANGED));
      if (form.walletId || debt?.walletId) {
        window.dispatchEvent(new Event(DATA_EVENTS.WALLETS_CHANGED));
      }
      onClose();
    } catch (err: unknown) {
      const fallback = debt ? 'Lỗi khi cập nhật khoản vay/nợ' : 'Lỗi khi tạo khoản vay/nợ';
      toast.error(getErrorMessage(err, fallback));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={FORM_GROUP}>
        <label htmlFor="debt-title">Khoản nợ / Đối tác</label>
        <input
          id="debt-title"
          {...TEXT_NEXT_INPUT_PROPS}
          placeholder="Ví dụ: Vay mua xe TPBank, Anh Tuấn..."
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
        />
      </div>

      <div className={FORM_ROW_2COL}>
        <div className={FORM_GROUP}>
          <label htmlFor="debt-type-select">Loại nợ</label>
          <Select
            id="debt-type-select"
            options={DEBT_TYPE_OPTIONS}
            value={DEBT_TYPE_OPTIONS.find((opt) => opt.value === form.type) || null}
            onChange={(option) => {
              if (option) set('type', option.value);
            }}
            // The type sets the direction of every repayment, so it is fixed once created.
            isDisabled={!!debt}
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
            value={form.amount}
            onChange={(e) => set('amount', formatNumberInput(e.target.value))}
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
            value={form.startDate}
            onChange={(day) => set('startDate', day)}
          />
        </div>

        <div className={FORM_GROUP}>
          <label htmlFor="debt-duedate">Hạn thanh toán</label>
          <DatePickerField
            id="debt-duedate"
            label="Hạn thanh toán"
            value={form.dueDate}
            onChange={(day) => set('dueDate', day)}
          />
        </div>
      </div>

      {(wallets.length > 0 || !!debt?.walletId) && (
        <div className={FORM_GROUP}>
          <label htmlFor="debt-wallet">
            {form.type === 'PAYABLE' ? 'Nhận tiền vào ví' : 'Chi tiền từ ví'}{' '}
            <span className="text-muted">(tùy chọn)</span>
          </label>
          <Select
            inputId="debt-wallet"
            options={editWalletOptions}
            value={editWalletOptions.find((o) => o.value === form.walletId) || null}
            onChange={(option) => set('walletId', option?.value ?? '')}
            classNamePrefix="react-select"
            isSearchable={!isTouchDevice()}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
          {debt?.walletId && (
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
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>

      <div className={MODAL_FOOTER}>
        <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
          {debt ? 'Lưu thay đổi' : 'Tạo khoản nợ'}
        </button>
      </div>
    </form>
  );
}
