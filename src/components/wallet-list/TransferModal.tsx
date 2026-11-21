import { useState, type FormEvent } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATA_EVENTS } from '../../commons/constants';
import type { Wallet } from '../../commons/types';
import {
  formatCompactCurrency,
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  parseNumberInput,
  TEXT_NEXT_INPUT_PROPS,
} from '../../commons/utils';
import { walletService } from '../../services';
import { FormModal } from '../common';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  cx,
  FORM_GROUP,
  FORM_ROW_2COL,
  MODAL_FOOTER,
} from '../ui';

export interface TransferModalProps {
  open: boolean;
  wallets: Wallet[];
  /** Wallet preselected as the source. */
  fromId: string | null;
  onClose: () => void;
}

export function TransferModal({ open, wallets, fromId, onClose }: TransferModalProps) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Chuyển tiền giữa các ví"
      ariaLabel="Chuyển tiền giữa các ví"
      variant="scroll"
    >
      <TransferForm wallets={wallets} fromId={fromId} onClose={onClose} />
    </FormModal>
  );
}

function TransferForm({ wallets, fromId, onClose }: Omit<TransferModalProps, 'open'>) {
  const options = wallets.map((w) => ({
    value: w.id,
    label: `${w.name} · ${formatCompactCurrency(w.balance)}`,
  }));
  const [from, setFrom] = useState(fromId ?? '');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseNumberInput(amount);
    if (!from || !to) {
      toast.error('Vui lòng chọn ví nguồn và ví đích');
      return;
    }
    if (from === to) {
      toast.error('Ví nguồn và ví đích phải khác nhau');
      return;
    }
    if (parsed <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    setSaving(true);
    try {
      await walletService.transfer({
        fromWalletId: from,
        toWalletId: to,
        amount: parsed,
        fee: parseNumberInput(fee) || 0,
        note: note.trim() || undefined,
      });
      toast.success('Đã chuyển tiền');
      window.dispatchEvent(new Event(DATA_EVENTS.WALLETS_CHANGED));
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi chuyển tiền'));
    } finally {
      setSaving(false);
    }
  };

  const picker = (id: string, value: string, onChange: (v: string) => void) => (
    <Select
      inputId={id}
      options={options}
      value={options.find((o) => o.value === value) || null}
      onChange={(o) => onChange(o?.value ?? '')}
      classNamePrefix="react-select"
      isSearchable={!isTouchDevice()}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className={FORM_GROUP}>
        <label htmlFor="transfer-from">Từ ví</label>
        {picker('transfer-from', from, setFrom)}
      </div>
      <div className={FORM_GROUP}>
        <label htmlFor="transfer-to">Đến ví</label>
        {picker('transfer-to', to, setTo)}
      </div>
      <div className={FORM_ROW_2COL}>
        <div className={FORM_GROUP}>
          <label htmlFor="transfer-amount">Số tiền (đ)</label>
          <input
            id="transfer-amount"
            {...MONEY_INPUT_PROPS}
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(formatNumberInput(e.target.value))}
            required
          />
        </div>
        <div className={FORM_GROUP}>
          <label htmlFor="transfer-fee">
            Phí <span className="text-muted">(tùy chọn)</span>
          </label>
          <input
            id="transfer-fee"
            {...MONEY_INPUT_PROPS}
            placeholder="0"
            value={fee}
            onChange={(e) => setFee(formatNumberInput(e.target.value))}
          />
          <small className="mt-1 block text-[0.8rem] text-muted">
            Phí được ghi thành khoản chi &quot;Phí chuyển tiền&quot;.
          </small>
        </div>
      </div>
      <div className={FORM_GROUP}>
        <label htmlFor="transfer-note">Ghi chú</label>
        <input
          id="transfer-note"
          {...TEXT_NEXT_INPUT_PROPS}
          placeholder="Ví dụ: Nạp MoMo để chi tiêu"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className={MODAL_FOOTER}>
        <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)} disabled={saving}>
          Chuyển tiền
        </button>
      </div>
    </form>
  );
}
