import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import moment from 'moment';
import {
  Sparkles,
  X,
  UtensilsCrossed,
  Banknote,
  Fuel,
  Home,
  Folder,
  Calendar,
  ShoppingBag,
  Wallet,
  TrendingUp,
  ReceiptText,
  AlertCircle,
} from 'lucide-react';
import type { Category } from '../commons/types';
import { TransactionType } from '../commons/constants';
import { formatCurrency } from '../commons/utils';
import {
  nlpService,
  transactionService,
  categoryService,
  type ParseNLPResponse,
} from '../services/api';
import './QuickInputModal.css';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: () => void;
}

const SAMPLE_PROMPTS = [
  { icon: UtensilsCrossed, text: 'Ăn sáng 35k' },
  { icon: Banknote, text: 'Lương 15tr' },
  { icon: Fuel, text: 'Đổ xăng 50k hôm qua' },
  { icon: Home, text: 'Tiền nhà 3.5tr ngày 15' },
];

const TYPE_OPTIONS = [
  { value: TransactionType.EXPENSE, label: 'Chi tiêu', icon: ShoppingBag },
  { value: TransactionType.INCOME, label: 'Thu nhập', icon: Wallet },
  { value: TransactionType.INVESTMENT, label: 'Đầu tư', icon: TrendingUp },
];

