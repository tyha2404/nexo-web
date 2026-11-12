import { Plus, X } from './ui';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';

import Select from 'react-select';
import { toast } from 'react-toastify';
import {
  DATA_EVENTS,
  DATE_FORMAT_INPUT,
  InvestmentStatus,
  TransactionType,
} from '../commons/constants';
import type { Category, Preset, Transaction } from '../commons/types';
import {
  MONEY_INPUT_PROPS,
  TEXT_DONE_INPUT_PROPS,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumberInput,
  getErrorMessage,
  isTouchDevice,
  parseNumberInput,
  toISODateString,
} from '../commons/utils';
import { categoryService, presetService, transactionService } from '../services';
import type { CreateTransactionDTO } from '../services';
import { DatePickerField, FormModal, ReceiptUploader, TagInput } from './common';
import { getTypeLabel, INVESTMENT_STATUS_OPTIONS, TypeTabs } from './transaction-list';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CHIP_BTN,
  CHIP_BTN_GHOST,
  FORM_GROUP,
  MONEY,
  TABS,
  cx,
  tabClass,
  MODAL_FORM_BODY,
  MODAL_SHELL_FOOTER,
} from './ui';

export interface AddTransactionModalProps {
  open: boolean;
  /** Pre-selected transaction type; can still be switched inside the modal. */
  initialType?: TransactionType;
  /** Transaction to edit (when provided, the modal acts as an edit form). */
  transaction?: Transaction | null;
  onClose: () => void;
}

