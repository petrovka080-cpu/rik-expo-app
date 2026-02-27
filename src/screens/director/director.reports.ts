import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  fetchDirectorWarehouseReport,
  fetchDirectorWarehouseReportOptions,
} from "../../lib/api/director_reports";
import type { RepPayload, RepTab } from "./director.types";

type Deps = {
  fmtDateOnly: (iso?: string | null) => string;
};

type CacheEntry<T> = { ts: number; value: T };

const REPORTS_CACHE_TTL_MS = 5 * 60 * 1000;
const REPORTS_CACHE_MAX = 40;

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
  const [repData, setRepData] = useState<RepPayload | null>(null);
  const [repOptLoading, setRepOptLoading] = useState(false);
  const [repOptObjects, setRepOptObjects] = useState<string[]>([]);
  const [repOptObjectIdByName, setRepOptObjectIdByName] = useState<Record<string, string | null>>({});
  const reportReqSeqRef = useRef(0);
  const optionsReqSeqRef = useRef(0);
  const inFlightReportRef = useRef<Map<string, Promise<void>>>(new Map());
  const inFlightOptionsRef = useRef<Map<string, Promise<void>>>(new Map());
  const reportCacheRef = useRef<Map<string, CacheEntry<RepPayload | null>>>(new Map());
  const optionsCacheRef = useRef<Map<string, CacheEntry<{ objects: string[]; objectIdByName: Record<string, string | null> }>>>(new Map());

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

  const applyObjectFilter = useCallback(async (obj: string | null) => {
    setRepObjectName(obj);
    await fetchReport(obj);
  }, [fetchReport]);

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
  }, [getCached, optionsKey, reportKey]);

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
    } catch (e: any) {
      console.warn("[director] refreshReports:", e?.message ?? e);
      setRepData(null);
      Alert.alert("Отчеты", e?.message ?? "Не удалось обновить отчет");
    } finally {
      setRepOptLoading(false);
      setRepLoading(false);
    }
  }, [repFrom, repTo, repObjectName, optionsKey, reportKey, setCached]);

  const openReports = useCallback(() => {
    setRepOpen(true);
    setRepTab("materials");
    void fetchReport();
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
    repData,
    repOptLoading,
    repOptObjects,
    repPeriodShort,
    setRepTab,
    setRepPeriodOpen,
    setRepObjOpen,
    fetchReport,
    fetchReportOptions,
    applyObjectFilter,
    applyReportPeriod,
    clearReportPeriod,
    openReports,
    refreshReports,
    closeReports,
  };
}
