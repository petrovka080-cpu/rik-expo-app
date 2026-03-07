import { useEffect } from "react";
import type { Tab } from "../warehouse.types";

export function useWarehouseTabEffects(params: {
  tab: Tab;
  periodFrom: string;
  periodTo: string;
  fetchReports: () => Promise<void>;
  fetchReqHeadsForce: () => Promise<void>;
  onError: (e: unknown) => void;
}) {
  const { tab, periodFrom, periodTo, fetchReports, fetchReqHeadsForce, onError } = params;

  useEffect(() => {
    if (tab === "Отчёты") {
      fetchReports().catch((e) => onError(e));
    }
  }, [tab, periodFrom, periodTo, fetchReports, onError]);

  useEffect(() => {
    if (tab === "Расход") {
      fetchReqHeadsForce().catch((e) => onError(e));
    }
  }, [tab, fetchReqHeadsForce, onError]);
}

