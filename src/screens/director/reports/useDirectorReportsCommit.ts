/**
 * useDirectorReportsCommit.ts
 *
 * Commit-layer hook for Director Reports — handles writing loaded scope data
 * into React state and recording observability branches.
 *
 * Extracted from useDirectorReportsController to separate the "data commit"
 * concern from the "network orchestration" concern.
 *
 * Rules:
 * - No fetch/network calls
 * - No abort/dedup logic
 * - Only writes to state and records observability
 */

import { useCallback, type MutableRefObject } from "react";
import type { DirectorReportFetchMeta } from "../../../lib/api/director_reports";
import type {
  DirectorReportScopeLoadResult,
  DirectorReportScopeOptionsState,
} from "../../../lib/api/directorReportsScope.service";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import type {
  RepDisciplinePayload,
  RepPayload,
} from "../director.types";
import type {
  DirectorObservedBranchMeta,
  DirectorReportsBranchStage,
} from "../directorReports.store";
import { REPORTS_TIMING } from "./directorReports.timing";
import {
  getDisciplineFromPayload,
  summarizeRepDiscipline,
  deriveDisciplineMeta,
} from "./directorReports.helpers";
import {
  emitCommitOptions,
  emitCommitReport,
  emitCommitDiscipline,
} from "./directorReports.observability";

type ReportOptionsState = DirectorReportScopeOptionsState;

export type DirectorReportsCommitDeps = {
  setRepOptObjects: (v: string[]) => void;
  setRepOptObjectIdByName: (v: Record<string, string | null>) => void;
  setRepData: (v: RepPayload | null) => void;
  setRepDiscipline: (v: RepDisciplinePayload | null) => void;
  setRepDisciplinePriceLoading: (v: boolean) => void;
  setRepBranchStage: (stage: DirectorReportsBranchStage, value: DirectorObservedBranchMeta | null) => void;
  lastDisciplineLoadKeyRef: MutableRefObject<string>;
  disciplinePricesReadyRef: MutableRefObject<Set<string>>;
};

