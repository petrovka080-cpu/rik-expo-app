import { useCallback, useState } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

const TAB_INCOMING = WAREHOUSE_TABS[0];
const TAB_STOCK_FACT = WAREHOUSE_TABS[1];
const TAB_EXPENSE = WAREHOUSE_TABS[2];
const TAB_REPORTS = WAREHOUSE_TABS[3];

export function useWarehouseState(params: {
  tab: Tab;
  fetchToReceive: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchReports: () => Promise<void>;
  refreshExpenseQueue: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { tab, fetchToReceive, fetchStock, fetchReports, refreshExpenseQueue, onError } = params;
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === TAB_INCOMING) await fetchToReceive();
      else if (tab === TAB_STOCK_FACT) await fetchStock();
      else if (tab === TAB_REPORTS) await fetchReports();
      else if (tab === TAB_EXPENSE) await refreshExpenseQueue();
    } catch (e) {
      onError(e);
    } finally {
      setRefreshing(false);
    }
  }, [tab, fetchToReceive, fetchStock, fetchReports, refreshExpenseQueue, onError]);

  return {
    loading,
    setLoading,
    refreshing,
    onRefresh,
  };
}
