import { useEffect } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
import { isAbortError } from "../../../lib/requestCancellation";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

const TAB_REPORTS = WAREHOUSE_TABS[3];

export function useWarehouseTabEffects(params: {
  tab: Tab;
  isScreenFocused: boolean;
  periodFrom: string;
  periodTo: string;
  fetchReports: (params?: { from?: string; to?: string }) => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const { tab, isScreenFocused, periodFrom, periodTo, fetchReports, onError } =
    params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  useEffect(() => {
    if (!isScreenFocused) return;
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    if (tab !== TAB_REPORTS) return;
    void fetchReports({ from: periodFrom, to: periodTo })
      .catch((e) => {
        if (isAbortError(e)) return;
        if (isWarehouseScreenActive(screenActiveRef)) onError(e);
      });
  }, [
    fetchReports,
    isScreenFocused,
    onError,
    periodFrom,
    periodTo,
    screenActiveRef,
    tab,
  ]);
}