export default function AddTransactionModal({
  open,
  initialType = TransactionType.EXPENSE,
  transaction,
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Saved quick-fill templates ("Cà phê 35k"); tapping one fills amount, category and note.
  const [presets, setPresets] = useState<Preset[]>([]);
  const [managingPresets, setManagingPresets] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);

  const isEditing = Boolean(transaction);
  const [uploading, setUploading] = useState(false);
  const submittingRef = useRef(false);
  const requestClose = () => {
    if (submittingRef.current || uploading) return;
    onClose();
  };

  // Reset + prefill whenever the modal opens
  useEffect(() => {
    if (!open) return;
    const values = {
      activeType: transaction?.type ?? initialType,
      title: transaction?.description ?? '',
      amount: transaction ? formatNumberInput(Math.round(transaction.amount)) : '',
      categoryId: transaction?.categoryId ?? '',
      transactionDate: formatDate(transaction?.transactionDate ?? moment(), DATE_FORMAT_INPUT),
      status: transaction?.status ?? InvestmentStatus.HOLDING,
      realizedPnl: transaction?.realizedPnl
        ? `${transaction.realizedPnl < 0 ? '-' : ''}${formatNumberInput(Math.abs(Math.round(transaction.realizedPnl)))}`
        : '0',
      receiptUrl: transaction?.receiptUrl ?? undefined,
      tags: transaction?.tags ?? [],
    };
    setActiveType(values.activeType);
    setTitle(values.title);
    setAmount(values.amount);
    setCategoryId(values.categoryId);
    setTransactionDate(values.transactionDate);
    setStatus(values.status);
    setRealizedPnl(values.realizedPnl);
    setReceiptUrl(values.receiptUrl);
    setTags(values.tags);
  }, [open, transaction, initialType]);

  // Tags used before, offered as one-tap suggestions (optional: the field works without them)
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    transactionService
      .listTags({ signal: controller.signal })
      .then((items) => setTagSuggestions(items.map((tag) => tag.name)))
      .catch(() => {
        // Suggestions are a convenience; typing a tag still works.
      });
    return () => controller.abort();
  }, [open]);

  // Presets are only offered when adding (an edit keeps its own values).
  useEffect(() => {
    if (!open || transaction) return;
    setManagingPresets(false);
    const controller = new AbortController();
    presetService
      .list(undefined, { signal: controller.signal })
      .then((res) => setPresets(res.items || []))
      .catch(() => {
        // Optional: the form works without presets.
      });
    return () => controller.abort();
  }, [open, transaction]);

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

  const visiblePresets = presets.filter((p) => p.type === activeType);

  const applyPreset = (preset: Preset) => {
    setAmount(formatNumberInput(Math.round(preset.amount)));
    setCategoryId(preset.categoryId);
    setTitle(preset.description || preset.name);
  };

  const saveAsPreset = async () => {
    const rawAmount = parseNumberInput(amount);
    const category = categories.find((item) => item.id === categoryId);
    if (!(rawAmount > 0) || !category) {
      toast.info('Nhập số tiền và chọn danh mục trước, rồi bấm Lưu làm mẫu.');
      return;
    }
    const note = title.trim();
    const name = (note || category.name).slice(0, 100);
    if (
      visiblePresets.some(
        (p) => p.name === name && p.categoryId === categoryId && p.amount === rawAmount
      )
    ) {
      toast.info(`Đã có mẫu "${name}"`);
      return;
    }
    try {
      setSavingPreset(true);
      const created = await presetService.create({
        categoryId,
        name,
        amount: rawAmount,
        type: activeType,
        description: note.slice(0, 255),
      });
      setPresets((list) => [...list, created]);
      toast.success(`Đã lưu mẫu "${name}"`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Không lưu được mẫu'));
    } finally {
      setSavingPreset(false);
    }
  };

  const deletePreset = async (preset: Preset) => {
    try {
      await presetService.delete(preset.id);
      const next = presets.filter((p) => p.id !== preset.id);
      setPresets(next);
      if (!next.some((p) => p.type === activeType)) setManagingPresets(false);
      toast.success(`Đã xóa mẫu "${preset.name}"`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Không xóa được mẫu'));
    }
  };

  const handlePnlChange = (val: string) => {
    const isNegative = val.trim().startsWith('-');
    const formatted = formatNumberInput(val);
    setRealizedPnl(formatted ? (isNegative ? `-${formatted}` : formatted) : isNegative ? '-' : '');
  };

  const toggleSignPnl = () => {
    setRealizedPnl((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
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
      tags,
      transactionDate: toISODateString(transactionDate),
      type: activeType,
    };

    if (activeType === TransactionType.INVESTMENT) {
      payload.status = status;
      payload.realizedPnl = status === InvestmentStatus.HOLDING ? 0 : rawPnl;
    }

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
      // Lists and the Dashboard refresh on this event (no per-caller callback).
      window.dispatchEvent(new Event(DATA_EVENTS.TRANSACTIONS_CHANGED));
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lưu giao dịch thất bại'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={requestClose}
      title={isEditing ? 'Chỉnh sửa giao dịch' : `Thêm ${getTypeLabel(activeType)} mới`}
      titleId="transaction-modal-title"
      closeDisabled={submitting || uploading}
    >
      <form onSubmit={handleSubmit}>
        <div className={MODAL_FORM_BODY}>
          <div className="mb-5 flex">
            <TypeTabs
              value={activeType}
              ariaLabel="Loại giao dịch"
              className={cx(TABS, 'w-full')}
              tabClassName={(active) => cx(tabClass(active, 'pill', 'gap-1.5'), 'grow basis-[0%]')}
              onChange={(type) => {
                if (type !== activeType) {
                  setActiveType(type);
                  setCategoryId('');
                  setCategories([]);
                }
              }}
            />
          </div>

          {!isEditing && (
            <div className="mb-4" role="group" aria-labelledby="atxn-presets-title">
              <div className="mb-1.5 flex min-h-8 items-center justify-between gap-2">
                <span id="atxn-presets-title" className="text-[13px] font-semibold text-muted">
                  Mẫu nhanh
                </span>
                {visiblePresets.length > 0 && (
                  <button
                    type="button"
                    className={cx(CHIP_BTN, CHIP_BTN_GHOST)}
                    aria-pressed={managingPresets}
                    onClick={() => setManagingPresets((v) => !v)}
                  >
                    {managingPresets ? 'Xong' : 'Sửa mẫu'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {visiblePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    // Full 44px height on phones instead of the chip's invisible hit area,
                    // which would overlap the next wrapped row.
                    className={cx(
                      CHIP_BTN,
                      'mobile:min-h-11 mobile:after:hidden',
                      managingPresets && 'border-expense text-expense'
                    )}
                    aria-label={
                      managingPresets
                        ? `Xóa mẫu ${preset.name}`
                        : `Dùng mẫu ${preset.name}, ${formatCurrency(preset.amount)}`
                    }
                    onClick={() => (managingPresets ? deletePreset(preset) : applyPreset(preset))}
                  >
                    <span className="max-w-[10rem] truncate">{preset.name}</span>
                    <span className={cx(MONEY, managingPresets ? '' : 'text-muted')}>
                      {formatCompactCurrency(preset.amount)}
                    </span>
                    {managingPresets && <X size={12} />}
                  </button>
                ))}
                {!managingPresets && (
                  <button
                    type="button"
                    className={cx(
                      CHIP_BTN,
                      CHIP_BTN_GHOST,
                      'border-dashed mobile:min-h-11 mobile:after:hidden'
                    )}
                    onClick={saveAsPreset}
                    disabled={savingPreset}
                  >
                    <Plus size={12} /> Lưu làm mẫu
                  </button>
                )}
              </div>
              {visiblePresets.length === 0 && (
                <small className="mt-1.5 block text-[0.8rem] text-muted">
                  Điền số tiền, danh mục rồi bấm "Lưu làm mẫu" để lần sau chỉ cần một chạm.
                </small>
              )}
            </div>
          )}

          <div className={FORM_GROUP}>
            <label htmlFor="atxn-amount">Số tiền (đ)</label>
            <input
              id="atxn-amount"
              {...MONEY_INPUT_PROPS}
              placeholder={
                activeType === TransactionType.INCOME
                  ? 'Ví dụ: 15.000.000'
                  : activeType === TransactionType.INVESTMENT
                    ? 'Ví dụ: 10.000.000'
                    : 'Ví dụ: 50.000'
              }
              value={amount}
              onChange={(e) => setAmount(formatNumberInput(e.target.value))}
              autoFocus={!isEditing}
              required
            />
          </div>

          <div className={FORM_GROUP}>
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
              isSearchable={!isTouchDevice()}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          <div className={FORM_GROUP}>
            <label htmlFor="atxn-title">
              Ghi chú <span className="text-muted">(tùy chọn)</span>
            </label>
            <input
              id="atxn-title"
              {...TEXT_DONE_INPUT_PROPS}
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
            <div className={FORM_GROUP}>
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
                menuPosition="fixed"
              />
            </div>
          )}

          {activeType === TransactionType.INVESTMENT && status !== InvestmentStatus.HOLDING && (
            <div className={FORM_GROUP}>
              <label htmlFor="atxn-pnl">Lãi / lỗ thực tế (đ)</label>
              <div className="flex items-stretch gap-2">
                {/* iOS numeric keypad has no minus key, so the sign is a toggle. */}
                <button
                  type="button"
                  className={cx(BTN_SECONDARY, 'w-12 px-0 text-[1.1rem]')}
                  aria-label={
                    realizedPnl.startsWith('-')
                      ? 'Đang là lỗ, đổi sang lãi'
                      : 'Đang là lãi, đổi sang lỗ'
                  }
                  onClick={toggleSignPnl}
                >
                  {realizedPnl.startsWith('-') ? '−' : '+'}
                </button>
                <input
                  id="atxn-pnl"
                  className="min-w-0 flex-1"
                  {...MONEY_INPUT_PROPS}
                  placeholder="Lãi: 500.000 · Lỗ: -200.000"
                  value={realizedPnl}
                  onChange={(e) => handlePnlChange(e.target.value)}
                />
              </div>
              <small className="mt-1 block text-[0.8rem] text-muted">
                Bấm nút +/− để chọn lãi hoặc lỗ, rồi nhập số tiền.
              </small>
            </div>
          )}

          <div className={FORM_GROUP}>
            <label htmlFor="atxn-incurred">Ngày thực hiện</label>
            <DatePickerField
              id="atxn-incurred"
              label="Ngày thực hiện"
              value={transactionDate}
              onChange={setTransactionDate}
              required
            />
          </div>

          <div className={FORM_GROUP}>
            <label htmlFor="atxn-tags">
              Tag <span className="text-muted">(tùy chọn)</span>
            </label>
            <TagInput
              id="atxn-tags"
              value={tags}
              onChange={setTags}
              suggestions={tagSuggestions}
              disabled={submitting}
            />
          </div>

          <div className={FORM_GROUP}>
            <ReceiptUploader
              value={receiptUrl}
              onChange={setReceiptUrl}
              onUploadingChange={setUploading}
              disabled={submitting}
            />
          </div>
        </div>
        <div className={MODAL_SHELL_FOOTER}>
          <button
            type="button"
            className={cx(BTN_SECONDARY, BTN_FILL)}
            disabled={submitting || uploading}
            onClick={requestClose}
          >
            Đóng
          </button>
          <button
            type="submit"
            className={cx(BTN_PRIMARY, BTN_FILL)}
            disabled={submitting || uploading}
          >
            {submitting ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Thêm'} giao dịch
          </button>
        </div>
      </form>
    </FormModal>
  );
}
