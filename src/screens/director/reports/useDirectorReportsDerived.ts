/**
 * useDirectorReportsDerived.ts
 *
 * Derived/presentation values for Director Reports.
 *
 * Extracted from useDirectorReportsController to separate
 * pure derived computation from network orchestration.
 *
 * Rules:
 * - No fetch/network calls
 * - No side effects
 * - Only memoized computations from state
 */

import { useCallback, useMemo } from "react";
import type { DirectorReportScopeOptionsState } from "../../../lib/api/directorReportsScope.service";

type ReportOptionsState = DirectorReportScopeOptionsState;

export type DirectorReportsDerivedDeps = {
  repOptObjects: string[];
  repOptObjectIdByName: Record<string, string | null>;
  repFrom: string | null;
  repTo: string | null;
  fmtDateOnly: (iso?: string | null) => string;
};

export function useDirectorReportsDerived(deps: DirectorReportsDerivedDeps) {
  const { repOptObjects, repOptObjectIdByName, repFrom, repTo, fmtDateOnly } = deps;

  const currentOptionsState = useMemo<ReportOptionsState | null>(() => {
    if (!repOptObjects.length && !Object.keys(repOptObjectIdByName).length) return null;
    return {
      objects: repOptObjects,
      objectIdByName: repOptObjectIdByName,
    };
  }, [repOptObjectIdByName, repOptObjects]);

  const makeOptionsState = useCallback((objectIdByNameOverride?: Record<string, string | null>) => {
    if (!objectIdByNameOverride && !currentOptionsState) return null;
    return {
      objects: currentOptionsState?.objects ?? repOptObjects,
      objectIdByName: objectIdByNameOverride ?? currentOptionsState?.objectIdByName ?? repOptObjectIdByName,
    };
  }, [currentOptionsState, repOptObjectIdByName, repOptObjects]);

  const repPeriodShort = useMemo(() => {
    return repFrom || repTo
      ? `${repFrom ? fmtDateOnly(repFrom) : "—"} -> ${repTo ? fmtDateOnly(repTo) : "—"}`
      : "Весь период";
  }, [fmtDateOnly, repFrom, repTo]);

  return {
    currentOptionsState,
    makeOptionsState,
    repPeriodShort,
  };
}
