import type { Database } from "../../lib/database.types";
import { supabase } from "../../lib/supabaseClient";
import type { AppOption, RefOption } from "./foreman.types";
import {
  getForemanLevelOptions,
  getForemanObjectOptions,
  getForemanSystemOptions,
  getForemanZoneOptions,
} from "./foreman.options";

type DictRow = { code: string; name?: string | null; name_ru?: string | null };
type AppRow = { app_code: string; name_human?: string | null };
type ItemAppRow = { app_code: string | null };
type DictTable = "ref_object_types" | "ref_levels" | "ref_systems" | "ref_zones";
type DictSelectResult = {
  data: Database["public"]["Tables"]["ref_object_types"]["Row"][] | null;
  error: { message?: string | null } | null;
};

export type DictsSnapshot = {
  objOptions: RefOption[];
  lvlOptions: RefOption[];
  sysOptions: RefOption[];
  zoneOptions: RefOption[];
  objAllOptions: RefOption[];
  lvlAllOptions: RefOption[];
  sysAllOptions: RefOption[];
  zoneAllOptions: RefOption[];
};

type CacheEntry<T> = {
  value: T | null;
  expiresAt: number;
  promise: Promise<T> | null;
};
type UserNameCacheEntry = {
  value: string | null;
  expiresAt: number;
  promise: Promise<string> | null;
};

const FOREMAN_DICTS_TTL_MS = 5 * 60 * 1000;
const FOREMAN_APPS_TTL_MS = 5 * 60 * 1000;
const FOREMAN_PROFILE_NAME_TTL_MS = 5 * 60 * 1000;

const dictSnapshotCache: CacheEntry<DictsSnapshot> = {
  value: null,
  expiresAt: 0,
  promise: null,
};

const appOptionsCache: CacheEntry<AppOption[]> = {
  value: null,
  expiresAt: 0,
  promise: null,
};

const foremanProfileNameCache = new Map<string, UserNameCacheEntry>();

const now = () => Date.now();

const isFresh = <T,>(entry: CacheEntry<T>) => entry.value != null && entry.expiresAt > now();

