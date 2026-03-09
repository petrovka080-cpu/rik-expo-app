import { useEffect, useRef } from "react";
import { WAREHOUSE_TABS, type Tab } from "../warehouse.types";

const TAB_REPORTS = WAREHOUSE_TABS[3];
const TAB_EXPENSE = WAREHOUSE_TABS[2];

export function useWarehouseTabEffects(params: {
  tab: Tab;
  periodFrom: string;
  periodTo: string;
  fetchReports: () => Promise<void>;
  fetchReqHeadsForce: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { tab, periodFrom, periodTo, fetchReports, fetchReqHeadsForce, onError } = params;
  const reqHeadsInFlightRef = useRef<Promise<void> | null>(null);
  const reqHeadsLastStartRef = useRef(0);

  useEffect(() => {
    if (tab !== TAB_REPORTS) return;
    fetchReports().catch((e) => onError(e));
  }, [tab, periodFrom, periodTo, fetchReports, onError]);

  useEffect(() => {
    if (tab !== TAB_EXPENSE) return;

    const now = Date.now();
    if (reqHeadsInFlightRef.current) return;
    if (now - reqHeadsLastStartRef.current < 600) return;

    reqHeadsLastStartRef.current = now;
    const task = fetchReqHeadsForce()
      .catch((e) => onError(e))
      .finally(() => {
        if (reqHeadsInFlightRef.current === task) reqHeadsInFlightRef.current = null;
      });

    reqHeadsInFlightRef.current = task;
  }, [tab, fetchReqHeadsForce, onError]);
}

