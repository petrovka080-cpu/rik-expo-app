import { useCallback, useState } from "react";
import type { Tab } from "../warehouse.types";

export function useWarehouseState(params: {
  tab: Tab;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchReqHeads: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { tab, fetchToReceive, fetchStock, fetchReports, fetchReqHeads, onError } = params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === "К приходу") await fetchToReceive();
      else if (tab === "Склад факт") await fetchStock();
      else if (tab === "Отчёты") await fetchReports();
      else if (tab === "Расход") await fetchReqHeads();
    } catch (e) {
      onError(e);
    } finally {
      setRefreshing(false);
    }
  }, [tab, fetchToReceive, fetchStock, fetchReports, fetchReqHeads, onError]);

  return {
    loading,
    setLoading,
    refreshing,
    onRefresh,
  };
}
