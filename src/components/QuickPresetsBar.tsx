import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import type { Category, Preset } from '../commons/types';
import { TransactionType } from '../commons/constants';
import { formatCurrency } from '../commons/utils';
import { presetService, transactionService, categoryService } from '../services/api';

interface QuickPresetsBarProps {
  onTransactionCreated?: () => void;
}

export const QuickPresetsBar: React.FC<QuickPresetsBarProps> = ({ onTransactionCreated }) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New preset form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [presetsRes, categoriesRes] = await Promise.all([
        presetService.list(),
        categoryService.list(),
      ]);
      setPresets(presetsRes.items || []);
      setCategories(categoriesRes.items || []);
    } catch (err: any) {
      console.error('Failed to load presets or categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (showAddModal) {
      categoryService
        .list()
        .then((res) => setCategories(res.items || []))
        .catch(console.error);
    }
  }, [showAddModal]);

  const handleUsePreset = async (preset: Preset) => {
    try {
      setSubmittingId(preset.id);
      setError(null);
      await transactionService.create({
        categoryId: preset.categoryId,
        amount: preset.amount,
        type: preset.type,
        description: preset.description || preset.name,
        transactionDate: moment().format('YYYY-MM-DD'),
      });
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi ghi nhận giao dịch từ mẫu');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !categoryId) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setCreateLoading(true);
      setError(null);
      await presetService.create({
        name,
        amount: Number(amount),
        categoryId,
        type,
        icon: icon || undefined,
        description: description || undefined,
      });
      setShowAddModal(false);
      // Reset form
      setName('');
      setAmount('');
      setCategoryId('');
      setIcon('');
      setDescription('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Không thể tạo mẫu nhanh');
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <div className="quick-presets-bar glass-card mb-6 p-4" style={{ marginBottom: '1.5rem' }}>
      <div className="flex items-center justify-between mb-3">
        <h4
          className="text-sm font-bold flex items-center gap-2 m-0"
          style={{ color: 'var(--text-main)' }}
        >
          <span
            className="p-1 rounded text-xs"
            style={{ backgroundColor: 'var(--primary-glow)', color: 'var(--primary)' }}
          >
            ⚡
          </span>
          <span>Mẫu giao dịch nhanh</span>
        </h4>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1"
        >
          <span>+ Thêm mẫu</span>
        </button>
      </div>

      {error && (
        <div
          className="text-xs p-2.5 rounded mb-3 flex items-center gap-1.5"
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

      {loading ? (
        <div className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
          Đang tải mẫu nhanh...
        </div>
      ) : presets.length === 0 ? (
        <div className="text-xs italic py-2" style={{ color: 'var(--text-muted)' }}>
          Chưa có mẫu giao dịch nhanh nào. Nhấn "+ Thêm mẫu" để tạo mới.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleUsePreset(preset)}
              disabled={submittingId === preset.id}
              className="btn btn-secondary text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5"
              style={{
                cursor: submittingId === preset.id ? 'not-allowed' : 'pointer',
              }}
              title={`Ghi nhanh ${formatCurrency(preset.amount)} vào danh mục ${preset.categoryName || ''}`}
            >
              {preset.icon ? <span>{preset.icon}</span> : <span>⚡</span>}
              <span>{preset.name}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                ({formatCurrency(preset.amount)})
              </span>
              {submittingId === preset.id && (
                <span
                  className="spinner-sm"
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid currentColor',
                    borderLeftColor: 'transparent',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {showAddModal &&
        ReactDOM.createPortal(
          <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
            <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ color: 'var(--text-main)' }}>Thêm mẫu giao dịch nhanh</h3>
                <button type="button" onClick={() => setShowAddModal(false)} className="close-btn">
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreatePreset}>
                <div className="form-group">
                  <label>Tên mẫu *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cà phê sáng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label>Số tiền (đ) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="35000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Loại *</label>
                    <select
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value as TransactionType);
                        setCategoryId('');
                      }}
                    >
                      <option value={TransactionType.EXPENSE}>Chi tiêu</option>
                      <option value={TransactionType.INCOME}>Thu nhập</option>
                      <option value={TransactionType.INVESTMENT}>Đầu tư</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Danh mục *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="form-group">
                    <label>Icon (Emoji)</label>
                    <input
                      type="text"
                      placeholder="☕"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ghi chú</label>
                    <input
                      type="text"
                      placeholder="Mô tả..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="button-group">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-secondary"
                  >
                    Hủy
                  </button>
                  <button type="submit" disabled={createLoading} className="btn btn-primary">
                    {createLoading ? 'Đang tạo...' : 'Lưu mẫu'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
