import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  type DirectorReportFetchMeta,
} from "../../../lib/api/director_reports";
import {
  loadDirectorReportUiScope,
  type DirectorReportScopeDisciplinePayload,
  type DirectorReportScopeLoadResult,
  type DirectorReportScopeOptionsState,
  type DirectorReportScopePayload,
} from "../../../lib/api/directorReportsScope.service";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import type {
  RepDisciplinePayload,
  RepPayload,
  RepTab,
} from "../director.types";
import {
  useDirectorReportsUiStore,
  type DirectorObservedBranchMeta,
  type DirectorReportsBranchStage,
} from "../directorReports.store";
import {
  clearDirectorReportsInFlight,
  resolveDirectorReportsInFlight,
  type DirectorReportsInFlightEntry,
} from "../directorReportsInFlight";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

type ReportOptionsState = DirectorReportScopeOptionsState;

const REPORTS_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;

type PerformanceLike = {
  now?: () => number;
};

const getPerformance = (): PerformanceLike | null => {
  if (typeof globalThis !== "undefined" && "performance" in globalThis) {
    return (globalThis as typeof globalThis & { performance?: PerformanceLike }).performance ?? null;
  }
  return null;
};

let directorReportsPerfFallbackWarned = false;

const recordDirectorReportsWarning = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) => {
  const message = getErrorMessage(error, event);
  console.warn("[director_reports.controller]", { event, message, ...extra });
  recordPlatformObservability({
    screen: "director",
    surface: "reports",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: message,
    extra: {
      module: "useDirectorReportsController",
      route: "/director",
      role: "director",
      owner: "reports_controller",
      severity: "warn",
      ...extra,
    },
  });
};

const recordDirectorReportsInFlight = (
  event: "reports_inflight_joined" | "reports_inflight_stale_dropped",
  params: {
    stage: "report" | "discipline" | "options";
    key: string;
    reqId?: number;
    staleReqId?: number;
    currentReqId?: number;
  },
) => {
  recordPlatformObservability({
    screen: "director",
    surface: "reports_controller",
    category: "fetch",
    event,
    result: event === "reports_inflight_joined" ? "joined_inflight" : "skipped",
    sourceKind: "director_reports_scope",
    extra: {
      module: "useDirectorReportsController",
      owner: "reports_controller",
      ...params,
    },
  });
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = String(record.message ?? "").trim();
    if (message) return message;
  }

  const raw = String(error ?? "").trim();
  return raw || fallback;
};

const getDisciplineFromPayload = (payload: DirectorReportScopePayload | null): DirectorReportScopeDisciplinePayload | null =>
  payload?.discipline ?? null;

const summarizeRepDiscipline = (payload: DirectorReportScopeDisciplinePayload | null) => {
  const works = Array.isArray(payload?.works) ? payload.works : [];
  let levels = 0;
  let materials = 0;
  for (const work of works) {
    const workLevels = Array.isArray(work.levels) ? work.levels : [];
    levels += workLevels.length;
    for (const level of workLevels) {
      materials += Array.isArray(level.materials) ? level.materials.length : 0;
    }
  }
  return { works: works.length, levels, materials };
};

const isoDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const minusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const deriveDisciplineMeta = (meta: DirectorReportFetchMeta | null): DirectorReportFetchMeta | null =>
  meta ? { ...meta, stage: "discipline", pricedStage: meta.pricedStage ?? "priced" } : null;

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
  const setRepDisciplinePriceLoading = useDirectorReportsUiStore((state) => state.setRepDisciplinePriceLoading);
  const setRepOptLoading = useDirectorReportsUiStore((state) => state.setRepOptLoading);
  const setRepBranchStage = useDirectorReportsUiStore((state) => state.setRepBranchStage);
  const resetRepBranchMeta = useDirectorReportsUiStore((state) => state.resetRepBranchMeta);
  const [repData, setRepData] = useState<RepPayload | null>(null);
  const [repDiscipline, setRepDiscipline] = useState<RepDisciplinePayload | null>(null);
  const [repOptObjects, setRepOptObjects] = useState<string[]>([]);
  const [repOptObjectIdByName, setRepOptObjectIdByName] = useState<Record<string, string | null>>({});
  const reportReqSeqRef = useRef(0);
  const optionsReqSeqRef = useRef(0);
  const disciplineReqSeqRef = useRef(0);
  const scopeLoadSeqRef = useRef(0);
  const inFlightReportRef = useRef<Map<string, DirectorReportsInFlightEntry>>(new Map());
  const inFlightDisciplineRef = useRef<Map<string, DirectorReportsInFlightEntry>>(new Map());
  const inFlightOptionsRef = useRef<Map<string, DirectorReportsInFlightEntry>>(new Map());
  const lastDisciplineLoadKeyRef = useRef<string>("");
  const disciplinePricesReadyRef = useRef<Set<string>>(new Set());

  const nowMs = useCallback(() => {
    try {
      const perf = getPerformance();
      return typeof perf?.now === "function" ? perf.now() : Date.now();
    } catch (error) {
      if (!directorReportsPerfFallbackWarned) {
        directorReportsPerfFallbackWarned = true;
        recordDirectorReportsWarning("reports_performance_clock_unavailable", error, {
          fallbackUsed: "date_now",
        });
      }
      return Date.now();
    }
  }, []);

  const logTiming = useCallback((label: string, startedAt: number) => {
    if (!REPORTS_TIMING) return;
    const ms = Math.round(nowMs() - startedAt);
    console.info(`[director_works] ${label}: ${ms}ms`);
  }, [nowMs]);

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
      console.info(
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
  }, [observeBranch]);

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
  }, [observeBranch, setRepDisciplinePriceLoading]);

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
  }, [observeBranch, setRepDisciplinePriceLoading]);

  const optionsKey = useCallback((from: string, to: string) => `${from}|${to}`, []);
  const reportKey = useCallback(
    (from: string, to: string, objectName: string | null, objectMap: Record<string, string | null>) =>
      `${from}|${to}|${String(objectName ?? "")}|${String(objectName == null ? "" : (objectMap?.[objectName] ?? ""))}`,
    [],
  );
  const disciplineKey = reportKey;
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

  const beginScopeRefresh = useCallback(() => {
    optionsReqSeqRef.current += 1;
    reportReqSeqRef.current += 1;
    disciplineReqSeqRef.current += 1;
    return ++scopeLoadSeqRef.current;
  }, []);

  const loadReportScope = useCallback(async (args: {
    from: string;
    to: string;
    objectName: string | null;
    optionsState?: ReportOptionsState | null;
    includeDiscipline?: boolean;
    skipDisciplinePrices: boolean;
    bypassCache?: boolean;
  }) => loadDirectorReportUiScope(args), []);

  const commitLoadedScope = useCallback((scopeLoad: DirectorReportScopeLoadResult, opts?: { includeDiscipline: boolean }) => {
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
  }, [commitDisciplineState, commitOptionsState, commitReportState, setRepDisciplinePriceLoading]);

  const fetchReport = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = reportKey(from, to, objectName ?? null, repOptObjectIdByName);
    const inFlight = resolveDirectorReportsInFlight(inFlightReportRef.current, key, reportReqSeqRef.current);
    if (inFlight.action === "join") {
      recordDirectorReportsInFlight("reports_inflight_joined", {
        stage: "report",
        key,
        reqId: inFlight.reqId,
      });
      await inFlight.promise;
      return;
    }
    if (inFlight.action === "drop_stale") {
      recordDirectorReportsInFlight("reports_inflight_stale_dropped", {
        stage: "report",
        key,
        staleReqId: inFlight.staleReqId,
        currentReqId: inFlight.currentReqId,
      });
    }

    const reqId = ++reportReqSeqRef.current;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      try {
        const scopeLoad = await loadReportScope({
          from,
          to,
          objectName: objectName ?? null,
          optionsState: currentOptionsState,
          includeDiscipline: false,
          skipDisciplinePrices: true,
        });
        if (reqId !== reportReqSeqRef.current) return;
        commitOptionsState(scopeLoad.optionsKey, scopeLoad.optionsState, scopeLoad.optionsMeta, {
          fromCache: scopeLoad.optionsFromCache,
        });
        commitReportState(scopeLoad.key, scopeLoad.report, scopeLoad.reportMeta, {
          syncDiscipline: false,
          fromCache: scopeLoad.reportFromCache,
        });
      } catch (e: unknown) {
        if (reqId !== reportReqSeqRef.current) return;
        const message = getErrorMessage(e, "Не удалось получить отчёт");
        if (__DEV__) {
          console.warn("[director] fetchReport:", message);
        }
        if (!opts?.background) {
          setRepData(null);
          Alert.alert("Не удалось получить отчёт", message);
        }
      } finally {
        clearDirectorReportsInFlight(inFlightReportRef.current, key, reqId);
        if (!opts?.background && reqId === reportReqSeqRef.current) setRepLoading(false);
      }
    })();
    inFlightReportRef.current.set(key, { reqId, promise: task });
    await task;
  }, [commitOptionsState, commitReportState, currentOptionsState, loadReportScope, repFrom, repObjectName, repOptObjectIdByName, repTo, reportKey, setRepLoading]);

  const fetchDiscipline = useCallback(async (
    objectNameArg?: string | null,
    opts?: { background?: boolean; objectIdByNameOverride?: Record<string, string | null> },
  ) => {
    const totalStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const objectIdByName = opts?.objectIdByNameOverride ?? repOptObjectIdByName;
    const key = disciplineKey(from, to, objectName ?? null, objectIdByName);
    if (REPORTS_TIMING) console.info(`[director_works] api:discipline:start key=${key}`);
    const hasCurrentState = lastDisciplineLoadKeyRef.current === key && repDiscipline != null;
    if (hasCurrentState) {
      const pricesReady = disciplinePricesReadyRef.current.has(key);
      if (!pricesReady) {
        const activeReqId = disciplineReqSeqRef.current;
        void (async () => {
          try {
            const pricedScope = await loadReportScope({
              from,
              to,
              objectName: objectName ?? null,
              optionsState: makeOptionsState(objectIdByName),
              includeDiscipline: true,
              skipDisciplinePrices: false,
            });
            if (activeReqId !== disciplineReqSeqRef.current) return;
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
            recordDirectorReportsWarning("reports_priced_scope_refresh_failed", error, {
              fallbackUsed: "base_payload_kept",
              stage: "discipline_priced_refresh",
              objectName: objectName ?? null,
            });
          } finally {
            if (activeReqId === disciplineReqSeqRef.current) setRepDisciplinePriceLoading(false);
          }
        })();
      }
      logTiming("api:discipline:cache_hit", totalStart);
      return;
    }
    const inFlight = resolveDirectorReportsInFlight(inFlightDisciplineRef.current, key, disciplineReqSeqRef.current);
    if (inFlight.action === "join") {
      recordDirectorReportsInFlight("reports_inflight_joined", {
        stage: "discipline",
        key,
        reqId: inFlight.reqId,
      });
      await inFlight.promise;
      logTiming("api:discipline:join_inflight", totalStart);
      return;
    }
    if (inFlight.action === "drop_stale") {
      recordDirectorReportsInFlight("reports_inflight_stale_dropped", {
        stage: "discipline",
        key,
        staleReqId: inFlight.staleReqId,
        currentReqId: inFlight.currentReqId,
      });
    }

    const reqId = ++disciplineReqSeqRef.current;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      setRepDisciplinePriceLoading(true);
      try {
        const apiStart = nowMs();
        const baseScope = await loadReportScope({
          from,
          to,
          objectName: objectName ?? null,
          optionsState: makeOptionsState(objectIdByName),
          includeDiscipline: true,
          skipDisciplinePrices: true,
        });
        logTiming("api:discipline:network_done", apiStart);
        if (reqId !== disciplineReqSeqRef.current) return;
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
            console.info(
              `[director_works] api:discipline:base_ready works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
            );
          }
        }
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);

        if (baseScope.disciplinePricesReady) {
          if (reqId === disciplineReqSeqRef.current) setRepDisciplinePriceLoading(false);
          return;
        }

        void (async () => {
          try {
            const fullScope = await loadReportScope({
              from,
              to,
              objectName: objectName ?? null,
              optionsState: makeOptionsState(objectIdByName),
              includeDiscipline: true,
              skipDisciplinePrices: false,
            });
            if (reqId !== disciplineReqSeqRef.current) return;
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
                console.info(
                  `[director_works] api:discipline:priced_ready works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
                );
              }
            }
          } catch (e: unknown) {
            if (REPORTS_TIMING) console.warn("[director_works] prices_stage_failed:", getErrorMessage(e, "prices stage failed"));
          } finally {
            if (reqId === disciplineReqSeqRef.current) setRepDisciplinePriceLoading(false);
          }
        })();
      } catch (e: unknown) {
        if (reqId !== disciplineReqSeqRef.current) return;
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
        clearDirectorReportsInFlight(inFlightDisciplineRef.current, key, reqId);
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);
        logTiming("api:discipline:total", totalStart);
      }
    })();
    inFlightDisciplineRef.current.set(key, { reqId, promise: task });
    await task;
  }, [commitDisciplineState, commitOptionsState, disciplineKey, loadReportScope, logTiming, makeOptionsState, nowMs, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepDisciplinePriceLoading, setRepLoading]);

  const syncScopeBothModes = useCallback(async (objectName: string | null, modeOverride?: RepTab) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();
    const activeTab = modeOverride ?? repTab;
    const includeDiscipline = activeTab === "discipline";

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName,
        optionsState: currentOptionsState,
        includeDiscipline,
        skipDisciplinePrices: !includeDiscipline,
      });
      if (scopeReqId !== scopeLoadSeqRef.current) return;
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
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      const message = getErrorMessage(e, "Не удалось пересчитать отчёт");
      if (__DEV__) {
        console.warn("[director] syncScopeBothModes:", message);
      }
      setRepData(null);
      Alert.alert("Не удалось пересчитать отчёт", message);
    } finally {
      if (scopeReqId === scopeLoadSeqRef.current) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, currentOptionsState, fetchDiscipline, loadReportScope, repFrom, repTab, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    setRepObjectName(obj);
    await syncScopeBothModes(obj);
  }, [setRepObjectName, syncScopeBothModes]);

  const fetchReportOptions = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const key = optionsKey(from, to);
    const inFlight = resolveDirectorReportsInFlight(inFlightOptionsRef.current, key, optionsReqSeqRef.current);
    if (inFlight.action === "join") {
      recordDirectorReportsInFlight("reports_inflight_joined", {
        stage: "options",
        key,
        reqId: inFlight.reqId,
      });
      await inFlight.promise;
      return;
    }
    if (inFlight.action === "drop_stale") {
      recordDirectorReportsInFlight("reports_inflight_stale_dropped", {
        stage: "options",
        key,
        staleReqId: inFlight.staleReqId,
        currentReqId: inFlight.currentReqId,
      });
    }

    const reqId = ++optionsReqSeqRef.current;
    const task = (async () => {
      setRepOptLoading(true);
      try {
        const result = await loadReportScope({
          from,
          to,
          objectName: repObjectName ?? null,
          optionsState: currentOptionsState,
          includeDiscipline: false,
          skipDisciplinePrices: true,
        });
        if (reqId !== optionsReqSeqRef.current) return;
        commitOptionsState(key, result.optionsState, result.optionsMeta, {
          fromCache: result.optionsFromCache,
        });
      } catch (e: unknown) {
        if (reqId !== optionsReqSeqRef.current) return;
        if (__DEV__) {
          console.warn("[director] fetchReportOptions:", getErrorMessage(e, "Не удалось получить опции отчётов"));
        }
        setRepOptObjects([]);
        setRepOptObjectIdByName({});
      } finally {
        clearDirectorReportsInFlight(inFlightOptionsRef.current, key, reqId);
        if (reqId === optionsReqSeqRef.current) setRepOptLoading(false);
      }
    })();
    inFlightOptionsRef.current.set(key, { reqId, promise: task });
    await task;
  }, [commitOptionsState, currentOptionsState, loadReportScope, optionsKey, repFrom, repObjectName, repTo, setRepOptLoading]);

  const applyReportPeriod = useCallback(async (nextFrom: string | null, nextTo: string | null) => {
    setReportPeriodState(nextFrom, nextTo);
    setRepObjectName(null);

    const from = nextFrom ? String(nextFrom).slice(0, 10) : "";
    const to = nextTo ? String(nextTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: null,
        includeDiscipline: repTab === "discipline",
        skipDisciplinePrices: repTab !== "discipline",
      });
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      commitLoadedScope(scopeLoad, { includeDiscipline: repTab === "discipline" });
      if (repTab === "discipline" && scopeLoad.discipline && !scopeLoad.disciplinePricesReady) {
        void fetchDiscipline(null, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      }
    } catch (e: unknown) {
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      const message = getErrorMessage(e, "Не удалось пересчитать отчёт");
      if (__DEV__) {
        console.warn("[director] applyReportPeriod:", message);
      }
      setRepData(null);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
      Alert.alert("Не удалось пересчитать отчёт", message);
    } finally {
      if (scopeReqId === scopeLoadSeqRef.current) {
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
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const currentObject = repObjectName ?? null;
    const scopeReqId = beginScopeRefresh();

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: currentObject,
        optionsState: currentOptionsState,
        includeDiscipline: repTab === "discipline",
        skipDisciplinePrices: repTab !== "discipline",
        bypassCache: true,
      });
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      commitLoadedScope(scopeLoad, { includeDiscipline: repTab === "discipline" });
      if (repTab === "discipline" && scopeLoad.discipline && !scopeLoad.disciplinePricesReady) {
        void fetchDiscipline(currentObject, {
          background: true,
          objectIdByNameOverride: scopeLoad.optionsState.objectIdByName,
        });
      }
    } catch (e: unknown) {
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      const message = getErrorMessage(e, "Не удалось обновить отчёт");
      if (__DEV__) {
        console.warn("[director] refreshReports:", message);
      }
      setRepData(null);
      Alert.alert("Не удалось обновить отчёт", message);
    } finally {
      if (scopeReqId === scopeLoadSeqRef.current) {
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
      const key = disciplineKey(from, to, repObjectName ?? null, repOptObjectIdByName);
      const hasReady = !!(repDiscipline || repData?.discipline);

      if (hasReady) {
        if (REPORTS_TIMING) console.info("[director_works] render_ready:from_cached_payload");
        if (lastDisciplineLoadKeyRef.current !== key) {
          void syncScopeBothModes(repObjectName ?? null, "discipline");
        }
      } else {
        void syncScopeBothModes(repObjectName ?? null, "discipline");
      }
      logTiming("tab_switch_to_works", switchStart);
      return;
    }
    void fetchReport(undefined, { background: true });
  }, [disciplineKey, fetchReport, logTiming, nowMs, repData, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepTabState, syncScopeBothModes]);

  const openReports = useCallback(() => {
    const startedAt = nowMs();
    if (REPORTS_TIMING) console.info("[director_works] click:open_reports");
    setRepTabState("materials");
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const currentObject = repObjectName ?? null;
    const scopeReqId = beginScopeRefresh();

    resetRepBranchMeta();
    setRepOptLoading(true);
    setRepLoading(true);
    void (async () => {
      try {
        const scopeLoad = await loadReportScope({
          from,
          to,
          objectName: currentObject,
          optionsState: currentOptionsState,
          includeDiscipline: false,
          skipDisciplinePrices: true,
        });
        if (scopeReqId !== scopeLoadSeqRef.current) return;
        commitLoadedScope(scopeLoad, { includeDiscipline: false });
      } catch (e: unknown) {
        if (scopeReqId !== scopeLoadSeqRef.current) return;
        const message = getErrorMessage(e, "Не удалось получить отчёт");
        if (__DEV__) {
          console.warn("[director] openReports:", message);
        }
        setRepData(null);
        Alert.alert("Не удалось получить отчёт", message);
      } finally {
        if (scopeReqId === scopeLoadSeqRef.current) {
          setRepOptLoading(false);
          setRepLoading(false);
        }
      }
    })();
    logTiming("open_reports_dispatch", startedAt);
  }, [beginScopeRefresh, commitLoadedScope, currentOptionsState, loadReportScope, logTiming, nowMs, repFrom, repObjectName, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading, setRepTabState]);

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
