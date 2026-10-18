import { Gem, ShoppingBag, TrendingUp, X } from 'lucide-react';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../hooks';
import Select from 'react-select';
import { toast } from 'react-toastify';
import { DATE_FORMAT_INPUT, InvestmentStatus, TransactionType } from '../commons/constants';
import type { Category, Transaction } from '../commons/types';
import {
  formatDate,
  formatNumberInput,
  getErrorMessage,
  parseNumberInput,
  toISODateString,
} from '../commons/utils';
import { categoryService, transactionService } from '../services';
import type { CreateTransactionDTO } from '../services';
import { DatePickerField, ReceiptUploader } from './common';

const INVESTMENT_STATUS_OPTIONS = [
  { value: InvestmentStatus.HOLDING, label: 'Đang đầu tư' },
  { value: InvestmentStatus.SOLD, label: 'Đã bán' },
  { value: InvestmentStatus.MATURED, label: 'Đã đáo hạn' },
  { value: InvestmentStatus.CANCELLED, label: 'Đã hủy' },
];

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
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [transactionDate, setTransactionDate] = useState('');
  const [status, setStatus] = useState<InvestmentStatus>(InvestmentStatus.HOLDING);
  const [realizedPnl, setRealizedPnl] = useState('0');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(transaction);
  const [uploading, setUploading] = useState(false);
  const submittingRef = useRef(false);
  const requestClose = () => {
    if (submittingRef.current || uploading) return;
    onClose();
  };
  const dialogRef = useModal(open, requestClose);

  // Reset + prefill whenever the modal opens
  useEffect(() => {
    if (!open) return;
    const initial = {
      activeType: transaction?.type ?? initialType,
      title: transaction?.description ?? '',
      amount: transaction ? Math.round(transaction.amount).toLocaleString('vi-VN') : '',
      categoryId: transaction?.categoryId ?? '',
      transactionDate: formatDate(transaction?.transactionDate ?? moment(), DATE_FORMAT_INPUT),
      status: transaction?.status ?? InvestmentStatus.HOLDING,
      realizedPnl: transaction?.realizedPnl
        ? `${transaction.realizedPnl < 0 ? '-' : ''}${Math.abs(Math.round(transaction.realizedPnl)).toLocaleString('vi-VN')}`
        : '0',
      receiptUrl: transaction?.receiptUrl ?? undefined,
    };
    const values = initial;
    setActiveType(values.activeType);
    setTitle(values.title);
    setAmount(values.amount);
    setCategoryId(values.categoryId);
    setTransactionDate(values.transactionDate);
    setStatus(values.status);
    setRealizedPnl(values.realizedPnl);
    setReceiptUrl(values.receiptUrl);
  }, [open, transaction, initialType]);

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
          setCategoryId((current) => (items.some((item) => item.id === current) ? current : ''));
        }
      })
      .catch(() => {
        if (active) toast.error('Không thể tải danh mục. Hãy kiểm tra kết nối và thử lại.');
      });
    return () => {
      active = false;
    };
  }, [open, activeType]);

  if (!open) return null;

  const handleAmountChange = (val: string) => {
    setAmount(formatNumberInput(val));
  };

  const handlePnlChange = (val: string) => {
    const isNegative = val.trim().startsWith('-');
    const formatted = formatNumberInput(val);
    setRealizedPnl(formatted ? (isNegative ? `-${formatted}` : formatted) : isNegative ? '-' : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || uploading) return;
    if (!amount || !categoryId || !transactionDate) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    const rawAmount = parseNumberInput(amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      toast.error('Số tiền phải lớn hơn 0');
      return;
    }
    if (!categories.some((item) => item.id === categoryId && item.type === activeType)) {
      toast.error('Vui lòng chọn danh mục phù hợp với loại giao dịch');
      return;
    }
    let rawPnl = 0;
    if (realizedPnl) {
      const isNegative = realizedPnl.trim().startsWith('-');
      const absPnl = parseNumberInput(realizedPnl);
      rawPnl = isNegative ? -absPnl : absPnl;
    }

    const payload: CreateTransactionDTO = {
      // An empty note falls back to the category name so lists stay readable
      description: title.trim() || categories.find((item) => item.id === categoryId)?.name,
      amount: rawAmount,
      categoryId,
      receiptUrl: receiptUrl || '',
      transactionDate: toISODateString(transactionDate),
      type: activeType,
    };

    if (activeType === TransactionType.INVESTMENT) {
      payload.status = status;
      payload.realizedPnl = status === InvestmentStatus.HOLDING ? 0 : rawPnl;
    }

    const finishSave = () => {
      onSaved?.();
      onClose();
    };
    try {
      submittingRef.current = true;
      setSubmitting(true);
      if (isEditing && transaction) {
        await transactionService.update(transaction.id, payload);
        toast.success('Cập nhật giao dịch thành công!');
      } else {
        await transactionService.create(payload);
        toast.success('Thêm giao dịch thành công!');
      }
      window.dispatchEvent(new Event('transactions-changed'));
      finishSave();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lưu giao dịch thất bại'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const typeLabel =
    activeType === TransactionType.INCOME
      ? 'thu nhập'
      : activeType === TransactionType.INVESTMENT
        ? 'đầu tư'
        : 'chi tiêu';

  return createPortal(
    <div className="modal-backdrop app-modal-backdrop" onClick={requestClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
        tabIndex={-1}
        className="modal-content modal-form-shell animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="transaction-modal-title">
            {isEditing ? 'Chỉnh sửa giao dịch' : `Thêm ${typeLabel} mới`}
          </h3>
          <button
            type="button"
            className="close-btn"
            onClick={requestClose}
            disabled={submitting || uploading}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-form-body min-h-0 overflow-y-auto overscroll-contain">
            <div className="addmodal-type-tabs-container mb-5">
              <div className="category-tabs w-full" role="tablist" aria-label="Loại giao dịch">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeType === TransactionType.EXPENSE}
                  className={`category-tab flex flex-1 items-center gap-1.5 ${
                    activeType === TransactionType.EXPENSE ? 'active' : ''
                  }`}
                  onClick={() => {
                    if (activeType !== TransactionType.EXPENSE) {
                      setActiveType(TransactionType.EXPENSE);
                      setCategoryId('');
                      setCategories([]);
                    }
                  }}
                >
                  <ShoppingBag size={14} />
                  <span>Chi tiêu</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeType === TransactionType.INCOME}
                  className={`category-tab flex flex-1 items-center gap-1.5 ${
                    activeType === TransactionType.INCOME ? 'active' : ''
                  }`}
                  onClick={() => {
                    if (activeType !== TransactionType.INCOME) {
                      setActiveType(TransactionType.INCOME);
                      setCategoryId('');
                      setCategories([]);
                    }
                  }}
                >
                  <TrendingUp size={14} />
                  <span>Thu nhập</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeType === TransactionType.INVESTMENT}
                  className={`category-tab flex flex-1 items-center gap-1.5 ${
                    activeType === TransactionType.INVESTMENT ? 'active' : ''
                  }`}
                  onClick={() => {
                    if (activeType !== TransactionType.INVESTMENT) {
                      setActiveType(TransactionType.INVESTMENT);
                      setCategoryId('');
                      setCategories([]);
                    }
                  }}
                >
                  <Gem size={14} />
                  <span>Đầu tư</span>
                </button>
              </div>
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
                autoFocus={!isEditing}
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

            <div className="form-group">
              <label htmlFor="atxn-title">
                Ghi chú <span className="text-muted">(không bắt buộc)</span>
              </label>
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
              />
            </div>

            {activeType === TransactionType.INVESTMENT && (
              <div className="form-group">
                <label htmlFor="atxn-status">Trạng thái đầu tư</label>
                <Select
                  inputId="atxn-status"
                  options={INVESTMENT_STATUS_OPTIONS}
                  value={INVESTMENT_STATUS_OPTIONS.find((o) => o.value === status) || null}
                  onChange={(option) => setStatus(option?.value ?? InvestmentStatus.HOLDING)}
                  classNamePrefix="react-select"
                  placeholder="Chọn Trạng thái"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
            )}

            {activeType === TransactionType.INVESTMENT && status !== InvestmentStatus.HOLDING && (
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
                <small className="mt-1 block text-[0.8rem] text-muted">
                  Nhập số dương nếu có lãi, hoặc dấu trừ (-) ở đầu nếu bị lỗ.
                </small>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="atxn-incurred">Ngày thực hiện</label>
              <DatePickerField
                id="atxn-incurred"
                label="Ngày thực hiện"
                value={transactionDate}
                onChange={setTransactionDate}
                required
              />
            </div>

            <div className="form-group">
              <ReceiptUploader
                value={receiptUrl}
                onChange={setReceiptUrl}
                onUploadingChange={setUploading}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="button-group">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting || uploading}
              onClick={requestClose}
            >
              Đóng
            </button>
            <button
              type="submit"
              className={`btn btn-primary btn-add-${activeType.toLowerCase()}`}
              disabled={submitting || uploading}
            >
              {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm'} giao dịch
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