const readCached = async <T,>(
  entry: CacheEntry<T>,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> => {
  if (isFresh(entry)) return entry.value as T;
  if (entry.promise) return entry.promise;

  entry.promise = (async () => {
    const next = await loader();
    entry.value = next;
    entry.expiresAt = now() + ttlMs;
    return next;
  })();

  try {
    return await entry.promise;
  } finally {
    entry.promise = null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toDictRow = (value: unknown): DictRow | null => {
  const row = asRecord(value);
  const code = String(row.code ?? "").trim();
  if (!code) return null;
  return {
    code,
    name: row.name == null ? null : String(row.name),
    name_ru: row.name_ru == null ? null : String(row.name_ru),
  };
};

const toAppRow = (value: unknown): AppRow | null => {
  const row = asRecord(value);
  const appCode = String(row.app_code ?? "").trim();
  if (!appCode) return null;
  return {
    app_code: appCode,
    name_human: row.name_human == null ? null : String(row.name_human),
  };
};

const toItemAppRow = (value: unknown): ItemAppRow | null => {
  const row = asRecord(value);
  const raw = row.app_code;
  if (raw == null) return null;
  const appCode = String(raw).trim();
  if (!appCode) return null;
  return { app_code: appCode };
};

const fetchWithFallback = async (
  table: DictTable,
  select: string,
  orderColumn: string,
  fallbackSelect: string,
) => {
  const run = async (cols: string): Promise<DictSelectResult> => {
    switch (table) {
      case "ref_object_types":
        return (await supabase.from("ref_object_types").select(cols).order(orderColumn)) as DictSelectResult;
      case "ref_levels":
        return (await supabase.from("ref_levels").select(cols).order(orderColumn)) as DictSelectResult;
      case "ref_systems":
        return (await supabase.from("ref_systems").select(cols).order(orderColumn)) as DictSelectResult;
      case "ref_zones":
        return (await supabase.from("ref_zones").select(cols).order(orderColumn)) as DictSelectResult;
    }
  };

  let result = await run(select);
  if (result.error) {
    const msg = String(result.error.message ?? "").toLowerCase();
    if (msg.includes("name_ru")) result = await run(fallbackSelect);
  }
  return result;
};

const mapName = (row: DictRow) => String(row.name_ru ?? row.name ?? row.code ?? "").trim();

const toRefOptions = (rows: unknown[], includeEmpty: boolean) => {
  const fetched = rows
    .map(toDictRow)
    .filter((row): row is DictRow => !!row)
    .map((row) => ({ code: row.code, name: mapName(row) }))
    .filter((row) => String(row.code).trim() && String(row.name).trim());
  return includeEmpty ? [{ code: "", name: "— Не выбрано —" }, ...fetched] : fetched;
};

const loadForemanDictsSnapshot = async (): Promise<DictsSnapshot> => {
  const [obj, lvl, sys, zone] = await Promise.all([
    fetchWithFallback("ref_object_types", "code,name,name_ru", "name", "code,name"),
    fetchWithFallback("ref_levels", "code,name,name_ru,sort", "sort", "code,name,sort"),
    fetchWithFallback("ref_systems", "code,name,name_ru", "name", "code,name"),
    fetchWithFallback("ref_zones", "code,name,name_ru", "name", "code,name"),
  ]);

  const snapshot: DictsSnapshot = {
    objOptions: [],
    lvlOptions: [],
    sysOptions: [],
    zoneOptions: [],
    objAllOptions: [],
    lvlAllOptions: [],
    sysAllOptions: [],
    zoneAllOptions: [],
  };

  if (!obj.error && Array.isArray(obj.data)) {
    const all = toRefOptions(obj.data, false);
    snapshot.objAllOptions = all;
    snapshot.objOptions = getForemanObjectOptions(all);
  }
  if (!lvl.error && Array.isArray(lvl.data)) {
    const all = toRefOptions(lvl.data, true);
    snapshot.lvlAllOptions = all;
    snapshot.lvlOptions = getForemanLevelOptions(all);
  }
  if (!sys.error && Array.isArray(sys.data)) {
    const all = toRefOptions(sys.data, true);
    snapshot.sysAllOptions = all;
    snapshot.sysOptions = getForemanSystemOptions(all);
  }
  if (!zone.error && Array.isArray(zone.data)) {
    const all = toRefOptions(zone.data, true);
    snapshot.zoneAllOptions = all;
    snapshot.zoneOptions = getForemanZoneOptions(all);
  }

  return snapshot;
};

const loadForemanAppOptions = async (): Promise<AppOption[]> => {
  const apps = await supabase.from("rik_apps").select("app_code, name_human").order("app_code", { ascending: true });

  if (!apps.error && Array.isArray(apps.data) && apps.data.length) {
    return apps.data
      .map(toAppRow)
      .filter((row): row is AppRow => !!row)
      .map((row) => ({
        code: row.app_code,
        label: (row.name_human && String(row.name_human).trim()) || row.app_code,
      }));
  }

  const fallback = await supabase
    .from("rik_item_apps")
    .select("app_code")
    .not("app_code", "is", null)
    .order("app_code", { ascending: true });

  if (!fallback.error && Array.isArray(fallback.data)) {
    const uniq = Array.from(
      new Set(
        fallback.data
          .map(toItemAppRow)
          .filter((row): row is ItemAppRow => !!row)
          .map((row) => row.app_code),
      ),
    );
    return uniq.map((code) => ({ code: String(code), label: String(code) }));
  }

  return [];
};

export const peekForemanDictsSnapshot = (): DictsSnapshot | null =>
  isFresh(dictSnapshotCache) ? (dictSnapshotCache.value as DictsSnapshot) : null;

export const peekForemanAppOptions = (): AppOption[] | null =>
  isFresh(appOptionsCache) ? (appOptionsCache.value as AppOption[]) : null;

export const readForemanDictsSnapshot = async (): Promise<DictsSnapshot> =>
  await readCached(dictSnapshotCache, FOREMAN_DICTS_TTL_MS, loadForemanDictsSnapshot);

export const readForemanAppOptions = async (): Promise<AppOption[]> =>
  await readCached(appOptionsCache, FOREMAN_APPS_TTL_MS, loadForemanAppOptions);

export const readForemanProfileName = async (userId: string): Promise<string> => {
  const normalized = String(userId || "").trim();
  if (!normalized) return "";

  const cached = foremanProfileNameCache.get(normalized);
  if (cached?.value != null && cached.expiresAt > now()) return cached.value;
  if (cached?.promise) return cached.promise;

  const nextEntry: UserNameCacheEntry = cached ?? { value: null, expiresAt: 0, promise: null };
  nextEntry.promise = (async () => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", normalized)
      .maybeSingle();
    if (error) throw error;
    const value = String((data as { full_name?: unknown } | null)?.full_name ?? "").trim();
    nextEntry.value = value;
    nextEntry.expiresAt = now() + FOREMAN_PROFILE_NAME_TTL_MS;
    return value;
  })();
  foremanProfileNameCache.set(normalized, nextEntry);

  try {
    return await nextEntry.promise;
  } finally {
    nextEntry.promise = null;
  }
};

export const invalidateForemanDictCaches = () => {
  dictSnapshotCache.value = null;
  dictSnapshotCache.expiresAt = 0;
  appOptionsCache.value = null;
  appOptionsCache.expiresAt = 0;
  foremanProfileNameCache.clear();
};
