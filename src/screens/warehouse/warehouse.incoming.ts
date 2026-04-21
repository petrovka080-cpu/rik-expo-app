// src/screens/warehouse/warehouse.incoming.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { IncomingRow, ItemRow } from "./warehouse.types";
import {
  fetchWarehouseIncomingHeadsWindow,
  fetchWarehouseIncomingItemsWindow,
} from "./warehouse.incoming.repo";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";
import { recordPlatformGuardSkip } from "../../lib/observability/platformGuardDiscipline";
import { getPlatformNetworkSnapshot } from "../../lib/offline/platformNetwork.service";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./hooks/useWarehouseScreenActivity";
import {
  abortController,
  isAbortError,
} from "../../lib/requestCancellation";

// РјР°Р»РµРЅСЊРєРёРµ СѓС‚РёР»РёС‚С‹ (Р»РѕРєР°Р»СЊРЅРѕ РІ РјРѕРґСѓР»Рµ)
export function useWarehouseIncoming(params?: {
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const screenActiveRef = useWarehouseFallbackActiveRef(
    params?.screenActiveRef,
  );
  const [toReceive, setToReceive] = useState<IncomingRow[]>([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [toReceiveLoading, setToReceiveLoading] = useState(false);
  const [toReceivePage, setToReceivePage] = useState(0);
  const [toReceiveHasMore, setToReceiveHasMore] = useState(true);
  const [toReceiveIsFetching, setToReceiveIsFetching] = useState(false);
  const [toReceiveFetchingPage, setToReceiveFetchingPage] = useState(false);
  const toReceiveFetchMutexRef = useRef(false);
  const toReceiveFetchTaskRef = useRef<Promise<void> | null>(null);
  const toReceivePageRef = useRef(0);
  const toReceiveHasMoreRef = useRef(true);
  const PAGE_SIZE = 30;

  const [itemsByHead, setItemsByHead] = useState<Record<string, ItemRow[]>>({});
  const incomingItemsRequestSeqRef = useRef<Map<string, number>>(new Map());
  const incomingItemsRequestSlotsRef = useRef<
    Map<
      string,
      {
        requestId: number;
        controller: AbortController;
        promise: Promise<ItemRow[]>;
      }
    >
  >(new Map());
  const itemsByHeadRef = useRef<Record<string, ItemRow[]>>({});
  const toReceiveRef = useRef<IncomingRow[]>([]);
  useEffect(() => {
    itemsByHeadRef.current = itemsByHead || {};
  }, [itemsByHead]);
  useEffect(() => {
    toReceiveRef.current = toReceive || [];
  }, [toReceive]);
  useEffect(() => {
    const requestSlots = incomingItemsRequestSlotsRef.current;
    return () => {
      for (const slot of requestSlots.values()) {
        abortController(
          slot.controller,
          "warehouse_incoming_items_owner_disposed",
        );
      }
      requestSlots.clear();
    };
  }, []);

  const fetchToReceive = useCallback(
    async (
      pageIndex: number = 0,
      forceRefresh: boolean = false,
      reason: "initial" | "append" | "refresh" | "realtime" = forceRefresh
        ? "refresh"
        : pageIndex > 0
          ? "append"
          : "initial",
    ) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const networkSnapshot = getPlatformNetworkSnapshot();
      if (networkSnapshot.hydrated && networkSnapshot.networkKnownOffline) {
        recordPlatformGuardSkip("network_known_offline", {
          screen: "warehouse",
          surface: "incoming_list",
          event: "fetch_incoming",
          trigger: reason,
          extra: { pageIndex, forceRefresh, networkKnownOffline: true },
        });
        return;
      }

      if (pageIndex > 0 && !toReceiveHasMoreRef.current && !forceRefresh) {
        recordPlatformGuardSkip("no_more_pages", {
          screen: "warehouse",
          surface: "incoming_list",
          event: "fetch_incoming",
          trigger: reason,
          extra: { pageIndex, forceRefresh },
        });
        return;
      }

      if (toReceiveFetchMutexRef.current) {
        recordPlatformObservability({
          screen: "warehouse",
          surface: "incoming_list",
          category: "reload",
          event: "fetch_incoming",
          result: "joined_inflight",
          extra: { pageIndex, forceRefresh },
        });
        await (toReceiveFetchTaskRef.current ?? Promise.resolve());
        return;
      }

      const observation = beginPlatformObservability({
        screen: "warehouse",
        surface: "incoming_list",
        category: "fetch",
        event: "fetch_incoming",
        sourceKind: "rpc:warehouse_incoming_queue_scope_v1",
        trigger: reason,
      });

      const task = (async () => {
        toReceiveFetchMutexRef.current = true;
        if (!isWarehouseScreenActive(screenActiveRef)) {
          toReceiveFetchMutexRef.current = false;
          toReceiveFetchTaskRef.current = null;
          return;
        }
        setToReceiveIsFetching(true);
        setToReceiveFetchingPage(pageIndex > 0);
        if (pageIndex === 0) setToReceiveLoading(true);

        try {
          const result = await fetchWarehouseIncomingHeadsWindow(
            pageIndex,
            PAGE_SIZE,
          );

          const queue = (result?.rows ?? []) as IncomingRow[];
          const hasNext = result?.meta.hasMore === true;
          toReceiveHasMoreRef.current = hasNext;
          toReceivePageRef.current = pageIndex;
          if (!isWarehouseScreenActive(screenActiveRef)) return;
          setToReceiveHasMore(hasNext);
          setToReceivePage(pageIndex);
          if (pageIndex === 0) {
            toReceiveRef.current = queue;
            setToReceive(queue);
            setIncomingCount(queue.length);
          } else {
            const prevRows = toReceiveRef.current;
            const prevIds = new Set(
              prevRows.map((row) => String(row.incoming_id ?? "").trim()),
            );
            const next = queue.filter(
              (row) => !prevIds.has(String(row.incoming_id ?? "").trim()),
            );
            const merged = [...prevRows, ...next];
            toReceiveRef.current = merged;
            setToReceive(merged);
            setIncomingCount(merged.length);
          }

          observation.success({
            rowCount: queue.length,
            sourceKind: result?.sourceMeta.sourceKind,
            fallbackUsed: false,
            extra: {
              pageIndex,
              pageSize: PAGE_SIZE,
              pageOffset: result?.meta.pageOffset,
              rawWindowRowCount: result?.meta.rawWindowRowCount,
              visibleRowCount: queue.length,
              totalVisibleCount: result?.meta.totalVisibleCount ?? null,
              hasMore: hasNext,
              forceRefresh,
              primaryOwner: result?.sourceMeta.primaryOwner,
              contractVersion: result?.meta.contractVersion,
              scopeKey: result?.meta.scopeKey,
            },
          });
          recordPlatformObservability({
            screen: "warehouse",
            surface: "incoming_list",
            category: "ui",
            event: "content_ready",
            result: "success",
            rowCount: queue.length,
            sourceKind: result?.sourceMeta.sourceKind,
            fallbackUsed: result?.sourceMeta.fallbackUsed,
            extra: {
              pageIndex,
              hasMore: hasNext,
              append: pageIndex > 0,
              primaryOwner: result?.sourceMeta.primaryOwner,
              contractVersion: result?.meta.contractVersion,
              scopeKey: result?.meta.scopeKey,
            },
          });
        } catch (e) {
          observation.error(e, {
            errorStage: "fetch_incoming_page_rpc_v1",
            rowCount: 0,
            sourceKind: "rpc:warehouse_incoming_queue_scope_v1",
            fallbackUsed: false,
            extra: {
              pageIndex,
              pageSize: PAGE_SIZE,
              pageOffset: pageIndex * PAGE_SIZE,
              scopeKey: `warehouse_incoming_queue_scope_v1:${pageIndex * PAGE_SIZE}:${PAGE_SIZE}`,
            },
          });
          if (__DEV__) {
            console.warn(
              "[warehouse.incoming] warehouse_incoming_queue_scope_v1 failed:",
              e,
            );
          }
          if (pageIndex === 0 && isWarehouseScreenActive(screenActiveRef)) {
            setToReceive([]);
            setIncomingCount(0);
            setToReceiveHasMore(false);
            toReceiveHasMoreRef.current = false;
          }
        } finally {
          toReceiveFetchMutexRef.current = false;
          toReceiveFetchTaskRef.current = null;
          if (isWarehouseScreenActive(screenActiveRef)) {
            setToReceiveIsFetching(false);
            setToReceiveFetchingPage(false);
            if (pageIndex === 0) setToReceiveLoading(false);
          }
        }
      })();

      toReceiveFetchTaskRef.current = task;
      await task;
    },
    [screenActiveRef],
  );

  const loadItemsForHead = useCallback(
    async (incomingId: string, force = false) => {
      if (!incomingId) return [] as ItemRow[];

      if (!force) {
        const cached = itemsByHeadRef.current[incomingId];
        if (cached) return cached;
      }

      const existingRequest = incomingItemsRequestSlotsRef.current.get(incomingId);
      if (existingRequest && !force) {
        recordPlatformObservability({
          screen: "warehouse",
          surface: "incoming_items",
          category: "reload",
          event: "fetch_incoming_items",
          result: "joined_inflight",
          sourceKind: "rpc:warehouse_incoming_items_scope_v1",
          extra: {
            incomingId,
            requestId: existingRequest.requestId,
            force,
          },
        });
        return existingRequest.promise;
      }

      if (existingRequest) {
        abortController(
          existingRequest.controller,
          "warehouse_incoming_items_request_replaced",
        );
      }

      const requestId =
        (incomingItemsRequestSeqRef.current.get(incomingId) ?? 0) + 1;
      incomingItemsRequestSeqRef.current.set(incomingId, requestId);
      const requestSlot = {
        requestId,
        controller: new AbortController(),
        promise: Promise.resolve([] as ItemRow[]),
      };
      incomingItemsRequestSlotsRef.current.set(incomingId, requestSlot);

      const observation = beginPlatformObservability({
        screen: "warehouse",
        surface: "incoming_items",
        category: "fetch",
        event: "fetch_incoming_items",
        sourceKind: "rpc:warehouse_incoming_items_scope_v1",
        trigger: force ? "refresh" : "initial",
        extra: {
          incomingId,
          requestId,
        },
      });

      requestSlot.promise = (async () => {
        try {
          const result = await fetchWarehouseIncomingItemsWindow(incomingId, {
            signal: requestSlot.controller.signal,
          });

          const rows = (result?.rows ?? []) as ItemRow[];
          const isActiveRequest =
            incomingItemsRequestSlotsRef.current.get(incomingId) === requestSlot &&
            incomingItemsRequestSeqRef.current.get(incomingId) === requestId &&
            isWarehouseScreenActive(screenActiveRef) &&
            !requestSlot.controller.signal.aborted;
          if (isActiveRequest) {
            setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: rows }));
          } else {
            recordPlatformObservability({
              screen: "warehouse",
              surface: "incoming_items",
              category: "fetch",
              event: "fetch_incoming_items_commit_skipped",
              result: "skipped",
              sourceKind: "rpc:warehouse_incoming_items_scope_v1",
              extra: {
                incomingId,
                requestId,
                guardReason: "stale_owner",
              },
            });
          }

          observation.success({
            rowCount: rows.length,
            sourceKind: result?.sourceMeta.sourceKind,
            fallbackUsed: false,
            extra: {
              incomingId,
              requestId,
              rowCount: result?.meta.rowCount,
              scopeKey: result?.meta.scopeKey,
              contractVersion: result?.meta.contractVersion,
            },
          });

          return rows;
        } catch (error) {
          if (isAbortError(error)) {
            const latestRequest = incomingItemsRequestSlotsRef.current.get(incomingId);
            if (latestRequest && latestRequest !== requestSlot) {
              recordPlatformObservability({
                screen: "warehouse",
                surface: "incoming_items",
                category: "fetch",
                event: "fetch_incoming_items",
                result: "skipped",
                sourceKind: "rpc:warehouse_incoming_items_scope_v1",
                extra: {
                  incomingId,
                  requestId,
                  guardReason: "replaced_by_latest",
                },
              });
              return await latestRequest.promise;
            }
            recordPlatformObservability({
              screen: "warehouse",
              surface: "incoming_items",
              category: "fetch",
              event: "fetch_incoming_items",
              result: "skipped",
              sourceKind: "rpc:warehouse_incoming_items_scope_v1",
              extra: {
                incomingId,
                requestId,
                guardReason: "aborted",
              },
            });
            return itemsByHeadRef.current[incomingId] ?? [];
          }

          observation.error(error, {
            errorStage: "fetch_incoming_items_rpc_v1",
            rowCount: 0,
            sourceKind: "rpc:warehouse_incoming_items_scope_v1",
            fallbackUsed: false,
            extra: {
              incomingId,
              requestId,
              scopeKey: `warehouse_incoming_items_scope_v1:${incomingId}`,
            },
          });
          if (__DEV__) {
            console.warn(
              "[warehouse.incoming] warehouse_incoming_items_scope_v1 failed:",
              error,
            );
          }
          if (
            incomingItemsRequestSlotsRef.current.get(incomingId) === requestSlot &&
            isWarehouseScreenActive(screenActiveRef)
          ) {
            setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: [] }));
          }
          return [] as ItemRow[];
        } finally {
          if (incomingItemsRequestSlotsRef.current.get(incomingId) === requestSlot) {
            incomingItemsRequestSlotsRef.current.delete(incomingId);
          }
        }
      })();

      return requestSlot.promise;
    },
    [screenActiveRef],
  );

  // РЅР°СЂСѓР¶Сѓ РѕС‚РґР°С‘Рј РІСЃС‘, С‡С‚Рѕ РЅСѓР¶РЅРѕ СЌРєСЂР°РЅСѓ
  return {
    toReceive,
    incomingCount,
    toReceiveLoading,

    // pagination for incoming
    toReceivePage,
    toReceiveHasMore,
    toReceiveIsFetching,
    toReceiveFetchingPage,

    itemsByHead,
    loadItemsForHead,

    fetchToReceive,
  };
}
