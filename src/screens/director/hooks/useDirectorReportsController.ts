import { Alert } from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  loadDirectorReportUiScope,
  type DirectorReportScopeOptionsState,
} from "../../../lib/api/directorReportsScope.service";
import {
  abortController,
  isAbortError,
  throwIfAborted,
} from "../../../lib/requestCancellation";
import { useDirectorReportOptionsQuery } from "./useDirectorReportOptionsQuery";
import type {
  RepDisciplinePayload,
  RepPayload,
  RepTab,
} from "../director.types";
import {
  useDirectorReportsUiStore,
} from "../directorReports.store";
import {
  buildDirectorReportsScopeKey,
  buildDirectorDisciplineKey,
} from "../reports/directorReports.query.key";
import {
  type DirectorReportsRequestSlot,
  startDirectorReportsRequest,
  isActiveDirectorReportsRequest,
  clearDirectorReportsRequest,
  getErrorMessage,
  recordDirectorReportsWarning,
} from "../reports/directorReports.scopeLoader";
import { REPORTS_TIMING, nowMs, logTiming } from "../reports/directorReports.timing";
import { summarizeRepDiscipline, isoDate, minusDays } from "../reports/directorReports.helpers";
import { useDirectorReportsCommit } from "../reports/useDirectorReportsCommit";
import { useDirectorReportsDerived } from "../reports/useDirectorReportsDerived";
import {
  emitQueryStart,
  emitQuerySuccess,
  emitQueryError,
  emitRefreshStart,
  emitRefreshSuccess,
  emitRefreshError,
  emitFiltersChanged,
  emitOpenReports,
} from "../reports/directorReports.observability";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

// Timing utilities imported from ../reports/directorReports.timing.ts
// Helper functions imported from ../reports/directorReports.helpers.ts
// Commit functions imported from ../reports/useDirectorReportsCommit.ts
// Derived values imported from ../reports/useDirectorReportsDerived.ts
// Request-slot lifecycle imported from ../reports/directorReports.scopeLoader.ts