export function useDirectorReportsCommit(deps: DirectorReportsCommitDeps) {
  const {
    setRepOptObjects,
    setRepOptObjectIdByName,
    setRepData,
    setRepDiscipline,
    setRepDisciplinePriceLoading,
    setRepBranchStage,
    lastDisciplineLoadKeyRef,
    disciplinePricesReadyRef,
  } = deps;

  const observeBranch = useCallback((
    stage: DirectorReportsBranchStage,
    scopeKey: string,
    meta: DirectorReportFetchMeta | null,
    opts?: { fromCache?: boolean },
  ) => {
    if (!meta) return;
    const observed: DirectorObservedBranchMeta = {
      ...meta,
      observedAt: Date.now(),
      scopeKey,
      fromCache: !!opts?.fromCache,
    };
    setRepBranchStage(stage, observed);
    if (REPORTS_TIMING) {
      const chain = observed.chain.join(" -> ");
      const cacheNote = observed.fromCache ? "transport_cache" : observed.cacheLayer;
      const pricedNote = observed.pricedStage ? ` priced_stage=${observed.pricedStage}` : "";
      const rowsSourceNote = observed.rowsSource ? ` rows_source=${observed.rowsSource}` : "";
      if (__DEV__) console.info(
        `[director_reports] ${stage}.branch: branch=${observed.branch} chain=${chain || "none"} cache=${cacheNote}${pricedNote}${rowsSourceNote}`,
      );
    }
  }, [setRepBranchStage]);

  const commitOptionsState = useCallback((
    key: string,
    value: ReportOptionsState,
    meta: DirectorReportFetchMeta | null,
    opts?: { fromCache?: boolean },
  ) => {
    setRepOptObjects(value.objects);
    setRepOptObjectIdByName(value.objectIdByName);
    observeBranch("options", key, meta, { fromCache: opts?.fromCache });
    emitCommitOptions({ key, itemCount: value.objects.length, fromCache: opts?.fromCache });
  }, [observeBranch, setRepOptObjects, setRepOptObjectIdByName]);

  const commitDisciplineState = useCallback((
    key: string,
    payload: RepDisciplinePayload,
    meta: DirectorReportFetchMeta | null,
    opts?: { pricesReady?: boolean; fromCache?: boolean },
  ) => {
    if (opts?.pricesReady === true) {
      disciplinePricesReadyRef.current.add(key);
    } else if (opts?.pricesReady === false) {
      disciplinePricesReadyRef.current.delete(key);
    }
    setRepDiscipline(payload);
    lastDisciplineLoadKeyRef.current = key;
    setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
    recordPlatformObservability({
      screen: "director",
      surface: "reports_discipline",
      category: "ui",
      event: "content_ready",
      result: "success",
      rowCount: Array.isArray(payload?.works) ? payload.works.length : 0,
      extra: summarizeRepDiscipline(payload),
    });
    observeBranch("discipline", key, meta, { fromCache: opts?.fromCache });
    emitCommitDiscipline({ key, itemCount: Array.isArray(payload?.works) ? payload.works.length : 0, fromCache: opts?.fromCache });
  }, [disciplinePricesReadyRef, lastDisciplineLoadKeyRef, observeBranch, setRepDiscipline, setRepDisciplinePriceLoading]);

  const commitReportState = useCallback((
    key: string,
    payload: RepPayload | null,
    meta: DirectorReportFetchMeta | null,
    opts?: { syncDiscipline?: boolean; fromCache?: boolean },
  ) => {
    setRepData(payload);
    recordPlatformObservability({
      screen: "director",
      surface: "reports_summary",
      category: "ui",
      event: "content_ready",
      result: "success",
      rowCount: payload?.rows?.length ?? 0,
    });
    observeBranch("report", key, meta, { fromCache: opts?.fromCache });
    emitCommitReport({ key, itemCount: payload?.rows?.length ?? 0, fromCache: opts?.fromCache });
    if (opts?.syncDiscipline === false) return;

    const disciplinePayload = getDisciplineFromPayload(payload);
    if (disciplinePayload) {
      const disciplineMeta = deriveDisciplineMeta(meta);
      setRepDiscipline(disciplinePayload);
      lastDisciplineLoadKeyRef.current = key;
      setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
      observeBranch("discipline", key, disciplineMeta, { fromCache: opts?.fromCache });
      return;
    }

    if (lastDisciplineLoadKeyRef.current !== key) {
      setRepDiscipline(null);
      setRepDisciplinePriceLoading(false);
    }
  }, [disciplinePricesReadyRef, lastDisciplineLoadKeyRef, observeBranch, setRepData, setRepDiscipline, setRepDisciplinePriceLoading]);

  const commitLoadedScope = useCallback((
    scopeLoad: DirectorReportScopeLoadResult,
    opts?: { includeDiscipline: boolean },
  ) => {
    commitOptionsState(scopeLoad.optionsKey, scopeLoad.optionsState, scopeLoad.optionsMeta, {
      fromCache: scopeLoad.optionsFromCache,
    });
    commitReportState(scopeLoad.key, scopeLoad.report, scopeLoad.reportMeta, {
      syncDiscipline: false,
      fromCache: scopeLoad.reportFromCache,
    });
    if (scopeLoad.discipline) {
      commitDisciplineState(scopeLoad.key, scopeLoad.discipline, scopeLoad.disciplineMeta, {
        pricesReady: scopeLoad.disciplinePricesReady,
        fromCache: scopeLoad.disciplineFromCache,
      });
    } else if (!opts?.includeDiscipline) {
      setRepDiscipline(null);
      setRepDisciplinePriceLoading(false);
    } else {
      setRepDiscipline(null);
      lastDisciplineLoadKeyRef.current = scopeLoad.key;
      setRepDisciplinePriceLoading(false);
    }
  }, [commitDisciplineState, commitOptionsState, commitReportState, lastDisciplineLoadKeyRef, setRepDiscipline, setRepDisciplinePriceLoading]);

  return {
    observeBranch,
    commitOptionsState,
    commitDisciplineState,
    commitReportState,
    commitLoadedScope,
  };
}
