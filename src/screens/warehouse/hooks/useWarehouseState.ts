import { useCallback, useState } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

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
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const {
    tab,
    fetchToReceive,
    fetchStock,
    fetchReports,
    refreshExpenseQueue,
    onError,
  } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setRefreshing(true);
    try {
      if (tab === TAB_INCOMING) await fetchToReceive();
      else if (tab === TAB_STOCK_FACT) await fetchStock();
      else if (tab === TAB_REPORTS) await fetchReports();
      else if (tab === TAB_EXPENSE) await refreshExpenseQueue();
    } catch (e) {
      if (isWarehouseScreenActive(screenActiveRef)) onError(e);
    } finally {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      setRefreshing(false);
    }
  }, [
    tab,
    fetchToReceive,
    fetchStock,
    fetchReports,
    refreshExpenseQueue,
    onError,
    screenActiveRef,
  ]);

  return {
    loading,
    setLoading,
    refreshing,
    onRefresh,
  };
}
