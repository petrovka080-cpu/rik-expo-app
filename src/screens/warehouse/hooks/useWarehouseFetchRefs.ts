import { useCallback, useEffect, useRef } from "react";

type FetchToReceiveFn = (page?: number) => Promise<void>;
type FetchStockFn = () => Promise<void>;
type FetchReqHeadsFn = (pageIndex?: number, forceRefresh?: boolean) => Promise<void>;
type FetchReportsFn = () => Promise<void>;

export function useWarehouseFetchRefs(params: {
  fetchToReceive: FetchToReceiveFn;
  fetchStock: FetchStockFn;
  fetchReqHeads: FetchReqHeadsFn;
  fetchReports: FetchReportsFn;
}) {
  const { fetchToReceive, fetchStock, fetchReqHeads, fetchReports } = params;

  const fetchToReceiveRef = useRef(fetchToReceive);
  const fetchStockRef = useRef(fetchStock);
  const fetchReqHeadsRef = useRef(fetchReqHeads);
  const fetchReportsRef = useRef(fetchReports);

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

  const callFetchToReceive = useCallback((page?: number) => {
    return fetchToReceiveRef.current(page);
  }, []);
  const callFetchStock = useCallback(() => {
    return fetchStockRef.current();
  }, []);
  const callFetchReqHeads = useCallback((pageIndex?: number, forceRefresh?: boolean) => {
    return fetchReqHeadsRef.current(pageIndex, forceRefresh);
  }, []);
  const callFetchReports = useCallback(() => {
    return fetchReportsRef.current();
  }, []);

  return {
    callFetchToReceive,
    callFetchStock,
    callFetchReqHeads,
    callFetchReports,
  };
}

