import { useEffect, useState } from "react";
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
type DictsSnapshot = {
  objOptions: RefOption[];
  lvlOptions: RefOption[];
  sysOptions: RefOption[];
  zoneOptions: RefOption[];
  objAllOptions: RefOption[];
  lvlAllOptions: RefOption[];
  sysAllOptions: RefOption[];
  zoneAllOptions: RefOption[];
};

const warnForemanDicts = (scope: "refs load failed" | "app load failed", error: unknown) => {
  if (__DEV__) {
    console.warn(`[foreman.dicts] ${scope}`, error);
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
  const app_code = String(row.app_code ?? "").trim();
  if (!app_code) return null;
  return {
    app_code,
    name_human: row.name_human == null ? null : String(row.name_human),
  };
};

const toItemAppRow = (value: unknown): ItemAppRow | null => {
  const row = asRecord(value);
  const raw = row.app_code;
  if (raw == null) return null;
  const app_code = String(raw).trim();
  if (!app_code) return null;
  return { app_code };
};

let foremanDictsCache: DictsSnapshot | null = null;
let foremanDictsInFlight: Promise<DictsSnapshot> | null = null;
let foremanAppOptionsCache: AppOption[] | null = null;
let foremanAppOptionsInFlight: Promise<AppOption[]> | null = null;

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

const mapName = (r: DictRow) => String(r.name_ru ?? r.name ?? r.code ?? "").trim();

const toRefOptions = (rows: unknown[], includeEmpty: boolean) => {
  const fetched = rows
    .map(toDictRow)
    .filter((r): r is DictRow => !!r)
    .map((r) => ({ code: r.code, name: mapName(r) }))
    .filter((r) => String(r.code).trim() && String(r.name).trim());
  return includeEmpty ? [{ code: "", name: "— Не выбрано —" }, ...fetched] : fetched;
};

const fetchForemanDictsSnapshot = async (): Promise<DictsSnapshot> => {
  if (foremanDictsCache) return foremanDictsCache;
  if (foremanDictsInFlight) return foremanDictsInFlight;

  foremanDictsInFlight = (async () => {
    const [obj, lvl, sys, zn] = await Promise.all([
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
    if (!zn.error && Array.isArray(zn.data)) {
      const all = toRefOptions(zn.data, true);
      snapshot.zoneAllOptions = all;
      snapshot.zoneOptions = getForemanZoneOptions(all);
    }

    foremanDictsCache = snapshot;
    return snapshot;
  })();

  try {
    return await foremanDictsInFlight;
  } finally {
    foremanDictsInFlight = null;
  }
};

const fetchForemanAppOptions = async (): Promise<AppOption[]> => {
  if (foremanAppOptionsCache) return foremanAppOptionsCache;
  if (foremanAppOptionsInFlight) return foremanAppOptionsInFlight;

  foremanAppOptionsInFlight = (async () => {
    const a = await supabase.from("rik_apps").select("app_code, name_human").order("app_code", { ascending: true });

    if (!a.error && Array.isArray(a.data) && a.data.length) {
      const rows = a.data.map(toAppRow).filter((r): r is AppRow => !!r);
      const options = rows.map((r) => ({
        code: r.app_code,
        label: (r.name_human && String(r.name_human).trim()) || r.app_code,
      }));
      foremanAppOptionsCache = options;
      return options;
    }

    const b = await supabase
      .from("rik_item_apps")
      .select("app_code")
      .not("app_code", "is", null)
      .order("app_code", { ascending: true });

    if (!b.error && Array.isArray(b.data)) {
      const uniq = Array.from(new Set(b.data.map(toItemAppRow).filter((r): r is ItemAppRow => !!r).map((r) => r.app_code)));
      const options = uniq.map((code) => ({ code: String(code), label: String(code) }));
      foremanAppOptionsCache = options;
      return options;
    }

    const options: AppOption[] = [];
    foremanAppOptionsCache = options;
    return options;
  })();

  try {
    return await foremanAppOptionsInFlight;
  } finally {
    foremanAppOptionsInFlight = null;
  }
};

export function useForemanDicts() {
  const [objOptions, setObjOptions] = useState<RefOption[]>([]);
  const [lvlOptions, setLvlOptions] = useState<RefOption[]>([]);
  const [sysOptions, setSysOptions] = useState<RefOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<RefOption[]>([]);
  const [objAllOptions, setObjAllOptions] = useState<RefOption[]>([]);
  const [lvlAllOptions, setLvlAllOptions] = useState<RefOption[]>([]);
  const [sysAllOptions, setSysAllOptions] = useState<RefOption[]>([]);
  const [zoneAllOptions, setZoneAllOptions] = useState<RefOption[]>([]);
  const [appOptions, setAppOptions] = useState<AppOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await fetchForemanDictsSnapshot();
        if (cancelled) return;
        setObjAllOptions(snapshot.objAllOptions);
        setObjOptions(snapshot.objOptions);
        setLvlAllOptions(snapshot.lvlAllOptions);
        setLvlOptions(snapshot.lvlOptions);
        setSysAllOptions(snapshot.sysAllOptions);
        setSysOptions(snapshot.sysOptions);
        setZoneAllOptions(snapshot.zoneAllOptions);
        setZoneOptions(snapshot.zoneOptions);
      } catch (e) {
        warnForemanDicts("refs load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await fetchForemanAppOptions();
        if (!cancelled) setAppOptions(options);
      } catch (e) {
        warnForemanDicts("app load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    objOptions,
    lvlOptions,
    sysOptions,
    zoneOptions,
    objAllOptions,
    lvlAllOptions,
    sysAllOptions,
    zoneAllOptions,
    appOptions,
  };
}
