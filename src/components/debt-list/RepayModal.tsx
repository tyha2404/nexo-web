import moment from 'moment';
import { useState, type FormEvent } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATA_EVENTS, DATE_FORMAT_DISPLAY, DATE_FORMAT_INPUT } from '../../commons/constants';
import type { Debt, Wallet } from '../../commons/types';
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  parseNumberInput,
  TEXT_DONE_INPUT_PROPS,
} from '../../commons/utils';
import { debtService } from '../../services';
import { DatePickerField, FormModal } from '../common';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CHIP_BTN,
  cx,
  FORM_GROUP,
  FORM_ROW_2COL,
  MODAL_FOOTER,
} from '../ui';
import { walletOptions } from './constants';
import { startDayOf, toPaidAt } from './debtCalendar';

export interface RepayModalProps {
  /** The debt being repaid; null keeps the dialog closed. */
  debt: Debt | null;
  wallets: Wallet[];
  onClose: () => void;
}

/** Record a repayment (paid or received) on a debt. */
export function RepayModal({ debt, wallets, onClose }: RepayModalProps) {
  return (
    <FormModal
      open={!!debt}
      onClose={onClose}
      title="Ghi nhận trả / thu tiền"
      ariaLabel="Ghi nhận trả / thu tiền"
      variant="scroll"
    >
      {/* Mounted only while open, so every opening starts from fresh values. */}
      {debt && <RepayForm debt={debt} wallets={wallets} onClose={onClose} />}
    </FormModal>
  );
}

function RepayForm({ debt, wallets, onClose }: RepayModalProps & { debt: Debt }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [paidDay, setPaidDay] = useState(() => moment().format(DATE_FORMAT_INPUT));
  // Default to the wallet the debt came from/went to, when it still exists.
  const [walletId, setWalletId] = useState(() =>
    debt.walletId && wallets.some((w) => w.id === debt.walletId) ? debt.walletId : ''
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseNumberInput(amount);

    if (parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    if (parsedAmount > Math.round(Math.abs(debt.remaining))) {
      toast.error(`Số tiền vượt quá số còn lại (${formatCurrency(Math.abs(debt.remaining))})`);
      return;
    }
    const today = moment().format(DATE_FORMAT_INPUT);
    const startDay = startDayOf(debt);
    if (!paidDay || paidDay > today) {
      toast.error('Ngày thanh toán không được ở tương lai');
      return;
    }
    if (startDay && paidDay < startDay) {
      toast.error(
        `Ngày thanh toán phải từ ngày vay (${moment(startDay).format(DATE_FORMAT_DISPLAY)})`
      );
      return;
    }

    try {
      await debtService.addRepayment(debt.id, {
        amount: parsedAmount,
        notes,
        paidAt: toPaidAt(paidDay),
        walletId: walletId || undefined,
      });

      toast.success('Đã ghi nhận thanh toán thành công!');
      window.dispatchEvent(new Event(DATA_EVENTS.DEBTS_CHANGED));
      if (walletId) window.dispatchEvent(new Event(DATA_EVENTS.WALLETS_CHANGED));
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi ghi nhận thanh toán'));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 rounded-sm border border-line bg-input p-[0.8rem]">
        <div className="font-bold">{debt.title}</div>
        <div
          className={cx(
            'mt-[0.2rem] text-[0.85rem] font-semibold',
            debt.type === 'PAYABLE' ? 'text-expense' : 'text-income'
          )}
        >
          Còn lại: {formatCurrency(Math.abs(debt.remaining))}
        </div>
      </div>

      <div className={FORM_GROUP}>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="repay-amount">Số tiền trả đợt này (đ)</label>
          <button
            type="button"
            className={CHIP_BTN}
            onClick={() =>
              setAmount(formatNumberInput(String(Math.round(Math.abs(debt.remaining)))))
            }
          >
            {debt.type === 'PAYABLE' ? 'Trả hết' : 'Thu đủ'}{' '}
            {formatCompactCurrency(Math.abs(debt.remaining))}
          </button>
        </div>
        <input
          id="repay-amount"
          {...MONEY_INPUT_PROPS}
          placeholder={`Ví dụ: ${formatCurrency(debt.remaining)}`}
          value={amount}
          onChange={(e) => setAmount(formatNumberInput(e.target.value))}
          required
        />
      </div>

      <div className={FORM_ROW_2COL}>
        <div className={FORM_GROUP}>
          <label htmlFor="repay-date">Ngày thanh toán</label>
          <DatePickerField
            id="repay-date"
            label="Ngày thanh toán"
            value={paidDay}
            onChange={setPaidDay}
            required
          />
        </div>
        {wallets.length > 0 && (
          <div className={FORM_GROUP}>
            <label htmlFor="repay-wallet">
              {debt.type === 'PAYABLE' ? 'Trả từ ví' : 'Nhận vào ví'}
            </label>
            <Select
              inputId="repay-wallet"
              options={walletOptions(wallets)}
              value={walletOptions(wallets).find((o) => o.value === walletId) || null}
              onChange={(option) => setWalletId(option?.value ?? '')}
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className={MODAL_FOOTER}>
        <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)}>
          Xác nhận thanh toán
        </button>
      </div>
    </form>
  );
}
