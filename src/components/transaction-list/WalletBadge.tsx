import type { Wallet as WalletModel } from '../../commons/types';
import { Wallet, WALLET_BADGE } from '../ui';

/** Wallet of a transaction: codicon + optional emoji icon + name. */
export function WalletBadge({ wallet }: { wallet: WalletModel }) {
  return (
    <span className={WALLET_BADGE}>
      <Wallet size={12} />
      <span>
        {wallet.icon ? `${wallet.icon} ` : ''}
        {wallet.name}
      </span>
    </span>
  );
}
