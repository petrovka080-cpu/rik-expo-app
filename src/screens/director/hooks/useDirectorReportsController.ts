import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  fetchDirectorWarehouseReportDisciplineTracked,
  fetchDirectorWarehouseReportOptionsTracked,
  fetchDirectorWarehouseReportTracked,
  type DirectorReportFetchMeta,
} from "../../../lib/api/director_reports";
import { loadDirectorReportTransportScope } from "../../../lib/api/directorReportsTransport.service";
import type {
  RepDisciplineLevel,
  RepDisciplineMaterial,
  RepDisciplinePayload,
  RepDisciplineWork,
  RepPayload,
  RepTab,
} from "../director.types";
import {
  useDirectorReportsUiStore,
  type DirectorObservedBranchMeta,
  type DirectorReportsBranchStage,
} from "../directorReports.store";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

type CacheEntry<T> = {
  ts: number;
  value: T;
  meta: DirectorReportFetchMeta | null;
};

type ReportOptionsState = {
  objects: string[];
  objectIdByName: Record<string, string | null>;
};

const REPORTS_CACHE_TTL_MS = 5 * 60 * 1000;
const REPORTS_CACHE_MAX = 40;
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

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const textOrUndefined = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const getDisciplineFromPayload = (payload: RepPayload | null): RepDisciplinePayload | null =>
  payload?.discipline ?? null;

const normalizeRepDisciplineMaterial = (value: unknown): RepDisciplineMaterial => {
  const record = asRecord(value);
  return {
    material_name: String(record.material_name ?? record.rik_code ?? "").trim(),
    rik_code: String(record.rik_code ?? "").trim(),
    uom: String(record.uom ?? "").trim(),
    qty_sum: toFiniteNumber(record.qty_sum),
    docs_count: toFiniteNumber(record.docs_count),
    unit_price: toFiniteNumber(record.unit_price),
    amount_sum: toFiniteNumber(record.amount_sum),
  };
};

const normalizeRepDisciplineLevel = (value: unknown): RepDisciplineLevel => {
  const record = asRecord(value);
  const materialsRaw = Array.isArray(record.materials) ? record.materials : [];
  return {
    id: String(record.id ?? "").trim(),
    level_name: String(record.level_name ?? "").trim(),
    object_name: textOrUndefined(record.object_name),
    system_name: textOrUndefined(record.system_name) ?? null,
    zone_name: textOrUndefined(record.zone_name) ?? null,
    location_label: textOrUndefined(record.location_label),
    total_qty: toFiniteNumber(record.total_qty),
    total_docs: toFiniteNumber(record.total_docs),
    total_positions: toFiniteNumber(record.total_positions),
    share_in_work_pct: toFiniteNumber(record.share_in_work_pct),
    req_positions: toFiniteNumber(record.req_positions),
    free_positions: toFiniteNumber(record.free_positions),
    materials: materialsRaw.map(normalizeRepDisciplineMaterial),
  };
};

const normalizeRepDisciplineWork = (value: unknown): RepDisciplineWork => {
  const record = asRecord(value);
  const levelsRaw = Array.isArray(record.levels) ? record.levels : [];
  const locationCount =
    record.location_count == null ? undefined : Math.max(toFiniteNumber(record.location_count), levelsRaw.length);
  return {
    id: String(record.id ?? record.work_type_name ?? "").trim(),
    work_type_name: String(record.work_type_name ?? record.id ?? "").trim(),
    total_qty: toFiniteNumber(record.total_qty),
    total_docs: toFiniteNumber(record.total_docs),
    total_positions: toFiniteNumber(record.total_positions),
    share_total_pct: toFiniteNumber(record.share_total_pct),
    req_positions: toFiniteNumber(record.req_positions),
    free_positions: toFiniteNumber(record.free_positions),
    location_count: locationCount,
    levels: levelsRaw.map(normalizeRepDisciplineLevel),
  };
};

const normalizeRepPayload = (payload: unknown): RepPayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Partial<RepPayload> & { discipline?: unknown };
  const discipline = normalizeRepDisciplinePayload(record.discipline);
  return {
    meta: record.meta,
    kpi: record.kpi,
    rows: Array.isArray(record.rows) ? record.rows : undefined,
    discipline: discipline ?? undefined,
  };
};

