import { useCallback, useEffect, useRef } from "react";

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
              void start(rerunForce);
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
        { queueOnOverlap: true },
      );
    },
    [runRefresh, screenActiveRef],
  );
  const callFetchStock = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
    return runRefresh(stockRefreshRef, () => fetchStockRef.current(), {
      queueOnOverlap: true,
    });
  }, [runRefresh, screenActiveRef]);
  const callFetchReqHeads = useCallback(
    (pageIndex?: number, forceRefresh?: boolean) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
      if ((pageIndex ?? 0) > 0)
        return fetchReqHeadsRef.current(pageIndex, forceRefresh);
      return runRefresh(
        reqHeadsRefreshRef,
        (nextForce) => fetchReqHeadsRef.current(0, nextForce),
        { force: !!forceRefresh, queueOnOverlap: true },
      );
    },
    [runRefresh, screenActiveRef],
  );
  const callFetchReports = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return Promise.resolve();
    return runRefresh(reportsRefreshRef, () => fetchReportsRef.current(), {
      queueOnOverlap: true,
    });
  }, [runRefresh, screenActiveRef]);

  return {
    callFetchToReceive,
    callFetchStock,
    callFetchReqHeads,
    callFetchReports,
  };
}
