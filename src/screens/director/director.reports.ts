import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  fetchDirectorWarehouseReport,
  fetchDirectorWarehouseReportDiscipline,
  fetchDirectorWarehouseReportOptions,
} from "../../lib/api/director_reports";
import type { RepDisciplinePayload, RepPayload, RepTab } from "./director.types";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

type CacheEntry<T> = { ts: number; value: T };

const REPORTS_CACHE_TTL_MS = 5 * 60 * 1000;
const REPORTS_CACHE_MAX = 40;
const REPORTS_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;

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
  const inFlightReportRef = useRef<Map<string, Promise<void>>>(new Map());
  const inFlightDisciplineRef = useRef<Map<string, Promise<void>>>(new Map());
  const inFlightOptionsRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportCacheRef = useRef<Map<string, CacheEntry<RepPayload | null>>>(new Map());
  const disciplineCacheRef = useRef<Map<string, CacheEntry<RepDisciplinePayload | null>>>(new Map());
  const optionsCacheRef = useRef<Map<string, CacheEntry<{ objects: string[]; objectIdByName: Record<string, string | null> }>>>(new Map());
  const lastDisciplineLoadKeyRef = useRef<string>("");
  const disciplinePricesReadyRef = useRef<Set<string>>(new Set());

  const nowMs = () => {
    try {
      // @ts-ignore cross-platform
      return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    } catch {
      return Date.now();
    }
  };

  const logTiming = (label: string, startedAt: number) => {
    if (!REPORTS_TIMING) return;
    const ms = Math.round(nowMs() - startedAt);
    console.info(`[director_works] ${label}: ${ms}ms`);
  };

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

  const mapSig = useCallback((m: Record<string, string | null>) => {
    const keys = Object.keys(m || {}).sort();
    return keys.map((k) => `${k}:${String(m[k] ?? "")}`).join("|");
  }, []);

  const optionsKey = useCallback((from: string, to: string) => `${from}|${to}`, []);
  const reportKey = useCallback(
    (from: string, to: string, objectName: string | null, objectMap: Record<string, string | null>) =>
      `${from}|${to}|${String(objectName ?? "")}|${mapSig(objectMap)}`,
    [mapSig],
  );
  const disciplineKey = reportKey;

  const repPeriodShort = useMemo(() => {
    return repFrom || repTo
      ? `${repFrom ? fmtDateOnly(repFrom) : "—"} → ${repTo ? fmtDateOnly(repTo) : "—"}`
      : "Весь период";
  }, [repFrom, repTo, fmtDateOnly]);

  const fetchReport = useCallback(async (objectNameArg?: string | null) => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = reportKey(from, to, objectName ?? null, repOptObjectIdByName);
    const cached = getCached(reportCacheRef.current, key);
    if (cached !== null) {
      setRepData(cached ?? null);
      return;
    }
    const inFlight = inFlightReportRef.current.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const reqId = ++reportReqSeqRef.current;
    const task = (async () => {
      setRepLoading(true);
      try {
        const payload = await fetchDirectorWarehouseReport({
          from,
          to,
          objectName: objectName ?? null,
          objectIdByName: repOptObjectIdByName,
        });
        if (reqId !== reportReqSeqRef.current) return;
        const normalized = (payload ?? null) as any;
        const fromReportObjects = Array.isArray(normalized?.report_options?.objects)
          ? (normalized.report_options.objects as string[])
          : null;
        const fromReportMap =
          normalized?.report_options?.objectIdByName &&
            typeof normalized.report_options.objectIdByName === "object"
            ? (normalized.report_options.objectIdByName as Record<string, string | null>)
            : null;
        if ((objectName ?? null) == null && fromReportObjects && fromReportMap) {
          setRepOptObjects(fromReportObjects);
          setRepOptObjectIdByName(fromReportMap);
          setCached(optionsCacheRef.current, optionsKey(from, to), {
            objects: fromReportObjects,
            objectIdByName: fromReportMap,
          });
        }
        setCached(reportCacheRef.current, key, normalized);
        setRepData(normalized);
        const disciplinePayload = (normalized as any)?.discipline ?? null;
        if (disciplinePayload) {
          setCached(disciplineCacheRef.current, key, disciplinePayload);
          setRepDiscipline(disciplinePayload);
          lastDisciplineLoadKeyRef.current = key;
        }
      } catch (e: any) {
        if (reqId !== reportReqSeqRef.current) return;
        console.warn("[director] fetchReport:", e?.message ?? e);
        setRepData(null);
        Alert.alert("Отчеты", e?.message ?? "Не удалось получить отчет");
      } finally {
        inFlightReportRef.current.delete(key);
        if (reqId === reportReqSeqRef.current) setRepLoading(false);
      }
    })();
    inFlightReportRef.current.set(key, task);
    await task;
  }, [repFrom, repTo, repObjectName, repOptObjectIdByName, reportKey, getCached, setCached, optionsKey]);

  const fetchDiscipline = useCallback(async (objectNameArg?: string | null, opts?: { background?: boolean }) => {
    const totalStart = nowMs();
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const objectName = objectNameArg === undefined ? repObjectName : objectNameArg;
    const key = disciplineKey(from, to, objectName ?? null, repOptObjectIdByName);
    if (REPORTS_TIMING) console.info(`[director_works] api:discipline:start key=${key}`);
    const cached = getCached(disciplineCacheRef.current, key);
    if (cached !== null) {
      setRepDiscipline(cached ?? null);
      lastDisciplineLoadKeyRef.current = key;
      const pricesReady = disciplinePricesReadyRef.current.has(key);
      setRepDisciplinePriceLoading(!pricesReady);
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
            const full = (payload ?? null) as RepDisciplinePayload | null;
            disciplinePricesReadyRef.current.add(key);
            setCached(disciplineCacheRef.current, key, full);
            setRepDiscipline(full);
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
        const normalizedBase = (basePayload ?? null) as RepDisciplinePayload | null;
        disciplinePricesReadyRef.current.delete(key);
        setCached(disciplineCacheRef.current, key, normalizedBase);
        setRepDiscipline(normalizedBase);
        lastDisciplineLoadKeyRef.current = key;
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
            const normalizedFull = (fullPayload ?? null) as RepDisciplinePayload | null;
            disciplinePricesReadyRef.current.add(key);
            setCached(disciplineCacheRef.current, key, normalizedFull);
            setRepDiscipline(normalizedFull);
          } catch (e: any) {
            if (REPORTS_TIMING) console.warn("[director_works] prices_stage_failed:", e?.message ?? e);
          } finally {
            if (reqId === disciplineReqSeqRef.current) setRepDisciplinePriceLoading(false);
          }
        })();
      } catch (e: any) {
        if (reqId !== disciplineReqSeqRef.current) return;
        console.warn("[director] fetchDiscipline:", e?.message ?? e);
        setRepDiscipline(null);
        setRepDisciplinePriceLoading(false);
        if (!opts?.background) {
          Alert.alert("Отчеты", e?.message ?? "Не удалось получить дисциплины");
        }
      } finally {
        inFlightDisciplineRef.current.delete(key);
        if (!opts?.background && reqId === disciplineReqSeqRef.current) setRepLoading(false);
        logTiming("api:discipline:total", totalStart);
      }
    })();
    inFlightDisciplineRef.current.set(key, task);
    await task;
  }, [repFrom, repTo, repObjectName, repOptObjectIdByName, disciplineKey, getCached, setCached]);

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    setRepObjectName(obj);
    if (repTab === "discipline") await fetchDiscipline(obj);
    else await fetchReport(obj);
  }, [fetchDiscipline, fetchReport, repTab]);

  const fetchReportOptions = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const key = optionsKey(from, to);
    const cached = getCached(optionsCacheRef.current, key);
    if (cached) {
      setRepOptObjects(Array.isArray(cached.objects) ? cached.objects : []);
      setRepOptObjectIdByName(cached.objectIdByName ?? {});
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
        const normalized = {
          objects: Array.isArray(opt.objects) ? opt.objects : [],
          objectIdByName: opt.objectIdByName ?? {},
        };
        setCached(optionsCacheRef.current, key, normalized);
        setRepOptObjects(normalized.objects);
        setRepOptObjectIdByName(normalized.objectIdByName);
      } catch (e: any) {
        if (reqId !== optionsReqSeqRef.current) return;
        console.warn("[director] fetchReportOptions:", e?.message ?? e);
        setRepOptObjects([]);
        setRepOptObjectIdByName({});
      } finally {
        inFlightOptionsRef.current.delete(key);
        if (reqId === optionsReqSeqRef.current) setRepOptLoading(false);
      }
    })();
    inFlightOptionsRef.current.set(key, task);
    await task;
  }, [repFrom, repTo, optionsKey, getCached, setCached]);

  const applyReportPeriod = useCallback(async (nextFrom: string | null, nextTo: string | null) => {
    setRepFrom(nextFrom);
    setRepTo(nextTo);
    setRepObjectName(null);
    setRepPeriodOpen(false);

    const from = nextFrom ? String(nextFrom).slice(0, 10) : "";
    const to = nextTo ? String(nextTo).slice(0, 10) : "";
    const optKey = optionsKey(from, to);

    const cachedOpt = getCached(optionsCacheRef.current, optKey);
    if (cachedOpt) {
      setRepOptObjects(Array.isArray(cachedOpt.objects) ? cachedOpt.objects : []);
      setRepOptObjectIdByName(cachedOpt.objectIdByName ?? {});
      const cachedReport = getCached(
        reportCacheRef.current,
        reportKey(from, to, null, cachedOpt.objectIdByName ?? {}),
      );
      if (cachedReport !== null) {
        setRepData(cachedReport ?? null);
        return;
      }
    }

    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const opt = await fetchDirectorWarehouseReportOptions({ from, to });
      setRepOptObjects(Array.isArray(opt.objects) ? opt.objects : []);
      setRepOptObjectIdByName(opt.objectIdByName ?? {});

      const payload = await fetchDirectorWarehouseReport({
        from,
        to,
        objectName: null,
        objectIdByName: opt.objectIdByName ?? {},
      });
      setRepData((payload ?? null) as any);
      if (repTab === "discipline") {
        const discipline = await fetchDirectorWarehouseReportDiscipline({
          from,
          to,
          objectName: null,
          objectIdByName: opt.objectIdByName ?? {},
        });
        setRepDiscipline((discipline ?? null) as any);
      }
    } catch (e: any) {
      console.warn("[director] applyReportPeriod:", e?.message ?? e);
      setRepData(null);
      setRepOptObjects([]);
      setRepOptObjectIdByName({});
      Alert.alert("Отчеты", e?.message ?? "Не удалось пересчитать отчет");
    } finally {
      setRepOptLoading(false);
      setRepLoading(false);
    }
  }, [getCached, optionsKey, reportKey, repTab]);

  const clearReportPeriod = useCallback(() => {
    const to = isoDate(new Date());
    const from = isoDate(minusDays(30));
    void applyReportPeriod(from, to);
  }, [applyReportPeriod]);

  const refreshReports = useCallback(async () => {
    const from = repFrom ? String(repFrom).slice(0, 10) : "";
    const to = repTo ? String(repTo).slice(0, 10) : "";
    const currentObject = repObjectName ?? null;

    setRepOptLoading(true);
    setRepLoading(true);
    try {
      const opt = await fetchDirectorWarehouseReportOptions({ from, to });
      const optNorm = {
        objects: Array.isArray(opt.objects) ? opt.objects : [],
        objectIdByName: opt.objectIdByName ?? {},
      };
      setCached(optionsCacheRef.current, optionsKey(from, to), optNorm);
      setRepOptObjects(optNorm.objects);
      setRepOptObjectIdByName(optNorm.objectIdByName);

      const payload = await fetchDirectorWarehouseReport({
        from,
        to,
        objectName: currentObject,
        objectIdByName: optNorm.objectIdByName,
      });
      const normalized = (payload ?? null) as any;
      setCached(reportCacheRef.current, reportKey(from, to, currentObject, optNorm.objectIdByName), normalized);
      setRepData(normalized);
      if (repTab === "discipline") {
        const discipline = await fetchDirectorWarehouseReportDiscipline({
          from,
          to,
          objectName: currentObject,
          objectIdByName: optNorm.objectIdByName,
        });
        const disNorm = (discipline ?? null) as RepDisciplinePayload | null;
        setCached(disciplineCacheRef.current, disciplineKey(from, to, currentObject, optNorm.objectIdByName), disNorm);
        setRepDiscipline(disNorm);
      }
    } catch (e: any) {
      console.warn("[director] refreshReports:", e?.message ?? e);
      setRepData(null);
      Alert.alert("Отчеты", e?.message ?? "Не удалось обновить отчет");
    } finally {
      setRepOptLoading(false);
      setRepLoading(false);
    }
  }, [repFrom, repTo, repObjectName, optionsKey, reportKey, setCached, repTab, disciplineKey]);

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
    }
  }, [disciplineKey, fetchDiscipline, repData, repDiscipline, repFrom, repObjectName, repOptObjectIdByName, repTo]);

  const openReports = useCallback(() => {
    const startedAt = nowMs();
    if (REPORTS_TIMING) console.info("[director_works] click:open_reports");
    setRepOpen(true);
    setRepTab("materials");
    void fetchReport();
    logTiming("open_reports_dispatch", startedAt);
  }, [fetchReport]);

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
