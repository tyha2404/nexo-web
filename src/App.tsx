import { SlidingTabs } from './components/ui';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUser,
  ColorMode,
  Gem,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Tags,
  Target,
  TrendingUp,
  WifiOff,
  type IconComponent,
} from './components/ui';
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
import { ChangePasswordModal } from './components/common';
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
import { ApiError, authService, clearSession } from './services';
import { useRealtimeSync, useVirtualKeyboard } from './hooks';
import { BTN_SECONDARY, PWA_TOAST, SPINNER_PAGE, MOTION_MENU, cx } from './components/ui';

export type ActiveTab = 'dashboard' | 'transactions' | 'debts' | 'planning';

// App shell styling, modelled on the VS Code workbench: title bar, activity bar,
// side bar, editor (tabs + breadcrumbs) and status bar on desktop. `mobile:` swaps
// them for the fixed mobile header + bottom nav. `!` transitions beat the global
// unlayered `button` rule.
const BRAND_CLICKABLE =
  'cursor-pointer select-none [-webkit-tap-highlight-color:transparent] transition-opacity duration-100 hover:opacity-90';
const BTN_TRANSITION = 'transition-[background-color,color]! duration-100! ease-out!';
const MOBILE_HEADER_BTN = `flex size-11 min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-[5px] border-none p-0 [-webkit-tap-highlight-color:transparent] ${BTN_TRANSITION} [&:hover]:bg-hover active:bg-hover`;
/** VS Code `.action-item`: 22px square, 5px radius, toolbar hover fill. */
const TOOLBAR_BTN = `inline-flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border-none bg-transparent p-0 text-main ${BTN_TRANSITION} hover:bg-hover`;
const ACTIVITY_BTN = `relative flex h-12 w-12 cursor-pointer items-center justify-center border-none bg-transparent p-0 ${BTN_TRANSITION}`;
const STATUS_ITEM = `inline-flex h-full cursor-pointer items-center gap-1 border-none bg-transparent px-[5px] text-[12px] text-statusbar-fg ${BTN_TRANSITION} hover:bg-statusbar-hover [&_svg]:size-[14px]`;
/** VS Code context menu: blue selection on hover. */
const MENU_PANEL = `${MOTION_MENU} z-100 min-w-[220px] rounded-md border border-line bg-widget p-1 text-[13px] shadow-app-lg`;
const MENU_ITEM =
  'flex h-[26px] w-full cursor-pointer items-center gap-2 rounded-[3px] border-none bg-transparent px-2 text-left text-[13px] text-main hover:bg-primary hover:text-white [&_svg]:size-4 mobile:h-10 mobile:text-[15px]';
const TREE_ITEM =
  'flex h-[22px] w-full cursor-pointer items-center gap-[6px] border border-transparent pr-3 text-left text-[13px] text-main hover:bg-list-hover focus-visible:border-primary focus-visible:outline-none [&_svg]:size-4 [&_svg]:shrink-0';
const ACCOUNT_ITEM =
  'flex min-h-10 w-full cursor-pointer items-center gap-[0.6rem] rounded-[3px] border-none bg-transparent p-[0.6rem] text-[0.875rem] active:bg-hover [&:hover]:bg-hover';

const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Tổng quan', short: 'Tổng quan', Icon: LayoutDashboard },
  { tab: 'transactions', label: 'Giao dịch', short: 'Giao dịch', Icon: ArrowLeftRight },
  { tab: 'debts', label: 'Sổ Vay & Nợ', short: 'Vay & Nợ', Icon: Handshake },
  { tab: 'planning', label: 'Kế hoạch & Mục tiêu', short: 'Kế hoạch', Icon: Target },
] as const;

