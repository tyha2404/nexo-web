import { TransactionType } from '../../commons/constants';
import type { PlanningSubTab } from '../Planning';
// Deep import (not the transaction-list barrel): the shell is in the main bundle and must not
// pull in the lazily loaded list components.
import { TRANSACTION_TYPE_LABEL } from '../transaction-list/constants';
import {
  ArrowLeftRight,
  Gem,
  Handshake,
  LayoutDashboard,
  ShoppingBag,
  Tags,
  Target,
  TrendingUp,
  type IconComponent,
} from '../ui';

export type ActiveTab = 'dashboard' | 'transactions' | 'debts' | 'planning';

/** Where the app is: the tab and, for the tabs that have them, the sub-page. */
export interface NavState {
  activeTab: ActiveTab;
  transactionType: TransactionType;
  planningSubTab: PlanningSubTab;
}

/** A navigation target: the tab plus the sub-page it opens (if any). */
export interface NavTarget {
  tab: ActiveTab;
  transactionType?: TransactionType;
  planningSubTab?: PlanningSubTab;
}

export const NAV_ITEMS = [
  { tab: 'dashboard', label: 'Tổng quan', short: 'Tổng quan', Icon: LayoutDashboard },
  { tab: 'transactions', label: 'Giao dịch', short: 'Giao dịch', Icon: ArrowLeftRight },
  { tab: 'debts', label: 'Sổ Vay & Nợ', short: 'Vay & Nợ', Icon: Handshake },
  { tab: 'planning', label: 'Kế hoạch & Mục tiêu', short: 'Kế hoạch', Icon: Target },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export const PLANNING_SUB_TAB_LABEL: Record<PlanningSubTab, string> = {
  targets: 'Mục tiêu & Ngân sách',
  categories: 'Danh mục thu chi',
};

export type TreeChild = { nav: string; label: string; Icon: IconComponent; iconClass: string };
/** Explorer sub-items of a tab; `nav` is a key of NAV_TARGETS. */
export const TREE_CHILDREN: Partial<Record<ActiveTab, TreeChild[]>> = {
  transactions: [
    {
      nav: 'expenses',
      label: TRANSACTION_TYPE_LABEL[TransactionType.EXPENSE],
      Icon: ShoppingBag,
      iconClass: 'text-expense',
    },
    {
      nav: 'income',
      label: TRANSACTION_TYPE_LABEL[TransactionType.INCOME],
      Icon: TrendingUp,
      iconClass: 'text-income',
    },
    {
      nav: 'investment',
      label: TRANSACTION_TYPE_LABEL[TransactionType.INVESTMENT],
      Icon: Gem,
      iconClass: 'text-investment',
    },
  ],
  planning: [
    {
      nav: 'targets',
      label: PLANNING_SUB_TAB_LABEL.targets,
      Icon: Target,
      iconClass: 'text-warning',
    },
    {
      nav: 'categories',
      label: PLANNING_SUB_TAB_LABEL.categories,
      Icon: Tags,
      iconClass: 'text-purple',
    },
  ],
};

export const TAB_ICON_CLASS: Record<ActiveTab, string> = {
  dashboard: 'text-link',
  transactions: 'text-income',
  debts: 'text-warning',
  planning: 'text-purple',
};

/**
 * Navigation keys used across the app (onNavigate('income'), explorer items...). 'transactions'
 * and 'planning' are absent: they reopen the sub-page last shown (see resolveNavTarget).
 */
export const NAV_TARGETS: Record<string, NavTarget> = {
  dashboard: { tab: 'dashboard' },
  expenses: { tab: 'transactions', transactionType: TransactionType.EXPENSE },
  income: { tab: 'transactions', transactionType: TransactionType.INCOME },
  investment: { tab: 'transactions', transactionType: TransactionType.INVESTMENT },
  debts: { tab: 'debts' },
  targets: { tab: 'planning', planningSubTab: 'targets' },
  categories: { tab: 'planning', planningSubTab: 'categories' },
};

/** Target of a navigation key; unknown keys go to the dashboard. */
export const resolveNavTarget = (nav: string, state: NavState): NavTarget => {
  if (nav === 'transactions')
    return { tab: 'transactions', transactionType: state.transactionType };
  if (nav === 'planning') return { tab: 'planning', planningSubTab: state.planningSubTab };
  return NAV_TARGETS[nav] ?? NAV_TARGETS.dashboard;
};

/** Whether an explorer sub-item is the page being shown. */
export const isTreeChildActive = (nav: string, state: NavState) => {
  const target = NAV_TARGETS[nav];
  if (!target || target.tab !== state.activeTab) return false;
  if (target.transactionType) return target.transactionType === state.transactionType;
  return target.planningSubTab === state.planningSubTab;
};

/** Hash path of a target ('/transactions/income', '/planning/categories', '/'). */
export const getPathForTab = (
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

/**
 * Parses a hash path (deep link, back/forward) into a target. Sub-pages are only set when the
 * path names a valid one, so the tab otherwise keeps the sub-page last shown.
 */
export const parsePath = (pathname: string): NavTarget => {
  const segments = pathname.split('/').filter(Boolean); // e.g. ["transactions","income"]
  const tab = segments[0];
  if (tab === 'transactions') {
    const typeSegment = segments[1]?.toUpperCase();
    return {
      tab,
      transactionType:
        typeSegment === TransactionType.INCOME ||
        typeSegment === TransactionType.EXPENSE ||
        typeSegment === TransactionType.INVESTMENT
          ? typeSegment
          : undefined,
    };
  }
  if (tab === 'planning') {
    const sub = segments[1];
    return {
      tab,
      planningSubTab: sub === 'categories' || sub === 'targets' ? sub : undefined,
    };
  }
  return { tab: tab === 'debts' ? 'debts' : 'dashboard' };
};

/** Breadcrumb trail of the current page (after the "nexo" root). */
export const breadcrumbsOf = (state: NavState, activeNav: NavItem): string[] => {
  const crumbs: string[] = [activeNav.label];
  if (state.activeTab === 'transactions')
    crumbs.push(TRANSACTION_TYPE_LABEL[state.transactionType]);
  if (state.activeTab === 'planning') crumbs.push(PLANNING_SUB_TAB_LABEL[state.planningSubTab]);
  return crumbs;
};
