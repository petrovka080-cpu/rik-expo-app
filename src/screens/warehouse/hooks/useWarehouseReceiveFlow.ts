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
import { nz, parseQtySelected } from "../warehouse.utils";
import { applyWarehouseReceive } from "./useWarehouseReceiveApply";
import {
  buildWarehouseReceiveSyncUiStatus,
  getWarehouseReceiveDraft,
  hydrateWarehouseReceiveDraftStore,
  markWarehouseReceiveDraftQueued,
  selectWarehouseReceiveQtyInputMap,
  setWarehouseReceiveDraftItems,
  useWarehouseReceiveDraftStore,
  type WarehouseReceiveDraftItem,
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

type ReceiveRow = {
  incoming_item_id?: string | null;
  purchase_item_id?: string | number | null;
  qty_expected?: number | string | null;
  qty_received?: number | string | null;
  qty_left?: number | string | null;
};

const trim = (value: unknown) => String(value ?? "").trim();

const toDraftItemsFromInputMap = (
  qtyInputByItem: Record<string, string>,
): WarehouseReceiveDraftItem[] =>
  Object.entries(qtyInputByItem)
    .map(([itemId, raw]) => {
      const normalized = String(raw ?? "")
        .replace(",", ".")
        .replace(/\s+/g, "")
        .trim();
      const qty = Number(normalized);
      return {
        itemId: trim(itemId),
        qty,
        localUpdatedAt: Date.now(),
      };
    })
    .filter((item) => item.itemId && Number.isFinite(item.qty) && item.qty > 0);

const toQtyInputMap = (items: WarehouseReceiveDraftItem[]) =>
  Object.fromEntries(items.map((item) => [item.itemId, String(item.qty)]));

const buildReceiveSelection = (
  rows: ReceiveRow[],
  qtyInputByItem: Record<string, string>,
) => {
  const items: WarehouseReceiveDraftItem[] = [];
  const payload: { purchase_item_id: string; qty: number }[] = [];

  for (const row of rows) {
    const purchaseItemId = trim(row.purchase_item_id);
    if (!purchaseItemId) continue;

    const exp = nz(row.qty_expected, 0);
    const rec = nz(row.qty_received, 0);
    const left = Math.max(0, nz(row.qty_left, exp - rec));
    if (!left) continue;

    const raw = qtyInputByItem[purchaseItemId];
    if (raw == null || trim(raw) === "") continue;

    const qty = parseQtySelected(raw, left);
    if (qty <= 0) continue;

    items.push({
      itemId: purchaseItemId,
      qty,
      localUpdatedAt: Date.now(),
    });
    payload.push({
      purchase_item_id: purchaseItemId,
      qty,
    });
  }

  return {
    items,
    payload,
  };
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
            },
            triggerSource,
          )
        : null,
    [isScreenActive, refreshWarehouseAfterSuccess, supabase, warehousemanFio],
  );

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
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: incomingId,
        syncStatus: "queued",
        queueAction: entry?.coalescedCount ? "coalesce" : "enqueue",
        coalesced: (entry?.coalescedCount ?? 0) > 0,
        retryCount: Math.max(0, entry?.retryCount ?? 0),
        pendingCount,
        failureClass: "none",
        triggerKind: "submit",
        networkKnownOffline: networkOnlineRef.current === false,
        restoredAfterReopen: false,
        manualRetry: false,
        durationMs: null,
      });
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
      if (activeIncomingId) {
        syncLocalInputFromDraft(activeIncomingId);
      }
      const snapshot = await ensurePlatformNetworkService();
      if (cancelled || !ensureScreenActive("receiveFlow.bootstrap.network"))
        return;
      networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
      if (!focusedRef.current) return;
      void syncQueuedDraftIfPossible("bootstrap_complete");
    })().catch((error) => {
      if (!cancelled && isScreenActive()) onError(error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeIncomingId,
    isScreenActive,
    onError,
    syncLocalInputFromDraft,
    syncQueuedDraftIfPossible,
  ]);

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

      if (result.failed) {
        notifyError(
          "Синхронизация отложена",
          `Изменения сохранены локально и будут отправлены позже: ${result.errorMessage ?? "sync_failed"}`,
        );
        return;
      }

      if (result.lastIncomingId !== incomingId) {
        notifyInfo("Готово", "Очередь приёма синхронизирована.");
        return;
      }

      if (result.lastFailCount > 0) {
        notifyError(
          "Приход выполнен с предупреждением",
          `Принято позиций: ${result.lastOkCount}, ошибок: ${result.lastFailCount}, осталось: ${result.lastLeftAfter ?? 0}.`,
        );
        return;
      }

      if ((result.lastLeftAfter ?? 0) <= 0) {
        setItemsModal(null);
      }

      notifyInfo(
        "Готово",
        `Принято позиций: ${result.lastOkCount}\nОсталось: ${result.lastLeftAfter ?? 0}`,
      );
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

        recordPlatformOfflineTelemetry({
          contourKey: "warehouse_receive",
          entityKey: incomingId,
          syncStatus:
            draft.status === "failed_terminal" ? "failed_terminal" : "queued",
          queueAction: "manual_retry",
          coalesced: false,
          retryCount: Math.max(0, draft.retryCount ?? 0),
          pendingCount: Math.max(0, draft.pendingCount ?? 0),
          failureClass:
            draft.status === "failed_terminal"
              ? "failed_terminal"
              : networkOnlineRef.current === false
                ? "offline_wait"
                : "retryable_sync_failure",
          triggerKind: "manual_retry",
          networkKnownOffline: networkOnlineRef.current === false,
          restoredAfterReopen: false,
          manualRetry: true,
          durationMs: null,
        });

        const queued = await getWarehouseReceiveQueueEntry(incomingId);
        if (!queued) {
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
    activeDraft?.status === "retry_wait" || activeDraft?.status === "queued";

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
