import { useState, useEffect } from 'react'
import ReloadPrompt from './components/ReloadPrompt'
import Categories from './components/Categories'
import Transactions from './components/Transactions'
import Dashboard from './components/Dashboard'
import Auth from './components/Auth'
import { authService } from './services/api'
import type { User } from './services/api'

function App() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'categories'>('dashboard')
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setAuthLoading(false)
      return
    }
    try {
      const userData = await authService.whoami()
      setUser(userData)
    } catch (err) {
      console.error('Failed to verify token', err)
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()

    const handleAuthChange = () => {
      checkAuth()
    }
    window.addEventListener('auth-changed', handleAuthChange)

    // Check PWA installation state
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://')
    setIsInstalled(isStandalone)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  if (authLoading) {
    return (
      <div className="loading-screen animate-fade-in">
        <div className="spinner"></div>
        <p>Đang khởi tạo Nexo...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-outer-container animate-fade-in">
        <Auth onSuccess={checkAuth} />
      </div>
    )
  }

  return (
    <div className="app-shell animate-fade-in">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/favicon.svg" className="sidebar-logo" alt="Nexo logo" />
            <span className="brand-name">Nexo Portal</span>
          </div>
        </div>

        <div className="user-profile">
          <div className="avatar">
            {user.username ? user.username[0].toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="greeting">Chào mừng quay trở lại,</span>
            <span className="username" title={user.username}>{user.username}</span>
            <span className="user-email" title={user.email}>{user.email}</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-text">Bảng điều khiển</span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
          >
            <span className="nav-icon">💸</span>
            <span className="nav-text">Sổ giao dịch</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <span className="nav-icon">📁</span>
            <span className="nav-text">Danh mục</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            <span className="nav-text">Đăng xuất</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <div className="header-left">
            <h1 className="view-title">
              {activeTab === 'dashboard' ? 'Bảng điều khiển' : activeTab === 'transactions' ? 'Sổ giao dịch' : 'Danh mục'}
            </h1>
          </div>
          <div className="header-right">
            {isInstalled ? (
              <span className="pwa-badge installed" title="Đang chạy dưới dạng Ứng dụng PWA">
                <span className="badge-dot"></span> Đang chạy dưới dạng Ứng dụng PWA
              </span>
            ) : deferredPrompt ? (
              <button onClick={handleInstallClick} className="pwa-install-badge-btn pulse-glow" title="Đang chạy trên Trình duyệt (Có thể cài đặt)">
                📥 Cài đặt Ứng dụng
              </button>
            ) : (
              <span className="pwa-badge ready" title="Nhấp vào nút cài đặt trên thanh địa chỉ trình duyệt để dùng trang web này như một ứng dụng!">
                ⚡ Đang chạy trên Trình duyệt (Có thể cài đặt)
              </span>
            )}
          </div>
        </header>

        <div className="content-view">
          {activeTab === 'dashboard' ? (
            <Dashboard />
          ) : activeTab === 'transactions' ? (
            <Transactions />
          ) : (
            <Categories />
          )}
        </div>
      </main>

      <ReloadPrompt />
    </div>
  )
}

export default App



