import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  fetchDirectorWarehouseReport,
  fetchDirectorWarehouseReportDiscipline,
  fetchDirectorWarehouseReportOptions,
} from "../../lib/api/director_reports";
import type {
  RepDisciplineLevel,
  RepDisciplineMaterial,
  RepDisciplinePayload,
  RepDisciplineWork,
  RepPayload,
  RepTab,
} from "./director.types";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

type CacheEntry<T> = { ts: number; value: T };
type ReportOptionsState = { objects: string[]; objectIdByName: Record<string, string | null> };

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

export function useDirectorReports({ fmtDateOnly }: Deps) {
  const [repOpen, setRepOpen] = useState(false);
  const [repTab, setRepTab] = useState<RepTab>("materials");
  const [repPeriodOpen, setRepPeriodOpen] = useState(false);
  const [repObjOpen, setRepObjOpen] = useState(false);
  const [repFrom, setRepFrom] = useState<string | null>(null);
  const [repTo, setRepTo] = useState<string | null>(null);
  const [repObjectName, setRepObjectName] = useState<string | null>(null);
  const [repLoading, setRepLoading] = useState(false);
  const [repDisciplinePriceLoading, setRepDisciplinePriceLoading] = useState(false);
  const [repData, setRepData] = useState<RepPayload | null>(null);
  const [repDiscipline, setRepDiscipline] = useState<RepDisciplinePayload | null>(null);
  const [repOptLoading, setRepOptLoading] = useState(false);
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
  const optionsCacheRef = useRef<Map<string, CacheEntry<{ objects: string[]; objectIdByName: Record<string, string | null> }>>>(new Map());
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

  const getCached = useCallback(<T,>(cache: Map<string, CacheEntry<T>>, key: string): T | null => {
    const hit = cache.get(key);
    if (!hit) return null;

    const expired = Date.now() - hit.ts > REPORTS_CACHE_TTL_MS;
    if (expired) {
      cache.delete(key);
      return null;
    }

    cache.delete(key);
    cache.set(key, hit);
    return hit.value;
  }, []);

  const setCached = useCallback(<T,>(cache: Map<string, CacheEntry<T>>, key: string, value: T) => {
    const entry: CacheEntry<T> = { ts: Date.now(), value };
    if (cache.has(key)) cache.delete(key);
    cache.set(key, entry);

    while (cache.size > REPORTS_CACHE_MAX) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      cache.delete(oldestKey);
    }
  }, []);

  const commitOptionsState = useCallback((key: string, value: ReportOptionsState, opts?: { cache?: boolean }) => {
    if (opts?.cache !== false) {
      setCached(optionsCacheRef.current, key, value);
    }
    setRepOptObjects(value.objects);
    setRepOptObjectIdByName(value.objectIdByName);
  }, [setCached]);

  const applyCachedDisciplineState = useCallback((key: string) => {
    const cached = getCached(disciplineCacheRef.current, key);
    if (cached === null) return false;
    setRepDiscipline(cached ?? null);
    lastDisciplineLoadKeyRef.current = key;
    setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
    return true;
  }, [getCached]);

  const commitReportState = useCallback((
    key: string,
    payload: RepPayload | null,
    opts?: { cache?: boolean; syncDiscipline?: boolean },
  ) => {
    if (opts?.cache !== false) {
      setCached(reportCacheRef.current, key, payload);
    }
    setRepData(payload);
    if (opts?.syncDiscipline === false) return;

    const disciplinePayload = getDisciplineFromPayload(payload);
    if (disciplinePayload) {
      setCached(disciplineCacheRef.current, key, disciplinePayload);
      setRepDiscipline(disciplinePayload);
      lastDisciplineLoadKeyRef.current = key;
      setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
      return;
    }

    if (applyCachedDisciplineState(key)) return;
    if (lastDisciplineLoadKeyRef.current !== key) {
      setRepDiscipline(null);
      setRepDisciplinePriceLoading(false);
    }
  }, [applyCachedDisciplineState, setCached]);

  const commitDisciplineState = useCallback((
    key: string,
    payload: RepDisciplinePayload,
    opts?: { cache?: boolean; pricesReady?: boolean },
  ) => {
    if (opts?.cache !== false) {
      setCached(disciplineCacheRef.current, key, payload);
    }
    if (opts?.pricesReady === true) {
      disciplinePricesReadyRef.current.add(key);
    } else if (opts?.pricesReady === false) {
      disciplinePricesReadyRef.current.delete(key);
    }
    setRepDiscipline(payload);
    lastDisciplineLoadKeyRef.current = key;
    setRepDisciplinePriceLoading(!disciplinePricesReadyRef.current.has(key));
  }, [setCached]);

  const optionsKey = useCallback((from: string, to: string) => `${from}|${to}`, []);
  const reportKey = useCallback(
    (from: string, to: string, objectName: string | null, objectMap: Record<string, string | null>) =>
      `${from}|${to}|${String(objectName ?? "")}|${String(
        objectName == null ? "" : (objectMap?.[objectName] ?? ""),
      )}`,
    [],
  );
  const disciplineKey = reportKey;

  const repPeriodShort = useMemo(() => {
    return repFrom || repTo
      ? `${repFrom ? fmtDateOnly(repFrom) : "—"} -> ${repTo ? fmtDateOnly(repTo) : "—"}`
      : "Весь период";
  }, [repFrom, repTo, fmtDateOnly]);

  const beginScopeRefresh = useCallback(() => {
    optionsReqSeqRef.current += 1;
    reportReqSeqRef.current += 1;
    disciplineReqSeqRef.current += 1;
    return ++scopeLoadSeqRef.current;
  }, []);

  const loadOptionsForScope = useCallback(async (from: string, to: string) => {
    const key = optionsKey(from, to);
    const cached = getCached(optionsCacheRef.current, key);
    if (cached) {
      return {
        key,
        value: cached,
        fromCache: true,
      };
    }

    const value = normalizeReportOptionsState(await fetchDirectorWarehouseReportOptions({ from, to }));
    return {
      key,
      value,
      fromCache: false,
    };
  }, [getCached, optionsKey]);

  const loadReportScope = useCallback(async (args: {
    from: string;
    to: string;
    objectName: string | null;
    optionsState: ReportOptionsState;
    skipDisciplinePrices: boolean;
  }) => {
    const key = reportKey(args.from, args.to, args.objectName, args.optionsState.objectIdByName);
    const cachedReport = getCached(reportCacheRef.current, key);
    const cachedDiscipline = getCached(disciplineCacheRef.current, key);
    const disciplinePricesReady = disciplinePricesReadyRef.current.has(key);
    const useCachedDiscipline = cachedDiscipline !== null && (args.skipDisciplinePrices || disciplinePricesReady);
    const [reportPayloadRaw, disciplinePayloadRaw] = await Promise.all([
      cachedReport !== null
        ? Promise.resolve(cachedReport)
        : fetchDirectorWarehouseReport({
            from: args.from,
            to: args.to,
            objectName: args.objectName,
            objectIdByName: args.optionsState.objectIdByName,
          }).then(normalizeRepPayload),
      useCachedDiscipline
        ? Promise.resolve(cachedDiscipline)
        : fetchDirectorWarehouseReportDiscipline({
            from: args.from,
            to: args.to,
            objectName: args.objectName,
            objectIdByName: args.optionsState.objectIdByName,
          }, { skipPrices: args.skipDisciplinePrices }).then(normalizeRepDisciplinePayload),
    ]);

    return {
      key,
      report: reportPayloadRaw,
      discipline: disciplinePayloadRaw,
      reportFromCache: cachedReport !== null,
      disciplineFromCache: useCachedDiscipline,
      disciplinePricesReady: useCachedDiscipline ? disciplinePricesReady : !args.skipDisciplinePrices,
    };
  }, [getCached, reportKey]);

  const queueScopeDisciplineUpgrade = useCallback((args: {
    scopeReqId: number;
    scopeKey: string;
    from: string;
    to: string;
    objectName: string | null;
    objectIdByName: Record<string, string | null>;
  }) => {
    const reqId = ++disciplineReqSeqRef.current;
    setRepDisciplinePriceLoading(true);

    void (async () => {
      try {
        const payload = await fetchDirectorWarehouseReportDiscipline({
          from: args.from,
          to: args.to,
          objectName: args.objectName,
          objectIdByName: args.objectIdByName,
        });
        if (args.scopeReqId !== scopeLoadSeqRef.current) return;
        if (reqId !== disciplineReqSeqRef.current) return;
        const normalized = normalizeRepDisciplinePayload(payload);
        if (normalized) {
          commitDisciplineState(args.scopeKey, normalized, {
            pricesReady: true,
          });
        }
      } catch (e: unknown) {
        if (REPORTS_TIMING) {
          console.warn("[director_works] scope_prices_stage_failed:", getErrorMessage(e, "prices stage failed"));
        }
      } finally {
        if (args.scopeReqId === scopeLoadSeqRef.current && reqId === disciplineReqSeqRef.current) {
          setRepDisciplinePriceLoading(false);
        }
      }
    })();
  }, [commitDisciplineState]);

  const fetchReport = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = reportKey(from, to, objectName ?? null, repOptObjectIdByName);
    const cached = getCached(reportCacheRef.current, key);
    if (cached !== null) {
      commitReportState(key, cached ?? null, { cache: false });
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
        const payload = await fetchDirectorWarehouseReport({
          from,
          to,
          objectName: objectName ?? null,
          objectIdByName: repOptObjectIdByName,
        });
        if (reqId !== reportReqSeqRef.current) return;
        const normalized = normalizeRepPayload(payload);
        commitReportState(key, normalized);
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
  }, [repFrom, repTo, repObjectName, repOptObjectIdByName, reportKey, getCached, commitReportState]);

  const fetchDiscipline = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const totalStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = disciplineKey(from, to, objectName ?? null, repOptObjectIdByName);
    if (REPORTS_TIMING) console.info(`[director_works] api:discipline:start key=${key}`);
    const cached = getCached(disciplineCacheRef.current, key);
    if (cached !== null) {
      applyCachedDisciplineState(key);
      const pricesReady = disciplinePricesReadyRef.current.has(key);
      if (!pricesReady) {
        const activeReqId = disciplineReqSeqRef.current;
        void (async () => {
          try {
            const payload = await fetchDirectorWarehouseReportDiscipline({
              from,
              to,
              objectName: objectName ?? null,
              objectIdByName: repOptObjectIdByName,
            });
            if (activeReqId !== disciplineReqSeqRef.current) return;
            const full = normalizeRepDisciplinePayload(payload);
            if (full) commitDisciplineState(key, full, { pricesReady: true });
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
        const basePayload = await fetchDirectorWarehouseReportDiscipline({
          from,
          to,
          objectName: objectName ?? null,
          objectIdByName: repOptObjectIdByName,
        }, { skipPrices: true });
        logTiming("api:discipline:network_done", apiStart);
        if (reqId !== disciplineReqSeqRef.current) return;
        const normalizedBase = normalizeRepDisciplinePayload(basePayload);
        if (normalizedBase) commitDisciplineState(key, normalizedBase, { pricesReady: false });
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);

        void (async () => {
          try {
            const fullPayload = await fetchDirectorWarehouseReportDiscipline({
              from,
              to,
              objectName: objectName ?? null,
              objectIdByName: repOptObjectIdByName,
            });
            if (reqId !== disciplineReqSeqRef.current) return;
            const normalizedFull = normalizeRepDisciplinePayload(fullPayload);
            if (normalizedFull) commitDisciplineState(key, normalizedFull, { pricesReady: true });
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
  }, [repFrom, repTo, repObjectName, repOptObjectIdByName, disciplineKey, getCached, applyCachedDisciplineState, commitDisciplineState, logTiming, nowMs]);

  const syncScopeBothModes = useCallback(async (objectName: string | null) => {
    if (repTab === "discipline") {
      await fetchDiscipline(objectName);
      void fetchReport(objectName, { background: true });
      return;
    }
    await fetchReport(objectName);
    void fetchDiscipline(objectName, { background: true });
  }, [fetchDiscipline, fetchReport, repTab]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    setRepObjectName(obj);
    await syncScopeBothModes(obj);
  }, [syncScopeBothModes]);

  const fetchReportOptions = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const key = optionsKey(from, to);
    const cached = getCached(optionsCacheRef.current, key);
    if (cached) {
      commitOptionsState(key, cached, { cache: false });
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
        const opt = await fetchDirectorWarehouseReportOptions({ from, to });
        if (reqId !== optionsReqSeqRef.current) return;
        const normalized = normalizeReportOptionsState(opt);
        commitOptionsState(key, normalized);
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
  }, [repFrom, repTo, optionsKey, getCached, commitOptionsState]);

  const applyReportPeriod = useCallback(async (nextFrom: string | null, nextTo: string | null) => {
    setRepFrom(nextFrom);
    setRepTo(nextTo);
    setRepObjectName(null);
    setRepPeriodOpen(false);

    const from = nextFrom ? String(nextFrom).slice(0, 10) : "";
    const to = nextTo ? String(nextTo).slice(0, 10) : "";
    const scopeReqId = beginScopeRefresh();

    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const optionsLoad = await loadOptionsForScope(from, to);
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      commitOptionsState(optionsLoad.key, optionsLoad.value, { cache: !optionsLoad.fromCache });

      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: null,
        optionsState: optionsLoad.value,
        skipDisciplinePrices: repTab !== "discipline",
      });
      if (scopeReqId !== scopeLoadSeqRef.current) return;

      commitReportState(scopeLoad.key, scopeLoad.report, {
        cache: !scopeLoad.reportFromCache,
        syncDiscipline: false,
      });
      if (scopeLoad.discipline) {
        commitDisciplineState(scopeLoad.key, scopeLoad.discipline, {
          cache: !scopeLoad.disciplineFromCache,
          pricesReady: scopeLoad.disciplinePricesReady,
        });
      } else {
        setRepDiscipline(null);
        lastDisciplineLoadKeyRef.current = scopeLoad.key;
        setRepDisciplinePriceLoading(false);
      }
      if (repTab !== "discipline" && !scopeLoad.disciplinePricesReady) {
        queueScopeDisciplineUpgrade({
          scopeReqId,
          scopeKey: scopeLoad.key,
          from,
          to,
          objectName: null,
          objectIdByName: optionsLoad.value.objectIdByName,
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
  }, [beginScopeRefresh, loadOptionsForScope, commitOptionsState, loadReportScope, repTab, commitReportState, commitDisciplineState, queueScopeDisciplineUpgrade]);

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

    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const optionsLoad = await loadOptionsForScope(from, to);
      if (scopeReqId !== scopeLoadSeqRef.current) return;
      commitOptionsState(optionsLoad.key, optionsLoad.value, { cache: !optionsLoad.fromCache });

      const scopeLoad = await loadReportScope({
        from,
        to,
        objectName: currentObject,
        optionsState: optionsLoad.value,
        skipDisciplinePrices: repTab !== "discipline",
      });
      if (scopeReqId !== scopeLoadSeqRef.current) return;

      commitReportState(scopeLoad.key, scopeLoad.report, {
        cache: !scopeLoad.reportFromCache,
        syncDiscipline: false,
      });
      if (scopeLoad.discipline) {
        commitDisciplineState(scopeLoad.key, scopeLoad.discipline, {
          cache: !scopeLoad.disciplineFromCache,
          pricesReady: scopeLoad.disciplinePricesReady,
        });
      } else {
        setRepDiscipline(null);
        lastDisciplineLoadKeyRef.current = scopeLoad.key;
        setRepDisciplinePriceLoading(false);
      }
      if (repTab !== "discipline" && !scopeLoad.disciplinePricesReady) {
        queueScopeDisciplineUpgrade({
          scopeReqId,
          scopeKey: scopeLoad.key,
          from,
          to,
          objectName: currentObject,
          objectIdByName: optionsLoad.value.objectIdByName,
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
  }, [repFrom, repTo, repObjectName, beginScopeRefresh, loadOptionsForScope, commitOptionsState, loadReportScope, repTab, commitReportState, commitDisciplineState, queueScopeDisciplineUpgrade]);

  const setReportTab = useCallback((t: RepTab) => {
    const switchStart = nowMs();
    setRepTab(t);
    if (t === "discipline") {
      const from = repFrom ? String(repFrom).slice(0, 10) : "";
      const to = repTo ? String(repTo).slice(0, 10) : "";
      const key = disciplineKey(from, to, repObjectName ?? null, repOptObjectIdByName);
      const hasReady = !!(repDiscipline || repData?.discipline);

      if (hasReady) {
        if (REPORTS_TIMING) console.info("[director_works] render_ready:from_cached_payload");
        if (lastDisciplineLoadKeyRef.current !== key) {
          void fetchDiscipline(undefined, { background: true });
        }
      } else {
        void fetchDiscipline();
      }
      logTiming("tab_switch_to_works", switchStart);
      return;
    }
    void fetchReport(undefined, { background: true });
  }, [disciplineKey, fetchDiscipline, repData, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo, fetchReport, logTiming, nowMs]);

  const openReports = useCallback(() => {
    const startedAt = nowMs();
    if (REPORTS_TIMING) console.info("[director_works] click:open_reports");
    setRepOpen(true);
    setRepTab("materials");
    void fetchReportOptions();
    void fetchReport();
    logTiming("open_reports_dispatch", startedAt);
  }, [fetchReport, fetchReportOptions, logTiming, nowMs]);

  const closeReports = useCallback(() => {
    setRepOpen(false);
    setRepPeriodOpen(false);
  }, []);

  return {
    repOpen,
    repTab,
    repPeriodOpen,
    repObjOpen,
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
    setRepTab: setReportTab,
    setRepPeriodOpen,
    setRepObjOpen,
    fetchReport,
    fetchDiscipline,
    fetchReportOptions,
    applyObjectFilter,
    applyReportPeriod,
    clearReportPeriod,
    openReports,
    refreshReports,
    closeReports,
  };
}