const normalizeRepDisciplinePayload = (payload: unknown): RepDisciplinePayload | null => {
  if (!payload || typeof payload !== "object") return null;
  const record = asRecord(payload);
  const summary = asRecord(record.summary);
  const worksRaw = Array.isArray(record.works) ? record.works : [];
  return {
    summary: {
      total_qty: toFiniteNumber(summary.total_qty),
      total_docs: toFiniteNumber(summary.total_docs),
      total_positions: toFiniteNumber(summary.total_positions),
      pct_without_work: toFiniteNumber(summary.pct_without_work),
      pct_without_level: toFiniteNumber(summary.pct_without_level),
      pct_without_request: toFiniteNumber(summary.pct_without_request),
      issue_cost_total: toFiniteNumber(summary.issue_cost_total),
      purchase_cost_total: toFiniteNumber(summary.purchase_cost_total),
      issue_to_purchase_pct: toFiniteNumber(summary.issue_to_purchase_pct),
      unpriced_issue_pct: toFiniteNumber(summary.unpriced_issue_pct),
    },
    works: worksRaw.map(normalizeRepDisciplineWork),
  };
};

const normalizeReportOptionsState = (value: unknown): ReportOptionsState => {
  const record = asRecord(value);
  const objectIdByNameRaw = asRecord(record.objectIdByName);
  return {
    objects: Array.isArray(record.objects) ? record.objects.map((item) => String(item ?? "")) : [],
    objectIdByName: Object.fromEntries(
      Object.entries(objectIdByNameRaw).map(([key, item]) => [key, item == null ? null : String(item)]),
    ),
  };
};

