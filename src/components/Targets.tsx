import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { targetService } from '../services/api';
import type { TargetSummaryResponse } from '../commons/types';
import { formatCurrency } from '../commons/utils';
import { toast } from 'react-toastify';
import './Targets.css';

export default function Targets() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => moment().toDate());
  const [targetSummary, setTargetSummary] = useState<TargetSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter tab / type in list table ('ALL' | 'EXPENSE' | 'INVESTMENT')
  const [filterType, setFilterType] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetTypeForm, setTargetTypeForm] = useState<'EXPENSE' | 'INVESTMENT'>('EXPENSE');
  const [amount, setAmount] = useState<string>('');

  const fetchTargetData = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);
      const m = moment(date);
      const targetParams = { month: m.month() + 1, year: m.year() };
      const data = await targetService.getSummary(targetParams);
      setTargetSummary(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu mục tiêu tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargetData(selectedMonth);
  }, [selectedMonth]);

  const handleAmountChange = (val: string) => {
    const cleanNumber = val.replace(/\D/g, '');
    if (cleanNumber === '') {
      setAmount('');
      return;
    }
    const formatted = parseInt(cleanNumber, 10).toLocaleString('vi-VN');
    setAmount(formatted);
  };

  const openAddModal = (defaultType: 'EXPENSE' | 'INVESTMENT' = 'EXPENSE') => {
    setTargetTypeForm(defaultType);

    const existingAmount =
      defaultType === 'EXPENSE'
        ? targetSummary?.expense?.targetAmount
        : targetSummary?.investment?.targetAmount;

    setAmount(existingAmount ? existingAmount.toLocaleString('vi-VN') : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = amount.replace(/\./g, '').replace(/,/g, '');
    const parsedAmount = parseFloat(cleanNumber);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Vui lòng nhập số tiền mục tiêu hợp lệ');
      return;
    }

    try {
      const m = moment(selectedMonth);
      await targetService.upsertTarget({
        targetType: targetTypeForm,
        targetAmount: parsedAmount,
        month: m.month() + 1,
        year: m.year(),
      });

      toast.success(
        `Đã thiết lập ${targetTypeForm === 'EXPENSE' ? 'hạn mức chi tiêu' : 'mục tiêu đầu tư'} thành công!`
      );
      setIsModalOpen(false);
      fetchTargetData(selectedMonth);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu mục tiêu tài chính');
    }
  };

  // Prepare table rows from targetSummary
  const targetRows = [];
  if (targetSummary?.expense) {
    targetRows.push({
      id: 'EXPENSE',
      type: 'EXPENSE',
      title: 'Hạn mức Chi tiêu Tháng',
      targetAmount: targetSummary.expense.targetAmount,
      currentAmount: targetSummary.expense.spentAmount,
      remainingAmount: targetSummary.expense.remainingAmount,
      status: targetSummary.expense.isOverBudget ? 'OVER_BUDGET' : 'NORMAL',
    });
  } else {
    targetRows.push({
      id: 'EXPENSE',
      type: 'EXPENSE',
      title: 'Hạn mức Chi tiêu Tháng',
      targetAmount: 0,
      currentAmount: 0,
      remainingAmount: 0,
      status: 'NOT_SET',
    });
  }

  if (targetSummary?.investment) {
    targetRows.push({
      id: 'INVESTMENT',
      type: 'INVESTMENT',
      title: 'Mục tiêu Đầu tư Tháng',
      targetAmount: targetSummary.investment.targetAmount,
      currentAmount: targetSummary.investment.investedAmount,
      remainingAmount: targetSummary.investment.remainingAmount,
      status: targetSummary.investment.isTargetReached ? 'COMPLETED' : 'NORMAL',
    });
  } else {
    targetRows.push({
      id: 'INVESTMENT',
      type: 'INVESTMENT',
      title: 'Mục tiêu Đầu tư Tháng',
      targetAmount: 0,
      currentAmount: 0,
      remainingAmount: 0,
      status: 'NOT_SET',
    });
  }

  const filteredRows = targetRows.filter((row) => {
    if (!filterType) return true;
    return row.type === filterType;
  });

  return (
    <div className="transactions-view">
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Quản lý Mục tiêu Tài chính</h2>
          <p className="subtitle">
            Theo dõi và đặt hạn mức chi tiêu & mục tiêu đầu tư tích lũy của bạn
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={() => openAddModal('EXPENSE')}>
            + Thêm mục tiêu
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <span className="error-icon">⚠️</span> {error}
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="summary-cards-grid animate-fade-in">
        <div className="summary-stat-card accent-expense">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Hạn Mức Chi Tiêu Tháng</span>
            <div
              className="summary-stat-icon"
              style={{ background: 'rgba(248, 113, 113, 0.15)', color: '#f87171' }}
            >
              💳
            </div>
          </div>
          <div className="summary-stat-value" style={{ color: '#f87171' }}>
            {targetSummary?.expense
              ? formatCurrency(targetSummary.expense.targetAmount)
              : 'Chưa đặt'}
          </div>
          <div className="summary-stat-subtitle">
            {targetSummary?.expense
              ? `Đã chi: ${formatCurrency(targetSummary.expense.spentAmount)} (Còn lại: ${formatCurrency(targetSummary.expense.remainingAmount)})`
              : 'Hãy đặt hạn mức để kiểm soát thu chi'}
          </div>
        </div>

        <div className="summary-stat-card accent-income">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Mục Tiêu Đầu Tư Tháng</span>
            <div
              className="summary-stat-icon"
              style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}
            >
              📈
            </div>
          </div>
          <div className="summary-stat-value" style={{ color: '#34d399' }}>
            {targetSummary?.investment
              ? formatCurrency(targetSummary.investment.targetAmount)
              : 'Chưa đặt'}
          </div>
          <div className="summary-stat-subtitle">
            {targetSummary?.investment
              ? `Đã đầu tư: ${formatCurrency(targetSummary.investment.investedAmount)}`
              : 'Tích lũy tài chính cho tương lai'}
          </div>
        </div>

        <div className="summary-stat-card accent-primary">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Gợi Ý Chi Tiêu / Ngày</span>
            <div
              className="summary-stat-icon"
              style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}
            >
              📅
            </div>
          </div>
          <div className="summary-stat-value" style={{ color: '#38bdf8' }}>
            {targetSummary?.expense && targetSummary.expense.dailyAllowance > 0
              ? formatCurrency(targetSummary.expense.dailyAllowance) + '/ngày'
              : targetSummary?.expense?.isOverBudget
                ? '🚨 0 đ (Vượt hạn mức)'
                : '—'}
          </div>
          <div className="summary-stat-subtitle">
            {targetSummary?.daysRemaining
              ? `Còn ${targetSummary.daysRemaining} ngày trong tháng`
              : 'Tính toán theo số ngày còn lại'}
          </div>
        </div>
      </div>

      {/* Filter bar - cloning Transactions filter layout */}
      <div className="filter-bar animate-fade-in">
        <div className="category-select-wrapper" style={{ minWidth: '220px' }}>
          <Select
            options={[
              { value: '', label: 'Tất cả Mục tiêu' },
              { value: 'EXPENSE', label: 'Hạn mức Chi tiêu' },
              { value: 'INVESTMENT', label: 'Mục tiêu Đầu tư' },
            ]}
            value={
              [
                { value: '', label: 'Tất cả Mục tiêu' },
                { value: 'EXPENSE', label: 'Hạn mức Chi tiêu' },
                { value: 'INVESTMENT', label: 'Mục tiêu Đầu tư' },
              ].find((opt) => opt.value === filterType) || null
            }
            onChange={(option) => setFilterType(option ? option.value : '')}
            classNamePrefix="react-select"
            placeholder="Tất cả Mục tiêu"
            menuPortalTarget={document.body}
          />
        </div>
        <div className="date-range-wrapper">
          <DatePicker
            selected={selectedMonth}
            onChange={(date: Date | null) => {
              if (date) setSelectedMonth(date);
            }}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            placeholderText="Chọn tháng"
            className="react-datepicker-input"
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner animate-fade-in">
          <div className="spinner"></div>
          <p>Đang tải mục tiêu tài chính...</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="empty-state animate-fade-in">
          <p>Chưa có mục tiêu nào được thiết lập cho tháng này!</p>
        </div>
      ) : (
        <div className="transactions-table-container animate-fade-in">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Loại mục tiêu</th>
                <th>Số tiền mục tiêu</th>
                <th>Thực tế hiện tại</th>
                <th>Trạng thái / Tiến độ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const percent =
                  row.targetAmount > 0
                    ? Math.min(100, Math.round((row.currentAmount / row.targetAmount) * 100))
                    : 0;

                return (
                  <tr key={row.id}>
                    <td className="txn-title-cell">
                      <span>{row.title}</span>
                    </td>
                    <td className="txn-amount">
                      {row.targetAmount > 0 ? formatCurrency(row.targetAmount) : 'Chưa đặt'}
                    </td>
                    <td className="txn-date">{formatCurrency(row.currentAmount)}</td>
                    <td>
                      {row.targetAmount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span
                            className="txn-category-badge"
                            style={{
                              alignSelf: 'flex-start',
                              background:
                                row.status === 'OVER_BUDGET'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : row.status === 'COMPLETED'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : 'var(--primary-glow)',
                              color:
                                row.status === 'OVER_BUDGET'
                                  ? '#ef4444'
                                  : row.status === 'COMPLETED'
                                    ? '#10b981'
                                    : 'var(--primary)',
                            }}
                          >
                            {row.status === 'OVER_BUDGET'
                              ? '🚨 Vượt hạn mức'
                              : row.status === 'COMPLETED'
                                ? '🎉 Đã hoàn thành'
                                : `${percent}% hoàn thành`}
                          </span>
                        </div>
                      ) : (
                        <span className="txn-category-badge" style={{ color: 'var(--text-muted)' }}>
                          Chưa thiết lập
                        </span>
                      )}
                    </td>
                    <td className="txn-actions-cell">
                      <button
                        onClick={() => openAddModal(row.type as 'EXPENSE' | 'INVESTMENT')}
                        className="action-btn edit-btn"
                        aria-label={`Sửa ${row.title}`}
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
                          style={{ display: 'inline-block', verticalAlign: 'middle' }}
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal overlay (100% cloned from Transactions modal) */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm mục tiêu</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="target-type-select">Loại mục tiêu</label>
                <Select
                  id="target-type-select"
                  options={[
                    { value: 'EXPENSE', label: 'Hạn mức Chi tiêu' },
                    { value: 'INVESTMENT', label: 'Mục tiêu Đầu tư' },
                  ]}
                  value={
                    [
                      { value: 'EXPENSE', label: 'Hạn mức Chi tiêu' },
                      { value: 'INVESTMENT', label: 'Mục tiêu Đầu tư' },
                    ].find((opt) => opt.value === targetTypeForm) || null
                  }
                  onChange={(option) => {
                    if (option) {
                      const newType = option.value as 'EXPENSE' | 'INVESTMENT';
                      setTargetTypeForm(newType);
                      const existing =
                        newType === 'EXPENSE'
                          ? targetSummary?.expense?.targetAmount
                          : targetSummary?.investment?.targetAmount;
                      setAmount(existing ? existing.toLocaleString('vi-VN') : '');
                    }
                  }}
                  classNamePrefix="react-select"
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="form-group">
                <label htmlFor="target-amount-input">Số tiền (đ)</label>
                <input
                  id="target-amount-input"
                  type="text"
                  placeholder="Ví dụ: 10.000.000"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="target-month">Áp dụng cho tháng</label>
                <DatePicker
                  id="target-month"
                  selected={selectedMonth}
                  onChange={(date: Date | null) => {
                    if (date) setSelectedMonth(date);
                  }}
                  dateFormat="MM/yyyy"
                  showMonthYearPicker
                  portalId="date-picker-portal"
                />
              </div>

              <div className="button-group">
                <button type="submit" className="btn btn-primary">
                  Lưu mục tiêu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
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
