import { useEffect, useRef } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";
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
  fetchReports: () => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
  onError: (e: unknown) => void;
}) {
  const { tab, isScreenFocused, periodFrom, periodTo, fetchReports, onError } =
    params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);
  const reportsInFlightRef = useRef<Promise<void> | null>(null);
  const reportsLastKeyRef = useRef("");

  useEffect(() => {
    if (!isScreenFocused) return;
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    if (tab !== TAB_REPORTS) return;
    const key = `${periodFrom || ""}|${periodTo || ""}`;
    if (reportsInFlightRef.current && reportsLastKeyRef.current === key) return;

    reportsLastKeyRef.current = key;
    let active = true;
    const task = fetchReports()
      .catch((e) => {
        if (active && isWarehouseScreenActive(screenActiveRef)) onError(e);
      })
      .finally(() => {
        if (reportsInFlightRef.current === task)
          reportsInFlightRef.current = null;
      });

    reportsInFlightRef.current = task;
    return () => {
      active = false;
    };
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
