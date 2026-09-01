import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import {
  CreditCard,
  Wallet,
  Plus,
  ArrowRightLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  Sparkles,
  X,
  FolderTree,
  CheckCircle2,
  ShieldAlert,
  History,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '../commons/utils';
import { walletService, statementService } from '../services/api';
import type { Wallet as WalletTypeModel, WalletType, CreditCardStatement } from '../commons/types';
import './Wallets.css';

const WALLET_TYPE_OPTIONS = [
  { value: 'CREDIT', label: '💳 Thẻ tín dụng (Credit Card)' },
  { value: 'BANK', label: '🏦 Tài khoản ngân hàng (Bank)' },
  { value: 'CASH', label: '💵 Tiền mặt (Cash)' },
  { value: 'E_WALLET', label: '📱 Ví điện tử (MoMo, ZaloPay...)' },
  { value: 'SAVINGS', label: '🐖 Sổ tiết kiệm (Savings)' },
  { value: 'JAR', label: '🏺 Hũ chi tiêu (Jar)' },
];

const PRESETS = [
  {
    label: '💳 Thẻ ACB (30tr)',
    type: 'CREDIT' as WalletType,
    name: 'Thẻ tín dụng ACB',
    icon: '💳',
    limit: '30.000.000',
    statement: '20',
    due: '5',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '💳 Thẻ Techcombank (50tr)',
    type: 'CREDIT' as WalletType,
    name: 'Thẻ Techcombank Visa',
    icon: '💳',
    limit: '50.000.000',
    statement: '25',
    due: '10',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '💳 Thẻ VPBank (20tr)',
    type: 'CREDIT' as WalletType,
    name: 'Thẻ VPBank StepUp',
    icon: '💳',
    limit: '20.000.000',
    statement: '15',
    due: '30',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '🏦 Tài khoản Techcombank',
    type: 'BANK' as WalletType,
    name: 'Tài khoản Techcombank',
    icon: '🏦',
    limit: '0',
    statement: '',
    due: '',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '🏦 Tài khoản Vietcombank',
    type: 'BANK' as WalletType,
    name: 'Tài khoản Vietcombank (Lương)',
    icon: '🏦',
    limit: '0',
    statement: '',
    due: '',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '📱 Ví MoMo',
    type: 'E_WALLET' as WalletType,
    name: 'Ví MoMo',
    icon: '📱',
    limit: '0',
    statement: '',
    due: '',
    statementBalance: '0',
    minPayment: '0',
  },
  {
    label: '💵 Tiền mặt',
    type: 'CASH' as WalletType,
    name: 'Tiền mặt',
    icon: '💵',
    limit: '0',
    statement: '',
    due: '',
    statementBalance: '0',
    minPayment: '0',
  },
];

export default function Wallets() {
  const [wallets, setWallets] = useState<WalletTypeModel[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State: 'ALL' | 'CREDIT' | 'NORMAL'
  const [activeTab, setActiveTab] = useState<'ALL' | 'CREDIT' | 'NORMAL'>('CREDIT');

  // Modal States
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [editingWallet, setEditingWallet] = useState<WalletTypeModel | null>(null);
  const [selectedRepayWallet, setSelectedRepayWallet] = useState<WalletTypeModel | null>(null);

  // Statement History States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedCardForHistory, setSelectedCardForHistory] = useState<WalletTypeModel | null>(
    null
  );
  const [statements, setStatements] = useState<CreditCardStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState<boolean>(false);

  // Create/Edit Statement Modal States
  const [isStatementFormOpen, setIsStatementFormOpen] = useState<boolean>(false);
  const [editingStatement, setEditingStatement] = useState<CreditCardStatement | null>(null);
  const [stmtMonth, setStmtMonth] = useState<number>(moment().month() + 1);
  const [stmtYear, setStmtYear] = useState<number>(moment().year());
  const [stmtDate, setStmtDate] = useState<Date | null>(moment().toDate());
  const [stmtDueDate, setStmtDueDate] = useState<Date | null>(moment().add(15, 'days').toDate());
  const [stmtBalanceInput, setStmtBalanceInput] = useState<string>('');
  const [stmtMinPayInput, setStmtMinPayInput] = useState<string>('');
  const [stmtPrevBalanceInput, setStmtPrevBalanceInput] = useState<string>('0');
  const [stmtPaidInput, setStmtPaidInput] = useState<string>('0');
  const [stmtNote, setStmtNote] = useState<string>('');

  // Form State - Wallet
  const [formName, setFormName] = useState<string>('Thẻ tín dụng ACB');
  const [formType, setFormType] = useState<WalletType>('CREDIT');
  const [formBalance, setFormBalance] = useState<string>('0');
  const [formIcon, setFormIcon] = useState<string>('💳');
  const [formCreditLimit, setFormCreditLimit] = useState<string>('30.000.000');
  const [formStatementDay, setFormStatementDay] = useState<string>('20');
  const [formDueDay, setFormDueDay] = useState<string>('5');
  const [formStatementBalance, setFormStatementBalance] = useState<string>('0');
  const [formMinimumPayment, setFormMinimumPayment] = useState<string>('0');
  const [formPreviousBalance, setFormPreviousBalance] = useState<string>('0');
  const [formIsIncludedInTotal, setFormIsIncludedInTotal] = useState<boolean>(false);

  // Form State - Transfer
  const [fromWalletId, setFromWalletId] = useState<string>('');
  const [toWalletId, setToWalletId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferFee, setTransferFee] = useState<string>('0');
  const [transferNote, setTransferNote] = useState<string>('');
  const [transferDate, setTransferDate] = useState<Date | null>(moment().toDate());

  const fetchWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await walletService.getWallets();
      setWallets(res.wallets || []);
      setTotalBalance(res.totalBalance || 0);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách ví');
      toast.error('Không thể tải danh sách ví: ' + (err.message || 'Lỗi server'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStatements = async (walletId?: string) => {
    try {
      setLoadingStatements(true);
      const res = await statementService.list({ walletId });
      setStatements(res.items || []);
    } catch (err: any) {
      toast.error('Không thể tải lịch sử sao kê: ' + (err.message || 'Lỗi'));
    } finally {
      setLoadingStatements(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const formatDotNumber = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('vi-VN');
  };

  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    setter(formatDotNumber(val));
  };

  const openCreateModal = () => {
    setEditingWallet(null);
    setFormName('Thẻ tín dụng ACB');
    setFormType('CREDIT');
    setFormBalance('0');
    setFormIcon('💳');
    setFormCreditLimit('30.000.000');
    setFormStatementDay('20');
    setFormDueDay('5');
    setFormStatementBalance('0');
    setFormMinimumPayment('0');
    setFormPreviousBalance('0');
    setFormIsIncludedInTotal(false);
    setIsWalletModalOpen(true);
  };

  const openEditModal = (w: WalletTypeModel) => {
    setEditingWallet(w);
    setFormName(w.name);
    setFormType(w.type);
    setFormBalance(w.balance ? formatDotNumber(Math.abs(w.balance).toString()) : '0');
    setFormIcon(w.icon || '💳');
    setFormCreditLimit(w.creditLimit ? formatDotNumber(w.creditLimit.toString()) : '0');
    setFormStatementDay(w.statementDay ? w.statementDay.toString() : '');
    setFormDueDay(w.dueDay ? w.dueDay.toString() : '');
    setFormStatementBalance(
      w.statementBalance ? formatDotNumber(w.statementBalance.toString()) : '0'
    );
    setFormMinimumPayment(w.minimumPayment ? formatDotNumber(w.minimumPayment.toString()) : '0');
    setFormPreviousBalance(w.previousBalance ? formatDotNumber(w.previousBalance.toString()) : '0');
    setFormIsIncludedInTotal(w.isIncludedInTotal);
    setIsWalletModalOpen(true);
  };

  const handleApplyPreset = (p: (typeof PRESETS)[0]) => {
    setFormName(p.name);
    setFormType(p.type);
    setFormIcon(p.icon);
    setFormCreditLimit(p.limit);
    setFormStatementDay(p.statement);
    setFormDueDay(p.due);
    setFormStatementBalance(p.statementBalance);
    setFormMinimumPayment(p.minPayment);
    setFormPreviousBalance('0');
    setFormIsIncludedInTotal(p.type !== 'CREDIT');
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.warning('Vui lòng nhập tên ví / thẻ');
      return;
    }

    const parseNum = (str: string) => {
      const clean = str.replace(/\./g, '').replace(/,/g, '');
      return parseFloat(clean) || 0;
    };

    try {
      const payload: any = {
        name: formName.trim(),
        type: formType,
        balance: parseNum(formBalance),
        icon: formIcon,
        isIncludedInTotal: formIsIncludedInTotal,
      };

      if (formType === 'CREDIT') {
        payload.creditLimit = parseNum(formCreditLimit);
        payload.statementDay = parseInt(formStatementDay, 10) || 0;
        payload.dueDay = parseInt(formDueDay, 10) || 0;
        payload.statementBalance = parseNum(formStatementBalance);
        payload.minimumPayment = parseNum(formMinimumPayment);
        payload.previousBalance = parseNum(formPreviousBalance);
      }

      if (editingWallet) {
        await walletService.updateWallet(editingWallet.id, payload);
        toast.success('Cập nhật ví / thẻ thành công!');
      } else {
        await walletService.createWallet(payload);
        toast.success('Thêm ví / thẻ mới thành công!');
      }

      setIsWalletModalOpen(false);
      fetchWallets();
    } catch (err: any) {
      toast.error('Lỗi khi lưu ví / thẻ: ' + (err.message || 'Lỗi server'));
    }
  };

  const handleDeleteWallet = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) return;
    try {
      await walletService.deleteWallet(id);
      toast.success(`Đã xóa "${name}"`);
      fetchWallets();
    } catch (err: any) {
      toast.error('Không thể xóa ví: ' + (err.message || 'Lỗi server'));
    }
  };

  // Statement History Handlers
  const openHistoryModal = (targetWallet: WalletTypeModel) => {
    setSelectedCardForHistory(targetWallet);
    setIsHistoryModalOpen(true);
    fetchStatements(targetWallet.id);
  };

  const openCreateStatementModal = () => {
    if (!selectedCardForHistory) return;
    setEditingStatement(null);
    const now = moment();
    setStmtMonth(now.month() + 1);
    setStmtYear(now.year());

    // Calculate dates based on card statementDay and dueDay
    const stmtDayNum = selectedCardForHistory.statementDay || 20;
    const dueDayNum = selectedCardForHistory.dueDay || 5;

    const calculatedStmtDate = moment().date(stmtDayNum);
    const calculatedDueDate = moment().add(1, 'month').date(dueDayNum);

    setStmtDate(calculatedStmtDate.toDate());
    setStmtDueDate(calculatedDueDate.toDate());
    setStmtBalanceInput(
      selectedCardForHistory.statementBalance
        ? formatDotNumber(selectedCardForHistory.statementBalance.toString())
        : ''
    );
    setStmtMinPayInput(
      selectedCardForHistory.minimumPayment
        ? formatDotNumber(selectedCardForHistory.minimumPayment.toString())
        : ''
    );
    setStmtPrevBalanceInput('0');
    setStmtPaidInput('0');
    setStmtNote(`Sao kê kỳ tháng ${now.format('MM/YYYY')} - ${selectedCardForHistory.name}`);
    setIsStatementFormOpen(true);
  };

  const openEditStatementModal = (s: CreditCardStatement) => {
    setEditingStatement(s);
    setStmtMonth(s.statementMonth);
    setStmtYear(s.statementYear);
    setStmtDate(moment(s.statementDate).toDate());
    setStmtDueDate(moment(s.dueDate).toDate());
    setStmtBalanceInput(formatDotNumber(s.statementBalance.toString()));
    setStmtMinPayInput(formatDotNumber(s.minimumPayment.toString()));
    setStmtPrevBalanceInput(formatDotNumber(s.previousBalance.toString()));
    setStmtPaidInput(formatDotNumber(s.paidAmount.toString()));
    setStmtNote(s.note || '');
    setIsStatementFormOpen(true);
  };

  const handleSaveStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardForHistory) return;

    const parseNum = (str: string) => {
      const clean = str.replace(/\./g, '').replace(/,/g, '');
      return parseFloat(clean) || 0;
    };

    const bal = parseNum(stmtBalanceInput);
    if (bal <= 0) {
      toast.warning('Dư nợ sao kê phải lớn hơn 0');
      return;
    }

    try {
      const payload: any = {
        walletId: selectedCardForHistory.id,
        statementMonth: stmtMonth,
        statementYear: stmtYear,
        statementDate: stmtDate
          ? moment(stmtDate).format('YYYY-MM-DD')
          : moment().format('YYYY-MM-DD'),
        dueDate: stmtDueDate
          ? moment(stmtDueDate).format('YYYY-MM-DD')
          : moment().format('YYYY-MM-DD'),
        statementBalance: bal,
        minimumPayment: parseNum(stmtMinPayInput) || Math.max(50000, Math.round(bal * 0.05)),
        previousBalance: parseNum(stmtPrevBalanceInput),
        paidAmount: parseNum(stmtPaidInput),
        note: stmtNote,
      };

      if (editingStatement) {
        await statementService.update(editingStatement.id, payload);
        toast.success('Cập nhật kỳ sao kê thành công!');
      } else {
        await statementService.create(payload);
        toast.success('Ghi nhận kỳ sao kê mới thành công!');
      }

      setIsStatementFormOpen(false);
      fetchStatements(selectedCardForHistory.id);
      fetchWallets();
    } catch (err: any) {
      toast.error('Lỗi khi lưu kỳ sao kê: ' + (err.message || 'Lỗi server'));
    }
  };

  const handleDeleteStatement = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kỳ sao kê này?')) return;
    try {
      await statementService.delete(id);
      toast.success('Đã xóa kỳ sao kê');
      if (selectedCardForHistory) {
        fetchStatements(selectedCardForHistory.id);
      }
    } catch (err: any) {
      toast.error('Lỗi khi xóa kỳ sao kê: ' + (err.message || 'Lỗi server'));
    }
  };

  const openRepayCreditModal = (targetWallet: WalletTypeModel, specificAmount?: number) => {
    setSelectedRepayWallet(targetWallet);
    setToWalletId(targetWallet.id);
    const source = wallets.find(
      (w) => w.id !== targetWallet.id && w.type !== 'CREDIT' && w.balance > 0
    );
    setFromWalletId(source ? source.id : '');

    const initialAmount =
      specificAmount !== undefined
        ? specificAmount
        : targetWallet.statementBalance && targetWallet.statementBalance > 0
          ? targetWallet.statementBalance
          : targetWallet.outstandingDebt || Math.abs(targetWallet.balance);

    setTransferAmount(initialAmount > 0 ? formatDotNumber(initialAmount.toString()) : '');
    setTransferFee('0');
    setTransferNote(`Thanh toán sao kê ${targetWallet.name}`);
    setTransferDate(moment().toDate());
    setIsTransferModalOpen(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWalletId || !toWalletId) {
      toast.warning('Vui lòng chọn ví nguồn và ví đích');
      return;
    }
    const cleanAmount = transferAmount.replace(/\./g, '').replace(/,/g, '');
    const amountNum = parseFloat(cleanAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.warning('Số tiền chuyển phải lớn hơn 0');
      return;
    }

    try {
      await walletService.transferMoney({
        fromWalletId,
        toWalletId,
        amount: amountNum,
        fee: parseFloat(transferFee) || 0,
        note: transferNote,
        transferDate: transferDate ? moment(transferDate).format('YYYY-MM-DD') : undefined,
      });
      toast.success('Chuyển tiền / thanh toán thành công!');
      setIsTransferModalOpen(false);
      fetchWallets();
      if (selectedCardForHistory) {
        fetchStatements(selectedCardForHistory.id);
      }
    } catch (err: any) {
      toast.error('Lỗi chuyển tiền: ' + (err.message || 'Lỗi server'));
    }
  };

  // Group Wallets
  const creditCards = wallets.filter((w) => w.type === 'CREDIT');
  const normalWallets = wallets.filter((w) => w.type !== 'CREDIT');

  const totalCreditLimit = creditCards.reduce((sum, w) => sum + (w.creditLimit || 0), 0);
  const totalOutstandingDebt = creditCards.reduce(
    (sum, w) => sum + (w.outstandingDebt || Math.abs(w.balance)),
    0
  );
  const totalAvailableCredit = creditCards.reduce(
    (sum, w) => sum + (w.availableCredit || Math.max(0, (w.creditLimit || 0) + w.balance)),
    0
  );

  const displayedWallets =
    activeTab === 'CREDIT' ? creditCards : activeTab === 'NORMAL' ? normalWallets : wallets;

  return (
    <div className="transactions-view">
      {/* 1. Standard Header */}
      <header className="transactions-header animate-fade-in">
        <div className="transactions-title">
          <h2>Quản lý Tài khoản & Thẻ</h2>
          <p className="subtitle">
            Theo dõi số dư các ví, thẻ tín dụng, sao kê và lịch sử dư nợ từng tháng
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelectedRepayWallet(null);
              setIsTransferModalOpen(true);
            }}
          >
            <ArrowRightLeft size={16} /> Chuyển tiền / Trả nợ
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Thêm Thẻ / Ví mới
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner animate-fade-in">
          <AlertTriangle size={18} className="error-icon" /> {error}
        </div>
      )}

      {/* 2. Unified 4 KPI Summary Cards */}
      <div className="summary-cards-grid animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <div className="summary-stat-card accent-income">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Tổng Tài Sản Trong Ví</span>
            <div className="kpi-icon-badge kpi-badge-teal">
              <Wallet size={20} />
            </div>
          </div>
          <div className="summary-stat-value value-receivable">{formatCurrency(totalBalance)}</div>
          <div className="summary-stat-subtitle">Đã tính các tài khoản thanh toán</div>
        </div>

        <div className="summary-stat-card accent-neutral">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Tổng Hạn Mức Tín Dụng</span>
            <div className="kpi-icon-badge kpi-badge-blue">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="summary-stat-value" style={{ color: '#38bdf8' }}>
            {formatCurrency(totalCreditLimit)}
          </div>
          <div className="summary-stat-subtitle">{creditCards.length} thẻ đang hoạt động</div>
        </div>

        <div className="summary-stat-card accent-expense">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Dư Nợ Đã Quẹt</span>
            <div className="kpi-icon-badge kpi-badge-rose">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="summary-stat-value value-payable">
            {formatCurrency(totalOutstandingDebt)}
          </div>
          <div className="summary-stat-subtitle">Cần thanh toán trước ngày đến hạn</div>
        </div>

        <div className="summary-stat-card accent-investment">
          <div className="summary-stat-header">
            <span className="summary-stat-title">Hạn Mức Khả Dụng</span>
            <div className="kpi-icon-badge kpi-badge-purple">
              <Sparkles size={20} />
            </div>
          </div>
          <div className="summary-stat-value" style={{ color: '#a78bfa' }}>
            {formatCurrency(totalAvailableCredit)}
          </div>
          <div className="summary-stat-subtitle">Hạn mức còn lại có thể chi tiêu</div>
        </div>
      </div>

      {/* 3. Category Tabs Filter */}
      <div className="list-header-tabs animate-fade-in" style={{ marginBottom: '1.25rem' }}>
        <div className="category-tabs">
          <button
            type="button"
            className={`category-tab flex items-center gap-1.5 ${
              activeTab === 'CREDIT' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('CREDIT')}
          >
            <CreditCard size={15} />
            <span>Thẻ Tín Dụng ({creditCards.length})</span>
          </button>
          <button
            type="button"
            className={`category-tab flex items-center gap-1.5 ${
              activeTab === 'NORMAL' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('NORMAL')}
          >
            <Building2 size={15} />
            <span>Tài Khoản & Ví ({normalWallets.length})</span>
          </button>
          <button
            type="button"
            className={`category-tab flex items-center gap-1.5 ${
              activeTab === 'ALL' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('ALL')}
          >
            <FolderTree size={15} />
            <span>Tất Cả ({wallets.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Unified Data Table View */}
      {loading ? (
        <div className="loading-spinner animate-fade-in">
          <div className="spinner"></div>
          <p>Đang tải danh sách tài khoản & thẻ...</p>
        </div>
      ) : displayedWallets.length === 0 ? (
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
            <CreditCard size={44} className="empty-icon" />
          </div>
          <h4
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              margin: '0 0 0.5rem 0',
              color: 'var(--text-main)',
            }}
          >
            {activeTab === 'CREDIT' ? 'Chưa có thẻ tín dụng nào' : 'Không tìm thấy tài khoản nào'}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Nhấn nút <strong>"Thêm Thẻ / Ví mới"</strong> ở trên để tạo thẻ ACB hoặc tài khoản ngân
            hàng của bạn.
          </p>
        </div>
      ) : (
        <div className="debts-table-container animate-fade-in">
          <table className="debts-table">
            <thead>
              <tr>
                <th>Tên Thẻ / Tài khoản</th>
                <th>Phân loại</th>
                <th>Hạn mức / Vốn</th>
                <th>Dư nợ sao kê kỳ này</th>
                <th>Tối thiểu cần trả</th>
                <th>Khả dụng / Số dư</th>
                <th>Chu kỳ sao kê</th>
                <th>Tình trạng</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedWallets.map((wallet) => {
                const isCredit = wallet.type === 'CREDIT';
                const limit = wallet.creditLimit || 0;
                const debt = wallet.outstandingDebt || Math.abs(wallet.balance);
                const stmtBalance = wallet.statementBalance ?? (isCredit ? debt : 0);
                const minPay =
                  wallet.minimumPayment ??
                  (isCredit && stmtBalance > 0 ? Math.max(50000, stmtBalance * 0.05) : 0);
                const available = isCredit
                  ? wallet.availableCredit || Math.max(0, limit - debt)
                  : wallet.balance;
                const usedPercent =
                  isCredit && limit > 0 ? Math.min(100, Math.round((debt / limit) * 100)) : 0;

                return (
                  <tr key={wallet.id}>
                    <td className="txn-title-cell">
                      <div className="wallet-row-title">
                        <span className="wallet-row-icon">{wallet.icon || '💳'}</span>
                        <div>
                          <div className="debt-title-text">{wallet.name}</div>
                          {wallet.allocationPercent && wallet.allocationPercent > 0 ? (
                            <div className="debt-notes-text">
                              Phân bổ: {wallet.allocationPercent}%
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`txn-category-badge ${
                          isCredit ? 'badge-payable' : 'badge-receivable'
                        }`}
                      >
                        {wallet.type === 'CREDIT' && 'Thẻ tín dụng'}
                        {wallet.type === 'BANK' && 'Ngân hàng'}
                        {wallet.type === 'CASH' && 'Tiền mặt'}
                        {wallet.type === 'E_WALLET' && 'Ví điện tử'}
                        {wallet.type === 'SAVINGS' && 'Tiết kiệm'}
                        {wallet.type === 'JAR' && 'Hũ chi tiêu'}
                      </span>
                    </td>
                    <td className="txn-amount">{isCredit ? formatCurrency(limit) : '—'}</td>
                    {/* Dư nợ sao kê kỳ này */}
                    <td>
                      {isCredit ? (
                        <div>
                          <div
                            style={{
                              color: stmtBalance > 0 ? 'var(--expense)' : 'var(--text-main)',
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(stmtBalance)}
                          </div>
                          {wallet.dueDay ? (
                            <span className="badge-due-warning">Hạn: Ngày {wallet.dueDay}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {/* Số tiền thanh toán tối thiểu */}
                    <td>
                      {isCredit ? (
                        <div>
                          <div
                            style={{
                              color: minPay > 0 ? '#eab308' : 'var(--text-muted)',
                              fontWeight: 500,
                            }}
                          >
                            {formatCurrency(minPay)}
                          </div>
                          {minPay > 0 ? <span className="badge-minpay-sub">Min 5%</span> : null}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    {/* Hạn mức khả dụng / Số dư */}
                    <td
                      className="cell-remaining"
                      style={{
                        color: available >= 0 ? 'var(--income)' : 'var(--expense)',
                        fontWeight: 'bold',
                      }}
                    >
                      {formatCurrency(available)}
                    </td>
                    <td className="txn-date">
                      {isCredit && (wallet.statementDay || wallet.dueDay) ? (
                        <div className="statement-cycle-text">
                          <div>Sao kê: Ngày {wallet.statementDay || '--'}</div>
                          <div className="due-day-sub">Hạn trả: Ngày {wallet.dueDay || '--'}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {isCredit ? (
                        <div className="table-progress-wrap">
                          <div className="table-progress-bg">
                            <div
                              className={`table-progress-fill ${
                                usedPercent > 80 ? 'danger' : usedPercent > 50 ? 'warning' : 'safe'
                              }`}
                              style={{ width: `${usedPercent}%` }}
                            />
                          </div>
                          <span className="table-progress-text">{usedPercent}% hạn mức</span>
                        </div>
                      ) : (
                        <span className="badge-completed">Đang hoạt động</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        {isCredit ? (
                          <>
                            <button
                              type="button"
                              className="btn-history-mini"
                              onClick={() => openHistoryModal(wallet)}
                              title="Xem lịch sử dư nợ từng kỳ sao kê"
                            >
                              <History size={13} />
                              <span>Lịch sử</span>
                            </button>
                            <button
                              type="button"
                              className="btn-repay-mini"
                              onClick={() => openRepayCreditModal(wallet)}
                              title="Thanh toán sao kê thẻ"
                            >
                              <ArrowRightLeft size={13} />
                              <span>Trả nợ</span>
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="action-btn btn-edit"
                          onClick={() => openEditModal(wallet)}
                          title="Chỉnh sửa"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="action-btn btn-delete"
                          onClick={() => handleDeleteWallet(wallet.id, wallet.name)}
                          title="Xóa ví"
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
      )}

      {/* 5. Modal: Thêm / Sửa Thẻ & Ví */}
      {isWalletModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsWalletModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingWallet ? 'Chỉnh sửa Ví / Thẻ' : 'Thêm Ví / Thẻ Tín Dụng Mới'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsWalletModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveWallet}>
              {/* Presets */}
              {!editingWallet && (
                <div className="form-group">
                  <label>Chọn mẫu có sẵn</label>
                  <div className="presets-container">
                    {PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="preset-tag-btn"
                        onClick={() => handleApplyPreset(p)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Loại ví / thẻ tài chính</label>
                <Select
                  options={WALLET_TYPE_OPTIONS}
                  value={WALLET_TYPE_OPTIONS.find((o) => o.value === formType)}
                  onChange={(opt) => {
                    if (opt) {
                      setFormType(opt.value as WalletType);
                      if (opt.value === 'CREDIT') {
                        setFormIcon('💳');
                        setFormIsIncludedInTotal(false);
                      } else if (opt.value === 'BANK') {
                        setFormIcon('🏦');
                        setFormIsIncludedInTotal(true);
                      } else if (opt.value === 'CASH') {
                        setFormIcon('💵');
                        setFormIsIncludedInTotal(true);
                      } else if (opt.value === 'E_WALLET') {
                        setFormIcon('📱');
                        setFormIsIncludedInTotal(true);
                      }
                    }
                  }}
                  classNamePrefix="react-select"
                  menuPortalTarget={document.body}
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Tên ví / Tên thẻ</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Thẻ tín dụng ACB, Techcombank..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Biểu tượng (Icon)</label>
                  <input
                    type="text"
                    style={{ textAlign: 'center' }}
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                  />
                </div>
              </div>

              {formType === 'CREDIT' ? (
                <>
                  <div className="form-group">
                    <label>Hạn mức tín dụng được cấp (đ)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 30.000.000"
                      value={formCreditLimit}
                      onChange={(e) => handleAmountChange(e.target.value, setFormCreditLimit)}
                      required
                    />
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label>Ngày chốt sao kê (1 - 31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ví dụ: 20"
                        value={formStatementDay}
                        onChange={(e) => setFormStatementDay(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ngày đến hạn trả (1 - 31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="Ví dụ: 5"
                        value={formDueDay}
                        onChange={(e) => setFormDueDay(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label>Dư nợ sao kê kỳ này (đ)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 5.000.000"
                        value={formStatementBalance}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleAmountChange(val, setFormStatementBalance);
                          const num = parseFloat(val.replace(/\D/g, '')) || 0;
                          if (num > 0) {
                            setFormMinimumPayment(
                              formatDotNumber(Math.round(num * 0.05).toString())
                            );
                          }
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>Số tiền tối thiểu cần trả (đ)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 250.000"
                        value={formMinimumPayment}
                        onChange={(e) => handleAmountChange(e.target.value, setFormMinimumPayment)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Dư nợ kỳ trước chuyển sang (đ)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 0"
                      value={formPreviousBalance}
                      onChange={(e) => handleAmountChange(e.target.value, setFormPreviousBalance)}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Số dư hiện tại (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 10.000.000"
                    value={formBalance}
                    onChange={(e) => handleAmountChange(e.target.value, setFormBalance)}
                  />
                </div>
              )}

              <div className="form-checkbox-row">
                <input
                  type="checkbox"
                  id="includeInTotal"
                  checked={formIsIncludedInTotal}
                  onChange={(e) => setFormIsIncludedInTotal(e.target.checked)}
                />
                <label htmlFor="includeInTotal">
                  Tính số dư ví này vào Tổng tài sản ròng tích lũy (Khuyên tắt cho thẻ tín dụng)
                </label>
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsWalletModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingWallet ? 'Lưu thay đổi' : 'Tạo ví / thẻ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Lịch sử Dư Nợ Từng Kỳ Sao Kê */}
      {isHistoryModalOpen && selectedCardForHistory && (
        <div className="modal-backdrop" onClick={() => setIsHistoryModalOpen(false)}>
          <div
            className="modal-content modal-content-large animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3>Lịch sử Sao kê: {selectedCardForHistory.name}</h3>
                <p className="subtitle" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Hạn mức: {formatCurrency(selectedCardForHistory.creditLimit || 0)} • Chu kỳ sao
                  kê: Ngày {selectedCardForHistory.statementDay || '--'} hàng tháng
                </p>
              </div>
              <div className="header-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={openCreateStatementModal}
                >
                  <Plus size={14} /> Ghi nhận kỳ sao kê mới
                </button>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => setIsHistoryModalOpen(false)}
                  aria-label="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {loadingStatements ? (
              <div className="loading-spinner animate-fade-in" style={{ padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Đang tải lịch sử các kỳ sao kê...</p>
              </div>
            ) : statements.length === 0 ? (
              <div
                className="empty-state animate-fade-in"
                style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}
              >
                <FileText
                  size={40}
                  className="empty-icon"
                  style={{ opacity: 0.6, margin: '0 auto 0.5rem auto' }}
                />
                <h4 style={{ margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>
                  Chưa có lịch sử sao kê nào cho thẻ này
                </h4>
                <p
                  style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0 0 1rem 0' }}
                >
                  Bấm nút <strong>"Ghi nhận kỳ sao kê mới"</strong> để lưu lại sao kê tháng của bạn.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={openCreateStatementModal}
                >
                  <Plus size={16} /> Ghi nhận kỳ sao kê đầu tiên
                </button>
              </div>
            ) : (
              <div
                className="debts-table-container animate-fade-in"
                style={{ maxHeight: '420px', overflowY: 'auto' }}
              >
                <table className="debts-table">
                  <thead>
                    <tr>
                      <th>Kỳ sao kê</th>
                      <th>Ngày chốt</th>
                      <th>Hạn trả</th>
                      <th>Dư nợ sao kê</th>
                      <th>Tối thiểu</th>
                      <th>Đã thanh toán</th>
                      <th>Còn thiếu</th>
                      <th>Trạng thái</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((s) => {
                      return (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600 }}>
                            Tháng{' '}
                            {s.statementMonth < 10 ? `0${s.statementMonth}` : s.statementMonth}/
                            {s.statementYear}
                          </td>
                          <td className="txn-date">
                            {moment(s.statementDate).format('DD/MM/YYYY')}
                          </td>
                          <td className="txn-date">{moment(s.dueDate).format('DD/MM/YYYY')}</td>
                          <td
                            className="txn-amount"
                            style={{ color: 'var(--expense)', fontWeight: 600 }}
                          >
                            {formatCurrency(s.statementBalance)}
                          </td>
                          <td style={{ color: '#eab308' }}>{formatCurrency(s.minimumPayment)}</td>
                          <td style={{ color: 'var(--income)' }}>{formatCurrency(s.paidAmount)}</td>
                          <td
                            style={{
                              fontWeight: 'bold',
                              color: s.remainingAmount > 0 ? 'var(--expense)' : 'var(--income)',
                            }}
                          >
                            {formatCurrency(s.remainingAmount)}
                          </td>
                          <td>
                            <span
                              className={`txn-category-badge ${
                                s.status === 'PAID'
                                  ? 'badge-completed'
                                  : s.status === 'OVERDUE'
                                    ? 'badge-overdue-status'
                                    : s.status === 'PARTIALLY_PAID'
                                      ? 'badge-pending-status'
                                      : 'badge-payable'
                              }`}
                            >
                              {s.status === 'PAID' && '🎉 Đã xong'}
                              {s.status === 'PARTIALLY_PAID' && '⏳ Đang trả'}
                              {s.status === 'UNPAID' && '⚠️ Chưa trả'}
                              {s.status === 'OVERDUE' && '🚨 Quá hạn'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions-cell">
                              {s.remainingAmount > 0 ? (
                                <button
                                  type="button"
                                  className="btn-repay-mini"
                                  onClick={() => {
                                    openRepayCreditModal(selectedCardForHistory, s.remainingAmount);
                                  }}
                                  title="Thanh toán số tiền còn thiếu cho kỳ này"
                                >
                                  <ArrowRightLeft size={13} />
                                  <span>Trả nợ</span>
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="action-btn btn-edit"
                                onClick={() => openEditStatementModal(s)}
                                title="Sửa thông tin sao kê"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="action-btn btn-delete"
                                onClick={() => handleDeleteStatement(s.id)}
                                title="Xóa kỳ sao kê"
                              >
                                <Trash2 size={14} />
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
          </div>
        </div>
      )}

      {/* 7. Modal: Ghi nhận / Sửa Kỳ Sao Kê Mới */}
      {isStatementFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsStatementFormOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStatement ? 'Sửa kỳ sao kê' : 'Ghi nhận kỳ sao kê mới'}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsStatementFormOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveStatement}>
              <div className="form-row-2col">
                <div className="form-group">
                  <label>Tháng sao kê (1 - 12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={stmtMonth}
                    onChange={(e) => setStmtMonth(parseInt(e.target.value, 10) || 1)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Năm sao kê</label>
                  <input
                    type="number"
                    min="2000"
                    value={stmtYear}
                    onChange={(e) => setStmtYear(parseInt(e.target.value, 10) || 2026)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Ngày chốt sao kê</label>
                  <DatePicker
                    selected={stmtDate}
                    onChange={(d: Date | null) => setStmtDate(d)}
                    dateFormat="dd/MM/yyyy"
                    portalId="date-picker-portal"
                  />
                </div>
                <div className="form-group">
                  <label>Ngày đến hạn trả</label>
                  <DatePicker
                    selected={stmtDueDate}
                    onChange={(d: Date | null) => setStmtDueDate(d)}
                    dateFormat="dd/MM/yyyy"
                    portalId="date-picker-portal"
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Dư nợ sao kê kỳ này (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 5.000.000"
                    value={stmtBalanceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleAmountChange(val, setStmtBalanceInput);
                      const num = parseFloat(val.replace(/\D/g, '')) || 0;
                      if (num > 0) {
                        setStmtMinPayInput(formatDotNumber(Math.round(num * 0.05).toString()));
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số tiền tối thiểu cần trả (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 250.000"
                    value={stmtMinPayInput}
                    onChange={(e) => handleAmountChange(e.target.value, setStmtMinPayInput)}
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Dư nợ kỳ trước chuyển sang (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0"
                    value={stmtPrevBalanceInput}
                    onChange={(e) => handleAmountChange(e.target.value, setStmtPrevBalanceInput)}
                  />
                </div>
                <div className="form-group">
                  <label>Đã thanh toán (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0"
                    value={stmtPaidInput}
                    onChange={(e) => handleAmountChange(e.target.value, setStmtPaidInput)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú sao kê</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Sao kê tháng 08/2026 - ACB Visa"
                  value={stmtNote}
                  onChange={(e) => setStmtNote(e.target.value)}
                />
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsStatementFormOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStatement ? 'Lưu thay đổi' : 'Ghi nhận kỳ sao kê'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Chuyển tiền / Trả nợ thẻ */}
      {isTransferModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal-content animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedRepayWallet
                  ? `Thanh toán thẻ: ${selectedRepayWallet.name}`
                  : 'Chuyển tiền / Trả nợ'}
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setIsTransferModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              {/* Quick Option Buttons for Credit Card Repayment */}
              {selectedRepayWallet && selectedRepayWallet.type === 'CREDIT' ? (
                <div className="form-group repay-quick-options">
                  <label>Chọn nhanh mức thanh toán sao kê:</label>
                  <div className="quick-pay-chips">
                    {selectedRepayWallet.statementBalance &&
                    selectedRepayWallet.statementBalance > 0 ? (
                      <button
                        type="button"
                        className="quick-pay-chip full-statement"
                        onClick={() =>
                          setTransferAmount(
                            formatDotNumber(selectedRepayWallet.statementBalance!.toString())
                          )
                        }
                      >
                        <CheckCircle2 size={14} />
                        <span>
                          Toàn bộ sao kê: {formatCurrency(selectedRepayWallet.statementBalance)}{' '}
                          (Miễn lãi)
                        </span>
                      </button>
                    ) : null}

                    {selectedRepayWallet.minimumPayment &&
                    selectedRepayWallet.minimumPayment > 0 ? (
                      <button
                        type="button"
                        className="quick-pay-chip min-payment"
                        onClick={() =>
                          setTransferAmount(
                            formatDotNumber(selectedRepayWallet.minimumPayment!.toString())
                          )
                        }
                      >
                        <ShieldAlert size={14} />
                        <span>
                          Tối thiểu: {formatCurrency(selectedRepayWallet.minimumPayment)} (Tránh
                          phạt)
                        </span>
                      </button>
                    ) : null}

                    {selectedRepayWallet.outstandingDebt &&
                    selectedRepayWallet.outstandingDebt > 0 ? (
                      <button
                        type="button"
                        className="quick-pay-chip total-debt"
                        onClick={() =>
                          setTransferAmount(
                            formatDotNumber(selectedRepayWallet.outstandingDebt!.toString())
                          )
                        }
                      >
                        <span>
                          Toàn bộ dư nợ: {formatCurrency(selectedRepayWallet.outstandingDebt)}
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="form-group">
                <label>Từ ví nguồn (Tài khoản thanh toán)</label>
                <select
                  value={fromWalletId}
                  onChange={(e) => setFromWalletId(e.target.value)}
                  required
                >
                  <option value="">-- Chọn ví nguồn --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon || '💰'} {w.name} (Số dư: {formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Đến ví đích (Thẻ tín dụng / Ví nhận)</label>
                <select
                  value={toWalletId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    setToWalletId(targetId);
                    const target = wallets.find((w) => w.id === targetId);
                    setSelectedRepayWallet(target || null);
                  }}
                  required
                >
                  <option value="">-- Chọn ví đích --</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.icon || '💰'} {w.name}{' '}
                      {w.type === 'CREDIT'
                        ? `(Sao kê cần trả: ${formatCurrency(
                            w.statementBalance || w.outstandingDebt || Math.abs(w.balance)
                          )})`
                        : `(Số dư: ${formatCurrency(w.balance)})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Số tiền chuyển / trả nợ (đ)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 5.000.000"
                    value={transferAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setTransferAmount)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phí chuyển (nếu có)</label>
                  <input
                    type="number"
                    value={transferFee}
                    onChange={(e) => setTransferFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group">
                  <label>Ngày thực hiện</label>
                  <DatePicker
                    selected={transferDate}
                    onChange={(d: Date | null) => setTransferDate(d)}
                    dateFormat="dd/MM/yyyy"
                    portalId="date-picker-portal"
                  />
                </div>
                <div className="form-group">
                  <label>Ghi chú chuyển tiền</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Trả nợ sao kê thẻ ACB"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsTransferModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Xác nhận chuyển tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
