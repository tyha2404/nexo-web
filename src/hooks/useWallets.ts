import { useCallback, useEffect, useState } from 'react';
import { DATA_EVENTS } from '../commons/constants';
import type { Wallet } from '../commons/types';
import { walletService } from '../services';
import { useDataEvents } from './useDataEvents';

/**
 * The user's wallets, refetched on 'wallets-changed' (a local save, a realtime echo, an app
 * resume). Optional data: on error the list stays as it was (empty at first).
 */
export function useWallets(): Wallet[] {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const fetchWallets = useCallback(() => {
    walletService
      .getWallets()
      .then((res) => setWallets(res.wallets || []))
      .catch(() => {
        // Optional: without wallets the pickers and badges are simply hidden.
      });
  }, []);
  useEffect(fetchWallets, [fetchWallets]);
  useDataEvents([DATA_EVENTS.WALLETS_CHANGED], fetchWallets);
  return wallets;
}
