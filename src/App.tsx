import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  Target,
  Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import { TransactionType } from './commons/constants';
import type { User } from './commons/types';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Planning, { type PlanningSubTab } from './components/Planning';
import ReloadPrompt from './components/ReloadPrompt';
import Transactions from './components/Transactions';
import Wallets from './components/Wallets';
import { AIChatWidget } from './components/chat';
import { authService } from './services/api';

export type ActiveTab = 'dashboard' | 'transactions' | 'wallets' | 'planning';

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [planningSubTab, setPlanningSubTab] = useState<PlanningSubTab>('targets');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const handleOpenAIChat = () => {
    window.dispatchEvent(new CustomEvent('open-ai-chat'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleNavigate = (tab: string) => {
    if (tab === 'income') {
      setTransactionType(TransactionType.INCOME);
      setActiveTab('transactions');
    } else if (tab === 'expenses') {
      setTransactionType(TransactionType.EXPENSE);
      setActiveTab('transactions');
    } else if (tab === 'investment') {
      setTransactionType(TransactionType.INVESTMENT);
      setActiveTab('transactions');
    } else if (tab === 'transactions') {
      setActiveTab('transactions');
    } else if (tab === 'debts' || tab === 'wallets') {
      setActiveTab('wallets');
    } else if (tab === 'categories') {
      setPlanningSubTab('categories');
      setActiveTab('planning');
    } else if (tab === 'targets') {
      setPlanningSubTab('targets');
      setActiveTab('planning');
    } else if (tab === 'planning') {
      setActiveTab('planning');
    } else {
      setActiveTab('dashboard');
    }
    setIsSidebarOpen(false);
  };

  // Global shortcut for opening AI Copilot (Cmd+K / Ctrl+K)
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
        <button
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
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
          <img src="/favicon.svg" className="mobile-logo" alt="Nexo logo" />
          <span className="brand-name">Nexo Portal</span>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          aria-label="Toggle Theme"
        >
          {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Desktop & Drawer Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
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
            <img src="/favicon.svg" className="sidebar-logo" alt="Nexo logo" />
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
                onClick={() => {
                  handleLogout();
                  setIsSidebarOpen(false);
                }}
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
              {activeTab === 'planning' && 'Kế hoạch & Mục tiêu'}
            </h1>
          </div>

          <div className="header-actions">
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

        {/* Content View based on activeTab */}
        <div className="content-view animate-fade-in" key={activeTab}>
          {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
          {activeTab === 'transactions' && <Transactions type={transactionType} />}
          {activeTab === 'wallets' && <Wallets />}
          {activeTab === 'planning' && (
            <Planning
              initialSubTab={planningSubTab}
              onSubTabChange={setPlanningSubTab}
              onNavigate={handleNavigate}
            />
          )}
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
