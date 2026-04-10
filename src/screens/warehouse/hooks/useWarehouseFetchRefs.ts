import { useCallback, useEffect, useRef } from "react";

const useMountedRef = () => {
  const ref = useRef(true);
  useEffect(() => () => { ref.current = false; }, []);
  return ref;
};

type FetchToReceiveFn = (
  page?: number,
  forceRefresh?: boolean,
  reason?: "initial" | "append" | "refresh" | "realtime",
) => Promise<void>;
type FetchStockFn = () => Promise<void>;
type FetchReqHeadsFn = (pageIndex?: number, forceRefresh?: boolean) => Promise<void>;
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
}) {
  const { fetchToReceive, fetchStock, fetchReqHeads, fetchReports } = params;
  const mountedRef = useMountedRef();

  const fetchToReceiveRef = useRef(fetchToReceive);
  const fetchStockRef = useRef(fetchStock);
  const fetchReqHeadsRef = useRef(fetchReqHeads);
  const fetchReportsRef = useRef(fetchReports);
  const incomingRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const stockRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const reqHeadsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });
  const reportsRefreshRef = useRef<RefreshState>({ inFlight: null, rerunQueued: false, rerunForce: false });

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
            await refresh(nextForce);
          } finally {
            stateRef.current.inFlight = null;
            if (stateRef.current.rerunQueued && mountedRef.current) {
              const rerunForce = stateRef.current.rerunForce;
              stateRef.current.rerunQueued = false;
              stateRef.current.rerunForce = false;
              void start(rerunForce);
            }
          }
        })();
        stateRef.current.inFlight = task;
        return task;
      };

      return start(force);
    },
    [],
  );

  const callFetchToReceive = useCallback((page?: number) => {
    if ((page ?? 0) > 0) return fetchToReceiveRef.current(page, false, "append");
    return runRefresh(incomingRefreshRef, () => fetchToReceiveRef.current(0, false, "refresh"), { queueOnOverlap: true });
  }, [runRefresh]);
  const callFetchStock = useCallback(() => {
    return runRefresh(stockRefreshRef, () => fetchStockRef.current(), { queueOnOverlap: true });
  }, [runRefresh]);
  const callFetchReqHeads = useCallback((pageIndex?: number, forceRefresh?: boolean) => {
    if ((pageIndex ?? 0) > 0) return fetchReqHeadsRef.current(pageIndex, forceRefresh);
    return runRefresh(
      reqHeadsRefreshRef,
      (nextForce) => fetchReqHeadsRef.current(0, nextForce),
      { force: !!forceRefresh, queueOnOverlap: true },
    );
  }, [runRefresh]);
  const callFetchReports = useCallback(() => {
    return runRefresh(reportsRefreshRef, () => fetchReportsRef.current(), { queueOnOverlap: true });
  }, [runRefresh]);

  return {
    callFetchToReceive,
    callFetchStock,
    callFetchReqHeads,
    callFetchReports,
  };
}
