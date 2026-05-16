import { useCallback, useState } from 'react';
import { createCancellableDelay } from './async/mapWithConcurrencyLimit';
import { logger } from './logger';

type Opts = {
  timeoutMs?: number;
  onError?: (e: any) => void;
};

export function useBusyAction(opts?: Opts) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (busyKey) return;

      const timeoutMs = opts?.timeoutMs ?? 30000;

      setBusyKey(key);
      try {
        // таймаут чтобы не висло вечно
        const timeoutDelay = createCancellableDelay(timeoutMs);
        try {
          const timeoutPromise = timeoutDelay.promise.then((status) => {
            if (status === 'elapsed') {
              throw new Error('Таймаут операции (30с)');
            }
          });

          await Promise.race([fn(), timeoutPromise]);
        } finally {
          timeoutDelay.cancel();
        }
      } catch (e) {
        // покажем ошибку в консоль и наружу
        logger.error('useBusyAction', key, e);
        opts?.onError?.(e);
      } finally {
        setBusyKey(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
    [busyKey, opts?.timeoutMs, opts?.onError]
  );

  return { busyKey, run, isBusy: (k: string) => busyKey === k };
}
