import type { Wallet, WalletType } from '../../commons/types';
import type { WalletGroup } from '../../services';

export const WALLET_TYPE_LABEL: Record<WalletType, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Tài khoản ngân hàng',
  E_WALLET: 'Ví điện tử',
  JAR: 'Hũ chi tiêu',
  SAVINGS: 'Tiền gửi tiết kiệm',
  CD: 'Chứng chỉ tiền gửi',
  STOCK: 'Cổ phiếu / quỹ',
  OTHER_ASSET: 'Tài sản khác (vàng, crypto…)',
  CREDIT: 'Thẻ tín dụng',
};

export const WALLET_TYPE_OPTIONS = (Object.keys(WALLET_TYPE_LABEL) as WalletType[]).map(
  (value) => ({
    value,
    label: WALLET_TYPE_LABEL[value],
  })
);

/** Group of a wallet type; mirrors model.WalletType.Group on the API. */
export const walletGroupOf = (type: WalletType): WalletGroup => {
  switch (type) {
    case 'SAVINGS':
    case 'CREDIT':
      return type;
    case 'CD':
    case 'STOCK':
    case 'OTHER_ASSET':
      return 'INVESTMENT';
    default:
      return 'AVAILABLE';
  }
};

export const WALLET_GROUP_LABEL: Record<WalletGroup, string> = {
  AVAILABLE: 'Khả dụng',
  SAVINGS: 'Tiết kiệm',
  INVESTMENT: 'Đầu tư',
  CREDIT: 'Tín dụng',
};

/** Order of the group tabs and the share bar. */
export const WALLET_GROUPS = Object.keys(WALLET_GROUP_LABEL) as WalletGroup[];

/** Filter of the wallet list: every wallet, or one group. */
export type WalletFilter = 'ALL' | WalletGroup;

export const filterWallets = (wallets: Wallet[], filter: WalletFilter) =>
  filter === 'ALL' ? wallets : wallets.filter((w) => walletGroupOf(w.type) === filter);

/** Segment colors of the share bar, cycled by order. */
export const SHARE_COLORS = [
  'var(--investment)',
  'var(--income)',
  'var(--warning)',
  'var(--purple)',
  'var(--expense)',
  'var(--muted)',
];
