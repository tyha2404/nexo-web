import { useEffect } from 'react';
import { supabase } from '../services/supabase';

interface UseRealtimeSyncProps {
  onTransactionChange?: () => void;
  onWalletChange?: () => void;
}

export function useRealtimeSync({ onTransactionChange, onWalletChange }: UseRealtimeSyncProps) {
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          if (onTransactionChange) {
            onTransactionChange();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
        },
        () => {
          if (onWalletChange) {
            onWalletChange();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onTransactionChange, onWalletChange]);
}
