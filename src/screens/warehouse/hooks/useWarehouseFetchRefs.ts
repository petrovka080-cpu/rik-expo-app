import { useCallback, useEffect, useRef } from "react";

import { normalizeAppError } from "../../../lib/errors/appError";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

type FetchToReceiveFn = (
  page?: number,
  forceRefresh?: boolean,
  reason?: "initial" | "append" | "refresh" | "realtime",
) => Promise<void>;
type FetchStockFn = () => Promise<void>;
type FetchReqHeadsFn = (
  pageIndex?: number,
  forceRefresh?: boolean,
) => Promise<void>;
type FetchReportsFn = () => Promise<void>;

type RefreshState = {
  inFlight: Promise<void> | null;
  rerunQueued: boolean;
  rerunForce: boolean;
};

type RefreshStateRef = {
  current: RefreshState;
};

type RefreshMeta = {
  surface: string;
  event: string;
  sourceKind: string;
};

const recordQueuedRefreshFailure = (error: unknown, meta: RefreshMeta) => {
  const appError = normalizeAppError(
    error,
    `warehouse.${meta.surface}.${meta.event}.queued_rerun`,
  );
  recordPlatformObservability({
    screen: "warehouse",
    surface: meta.surface,
    category: "reload",
    event: meta.event,
    result: "error",
    sourceKind: meta.sourceKind,
    errorStage: "queued_rerun",
    errorClass: appError.code,
    errorMessage: appError.message,
    extra: {
      context: appError.context,
      severity: appError.severity,
    },
  });
};

export function useWarehouseFetchRefs(params: {
  fetchToReceive: FetchToReceiveFn;
  fetchStock: FetchStockFn;
  fetchReqHeads: FetchReqHeadsFn;
  fetchReports: FetchReportsFn;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { fetchToReceive, fetchStock, fetchReqHeads, fetchReports } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const fetchToReceiveRef = useRef(fetchToReceive);
  const fetchStockRef = useRef(fetchStock);
  const fetchReqHeadsRef = useRef(fetchReqHeads);
  const fetchReportsRef = useRef(fetchReports);
  const incomingRefreshRef = useRef<RefreshState>({
    inFlight: null,
    rerunQueued: false,
    rerunForce: false,
  });
  const stockRefreshRef = useRef<RefreshState>({
    inFlight: null,
    rerunQueued: false,
    rerunForce: false,
  });
  const reqHeadsRefreshRef = useRef<RefreshState>({
    inFlight: null,
    rerunQueued: false,
    rerunForce: false,
  });
  const reportsRefreshRef = useRef<RefreshState>({
    inFlight: null,
    rerunQueued: false,
    rerunForce: false,
  });

  useEffect(() => {
    fetchToReceiveRef.current = fetchToReceive;
  }, [fetchToReceive]);
  useEffect(() => {
    fetchStockRef.current = fetchStock;
  }, [fetchStock]);
  useEffect(() => {
    fetchReqHeadsRef.current = fetchReqHeads;
  }, [fetchReqHeads]);
  useEffect(() => {
    fetchReportsRef.current = fetchReports;
  }, [fetchReports]);

  const runRefresh = useCallback(
    (
      stateRef: RefreshStateRef,
      refresh: (force?: boolean) => Promise<void>,
      meta: RefreshMeta,
      options?: { force?: boolean; queueOnOverlap?: boolean },
    ) => {
      if (!isWarehouseScreenActive(screenActiveRef)) {
        stateRef.current.rerunQueued = false;
        stateRef.current.rerunForce = false;
        return Promise.resolve();
      }

      const force = !!options?.force;
      if (stateRef.current.inFlight) {
        if (force) {
          stateRef.current.rerunQueued = true;
          stateRef.current.rerunForce = true;
        } else if (options?.queueOnOverlap) {
          stateRef.current.rerunQueued = true;
        }
        return stateRef.current.inFlight;
      }

      const start = (nextForce: boolean) => {
        const task = (async () => {
          try {
            if (!isWarehouseScreenActive(screenActiveRef)) return;
            await refresh(nextForce);
          } finally {
            stateRef.current.inFlight = null;
            if (
              stateRef.current.rerunQueued &&
              isWarehouseScreenActive(screenActiveRef)
            ) {
              const rerunForce = stateRef.current.rerunForce;
              stateRef.current.rerunQueued = false;
              stateRef.current.rerunForce = false;
              void start(rerunForce).catch((error) => {
                if (isWarehouseScreenActive(screenActiveRef)) {
                  recordQueuedRefreshFailure(error, meta);
                }
              });
            } else if (!isWarehouseScreenActive(screenActiveRef)) {
              stateRef.current.rerunQueued = false;
              stateRef.current.rerunForce = false;
            }
          }
        })();
        stateRef.current.inFlight = task;
        return task;
      };

      return start(force);
    },
    [screenActiveRef],
  );

  const callFetchToReceive = useCallback(
    (page?: number) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
      if ((page ?? 0) > 0)
        return fetchToReceiveRef.current(page, false, "append");
      return runRefresh(
        incomingRefreshRef,
        () => fetchToReceiveRef.current(0, false, "refresh"),
        {
          surface: "incoming_materials",
          event: "refresh_to_receive",
          sourceKind: "fetchToReceive",
        },
        { queueOnOverlap: true },
      );
    },
    [runRefresh, screenActiveRef],
  );
  const callFetchStock = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
    return runRefresh(
      stockRefreshRef,
      () => fetchStockRef.current(),
      {
        surface: "stock",
        event: "refresh_stock",
        sourceKind: "fetchStock",
      },
      {
        queueOnOverlap: true,
      },
    );
  }, [runRefresh, screenActiveRef]);
  const callFetchReqHeads = useCallback(
    (pageIndex?: number, forceRefresh?: boolean) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
      if ((pageIndex ?? 0) > 0)
        return fetchReqHeadsRef.current(pageIndex, forceRefresh);
      return runRefresh(
        reqHeadsRefreshRef,
        (nextForce) => fetchReqHeadsRef.current(0, nextForce),
        {
          surface: "req_heads",
          event: "refresh_req_heads",
          sourceKind: "fetchReqHeads",
        },
        { force: !!forceRefresh, queueOnOverlap: true },
      );
    },
    [runRefresh, screenActiveRef],
  );
  const callFetchReports = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
    return runRefresh(
      reportsRefreshRef,
      () => fetchReportsRef.current(),
      {
        surface: "reports",
        event: "refresh_reports",
        sourceKind: "fetchReports",
      },
      {
        queueOnOverlap: true,
      },
    );
  }, [runRefresh, screenActiveRef]);

  return {
    callFetchToReceive,
    callFetchStock,
    callFetchReqHeads,
    callFetchReports,
  };
}
