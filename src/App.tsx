import { useEffect, useState } from 'react';
import type { User } from './commons/types';
import Auth from './components/Auth';
import Categories from './components/Categories';
import Dashboard from './components/Dashboard';
import ReloadPrompt from './components/ReloadPrompt';
import Transactions from './components/Transactions';
import { authService, TransactionType } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'income' | 'expenses' | 'categories'>(
    'dashboard'
  );
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
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
    <div className="app-shell animate-fade-in">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ display: 'inline-block', verticalAlign: 'middle' }}
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <div className="mobile-brand">
          <img src="/favicon.svg" className="mobile-logo" alt="Nexo logo" />
          <span className="brand-name">Nexo Portal</span>
        </div>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/favicon.svg" className="sidebar-logo" alt="Nexo logo" />
            <span className="brand-name">Nexo Portal</span>
          </div>
        </div>

        <div className="user-profile">
          <div className="avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
          <div className="user-details">
            <span className="username" title={user.username}>
              {user.username}
            </span>
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </span>
            <span className="nav-text">Bảng điều khiển</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('income');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'income' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
                <polyline points="16 17 22 17 22 11" />
              </svg>
            </span>
            <span className="nav-text">Chi tiêu</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('categories');
              setIsSidebarOpen(false);
            }}
            className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              </svg>
            </span>
            <span className="nav-text">Danh mục</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => {
              handleLogout();
              setIsSidebarOpen(false);
            }}
            className="logout-btn"
          >
            <span className="nav-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: 'inline-block', verticalAlign: 'middle' }}
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </span>
            <span className="nav-text">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-left">
            <h1 className="view-title">
              {activeTab === 'dashboard'
                ? 'Bảng điều khiển'
                : activeTab === 'income'
                  ? 'Quản lý thu nhập'
                  : activeTab === 'expenses'
                    ? 'Quản lý chi tiêu'
                    : 'Danh mục'}
            </h1>
          </div>
          <div className="header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <div className="content-view">
          {activeTab === 'dashboard' ? (
            <Dashboard />
          ) : activeTab === 'income' ? (
            <Transactions type={TransactionType.INCOME} />
          ) : activeTab === 'expenses' ? (
            <Transactions type={TransactionType.EXPENSE} />
          ) : (
            <Categories />
          )}
        </div>
      </main>

      <ReloadPrompt />
    </div>
  );
}

export default App;