const summarizeRepDiscipline = (payload: RepDisciplinePayload | null) => {
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
  const inFlightReportRef = useRef<Map<string, Promise<void>>>(new Map());
  const inFlightDisciplineRef = useRef<Map<string, Promise<void>>>(new Map());
  const inFlightOptionsRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportCacheRef = useRef<Map<string, CacheEntry<RepPayload | null>>>(new Map());
  const disciplineCacheRef = useRef<Map<string, CacheEntry<RepDisciplinePayload | null>>>(new Map());
  const optionsCacheRef = useRef<Map<string, CacheEntry<ReportOptionsState>>>(new Map());
  const lastDisciplineLoadKeyRef = useRef<string>("");
  const disciplinePricesReadyRef = useRef<Set<string>>(new Set());

  const nowMs = useCallback(() => {
    try {
      const perf = getPerformance();
      return typeof perf?.now === "function" ? perf.now() : Date.now();
    } catch {
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
      const cacheNote = observed.fromCache ? "controller_cache" : observed.cacheLayer;
      const pricedNote = observed.pricedStage ? ` priced_stage=${observed.pricedStage}` : "";
      const rowsSourceNote = observed.rowsSource ? ` rows_source=${observed.rowsSource}` : "";
      console.info(
        `[director_reports] ${stage}.branch: branch=${observed.branch} chain=${chain || "none"} cache=${cacheNote}${pricedNote}${rowsSourceNote}`,
      );
    }
  }, [setRepBranchStage]);

  const getCached = useCallback(<T,>(cache: Map<string, CacheEntry<T>>, key: string): CacheEntry<T> | null => {
    const hit = cache.get(key);
    if (!hit) return null;

    const expired = Date.now() - hit.ts > REPORTS_CACHE_TTL_MS;
    if (expired) {
      cache.delete(key);
      return null;
    }

    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }, []);

  const setCached = useCallback(<T,>(
    cache: Map<string, CacheEntry<T>>,
    key: string,
    value: T,
    meta: DirectorReportFetchMeta | null,
  ) => {
    const entry: CacheEntry<T> = { ts: Date.now(), value, meta };
    if (cache.has(key)) cache.delete(key);
    cache.set(key, entry);

    while (cache.size > REPORTS_CACHE_MAX) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }, []);

  const commitOptionsState = useCallback((
    key: string,
    value: ReportOptionsState,
    meta: DirectorReportFetchMeta | null,
    opts?: { cache?: boolean; fromCache?: boolean },
  ) => {
    if (opts?.cache !== false) {
      setCached(optionsCacheRef.current, key, value, meta);
    }
    setRepOptObjects(value.objects);
    setRepOptObjectIdByName(value.objectIdByName);
    observeBranch("options", key, meta, { fromCache: opts?.fromCache });
  }, [observeBranch, setCached]);

  const applyCachedDisciplineState = useCallback((key: string) => {
    const cached = getCached(disciplineCacheRef.current, key);
    if (cached === null) return false;
    setRepDiscipline(cached.value ?? null);
    lastDisciplineLoadKeyRef.current = key;
    setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
    observeBranch("discipline", key, cached.meta, { fromCache: true });
    return true;
  }, [getCached, observeBranch, setRepDisciplinePriceLoading]);

  const commitDisciplineState = useCallback((
    key: string,
    payload: RepDisciplinePayload,
    meta: DirectorReportFetchMeta | null,
    opts?: { cache?: boolean; pricesReady?: boolean; fromCache?: boolean },
  ) => {
    if (opts?.cache !== false) {
      setCached(disciplineCacheRef.current, key, payload, meta);
    }
    if (opts?.pricesReady === true) {
      disciplinePricesReadyRef.current.add(key);
    } else if (opts?.pricesReady === false) {
      disciplinePricesReadyRef.current.delete(key);
    }
    setRepDiscipline(payload);
    lastDisciplineLoadKeyRef.current = key;
    setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
    observeBranch("discipline", key, meta, { fromCache: opts?.fromCache });
  }, [observeBranch, setCached, setRepDisciplinePriceLoading]);

  const commitReportState = useCallback((
    key: string,
    payload: RepPayload | null,
    meta: DirectorReportFetchMeta | null,
    opts?: { cache?: boolean; syncDiscipline?: boolean; fromCache?: boolean },
  ) => {
    if (opts?.cache !== false) {
      setCached(reportCacheRef.current, key, payload, meta);
    }
    setRepData(payload);
    observeBranch("report", key, meta, { fromCache: opts?.fromCache });
    if (opts?.syncDiscipline === false) return;

    const disciplinePayload = getDisciplineFromPayload(payload);
    if (disciplinePayload) {
      const disciplineMeta = deriveDisciplineMeta(meta);
      setCached(disciplineCacheRef.current, key, disciplinePayload, disciplineMeta);
      setRepDiscipline(disciplinePayload);
      lastDisciplineLoadKeyRef.current = key;
      setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
      observeBranch("discipline", key, disciplineMeta, { fromCache: opts?.fromCache });
      return;
    }

    if (applyCachedDisciplineState(key)) return;
    if (lastDisciplineLoadKeyRef.current !== key) {
      setRepDiscipline(null);
      setRepDisciplinePriceLoading(false);
    }
  }, [applyCachedDisciplineState, observeBranch, setCached, setRepDisciplinePriceLoading]);

  const optionsKey = useCallback((from: string, to: string) => `${from}|${to}`, []);
  const reportKey = useCallback(
    (from: string, to: string, objectName: string | null, objectMap: Record<string, string | null>) =>
      `${from}|${to}|${String(objectName ?? "")}|${String(objectName == null ? "" : (objectMap?.[objectName] ?? ""))}`,
    [],
  );
  const disciplineKey = reportKey;

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
  }) => {
    const resolvedOptionsState =
      args.optionsState ??
      getCached(optionsCacheRef.current, optionsKey(args.from, args.to))?.value ??
      null;
    const optionsCacheEntry =
      resolvedOptionsState == null ? null : getCached(optionsCacheRef.current, optionsKey(args.from, args.to));
    const precomputedKey =
      resolvedOptionsState == null
        ? null
        : reportKey(args.from, args.to, args.objectName, resolvedOptionsState.objectIdByName);
    const cachedReport =
      precomputedKey == null ? null : getCached(reportCacheRef.current, precomputedKey);
    const cachedDiscipline =
      precomputedKey == null || args.includeDiscipline !== true
        ? null
        : getCached(disciplineCacheRef.current, precomputedKey);
    const disciplinePricesReady =
      precomputedKey == null ? false : disciplinePricesReadyRef.current.has(precomputedKey);
    const useCachedDiscipline =
      args.includeDiscipline === true &&
      cachedDiscipline !== null &&
      (args.skipDisciplinePrices || disciplinePricesReady);

    if (resolvedOptionsState && cachedReport !== null && (!args.includeDiscipline || useCachedDiscipline)) {
      return {
        optionsKey: optionsKey(args.from, args.to),
        optionsState: resolvedOptionsState,
        optionsMeta: optionsCacheEntry?.meta ?? null,
        optionsFromCache: true,
        key: precomputedKey ?? reportKey(args.from, args.to, args.objectName, resolvedOptionsState.objectIdByName),
        objectName: args.objectName,
        report: cachedReport.value,
        reportMeta: cachedReport.meta,
        discipline: args.includeDiscipline ? (cachedDiscipline?.value ?? null) : null,
        disciplineMeta: args.includeDiscipline ? (cachedDiscipline?.meta ?? null) : null,
        reportFromCache: true,
        disciplineFromCache: args.includeDiscipline ? cachedDiscipline !== null : false,
        disciplinePricesReady: args.includeDiscipline ? disciplinePricesReady : false,
      };
    }

    const transportResult = await loadDirectorReportTransportScope({
      from: args.from,
      to: args.to,
      objectName: args.objectName,
      includeDiscipline: !!args.includeDiscipline,
      skipDisciplinePrices: args.skipDisciplinePrices,
      legacyObjectIdByName: resolvedOptionsState?.objectIdByName,
    });
    const nextOptionsState = normalizeReportOptionsState(transportResult.options);
    const key = reportKey(args.from, args.to, args.objectName, nextOptionsState.objectIdByName);

    return {
      optionsKey: optionsKey(args.from, args.to),
      optionsState: nextOptionsState,
      optionsMeta: transportResult.optionsMeta,
      optionsFromCache: false,
      key,
      objectName: args.objectName,
      report: normalizeRepPayload(transportResult.report),
      reportMeta: transportResult.reportMeta,
      discipline: normalizeRepDisciplinePayload(transportResult.discipline),
      disciplineMeta: transportResult.disciplineMeta,
      reportFromCache: false,
      disciplineFromCache: false,
      disciplinePricesReady:
        args.includeDiscipline === true
          ? transportResult.disciplineMeta?.pricedStage !== "base"
          : false,
    };
  }, [getCached, optionsKey, reportKey]);

  const commitLoadedScope = useCallback((scopeLoad: {
    optionsKey: string;
    optionsState: ReportOptionsState;
    optionsMeta: DirectorReportFetchMeta | null;
    optionsFromCache: boolean;
    key: string;
    report: RepPayload | null;
    reportMeta: DirectorReportFetchMeta | null;
    discipline: RepDisciplinePayload | null;
    disciplineMeta: DirectorReportFetchMeta | null;
    reportFromCache: boolean;
    disciplineFromCache: boolean;
    disciplinePricesReady: boolean;
  }, opts?: { includeDiscipline: boolean }) => {
    commitOptionsState(scopeLoad.optionsKey, scopeLoad.optionsState, scopeLoad.optionsMeta, {
      cache: !scopeLoad.optionsFromCache,
      fromCache: scopeLoad.optionsFromCache,
    });
    commitReportState(scopeLoad.key, scopeLoad.report, scopeLoad.reportMeta, {
      cache: !scopeLoad.reportFromCache,
      syncDiscipline: false,
      fromCache: scopeLoad.reportFromCache,
    });
    if (scopeLoad.discipline) {
      commitDisciplineState(scopeLoad.key, scopeLoad.discipline, scopeLoad.disciplineMeta, {
        cache: !scopeLoad.disciplineFromCache,
        pricesReady: scopeLoad.disciplinePricesReady,
        fromCache: scopeLoad.disciplineFromCache,
      });
    } else if (!opts?.includeDiscipline) {
      if (!applyCachedDisciplineState(scopeLoad.key)) {
        setRepDiscipline(null);
        setRepDisciplinePriceLoading(false);
      }
    } else {
      setRepDiscipline(null);
      lastDisciplineLoadKeyRef.current = scopeLoad.key;
      setRepDisciplinePriceLoading(false);
    }
  }, [applyCachedDisciplineState, commitDisciplineState, commitOptionsState, commitReportState, setRepDisciplinePriceLoading]);

  const fetchReport = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = reportKey(from, to, objectName ?? null, repOptObjectIdByName);
    const cached = getCached(reportCacheRef.current, key);
    if (cached !== null) {
      commitReportState(key, cached.value ?? null, cached.meta, { cache: false, fromCache: true });
      return;
    }
    const inFlight = inFlightReportRef.current.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const reqId = ++reportReqSeqRef.current;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      try {
        const result = await fetchDirectorWarehouseReportTracked({
          from,
          to,
          objectName: objectName ?? null,
          objectIdByName: repOptObjectIdByName,
        });
        if (reqId !== reportReqSeqRef.current) return;
        const normalized = normalizeRepPayload(result.payload);
        commitReportState(key, normalized, result.meta);
      } catch (e: unknown) {
        if (reqId !== reportReqSeqRef.current) return;
        const message = getErrorMessage(e, "Не удалось получить отчет");
        if (__DEV__) {
          console.warn("[director] fetchReport:", message);
        }
        if (!opts?.background) {
          setRepData(null);
          Alert.alert("Не удалось получить отчет", message);
        }
      } finally {
        inFlightReportRef.current.delete(key);
        if (!opts?.background && reqId === reportReqSeqRef.current) setRepLoading(false);
      }
    })();
    inFlightReportRef.current.set(key, task);
    await task;
  }, [commitReportState, getCached, repFrom, repObjectName, repOptObjectIdByName, repTo, reportKey, setRepLoading]);

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
    const cached = getCached(disciplineCacheRef.current, key);
    if (cached !== null) {
      applyCachedDisciplineState(key);
      const pricesReady = disciplinePricesReadyRef.current.has(key);
      if (!pricesReady) {
        const activeReqId = disciplineReqSeqRef.current;
        void (async () => {
          try {
            const result = await fetchDirectorWarehouseReportDisciplineTracked({
              from,
              to,
              objectName: objectName ?? null,
              objectIdByName,
            });
            if (activeReqId !== disciplineReqSeqRef.current) return;
            const full = normalizeRepDisciplinePayload(result.payload);
            if (full) commitDisciplineState(key, full, result.meta, { pricesReady: true });
          } catch {
            // keep base payload rendered
          } finally {
            if (activeReqId === disciplineReqSeqRef.current) setRepDisciplinePriceLoading(false);
          }
        })();
      }
      logTiming("api:discipline:cache_hit", totalStart);
      return;
    }
    const inFlight = inFlightDisciplineRef.current.get(key);
    if (inFlight) {
      await inFlight;
      logTiming("api:discipline:join_inflight", totalStart);
      return;
    }

    const reqId = ++disciplineReqSeqRef.current;
    const task = (async () => {
      if (!opts?.background) setRepLoading(true);
      setRepDisciplinePriceLoading(true);
      try {
        const apiStart = nowMs();
        const baseResult = await fetchDirectorWarehouseReportDisciplineTracked({
          from,
          to,
          objectName: objectName ?? null,
          objectIdByName,
        }, { skipPrices: true });
        logTiming("api:discipline:network_done", apiStart);
        if (reqId !== disciplineReqSeqRef.current) return;
        const normalizedBase = normalizeRepDisciplinePayload(baseResult.payload);
        if (normalizedBase) {
          commitDisciplineState(key, normalizedBase, baseResult.meta, { pricesReady: false });
          if (REPORTS_TIMING) {
            const summary = summarizeRepDiscipline(normalizedBase);
            console.info(
              `[director_works] api:discipline:base_ready works=${summary.works} levels=${summary.levels} materials=${summary.materials}`,
            );
          }
        }
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);

        void (async () => {
          try {
            const fullResult = await fetchDirectorWarehouseReportDisciplineTracked({
              from,
              to,
              objectName: objectName ?? null,
              objectIdByName,
            });
            if (reqId !== disciplineReqSeqRef.current) return;
            const normalizedFull = normalizeRepDisciplinePayload(fullResult.payload);
            if (normalizedFull) {
              commitDisciplineState(key, normalizedFull, fullResult.meta, { pricesReady: true });
              if (REPORTS_TIMING) {
                const summary = summarizeRepDiscipline(normalizedFull);
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
        inFlightDisciplineRef.current.delete(key);
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);
        logTiming("api:discipline:total", totalStart);
      }
    })();
    inFlightDisciplineRef.current.set(key, task);
    await task;
  }, [applyCachedDisciplineState, commitDisciplineState, disciplineKey, getCached, logTiming, nowMs, repFrom, repObjectName, repOptObjectIdByName, repTo, setRepDisciplinePriceLoading, setRepLoading]);

  const syncScopeBothModes = useCallback(async (objectName: string | null, modeOverride?: RepTab) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();
    const activeTab = modeOverride ?? repTab;
    const includeDiscipline = activeTab === "discipline";
    const currentOptionsState: ReportOptionsState | null =
      repOptObjects.length || Object.keys(repOptObjectIdByName).length
        ? { objects: repOptObjects, objectIdByName: repOptObjectIdByName }
        : null;

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
      const message = getErrorMessage(e, "РќРµ СѓРґР°Р»РѕСЃСЊ РїРµСЂРµСЃС‡РёС‚Р°С‚СЊ РѕС‚С‡РµС‚");
      if (__DEV__) {
        console.warn("[director] syncScopeBothModes:", message);
      }
      setRepData(null);
      Alert.alert("РќРµ СѓРґР°Р»РѕСЃСЊ РїРµСЂРµСЃС‡РёС‚Р°С‚СЊ РѕС‚С‡РµС‚", message);
    } finally {
      if (scopeReqId === scopeLoadSeqRef.current) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, fetchDiscipline, loadReportScope, repFrom, repOptObjectIdByName, repOptObjects, repTab, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    setRepObjectName(obj);
    await syncScopeBothModes(obj);
  }, [setRepObjectName, syncScopeBothModes]);

  const fetchReportOptions = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const key = optionsKey(from, to);
    const cached = getCached(optionsCacheRef.current, key);
    if (cached) {
      commitOptionsState(key, cached.value, cached.meta, { cache: false, fromCache: true });
      return;
    }
    const inFlight = inFlightOptionsRef.current.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const reqId = ++optionsReqSeqRef.current;
    const task = (async () => {
      setRepOptLoading(true);
      try {
        const result = await fetchDirectorWarehouseReportOptionsTracked({ from, to });
        if (reqId !== optionsReqSeqRef.current) return;
        const normalized = normalizeReportOptionsState(result.payload);
        commitOptionsState(key, normalized, result.meta);
      } catch (e: unknown) {
        if (reqId !== optionsReqSeqRef.current) return;
        if (__DEV__) {
          console.warn("[director] fetchReportOptions:", getErrorMessage(e, "Не удалось получить опции отчетов"));
        }
        setRepOptObjects([]);
        setRepOptObjectIdByName({});
      } finally {
        inFlightOptionsRef.current.delete(key);
        if (reqId === optionsReqSeqRef.current) setRepOptLoading(false);
      }
    })();
    inFlightOptionsRef.current.set(key, task);
    await task;
  }, [commitOptionsState, getCached, optionsKey, repFrom, repTo, setRepOptLoading]);

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
      const message = getErrorMessage(e, "Не удалось пересчитать отчет");
      if (__DEV__) {
        console.warn("[director] applyReportPeriod:", message);
      }
      setRepData(null);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
      Alert.alert("Не удалось пересчитать отчет", message);
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
        optionsState:
          repOptObjects.length || Object.keys(repOptObjectIdByName).length
            ? { objects: repOptObjects, objectIdByName: repOptObjectIdByName }
            : null,
        includeDiscipline: repTab === "discipline",
        skipDisciplinePrices: repTab !== "discipline",
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
      const message = getErrorMessage(e, "Не удалось обновить отчет");
      if (__DEV__) {
        console.warn("[director] refreshReports:", message);
      }
      setRepData(null);
      Alert.alert("Не удалось обновить отчет", message);
    } finally {
      if (scopeReqId === scopeLoadSeqRef.current) {
        setRepOptLoading(false);
        setRepLoading(false);
      }
    }
  }, [beginScopeRefresh, commitLoadedScope, fetchDiscipline, loadReportScope, repFrom, repObjectName, repOptObjectIdByName, repOptObjects, repTab, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading]);

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
    const currentOptionsState: ReportOptionsState | null =
      repOptObjects.length || Object.keys(repOptObjectIdByName).length
        ? { objects: repOptObjects, objectIdByName: repOptObjectIdByName }
        : null;

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
        const message = getErrorMessage(e, "РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РѕС‚С‡РµС‚");
        if (__DEV__) {
          console.warn("[director] openReports:", message);
        }
        setRepData(null);
        Alert.alert("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕР»СѓС‡РёС‚СЊ РѕС‚С‡РµС‚", message);
      } finally {
        if (scopeReqId === scopeLoadSeqRef.current) {
          setRepOptLoading(false);
          setRepLoading(false);
        }
      }
    })();
    logTiming("open_reports_dispatch", startedAt);
  }, [beginScopeRefresh, commitLoadedScope, loadReportScope, logTiming, nowMs, repFrom, repObjectName, repOptObjectIdByName, repOptObjects, repTo, resetRepBranchMeta, setRepLoading, setRepOptLoading, setRepTabState]);

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
