import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import { formatCurrency } from '../commons/utils';
import { debtService } from '../services/api';
import type { Debt, DebtSummary, DebtType } from '../types/debt';
import './Debts.css';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [summary, setSummary] = useState<DebtSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Date Range & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    moment().startOf('month').toDate(),
    moment().endOf('month').toDate(),
  ]);
  const [startDate, endDate] = dateRange;
  const [filterType, setFilterType] = useState<string>(''); // '' | 'PAYABLE' | 'RECEIVABLE'

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isRepayModalOpen, setIsRepayModalOpen] = useState<boolean>(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Create / Edit Form State
  const [formType, setFormType] = useState<DebtType>('PAYABLE');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formStartDate, setFormStartDate] = useState<Date | null>(moment().toDate());
  const [formDueDate, setFormDueDate] = useState<Date | null>(null);
  const [formNotes, setFormNotes] = useState<string>('');

  // Repay Form State
  const [repayAmount, setRepayAmount] = useState<string>('');
  const [repayNotes, setRepayNotes] = useState<string>('');

  // Presets like Transactions.tsx
  const payablePresets = [
    { label: 'Vay ngân hàng (TPBank/MB)', type: 'PAYABLE' as DebtType },
    { label: 'Vay người thân / bạn bè', type: 'PAYABLE' as DebtType },
    { label: 'Nợ thẻ tín dụng', type: 'PAYABLE' as DebtType },
    { label: 'Trả góp hàng tháng', type: 'PAYABLE' as DebtType },
  ];

  const receivablePresets = [
    { label: 'Cho bạn mượn', type: 'RECEIVABLE' as DebtType },
    { label: 'Thu tiền phòng / nhà', type: 'RECEIVABLE' as DebtType },
    { label: 'Ứng trước tiền công', type: 'RECEIVABLE' as DebtType },
    { label: 'Tiền bán hàng chưa thu', type: 'RECEIVABLE' as DebtType },
  ];

  const activePresets = formType === 'PAYABLE' ? payablePresets : receivablePresets;

  const fetchDebtData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, debtList] = await Promise.all([
        debtService.getSummary(),
        debtService.getDebts(filterType ? (filterType as DebtType) : undefined),
      ]);
      setSummary(sumData);
      setDebts(debtList);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu khoản vay/nợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtData();
  }, [filterType]);

  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setter('');
      return;
    }
    const formatted = parseInt(cleanNumber, 10).toLocaleString('vi-VN');
    setter(formatted);
  };

  const handleApplyPreset = (preset: { label: string; type: DebtType }) => {
    setFormTitle(preset.label);
    setFormType(preset.type);
  };

  const openCreateModal = (defaultType: DebtType = 'PAYABLE') => {
    setFormType(defaultType);
    setFormTitle('');
    setFormAmount('');
    setFormStartDate(moment().toDate());
    setFormDueDate(null);
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = formAmount.replace(/\./g, '').replace(/,/g, '');
    const parsedAmount = parseFloat(cleanNumber);

    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tên khoản nợ / đối tác');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await debtService.createDebt({
        type: formType,
        title: formTitle,
        totalAmount: parsedAmount,
        startDate: formStartDate ? formStartDate.toISOString() : undefined,
        dueDate: formDueDate ? formDueDate.toISOString() : undefined,
        notes: formNotes,
      });

      toast.success('Đã tạo khoản vay/nợ thành công!');
      setIsCreateModalOpen(false);
      fetchDebtData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo khoản vay/nợ');
    }
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const cleanNumber = repayAmount.replace(/\./g, '').replace(/,/g, '');
    const parsedAmount = parseFloat(cleanNumber);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    try {
      await debtService.addRepayment(selectedDebt.id, {
        amount: parsedAmount,
        notes: repayNotes,
      });

      toast.success('Đã ghi nhận thanh toán thành công!');
      setIsRepayModalOpen(false);
      setSelectedDebt(null);
      setRepayAmount('');
      setRepayNotes('');
      fetchDebtData();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi ghi nhận thanh toán');
    }
  };

  const handleDelete = async (debtId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khoản vay/nợ này không?')) return;
    try {
      await debtService.deleteDebt(debtId);
      toast.success('Đã xóa thành công');
      fetchDebtData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa');
    }
  };

  const filteredDebts = debts.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchDateRange = (() => {
      if (!startDate) return true;
      const debtDate = d.startDate || (d as any).createdAt;
      if (!debtDate) return true;
      const m = moment(debtDate);
      if (startDate && !endDate) {
        return m.isSameOrAfter(moment(startDate).startOf('day'));
      }
      if (startDate && endDate) {
        return m.isBetween(
          moment(startDate).startOf('day'),
          moment(endDate).endOf('day'),
          undefined,
          '[]'
        );
      }
      return true;
    })();

    return matchSearch && matchDateRange;
  });

  const displayPayable = startDate
    ? filteredDebts.filter((d) => d.type === 'PAYABLE').reduce((sum, d) => sum + d.remaining, 0)
    : (summary?.totalPayable ?? 0);

  const displayReceivable = startDate
    ? filteredDebts.filter((d) => d.type === 'RECEIVABLE').reduce((sum, d) => sum + d.remaining, 0)
    : (summary?.totalReceivable ?? 0);

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Quản lý Vay & Nợ</h2>
          <p className="subtitle">Theo dõi khoản vay phải trả và khoản nợ phải thu của bạn</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => openCreateModal('PAYABLE')}>
            + Tạo khoản nợ mới
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <span className="error-icon">⚠️</span> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="alltime-cards animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <div className="summary-stat-card accent-expense">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Tôi Nợ (Payable)</span>
            <div className="summary-stat-icon icon-payable">💸</div>
          </div>
          <div className="summary-stat-value value-payable">{formatCurrency(displayPayable)}</div>
          <div className="summary-stat-subtitle">
            {startDate
              ? `Khoảng: ${moment(startDate).format('DD/MM/YYYY')} ${endDate ? '- ' + moment(endDate).format('DD/MM/YYYY') : ''}`
              : 'Tổng tất cả khoản nợ'}
          </div>
        </div>

        <div className="summary-stat-card accent-income">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Người Khác Nợ (Receivable)</span>
            <div className="summary-stat-icon icon-receivable">💰</div>
          </div>
          <div className="summary-stat-value value-receivable">
            {formatCurrency(displayReceivable)}
          </div>
          <div className="summary-stat-subtitle">
            {startDate
              ? `Khoảng: ${moment(startDate).format('DD/MM/YYYY')} ${endDate ? '- ' + moment(endDate).format('DD/MM/YYYY') : ''}`
              : 'Tổng tất cả khoản cho vay'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - 100% Matching Transactions.tsx */}
      <div className="filter-bar animate-fade-in">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm tiêu đề hoặc ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-select-wrapper select-wrapper-type">
          <Select
            options={[
              { value: '', label: 'Tất cả loại nợ' },
              { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
              { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
            ]}
            value={
              [
                { value: '', label: 'Tất cả loại nợ' },
                { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
              ].find((opt) => opt.value === filterType) || null
            }
            onChange={(option) => setFilterType(option ? option.value : '')}
            classNamePrefix="react-select"
            placeholder="Loại nợ"
            menuPortalTarget={document.body}
          />
        </div>

        <div className="date-range-wrapper">
          <DatePicker
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={(update) => setDateRange(update)}
            isClearable={true}
            placeholderText="Chọn khoảng ngày"
            dateFormat="dd/MM/yyyy"
            className="react-datepicker-input"
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner animate-fade-in">
          <div className="spinner"></div>
          <p>Đang tải danh sách khoản vay...</p>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <p>Không tìm thấy khoản vay/nợ nào phù hợp!</p>
        </div>
      ) : (
        <div className="transactions-table-container animate-fade-in">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Tên khoản nợ / Đối tác</th>
                <th>Loại</th>
                <th>Tổng số tiền</th>
                <th>Đã thanh toán</th>
                <th>Còn lại</th>
                <th>Ngày vay/cho vay</th>
                <th>Hạn chót</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.map((debt) => {
                const percent = Math.min(
                  100,
                  Math.round((debt.paidAmount / debt.totalAmount) * 100)
                );

                return (
                  <tr key={debt.id}>
                    <td className="txn-title-cell">
                      <div className="debt-title-text">{debt.title}</div>
                      {debt.notes && <div className="debt-notes-text">{debt.notes}</div>}
                    </td>
                    <td>
                      <span
                        className={`txn-category-badge ${
                          debt.type === 'PAYABLE' ? 'badge-payable' : 'badge-receivable'
                        }`}
                      >
                        {debt.type === 'PAYABLE' ? 'Tôi nợ' : 'Phải thu'}
                      </span>
                    </td>
                    <td className="txn-amount">{formatCurrency(debt.totalAmount)}</td>
                    <td className="cell-paid">{formatCurrency(debt.paidAmount)}</td>
                    <td className="cell-remaining">{formatCurrency(debt.remaining)}</td>
                    <td className="txn-date">
                      {debt.startDate ? moment(debt.startDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td className="txn-date">
                      {debt.dueDate ? moment(debt.dueDate).format('DD/MM/YYYY') : '—'}
                    </td>
                    <td>
                      <span
                        className={`txn-category-badge ${
                          debt.status === 'COMPLETED'
                            ? 'badge-completed'
                            : debt.status === 'OVERDUE'
                              ? 'badge-overdue-status'
                              : 'badge-pending-status'
                        }`}
                      >
                        {debt.status === 'COMPLETED'
                          ? '🎉 Đã xong'
                          : debt.status === 'OVERDUE'
                            ? '🚨 Quá hạn'
                            : `Đang nợ (${percent}%)`}
                      </span>
                    </td>
                    <td className="txn-actions-cell">
                      <div className="debt-actions-group">
                        {debt.status !== 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setSelectedDebt(debt);
                              setRepayAmount('');
                              setIsRepayModalOpen(true);
                            }}
                            className="btn btn-secondary repay-action-btn"
                            title="Ghi nhận trả/thu tiền"
                          >
                            Trả tiền
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(debt.id)}
                          className="action-btn delete-btn"
                          aria-label="Xóa khoản vay"
                          title="Xóa"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo khoản nợ mới</h3>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              {/* Presets like Transactions.tsx */}
              <div className="form-group">
                <label>Chọn nhanh (Mẫu tiêu đề)</label>
                <div className="presets-container">
                  {activePresets.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="preset-tag-btn"
                      onClick={() => handleApplyPreset(opt)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="debt-type-select">Loại nghĩa vụ</label>
                <Select
                  id="debt-type-select"
                  options={[
                    { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                    { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
                  ]}
                  value={
                    [
                      { value: 'PAYABLE', label: 'Tôi Nợ (Phải Trả)' },
                      { value: 'RECEIVABLE', label: 'Người Khác Nợ (Phải Thu)' },
                    ].find((opt) => opt.value === formType) || null
                  }
                  onChange={(option) => {
                    if (option) setFormType(option.value as DebtType);
                  }}
                  classNamePrefix="react-select"
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-title">Tên khoản nợ / Đối tác</label>
                <input
                  id="debt-title"
                  type="text"
                  placeholder="Ví dụ: Vay mua xe TPBank, Anh Tuấn..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-amount">Số tiền gốc (đ)</label>
                <input
                  id="debt-amount"
                  type="text"
                  placeholder="Ví dụ: 5.000.000"
                  value={formAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setFormAmount)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-startdate">Ngày bắt đầu vay / cho vay</label>
                <DatePicker
                  id="debt-startdate"
                  selected={formStartDate}
                  onChange={(date: Date | null) => setFormStartDate(date)}
                  dateFormat="dd/MM/yyyy"
                  portalId="date-picker-portal"
                  placeholderText="Chọn ngày bắt đầu"
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-duedate">Hạn thanh toán (Ngày phải trả/thu hết)</label>
                <DatePicker
                  id="debt-duedate"
                  selected={formDueDate}
                  onChange={(date: Date | null) => setFormDueDate(date)}
                  dateFormat="dd/MM/yyyy"
                  portalId="date-picker-portal"
                  isClearable={true}
                  placeholderText="Chọn ngày hạn chót (nếu có)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="debt-notes">Ghi chú</label>
                <textarea
                  id="debt-notes"
                  rows={2}
                  placeholder="Ghi chú thêm..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>

              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Tạo khoản nợ
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      {isRepayModalOpen && selectedDebt && (
        <div className="modal-backdrop" onClick={() => setIsRepayModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ghi nhận trả / thu tiền</h3>
              <button className="close-btn" onClick={() => setIsRepayModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleRepaySubmit}>
              <div className="repay-info-box">
                <div className="repay-info-title">{selectedDebt.title}</div>
                <div className="repay-info-remaining">
                  Còn lại: {formatCurrency(selectedDebt.remaining)}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="repay-amount">Số tiền trả đợt này (đ)</label>
                <input
                  id="repay-amount"
                  type="text"
                  placeholder={`Ví dụ: ${formatCurrency(selectedDebt.remaining)}`}
                  value={repayAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setRepayAmount)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="repay-notes">Ghi chú đợt thanh toán</label>
                <input
                  id="repay-notes"
                  type="text"
                  placeholder="VD: Trả đợt 1..."
                  value={repayNotes}
                  onChange={(e) => setRepayNotes(e.target.value)}
                />
              </div>

              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Xác nhận thanh toán
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRepayModalOpen(false)}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
