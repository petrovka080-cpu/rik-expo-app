import { useCallback, useState } from 'react';
import { createCancellableDelay } from './async/mapWithConcurrencyLimit';
import { logger } from './logger';

type Opts = {
  timeoutMs?: number;
  onError?: (e: any) => void;
};

export function useBusyAction(opts?: Opts) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const timeoutMs = opts?.timeoutMs ?? 30000;
  const onError = opts?.onError;

  const run = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (busyKey) return;

      setBusyKey(key);
      try {
        // Таймаут, чтобы операция не висела бесконечно.
        const timeoutDelay = createCancellableDelay(timeoutMs);
        try {
          const timeoutPromise = timeoutDelay.promise.then((status) => {
            if (status === 'elapsed') {
              throw new Error(`Таймаут операции (${Math.round(timeoutMs / 1000)}с)`);
            }
          });

          await Promise.race([fn(), timeoutPromise]);
        } finally {
          timeoutDelay.cancel();
        }
      } catch (e) {
        // Показываем ошибку в логах и наружу.
        logger.error('useBusyAction', key, e);
        onError?.(e);
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, onError, timeoutMs]
  );

  return { busyKey, run, isBusy: (k: string) => busyKey === k };
}
