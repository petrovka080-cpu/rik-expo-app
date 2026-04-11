import { useCallback, useMemo } from "react";
import { UI } from "../warehouse.styles";
import {
  isWarehouseScreenActive,
  useWarehouseFallbackActiveRef,
  type WarehouseScreenActiveRef,
} from "./useWarehouseScreenActivity";

export function useWarehouseReportPeriod(params: {
  setPeriodFrom: React.Dispatch<React.SetStateAction<string>>;
  setPeriodTo: React.Dispatch<React.SetStateAction<string>>;
  setRepPeriodOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchReports: (params?: { from?: string; to?: string }) => Promise<void>;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  const { setPeriodFrom, setPeriodTo, setRepPeriodOpen, fetchReports } = params;
  const screenActiveRef = useWarehouseFallbackActiveRef(params.screenActiveRef);

  const applyReportPeriod = useCallback(
    (from: string, to: string) => {
      if (!isWarehouseScreenActive(screenActiveRef)) return;
      const nextFrom = from || "";
      const nextTo = to || "";
      setPeriodFrom(nextFrom);
      setPeriodTo(nextTo);
      setRepPeriodOpen(false);
      void fetchReports({ from: nextFrom, to: nextTo });
    },
    [
      screenActiveRef,
      setPeriodFrom,
      setPeriodTo,
      setRepPeriodOpen,
      fetchReports,
    ],
  );

  const clearReportPeriod = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setPeriodFrom("");
    setPeriodTo("");
    setRepPeriodOpen(false);
    void fetchReports({ from: "", to: "" });
  }, [
    screenActiveRef,
    setPeriodFrom,
    setPeriodTo,
    setRepPeriodOpen,
    fetchReports,
  ]);

  const closeReportPeriod = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setRepPeriodOpen(false);
  }, [screenActiveRef, setRepPeriodOpen]);

  const onOpenRepPeriod = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    setRepPeriodOpen(true);
  }, [screenActiveRef, setRepPeriodOpen]);

  const onReportsRefresh = useCallback(() => {
    if (!isWarehouseScreenActive(screenActiveRef)) return;
    void fetchReports();
  }, [fetchReports, screenActiveRef]);

  const repPeriodUi = useMemo(
    () => ({
      cardBg: UI.cardBg,
      text: UI.text,
      sub: UI.sub,
      border: "rgba(255,255,255,0.14)",
      accentBlue: "#3B82F6",
      approve: UI.accent,
    }),
    [],
  );

  return {
    applyReportPeriod,
    clearReportPeriod,
    closeReportPeriod,
    onOpenRepPeriod,
    onReportsRefresh,
    repPeriodUi,
  };
}
