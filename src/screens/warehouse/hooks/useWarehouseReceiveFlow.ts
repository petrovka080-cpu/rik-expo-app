import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ensurePlatformNetworkService,
  subscribePlatformNetwork,
} from "../../../lib/offline/platformNetwork.service";
import {
  selectPlatformOnlineFlag,
  type PlatformOfflineRetryTriggerSource,
} from "../../../lib/offline/platformOffline.model";
import { recordPlatformOfflineTelemetry } from "../../../lib/offline/platformOffline.observability";
import { seedEnsureIncomingItems } from "../warehouse.seed";
import { applyWarehouseReceive } from "./useWarehouseReceiveApply";
import {
  buildWarehouseReceiveEnqueueTelemetry,
  buildWarehouseReceiveManualRetryTelemetry,
  buildWarehouseReceiveRemoteTruth,
  buildWarehouseReceiveSelection as buildReceiveSelection,
  normalizeWarehouseReceiveFlowText as trim,
  planWarehouseReceiveManualSyncResult,
  shouldRequeueWarehouseReceiveManualRetry,
  toWarehouseReceiveDraftItemsFromInputMap as toDraftItemsFromInputMap,
  toWarehouseReceiveQtyInputMap as toQtyInputMap,
  type WarehouseReceiveFlowRow as ReceiveRow,
} from "./warehouseReceiveFlow.model";
import {
  buildWarehouseReceiveSyncUiStatus,
  getWarehouseReceiveDraft,
  hydrateWarehouseReceiveDraftStore,
  markWarehouseReceiveDraftQueued,
  selectWarehouseReceiveQtyInputMap,
  setWarehouseReceiveDraftItems,
  useWarehouseReceiveDraftStore,
} from "../warehouse.receiveDraft.store";
import {
  enqueueWarehouseReceive,
  getWarehouseReceivePendingCount,
  getWarehouseReceiveQueueEntry,
} from "../warehouseReceiveQueue";
import { flushWarehouseReceiveQueue } from "../warehouseReceiveWorker";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const logSuppressedPostUnmount = (
  scope: string,
  details?: Record<string, unknown>,
) => {
  if (__DEV__) console.info(`[warehouse:${scope}] suppressed post-unmount`, details);
};

