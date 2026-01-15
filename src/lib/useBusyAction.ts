import { useCallback, useState } from 'react';

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
        await Promise.race([
          fn(),
          new Promise<void>((_, rej) =>
            setTimeout(() => rej(new Error('Таймаут операции (30с)')), timeoutMs)
          ),
        ]);
      } catch (e) {
        // покажем ошибку в консоль и наружу
        console.error('[useBusyAction]', key, e);
        opts?.onError?.(e);
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, opts?.timeoutMs, opts?.onError]
  );

  return { busyKey, run, isBusy: (k: string) => busyKey === k };
}
