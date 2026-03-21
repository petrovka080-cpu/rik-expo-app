import { useEffect, useRef } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

const TAB_REPORTS = WAREHOUSE_TABS[3];

export function useWarehouseTabEffects(params: {
  tab: Tab;
  periodFrom: string;
  periodTo: string;
  fetchReports: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { tab, periodFrom, periodTo, fetchReports, onError } = params;
  const reportsInFlightRef = useRef<Promise<void> | null>(null);
  const reportsLastKeyRef = useRef("");

  useEffect(() => {
    if (tab !== TAB_REPORTS) return;
    const key = `${periodFrom || ""}|${periodTo || ""}`;
    if (reportsInFlightRef.current && reportsLastKeyRef.current === key) return;

    reportsLastKeyRef.current = key;
    const task = fetchReports()
      .catch((e) => onError(e))
      .finally(() => {
        if (reportsInFlightRef.current === task) reportsInFlightRef.current = null;
      });

    reportsInFlightRef.current = task;
  }, [tab, periodFrom, periodTo, fetchReports, onError]);
}