export function useDirectorReportsController({ fmtDateOnly }: Deps) {
  const repTab = useDirectorReportsUiStore((state) => state.repTab);
  const repFrom = useDirectorReportsUiStore((state) => state.repFrom);
  const repTo = useDirectorReportsUiStore((state) => state.repTo);
  const repObjectName = useDirectorReportsUiStore((state) => state.repObjectName);
  const repLoading = useDirectorReportsUiStore((state) => state.repLoading);
  const repDisciplinePriceLoading = useDirectorReportsUiStore((state) => state.repDisciplinePriceLoading);
  const repOptLoading = useDirectorReportsUiStore((state) => state.repOptLoading);
  const repBranchMeta = useDirectorReportsUiStore((state) => state.repBranchMeta);
  const setRepTabState = useDirectorReportsUiStore((state) => state.setRepTab);
  const setReportPeriodState = useDirectorReportsUiStore((state) => state.setReportPeriod);
  const setRepObjectName = useDirectorReportsUiStore((state) => state.setRepObjectName);
  const setRepLoading = useDirectorReportsUiStore((state) => state.setRepLoading);
  const setRepOptLoading = useDirectorReportsUiStore((state) => state.setRepOptLoading);
  const resetRepBranchMeta = useDirectorReportsUiStore((state) => state.resetRepBranchMeta);
  const [repData, setRepData] = useState<RepPayload | null>(null);
  const [repDiscipline, setRepDiscipline] = useState<RepDisciplinePayload | null>(null);
  const [repOptObjects, setRepOptObjects] = useState<string[]>([]);
  const [repOptObjectIdByName, setRepOptObjectIdByName] = useState<Record<string, string | null>>({});
  const reportReqSeqRef = useRef(0);
  // optionsReqSeqRef removed — options fetch now owned by useDirectorReportOptionsQuery (React Query)
  const disciplineReqSeqRef = useRef(0);
  const scopeLoadSeqRef = useRef(0);
  const reportRequestRef = useRef<DirectorReportsRequestSlot | null>(null);
  const disciplineRequestRef = useRef<DirectorReportsRequestSlot | null>(null);
  // optionsRequestRef removed — options fetch now owned by useDirectorReportOptionsQuery (React Query)
  const scopeRequestRef = useRef<DirectorReportsRequestSlot | null>(null);
  const lastDisciplineLoadKeyRef = useRef<string>("");
  const disciplinePricesReadyRef = useRef<Set<string>>(new Set());

  const abortActiveRequests = useCallback((reason: string) => {
    abortController(reportRequestRef.current?.controller, reason);
    abortController(disciplineRequestRef.current?.controller, reason);
    // optionsRequestRef abort removed — options fetch abort now handled by React Query
    abortController(scopeRequestRef.current?.controller, reason);
  }, []);

  // nowMs and logTiming are now module-level imports from directorReports.timing.ts

  const setRepDisciplinePriceLoading = useDirectorReportsUiStore((state) => state.setRepDisciplinePriceLoading);
  const setRepBranchStage = useDirectorReportsUiStore((state) => state.setRepBranchStage);

  const {
    commitOptionsState,
    commitDisciplineState,
    commitReportState,
    commitLoadedScope,
  } = useDirectorReportsCommit({
    setRepOptObjects,
    setRepOptObjectIdByName,
    setRepData,
    setRepDiscipline,
    setRepDisciplinePriceLoading,
    setRepBranchStage,
    lastDisciplineLoadKeyRef,
    disciplinePricesReadyRef,
  });

  const { currentOptionsState, makeOptionsState, repPeriodShort } = useDirectorReportsDerived({
    repOptObjects,
    repOptObjectIdByName,
    repFrom,
    repTo,
    fmtDateOnly,
  });

  const beginScopeRefresh = useCallback((reason: string = "director reports scope changed") => {
    abortActiveRequests(reason);
    // optionsReqSeqRef increment removed — options dedup now handled by React Query
    reportReqSeqRef.current += 1;
    disciplineReqSeqRef.current += 1;
    return ++scopeLoadSeqRef.current;
  }, [abortActiveRequests]);

  useEffect(() => () => {
    beginScopeRefresh("director reports controller unmounted");
  }, [beginScopeRefresh]);

  const loadReportScope = useCallback(async (args: {
    from: string;
    to: string;
    objectName: string | null;
    optionsState?: DirectorReportScopeOptionsState | null;
    includeDiscipline?: boolean;
    skipDisciplinePrices: boolean;
    bypassCache?: boolean;
    signal?: AbortSignal | null;
  }) => loadDirectorReportUiScope(args), []);

  // commitLoadedScope is now provided by useDirectorReportsCommit

  const fetchReport = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const fetchStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = buildDirectorReportsScopeKey(from, to, objectName ?? null, repOptObjectIdByName);
    emitQueryStart({ key, objectName, tab: "materials" });
    const reqId = ++reportReqSeqRef.current;
    const requestSlot = startDirectorReportsRequest(
      reportRequestRef,
      key,
      reqId,
      "director report superseded",
    );
    const { signal } = requestSlot.controller;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      try {
        throwIfAborted(signal);
        const scopeLoad = await loadReportScope({
          from,
          to,
          objectName: objectName ?? null,
          optionsState: currentOptionsState,
          includeDiscipline: false,
          skipDisciplinePrices: true,
          signal,
        });
        throwIfAborted(signal);
        if (
          reqId !== reportReqSeqRef.current ||
          !isActiveDirectorReportsRequest(reportRequestRef, requestSlot)
        ) return;
        commitOptionsState(scopeLoad.optionsKey, scopeLoad.optionsState, scopeLoad.optionsMeta, {
          fromCache: scopeLoad.optionsFromCache,
        });
        commitReportState(scopeLoad.key, scopeLoad.report, scopeLoad.reportMeta, {
          syncDiscipline: false,
          fromCache: scopeLoad.reportFromCache,
        });
        emitQuerySuccess({ key, durationMs: Math.round(nowMs() - fetchStart), resultSize: scopeLoad.report?.rows?.length ?? 0, fromCache: scopeLoad.reportFromCache });
      } catch (e: unknown) {
        if (
          isAbortError(e) ||
          reqId !== reportReqSeqRef.current ||
          !isActiveDirectorReportsRequest(reportRequestRef, requestSlot)
        ) return;
        const message = getErrorMessage(e, "Не удалось получить отчёт");
        emitQueryError({ key, durationMs: Math.round(nowMs() - fetchStart), errorMessage: message });
        if (__DEV__) {
          console.warn("[director] fetchReport:", message);
        }
        if (!opts?.background) {
          setRepData(null);
          Alert.alert("Не удалось получить отчёт", message);
        }
      } finally {
        clearDirectorReportsRequest(reportRequestRef, requestSlot);
        if (!opts?.background && reqId === reportReqSeqRef.current && !signal.aborted) setRepLoading(false);
      }
    })();
    await task;
  }, [commitOptionsState, commitReportState, currentOptionsState, loadReportScope, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepLoading]);

  const fetchDiscipline = useCallback(async (
    objectNameArg?: string | null,
    opts?: { background?: boolean; objectIdByNameOverride?: Record<string, string | null> },
  ) => {
    const totalStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const objectIdByName = opts?.objectIdByNameOverride ?? repOptObjectIdByName;
    const key = buildDirectorDisciplineKey(from, to, objectName ?? null, objectIdByName);
    if (__DEV__) if (REPORTS_TIMING) console.info(`[director_works] api:discipline:start key=${key}`);
    const hasCurrentState = lastDisciplineLoadKeyRef.current === key && repDiscipline != null;
    if (hasCurrentState) {
      const pricesReady = disciplinePricesReadyRef.current.has(key);
      if (!pricesReady) {
        const activeReqId = ++disciplineReqSeqRef.current;
        const requestSlot = startDirectorReportsRequest(
          disciplineRequestRef,
          key,
          activeReqId,
          "director discipline price refresh superseded",
        );
        const { signal } = requestSlot.controller;
        void (async () => {
          try {
            throwIfAborted(signal);
            const pricedScope = await loadReportScope({
              from,
              to,
              objectName: objectName ?? null,
              optionsState: makeOptionsState(objectIdByName),
              includeDiscipline: true,
              skipDisciplinePrices: false,
              signal,
            });
            throwIfAborted(signal);
            if (
              activeReqId !== disciplineReqSeqRef.current ||
              !isActiveDirectorReportsRequest(disciplineRequestRef, requestSlot)
            ) return;
            if (pricedScope.discipline) {
              commitOptionsState(pricedScope.optionsKey, pricedScope.optionsState, pricedScope.optionsMeta, {
                fromCache: pricedScope.optionsFromCache,
              });
              commitDisciplineState(key, pricedScope.discipline, pricedScope.disciplineMeta, {
                pricesReady: true,
                fromCache: pricedScope.disciplineFromCache,
              });
            }
          } catch (error) {
            if (isAbortError(error)) return;
            recordDirectorReportsWarning("reports_priced_scope_refresh_failed", error, {
              fallbackUsed: "base_payload_kept",
              stage: "discipline_priced_refresh",
              objectName: objectName ?? null,
            });
          } finally {
            clearDirectorReportsRequest(disciplineRequestRef, requestSlot);
            if (activeReqId === disciplineReqSeqRef.current && !signal.aborted) setRepDisciplinePriceLoading(false);
          }
        })();
      }
      logTiming("api:discipline:cache_hit", totalStart);
      return;
    }
    const reqId = ++disciplineReqSeqRef.current;
    const requestSlot = startDirectorReportsRequest(
      disciplineRequestRef,
      key,
      reqId,
      "director discipline superseded",
    );
    const { signal } = requestSlot.controller;
    let pricingContinues = false;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      setRepDisciplinePriceLoading(true);
      try {
        const apiStart = nowMs();
        throwIfAborted(signal);
        const baseScope = await loadReportScope({
          from,
          to,
          objectName: objectName ?? null,
          optionsState: makeOptionsState(objectIdByName),
          includeDiscipline: true,
          skipDisciplinePrices: true,
          signal,
        });
        throwIfAborted(signal);
        logTiming("api:discipline:network_done", apiStart);
        if (
          reqId !== disciplineReqSeqRef.current ||
          !isActiveDirectorReportsRequest(disciplineRequestRef, requestSlot)
        ) return;
        commitOptionsState(baseScope.optionsKey, baseScope.optionsState, baseScope.optionsMeta, {
          fromCache: baseScope.optionsFromCache,
        });
        if (baseScope.discipline) {
          commitDisciplineState(key, baseScope.discipline, baseScope.disciplineMeta, {
            pricesReady: baseScope.disciplinePricesReady,
            fromCache: baseScope.disciplineFromCache,
          });
          if (REPORTS_TIMING) {
            const summary = summarizeRepDiscipline(baseScope.discipline);
            if (__DEV__) console.info(
              `[director_works] api:discipline:base_ready works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
            );
          }
        }
        if (!opts?.background && reqId === disciplineReqSeqRef.current && !signal.aborted) setRepLoading(false);

        if (baseScope.disciplinePricesReady) {
          if (reqId === disciplineReqSeqRef.current && !signal.aborted) setRepDisciplinePriceLoading(false);
          return;
        }

        pricingContinues = true;
        void (async () => {
          try {
            throwIfAborted(signal);
            const fullScope = await loadReportScope({
              from,
              to,
              objectName: objectName ?? null,
              optionsState: makeOptionsState(objectIdByName),
              includeDiscipline: true,
              skipDisciplinePrices: false,
              signal,
            });
            throwIfAborted(signal);
            if (
              reqId !== disciplineReqSeqRef.current ||
              !isActiveDirectorReportsRequest(disciplineRequestRef, requestSlot)
            ) return;
            if (fullScope.discipline) {
              commitOptionsState(fullScope.optionsKey, fullScope.optionsState, fullScope.optionsMeta, {
                fromCache: fullScope.optionsFromCache,
              });
              commitDisciplineState(key, fullScope.discipline, fullScope.disciplineMeta, {
                pricesReady: true,
                fromCache: fullScope.disciplineFromCache,
              });
              if (REPORTS_TIMING) {
                const summary = summarizeRepDiscipline(fullScope.discipline);
                if (__DEV__) console.info(
                  `[director_works] api:discipline:priced_ready works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
                );
              }
            }
          } catch (e: unknown) {
            if (isAbortError(e)) return;
            if (__DEV__) if (REPORTS_TIMING) console.warn("[director_works] prices_stage_failed:", getErrorMessage(e, "prices stage failed"));
          } finally {
            clearDirectorReportsRequest(disciplineRequestRef, requestSlot);
            if (reqId === disciplineReqSeqRef.current && !signal.aborted) setRepDisciplinePriceLoading(false);
          }
        })();
      } catch (e: unknown) {
        if (
          isAbortError(e) ||
          reqId !== disciplineReqSeqRef.current ||
          !isActiveDirectorReportsRequest(disciplineRequestRef, requestSlot)
        ) return;
        const message = getErrorMessage(e, "Не удалось получить дисциплины");
        if (__DEV__) {
          console.warn("[director] fetchDiscipline:", message);
        }
        setRepDiscipline(null);
        setRepDisciplinePriceLoading(false);
        if (!opts?.background) {
          Alert.alert("Не удалось получить дисциплины", message);
        }
      } finally {
        if (!pricingContinues) clearDirectorReportsRequest(disciplineRequestRef, requestSlot);
        if (!opts?.background && reqId === disciplineReqSeqRef.current && !signal.aborted) setRepLoading(false);
        logTiming("api:discipline:total", totalStart);
      }
    })();
    await task;
  }, [commitDisciplineState, commitOptionsState, loadReportScope, makeOptionsState, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepDisciplinePriceLoading, setRepLoading]);

  const syncScopeBothModes = useCallback(async (objectName: string | null, modeOverride?: RepTab) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();
    const activeTab = modeOverride ?? repTab;
    const requestSlot = startDirectorReportsRequest(
      scopeRequestRef,
      `${from}|${to}|${String(objectName ?? "")}|${activeTab}`,
      scopeReqId,
      "director scope refresh superseded",
    );
    const { signal } = requestSlot.controller;
    const includeDiscipline = activeTab === "discipline";

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      throwIfAborted(signal);
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName,
        optionsState: currentOptionsState,
        includeDiscipline,
        skipDisciplinePrices: !includeDiscipline,
        signal,
      });
      throwIfAborted(signal);
      if (
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      commitLoadedScope(scopeLoad, { includeDiscipline });
      if (includeDiscipline && scopeLoad.discipline && !scopeLoad.disciplinePricesReady) {
        void fetchDiscipline(objectName, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      } else if (!includeDiscipline) {
        void fetchDiscipline(objectName, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      }
    } catch (e: unknown) {
      if (
        isAbortError(e) ||
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      const message = getErrorMessage(e, "Не удалось пересчитать отчёт");
      if (__DEV__) {
        console.warn("[director] syncScopeBothModes:", message);
      }
      setRepData(null);
      Alert.alert("Не удалось пересчитать отчёт", message);
    } finally {
      clearDirectorReportsRequest(scopeRequestRef, requestSlot);
      if (scopeReqId === scopeLoadSeqRef.current && !signal.aborted) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, currentOptionsState, fetchDiscipline, loadReportScope, repFrom, repTab, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    emitFiltersChanged({ prevObjectName: repObjectName, nextObjectName: obj });
    setRepObjectName(obj);
    await syncScopeBothModes(obj);
  }, [repObjectName, setRepObjectName, syncScopeBothModes]);

  // ── Wave 2 real migration: fetchReportOptions → React Query ──
  // The query hook owns fetch, dedup, abort, and caching for the options path.
  // When query data arrives, we commit it into controller state via effect.
  const reportOptionsQuery = useDirectorReportOptionsQuery({
    periodFrom: repFrom ?? "",
    periodTo: repTo ?? "",
    objectName: repObjectName ?? null,
    currentOptionsState,
    enabled: false, // manual trigger only — options are loaded on demand
  });

  const fetchReportOptions = useCallback(async () => {
    setRepOptLoading(true);
    try {
      const result = await reportOptionsQuery.refetch();
      if (result.data) {
        commitOptionsState(
          result.data.optionsKey,
          result.data.optionsState,
          result.data.optionsMeta,
          { fromCache: result.data.optionsFromCache },
        );
      }
    } catch (e: unknown) {
      if (isAbortError(e)) return;
      if (__DEV__) {
        console.warn("[director] fetchReportOptions:", getErrorMessage(e, "Не удалось получить опции отчётов"));
      }
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
    } finally {
      setRepOptLoading(false);
    }
  }, [commitOptionsState, reportOptionsQuery, setRepOptLoading]);

  const applyReportPeriod = useCallback(async (nextFrom: string | null, nextTo: string | null) => {
    setReportPeriodState(nextFrom, nextTo);
    setRepObjectName(null);

    const from = nextFrom ? String(nextFrom).slice(0, 10) : "";
    const to = nextTo ? String(nextTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();
    const requestSlot = startDirectorReportsRequest(
      scopeRequestRef,
      `${from}|${to}|period|${repTab}`,
      scopeReqId,
      "director report period superseded",
    );
    const { signal } = requestSlot.controller;

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      throwIfAborted(signal);
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: null,
        includeDiscipline: repTab === "discipline",
        skipDisciplinePrices: repTab !== "discipline",
        signal,
      });
      throwIfAborted(signal);
      if (
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      commitLoadedScope(scopeLoad, { includeDiscipline: repTab === "discipline" });
      if (repTab === "discipline" && scopeLoad.discipline && !scopeLoad.disciplinePricesReady) {
        void fetchDiscipline(null, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      }
    } catch (e: unknown) {
      if (
        isAbortError(e) ||
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      const message = getErrorMessage(e, "Не удалось пересчитать отчёт");
      if (__DEV__) {
        console.warn("[director] applyReportPeriod:", message);
      }
      setRepData(null);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
      Alert.alert("Не удалось пересчитать отчёт", message);
    } finally {
      clearDirectorReportsRequest(scopeRequestRef, requestSlot);
      if (scopeReqId === scopeLoadSeqRef.current && !signal.aborted) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, fetchDiscipline, loadReportScope, repTab, resetRepBranchMeta, setRepLoading, setRepObjectName, setRepOptLoading, setReportPeriodState]);

  const clearReportPeriod = useCallback(() => {
    const to = isoDate(new Date());
    const from = isoDate(minusDays(30));
    void applyReportPeriod(from, to);
  }, [applyReportPeriod]);

  const refreshReports = useCallback(async () => {
    const refreshStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const currentObject = repObjectName ?? null;
    const refreshKey = `${from}|${to}|${String(currentObject ?? "")}|refresh|${repTab}`;
    emitRefreshStart({ key: refreshKey, objectName: currentObject });
    const scopeReqId = beginScopeRefresh();
    const requestSlot = startDirectorReportsRequest(
      scopeRequestRef,
      refreshKey,
      scopeReqId,
      "director report refresh superseded",
    );
    const { signal } = requestSlot.controller;

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      throwIfAborted(signal);
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: currentObject,
        optionsState: currentOptionsState,
        includeDiscipline: repTab === "discipline",
        skipDisciplinePrices: repTab !== "discipline",
        bypassCache: true,
        signal,
      });
      throwIfAborted(signal);
      if (
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      commitLoadedScope(scopeLoad, { includeDiscipline: repTab === "discipline" });
      emitRefreshSuccess({ key: refreshKey, durationMs: Math.round(nowMs() - refreshStart), resultSize: scopeLoad.report?.rows?.length ?? 0 });
      if (repTab === "discipline" && scopeLoad.discipline && !scopeLoad.disciplinePricesReady) {
        void fetchDiscipline(currentObject, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      }
    } catch (e: unknown) {
      if (
        isAbortError(e) ||
        scopeReqId !== scopeLoadSeqRef.current ||
        !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
      ) return;
      const message = getErrorMessage(e, "Не удалось обновить отчёт");
      emitRefreshError({ key: refreshKey, durationMs: Math.round(nowMs() - refreshStart), errorMessage: message });
      if (__DEV__) {
        console.warn("[director] refreshReports:", message);
      }
      setRepData(null);
      Alert.alert("Не удалось обновить отчёт", message);
    } finally {
      clearDirectorReportsRequest(scopeRequestRef, requestSlot);
      if (scopeReqId === scopeLoadSeqRef.current && !signal.aborted) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, currentOptionsState, fetchDiscipline, loadReportScope, repFrom, repObjectName, repTab, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading]);

  const setReportTab = useCallback((tab: RepTab) => {
    const switchStart = nowMs();
    setRepTabState(tab);
    if (tab === "discipline") {
      const from = repFrom ? String(repFrom).slice(0, 10) : "";
      const to = repTo ? String(repTo).slice(0, 10) : "";
      const key = buildDirectorDisciplineKey(from, to, repObjectName ?? null, repOptObjectIdByName);
      const hasReady = !!(repDiscipline || repData?.discipline);

      if (hasReady) {
        if (__DEV__) if (REPORTS_TIMING) console.info("[director_works] render_ready:from_cached_payload");
        if (lastDisciplineLoadKeyRef.current !== key) {
          void syncScopeBothModes(repObjectName ?? null, "discipline");
        }
      } else {
        void syncScopeBothModes(repObjectName ?? null, "discipline");
      }
      logTiming("tab_switch_to_works", switchStart);
      return;
    }
    abortController(disciplineRequestRef.current?.controller, "director reports tab changed");
    void fetchReport(undefined, { background: true });
  }, [fetchReport, repData, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepTabState, syncScopeBothModes]);

  const openReports = useCallback(() => {
    const startedAt = nowMs();
    if (__DEV__) if (REPORTS_TIMING) console.info("[director_works] click:open_reports");
    setRepTabState("materials");
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const currentObject = repObjectName ?? null;
    const openKey = `${from}|${to}|${String(currentObject ?? "")}|open`;
    emitOpenReports({ key: openKey, objectName: currentObject });
    const scopeReqId = beginScopeRefresh();
    const requestSlot = startDirectorReportsRequest(
      scopeRequestRef,
      `${from}|${to}|${String(currentObject ?? "")}|open`,
      scopeReqId,
      "director reports open superseded",
    );
    const { signal } = requestSlot.controller;

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    void (async () => {
      try {
        throwIfAborted(signal);
        const scopeLoad = await loadReportScope({
          from,
          to,
          objectName: currentObject,
          optionsState: currentOptionsState,
          includeDiscipline: false,
          skipDisciplinePrices: true,
          signal,
        });
        throwIfAborted(signal);
        if (
          scopeReqId !== scopeLoadSeqRef.current ||
          !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
        ) return;
        commitLoadedScope(scopeLoad, { includeDiscipline: false });
      } catch (e: unknown) {
        if (
          isAbortError(e) ||
          scopeReqId !== scopeLoadSeqRef.current ||
          !isActiveDirectorReportsRequest(scopeRequestRef, requestSlot)
        ) return;
        const message = getErrorMessage(e, "Не удалось получить отчёт");
        if (__DEV__) {
          console.warn("[director] openReports:", message);
        }
        setRepData(null);
        Alert.alert("Не удалось получить отчёт", message);
      } finally {
        clearDirectorReportsRequest(scopeRequestRef, requestSlot);
        if (scopeReqId === scopeLoadSeqRef.current && !signal.aborted) {
          setRepOptLoading(false);
          setRepLoading(false);
        }
      }
    })();
    logTiming("open_reports_dispatch", startedAt);
  }, [beginScopeRefresh, commitLoadedScope, currentOptionsState, loadReportScope, repFrom, repObjectName, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading, setRepTabState]);

  return {
    repTab,
    repFrom,
    repTo,
    repObjectName,
    repLoading,
    repDisciplinePriceLoading,
    repData,
    repDiscipline,
    repOptLoading,
    repOptObjects,
    repPeriodShort,
    repBranchMeta,
    setRepTab: setReportTab,
    fetchReport,
    fetchDiscipline,
    fetchReportOptions,
    applyObjectFilter,
    applyReportPeriod,
    clearReportPeriod,
    openReports,
    refreshReports,
  };
}
