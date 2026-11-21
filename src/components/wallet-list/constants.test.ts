import { describe, expect, it } from 'vitest';
import type { Wallet } from '../../commons/types';
import { filterWallets, walletGroupOf } from './constants';

const w = (name: string, type: Wallet['type']) => ({ name, type }) as Wallet;

describe('wallet-list constants', () => {
  it('walletGroupOf puts spendable types in AVAILABLE and the rest in their own group', () => {
    expect(walletGroupOf('CASH')).toBe('AVAILABLE');
    expect(walletGroupOf('E_WALLET')).toBe('AVAILABLE');
    expect(walletGroupOf('BANK')).toBe('AVAILABLE');
    expect(walletGroupOf('SAVINGS')).toBe('SAVINGS');
    expect(walletGroupOf('CD')).toBe('INVESTMENT');
    expect(walletGroupOf('STOCK')).toBe('INVESTMENT');
    expect(walletGroupOf('OTHER_ASSET')).toBe('INVESTMENT');
    expect(walletGroupOf('CREDIT')).toBe('CREDIT');
  });

  it('filterWallets keeps the wallets of one group', () => {
    const list = [w('MoMo', 'E_WALLET'), w('MB CCTG', 'CD'), w('ACB', 'BANK'), w('Thẻ', 'CREDIT')];
    expect(filterWallets(list, 'ALL')).toHaveLength(4);
    expect(filterWallets(list, 'AVAILABLE').map((x) => x.name)).toEqual(['MoMo', 'ACB']);
    expect(filterWallets(list, 'INVESTMENT').map((x) => x.name)).toEqual(['MB CCTG']);
  });
});
