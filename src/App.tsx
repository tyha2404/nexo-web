import {
  ArrowLeftRight,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
// Page styles load eagerly, in the original import order: pages share class names
// across these files (e.g. Debts/Planning reuse Transactions.css), so leaving them in
// the lazy chunks made those pages unstyled until the Transactions chunk loaded.
import './components/Auth.css';
import './components/common/MonthFilter.css';
import './components/MonthlyTrendChart.css';
import './components/Dashboard.css';
import './components/Debts.css';
import './components/Pagination.css';
import './components/Targets.css';
import './components/Categories.css';
import './components/Planning.css';
import './components/ReloadPrompt.css';
import './components/Transactions.css';
import './mobile-compact.css';
import { OPEN_ADD_TRANSACTION_EVENT, TransactionType } from './commons/constants';
import { openAddTransaction } from './commons/utils';
import type { User } from './commons/types';
import Auth from './components/Auth';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Debts = lazy(() => import('./components/Debts'));
import type { PlanningSubTab } from './components/Planning';
const Planning = lazy(() => import('./components/Planning'));
import ReloadPrompt from './components/ReloadPrompt';
const Transactions = lazy(() => import('./components/Transactions'));
const AddTransactionModal = lazy(() => import('./components/AddTransactionModal'));
const AIChatWidget = lazy(() =>
  import('./components/chat').then((module) => ({ default: module.AIChatWidget }))
);
import { ApiError, authService } from './services';
import { useRealtimeSync } from './hooks';

export type ActiveTab = 'dashboard' | 'transactions' | 'debts' | 'planning';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const internalNavRef = useRef(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [planningSubTab, setPlanningSubTab] = useState<PlanningSubTab>('targets');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const authAttempt = useRef(0);
  const [aiRequested, setAIRequested] = useState(false);
  // Global quick-add: the most frequent action must be one tap away on every screen
  const [quickAddType, setQuickAddType] = useState<TransactionType | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(new Set());
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const close = (e: PointerEvent) => {
      if (!accountMenuRef.current?.contains(e.target as Node)) setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [accountMenuOpen]);
  useEffect(() => {
    setVisitedTabs((tabs) => new Set([...tabs, activeTab]));
  }, [activeTab]);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  useRealtimeSync({ userId: user?.id });

  const checkAuth = async () => {
    const attempt = ++authAttempt.current;
    setAuthError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const userData = await authService.whoami();
      if (attempt !== authAttempt.current || token !== localStorage.getItem('token')) return;
      localStorage.setItem('nexo-user-id', userData.id);
      setUser(userData);
    } catch (err) {
      console.error('Failed to verify token', err);
      if (attempt !== authAttempt.current || token !== localStorage.getItem('token')) return;
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      } else {
        setAuthError('Không kết nối được máy chủ Nexo. Kiểm tra API đang chạy rồi bấm Thử lại.');
      }
    } finally {
      if (attempt === authAttempt.current) setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };
    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('online', handleAuthChange);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('online', handleAuthChange);
    };
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleOpenAIChat = () => {
    setAIRequested(true);
    window.dispatchEvent(new CustomEvent('open-ai-chat'));
  };

  const handleLogoutRef = useRef<() => void>(() => undefined);
  const handleLogout = () => {
    authAttempt.current++;
    localStorage.removeItem('token');
    localStorage.removeItem('nexo-user-id');
    for (const key of Object.keys(localStorage))
      if (key.startsWith('nexo-draft:')) localStorage.removeItem(key);
    setUser(null);
    setAuthError(null);
    setAIRequested(false);
    void authService.logout().catch(() => undefined);
  };
  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  });

  useEffect(() => {
    const handleOpenAdd = (event: Event) => {
      const type = (event as CustomEvent<TransactionType>).detail;
      setQuickAddType(type in TransactionType ? type : TransactionType.EXPENSE);
    };
    window.addEventListener(OPEN_ADD_TRANSACTION_EVENT, handleOpenAdd);
    return () => window.removeEventListener(OPEN_ADD_TRANSACTION_EVENT, handleOpenAdd);
  }, []);

  // Any API call rejected with 401 means the session is gone (expired or revoked)
  useEffect(() => {
    const handleAuthExpired = () => {
      if (!localStorage.getItem('token')) return;
      toast.info('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', {
        toastId: 'auth-expired',
      });
      handleLogoutRef.current();
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const quickAddDefaultType =
    activeTab === 'transactions' ? transactionType : TransactionType.EXPENSE;

  const getPathForTab = (
    tab: ActiveTab,
    opts?: { transactionType?: TransactionType; planningSubTab?: PlanningSubTab }
  ) => {
    switch (tab) {
      case 'transactions':
        return opts?.transactionType
          ? `/transactions/${opts.transactionType.toLowerCase()}`
          : '/transactions';
      case 'debts':
        return '/debts';
      case 'planning':
        return opts?.planningSubTab ? `/planning/${opts.planningSubTab}` : '/planning';
      case 'dashboard':
      default:
        return '/';
    }
  };

  // Parse the current URL hash path into App state (deep-link / back-forward support)
  const applyPathToState = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean); // e.g. ["transactions","income"]
    const tab = segments[0] as ActiveTab | undefined;
    setActiveTab(
      tab === 'transactions' || tab === 'debts' || tab === 'planning' ? tab : 'dashboard'
    );

    if (tab === 'transactions') {
      const typeSegment = segments[1]?.toUpperCase();
      if (
        typeSegment === TransactionType.INCOME ||
        typeSegment === TransactionType.EXPENSE ||
        typeSegment === TransactionType.INVESTMENT
      ) {
        setTransactionType(typeSegment);
      }
    } else if (tab === 'planning') {
      const sub = segments[1];
      if (sub === 'categories' || sub === 'targets') {
        setPlanningSubTab(sub as PlanningSubTab);
      }
    }
  };

  // Keep state in sync with the URL (covers browser back/forward + typed deep links)
  useEffect(() => {
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    applyPathToState(location.pathname);
  }, [location.pathname]);

  const handleNavigate = (tab: string) => {
    let targetTab: ActiveTab;
    let opts: { transactionType?: TransactionType; planningSubTab?: PlanningSubTab } = {};

    if (tab === 'income') {
      targetTab = 'transactions';
      opts = { transactionType: TransactionType.INCOME };
    } else if (tab === 'expenses') {
      targetTab = 'transactions';
      opts = { transactionType: TransactionType.EXPENSE };
    } else if (tab === 'investment') {
      targetTab = 'transactions';
      opts = { transactionType: TransactionType.INVESTMENT };
    } else if (tab === 'transactions') {
      targetTab = 'transactions';
      opts = { transactionType };
    } else if (tab === 'debts') {
      targetTab = 'debts';
    } else if (tab === 'categories') {
      targetTab = 'planning';
      opts = { planningSubTab: 'categories' };
    } else if (tab === 'targets') {
      targetTab = 'planning';
      opts = { planningSubTab: 'targets' };
    } else if (tab === 'planning') {
      targetTab = 'planning';
      opts = { planningSubTab };
    } else {
      targetTab = 'dashboard';
    }

    setActiveTab(targetTab);
    if (opts.transactionType) setTransactionType(opts.transactionType);
    if (opts.planningSubTab) setPlanningSubTab(opts.planningSubTab);

    internalNavRef.current = true;
    navigate(getPathForTab(targetTab, opts));
  };

  // Global shortcut: Cmd/Ctrl+K opens AI
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleOpenAIChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (authLoading) {
    return (
      <div className="loading-screen animate-fade-in">
        <div className="spinner"></div>
        <p>Đang khởi tạo Nexo...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-outer-container animate-fade-in flex-col">
        {authError && (
          <div role="alert" className="mb-4 text-center">
            <p>{authError}</p>
            <button className="btn btn-secondary" onClick={() => void checkAuth()}>
              Thử lại
            </button>
          </div>
        )}
        {/* Auth fires 'auth-changed', which already re-runs checkAuth */}
        <Auth />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div
          className="mobile-brand brand-clickable"
          onClick={() => handleNavigate('dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleNavigate('dashboard');
            }
          }}
          aria-label="Trang chủ Nexo"
        >
          <img src="/logo-transparent.svg" className="mobile-logo" alt="Nexo logo" />
          <span className="brand-name">Nexo Portal</span>
        </div>
        <div className="mobile-header-actions">
          <button
            className="mobile-header-btn"
            onClick={handleOpenAIChat}
            aria-label="Trợ lý AI"
            title="Trợ lý Nexo AI"
          >
            <Sparkles size={16} color="var(--primary)" />
          </button>
          <div className="mobile-account" ref={accountMenuRef}>
            <button
              className="mobile-header-btn mobile-avatar-btn"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label="Tài khoản"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              {user.username ? user.username[0].toUpperCase() : 'U'}
            </button>
            {accountMenuOpen && (
              <div className="mobile-account-menu" role="menu">
                <div className="mobile-account-info">
                  <span className="username">{user.username}</span>
                  <span className="user-email">{user.email}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className="mobile-account-item"
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="mobile-account-item mobile-account-logout"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    handleLogout();
                  }}
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Sidebar (Hidden on mobile/PWA since Bottom Navigation is active) */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div
            className="sidebar-brand brand-clickable"
            onClick={() => handleNavigate('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleNavigate('dashboard');
              }
            }}
            aria-label="Trang chủ Nexo"
          >
            <img src="/logo-transparent.svg" className="sidebar-logo" alt="Nexo logo" />
            <span className="brand-name">Nexo Portal</span>
          </div>
        </div>

        {/* 4 Primary Navigation Hubs */}
        <nav className="nav-menu">
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <span className="nav-icon">
              <LayoutDashboard size={18} />
            </span>
            <span className="nav-text">Tổng quan</span>
          </button>

          <button
            onClick={() => handleNavigate('transactions')}
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
            aria-current={activeTab === 'transactions' ? 'page' : undefined}
          >
            <span className="nav-icon">
              <ArrowLeftRight size={18} />
            </span>
            <span className="nav-text">Giao dịch</span>
          </button>

          <button
            onClick={() => handleNavigate('debts')}
            className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`}
            aria-current={activeTab === 'debts' ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Handshake size={18} />
            </span>
            <span className="nav-text">Sổ Vay & Nợ</span>
          </button>

          <button
            onClick={() => handleNavigate('planning')}
            className={`nav-item ${activeTab === 'planning' ? 'active' : ''}`}
            aria-current={activeTab === 'planning' ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Target size={18} />
            </span>
            <span className="nav-text">Kế hoạch & Mục tiêu</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-profile-footer">
            <div className="avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
            <div className="user-details">
              <span className="username" title={user.username}>
                {user.username}
              </span>
              <span className="user-email" title={user.email}>
                {user.email}
              </span>
            </div>
            <div className="sidebar-footer-actions">
              <button
                className="theme-toggle-btn"
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-label="Đổi giao diện sáng/tối"
                title="Đổi giao diện"
              >
                {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={handleLogout}
                className="icon-only-btn logout-btn"
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Desktop Top Header with Sleek AI Action Button */}
        <header className="main-desktop-header">
          <div className="header-page-info">
            <h1 className="header-page-title">
              {activeTab === 'dashboard' && 'Tổng quan'}
              {activeTab === 'transactions' && 'Sổ giao dịch'}
              {activeTab === 'debts' && 'Sổ Vay & Nợ'}
              {activeTab === 'planning' && 'Kế hoạch & Mục tiêu'}
            </h1>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="btn btn-primary header-add-btn"
              onClick={() => openAddTransaction(quickAddDefaultType)}
            >
              <Plus size={16} /> Ghi giao dịch
            </button>
            <button
              className="header-ai-btn"
              onClick={handleOpenAIChat}
              type="button"
              aria-label="Trợ lý AI"
              title="Trợ lý Nexo AI (⌘K)"
            >
              <div className="ai-btn-glow" />
              <Sparkles size={16} className="ai-btn-icon" />
              <span className="ai-btn-text">Trợ lý AI</span>
              <kbd className="ai-btn-kbd">⌘K</kbd>
            </button>

            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Đổi giao diện sáng/tối"
              title="Đổi giao diện"
            >
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Views — kept mounted to preserve filter/scroll state per tab */}
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}
        >
          {visitedTabs.has('dashboard') && (
            <Suspense fallback={<p role="status">Đang tải tổng quan...</p>}>
              <Dashboard onNavigate={handleNavigate} />
            </Suspense>
          )}
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'transactions' ? 'block' : 'none' }}
        >
          {visitedTabs.has('transactions') && (
            <Suspense fallback={<p role="status">Đang tải giao dịch...</p>}>
              <Transactions type={transactionType} />
            </Suspense>
          )}
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'debts' ? 'block' : 'none' }}
        >
          {visitedTabs.has('debts') && (
            <Suspense fallback={<p role="status">Đang tải sổ nợ...</p>}>
              <Debts />
            </Suspense>
          )}
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'planning' ? 'block' : 'none' }}
        >
          {visitedTabs.has('planning') && (
            <Suspense fallback={<p role="status">Đang tải kế hoạch...</p>}>
              <Planning
                initialSubTab={planningSubTab}
                onSubTabChange={setPlanningSubTab}
                onNavigate={handleNavigate}
              />
            </Suspense>
          )}
        </div>
      </main>

      {/* Mobile PWA Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          onClick={() => handleNavigate('dashboard')}
          aria-label="Tổng quan"
        >
          <div className="bottom-nav-icon">
            <LayoutDashboard size={20} />
          </div>
          <span className="bottom-nav-label">Tổng quan</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          aria-current={activeTab === 'transactions' ? 'page' : undefined}
          onClick={() => handleNavigate('transactions')}
          aria-label="Giao dịch"
        >
          <div className="bottom-nav-icon">
            <ArrowLeftRight size={20} />
          </div>
          <span className="bottom-nav-label">Giao dịch</span>
        </button>

        <button
          type="button"
          className="bottom-nav-item bottom-nav-add"
          onClick={() => openAddTransaction(quickAddDefaultType)}
          aria-label="Ghi giao dịch mới"
        >
          <div className="bottom-nav-add-icon">
            <Plus size={23} strokeWidth={2.25} />
          </div>
          <span className="bottom-nav-label">Ghi mới</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'debts' ? 'active' : ''}`}
          aria-current={activeTab === 'debts' ? 'page' : undefined}
          onClick={() => handleNavigate('debts')}
          aria-label="Sổ Vay & Nợ"
        >
          <div className="bottom-nav-icon">
            <Handshake size={20} />
          </div>
          <span className="bottom-nav-label">Vay & Nợ</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'planning' ? 'active' : ''}`}
          aria-current={activeTab === 'planning' ? 'page' : undefined}
          onClick={() => handleNavigate('planning')}
          aria-label="Kế hoạch & Mục tiêu"
        >
          <div className="bottom-nav-icon">
            <Target size={20} />
          </div>
          <span className="bottom-nav-label">Kế hoạch</span>
        </button>
      </nav>

      {quickAddType && (
        <Suspense fallback={null}>
          <AddTransactionModal
            open
            initialType={quickAddType}
            onClose={() => setQuickAddType(null)}
          />
        </Suspense>
      )}
      <ReloadPrompt />
      {aiRequested && (
        <Suspense
          fallback={
            <p className="pwa-toast" role="status">
              Đang mở trợ lý...
            </p>
          }
        >
          <AIChatWidget user={user} initiallyOpen />
        </Suspense>
      )}
      <ToastContainer theme={theme} position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default App;
