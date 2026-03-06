import { useEffect } from "react";

type Params<RowT> = {
  progressId: string;
  looksLikeUuid: (value: string) => boolean;
  getCurrentRow: () => RowT | null;
  getRowProgressId: (row: RowT) => string;
  onTick: (row: RowT) => Promise<void>;
  intervalMs?: number;
};

export function useIssuedPolling<RowT>(params: Params<RowT>) {
  const {
    progressId,
    looksLikeUuid,
    getCurrentRow,
    getRowProgressId,
    onTick,
    intervalMs = 25000,
  } = params;

  useEffect(() => {
    if (!looksLikeUuid(progressId)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      if (cancelled) return;
      const row = getCurrentRow();
      if (!row) {
        timer = setTimeout(() => void loop(), intervalMs);
        return;
      }
      if (getRowProgressId(row) !== progressId) {
        timer = setTimeout(() => void loop(), intervalMs);
        return;
      }
      await onTick(row);
      if (cancelled) return;
      timer = setTimeout(() => void loop(), intervalMs);
    };

    timer = setTimeout(() => void loop(), intervalMs);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [progressId, looksLikeUuid, getCurrentRow, getRowProgressId, onTick, intervalMs]);
}

