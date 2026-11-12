import { describe, expect, it } from 'vitest';
import { TransactionType } from '../../commons/constants';
import {
  breadcrumbsOf,
  getPathForTab,
  isTreeChildActive,
  NAV_ITEMS,
  parsePath,
  resolveNavTarget,
  type NavState,
} from './navigation';

const state: NavState = {
  activeTab: 'transactions',
  transactionType: TransactionType.INCOME,
  planningSubTab: 'categories',
};

describe('navigation', () => {
  it('resolveNavTarget: fixed keys, the last sub-page for a bare tab, dashboard otherwise', () => {
    expect(resolveNavTarget('expenses', state)).toEqual({
      tab: 'transactions',
      transactionType: TransactionType.EXPENSE,
    });
    expect(resolveNavTarget('transactions', state)).toEqual({
      tab: 'transactions',
      transactionType: TransactionType.INCOME,
    });
    expect(resolveNavTarget('planning', state)).toEqual({
      tab: 'planning',
      planningSubTab: 'categories',
    });
    expect(resolveNavTarget('targets', state)).toEqual({
      tab: 'planning',
      planningSubTab: 'targets',
    });
    expect(resolveNavTarget('debts', state)).toEqual({ tab: 'debts' });
    expect(resolveNavTarget('nope', state)).toEqual({ tab: 'dashboard' });
  });

  it('isTreeChildActive follows the tab and its sub-page', () => {
    expect(isTreeChildActive('income', state)).toBe(true);
    expect(isTreeChildActive('expenses', state)).toBe(false);
    expect(isTreeChildActive('categories', state)).toBe(false); // planning is not the tab
    expect(isTreeChildActive('categories', { ...state, activeTab: 'planning' })).toBe(true);
    expect(isTreeChildActive('targets', { ...state, activeTab: 'planning' })).toBe(false);
  });

  it('getPathForTab and parsePath round-trip', () => {
    const income = { tab: 'transactions', transactionType: TransactionType.INCOME } as const;
    expect(getPathForTab(income.tab, income)).toBe('/transactions/income');
    expect(parsePath('/transactions/income')).toEqual(income);
    expect(getPathForTab('planning', { planningSubTab: 'categories' })).toBe(
      '/planning/categories'
    );
    expect(parsePath('/planning/categories')).toEqual({
      tab: 'planning',
      planningSubTab: 'categories',
    });
    expect(getPathForTab('debts')).toBe('/debts');
    expect(parsePath('/debts')).toEqual({ tab: 'debts' });
    expect(getPathForTab('dashboard')).toBe('/');
    expect(parsePath('/')).toEqual({ tab: 'dashboard' });
    expect(parsePath('/unknown/x')).toEqual({ tab: 'dashboard' });
    // An unknown sub-page keeps the one last shown.
    expect(parsePath('/transactions/bogus')).toEqual({
      tab: 'transactions',
      transactionType: undefined,
    });
  });

  it('breadcrumbsOf names the tab and its sub-page', () => {
    expect(breadcrumbsOf(state, NAV_ITEMS[1])).toEqual(['Giao dịch', 'Thu nhập']);
    expect(breadcrumbsOf({ ...state, activeTab: 'planning' }, NAV_ITEMS[3])).toEqual([
      'Kế hoạch & Mục tiêu',
      'Danh mục thu chi',
    ]);
    expect(breadcrumbsOf({ ...state, activeTab: 'debts' }, NAV_ITEMS[2])).toEqual(['Sổ Vay & Nợ']);
  });
});
