import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import { Search, Plus, Trash2, Handshake, X, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatNumberInput, parseNumberInput } from '../commons/utils';
import { debtService } from '../services/api';
import type { Debt, DebtType } from '../types/debt';
import { MonthFilter } from './common';
import './Debts.css';
import ConfirmModal from './common/ConfirmModal';

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, Month & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => moment().format('YYYY-MM'));
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

  const fetchDebtData = async () => {
    try {
      setLoading(true);
      setError(null);
      const debtList = await debtService.getDebts(
        filterType ? (filterType as DebtType) : undefined
      );
      setDebts(Array.isArray(debtList) ? debtList : (debtList as any)?.data || []);
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
    setter(formatNumberInput(val));
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
    const parsedAmount = parseNumberInput(formAmount);

    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tên khoản nợ / đối tác');
      return;
    }
    if (parsedAmount <= 0) {
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

    const parsedAmount = parseNumberInput(repayAmount);

    if (parsedAmount <= 0) {
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

  // Confirm Modal State
  const [deleteDebtConfirm, setDeleteDebtConfirm] = useState<{
    isOpen: boolean;
    id: string;
  } | null>(null);

  const handleDelete = (debtId: string) => {
    setDeleteDebtConfirm({ isOpen: true, id: debtId });
  };

  const executeDeleteDebt = async () => {
    if (!deleteDebtConfirm) return;
    const { id } = deleteDebtConfirm;
    setDeleteDebtConfirm(null);
    try {
      await debtService.deleteDebt(id);
      toast.success('Đã xóa khoản vay/nợ thành công');
      fetchDebtData();
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa khoản vay/nợ');
    }
  };

  const startOfMonth = moment(selectedMonth, 'YYYY-MM').startOf('month');
  const endOfMonth = moment(selectedMonth, 'YYYY-MM').endOf('month');

  const filteredDebts = (Array.isArray(debts) ? debts : []).filter((d) => {
    if (!d) return false;
    const debtTitle = d.title || (d as any).personName || '';
    const matchSearch =
      debtTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes || '').toLowerCase().includes(searchQuery.toLowerCase());

    const debtDate = d.startDate || (d as any).createdAt;
    if (!debtDate) return matchSearch;
    const m = moment(debtDate);
    const matchMonth = m.isBetween(startOfMonth, endOfMonth, undefined, '[]');

    return matchSearch && matchMonth;
  });

  const displayPayable = filteredDebts
    .filter((d) => d.type === 'PAYABLE')
    .reduce((sum, d) => sum + (d.remaining ?? (d as any).remainingAmount ?? d.totalAmount ?? 0), 0);

  const displayReceivable = filteredDebts
    .filter((d) => d.type === 'RECEIVABLE')
    .reduce((sum, d) => sum + (d.remaining ?? (d as any).remainingAmount ?? d.totalAmount ?? 0), 0);

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Quản lý Vay & Nợ</h2>
          <p className="subtitle">Theo dõi khoản vay phải trả và khoản nợ phải thu của bạn</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => openCreateModal('PAYABLE')}>
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <AlertTriangle size={18} className="error-icon" /> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="summary-cards-grid animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <div className="summary-stat-card accent-expense">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Tôi Nợ (Payable)</span>
          </div>
          <div className="summary-stat-value value-payable">
            {formatCurrency(Math.abs(displayPayable))}
          </div>
          <div className="summary-stat-subtitle">
            Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}
          </div>
        </div>

        <div className="summary-stat-card accent-income">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Người Khác Nợ (Receivable)</span>
          </div>
          <div className="summary-stat-value value-receivable">
            {formatCurrency(Math.abs(displayReceivable))}
          </div>
          <div className="summary-stat-subtitle">
            Tháng {moment(selectedMonth, 'YYYY-MM').format('MM/YYYY')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - 100% Matching Transactions.tsx */}
      <div className="filter-bar animate-fade-in">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
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

        <div className="date-range-filter-col">
          <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner animate-fade-in">
          <div className="spinner"></div>
          <p>Đang tải danh sách khoản vay...</p>
        </div>
      ) : filteredDebts.length === 0 ? (
        <div
          className="empty-state animate-fade-in"
          style={{ padding: '3rem 1.5rem', textAlign: 'center' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <Handshake size={44} className="empty-icon" />
          </div>
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main)',
            }}
          >
            Không tìm thấy khoản vay/nợ nào phù hợp!
          </h4>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
              maxWidth: '400px',
              margin: '0 auto 1.25rem auto',
            }}
          >
            Tạo khoản nợ mới hoặc điều chỉnh bộ lọc để theo dõi các khoản nợ cần trả và cần thu.
          </p>
          <button
            onClick={() => openCreateModal('PAYABLE')}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', minHeight: '42px', fontWeight: 600 }}
          >
            <Plus size={16} /> Tạo khoản nợ mới
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="debts-table-container transactions-table-container animate-fade-in">
            <table className="debts-table transactions-table">
              <thead>
                <tr>
                  <th>Tên khoản nợ / Đối tác</th>
                  <th>Loại</th>
                  <th className="text-right">Tổng số tiền</th>
                  <th className="text-right">Đã thanh toán</th>
                  <th className="text-right">Còn lại</th>
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
                      <td className="cell-paid" style={{ color: 'var(--income)' }}>
                        {formatCurrency(debt.paidAmount)}
                      </td>
                      <td
                        className="cell-remaining"
                        style={{
                          color: debt.type === 'PAYABLE' ? 'var(--expense)' : 'var(--income)',
                          fontWeight: 'bold',
                        }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </td>
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
                              <ArrowRightLeft size={14} /> Trả tiền
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(debt.id)}
                            className="action-btn delete-btn"
                            aria-label="Xóa khoản vay"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="transactions-mobile-cards animate-fade-in">
            {filteredDebts.map((debt) => {
              const isPayable = debt.type === 'PAYABLE';
              const percent = Math.min(100, Math.round((debt.paidAmount / debt.totalAmount) * 100));

              return (
                <div key={`m-debt-${debt.id}`} className="transaction-mobile-card">
                  <div className="mobile-card-top">
                    <div className="mobile-card-left">
                      <div
                        className={`mobile-card-icon-badge ${isPayable ? 'icon-expense' : 'icon-income'}`}
                      >
                        <Handshake size={18} />
                      </div>
                      <div className="mobile-card-info">
                        <div className="mobile-card-title">{debt.title}</div>
                        {debt.notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {debt.notes}
                          </div>
                        )}
                        <div className="mobile-card-date">
                          <span>
                            {debt.startDate ? moment(debt.startDate).format('DD/MM/YYYY') : '—'}
                            {debt.dueDate
                              ? ` → Hạn: ${moment(debt.dueDate).format('DD/MM/YYYY')}`
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mobile-card-amount-group">
                      <div
                        className="mobile-card-amount"
                        style={{ color: isPayable ? 'var(--expense)' : 'var(--income)' }}
                      >
                        {formatCurrency(Math.abs(debt.remaining))}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Tổng: {formatCurrency(debt.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="mobile-card-tags">
                    <span
                      className={`txn-category-badge ${
                        isPayable ? 'badge-payable' : 'badge-receivable'
                      }`}
                    >
                      {isPayable ? 'Tôi nợ' : 'Phải thu'}
                    </span>
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
                          : `Đã trả ${percent}% (${formatCurrency(debt.paidAmount)})`}
                    </span>
                  </div>

                  <div className="mobile-card-actions">
                    {debt.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDebt(debt);
                          setRepayAmount('');
                          setIsRepayModalOpen(true);
                        }}
                        className="mobile-action-btn edit-btn"
                        title="Ghi nhận trả/thu tiền"
                      >
                        <ArrowRightLeft size={14} /> Trả tiền
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(debt.id)}
                      className="mobile-action-btn delete-btn"
                      title="Xóa khoản nợ"
                    >
                      <Trash2 size={14} /> Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tạo khoản nợ mới</h3>
              <button
                className="close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
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

              <div className="form-row-2col">
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
              </div>

              <div className="form-row-2col">
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
                  <label htmlFor="debt-duedate">Hạn thanh toán</label>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo khoản nợ
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
              <button
                className="close-btn"
                onClick={() => setIsRepayModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRepaySubmit}>
              <div className="repay-info-box">
                <div className="repay-info-title">{selectedDebt.title}</div>
                <div
                  className="repay-info-remaining"
                  style={{
                    color: selectedDebt.type === 'PAYABLE' ? 'var(--expense)' : 'var(--income)',
                    fontWeight: 600,
                  }}
                >
                  Còn lại: {formatCurrency(Math.abs(selectedDebt.remaining))}
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRepayModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác nhận thanh toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Debt Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteDebtConfirm?.isOpen)}
        title="Xóa khoản vay / nợ"
        message="Bạn có chắc chắn muốn xóa khoản vay/nợ này không? Toàn bộ lịch sử thanh toán liên quan sẽ bị xóa."
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={executeDeleteDebt}
        onCancel={() => setDeleteDebtConfirm(null)}
      />
    </div>
  );
}