type TreeChild = { nav: string; label: string; Icon: IconComponent; iconClass: string };
const TREE_CHILDREN: Partial<Record<ActiveTab, TreeChild[]>> = {
  transactions: [
    { nav: 'expenses', label: 'Chi tiêu', Icon: ShoppingBag, iconClass: 'text-expense' },
    { nav: 'income', label: 'Thu nhập', Icon: TrendingUp, iconClass: 'text-income' },
    { nav: 'investment', label: 'Đầu tư', Icon: Gem, iconClass: 'text-investment' },
  ],
  planning: [
    { nav: 'targets', label: 'Mục tiêu & Ngân sách', Icon: Target, iconClass: 'text-warning' },
    { nav: 'categories', label: 'Danh mục thu chi', Icon: Tags, iconClass: 'text-purple' },
  ],
};
const TAB_ICON_CLASS: Record<ActiveTab, string> = {
  dashboard: 'text-link',
  transactions: 'text-income',
  debts: 'text-warning',
  planning: 'text-purple',
};
const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  [TransactionType.EXPENSE]: 'Chi tiêu',
  [TransactionType.INCOME]: 'Thu nhập',
  [TransactionType.INVESTMENT]: 'Đầu tư',
};
const CONTENT_VIEW =
  'content-view mx-auto w-full max-w-[1400px] grow px-6 pt-4 pb-10 motion-safe:animate-[nexo-view-enter_240ms_var(--motion-ease)_backwards] mobile:max-w-full mobile:overflow-x-hidden mobile:p-[0.65rem] mobile:pb-6';

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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const manageMenuRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('nexo-sidebar') !== 'hidden';
    } catch {
      return true;
    }
  });
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('nexo-sidebar', sidebarOpen ? 'visible' : 'hidden');
    } catch {
      /* storage unavailable: keep the in-memory state */
    }
  }, [sidebarOpen]);
  useEffect(() => {
    if (!manageMenuOpen) return;
    const close = (e: PointerEvent) => {
      if (!manageMenuRef.current?.contains(e.target as Node)) setManageMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [manageMenuOpen]);

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
  useVirtualKeyboard();

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
      // The token itself may have been renewed during the call; only a logout
      // or a new login (both bump authAttempt) makes this answer stale.
      if (attempt !== authAttempt.current || !localStorage.getItem('token')) return;
      localStorage.setItem('nexo-user-id', userData.id);
      setUser(userData);
    } catch (err) {
      console.error('Failed to verify token', err);
      if (attempt !== authAttempt.current || !localStorage.getItem('token')) return;
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
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
    const light = theme === 'light';
    // On <html> too, so the page canvas (iOS overscroll, area behind the status bar) follows.
    document.documentElement.classList.toggle('light-theme', light);
    document.body.classList.toggle('light-theme', light);
    // iOS status bar / Safari toolbar colour = the title bar colour of the active theme.
    const titlebar = getComputedStyle(document.body).getPropertyValue('--bg-titlebar').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', titlebar);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleOpenAIChat = () => {
    setAIRequested(true);
    window.dispatchEvent(new CustomEvent('open-ai-chat'));
  };

  const handleLogoutRef = useRef<() => void>(() => undefined);
  const handleLogout = () => {
    authAttempt.current++;
    // Revokes the refresh token and clears the stored session.
    void authService.logout().catch(() => undefined);
    localStorage.removeItem('nexo-user-id');
    for (const key of Object.keys(localStorage))
      if (key.startsWith('nexo-draft:')) localStorage.removeItem(key);
    setUser(null);
    setAuthError(null);
    setAIRequested(false);
    setChangePasswordOpen(false);
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
      // VS Code: Cmd/Ctrl+B toggles the side bar
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((open) => !open);
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

  const activeNav = NAV_ITEMS.find((item) => item.tab === activeTab) ?? NAV_ITEMS[0];
  const breadcrumbs: string[] = [activeNav.label];
  if (activeTab === 'transactions') breadcrumbs.push(TRANSACTION_TYPE_LABEL[transactionType]);
  if (activeTab === 'planning')
    breadcrumbs.push(planningSubTab === 'targets' ? 'Mục tiêu & Ngân sách' : 'Danh mục thu chi');
  const isTreeChildActive = (nav: string) =>
    (activeTab === 'transactions' &&
      ((nav === 'expenses' && transactionType === TransactionType.EXPENSE) ||
        (nav === 'income' && transactionType === TransactionType.INCOME) ||
        (nav === 'investment' && transactionType === TransactionType.INVESTMENT))) ||
    (activeTab === 'planning' && nav === planningSubTab);

  // VS Code: clicking the active activity-bar item toggles the side bar.
  const handleActivityClick = (tab: ActiveTab) => {
    if (tab === activeTab) {
      setSidebarOpen((open) => !open);
      return;
    }
    setSidebarOpen(true);
    handleNavigate(tab);
  };

  const renderBottomNavItem = ({ tab, label, short, Icon }: (typeof NAV_ITEMS)[number]) => {
    const active = activeTab === tab;
    return (
      <button
        key={tab}
        type="button"
        className={`group relative flex h-full min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-none bg-transparent px-px py-[3px] [-webkit-tap-highlight-color:transparent] transition-[color]! duration-100! ease-out! focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary ${active ? 'text-activity' : 'text-activity-inactive'}`}
        aria-current={active ? 'page' : undefined}
        onClick={() => handleNavigate(tab)}
        aria-label={label}
      >
        <div className="flex h-[30px] w-[38px] items-center justify-center rounded-[5px]">
          <Icon size={20} />
        </div>
        <span
          className={`text-[10px] leading-[14px] tracking-normal whitespace-nowrap ${active ? 'font-semibold' : 'font-normal'}`}
        >
          {short}
        </span>
      </button>
    );
  };

  const themeLabel = theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng';

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden bg-app text-[13px] mobile:h-auto mobile:min-h-dvh mobile:overflow-visible mobile:text-base">
      {/* Mobile Top Header (styled as the VS Code title bar) */}
      <header
        className={`fixed inset-x-0 top-0 z-90 hidden h-[calc(52px+env(safe-area-inset-top,0px))] min-h-[calc(52px+env(safe-area-inset-top,0px))] items-center justify-between border-b border-line bg-titlebar pt-[max(0.4rem,env(safe-area-inset-top,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pb-[0.4rem] pl-[max(0.85rem,env(safe-area-inset-left,0px))] mobile:flex`}
      >
        <div
          className={`flex h-10 items-center gap-2 ${BRAND_CLICKABLE}`}
          onClick={() => handleNavigate('dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={brandKeyDown}
          aria-label="Trang chủ Nexo"
        >
          <img src="/logo-transparent.svg" className="size-6" alt="Nexo logo" />
          <span className="text-[15px] font-semibold text-main">{activeNav.short}</span>
        </div>
        <div className="flex items-center gap-[2px]">
          <button
            className={`${MOBILE_HEADER_BTN} bg-transparent text-main`}
            onClick={handleOpenAIChat}
            aria-label="Trợ lý AI"
            title="Trợ lý Nexo AI"
          >
            <Sparkles size={16} className="text-link" />
          </button>
          <div className="relative" ref={accountMenuRef}>
            <button
              className={`${MOBILE_HEADER_BTN} bg-transparent text-main`}
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-label="Tài khoản"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
                {userInitial}
              </span>
            </button>
            {accountMenuOpen && (
              <div
                className={`${MENU_PANEL} absolute top-[calc(100%+0.4rem)] right-0 max-w-[calc(100vw-2rem)]`}
                role="menu"
              >
                <div className="mb-1 flex min-w-0 flex-col border-b border-line px-2 pt-1 pb-2">
                  <span className="text-[15px] font-semibold">{user.username}</span>
                  <span className="truncate text-[13px] text-muted">{user.email}</span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  className={`${ACCOUNT_ITEM} text-main`}
                  onClick={toggleTheme}
                >
                  <ColorMode size={16} />
                  {themeLabel}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${ACCOUNT_ITEM} text-main`}
                  onClick={() => {
                    setAccountMenuOpen(false);
                    setChangePasswordOpen(true);
                  }}
                >
                  <KeyRound size={16} /> Đổi mật khẩu
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

      {/* Desktop title bar with the command center */}
      <header className="titlebar relative z-60 grid h-[35px] shrink-0 grid-cols-[1fr_minmax(0,600px)_1fr] items-center gap-2 border-b border-line bg-titlebar px-2 text-[13px] text-main mobile:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex items-center gap-2 px-1 ${BRAND_CLICKABLE}`}
            onClick={() => handleNavigate('dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={brandKeyDown}
            aria-label="Trang chủ Nexo"
          >
            <img src="/logo-transparent.svg" className="size-4" alt="Nexo logo" />
            <span className="truncate text-[13px] text-main">Nexo Portal</span>
          </div>
        </div>
        <button
          type="button"
          className="flex h-[24px] w-full min-w-0 cursor-pointer items-center justify-center gap-[6px] rounded-md border border-line bg-[color-mix(in_srgb,var(--bg-input)_60%,transparent)] px-2 text-[12px] text-muted transition-[background-color,border-color]! duration-100! hover:border-line-hover hover:bg-input-hover hover:text-main"
          onClick={handleOpenAIChat}
          aria-label="Trợ lý AI"
          title="Trợ lý Nexo AI (⌘K)"
        >
          <Search size={16} className="shrink-0" />
          <span className="truncate">Nexo — hỏi trợ lý AI về tài chính của bạn</span>
          <kbd className="ml-1 shrink-0 rounded-[3px] border border-line bg-hover px-1 font-sans text-[11px] leading-[16px] text-muted">
            ⌘K
          </kbd>
        </button>
        <div className="flex items-center justify-end gap-[2px]">
          <button
            type="button"
            className={cx(TOOLBAR_BTN, !sidebarOpen && 'text-muted')}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Ẩn/hiện thanh bên"
            aria-pressed={sidebarOpen}
            title="Ẩn/hiện thanh bên (⌘B)"
          >
            <PanelLeft size={16} />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 mobile:block mobile:flex-none">
        {/* Desktop: activity bar + side bar (hidden on mobile, where the bottom nav is used) */}
        <aside className="sidebar z-50 flex shrink-0 mobile:hidden">
          <div className="flex w-12 flex-col border-r border-line bg-activitybar">
            <SlidingTabs
              as="nav"
              variant="activity"
              className="nav-menu flex flex-col"
              aria-label="Điều hướng chính"
            >
              {NAV_ITEMS.map(({ tab, label, Icon }) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleActivityClick(tab)}
                    className={cx(
                      ACTIVITY_BTN,
                      active ? 'text-activity' : 'text-activity-inactive hover:text-activity'
                    )}
                    aria-current={active ? 'page' : undefined}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={24} />
                  </button>
                );
              })}
            </SlidingTabs>
            <div className="mt-auto flex flex-col">
              <button
                type="button"
                className={cx(ACTIVITY_BTN, 'text-activity-inactive hover:text-activity')}
                onClick={() => openAddTransaction(quickAddDefaultType)}
                aria-label="Ghi giao dịch"
                title="Ghi giao dịch"
              >
                <Plus size={24} />
              </button>
              <div className="relative" ref={manageMenuRef}>
                <button
                  type="button"
                  className={cx(
                    ACTIVITY_BTN,
                    manageMenuOpen ? 'text-activity' : 'text-activity-inactive hover:text-activity'
                  )}
                  onClick={() => setManageMenuOpen((open) => !open)}
                  aria-label="Cài đặt"
                  aria-haspopup="menu"
                  aria-expanded={manageMenuOpen}
                  title={`${user.username} · Cài đặt`}
                >
                  <Settings size={24} />
                </button>
                {manageMenuOpen && (
                  <div
                    className={`${MENU_PANEL} absolute bottom-1 left-[calc(100%+4px)] origin-bottom-left`}
                    role="menu"
                  >
                    <div className="flex min-w-0 items-center gap-2 px-2 pt-1 pb-2">
                      <CircleUser size={16} className="shrink-0 text-muted" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold">{user.username}</span>
                        <span className="truncate text-[12px] text-muted">{user.email}</span>
                      </div>
                    </div>
                    <div className="mx-1 my-1 h-px bg-line" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      className={MENU_ITEM}
                      onClick={() => {
                        setManageMenuOpen(false);
                        toggleTheme();
                      }}
                    >
                      <ColorMode />
                      {themeLabel}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={MENU_ITEM}
                      onClick={() => {
                        setManageMenuOpen(false);
                        setChangePasswordOpen(true);
                      }}
                    >
                      <KeyRound /> Đổi mật khẩu
                    </button>
                    <div className="mx-1 my-1 h-px bg-line" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      className={MENU_ITEM}
                      onClick={() => {
                        setManageMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {sidebarOpen && (
            <div className="flex w-[240px] flex-col border-r border-line bg-sidebar text-main">
              <div className="flex h-[35px] shrink-0 items-center px-5 text-[11px] tracking-[0.04em] uppercase">
                Explorer
              </div>
              <div className="flex h-[22px] shrink-0 items-center gap-[2px] px-[2px] text-[11px] font-bold tracking-[0.04em] uppercase">
                <ChevronDown size={16} className="shrink-0" />
                Nexo Portal
              </div>
              <nav aria-label="Trang" className="min-h-0 flex-1 overflow-y-auto pb-2">
                {NAV_ITEMS.map(({ tab, label, Icon }) => {
                  const children = TREE_CHILDREN[tab];
                  const selected = activeTab === tab && !children;
                  return (
                    <div key={tab}>
                      <button
                        type="button"
                        className={cx(
                          TREE_ITEM,
                          'pl-[8px]',
                          selected ? 'bg-list-active' : 'bg-transparent'
                        )}
                        onClick={() => handleNavigate(tab)}
                      >
                        {children ? (
                          <ChevronDown className="size-4! text-main" />
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <Icon className={TAB_ICON_CLASS[tab]} />
                        <span className="truncate">{label}</span>
                      </button>
                      {children?.map((child) => (
                        <button
                          key={child.nav}
                          type="button"
                          className={cx(
                            TREE_ITEM,
                            'pl-[30px]',
                            isTreeChildActive(child.nav) ? 'bg-list-active' : 'bg-transparent'
                          )}
                          onClick={() => handleNavigate(child.nav)}
                        >
                          <child.Icon className={child.iconClass} />
                          <span className="truncate">{child.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            </div>
          )}
        </aside>

        {/* Editor area */}
        <main className="flex min-w-0 flex-1 flex-col bg-app mobile:min-h-dvh mobile:pt-[calc(52px+env(safe-area-inset-top,0px))] mobile:pr-[env(safe-area-inset-right,0px)] mobile:pb-[calc(76px+env(safe-area-inset-bottom,0px))] mobile:pl-[env(safe-area-inset-left,0px)]">
          {/* Editor tab strip + editor actions */}
          <div className="flex h-[35px] shrink-0 items-stretch bg-tabs mobile:hidden">
            <div className="relative flex min-w-0 items-center gap-[6px] border-r border-line bg-tab-active pr-4 pl-[10px] text-[13px] text-main before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-primary">
              <activeNav.Icon size={16} className={cx('shrink-0', TAB_ICON_CLASS[activeTab])} />
              <span className="truncate">{activeNav.label}</span>
            </div>
            <div className="flex flex-1 items-center justify-end gap-[2px] border-b border-line px-2">
              <button
                type="button"
                className={cx(TOOLBAR_BTN, 'w-auto gap-1 px-[6px] text-[12px]')}
                onClick={() => openAddTransaction(quickAddDefaultType)}
                aria-label="Ghi giao dịch mới"
                title="Ghi giao dịch mới"
              >
                <Plus size={16} />
                <span>Ghi giao dịch</span>
              </button>
            </div>
          </div>
          {/* Breadcrumbs */}
          <nav
            aria-label="Breadcrumb"
            className="flex h-[22px] shrink-0 items-center gap-[2px] px-3 text-[13px] text-muted mobile:hidden"
          >
            <span>nexo</span>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb} className="flex items-center gap-[2px]">
                <ChevronRight size={16} className="shrink-0" />
                <span className={index === breadcrumbs.length - 1 ? 'text-main' : undefined}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>

          {/* Content Views — kept mounted to preserve filter/scroll state per tab */}
          <div className="min-h-0 flex-1 overflow-y-auto mobile:overflow-visible mobile:[-webkit-overflow-scrolling:touch]">
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
            <div
              className={CONTENT_VIEW}
              style={{ display: activeTab === 'debts' ? 'block' : 'none' }}
            >
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
          </div>
        </main>
      </div>

      {/* Desktop status bar */}
      <footer className="flex h-[22px] shrink-0 items-stretch justify-between border-t border-line bg-statusbar text-[12px] text-statusbar-fg mobile:hidden">
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            className={`${STATUS_ITEM} bg-statusbar-remote! px-[10px] text-white! hover:brightness-110`}
            onClick={() => handleNavigate('dashboard')}
            title="Nexo Portal"
          >
            {/* Logo mark (prompt + rising bars) in the status bar's text colour */}
            <svg
              viewBox="0 0 120 120"
              className="size-[14px]"
              aria-hidden="true"
              fill="currentColor"
            >
              <path
                d="M26 38 L48 60 L26 82"
                fill="none"
                stroke="currentColor"
                strokeWidth="13"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="58" y="66" width="12" height="17" rx="3" />
              <rect x="74" y="53" width="12" height="30" rx="3" />
              <rect x="90" y="37" width="12" height="46" rx="3" />
            </svg>
            <span>Nexo</span>
          </button>
          <span className={cx(STATUS_ITEM, 'cursor-default hover:bg-transparent')} role="status">
            {online ? <Check /> : <WifiOff />}
            {online ? 'Đã đồng bộ' : 'Ngoại tuyến'}
          </span>
        </div>
        <div className="flex min-w-0 items-stretch">
          <button
            type="button"
            className={STATUS_ITEM}
            onClick={handleOpenAIChat}
            title="Trợ lý Nexo AI (⌘K)"
          >
            <Sparkles />
            <span>Nexo AI</span>
          </button>
          <span className={cx(STATUS_ITEM, 'cursor-default hover:bg-transparent')}>VND</span>
          <span
            className={cx(STATUS_ITEM, 'max-w-[220px] cursor-default hover:bg-transparent')}
            title={user.email}
          >
            <CircleUser />
            <span className="truncate">{user.username}</span>
          </span>
          <button
            type="button"
            className={cx(STATUS_ITEM, 'pr-[10px]')}
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng/tối"
            title="Đổi giao diện"
          >
            <ColorMode />
          </button>
        </div>
      </footer>

      {/* Mobile PWA Bottom Navigation Bar (styled as the activity bar) */}
      <SlidingTabs
        as="nav"
        variant="icon"
        className={`bottom-nav fixed inset-x-0 bottom-0 z-[9990] hidden keyboard:hidden! h-[calc(60px+env(safe-area-inset-bottom,0px))] items-center justify-around border-t border-line bg-activitybar pt-[4px] pr-[max(6px,env(safe-area-inset-right,0px))] pb-[env(safe-area-inset-bottom,0px)] pl-[max(6px,env(safe-area-inset-left,0px))] mobile:flex`}
        aria-label="Điều hướng chính"
      >
        {NAV_ITEMS.slice(0, 2).map(renderBottomNavItem)}

        <button
          type="button"
          className="group relative flex h-full min-h-12 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] border-none bg-transparent px-px py-[3px] text-activity [-webkit-tap-highlight-color:transparent] focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-primary"
          onClick={() => openAddTransaction(quickAddDefaultType)}
          aria-label="Ghi giao dịch mới"
        >
          <div className="flex h-[30px] w-[38px] items-center justify-center rounded-md border border-btn-border bg-primary text-white transition-[background-color] duration-100 group-active:bg-primary-hover">
            <Plus size={22} />
          </div>
          <span className="text-[10px] leading-[14px] font-semibold tracking-normal whitespace-nowrap">
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
      <ChangePasswordModal
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
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
