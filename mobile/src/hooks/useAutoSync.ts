import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../stores/useAuthStore';
import { useTransactionStore } from '../stores/transactionStore';

const SYNC_DELAY_MS = 1500;
const RETRY_INTERVAL_MS = 30000;

export function useAutoSync() {
  const userId = useAuthStore((state) => state.user?.id);
  const syncTransactions = useTransactionStore((state) => state.syncTransactions);
  const downloadTransactions = useTransactionStore((state) => state.downloadTransactions);

  const hasPending = useTransactionStore(
    (state) =>
      state.pendingDeletes.length > 0 || state.transactions.some((tx) => !tx.synced && tx.userId === userId)
  );

  useEffect(() => {
    if (!userId) return;

    downloadTransactions().then(syncTransactions);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') downloadTransactions().then(syncTransactions);
    });

    return () => subscription.remove();
  }, [userId, downloadTransactions, syncTransactions]);

  useEffect(() => {
    if (!userId || !hasPending) return;

    const firstTry = setTimeout(syncTransactions, SYNC_DELAY_MS);
    const retry = setInterval(syncTransactions, RETRY_INTERVAL_MS);
    return () => {
      clearTimeout(firstTry);
      clearInterval(retry);
    };
  }, [userId, hasPending, syncTransactions]);
}
