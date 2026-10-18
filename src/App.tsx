import { SlidingTabs } from './components/ui';
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
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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
import { BTN_PRIMARY, BTN_SECONDARY, PWA_TOAST, SPINNER_PAGE, MOTION_MENU } from './components/ui';

export type ActiveTab = 'dashboard' | 'transactions' | 'debts' | 'planning';

// App shell styling. Breakpoint: `mobile:` swaps the sidebar + desktop header for the
// fixed mobile header + bottom nav. `!` transitions beat the global unlayered `button` rule.
const GLASS = '[backdrop-filter:var(--glass-blur)] [-webkit-backdrop-filter:var(--glass-blur)]';
const BRAND_CLICKABLE =
  'cursor-pointer select-none [-webkit-tap-highlight-color:transparent] transition-[transform,opacity] duration-200 ease-[ease] hover:opacity-90 active:[transform:scale(0.97)]';
const BTN_TRANSITION =
  'transition-[background-color,border-color,color,box-shadow,transform]! duration-[0.18s]! ease-[ease-out]!';
const MOBILE_HEADER_BTN = `flex size-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border border-solid p-0 [-webkit-tap-highlight-color:transparent] ${BTN_TRANSITION} active:[transform:scale(0.95)] [&:hover]:bg-input-hover`;
const SIDEBAR_ICON_BTN = `flex size-9 min-h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-solid bg-input p-0 pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${BTN_TRANSITION} hover:[transform:translateY(-1px)]`;
const THEME_TOGGLE_BTN = `${SIDEBAR_ICON_BTN} border-line text-muted hover:border-primary hover:bg-input-hover hover:text-primary`;
const ACCOUNT_ITEM =
  'flex min-h-10 w-full cursor-pointer items-center gap-[0.6rem] rounded-sm border-none bg-transparent p-[0.6rem] text-[0.875rem] active:bg-hover [&:hover]:bg-hover';

