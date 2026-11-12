import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  APP_EVENTS,
  OPEN_ADD_TRANSACTION_EVENT,
  SIDEBAR_STORAGE_KEY,
  THEME_STORAGE_KEY,
  TransactionType,
} from './commons/constants';
import { openAddTransaction } from './commons/utils';
import Auth from './components/Auth';
import { ChangePasswordModal } from './components/common';
import type { PlanningSubTab } from './components/Planning';
import ReloadPrompt from './components/ReloadPrompt';
import {
  AccountMenu,
  ActivityBar,
  BottomNav,
  breadcrumbsOf,
  EditorHeader,
  Explorer,
  getPathForTab,
  MobileHeader,
  NAV_ITEMS,
  parsePath,
  resolveNavTarget,
  StatusBar,
  TitleBar,
  type ActiveTab,
  type NavState,
  type NavTarget,
} from './components/shell';
import { BTN_SECONDARY, cx, PWA_TOAST, SPINNER_PAGE } from './components/ui';
import { useAuthSession, useRealtimeSync, useVirtualKeyboard } from './hooks';
const Dashboard = lazy(() => import('./components/Dashboard'));
const Debts = lazy(() => import('./components/Debts'));
const Planning = lazy(() => import('./components/Planning'));
const Transactions = lazy(() => import('./components/Transactions'));
const AddTransactionModal = lazy(() => import('./components/AddTransactionModal'));
const AIChatWidget = lazy(() =>
  import('./components/chat').then((module) => ({ default: module.AIChatWidget }))
);