export function extractDateFromText(inputText: string): { date: Date | null; cleanText: string } {
  let clean = inputText;

  // 1. Relative day terms
  const relativeMap: { [key: string]: number } = {
    'hôm kia': -2,
    'hom kia': -2,
    'hôm qua': -1,
    'hom qua': -1,
    'hôm nay': 0,
    'hom nay': 0,
    'ngày mai': 1,
    'ngay mai': 1,
    'ngày mốt': 2,
    'ngay mot': 2,
  };

  for (const [kw, offset] of Object.entries(relativeMap)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(clean)) {
      clean = clean.replace(regex, ' ').replace(/\s+/g, ' ').trim();
      const targetDate = moment().add(offset, 'days').toDate();
      return { date: targetDate, cleanText: clean };
    }
  }

  // 2. "X ngày trước" / "X ngay truoc"
  const daysAgoRegex = /(\d+)\s*(?:ngày|ngay)\s*trước/i;
  const daysAgoMatch = clean.match(daysAgoRegex);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    clean = clean.replace(daysAgoRegex, ' ').replace(/\s+/g, ' ').trim();
    return { date: moment().subtract(days, 'days').toDate(), cleanText: clean };
  }

  // 3. Full Date DD/MM/YYYY or DD-MM-YYYY
  const fullDateRegex = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/;
  const fullDateMatch = clean.match(fullDateRegex);
  if (fullDateMatch) {
    const d = parseInt(fullDateMatch[1], 10);
    const m = parseInt(fullDateMatch[2], 10);
    const y = parseInt(fullDateMatch[3], 10);
    const parsed = moment(`${y}-${m}-${d}`, 'YYYY-M-D', true);
    if (parsed.isValid()) {
      clean = clean.replace(fullDateRegex, ' ').replace(/\s+/g, ' ').trim();
      return { date: parsed.toDate(), cleanText: clean };
    }
  }

  // 4. Short Date DD/MM or DD-MM
  const shortDateRegex = /\b(\d{1,2})[/.-](\d{1,2})\b/;
  const shortDateMatch = clean.match(shortDateRegex);
  if (shortDateMatch) {
    const d = parseInt(shortDateMatch[1], 10);
    const m = parseInt(shortDateMatch[2], 10);
    const currentYear = moment().year();
    const parsed = moment(`${currentYear}-${m}-${d}`, 'YYYY-M-D', true);
    if (parsed.isValid()) {
      clean = clean.replace(shortDateRegex, ' ').replace(/\s+/g, ' ').trim();
      return { date: parsed.toDate(), cleanText: clean };
    }
  }

  // 5. Day only: "ngày 15" or "ngay 15"
  const dayOnlyRegex = /(?:ngày|ngay)\s+(\d{1,2})\b/i;
  const dayOnlyMatch = clean.match(dayOnlyRegex);
  if (dayOnlyMatch) {
    const d = parseInt(dayOnlyMatch[1], 10);
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();
    const parsed = moment(`${currentYear}-${currentMonth}-${d}`, 'YYYY-M-D', true);
    if (parsed.isValid()) {
      clean = clean.replace(dayOnlyRegex, ' ').replace(/\s+/g, ' ').trim();
      return { date: parsed.toDate(), cleanText: clean };
    }
  }

  return { date: null, cleanText: clean };
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
}) => {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParseNLPResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customType, setCustomType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [customDate, setCustomDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      categoryService
        .list()
        .then((res) => setCategories(res.items || []))
        .catch(console.error);
    } else {
      // Reset state on close
      setText('');
      setParsedResult(null);
      setSelectedCategoryId('');
      setCustomAmount('');
      setCustomDescription('');
      setCustomDate(new Date());
      setError(null);
    }
  }, [isOpen]);

  const handleParseText = async (inputText: string) => {
    if (!inputText.trim()) return;
    try {
      setParsing(true);
      setError(null);

      // Extract date and clean description client-side
      const { date: clientExtractedDate, cleanText } = extractDateFromText(inputText.trim());

      const res = await nlpService.parseNLP(inputText.trim());
      setParsedResult(res);
      setCustomAmount(res.amount ? String(res.amount) : '');

      // Set cleaned description without date artifacts
      const rawDesc = res.description || cleanText || inputText;
      const { cleanText: cleanedDesc } = extractDateFromText(rawDesc);
      setCustomDescription(cleanedDesc || rawDesc);

      setCustomType((res.type as TransactionType) || TransactionType.EXPENSE);

      // Prioritize client extracted date or backend response date
      if (clientExtractedDate) {
        setCustomDate(clientExtractedDate);
      } else if (res.transactionDate) {
        setCustomDate(moment(res.transactionDate).toDate());
      } else {
        setCustomDate(new Date());
      }

      if (res.categoryId) {
        setSelectedCategoryId(res.categoryId);
      } else if (res.categoryName && categories.length > 0) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === res.categoryName?.toLowerCase()
        );
        if (match) {
          setSelectedCategoryId(match.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể phân tích văn bản');
    } finally {
      setParsing(false);
    }
  };

  const handleParse = () => handleParseText(text);

  const handleSampleClick = (sampleText: string) => {
    setText(sampleText);
    handleParseText(sampleText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey) && parsedResult) {
        handleConfirm();
      } else if (!parsedResult) {
        handleParse();
      } else {
        handleConfirm();
      }
    }
  };

  const handleConfirm = async () => {
    const finalAmount = Number(customAmount) || parsedResult?.amount || 0;
    if (!finalAmount) {
      setError('Số tiền không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    if (!selectedCategoryId && !parsedResult?.categoryId) {
      setError('Vui lòng chọn danh mục cho giao dịch');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const finalCatId = selectedCategoryId || parsedResult?.categoryId || '';
      const finalDate = moment(customDate).format('YYYY-MM-DD');

      await transactionService.create({
        categoryId: finalCatId,
        amount: finalAmount,
        type: customType,
        description: customDescription || text,
        transactionDate: finalDate,
      });

      window.dispatchEvent(new Event('transactions-changed'));
      if (onTransactionCreated) {
        onTransactionCreated();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể ghi nhận giao dịch');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === customType);
  const categoryOptions = filteredCategories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  const selectedCategoryOption =
    categoryOptions.find((opt) => opt.value === selectedCategoryId) || null;

  const selectedTypeOption =
    TYPE_OPTIONS.find((opt) => opt.value === customType) || TYPE_OPTIONS[0];

  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="nlp-modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header mb-3">
          <h3
            className="flex items-center gap-2 m-0"
            style={{ color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: 700 }}
          >
            <span
              className="p-1.5 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}
            >
              <Sparkles size={20} className="text-cyan-400" />
            </span>
            <span>Nhập nhanh thông minh (NLP)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="close-btn flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Gõ 1 câu ngắn, hệ thống sẽ tự động trích xuất số tiền, danh mục & ngày thực hiện:
        </p>

        {/* Quick Sample Chips with Clear Separation */}
        <div className="nlp-samples-wrapper">
          <span className="nlp-samples-label">Gợi ý mẫu câu:</span>
          <div className="nlp-samples-list">
            {SAMPLE_PROMPTS.map((sample, idx) => {
              const IconComp = sample.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleClick(sample.text)}
                  className="nlp-example-chip"
                >
                  <IconComp size={14} />
                  <span>{sample.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            className="text-xs p-3 rounded-lg mb-4 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--expense-glow)',
              color: 'var(--expense)',
              border: '1px solid var(--expense)',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Input and Parse Button Row */}
        <div className="nlp-input-row">
          <input
            type="text"
            className="nlp-input-field"
            placeholder="VD: Ăn sáng 35k hôm qua, Tiền nhà 3.5tr..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParsedResult(null);
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !text.trim()}
            className="btn btn-primary nlp-parse-btn"
          >
            {parsing ? 'Đang đọc...' : 'Phân tích'}
          </button>
        </div>

        {/* Visually Impressive Parsed Result Preview Card */}
        {parsedResult && (
          <div className="nlp-result-card">
            <div className="nlp-result-header">
              <span className="nlp-result-title">
                <Sparkles size={15} />
                <span>Kết quả nhận diện:</span>
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}
              >
                Độ chính xác cao
              </span>
            </div>

            {/* Hero Amount & Type Box */}
            <div className="nlp-hero-amount-box">
              <div>
                <span className="nlp-hero-amount-label">Số tiền ghi nhận</span>
                <span
                  className="nlp-hero-amount-value"
                  style={{
                    color:
                      customType === TransactionType.INCOME
                        ? 'var(--income)'
                        : customType === TransactionType.INVESTMENT
                          ? '#a855f7'
                          : 'var(--expense)',
                  }}
                >
                  {formatCurrency(Number(customAmount) || parsedResult.amount)}
                </span>
              </div>

              {/* Type Selector Dropdown using unified React-Select */}
              <div className="nlp-type-dropdown-wrapper">
                <Select
                  options={TYPE_OPTIONS}
                  value={selectedTypeOption}
                  onChange={(opt) => {
                    if (opt) {
                      setCustomType(opt.value);
                      setSelectedCategoryId('');
                    }
                  }}
                  formatOptionLabel={(option) => {
                    const Icon = option.icon;
                    return (
                      <div className="flex items-center gap-1.5">
                        {Icon && <Icon size={14} />}
                        <span>{option.label}</span>
                      </div>
                    );
                  }}
                  classNamePrefix="react-select"
                  isSearchable={false}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            {/* Grid 2-col for Category and Date */}
            <div className="nlp-form-grid">
              {/* Category Field */}
              <div className="nlp-field-group">
                <label className="nlp-field-label">
                  <Folder size={15} />
                  <span>Danh mục:</span>
                </label>
                <Select
                  options={categoryOptions}
                  value={selectedCategoryOption}
                  onChange={(opt) => setSelectedCategoryId(opt ? opt.value : '')}
                  classNamePrefix="react-select"
                  placeholder="-- Chọn danh mục --"
                  isSearchable={true}
                  menuPortalTarget={document.body}
                  noOptionsMessage={() => 'Không có danh mục phù hợp'}
                />
              </div>

              {/* Date Field */}
              <div className="nlp-field-group">
                <label className="nlp-field-label">
                  <Calendar size={15} />
                  <span>Ngày thực hiện:</span>
                </label>
                <div className="nlp-datepicker-wrapper">
                  <DatePicker
                    selected={customDate}
                    onChange={(date: Date | null) => {
                      if (date) setCustomDate(date);
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="Chọn ngày"
                    className="nlp-datepicker-input"
                    portalId="date-picker-portal"
                  />
                </div>
              </div>
            </div>

            {/* Note / Description Field */}
            <div className="nlp-field-group">
              <label className="nlp-field-label">
                <ReceiptText size={15} />
                <span>Ghi chú giao dịch:</span>
              </label>
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập ghi chú..."
                className="nlp-text-input"
              />
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="button-group mt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !parsedResult}
            className="btn btn-primary"
            style={{ fontWeight: 600 }}
          >
            {submitting ? 'Đang lưu...' : 'Xác nhận ghi nhận'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
