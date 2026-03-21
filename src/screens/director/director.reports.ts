import { useCallback, useState } from "react";
import { useDirectorReportsController } from "./hooks/useDirectorReportsController";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

export function useDirectorReports({ fmtDateOnly }: Deps) {
  const reports = useDirectorReportsController({ fmtDateOnly });
  const [repOpen, setRepOpen] = useState(false);
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);
  const [repObjOpen, setRepObjOpen] = useState(false);

  const openReports = useCallback(() => {
    setRepOpen(true);
    reports.openReports();
  }, [reports]);

  const closeReports = useCallback(() => {
    setRepOpen(false);
    setRepPeriodOpen(false);
    setRepObjOpen(false);
  }, []);

  const applyReportPeriod = useCallback(async (from: string | null, to: string | null) => {
    setRepPeriodOpen(false);
    await reports.applyReportPeriod(from, to);
  }, [reports]);

  const clearReportPeriod = useCallback(() => {
    setRepPeriodOpen(false);
    reports.clearReportPeriod();
  }, [reports]);

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
