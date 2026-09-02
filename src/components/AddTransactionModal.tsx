import { Gem, ShoppingBag, TrendingUp, X } from 'lucide-react';
import moment from 'moment';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATE_FORMAT_INPUT, TransactionType } from '../commons/constants';
import type {
  Category,
  InvestmentStatus,
  Transaction,
  Wallet as WalletModel,
} from '../commons/types';
import { formatCurrency, formatDate, toISODateString } from '../commons/utils';
import { categoryService, transactionService, walletService } from '../services/api';
import type { CreateTransactionDTO } from '../services/transactionService';

const INVESTMENT_STATUS_OPTIONS = [
  { value: 'HOLDING', label: 'Đang đầu tư' },
  { value: 'SOLD', label: 'Đã bán' },
  { value: 'MATURED', label: 'Đã đáo hạn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
] as const;

export interface AddTransactionModalProps {
  open: boolean;
  /** Pre-selected transaction type; can still be switched inside the modal. */
  initialType?: TransactionType;
  /** Transaction to edit (when provided, the modal acts as an edit form). */
  transaction?: Transaction | null;
  /** Callback fired after a successful create/update (so lists can refresh). */
  onSaved?: () => void;
  onClose: () => void;
}

export default function AddTransactionModal({
  open,
  initialType = TransactionType.EXPENSE,
  transaction,
  onSaved,
  onClose,
}: AddTransactionModalProps) {
  const [activeType, setActiveType] = useState<TransactionType>(initialType);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletModel[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [walletId, setWalletId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [status, setStatus] = useState<InvestmentStatus>('HOLDING');
  const [realizedPnl, setRealizedPnl] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(transaction);

  // Reset + prefill whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setActiveType((transaction?.type ?? initialType) as TransactionType);
    setTitle(transaction?.description ?? '');
    setAmount(transaction ? Math.round(transaction.amount).toLocaleString('vi-VN') : '');
    setCategoryId(transaction?.categoryId ?? '');
    setWalletId(transaction?.walletId ?? '');
    setTransactionDate(formatDate(transaction?.transactionDate ?? moment(), DATE_FORMAT_INPUT));
    setStatus((transaction?.status ?? 'HOLDING') as InvestmentStatus);
    const pnl = transaction?.realizedPnl;
    if (pnl !== undefined && pnl !== null && pnl !== 0) {
      const absVal = Math.abs(Math.round(pnl)).toLocaleString('vi-VN');
      setRealizedPnl(pnl < 0 ? `-${absVal}` : absVal);
    } else {
      setRealizedPnl('0');
    }
  }, [open, transaction, initialType]);

  // Load wallets once
  useEffect(() => {
    let active = true;
    walletService
      .getWallets()
      .then((res) => {
        if (active) setWallets(res.wallets || []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Load categories matching the active type
  useEffect(() => {
    if (!open) return;
    let active = true;
    categoryService
      .list({ type: activeType })
      .then((res) => {
        if (active) {
          const items = res.items || [];
          setCategories(items);
          setCategoryId((current) => current || items[0]?.id || '');
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, activeType]);

  // Reset type when a different transaction is opened
  useEffect(() => {
    if (transaction?.type && open) setActiveType(transaction.type as TransactionType);
  }, [transaction, open]);

  if (!open) return null;

  const handleAmountChange = (val: string) => {
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setAmount('');
      return;
    }
    setAmount(parseInt(cleanNumber, 10).toLocaleString('vi-VN'));
  };

  const handlePnlChange = (val: string) => {
    const isNegative = val.trim().startsWith('-');
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setRealizedPnl(isNegative ? '-' : '');
      return;
    }
    setRealizedPnl((isNegative ? '-' : '') + parseInt(cleanNumber, 10).toLocaleString('vi-VN'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount || !categoryId || !transactionDate) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    const rawAmount = parseFloat(amount.replace(/\./g, ''));
    let rawPnl = 0;
    if (realizedPnl) {
      rawPnl = parseFloat(realizedPnl.replace(/\./g, '')) || 0;
    }

    const payload: CreateTransactionDTO = {
      description: title.trim(),
      amount: rawAmount,
      categoryId,
      transactionDate: toISODateString(transactionDate),
      type: activeType,
    };

    if (walletId) payload.walletId = walletId;

    if (activeType === TransactionType.INVESTMENT) {
      payload.status = status as CreateTransactionDTO['status'];
      payload.realizedPnl = status === 'HOLDING' ? 0 : rawPnl;
    }

    try {
      setSubmitting(true);
      if (isEditing && transaction) {
        await transactionService.update(transaction.id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      window.dispatchEvent(new Event('transactions-changed'));
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lưu giao dịch thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel =
    activeType === TransactionType.INCOME
      ? 'thu nhập'
      : activeType === TransactionType.INVESTMENT
        ? 'đầu tư'
        : 'chi tiêu';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Chỉnh sửa giao dịch' : `Thêm ${typeLabel} mới`}</h3>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="addmodal-type-tabs-container" style={{ marginBottom: '1.25rem' }}>
          <div
            className="category-tabs"
            role="tablist"
            aria-label="Loại giao dịch"
            style={{ width: '100%' }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeType === TransactionType.EXPENSE}
              className={`category-tab flex items-center gap-1.5 ${
                activeType === TransactionType.EXPENSE ? 'active' : ''
              }`}
              style={{ flex: 1 }}
              onClick={() => setActiveType(TransactionType.EXPENSE)}
            >
              <ShoppingBag size={14} />
              <span>Chi tiêu</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeType === TransactionType.INCOME}
              className={`category-tab flex items-center gap-1.5 ${
                activeType === TransactionType.INCOME ? 'active' : ''
              }`}
              style={{ flex: 1 }}
              onClick={() => setActiveType(TransactionType.INCOME)}
            >
              <TrendingUp size={14} />
              <span>Thu nhập</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeType === TransactionType.INVESTMENT}
              className={`category-tab flex items-center gap-1.5 ${
                activeType === TransactionType.INVESTMENT ? 'active' : ''
              }`}
              style={{ flex: 1 }}
              onClick={() => setActiveType(TransactionType.INVESTMENT)}
            >
              <Gem size={14} />
              <span>Đầu tư</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="atxn-title">Tiêu đề / Nội dung</label>
            <input
              id="atxn-title"
              type="text"
              placeholder={
                activeType === TransactionType.INCOME
                  ? 'Ví dụ: Lương tháng, Thưởng dự án...'
                  : activeType === TransactionType.INVESTMENT
                    ? 'Ví dụ: Mua cổ phiếu Vinamilk, Gửi tiết kiệm...'
                    : 'Ví dụ: Mua sắm tạp hóa, Ăn uống...'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="atxn-amount">Số tiền {typeLabel} (đ)</label>
            <input
              id="atxn-amount"
              type="text"
              inputMode="numeric"
              placeholder={
                activeType === TransactionType.INCOME
                  ? 'Ví dụ: 15.000.000'
                  : activeType === TransactionType.INVESTMENT
                    ? 'Ví dụ: 10.000.000'
                    : 'Ví dụ: 50.000'
              }
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="atxn-category">Danh mục</label>
            <Select
              inputId="atxn-category"
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              value={
                categories
                  .map((c) => ({ value: c.id, label: c.name }))
                  .find((o) => o.value === categoryId) || null
              }
              onChange={(option) => setCategoryId(option ? option.value : '')}
              classNamePrefix="react-select"
              placeholder="Chọn Danh mục"
              isSearchable
              menuPortalTarget={document.body}
            />
          </div>

          {wallets.length > 0 && (
            <div className="form-group">
              <label htmlFor="atxn-wallet">Ví / Nguồn thanh toán (Tùy chọn)</label>
              <Select
                inputId="atxn-wallet"
                options={[
                  { value: '', label: '-- Không chọn ví cụ thể --' },
                  ...wallets.map((w) => ({
                    value: w.id,
                    label: `${w.icon ? `${w.icon} ` : '💳 '}${w.name} (${formatCurrency(w.balance)})`,
                  })),
                ]}
                value={
                  [
                    { value: '', label: '-- Không chọn ví cụ thể --' },
                    ...wallets.map((w) => ({
                      value: w.id,
                      label: `${w.icon ? `${w.icon} ` : '💳 '}${w.name} (${formatCurrency(w.balance)})`,
                    })),
                  ].find((o) => o.value === walletId) || null
                }
                onChange={(option) => setWalletId(option ? option.value : '')}
                classNamePrefix="react-select"
                placeholder="Chọn ví hoặc tài khoản"
                isSearchable
                menuPortalTarget={document.body}
              />
            </div>
          )}

          {activeType === TransactionType.INVESTMENT && (
            <div className="form-group">
              <label htmlFor="atxn-status">Trạng thái đầu tư</label>
              <Select
                inputId="atxn-status"
                options={[...INVESTMENT_STATUS_OPTIONS]}
                value={[...INVESTMENT_STATUS_OPTIONS].find((o) => o.value === status) || null}
                onChange={(option) => setStatus((option?.value as InvestmentStatus) || 'HOLDING')}
                classNamePrefix="react-select"
                placeholder="Chọn Trạng thái"
                isSearchable={false}
                menuPortalTarget={document.body}
              />
            </div>
          )}

          {activeType === TransactionType.INVESTMENT && status !== 'HOLDING' && (
            <div className="form-group">
              <label htmlFor="atxn-pnl">Số tiền Lãi / Lỗ thực tế (đ)</label>
              <input
                id="atxn-pnl"
                type="text"
                inputMode="numeric"
                placeholder="Dương cho Lãi (VD: 500.000), Âm cho Lỗ (VD: -200.000)"
                value={realizedPnl}
                onChange={(e) => handlePnlChange(e.target.value)}
              />
              <small
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  marginTop: '4px',
                  display: 'block',
                }}
              >
                Nhập số dương nếu có lãi, hoặc dấu trừ (-) ở đầu nếu bị lỗ.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="atxn-incurred">Ngày thực hiện</label>
            <DatePicker
              id="atxn-incurred"
              selected={transactionDate ? moment(transactionDate).toDate() : null}
              onChange={(date: Date | null) =>
                setTransactionDate(date ? moment(date).format('YYYY-MM-DD') : '')
              }
              dateFormat="dd/MM/yyyy"
              portalId="date-picker-portal"
            />
          </div>

          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              className={`btn btn-primary btn-add-${activeType.toLowerCase()}`}
              disabled={submitting}
            >
              {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm'} giao dịch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
