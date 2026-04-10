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
import { useWarehouseUnmountSafety } from "./hooks/useWarehouseUnmountSafety";

// РјР°Р»РµРЅСЊРєРёРµ СѓС‚РёР»РёС‚С‹ (Р»РѕРєР°Р»СЊРЅРѕ РІ РјРѕРґСѓР»Рµ)
export function useWarehouseIncoming() {
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
  const unmountSafety = useWarehouseUnmountSafety("warehouse_incoming");

  const [itemsByHead, setItemsByHead] = useState<Record<string, ItemRow[]>>({});
  const itemsByHeadRef = useRef<Record<string, ItemRow[]>>({});
  const toReceiveRef = useRef<IncomingRow[]>([]);
  useEffect(() => {
    itemsByHeadRef.current = itemsByHead || {};
  }, [itemsByHead]);
  useEffect(() => {
    toReceiveRef.current = toReceive || [];
  }, [toReceive]);

  const fetchToReceive = useCallback(async (
    pageIndex: number = 0,
    forceRefresh: boolean = false,
    reason: "initial" | "append" | "refresh" | "realtime" = forceRefresh ? "refresh" : pageIndex > 0 ? "append" : "initial",
  ) => {
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
      unmountSafety.guardStateUpdate(
        () => {
          setToReceiveIsFetching(true);
          setToReceiveFetchingPage(pageIndex > 0);
          if (pageIndex === 0) setToReceiveLoading(true);
        },
        {
          resource: "incoming_fetch_loading_start",
          reason,
        },
      );

      try {
        const result = await fetchWarehouseIncomingHeadsWindow(pageIndex, PAGE_SIZE);
        if (
          !unmountSafety.shouldHandleAsyncResult({
            resource: "incoming_fetch_window_result",
            reason,
          })
        ) {
          return;
        }

        const queue = (result?.rows ?? []) as IncomingRow[];
        const hasNext = result?.meta.hasMore === true;
        toReceiveHasMoreRef.current = hasNext;
        toReceivePageRef.current = pageIndex;
        unmountSafety.guardStateUpdate(
          () => {
            setToReceiveHasMore(hasNext);
            setToReceivePage(pageIndex);
          },
          {
            resource: "incoming_page_state",
            reason,
          },
        );

        if (pageIndex === 0) {
          toReceiveRef.current = queue;
          unmountSafety.guardStateUpdate(
            () => {
              setToReceive(queue);
              setIncomingCount(queue.length);
            },
            {
              resource: "incoming_page_publish",
              reason,
            },
          );
        } else {
          const prevRows = toReceiveRef.current;
          const prevIds = new Set(prevRows.map((row) => String(row.incoming_id ?? "").trim()));
          const next = queue.filter((row) => !prevIds.has(String(row.incoming_id ?? "").trim()));
          const merged = [...prevRows, ...next];
          toReceiveRef.current = merged;
          unmountSafety.guardStateUpdate(
            () => {
              setToReceive(merged);
              setIncomingCount(merged.length);
            },
            {
              resource: "incoming_append_publish",
              reason,
            },
          );
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
          console.warn("[warehouse.incoming] warehouse_incoming_queue_scope_v1 failed:", e);
        }
        if (pageIndex === 0) {
          unmountSafety.guardStateUpdate(
            () => {
              setToReceive([]);
              setIncomingCount(0);
              setToReceiveHasMore(false);
            },
            {
              resource: "incoming_error_publish",
              reason,
            },
          );
          toReceiveHasMoreRef.current = false;
        }
      } finally {
        toReceiveFetchMutexRef.current = false;
        toReceiveFetchTaskRef.current = null;
        unmountSafety.guardStateUpdate(
          () => {
            setToReceiveIsFetching(false);
            setToReceiveFetchingPage(false);
            if (pageIndex === 0) setToReceiveLoading(false);
          },
          {
            resource: "incoming_fetch_loading_finish",
            reason,
          },
        );
      }
    })();

    toReceiveFetchTaskRef.current = task;
    await task;
  }, [unmountSafety]);

  const loadItemsForHead = useCallback(async (incomingId: string, force = false) => {
    if (!incomingId) return [] as ItemRow[];

    if (!force) {
      const cached = itemsByHeadRef.current[incomingId];
      if (cached) return cached;
    }

    const observation = beginPlatformObservability({
      screen: "warehouse",
      surface: "incoming_items",
      category: "fetch",
      event: "fetch_incoming_items",
      sourceKind: "rpc:warehouse_incoming_items_scope_v1",
      trigger: force ? "refresh" : "initial",
    });

    try {
      const result = await fetchWarehouseIncomingItemsWindow(incomingId);
      if (
        !unmountSafety.shouldHandleAsyncResult({
          resource: "incoming_items_result",
          reason: incomingId,
        })
      ) {
        return [] as ItemRow[];
      }

      const rows = (result?.rows ?? []) as ItemRow[];
      unmountSafety.guardStateUpdate(
        () => {
          setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: rows }));
        },
        {
          resource: "incoming_items_publish",
          reason: incomingId,
        },
      );

      observation.success({
        rowCount: rows.length,
        sourceKind: result?.sourceMeta.sourceKind,
        fallbackUsed: false,
        extra: {
          incomingId,
          rowCount: result?.meta.rowCount,
          scopeKey: result?.meta.scopeKey,
          contractVersion: result?.meta.contractVersion,
        },
      });

      return rows;
    } catch (error) {
      observation.error(error, {
        errorStage: "fetch_incoming_items_rpc_v1",
        rowCount: 0,
        sourceKind: "rpc:warehouse_incoming_items_scope_v1",
        fallbackUsed: false,
        extra: {
          incomingId,
          scopeKey: `warehouse_incoming_items_scope_v1:${incomingId}`,
        },
      });
      if (__DEV__) {
        console.warn("[warehouse.incoming] warehouse_incoming_items_scope_v1 failed:", error);
      }
      unmountSafety.guardStateUpdate(
        () => {
          setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: [] }));
        },
        {
          resource: "incoming_items_error_publish",
          reason: incomingId,
        },
      );
      return [] as ItemRow[];
    }
  }, [unmountSafety]);

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
