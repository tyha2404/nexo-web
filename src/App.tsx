import {
  ArrowLeftRight,
  Handshake,
  LayoutDashboard,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { TransactionType } from './commons/constants';
import type { User } from './commons/types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Debts from './components/Debts';
import Planning, { type PlanningSubTab } from './components/Planning';
import ReloadPrompt from './components/ReloadPrompt';
import Transactions from './components/Transactions';
import Wallets from './components/Wallets';
import { AIChatWidget } from './components/chat';
import { NotificationToggle } from './components/common';
import { authService } from './services/api';

export type ActiveTab = 'dashboard' | 'transactions' | 'wallets' | 'debts' | 'planning';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const internalNavRef = useRef(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [planningSubTab, setPlanningSubTab] = useState<PlanningSubTab>('targets');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
  );

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const userData = await authService.whoami();
      setUser(userData);
    } catch (err) {
      console.error('Failed to verify token', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };
    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
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
    window.dispatchEvent(new CustomEvent('open-ai-chat'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const getPathForTab = (
    tab: ActiveTab,
    opts?: { transactionType?: TransactionType; planningSubTab?: PlanningSubTab }
  ) => {
    switch (tab) {
      case 'transactions':
        return opts?.transactionType
          ? `/transactions/${opts.transactionType.toLowerCase()}`
          : '/transactions';
      case 'wallets':
        return '/wallets';
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
      tab === 'transactions' || tab === 'wallets' || tab === 'debts' || tab === 'planning'
        ? tab
        : 'dashboard'
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
    } else if (tab === 'wallets') {
      targetTab = 'wallets';
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
      <div className="auth-outer-container animate-fade-in">
        <Auth onSuccess={checkAuth} />
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
          <NotificationToggle />
          <button
            className="mobile-header-btn"
            onClick={handleOpenAIChat}
            aria-label="Trợ lý AI"
            title="Trợ lý Nexo AI"
          >
            <Sparkles size={16} color="var(--primary)" />
          </button>
          <button
            className="mobile-header-btn"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle Theme"
            title="Đổi giao diện"
          >
            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="mobile-header-btn mobile-logout-btn"
            onClick={handleLogout}
            aria-label="Đăng xuất"
            title={`Đăng xuất (${user.username || ''})`}
          >
            <LogOut size={16} />
          </button>
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
          >
            <span className="nav-icon">
              <LayoutDashboard size={18} />
            </span>
            <span className="nav-text">Tổng quan</span>
          </button>

          <button
            onClick={() => handleNavigate('transactions')}
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <ArrowLeftRight size={18} />
            </span>
            <span className="nav-text">Giao dịch</span>
          </button>

          <button
            onClick={() => handleNavigate('wallets')}
            className={`nav-item ${activeTab === 'wallets' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Wallet size={18} />
            </span>
            <span className="nav-text">Tài sản & Ví</span>
          </button>

          <button
            onClick={() => handleNavigate('debts')}
            className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Handshake size={18} />
            </span>
            <span className="nav-text">Sổ Vay & Nợ</span>
          </button>

          <button
            onClick={() => handleNavigate('planning')}
            className={`nav-item ${activeTab === 'planning' ? 'active' : ''}`}
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
                aria-label="Toggle Theme"
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
              {activeTab === 'wallets' && 'Tài sản & Ví'}
              {activeTab === 'debts' && 'Sổ Vay & Nợ'}
              {activeTab === 'planning' && 'Kế hoạch & Mục tiêu'}
            </h1>
          </div>

          <div className="header-actions">
            <NotificationToggle />
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
              aria-label="Toggle Theme"
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
          <Dashboard onNavigate={handleNavigate} />
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'transactions' ? 'block' : 'none' }}
        >
          <Transactions type={transactionType} />
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'wallets' ? 'block' : 'none' }}
        >
          <Wallets />
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'debts' ? 'block' : 'none' }}
        >
          <Debts />
        </div>
        <div
          className="content-view animate-fade-in"
          style={{ display: activeTab === 'planning' ? 'block' : 'none' }}
        >
          <Planning
            initialSubTab={planningSubTab}
            onSubTabChange={setPlanningSubTab}
            onNavigate={handleNavigate}
          />
        </div>
      </main>

      {/* Mobile PWA Bottom Navigation Bar */}
      <nav className="bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
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
          className={`bottom-nav-item ${activeTab === 'wallets' ? 'active' : ''}`}
          onClick={() => handleNavigate('wallets')}
          aria-label="Tài sản & Ví"
        >
          <div className="bottom-nav-icon">
            <Wallet size={20} />
          </div>
          <span className="bottom-nav-label">Tài sản</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'debts' ? 'active' : ''}`}
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
          onClick={() => handleNavigate('planning')}
          aria-label="Kế hoạch & Mục tiêu"
        >
          <div className="bottom-nav-icon">
            <Target size={20} />
          </div>
          <span className="bottom-nav-label">Kế hoạch</span>
        </button>
      </nav>

      <ReloadPrompt />
      <AIChatWidget user={user} />
      <ToastContainer theme="dark" position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default App;
