import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { AppOption, RefOption } from "./foreman.types";

type DictRow = { code: string; name?: string | null; name_ru?: string | null };
type AppRow = { app_code: string; name_human?: string | null };
type ItemAppRow = { app_code: string | null };

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

export function useForemanDicts() {
  const [objOptions, setObjOptions] = useState<RefOption[]>([]);
  const [lvlOptions, setLvlOptions] = useState<RefOption[]>([]);
  const [sysOptions, setSysOptions] = useState<RefOption[]>([]);
  const [zoneOptions, setZoneOptions] = useState<RefOption[]>([]);
  const [appOptions, setAppOptions] = useState<AppOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetchWithFallback = async (
          table: string,
          select: string,
          orderColumn: string,
          fallbackSelect: string,
        ) => {
          const run = (cols: string) => supabase.from(table).select(cols).order(orderColumn);
          let result = await run(select);
          if (result.error) {
            const msg = String(result.error.message ?? "").toLowerCase();
            if (msg.includes("name_ru")) result = await run(fallbackSelect);
          }
          return result;
        };

        const [obj, lvl, sys, zn] = await Promise.all([
          fetchWithFallback("ref_object_types", "code,name,name_ru", "name", "code,name"),
          fetchWithFallback("ref_levels", "code,name,name_ru,sort", "sort", "code,name,sort"),
          fetchWithFallback("ref_systems", "code,name,name_ru", "name", "code,name"),
          fetchWithFallback("ref_zones", "code,name,name_ru", "name", "code,name"),
        ]);

        if (cancelled) return;

        const mapName = (r: DictRow) => String(r.name_ru ?? r.name ?? r.code ?? "").trim();
        const toRefOptions = (rows: unknown[]) =>
          rows
            .map(toDictRow)
            .filter((r): r is DictRow => !!r)
            .map((r) => ({ code: r.code, name: mapName(r) }))
            .filter((r) => String(r.code).trim() && String(r.name).trim());

        if (!obj.error && Array.isArray(obj.data)) setObjOptions(toRefOptions(obj.data));
        if (!lvl.error && Array.isArray(lvl.data)) setLvlOptions(toRefOptions(lvl.data));
        if (!sys.error && Array.isArray(sys.data)) setSysOptions(toRefOptions(sys.data));
        if (!zn.error && Array.isArray(zn.data)) setZoneOptions(toRefOptions(zn.data));
      } catch (e) {
        console.warn(e);
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
        const a = await supabase.from("rik_apps").select("app_code, name_human").order("app_code", { ascending: true });

        if (!cancelled && !a.error && Array.isArray(a.data) && a.data.length) {
          const rows = a.data.map(toAppRow).filter((r): r is AppRow => !!r);
          setAppOptions(
            rows.map((r) => ({
              code: r.app_code,
              label: (r.name_human && String(r.name_human).trim()) || r.app_code,
            })),
          );
          return;
        }

        const b = await supabase
          .from("rik_item_apps")
          .select("app_code")
          .not("app_code", "is", null)
          .order("app_code", { ascending: true });

        if (!cancelled && !b.error && Array.isArray(b.data)) {
          const uniq = Array.from(new Set(b.data.map(toItemAppRow).filter((r): r is ItemAppRow => !!r).map((r) => r.app_code)));
          setAppOptions(uniq.map((code) => ({ code: String(code), label: String(code) })));
        }
      } catch (e) {
        console.warn(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { objOptions, lvlOptions, sysOptions, zoneOptions, appOptions };
}
