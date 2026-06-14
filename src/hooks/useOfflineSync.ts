import { useCallback, useEffect, useRef, useState } from 'react';
import { flushPendingMutations, isBrowserOnline } from '../lib/inventorySync';
import { getPendingMutationCount } from '../lib/offlineDb';

interface UseOfflineSyncOptions {
  enabled: boolean;
  onFlushComplete?: (result: {
    synced: number;
    failed: number;
    remaining: number;
  }) => void;
}

export function useOfflineSync({ enabled, onFlushComplete }: UseOfflineSyncOptions) {
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const onFlushCompleteRef = useRef(onFlushComplete);

  useEffect(() => {
    onFlushCompleteRef.current = onFlushComplete;
  }, [onFlushComplete]);

  const refreshPendingCount = useCallback(async () => {
    if (!enabled) {
      setPendingCount(0);
      return;
    }

    try {
      const count = await getPendingMutationCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Erreur de lecture des mutations en attente:', error);
    }
  }, [enabled]);

  const flushQueue = useCallback(async () => {
    if (!enabled || !isBrowserOnline()) {
      await refreshPendingCount();
      return null;
    }

    setIsSyncing(true);
    try {
      const result = await flushPendingMutations();
      setPendingCount(result.remaining);
      onFlushCompleteRef.current?.(result);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [enabled, refreshPendingCount]);

  useEffect(() => {
    if (!enabled) return;

    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      void flushQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isBrowserOnline()) {
      void flushQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, flushQueue, refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    refreshPendingCount,
    flushQueue,
  };
}