const CONTENT_VIEW =
  'content-view mx-auto w-full max-w-[1400px] grow px-6 pt-4 pb-10 motion-safe:animate-[nexo-view-enter_240ms_var(--motion-ease)_backwards] mobile:max-w-full mobile:overflow-x-hidden mobile:p-[0.65rem] mobile:pb-6';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const internalNavRef = useRef(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [planningSubTab, setPlanningSubTab] = useState<PlanningSubTab>('targets');
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [aiRequested, setAIRequested] = useState(false);
  // Global quick-add: the most frequent action must be one tap away on every screen
  const [quickAddType, setQuickAddType] = useState<TransactionType | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(new Set());
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'hidden';
    } catch {
      return true;
    }
  });
  const [online, setOnline] = useState(() => navigator.onLine);

  // Session state that ends with the session.
  const resetSessionUi = useCallback(() => {
    setAIRequested(false);
    setChangePasswordOpen(false);
  }, []);
  const { user, authLoading, authError, checkAuth, logout } = useAuthSession(resetSessionUi);

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
      localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? 'visible' : 'hidden');
    } catch {
      /* storage unavailable: keep the in-memory state */
    }
  }, [sidebarOpen]);
  useEffect(() => {
    setVisitedTabs((tabs) => new Set([...tabs, activeTab]));
  }, [activeTab]);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useRealtimeSync({ userId: user?.id });
  useVirtualKeyboard();

  useEffect(() => {
    const light = theme === 'light';
    // On <html> too, so the page canvas (iOS overscroll, area behind the status bar) follows.
    document.documentElement.classList.toggle('light-theme', light);
    document.body.classList.toggle('light-theme', light);
    // iOS status bar / Safari toolbar colour = the title bar colour of the active theme.
    const titlebar = getComputedStyle(document.body).getPropertyValue('--bg-titlebar').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', titlebar);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* storage unavailable: the theme lasts for this session only */
    }
  }, [theme]);

  const handleOpenAIChat = () => {
    setAIRequested(true);
    window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_AI_CHAT));
  };

  useEffect(() => {
    const handleOpenAdd = (event: Event) => {
      const type = (event as CustomEvent<TransactionType>).detail;
      setQuickAddType(type in TransactionType ? type : TransactionType.EXPENSE);
    };
    window.addEventListener(OPEN_ADD_TRANSACTION_EVENT, handleOpenAdd);
    return () => window.removeEventListener(OPEN_ADD_TRANSACTION_EVENT, handleOpenAdd);
  }, []);

  const quickAddDefaultType =
    activeTab === 'transactions' ? transactionType : TransactionType.EXPENSE;
  const navState: NavState = { activeTab, transactionType, planningSubTab };

  const applyTarget = (target: NavTarget) => {
    setActiveTab(target.tab);
    if (target.transactionType) setTransactionType(target.transactionType);
    if (target.planningSubTab) setPlanningSubTab(target.planningSubTab);
  };

  // Keep state in sync with the URL (covers browser back/forward + typed deep links)
  useEffect(() => {
    if (internalNavRef.current) {
      internalNavRef.current = false;
      return;
    }
    applyTarget(parsePath(location.pathname));
  }, [location.pathname]);

  const handleNavigate = (nav: string) => {
    const target = resolveNavTarget(nav, navState);
    applyTarget(target);
    internalNavRef.current = true;
    navigate(getPathForTab(target.tab, target));
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
        {/* Auth fires APP_EVENTS.AUTH_CHANGED, which already re-runs checkAuth */}
        <Auth />
      </div>
    );
  }

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const goHome = () => handleNavigate('dashboard');
  const quickAdd = () => openAddTransaction(quickAddDefaultType);

  const activeNav = NAV_ITEMS.find((item) => item.tab === activeTab) ?? NAV_ITEMS[0];

  // VS Code: clicking the active activity-bar item toggles the side bar.
  const handleActivityClick = (tab: ActiveTab) => {
    if (tab === activeTab) {
      setSidebarOpen((open) => !open);
      return;
    }
    setSidebarOpen(true);
    handleNavigate(tab);
  };

  const accountMenuProps = {
    user,
    themeLabel: theme === 'light' ? 'Giao diện tối' : 'Giao diện sáng',
    onToggleTheme: toggleTheme,
    onChangePassword: () => setChangePasswordOpen(true),
    onLogout: logout,
  };

  return (
    <div className="app-shell flex h-screen w-screen flex-col overflow-hidden bg-app text-[13px] mobile:h-auto mobile:min-h-dvh mobile:overflow-visible mobile:text-base">
      <MobileHeader
        title={activeNav.short}
        onHome={goHome}
        onOpenAI={handleOpenAIChat}
        accountMenu={<AccountMenu variant="mobile" {...accountMenuProps} />}
      />

      <TitleBar
        onHome={goHome}
        onOpenAI={handleOpenAIChat}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1 mobile:block mobile:flex-none">
        {/* Desktop: activity bar + side bar (hidden on mobile, where the bottom nav is used) */}
        <aside className="sidebar z-50 flex shrink-0 mobile:hidden">
          <ActivityBar
            activeTab={activeTab}
            onTabClick={handleActivityClick}
            onQuickAdd={quickAdd}
            accountMenu={<AccountMenu variant="desktop" {...accountMenuProps} />}
          />
          {sidebarOpen && <Explorer nav={navState} onNavigate={handleNavigate} />}
        </aside>

        {/* Editor area */}
        <main className="flex min-w-0 flex-1 flex-col bg-app mobile:min-h-dvh mobile:pt-[calc(52px+env(safe-area-inset-top,0px))] mobile:pr-[env(safe-area-inset-right,0px)] mobile:pb-[calc(76px+env(safe-area-inset-bottom,0px))] mobile:pl-[env(safe-area-inset-left,0px)]">
          <EditorHeader
            activeTab={activeTab}
            activeNav={activeNav}
            breadcrumbs={breadcrumbsOf(navState, activeNav)}
            onQuickAdd={quickAdd}
          />

          {/* Content Views — kept mounted to preserve filter/scroll state per tab */}
          <div className="min-h-0 flex-1 overflow-y-auto mobile:overflow-visible mobile:[-webkit-overflow-scrolling:touch]">
            <div className={cx(CONTENT_VIEW, activeTab !== 'dashboard' && 'hidden')}>
              {visitedTabs.has('dashboard') && (
                <Suspense fallback={<p role="status">Đang tải tổng quan...</p>}>
                  <Dashboard onNavigate={handleNavigate} />
                </Suspense>
              )}
            </div>
            <div className={cx(CONTENT_VIEW, activeTab !== 'transactions' && 'hidden')}>
              {visitedTabs.has('transactions') && (
                <Suspense fallback={<p role="status">Đang tải giao dịch...</p>}>
                  <Transactions type={transactionType} />
                </Suspense>
              )}
            </div>
            <div className={cx(CONTENT_VIEW, activeTab !== 'debts' && 'hidden')}>
              {visitedTabs.has('debts') && (
                <Suspense fallback={<p role="status">Đang tải sổ nợ...</p>}>
                  <Debts />
                </Suspense>
              )}
            </div>
            <div className={cx(CONTENT_VIEW, activeTab !== 'planning' && 'hidden')}>
              {visitedTabs.has('planning') && (
                <Suspense fallback={<p role="status">Đang tải kế hoạch...</p>}>
                  <Planning initialSubTab={planningSubTab} onSubTabChange={setPlanningSubTab} />
                </Suspense>
              )}
            </div>
          </div>
        </main>
      </div>

      <StatusBar
        user={user}
        online={online}
        onHome={goHome}
        onOpenAI={handleOpenAIChat}
        onToggleTheme={toggleTheme}
      />

      <BottomNav activeTab={activeTab} onNavigate={handleNavigate} onQuickAdd={quickAdd} />
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
          <AIChatWidget user={user} />
        </Suspense>
      )}
      <ToastContainer theme={theme} position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default App;
