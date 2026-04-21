import type {
  OfficeBreadcrumbBatcher,
  OfficeBreadcrumbBatcherFlushReason,
  OfficeBreadcrumbBatcherOptions,
  OfficeReentryMarker,
} from "./officeReentryBreadcrumbs.contract";

export function shouldFlushAfterOfficeMarker(marker: OfficeReentryMarker) {
  return (
    marker.endsWith("_unmount") ||
    marker.endsWith("_before_remove") ||
    marker.endsWith("_blur")
  );
}

export function createOfficeBreadcrumbBatcher<TEntry>(
  options: OfficeBreadcrumbBatcherOptions<TEntry>,
): OfficeBreadcrumbBatcher<TEntry> {
  let pendingBatch: TEntry[] = [];
  let writeQueue = Promise.resolve();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let finalFlushSubscription: { remove: () => void } | null = null;

  function clearFlushTimer() {
    if (flushTimer != null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  function removeFinalFlushSubscription() {
    finalFlushSubscription?.remove();
    finalFlushSubscription = null;
  }

  function flushNow(
    _reason: OfficeBreadcrumbBatcherFlushReason = "manual",
  ): Promise<void> {
    clearFlushTimer();
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        const batch = pendingBatch;
        pendingBatch = [];
        if (!batch.length) return;
        try {
          await options.writeBatch(batch);
        } catch (error) {
          options.onUnexpectedError?.({
            stage: "write_batch",
            error,
          });
        } finally {
          if (!pendingBatch.length) {
            removeFinalFlushSubscription();
          }
        }
      });

    return writeQueue;
  }

  function ensureFinalFlushSubscription() {
    if (finalFlushSubscription || !options.subscribeToFinalFlush) return;
    try {
      finalFlushSubscription = options.subscribeToFinalFlush((reason) => {
        void flushNow(reason);
      });
    } catch (error) {
      options.onUnexpectedError?.({
        stage: "subscribe_final_flush",
        error,
      });
    }
  }

  function scheduleTimedFlush() {
    if (flushTimer != null) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      void flushNow("timer");
    }, options.flushIntervalMs);
    const maybeNodeTimer = flushTimer as { unref?: () => void };
    maybeNodeTimer.unref?.();
  }

  function push(items: TEntry[]): Promise<void> {
    if (!items.length) return writeQueue;

    ensureFinalFlushSubscription();
    pendingBatch.push(...items);

    const shouldFinalFlush = items.some((item) =>
      options.shouldFlushAfterItem?.(item),
    );
    if (shouldFinalFlush || pendingBatch.length >= options.batchSize) {
      return flushNow(shouldFinalFlush ? "route_exit" : "threshold");
    }

    scheduleTimedFlush();
    return writeQueue;
  }

  async function dispose(
    reason: OfficeBreadcrumbBatcherFlushReason = "dispose",
  ): Promise<void> {
    clearFlushTimer();
    await flushNow(reason);
    removeFinalFlushSubscription();
  }

  return {
    dispose,
    flushNow,
    getPendingCount: () => pendingBatch.length,
    push,
  };
}