export function useWarehouseReceiveFlow(params: {
  supabase: SupabaseClient;
  isScreenFocused: boolean;
  itemsModalIncomingId: string | null | undefined;
  loadItemsForHead: (
    incomingId: string,
    force?: boolean,
  ) => Promise<ReceiveRow[]>;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  warehousemanFio: string;
  setReceivingHeadId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsFioConfirmVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setItemsModal: React.Dispatch<
    React.SetStateAction<{
      incomingId: string;
      purchaseId: string;
      poNo: string | null;
      status: string;
    } | null>
  >;
  notifyInfo: (title: string, message?: string) => void;
  notifyError: (title: string, message?: string) => void;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const {
    supabase,
    isScreenFocused,
    itemsModalIncomingId,
    loadItemsForHead,
    fetchToReceive,
    fetchStock,
    warehousemanFio,
    setReceivingHeadId,
    setIsFioConfirmVisible,
    setItemsModal,
    notifyInfo,
    notifyError,
    screenActiveRef: externalScreenActiveRef,
    onError,
  } = params;

  const [qtyInputByItem, setQtyInputByItemState] = useState<
    Record<string, string>
  >({});
  const screenActiveRef = useWarehouseFallbackActiveRef(
    externalScreenActiveRef,
  );
  const focusedRef = useRef(isScreenFocused);
  const activeIncomingIdRef = useRef("");
  const flushQueueRef = useRef<
    (triggerSource: PlatformOfflineRetryTriggerSource) => Promise<unknown>
  >(async () => null);
  const onErrorRef = useRef(onError);
  const syncLocalInputFromDraftRef = useRef<(incomingId: string) => void>(
    () => undefined,
  );
  const receiveDrafts = useWarehouseReceiveDraftStore((state) => state.drafts);
  const activeIncomingId = trim(itemsModalIncomingId);
  const activeDraft = useWarehouseReceiveDraftStore(
    useCallback(
      (state) =>
        activeIncomingId ? (state.drafts[activeIncomingId] ?? null) : null,
      [activeIncomingId],
    ),
  );
  const [runtimeReady, setRuntimeReady] = useState(false);
  const networkOnlineRef = useRef<boolean | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    focusedRef.current = isScreenFocused;
  }, [isScreenFocused]);
  useEffect(() => {
    activeIncomingIdRef.current = activeIncomingId;
  }, [activeIncomingId]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const isScreenActive = useCallback(
    () => isWarehouseScreenActive(screenActiveRef) && focusedRef.current,
    [screenActiveRef],
  );

  const ensureScreenActive = useCallback(
    (scope: string, details?: Record<string, unknown>) => {
      if (isScreenActive()) return true;
      logSuppressedPostUnmount(scope, details);
      return false;
    },
    [isScreenActive],
  );

  const syncLocalInputFromDraft = useCallback(
    (incomingId: string) => {
      if (
        !ensureScreenActive("receiveFlow.syncLocalInputFromDraft", {
          incomingId,
        })
      ) {
        return;
      }
      setQtyInputByItemState(selectWarehouseReceiveQtyInputMap(incomingId));
    },
    [ensureScreenActive],
  );
  useEffect(() => {
    syncLocalInputFromDraftRef.current = syncLocalInputFromDraft;
  }, [syncLocalInputFromDraft]);

  const refreshWarehouseAfterSuccess = useCallback(
    async (incomingId: string) => {
      await Promise.allSettled([
        fetchToReceive(),
        fetchStock(),
        loadItemsForHead(incomingId, true),
      ]);
      if (
        trim(itemsModalIncomingId) === incomingId &&
        ensureScreenActive("receiveFlow.refreshAfterSuccess", { incomingId })
      ) {
        syncLocalInputFromDraft(incomingId);
      }
    },
    [
      ensureScreenActive,
      fetchStock,
      fetchToReceive,
      itemsModalIncomingId,
      loadItemsForHead,
      syncLocalInputFromDraft,
    ],
  );

  const flushQueue = useCallback(
    async (triggerSource: PlatformOfflineRetryTriggerSource) =>
      isScreenActive()
        ? await flushWarehouseReceiveQueue(
            {
              getWarehousemanFio: () => warehousemanFio,
              applyReceive: async ({
                incomingId,
                items,
                warehousemanFio: fio,
                clientMutationId,
              }) =>
                await applyWarehouseReceive({
                  supabase,
                  incomingId,
                  items,
                  warehousemanFio: fio,
                  clientMutationId,
                }),
              refreshAfterSuccess: refreshWarehouseAfterSuccess,
              getNetworkOnline: () => networkOnlineRef.current,
              inspectRemoteReceive: async (incomingId) => {
                const rows = await loadItemsForHead(incomingId, true);
                return buildWarehouseReceiveRemoteTruth(incomingId, rows);
              },
            },
            triggerSource,
          )
        : null,
    [isScreenActive, loadItemsForHead, refreshWarehouseAfterSuccess, supabase, warehousemanFio],
  );
  useEffect(() => {
    flushQueueRef.current = flushQueue;
  }, [flushQueue]);

  const queueIncomingDraft = useCallback(
    async (incomingId: string) => {
      if (
        !ensureScreenActive("receiveFlow.queueIncomingDraft.start", {
          incomingId,
        })
      ) {
        return;
      }
      const queue = await enqueueWarehouseReceive(incomingId);
      const entry = queue.find((row) => row.incomingId === incomingId) ?? null;
      const pendingCount = await getWarehouseReceivePendingCount(incomingId);
      if (
        !ensureScreenActive("receiveFlow.queueIncomingDraft", { incomingId })
      ) {
        return;
      }
      await markWarehouseReceiveDraftQueued(incomingId, pendingCount);
      recordPlatformOfflineTelemetry(
        buildWarehouseReceiveEnqueueTelemetry({
          incomingId,
          coalescedCount: entry?.coalescedCount,
          retryCount: entry?.retryCount,
          pendingCount,
          networkOnline: networkOnlineRef.current,
        }),
      );
    },
    [ensureScreenActive],
  );

  const syncQueuedDraftIfPossible = useCallback(
    async (triggerSource: PlatformOfflineRetryTriggerSource) => {
      if (!runtimeReady || !isScreenActive()) return null;
      return await flushQueue(triggerSource);
    },
    [flushQueue, isScreenActive, runtimeReady],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await hydrateWarehouseReceiveDraftStore();
      if (cancelled) return;
      if (!ensureScreenActive("receiveFlow.bootstrap.runtimeReady")) return;
      setRuntimeReady(true);
      const activeIncomingIdSnapshot = activeIncomingIdRef.current;
      if (activeIncomingIdSnapshot) {
        syncLocalInputFromDraftRef.current(activeIncomingIdSnapshot);
      }
      const snapshot = await ensurePlatformNetworkService();
      if (cancelled || !ensureScreenActive("receiveFlow.bootstrap.network"))
        return;
      networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
      if (!focusedRef.current) return;
      void flushQueueRef.current("bootstrap_complete");
    })().catch((error) => {
      if (!cancelled && isScreenActive()) onErrorRef.current(error);
    });

    return () => {
      cancelled = true;
    };
  }, [ensureScreenActive, isScreenActive]);

  useEffect(() => {
    if (!runtimeReady || !isScreenActive()) return;

    const unsubscribe = subscribePlatformNetwork((state, previous) => {
      const nextOnline = selectPlatformOnlineFlag(state);
      const wasOnline = selectPlatformOnlineFlag(previous);
      networkOnlineRef.current = nextOnline;
      if (wasOnline === false && nextOnline === true && isScreenActive()) {
        void syncQueuedDraftIfPossible("network_back");
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isScreenActive, runtimeReady, syncQueuedDraftIfPossible]);

  useEffect(() => {
    if (!runtimeReady || !isScreenActive()) return;
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (
        prevState !== "active" &&
        nextState === "active" &&
        isScreenActive()
      ) {
        void syncQueuedDraftIfPossible("app_active");
      }
    });
    return () => sub.remove();
  }, [isScreenActive, runtimeReady, syncQueuedDraftIfPossible]);

  useEffect(() => {
    const incomingId = trim(itemsModalIncomingId);
    if (!incomingId) {
      if (!ensureScreenActive("receiveFlow.itemsModal.clear")) return;
      setQtyInputByItemState({});
      return;
    }

    let cancelled = false;
    (async () => {
      await seedEnsureIncomingItems({ supabase, incomingId });
      if (cancelled) return;
      await loadItemsForHead(incomingId, true);
      if (
        cancelled ||
        !ensureScreenActive("receiveFlow.itemsModal.seed", { incomingId })
      )
        return;
      syncLocalInputFromDraft(incomingId);
    })().catch((error) => {
      if (!cancelled && isScreenActive()) onError(error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    ensureScreenActive,
    isScreenActive,
    itemsModalIncomingId,
    loadItemsForHead,
    onError,
    supabase,
    syncLocalInputFromDraft,
  ]);

  useEffect(() => {
    if (!activeIncomingId) return;
    syncLocalInputFromDraft(activeIncomingId);
  }, [activeDraft, activeIncomingId, syncLocalInputFromDraft]);

  const setQtyInputByItem = useCallback(
    (value: React.SetStateAction<Record<string, string>>) => {
      if (!ensureScreenActive("receiveFlow.setQtyInputByItem")) return;
      setQtyInputByItemState((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (activeIncomingId) {
          void setWarehouseReceiveDraftItems(
            activeIncomingId,
            toDraftItemsFromInputMap(next),
          );
        }
        return next;
      });
    },
    [activeIncomingId, ensureScreenActive],
  );

  const handleManualSyncResult = useCallback(
    async (incomingId: string) => {
      const result = await syncQueuedDraftIfPossible("manual_retry");
      if (!result) return;

      if (
        !ensureScreenActive("receiveFlow.manualRetry.commit", { incomingId })
      ) {
        return;
      }
      syncLocalInputFromDraft(incomingId);

      const plan = planWarehouseReceiveManualSyncResult(incomingId, result);
      if (plan.closeItemsModal) {
        setItemsModal(null);
      }

      if (plan.notice.kind === "error") {
        notifyError(plan.notice.title, plan.notice.message);
      } else {
        notifyInfo(plan.notice.title, plan.notice.message);
      }
    },
    [
      ensureScreenActive,
      notifyError,
      notifyInfo,
      setItemsModal,
      syncLocalInputFromDraft,
      syncQueuedDraftIfPossible,
    ],
  );

  const receiveSelectedForHead = useCallback(
    async (incomingIdRaw: string) => {
      const incomingId = trim(incomingIdRaw);
      if (!incomingId) return;
      if (!ensureScreenActive("receiveFlow.retryReceive.start", { incomingId }))
        return;

      try {
        const freshRows = await loadItemsForHead(incomingId, true);
        if (
          !ensureScreenActive("receiveFlow.receiveSelected.loadItems", {
            incomingId,
          })
        ) {
          return;
        }
        if (!freshRows.length) {
          notifyError(
            "Нет материалов",
            "В этой поставке нет материалов для склада. Работы и услуги смотрите в «Подрядчики».",
          );
          return;
        }

        const selection = buildReceiveSelection(freshRows, qtyInputByItem);
        if (!selection.items.length) {
          notifyInfo(
            "Нечего оприходовать",
            "Введите количество больше 0 для нужных строк.",
          );
          return;
        }

        if (
          !ensureScreenActive("receiveFlow.receiveSelected.draftWrite", {
            incomingId,
          })
        ) {
          return;
        }
        await setWarehouseReceiveDraftItems(incomingId, selection.items);
        if (
          !ensureScreenActive("receiveFlow.receiveSelected.localWrite", {
            incomingId,
          })
        ) {
          return;
        }
        setQtyInputByItemState(toQtyInputMap(selection.items));

        if (!trim(warehousemanFio)) {
          if (
            !ensureScreenActive("receiveFlow.receiveSelected.fioPrompt", {
              incomingId,
            })
          ) {
            return;
          }
          setIsFioConfirmVisible(true);
          return;
        }

        if (
          !ensureScreenActive("receiveFlow.receiveSelected.headStart", {
            incomingId,
          })
        ) {
          return;
        }
        setReceivingHeadId(incomingId);
        await queueIncomingDraft(incomingId);
        await handleManualSyncResult(incomingId);
      } catch (error) {
        if (isScreenActive()) {
          onError(error);
        } else {
          logSuppressedPostUnmount("receiveFlow.receiveSelected.error", {
            incomingId,
          });
        }
      } finally {
        if (
          !ensureScreenActive("receiveFlow.receiveSelected.finally", {
            incomingId,
          })
        ) {
          return;
        }
        setReceivingHeadId(null);
      }
    },
    [
      ensureScreenActive,
      handleManualSyncResult,
      isScreenActive,
      loadItemsForHead,
      notifyError,
      notifyInfo,
      onError,
      qtyInputByItem,
      queueIncomingDraft,
      setIsFioConfirmVisible,
      setReceivingHeadId,
      warehousemanFio,
    ],
  );

  const retryReceiveNow = useCallback(
    async (incomingIdRaw: string) => {
      const incomingId = trim(incomingIdRaw);
      if (!incomingId) return;

      try {
        const draft = getWarehouseReceiveDraft(incomingId);
        if (!draft?.items.length) {
          notifyInfo("Нечего повторять", "Локальный черновик прихода пуст.");
          return;
        }

        if (!trim(warehousemanFio)) {
          if (
            !ensureScreenActive("receiveFlow.retryReceive.fioPrompt", {
              incomingId,
            })
          ) {
            return;
          }
          setIsFioConfirmVisible(true);
          return;
        }

        const queued = await getWarehouseReceiveQueueEntry(incomingId);
        const requeueFinalLocalState =
          shouldRequeueWarehouseReceiveManualRetry(queued?.status);

        recordPlatformOfflineTelemetry(
          buildWarehouseReceiveManualRetryTelemetry({
            incomingId,
            draftStatus: draft.status,
            draftRetryCount: draft.retryCount,
            draftPendingCount: draft.pendingCount,
            queuedStatus: queued?.status,
            networkOnline: networkOnlineRef.current,
          }),
        );

        if (!queued || requeueFinalLocalState) {
          await queueIncomingDraft(incomingId);
        }

        if (
          !ensureScreenActive("receiveFlow.retryReceive.headStart", {
            incomingId,
          })
        ) {
          return;
        }
        setReceivingHeadId(incomingId);
        await handleManualSyncResult(incomingId);
      } catch (error) {
        if (isScreenActive()) {
          onError(error);
        } else {
          logSuppressedPostUnmount("receiveFlow.retryReceive.error", {
            incomingId,
          });
        }
      } finally {
        if (
          !ensureScreenActive("receiveFlow.retryReceive.finally", {
            incomingId,
          })
        ) {
          return;
        }
        setReceivingHeadId(null);
      }
    },
    [
      ensureScreenActive,
      handleManualSyncResult,
      isScreenActive,
      notifyInfo,
      onError,
      queueIncomingDraft,
      setIsFioConfirmVisible,
      setReceivingHeadId,
      warehousemanFio,
    ],
  );

  const receiveStatusByIncomingId = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(receiveDrafts).map(([incomingId, draft]) => [
          incomingId,
          buildWarehouseReceiveSyncUiStatus(draft),
        ]),
      ),
    [receiveDrafts],
  );

  const activeReceiveStatus = useMemo(
    () => buildWarehouseReceiveSyncUiStatus(activeDraft),
    [activeDraft],
  );
  const canRetryActiveReceive =
    activeDraft?.status === "retry_wait" ||
    activeDraft?.status === "queued" ||
    activeDraft?.status === "failed_terminal";

  return {
    qtyInputByItem,
    setQtyInputByItem,
    receiveSelectedForHead,
    retryReceiveNow,
    receiveDrafts,
    receiveStatusByIncomingId,
    activeReceiveStatus,
    canRetryActiveReceive,
  };
}
