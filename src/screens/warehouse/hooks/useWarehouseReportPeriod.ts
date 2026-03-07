import { useCallback, useMemo } from "react";
import { UI } from "../warehouse.styles";

export function useWarehouseReportPeriod(params: {
  setPeriodFrom: React.Dispatch<React.SetStateAction<string>>;
  setPeriodTo: React.Dispatch<React.SetStateAction<string>>;
  setRepPeriodOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fetchReports: (params?: { from?: string; to?: string }) => Promise<void>;
}) {
  const { setPeriodFrom, setPeriodTo, setRepPeriodOpen, fetchReports } = params;

  const applyReportPeriod = useCallback(
    (from: string, to: string) => {
      const nextFrom = from || "";
      const nextTo = to || "";
      setPeriodFrom(nextFrom);
      setPeriodTo(nextTo);
      setRepPeriodOpen(false);
      void fetchReports({ from: nextFrom, to: nextTo });
    },
    [setPeriodFrom, setPeriodTo, setRepPeriodOpen, fetchReports],
  );

  const clearReportPeriod = useCallback(() => {
    setPeriodFrom("");
    setPeriodTo("");
    setRepPeriodOpen(false);
    void fetchReports({ from: "", to: "" });
  }, [setPeriodFrom, setPeriodTo, setRepPeriodOpen, fetchReports]);

  const closeReportPeriod = useCallback(() => {
    setRepPeriodOpen(false);
  }, [setRepPeriodOpen]);

  const onOpenRepPeriod = useCallback(() => {
    setRepPeriodOpen(true);
  }, [setRepPeriodOpen]);

  const onReportsRefresh = useCallback(() => {
    void fetchReports();
  }, [fetchReports]);

  const repPeriodUi = useMemo(() => ({
    cardBg: UI.cardBg,
    text: UI.text,
    sub: UI.sub,
    border: "rgba(255,255,255,0.14)",
    accentBlue: "#3B82F6",
    approve: UI.accent,
  }), []);

  return {
    applyReportPeriod,
    clearReportPeriod,
    closeReportPeriod,
    onOpenRepPeriod,
    onReportsRefresh,
    repPeriodUi,
  };
}
