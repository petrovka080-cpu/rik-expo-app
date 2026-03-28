import { supabase } from "../supabaseClient";
import { normalizeRuText } from "../text/encoding";
import type { CodeNameRow, DirectorFactRow, ObjectLookupRow, RikNameLookupRow } from "./director_reports.shared";
import {
  WITHOUT_LEVEL,
  asRecord,
  chunk,
  firstNonEmpty,
  normalizeCodeNameRow,
  normalizeObjectLookupRow,
} from "./director_reports.shared";
import {
  getFreshLookupValue,
  levelLookupCache,
  levelLookupInFlight,
  objectLookupCache,
  objectLookupInFlight,
  objectTypeLookupCache,
  objectTypeLookupInFlight,
  rikNameLookupCache,
  rikNameLookupInFlight,
  setLookupValue,
  systemLookupCache,
  systemLookupInFlight,
} from "./director_reports.cache";

async function fetchObjectsByIds(idsRaw: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set((idsRaw || []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  const out = new Map<string, string>();
  if (!ids.length) return out;

  const missingIds: string[] = [];
  for (const id of ids) {
    const cached = getFreshLookupValue(objectLookupCache, id);
    if (cached !== undefined) {
      if (cached) out.set(id, cached);
      continue;
    }
    missingIds.push(id);
  }
  if (!missingIds.length) return out;

  const inFlightKey = missingIds.slice().sort().join("|");
  let pending = objectLookupInFlight.get(inFlightKey);
  if (!pending) {
    pending = (async () => {
      const loaded = new Map<string, string>();
      for (const part of chunk(missingIds, 500)) {
        const { data, error } = await supabase
          .from("objects" as never)
          .select("id,name")
          .in("id", part);
        if (error) throw error;
        const rows = Array.isArray(data)
          ? data.map(normalizeObjectLookupRow).filter((row): row is ObjectLookupRow => !!row)
          : [];
        const seen = new Set<string>();
        for (const row of rows) {
          seen.add(row.id);
          const name = String(row.name ?? "").trim();
          setLookupValue(objectLookupCache, row.id, name || null);
          if (name) loaded.set(row.id, name);
        }
        for (const id of part) {
          if (!seen.has(id)) setLookupValue(objectLookupCache, id, null);
        }
      }
      return loaded;
    })();
    objectLookupInFlight.set(inFlightKey, pending);
  }

  try {
    const loaded = await pending;
    for (const [id, name] of loaded.entries()) out.set(id, name);
    for (const id of missingIds) {
      const cached = getFreshLookupValue(objectLookupCache, id);
      if (cached) out.set(id, cached);
    }
    return out;
  } finally {
    objectLookupInFlight.delete(inFlightKey);
  }
}

async function fetchCodeLookupByCodes(
  cache: Map<string, { ts: number; value: string | null }>,
  inFlight: Map<string, Promise<Map<string, string>>>,
  table: "ref_object_types" | "ref_systems" | "ref_levels" | "v_rik_names_ru",
  selectCols: string,
  codesRaw: string[],
  resolveName: (row: CodeNameRow | RikNameLookupRow) => string,
): Promise<Map<string, string>> {
  const codes = Array.from(new Set((codesRaw || []).map((x) => String(x ?? "").trim().toUpperCase()).filter(Boolean)));
  const out = new Map<string, string>();
  if (!codes.length) return out;

  const missingCodes: string[] = [];
  for (const code of codes) {
    const cached = getFreshLookupValue(cache, code);
    if (cached !== undefined) {
      if (cached) out.set(code, cached);
      continue;
    }
    missingCodes.push(code);
  }
  if (!missingCodes.length) return out;

  const inFlightKey = `${table}:${missingCodes.slice().sort().join("|")}`;
  let pending = inFlight.get(inFlightKey);
  if (!pending) {
    pending = (async () => {
      const loaded = new Map<string, string>();
      for (const part of chunk(missingCodes, 500)) {
        const { data, error } = await supabase
          .from(table as never)
          .select(selectCols)
          .in("code", part);
        if (error) throw error;
        const rows = Array.isArray(data)
          ? data
              .map((row) => (table === "v_rik_names_ru" ? normalizeCodeNameRow(row) : normalizeCodeNameRow(row)))
              .filter((row): row is CodeNameRow => !!row)
          : [];
        const seen = new Set<string>();
        for (const row of rows) {
          const code = String(row.code ?? "").trim().toUpperCase();
          if (!code) continue;
          seen.add(code);
          const name = resolveName(row).trim();
          setLookupValue(cache, code, name || null);
          if (name) loaded.set(code, name);
        }
        for (const code of part) {
          if (!seen.has(code)) setLookupValue(cache, code, null);
        }
      }
      return loaded;
    })();
    inFlight.set(inFlightKey, pending);
  }

  try {
    const loaded = await pending;
    for (const [code, name] of loaded.entries()) out.set(code, name);
    for (const code of missingCodes) {
      const cached = getFreshLookupValue(cache, code);
      if (cached) out.set(code, cached);
    }
    return out;
  } finally {
    inFlight.delete(inFlightKey);
  }
}

async function fetchObjectTypeNamesByCode(codes: string[]): Promise<Map<string, string>> {
  return await fetchCodeLookupByCodes(
    objectTypeLookupCache,
    objectTypeLookupInFlight,
    "ref_object_types",
    "code,name_human_ru,display_name,name",
    codes,
    (row) => firstNonEmpty((row as CodeNameRow).name_human_ru, (row as CodeNameRow).display_name, (row as CodeNameRow).name),
  );
}

async function fetchSystemNamesByCode(codes: string[]): Promise<Map<string, string>> {
  return await fetchCodeLookupByCodes(
    systemLookupCache,
    systemLookupInFlight,
    "ref_systems",
    "code,name_human_ru,display_name,alias_ru,name",
    codes,
    (row) =>
      firstNonEmpty(
        (row as CodeNameRow).name_human_ru,
        (row as CodeNameRow).display_name,
        (row as CodeNameRow).alias_ru,
        (row as CodeNameRow).name,
      ),
  );
}

async function fetchRikNamesRuByCode(codes: string[]): Promise<Map<string, string>> {
  return await fetchCodeLookupByCodes(
    rikNameLookupCache,
    rikNameLookupInFlight,
    "v_rik_names_ru",
    "code,name_ru",
    codes,
    (row) => String((row as CodeNameRow).name_ru ?? "").trim(),
  );
}

type NameSourcesProbe = {
  vrr: boolean;
};

type NameSourcesProbeCacheEntry = {
  value: NameSourcesProbe;
  ts: number;
};

type MaterialNameResolutionSource =
  | "catalog_name_overrides"
  | "v_rik_names_ru"
  | "balance_ledger"
  | "unresolved_code_fallback";

const NAME_SOURCES_PROBE_POSITIVE_TTL_MS = 5 * 60 * 1000;
const NAME_SOURCES_PROBE_NEGATIVE_TTL_MS = 60 * 1000;

let nameSourcesProbeCache: NameSourcesProbeCacheEntry | null = null;
const materialNameResolveCache = new Map<string, string>();
const materialNameResolveMissCache = new Set<string>();
const materialNameResolveInFlight = new Map<string, Promise<Map<string, string>>>();
const materialNameResolveSourceCache = new Map<string, MaterialNameResolutionSource>();

const warnDirectorNaming = (operation: string, source: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "unknown_error");
  console.warn("[director_reports.naming]", { operation, source, message });
};

async function probeNameSources(): Promise<NameSourcesProbe> {
  const cached = nameSourcesProbeCache;
  if (cached) {
    const ttl = cached.value.vrr ? NAME_SOURCES_PROBE_POSITIVE_TTL_MS : NAME_SOURCES_PROBE_NEGATIVE_TTL_MS;
    if (Date.now() - cached.ts < ttl) {
      return cached.value;
    }
  }

  let vrr = false;

  try {
    const r = await supabase
      .from("v_rik_names_ru" as never)
      .select("code,name_ru")
      .limit(1);
    vrr = !r.error;
    if (r.error) {
      warnDirectorNaming("probe", "v_rik_names_ru", r.error);
    }
  } catch (error) {
    warnDirectorNaming("probe", "v_rik_names_ru", error);
  }

  nameSourcesProbeCache = {
    value: { vrr },
    ts: Date.now(),
  };
  return nameSourcesProbeCache.value;
}

const looksLikeMaterialCode = (v: unknown): boolean => {
  const x = String(v ?? "").trim().toUpperCase();
  if (!x) return false;
  if (
    x.startsWith("MAT-") ||
    x.startsWith("TOOL-") ||
    x.startsWith("WT-") ||
    x.startsWith("WORK-") ||
    x.startsWith("SRV-") ||
    x.startsWith("SERV-") ||
    x.startsWith("KIT-")
  ) {
    return true;
  }
  return /^[A-Z0-9._/-]{4,}$/.test(x);
};

const looksLikeLevelCode = (v: unknown): boolean => {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return false;
  if (s === WITHOUT_LEVEL.toUpperCase()) return false;
  if (s.startsWith("LVL-")) return true;
  return /^[A-Z0-9_-]{3,}$/.test(s) && !/\s/.test(s);
};

const normMaterialName = (v: unknown): string =>
  String(normalizeRuText(String(v ?? ""))).trim();

async function fetchBestMaterialNamesByCode(codesRaw: string[]): Promise<Map<string, string>> {
  const codes = Array.from(
    new Set(
      (codesRaw || [])
        .map((c) => String(c ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const out = new Map<string, string>();
  if (!codes.length) return out;

  for (const code of codes) {
    const cached = materialNameResolveCache.get(code);
    if (cached) out.set(code, cached);
  }
  const missingCodes = codes.filter((code) => !out.has(code) && !materialNameResolveMissCache.has(code));
  if (!missingCodes.length) return out;

  const inFlightKey = missingCodes.slice().sort().join("|");
  const inFlight = materialNameResolveInFlight.get(inFlightKey);
  if (inFlight) {
    const resolved = await inFlight;
    for (const [code, name] of resolved.entries()) {
      out.set(code, name);
      materialNameResolveCache.set(code, name);
    }
    return out;
  }

  const resolveMissing = async (): Promise<Map<string, string>> => {
    type DynamicQueryClient = {
      from: (table: string) => {
        select: (columns: string) => {
          in: (field: string, values: string[]) => Promise<{ error: unknown; data: unknown[] | null }>;
        };
      };
    };

    const put = (dst: Map<string, string>, codeRaw: unknown, nameRaw: unknown, force = false) => {
      const code = String(codeRaw ?? "").trim().toUpperCase();
      const name = normMaterialName(nameRaw);
      if (!code || !name) return;
      if (!force && dst.has(code)) return;
      dst.set(code, name);
    };

    const fetchSource = async (
      table: string,
      selectCols: string,
      codeField: string,
      nameField: string,
    ): Promise<Map<string, string>> => {
      const sourceMap = new Map<string, string>();
      for (const part of chunk(missingCodes, 500)) {
        try {
          const sb = supabase as unknown as DynamicQueryClient;
          const q = await sb
            .from(table)
            .select(selectCols)
            .in(codeField, part);
          if (q.error) {
            warnDirectorNaming("fetch_source", table, q.error);
            continue;
          }
          if (Array.isArray(q.data)) {
            for (const rowValue of q.data as unknown[]) {
              const row = asRecord(rowValue);
              put(sourceMap, row[codeField], row[nameField]);
            }
          }
        } catch (error) {
          warnDirectorNaming("fetch_source", table, error);
        }
      }
      return sourceMap;
    };

    // Resolve independent name sources concurrently and merge with existing priority:
    // catalog_name_overrides > v_rik_names_ru > v_wh_balance_ledger_ui.
    const [ledgerMap, rikMap, overrideMap] = await Promise.all([
      fetchSource("v_wh_balance_ledger_ui", "code,name", "code", "name"),
      fetchSource("v_rik_names_ru", "code,name_ru", "code", "name_ru"),
      fetchSource("catalog_name_overrides", "code,name_ru", "code", "name_ru"),
    ]);

    const resolved = new Map<string, string>();
    for (const [code, name] of ledgerMap.entries()) {
      resolved.set(code, name);
      materialNameResolveSourceCache.set(code, "balance_ledger");
    }
    for (const [code, name] of rikMap.entries()) {
      resolved.set(code, name);
      materialNameResolveSourceCache.set(code, "v_rik_names_ru");
    }
    for (const [code, name] of overrideMap.entries()) {
      resolved.set(code, name);
      materialNameResolveSourceCache.set(code, "catalog_name_overrides");
    }
    return resolved;
  };

  const pending = resolveMissing();
  materialNameResolveInFlight.set(inFlightKey, pending);
  let resolvedMissing = new Map<string, string>();
  try {
    resolvedMissing = await pending;
  } finally {
    materialNameResolveInFlight.delete(inFlightKey);
  }

  for (const [code, name] of resolvedMissing.entries()) {
    out.set(code, name);
    materialNameResolveCache.set(code, name);
    materialNameResolveMissCache.delete(code);
  }
  for (const code of missingCodes) {
    if (!resolvedMissing.has(code)) {
      materialNameResolveMissCache.add(code);
      materialNameResolveSourceCache.set(code, "unresolved_code_fallback");
    }
  }

  return out;
}

const getMaterialNameResolutionSource = (codeRaw: string): MaterialNameResolutionSource => {
  const code = String(codeRaw ?? "").trim().toUpperCase();
  return materialNameResolveSourceCache.get(code) ?? "unresolved_code_fallback";
};

async function enrichFactRowsMaterialNames(rows: DirectorFactRow[]): Promise<DirectorFactRow[]> {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const codesToResolve = Array.from(
    new Set(
      rows
        .filter((r) => {
          const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase();
          if (!code) return false;
          const currentName = normMaterialName(r?.material_name_resolved ?? "");
          return !currentName || looksLikeMaterialCode(currentName);
        })
        .map((r) => String(r?.rik_code_resolved ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  if (!codesToResolve.length) return rows;
  const byCode = await fetchBestMaterialNamesByCode(codesToResolve);
  if (!byCode.size) return rows;

  return rows.map((r) => {
    const code = String(r?.rik_code_resolved ?? "").trim().toUpperCase();
    if (!code) return r;
    const bestName = byCode.get(code);
    if (!bestName) return r;
    const currentName = normMaterialName(r?.material_name_resolved ?? "");
    if (currentName && !looksLikeMaterialCode(currentName)) return r;
    return { ...r, material_name_resolved: bestName };
  });
}

async function fetchLevelNamesByCode(codesRaw: string[]): Promise<Map<string, string>> {
  return await fetchCodeLookupByCodes(
    levelLookupCache,
    levelLookupInFlight,
    "ref_levels",
    "code,name_human_ru,display_name,name",
    codesRaw,
    (row) =>
      firstNonEmpty(
        (row as CodeNameRow).name_human_ru,
        (row as CodeNameRow).display_name,
        (row as CodeNameRow).name,
      ),
  );
}

async function enrichFactRowsLevelNames(rows: DirectorFactRow[]): Promise<DirectorFactRow[]> {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const levelCodes = Array.from(
    new Set(
      rows
        .map((r) => String(r?.level_name_resolved ?? "").trim())
        .filter((lv) => looksLikeLevelCode(lv))
        .map((lv) => lv.toUpperCase()),
    ),
  );
  if (!levelCodes.length) return rows;

  const byCode = await fetchLevelNamesByCode(levelCodes);
  if (!byCode.size) return rows;

  return rows.map((r) => {
    const raw = String(r?.level_name_resolved ?? "").trim();
    if (!raw || !looksLikeLevelCode(raw)) return r;
    const mapped = byCode.get(raw.toUpperCase());
    if (!mapped) return r;
    return { ...r, level_name_resolved: mapped };
  });
}

export {
  fetchObjectsByIds,
  fetchCodeLookupByCodes,
  fetchObjectTypeNamesByCode,
  fetchSystemNamesByCode,
  fetchRikNamesRuByCode,
  probeNameSources,
  looksLikeMaterialCode,
  looksLikeLevelCode,
  normMaterialName,
  fetchBestMaterialNamesByCode,
  getMaterialNameResolutionSource,
  enrichFactRowsMaterialNames,
  fetchLevelNamesByCode,
  enrichFactRowsLevelNames,
};
