import { useCallback } from "react";
import { useDirectorReportsController } from "./hooks/useDirectorReportsController";
import { useDirectorReportsUiStore } from "./directorReports.store";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

export function useDirectorReports({ fmtDateOnly }: Deps) {
  const reports = useDirectorReportsController({ fmtDateOnly });
  const repOpen = useDirectorReportsUiStore((state) => state.repOpen);
  const repPeriodOpen = useDirectorReportsUiStore((state) => state.repPeriodOpen);
  const repObjOpen = useDirectorReportsUiStore((state) => state.repObjOpen);
  const setRepOpen = useDirectorReportsUiStore((state) => state.setRepOpen);
  const setRepPeriodOpen = useDirectorReportsUiStore((state) => state.setRepPeriodOpen);
  const setRepObjOpen = useDirectorReportsUiStore((state) => state.setRepObjOpen);
  const closeReportsUi = useDirectorReportsUiStore((state) => state.closeReportsUi);

  const openReports = useCallback(() => {
    setRepOpen(true);
    reports.openReports();
  }, [reports, setRepOpen]);

  const closeReports = useCallback(() => {
    closeReportsUi();
  }, [closeReportsUi]);

  const applyReportPeriod = useCallback(async (from: string | null, to: string | null) => {
    setRepPeriodOpen(false);
    await reports.applyReportPeriod(from, to);
  }, [reports, setRepPeriodOpen]);

  const clearReportPeriod = useCallback(() => {
    setRepPeriodOpen(false);
    reports.clearReportPeriod();
  }, [reports, setRepPeriodOpen]);

  return {
    ...reports,
    repOpen,
    repPeriodOpen,
    repObjOpen,
    setRepPeriodOpen,
    setRepObjOpen,
    openReports,
    closeReports,
    applyReportPeriod,
    clearReportPeriod,
  };
}
