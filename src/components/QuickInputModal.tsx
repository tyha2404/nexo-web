import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
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
  { label: '☕ Ăn sáng 35k', text: 'Ăn sáng 35k' },
  { label: '💵 Lương 15tr', text: 'Lương 15tr' },
  { label: '⛽ Đổ xăng 50k', text: 'Đổ xăng 50k' },
  { label: '🏠 Tiền nhà 3.5tr', text: 'Tiền nhà 3.5tr' },
];

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
      setError(null);
    }
  }, [isOpen]);

  const handleParseText = async (inputText: string) => {
    if (!inputText.trim()) return;
    try {
      setParsing(true);
      setError(null);
      const res = await nlpService.parseNLP(inputText.trim());
      setParsedResult(res);
      setCustomAmount(res.amount ? String(res.amount) : '');
      setCustomDescription(res.description || inputText);
      setCustomType((res.type as TransactionType) || TransactionType.EXPENSE);

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
      const finalDate = parsedResult?.transactionDate || moment().format('YYYY-MM-DD');

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
              🤖
            </span>
            <span>Nhập nhanh thông minh (NLP)</span>
          </h3>
          <button type="button" onClick={onClose} className="close-btn">
            &times;
          </button>
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Gõ 1 câu ngắn, hệ thống sẽ tự động trích xuất số tiền & danh mục:
        </p>

        {/* Quick Sample Chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSampleClick(sample.text)}
              className="nlp-example-chip"
            >
              {sample.label}
            </button>
          ))}
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
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Input and Parse Button Row */}
        <div className="nlp-input-row">
          <input
            type="text"
            className="nlp-input-field"
            placeholder="VD: Ăn sáng 35k..."
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
                <span>✨</span>
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

              {/* Type Selector Pill */}
              <select
                value={customType}
                onChange={(e) => {
                  const newType = e.target.value as TransactionType;
                  setCustomType(newType);
                  setSelectedCategoryId('');
                }}
                className={`nlp-type-pill ${
                  customType === TransactionType.INCOME
                    ? 'income'
                    : customType === TransactionType.INVESTMENT
                      ? 'investment'
                      : 'expense'
                }`}
                style={{ outline: 'none', cursor: 'pointer' }}
              >
                <option value={TransactionType.EXPENSE}>🛍️ Chi tiêu</option>
                <option value={TransactionType.INCOME}>💵 Thu nhập</option>
                <option value={TransactionType.INVESTMENT}>📈 Đầu tư</option>
              </select>
            </div>

            {/* Category Field */}
            <div className="nlp-field-group">
              <label className="nlp-field-label">
                <span>📁</span>
                <span>Danh mục phân loại:</span>
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="nlp-select-input"
              >
                <option value="">-- Chọn danh mục --</option>
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Note / Description Field */}
            <div className="nlp-field-group">
              <label className="nlp-field-label">
                <span>📝</span>
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