const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Tổng quan', short: 'Tổng quan', Icon: LayoutDashboard },
  { tab: 'transactions', label: 'Giao dịch', short: 'Giao dịch', Icon: ArrowLeftRight },
  { tab: 'debts', label: 'Sổ Vay & Nợ', short: 'Vay & Nợ', Icon: Handshake },
  { tab: 'planning', label: 'Kế hoạch & Mục tiêu', short: 'Kế hoạch', Icon: Target },
] as const;
const CONTENT_VIEW =
  'content-view mx-auto w-full max-w-[1400px] grow px-6 pt-5 pb-10 motion-safe:animate-[nexo-view-enter_240ms_var(--motion-ease)_backwards] mobile:max-w-full mobile:overflow-x-hidden mobile:p-[0.65rem] mobile:pb-6';

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
      <div className="auth-outer-container animate-fade-in flex min-h-screen flex-col items-center justify-center gap-6 bg-app">
        <div className={SPINNER_PAGE}></div>
        <p>Đang khởi tạo Nexo...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-outer-container animate-fade-in flex min-h-screen flex-col items-center justify-center bg-app p-8 touch:min-h-dvh touch:pt-[max(16px,env(safe-area-inset-top))] touch:pr-[max(16px,env(safe-area-inset-right))] touch:pb-[max(16px,env(safe-area-inset-bottom))] touch:pl-[max(16px,env(safe-area-inset-left))]">
        {authError && (
          <div role="alert" className="mb-4 text-center">
            <p>{authError}</p>
            <button className={BTN_SECONDARY} onClick={() => void checkAuth()}>
              Thử lại
            </button>
          </div>
        )}
        {/* Auth fires 'auth-changed', which already re-runs checkAuth */}
        <Auth />
      </div>
    );
  }

  const userInitial = user.username ? user.username[0].toUpperCase() : 'U';
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const brandKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleNavigate('dashboard');
    }
  };

  const renderBottomNavItem = ({ tab, label, short, Icon }: (typeof NAV_ITEMS)[number]) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        className={`group relative flex h-full min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] rounded-lg border-none bg-transparent px-px py-[3px] [-webkit-tap-highlight-color:transparent] transition-[color,background-color]! duration-[180ms]! ease-[ease]! focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:duration-[0.01ms]! ${active ? 'text-primary' : 'text-muted'}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => handleNavigate(tab)}
        aria-label={label}
      >
        <div
          className={`flex h-[30px] w-[38px] items-center justify-center rounded-md [transition:background-color_200ms_ease,color_200ms_ease,transform_200ms_var(--motion-ease)] motion-reduce:[transition-duration:0.01ms] ${active ? 'bg-transparent text-primary' : 'bg-transparent group-active:[transform:scale(0.9)]'}`}
        >
          <Icon size={20} />
        </div>
        <span
          className={`text-[10px] leading-[14px] tracking-normal whitespace-nowrap transition-[color] duration-200 ease-[ease] ${active ? 'font-bold text-primary' : 'font-semibold'}`}
        >
          {short}
        </span>
      </button>
    );
  };

  return (
    <div className="app-shell flex min-h-screen w-screen bg-app mobile:min-h-dvh mobile:flex-col">
      {/* Mobile Top Header */}
      <header
        className={`fixed inset-x-0 top-0 z-90 hidden h-[calc(56px+env(safe-area-inset-top,0px))] min-h-[calc(56px+env(safe-area-inset-top,0px))] items-center justify-between border-b border-line bg-card pt-[max(0.5rem,env(safe-area-inset-top,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-2 pl-[max(1rem,env(safe-area-inset-left,0px))] ${GLASS} mobile:flex standalone:light:bg-[linear-gradient(to_bottom,#0f172a_0,#0f172a_env(safe-area-inset-top,0px),var(--bg-card)_env(safe-area-inset-top,0px))]`}
      >
        <div
          className={`flex h-10 items-center gap-[0.65rem] ${BRAND_CLICKABLE}`}
          onClick={() => handleNavigate('dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={brandKeyDown}
          aria-label="Trang chủ Nexo"
        >
          <img src="/logo-transparent.svg" className="size-[30px]" alt="Nexo logo" />
          <span className="text-[1.15rem] font-bold tracking-[-0.025em] text-main">
            Nexo Portal
          </span>
        </div>
        <div className="flex items-center gap-[0.35rem]">
          <button
            className={`${MOBILE_HEADER_BTN} border-line bg-input text-main [&:hover]:border-line-hover`}
            onClick={handleOpenAIChat}
            aria-label="Trợ lý AI"
            title="Trợ lý Nexo AI"
          >
            <Sparkles size={16} color="var(--primary)" />
          </button>
          <div className="relative" ref={accountMenuRef}>
            <button
              className={`${MOBILE_HEADER_BTN} border-transparent bg-(--primary-gradient) text-[0.85rem] font-bold text-white`}
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label="Tài khoản"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              {userInitial}
            </button>
            {accountMenuOpen && (
              <div
                className={`${MOTION_MENU} absolute top-[calc(100%+0.4rem)] right-0 z-100 max-w-[calc(100vw-2rem)] min-w-[200px] rounded-md border border-line bg-card p-[0.35rem] shadow-app-lg`}
                role="menu"
              >
                <div className="mb-1 flex min-w-0 flex-col border-b border-line px-[0.6rem] pt-2 pb-[0.6rem]">
                  <span className="text-[0.9rem] font-semibold">{user.username}</span>
                  <span className="truncate text-[0.75rem] text-muted">{user.email}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className={`${ACCOUNT_ITEM} text-main`}
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  {theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${ACCOUNT_ITEM} text-expense`}
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
      <aside
        className={`sidebar sticky top-0 z-50 flex h-screen w-[260px] shrink-0 flex-col border-r border-line bg-card px-[0.9rem] py-5 ${GLASS} mobile:hidden`}
      >
        <div className="mb-4">
          <div
            className={`group flex items-center gap-3 ${BRAND_CLICKABLE}`}
            onClick={() => handleNavigate('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={brandKeyDown}
            aria-label="Trang chủ Nexo"
          >
            <img
              src="/logo-transparent.svg"
              className="size-[38px] transition-transform duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:[transform:scale(1.08)_rotate(3deg)]"
              alt="Nexo logo"
            />
            <span className="text-[1.25rem] font-bold tracking-[-0.025em] text-main">
              Nexo Portal
            </span>
          </div>
        </div>

        {/* 4 Primary Navigation Hubs */}
        <SlidingTabs as="nav" variant="navigation" className="nav-menu flex grow flex-col gap-1">
          {NAV_ITEMS.map(({ tab, label, Icon }) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => handleNavigate(tab)}
                className={`relative inline-flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-md border border-solid px-[0.85rem] py-[0.55rem] text-left align-middle text-[0.9rem] leading-[1.2] ${active ? 'border-transparent bg-transparent font-semibold text-main' : 'border-transparent bg-transparent font-medium text-muted hover:bg-hover hover:text-main'}`}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`inline-flex shrink-0 items-center justify-center transition-transform duration-[180ms] ease-(--motion-ease) motion-reduce:duration-[0.01ms] ${active ? 'scale-[1.08] text-primary [filter:drop-shadow(0_0_8px_var(--primary-glow))]' : ''}`}
                >
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </SlidingTabs>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-line pt-3">
          <div className="flex w-full items-center gap-2">
            <div className="flex size-[30px] shrink-0 items-center justify-center rounded-sm bg-primary text-[0.85rem] font-bold text-white shadow-[0_1px_4px_var(--primary-glow)]">
              {userInitial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <span
                className="truncate text-[0.82rem] font-semibold text-main"
                title={user.username}
              >
                {user.username}
              </span>
              <span className="truncate text-[0.7rem] text-muted" title={user.email}>
                {user.email}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-[0.35rem]">
              <button
                className={THEME_TOGGLE_BTN}
                onClick={toggleTheme}
                aria-label="Đổi giao diện sáng/tối"
                title="Đổi giao diện"
              >
                {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={handleLogout}
                className={`${SIDEBAR_ICON_BTN} border-line text-expense hover:border-[rgba(239,68,68,0.3)] hover:bg-(--expense-hover-bg) hover:text-[#ef4444]`}
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
      <main className="flex h-screen min-w-0 grow flex-col overflow-y-auto bg-app mobile:h-auto mobile:min-h-dvh mobile:overflow-y-visible mobile:pt-[calc(56px+env(safe-area-inset-top,0px))] mobile:pr-[env(safe-area-inset-right,0px)] mobile:pb-[calc(80px+env(safe-area-inset-bottom,0px))] mobile:pl-[env(safe-area-inset-left,0px)] mobile:[-webkit-overflow-scrolling:touch]">
        {/* Desktop Top Header with Sleek AI Action Button */}
        <header
          className={`sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-line bg-card px-6 py-[0.85rem] ${GLASS} mobile:hidden`}
        >
          <div className="flex min-w-[180px] flex-col">
            <h1 className="m-0 text-[1.25rem] font-bold tracking-[-0.02em] text-main">
              {activeTab === 'dashboard' && 'Tổng quan'}
              {activeTab === 'transactions' && 'Sổ giao dịch'}
              {activeTab === 'debts' && 'Sổ Vay & Nợ'}
              {activeTab === 'planning' && 'Kế hoạch & Mục tiêu'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={BTN_PRIMARY}
              onClick={() => openAddTransaction(quickAddDefaultType)}
            >
              <Plus size={16} /> Ghi giao dịch
            </button>
            <button
              className="header-ai-btn relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full border border-solid border-line bg-input px-[0.85rem] py-[0.45rem] text-[0.86rem] font-semibold text-main shadow-app-sm transition-all! duration-200! ease-[ease]! select-none hover:border-primary hover:bg-hover hover:text-primary motion-reduce:duration-[0.01ms]!"
              onClick={handleOpenAIChat}
              type="button"
              aria-label="Trợ lý AI"
              title="Trợ lý Nexo AI (⌘K)"
            >
              <div />
              <Sparkles size={16} className="shrink-0 text-primary" />
              <span className="font-semibold tracking-[-0.01em] text-main">Trợ lý AI</span>
              <kbd className="rounded-xs border border-solid border-[rgba(255,255,255,0.15)] bg-[rgba(0,0,0,0.25)] px-[0.35rem] py-[0.1rem] font-mono text-[0.7rem] leading-none font-bold text-[#e2e8f0] light:border-[rgba(0,0,0,0.1)] light:bg-[rgba(255,255,255,0.7)] light:text-[#475569]">
                ⌘K
              </kbd>
            </button>

            <button
              className={THEME_TOGGLE_BTN}
              onClick={toggleTheme}
              aria-label="Đổi giao diện sáng/tối"
              title="Đổi giao diện"
            >
              {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content Views — kept mounted to preserve filter/scroll state per tab */}
        <div
          className={CONTENT_VIEW}
          style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}
        >
          {visitedTabs.has('dashboard') && (
            <Suspense fallback={<p role="status">Đang tải tổng quan...</p>}>
              <Dashboard onNavigate={handleNavigate} />
            </Suspense>
          )}
        </div>
        <div
          className={CONTENT_VIEW}
          style={{ display: activeTab === 'transactions' ? 'block' : 'none' }}
        >
          {visitedTabs.has('transactions') && (
            <Suspense fallback={<p role="status">Đang tải giao dịch...</p>}>
              <Transactions type={transactionType} />
            </Suspense>
          )}
        </div>
        <div className={CONTENT_VIEW} style={{ display: activeTab === 'debts' ? 'block' : 'none' }}>
          {visitedTabs.has('debts') && (
            <Suspense fallback={<p role="status">Đang tải sổ nợ...</p>}>
              <Debts />
            </Suspense>
          )}
        </div>
        <div
          className={CONTENT_VIEW}
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
      <SlidingTabs
        as="nav"
        variant="icon"
        className={`bottom-nav fixed inset-x-0 bottom-0 z-[9990] hidden h-[calc(64px+env(safe-area-inset-bottom,0px))] items-center justify-around rounded-t-xl border-t border-line bg-card pt-[5px] pr-[max(6px,env(safe-area-inset-right,0px))] pb-[env(safe-area-inset-bottom,0px)] pl-[max(6px,env(safe-area-inset-left,0px))] shadow-[0_8px_32px_rgb(0_0_0/18%),inset_0_1px_0_rgb(255_255_255/4%)] ${GLASS} mobile:flex`}
        aria-label="Điều hướng chính"
      >
        {NAV_ITEMS.slice(0, 2).map(renderBottomNavItem)}

        <button
          type="button"
          className="group relative flex h-full min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] rounded-lg border-none bg-transparent px-px py-[3px] text-muted [-webkit-tap-highlight-color:transparent] transition-[color,background-color]! duration-[180ms]! ease-[ease]! focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary motion-reduce:duration-[0.01ms]!"
          onClick={() => openAddTransaction(quickAddDefaultType)}
          aria-label="Ghi giao dịch mới"
        >
          <div className="flex h-8 w-[38px] items-center justify-center rounded-md bg-primary text-white shadow-[0_3px_8px_rgb(99_102_241/24%)] transition-transform duration-[180ms] ease-(--motion-ease) group-active:[transform:scale(0.9)] motion-reduce:duration-[0.01ms]">
            <Plus size={23} strokeWidth={2.25} />
          </div>
          <span className="text-[10px] leading-[14px] font-semibold tracking-normal whitespace-nowrap text-main transition-[color] duration-200 ease-[ease]">
            Ghi mới
          </span>
        </button>

        {NAV_ITEMS.slice(2).map(renderBottomNavItem)}
      </SlidingTabs>
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
            <p className={PWA_TOAST} role="status">
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
