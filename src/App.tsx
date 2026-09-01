import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Scale,
  Sun,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { TransactionType } from './commons/constants';
import type { User } from './commons/types';
import Auth from './components/Auth';
import Categories from './components/Categories';
import Dashboard from './components/Dashboard';
import Debts from './components/Debts';
import ReloadPrompt from './components/ReloadPrompt';
import Targets from './components/Targets';
import Transactions from './components/Transactions';
import Wallets from './components/Wallets';
import { AIChatWidget } from './components/chat';
import { authService } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'wallets'
    | 'income'
    | 'expenses'
    | 'investment'
    | 'categories'
    | 'targets'
    | 'debts'
  >('dashboard');
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const handleGoHome = () => {
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

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
      {/* Mobile Header */}
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
          onClick={handleGoHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleGoHome();
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

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="sidebar-brand brand-clickable"
            onClick={handleGoHome}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleGoHome();
              }
            }}
            aria-label="Trang chủ Nexo"
          >
            <img src="/favicon.svg" className="sidebar-logo" alt="Nexo logo" />
            <span className="brand-name">Nexo Portal</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <LayoutDashboard size={18} />
            </span>
            <span className="nav-text">Bảng điều khiển</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('wallets');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'wallets' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <CreditCard size={18} />
            </span>
            <span className="nav-text">Tài khoản & Thẻ</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('targets');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'targets' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Target size={18} />
            </span>
            <span className="nav-text">Mục tiêu tài chính</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('debts');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Scale size={18} />
            </span>
            <span className="nav-text">Quản lý Vay & Nợ</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('income');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'income' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <ArrowDownLeft size={18} />
            </span>
            <span className="nav-text">Thu nhập</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('expenses');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <ArrowUpRight size={18} />
            </span>
            <span className="nav-text">Chi tiêu</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('investment');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'investment' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <TrendingUp size={18} />
            </span>
            <span className="nav-text">Đầu tư</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('categories');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <FolderTree size={18} />
            </span>
            <span className="nav-text">Danh mục</span>
          </button>
        </nav>

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

      <main className="main-content">
        <div className="content-view animate-fade-in" key={activeTab}>
          {activeTab === 'dashboard' ? (
            <Dashboard onNavigate={(tab) => setActiveTab(tab as any)} />
          ) : activeTab === 'wallets' ? (
            <Wallets />
          ) : activeTab === 'debts' ? (
            <Debts />
          ) : activeTab === 'income' ? (
            <Transactions type={TransactionType.INCOME} />
          ) : activeTab === 'expenses' ? (
            <Transactions type={TransactionType.EXPENSE} />
          ) : activeTab === 'investment' ? (
            <Transactions type={TransactionType.INVESTMENT} />
          ) : activeTab === 'categories' ? (
            <Categories />
          ) : (
            <Targets />
          )}
        </div>
      </main>

      <ReloadPrompt />
      <AIChatWidget user={user} />
      <ToastContainer theme="dark" position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default App;
