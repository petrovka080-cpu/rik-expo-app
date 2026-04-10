// src/screens/warehouse/warehouse.incoming.ts
import { useCallback, useEffect, useRef, useState } from "react";

const useMountedRef = () => {
  const ref = useRef(true);
  useEffect(() => () => { ref.current = false; }, []);
  return ref;
};
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

// РјР°Р»РµРЅСЊРєРёРµ СѓС‚РёР»РёС‚С‹ (Р»РѕРєР°Р»СЊРЅРѕ РІ РјРѕРґСѓР»Рµ)
export function useWarehouseIncoming() {
  const mountedRef = useMountedRef();
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
      setToReceiveIsFetching(true);
      setToReceiveFetchingPage(pageIndex > 0);
      if (pageIndex === 0) setToReceiveLoading(true);

      try {
        const result = await fetchWarehouseIncomingHeadsWindow(pageIndex, PAGE_SIZE);

        const queue = (result?.rows ?? []) as IncomingRow[];
        const hasNext = result?.meta.hasMore === true;
        toReceiveHasMoreRef.current = hasNext;
        toReceivePageRef.current = pageIndex;
        setToReceiveHasMore(hasNext);
        setToReceivePage(pageIndex);

        if (!mountedRef.current) return;
        if (pageIndex === 0) {
          toReceiveRef.current = queue;
          setToReceive(queue);
          setIncomingCount(queue.length);
        } else {
          const prevRows = toReceiveRef.current;
          const prevIds = new Set(prevRows.map((row) => String(row.incoming_id ?? "").trim()));
          const next = queue.filter((row) => !prevIds.has(String(row.incoming_id ?? "").trim()));
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
          console.warn("[warehouse.incoming] warehouse_incoming_queue_scope_v1 failed:", e);
        }
        if (pageIndex === 0) {
          setToReceive([]);
          setIncomingCount(0);
          setToReceiveHasMore(false);
          toReceiveHasMoreRef.current = false;
        }
      } finally {
        toReceiveFetchMutexRef.current = false;
        toReceiveFetchTaskRef.current = null;
        if (mountedRef.current) {
          setToReceiveIsFetching(false);
          setToReceiveFetchingPage(false);
          if (pageIndex === 0) setToReceiveLoading(false);
        }
      }
    })();

    toReceiveFetchTaskRef.current = task;
    await task;
  }, []);

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

      const rows = (result?.rows ?? []) as ItemRow[];
      if (mountedRef.current) {
        setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: rows }));
      }

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
      if (mountedRef.current) {
        setItemsByHead((prev) => ({ ...(prev || {}), [incomingId]: [] }));
      }
      return [] as ItemRow[];
    }
  }, []);

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
