import { useState, type FormEvent } from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATA_EVENTS } from '../../commons/constants';
import type { Wallet, WalletType } from '../../commons/types';
import {
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  MONEY_INPUT_PROPS,
  parseNumberInput,
  TEXT_NEXT_INPUT_PROPS,
} from '../../commons/utils';
import { walletService } from '../../services';
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
import { WALLET_TYPE_OPTIONS } from './constants';

export interface WalletFormModalProps {
  open: boolean;
  /** The wallet being edited, or null to create one. */
  wallet: Wallet | null;
  onClose: () => void;
}

export function WalletFormModal({ open, wallet, onClose }: WalletFormModalProps) {
  const title = wallet ? 'Sửa ví' : 'Thêm ví mới';
  return (
    <FormModal open={open} onClose={onClose} title={title} ariaLabel={title} variant="scroll">
      {/* Mounted only while open, so every opening starts from fresh values. */}
      <WalletForm wallet={wallet} onClose={onClose} />
    </FormModal>
  );
}

function WalletForm({ wallet, onClose }: Omit<WalletFormModalProps, 'open'>) {
  const [name, setName] = useState(wallet?.name ?? '');
  const [type, setType] = useState<WalletType>(wallet?.type ?? 'BANK');
  const isCredit = type === 'CREDIT';
  // A credit card's balance is negative while owed; the form works with the positive debt.
  const shown = (n: number) =>
    formatNumberInput(String(Math.round(wallet?.type === 'CREDIT' ? Math.abs(n) : n)));
  const [balance, setBalance] = useState(wallet ? shown(wallet.balance) : '');
  const [creditLimit, setCreditLimit] = useState(
    wallet?.creditLimit ? shown(wallet.creditLimit) : ''
  );
  const [statementDay, setStatementDay] = useState(
    wallet?.statementDay ? String(wallet.statementDay) : ''
  );
  const [dueDay, setDueDay] = useState(wallet?.dueDay ? String(wallet.dueDay) : '');
  // Term deposit / CD: when it comes due and the yearly rate.
  const [maturityDate, setMaturityDate] = useState(wallet?.maturityDate ?? '');
  const [interestRate, setInterestRate] = useState(
    wallet?.interestRate ? String(wallet.interestRate) : ''
  );
  const hasTerm = type === 'SAVINGS' || type === 'CD';
  // The balance of a stock / CD / other-asset wallet is the cost of what it holds.
  const isHolding = type === 'CD' || type === 'STOCK' || type === 'OTHER_ASSET';
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên ví');
      return;
    }
    const entered = parseNumberInput(balance);
    const parsed = isCredit ? -Math.abs(entered) : entered;
    const day = (v: string) => Math.min(31, Math.max(1, Number(v) || 0));
    const creditFields = isCredit
      ? {
          creditLimit: parseNumberInput(creditLimit) || 0,
          ...(statementDay ? { statementDay: day(statementDay) } : {}),
          ...(dueDay ? { dueDay: day(dueDay) } : {}),
        }
      : {};
    const rate = Number(interestRate.replace(',', '.'));
    if (hasTerm && interestRate && (!Number.isFinite(rate) || rate < 0 || rate > 100)) {
      toast.error('Lãi suất phải từ 0 đến 100 (%/năm)');
      return;
    }
    // On update, '' / 0 clear a stored date / rate; on create they are simply left out.
    const termFields = hasTerm
      ? wallet
        ? { maturityDate, interestRate: rate || 0 }
        : {
            ...(maturityDate ? { maturityDate } : {}),
            ...(rate ? { interestRate: rate } : {}),
          }
      : {};
    setSaving(true);
    try {
      if (wallet) {
        // The balance is only sent when changed, so a stale value never overwrites a newer one.
        const balanceChanged = balance !== '' && parsed !== Math.round(wallet.balance);
        await walletService.updateWallet(wallet.id, {
          name: name.trim(),
          type,
          ...creditFields,
          ...termFields,
          ...(balanceChanged ? { balance: parsed } : {}),
        });
        toast.success('Đã cập nhật ví');
      } else {
        await walletService.createWallet({
          name: name.trim(),
          type,
          ...creditFields,
          ...termFields,
          balance: parsed || 0,
        });
        toast.success('Đã thêm ví mới');
      }
      window.dispatchEvent(new Event(DATA_EVENTS.WALLETS_CHANGED));
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, wallet ? 'Lỗi khi cập nhật ví' : 'Lỗi khi thêm ví'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className={FORM_GROUP}>
        <label htmlFor="wallet-name">Tên ví</label>
        <input
          id="wallet-name"
          {...TEXT_NEXT_INPUT_PROPS}
          placeholder="Ví dụ: MoMo, ACB, MB, ZaloPay..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className={FORM_GROUP}>
        <label htmlFor="wallet-type">Loại ví</label>
        <Select
          inputId="wallet-type"
          options={WALLET_TYPE_OPTIONS}
          value={WALLET_TYPE_OPTIONS.find((o) => o.value === type) || null}
          onChange={(o) => o && setType(o.value)}
          classNamePrefix="react-select"
          isSearchable={!isTouchDevice()}
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>

      <div className={FORM_GROUP}>
        <label htmlFor="wallet-balance">
          {isCredit
            ? 'Dư nợ hiện tại (đ)'
            : isHolding
              ? 'Giá vốn đang nắm giữ (đ)'
              : wallet
                ? 'Số dư hiện tại (đ)'
                : 'Số dư ban đầu (đ)'}
        </label>
        <input
          id="wallet-balance"
          {...MONEY_INPUT_PROPS}
          placeholder="0"
          value={balance}
          onChange={(e) => setBalance(formatNumberInput(e.target.value))}
        />
        {isHolding ? (
          <div className="mt-1 text-[0.8rem] text-muted">
            Số này tự cộng khi bạn ghi giao dịch đầu tư vào ví và tự trừ khi bán / đáo hạn. Nhập giá
            vốn, không phải giá thị trường: nếu nhập giá thị trường, sau khi bán ví sẽ còn dư phần
            chênh lệch.
          </div>
        ) : (
          wallet && (
            <div className="mt-1 text-[0.8rem] text-muted">
              Sửa số dư để khớp với app ngân hàng / ví điện tử.
            </div>
          )
        )}
      </div>

      {hasTerm && (
        <div className={FORM_ROW_2COL}>
          <div className={FORM_GROUP}>
            <label htmlFor="wallet-maturity">
              Ngày đáo hạn <span className="text-muted">(tùy chọn)</span>
            </label>
            <DatePickerField
              id="wallet-maturity"
              label="Ngày đáo hạn"
              value={maturityDate}
              onChange={setMaturityDate}
            />
          </div>
          <div className={FORM_GROUP}>
            <label htmlFor="wallet-rate">
              Lãi suất %/năm <span className="text-muted">(tùy chọn)</span>
            </label>
            <input
              id="wallet-rate"
              inputMode="decimal"
              placeholder="Ví dụ: 5,2"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
            />
          </div>
        </div>
      )}

      {isCredit && (
        <>
          <div className={FORM_GROUP}>
            <label htmlFor="wallet-limit">Hạn mức thẻ (đ)</label>
            <input
              id="wallet-limit"
              {...MONEY_INPUT_PROPS}
              placeholder="Ví dụ: 30.000.000"
              value={creditLimit}
              onChange={(e) => setCreditLimit(formatNumberInput(e.target.value))}
            />
          </div>
          <div className={FORM_ROW_2COL}>
            <div className={FORM_GROUP}>
              <label htmlFor="wallet-statement-day">Ngày sao kê</label>
              <input
                id="wallet-statement-day"
                inputMode="numeric"
                placeholder="1-31"
                value={statementDay}
                onChange={(e) => setStatementDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </div>
            <div className={FORM_GROUP}>
              <label htmlFor="wallet-due-day">Ngày đến hạn</label>
              <input
                id="wallet-due-day"
                inputMode="numeric"
                placeholder="1-31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              />
            </div>
          </div>
        </>
      )}

      <div className={MODAL_FOOTER}>
        <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)} disabled={saving}>
          {wallet ? 'Lưu thay đổi' : 'Thêm ví'}
        </button>
      </div>
    </form>
  );
}
