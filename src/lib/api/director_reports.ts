import { supabase } from "../supabaseClient";
import { normalizeRuText } from "../text/encoding";

type DirectorReportOptions = {
  objects: string[];
  objectIdByName: Record<string, string | null>;
};

type DirectorReportRow = {
  rik_code: string;
  name_human_ru: string;
  uom: string;
  qty_total: number;
  docs_cnt: number;
  qty_without_request: number;
  docs_without_request: number;
};

type DirectorReportWho = {
  who: string;
  items_cnt: number;
};

type DirectorDisciplineMaterial = {
  material_name: string;
  rik_code: string;
  uom: string;
  qty_sum: number;
  docs_count: number;
  unit_price?: number;
  amount_sum?: number;
};

type DirectorDisciplineLevel = {
  id: string;
  level_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_in_work_pct: number;
  req_positions: number;
  free_positions: number;
  materials: DirectorDisciplineMaterial[];
};

type DirectorDisciplineWork = {
  id: string;
  work_type_name: string;
  total_qty: number;
  total_docs: number;
  total_positions: number;
  share_total_pct: number;
  req_positions: number;
  free_positions: number;
  levels: DirectorDisciplineLevel[];
};

type DirectorDisciplinePayload = {
  summary: {
    total_qty: number;
    total_docs: number;
    total_positions: number;
    pct_without_work: number;
    pct_without_level: number;
    pct_without_request: number;
    issue_cost_total: number;
    purchase_cost_total: number;
    issue_to_purchase_pct: number;
    unpriced_issue_pct: number;
  };
  works: DirectorDisciplineWork[];
};

type DirectorReportPayload = {
  meta?: { from?: string; to?: string; object_name?: string | null };
  kpi?: {
    issues_total: number;
    issues_without_object: number;
    items_total: number;
    items_without_request: number;
  };
  rows?: DirectorReportRow[];
  discipline_who?: DirectorReportWho[];
  discipline?: DirectorDisciplinePayload;
  report_options?: DirectorReportOptions;
};

type DirectorFactRow = {
  issue_id: number | string;
  iss_date: string;
  object_name: string | null;
  work_name: string | null;
  level_name?: string | null;
  request_item_id?: string | null;
  rik_code: string;
  material_name_ru: string | null;
  uom: string | null;
  qty: number | string | null;
  is_without_request: boolean | null;
};

type IdObjectRow = {
  id?: string | number | null;
  object_id?: string | number | null;
  request_id?: string | number | null;
  object_name?: string | null;
  name?: string | null;
};

type CodeNameRow = {
  code?: string | null;
  name_human_ru?: string | null;
  display_name?: string | null;
  alias_ru?: string | null;
  name_ru?: string | null;
  name?: string | null;
};

type AccIssueHead = {
  issue_id: number | string;
  event_dt: string | null;
  kind: string | null;
  who: string | null;
  note: string | null;
  request_id: string | null;
  display_no: string | null;
};

type AccIssueLine = {
  issue_id: number | string;
  rik_code: string | null;
  uom: string | null;
  name_human: string | null;
  qty_total: number | string | null;
  qty_in_req: number | string | null;
  qty_over: number | string | null;
};

const WITHOUT_OBJECT = "Без объекта";
const WITHOUT_WORK = "Без вида работ";
const WITHOUT_LEVEL = "Без этажа";
const DASH = "—";
const REPORTS_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;
const DISCIPLINE_ROWS_CACHE_TTL_MS = 2 * 60 * 1000;
const DIRECTOR_REPORTS_CANONICAL_ENABLED =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL ?? "1").trim() !== "0";
const DIRECTOR_REPORTS_CANONICAL_MATERIALS_ENABLED =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_MATERIALS ?? "").trim() !== "0";
const DIRECTOR_REPORTS_CANONICAL_WORKS_ENABLED =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_WORKS ?? "").trim() !== "0";
const DIRECTOR_REPORTS_CANONICAL_SUMMARY_ENABLED =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_SUMMARY ?? "").trim() !== "0";
const DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG ?? "0").trim() === "1";
const DIRECTOR_REPORTS_STRICT_FACT_SOURCES =
  String((globalThis as any)?.process?.env?.EXPO_PUBLIC_DIRECTOR_REPORTS_STRICT_FACT_SOURCES ?? "1").trim() !== "0";
const CANONICAL_FAILED_COOLDOWN_MS = 10 * 60 * 1000;
const DIVERGENCE_LOG_TTL_MS = 10 * 60 * 1000;
type CanonicalRpcStatus = "unknown" | "available" | "missing" | "failed";
type CanonicalRpcKind = "materials" | "works" | "summary";
type CanonicalRpcMeta = { status: CanonicalRpcStatus; updatedAt: number };
const canonicalRpcMeta: Record<CanonicalRpcKind, CanonicalRpcMeta> = {
  materials: { status: "unknown", updatedAt: 0 },
  works: { status: "unknown", updatedAt: 0 },
  summary: { status: "unknown", updatedAt: 0 },
};
const legacyMaterialsSnapshotCache = new Map<string, { ts: number; kpi: { items_total: number; items_without_request: number }; rows_count: number }>();
const legacyWorksSnapshotCache = new Map<string, { ts: number; summary: { total_positions: number; req_positions: number; free_positions: number; issue_cost_total: number; purchase_cost_total: number; unpriced_issue_pct: number }; works_count: number }>();
const divergenceLogSeen = new Map<string, number>();

const isMissingCanonicalRpcError = (error: any, fnName: string): boolean => {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  const details = String(error?.details ?? "").toLowerCase();
  const hint = String(error?.hint ?? "").toLowerCase();
  const code = String(error?.code ?? "").toLowerCase();
  const fn = fnName.toLowerCase();
  const text = `${message} ${details} ${hint}`;
  return (
    text.includes(`function public.${fn}`) ||
    text.includes("could not find the function") ||
    code === "pgrst202"
  );
};

const markCanonicalRpcStatus = (kind: CanonicalRpcKind, status: CanonicalRpcStatus) => {
  canonicalRpcMeta[kind] = { status, updatedAt: Date.now() };
};

const isCanonicalFeatureEnabled = (kind: CanonicalRpcKind): boolean => {
  if (!DIRECTOR_REPORTS_CANONICAL_ENABLED) return false;
  if (kind === "materials") return DIRECTOR_REPORTS_CANONICAL_MATERIALS_ENABLED;
  if (kind === "works") return DIRECTOR_REPORTS_CANONICAL_WORKS_ENABLED;
  if (kind === "summary") return DIRECTOR_REPORTS_CANONICAL_SUMMARY_ENABLED;
  return false;
};

const canUseCanonicalRpc = (kind: CanonicalRpcKind): boolean =>
  (() => {
    if (!isCanonicalFeatureEnabled(kind)) return false;
    const meta = canonicalRpcMeta[kind];
    if (meta.status === "missing") return false;
    if (meta.status === "failed" && Date.now() - meta.updatedAt < CANONICAL_FAILED_COOLDOWN_MS) return false;
    return true;
  })();

const toNum = (v: any): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const nowMs = () => {
  try {
    // RN/web/Node compatibility
    // @ts-ignore
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  } catch {
    return Date.now();
  }
};

const logTiming = (label: string, startedAt: number) => {
  if (!REPORTS_TIMING) return;
  const ms = Math.round(nowMs() - startedAt);
  console.info(`[director_reports] ${label}: ${ms}ms`);
};

const optionObjectName = (v: any): string => {
  const s = String(normalizeRuText(String(v ?? ""))).trim();
  return s || WITHOUT_OBJECT;
};

const buildReportOptionsFromByObjRows = (rows: any[]): DirectorReportOptions => {
  const objectIdByName: Record<string, string | null> = {};
  for (const r of rows || []) {
    const name = optionObjectName(r?.object_name);
    const id = r?.object_id == null ? null : String(r.object_id);
    if (!(name in objectIdByName)) objectIdByName[name] = id;
    if (objectIdByName[name] == null && id) objectIdByName[name] = id;
  }
  const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
  return { objects, objectIdByName };
};

const canonicalObjectName = (v: any): string => {
  let s = String(normalizeRuText(String(v ?? ""))).trim();
  if (!s) return WITHOUT_OBJECT;

  // Canonical object bucket: drop diagnostic tails from free-issue notes.
  // Example: "Адм здание · Контекст: ... · Система: ... · Зона: ..."
  // -> "Адм здание"
  s = s
    .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$/i, "")
    .trim();

  return s || WITHOUT_OBJECT;
};

const normObjectName = (v: any): string => canonicalObjectName(v);

const normWorkName = (v: any): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_WORK;
};

const normLevelName = (v: any): string => {
  const s = String(normalizeRuText(String(v ?? "")))
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
  return s || WITHOUT_LEVEL;
};

const toRangeStart = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T00:00:00.000Z` : x;
};

const toRangeEnd = (d: string): string => {
  const x = String(d || "").trim();
  return x ? `${x}T23:59:59.999Z` : x;
};

const rpcDate = (d: string | null | undefined, fallback: string): string => {
  const x = String(d ?? "").trim();
  return x || fallback;
};

const chunk = <T,>(arr: T[], size = 500): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const forEachChunkParallel = async <T,>(
  arr: T[],
  size: number,
  concurrency: number,
  worker: (part: T[]) => Promise<void>,
) => {
  const parts = chunk(arr, size);
  if (!parts.length) return;
  const c = Math.max(1, Math.min(concurrency, parts.length));
  let idx = 0;
  const runners = Array.from({ length: c }, async () => {
    while (true) {
      const i = idx++;
      if (i >= parts.length) return;
      await worker(parts[i]);
    }
  });
  await Promise.all(runners);
};

const REQUESTS_SELECT_PLANS = [
  "id,object_id,object_name,object_type_code,system_code,level_code,object",
  "id,object_id,object_name,system_code,level_code,object",
  "id,object_id,object_name,object",
  "id,object_id,object_name",
  "id,object_name",
  "id",
] as const;

const REQUESTS_DISCIPLINE_SELECT_PLANS = [
  "id,level_code,system_code",
  "id,level_code",
  "id,system_code",
  "id",
] as const;

let requestsSelectPlanCache: string | null = null;
let requestsDisciplineSelectPlanCache: string | null = null;
const disciplineRowsCache = new Map<string, { ts: number; rows: DirectorFactRow[]; source: DisciplineRowsSource }>();

const buildDisciplineRowsCacheKey = (p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): string => {
  const objectName = p.objectName ?? null;
  const objectId = objectName == null ? null : (p.objectIdByName?.[objectName] ?? null);
  return `${String(p.from || "")}|${String(p.to || "")}|${String(objectName ?? "")}|${String(objectId ?? "")}`;
};

const filterDisciplineRowsByObject = (
  rows: DirectorFactRow[],
  objectName: string | null,
): DirectorFactRow[] => {
  if (objectName == null) return rows;
  const target = canonicalObjectName(objectName);
  return rows.filter((r) => canonicalObjectName((r as any)?.object_name) === target);
};

async function fetchRequestsRowsSafe(ids: string[]): Promise<any[]> {
  if (DIRECTOR_REPORTS_STRICT_FACT_SOURCES) return [];
  const reqIds = Array.from(new Set((ids || []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!reqIds.length) return [];

  const runSelect = async (selectCols: string) =>
    supabase
      .from("requests" as any)
      .select(selectCols)
      .in("id", reqIds as any);

  if (requestsSelectPlanCache) {
    const cached = await runSelect(requestsSelectPlanCache);
    if (!cached.error) return Array.isArray(cached.data) ? cached.data : [];
    requestsSelectPlanCache = null;
  }

  let lastError: any = null;
  for (const selectCols of REQUESTS_SELECT_PLANS) {
    const q = await runSelect(selectCols);
    if (!q.error) {
      requestsSelectPlanCache = selectCols;
      return Array.isArray(q.data) ? q.data : [];
    }
    lastError = q.error;
  }

  if (lastError) throw lastError;
  return [];
}

async function fetchRequestsDisciplineRowsSafe(ids: string[]): Promise<any[]> {
  if (DIRECTOR_REPORTS_STRICT_FACT_SOURCES) return [];
  const reqIds = Array.from(new Set((ids || []).map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!reqIds.length) return [];

  const runSelect = async (selectCols: string) =>
    supabase
      .from("requests" as any)
      .select(selectCols)
      .in("id", reqIds as any);

  if (requestsDisciplineSelectPlanCache) {
    const cached = await runSelect(requestsDisciplineSelectPlanCache);
    if (!cached.error) return Array.isArray(cached.data) ? cached.data : [];
    requestsDisciplineSelectPlanCache = null;
  }

  let lastError: any = null;
  for (const selectCols of REQUESTS_DISCIPLINE_SELECT_PLANS) {
    const q = await runSelect(selectCols);
    if (!q.error) {
      requestsDisciplineSelectPlanCache = selectCols;
      return Array.isArray(q.data) ? q.data : [];
    }
    lastError = q.error;
  }

  if (lastError) throw lastError;
  return [];
}

const firstNonEmpty = (...vals: any[]): string => {
  for (const v of vals) {
    const s = String(normalizeRuText(String(v ?? ""))).trim();
    if (s) return s;
  }
  return "";
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeIdObjectRow = (value: unknown): IdObjectRow | null => {
  const row = asRecord(value);
  const id = row.id == null ? null : String(row.id).trim();
  if (!id) return null;
  return {
    id,
    object_id: row.object_id == null ? null : String(row.object_id).trim(),
    request_id: row.request_id == null ? null : String(row.request_id).trim(),
    object_name: row.object_name == null ? null : String(row.object_name),
    name: row.name == null ? null : String(row.name),
  };
};

const normalizeCodeNameRow = (value: unknown): CodeNameRow | null => {
  const row = asRecord(value);
  const code = row.code == null ? null : String(row.code).trim();
  if (!code) return null;
  return {
    code,
    name_human_ru: row.name_human_ru == null ? null : String(row.name_human_ru),
    display_name: row.display_name == null ? null : String(row.display_name),
    alias_ru: row.alias_ru == null ? null : String(row.alias_ru),
    name_ru: row.name_ru == null ? null : String(row.name_ru),
    name: row.name == null ? null : String(row.name),
  };
};

async function enrichObjectIdsForOptions(
  p: { from: string; to: string },
  base: DirectorReportOptions,
): Promise<DirectorReportOptions> {
  const unresolved = Object.entries(base.objectIdByName)
    .filter(([, id]) => id == null)
    .map(([name]) => name);
  if (!unresolved.length) return base;

  const byName: Record<string, string | null> = { ...base.objectIdByName };
  const fromTs = toRangeStart(rpcDate(p.from, "1970-01-01"));
  const toTs = toRangeEnd(rpcDate(p.to, "2099-12-31"));

  const { data: issues, error: issuesErr } = await supabase
    .from("warehouse_issues" as any)
    .select("object_name,target_object_id,purchase_id,iss_date,status")
    .eq("status", "Подтверждено")
    .gte("iss_date", fromTs)
    .lte("iss_date", toTs)
    .limit(10000);
  if (issuesErr || !Array.isArray(issues)) return base;

  const purchaseIds = Array.from(
    new Set(
      issues
        .map((r: any) => String(r?.purchase_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const purchaseObjectById = new Map<string, string>();
  if (purchaseIds.length) {
    for (const ids of chunk(purchaseIds, 500)) {
      const { data } = await supabase
        .from("purchases" as any)
        .select("id,object_id,object_name")
        .in("id", ids as any);
      for (const r of Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : []) {
        const id = String(r?.id ?? "").trim();
        const objId = String(r?.object_id ?? "").trim();
        if (id && objId) purchaseObjectById.set(id, objId);
      }
    }
  }

  for (const iss of issues) {
    const name = optionObjectName((iss as any)?.object_name);
    if (!(name in byName) || byName[name] != null) continue;

    const targetObjId = String((iss as any)?.target_object_id ?? "").trim();
    if (targetObjId) {
      byName[name] = targetObjId;
      continue;
    }

    const purchaseId = String((iss as any)?.purchase_id ?? "").trim();
    const purchaseObjId = purchaseId ? purchaseObjectById.get(purchaseId) : null;
    if (purchaseObjId) byName[name] = purchaseObjId;
  }

  return {
    objects: base.objects,
    objectIdByName: byName,
  };
}

type NameSourcesProbe = {
  vrr: boolean;
};

let nameSourcesProbeCache: NameSourcesProbe | null = null;
const materialNameResolveCache = new Map<string, string>();
const materialNameResolveMissCache = new Set<string>();
const materialNameResolveInFlight = new Map<string, Promise<Map<string, string>>>();

async function probeNameSources(): Promise<NameSourcesProbe> {
  if (nameSourcesProbeCache) return nameSourcesProbeCache;

  let vrr = false;

  try {
    const r = await supabase
      .from("v_rik_names_ru" as any)
      .select("code,name_ru")
      .limit(1);
    vrr = !r.error;
  } catch { }

  nameSourcesProbeCache = { vrr };
  return nameSourcesProbeCache;
}

const looksLikeMaterialCode = (v: any): boolean => {
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

const looksLikeLevelCode = (v: any): boolean => {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return false;
  if (s === WITHOUT_LEVEL.toUpperCase()) return false;
  if (s.startsWith("LVL-")) return true;
  return /^[A-Z0-9_-]{3,}$/.test(s) && !/\s/.test(s);
};

const normMaterialName = (v: any): string =>
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
    const put = (dst: Map<string, string>, codeRaw: any, nameRaw: any, force = false) => {
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
          const sb: any = supabase;
          const q = await sb
            .from(table)
            .select(selectCols)
            .in(codeField, part);
          if (!q.error && Array.isArray(q.data)) {
            for (const r of q.data as any[]) {
              put(sourceMap, (r as any)?.[codeField], (r as any)?.[nameField]);
            }
          }
        } catch { }
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
    for (const [code, name] of ledgerMap.entries()) resolved.set(code, name);
    for (const [code, name] of rikMap.entries()) resolved.set(code, name);
    for (const [code, name] of overrideMap.entries()) resolved.set(code, name);
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
    if (!resolvedMissing.has(code)) materialNameResolveMissCache.add(code);
  }

  return out;
}

async function enrichFactRowsMaterialNames(rows: DirectorFactRow[]): Promise<DirectorFactRow[]> {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const codesToResolve = Array.from(
    new Set(
      rows
        .filter((r) => {
          const code = String(r?.rik_code ?? "").trim().toUpperCase();
          if (!code) return false;
          const currentName = normMaterialName(r?.material_name_ru ?? "");
          return !currentName || looksLikeMaterialCode(currentName);
        })
        .map((r) => String(r?.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  if (!codesToResolve.length) return rows;
  const byCode = await fetchBestMaterialNamesByCode(codesToResolve);
  if (!byCode.size) return rows;

  return rows.map((r) => {
    const code = String(r?.rik_code ?? "").trim().toUpperCase();
    if (!code) return r;
    const bestName = byCode.get(code);
    if (!bestName) return r;
    const currentName = normMaterialName(r?.material_name_ru ?? "");
    if (currentName && !looksLikeMaterialCode(currentName)) return r;
    return { ...r, material_name_ru: bestName };
  });
}

async function fetchLevelNamesByCode(codesRaw: string[]): Promise<Map<string, string>> {
  const codes = Array.from(
    new Set(
      (codesRaw || [])
        .map((c) => String(c ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  const out = new Map<string, string>();
  if (!codes.length) return out;

  for (const part of chunk(codes, 500)) {
    try {
      const q = await supabase
        .from("ref_levels" as any)
        .select("code,name_human_ru,display_name,name")
        .in("code", part as any);
      if (q.error || !Array.isArray(q.data)) continue;
      for (const r of q.data as any[]) {
        const code = String((r as any)?.code ?? "").trim().toUpperCase();
        const nm = firstNonEmpty((r as any)?.name_human_ru, (r as any)?.display_name, (r as any)?.name);
        if (code && nm) out.set(code, nm);
      }
    } catch { }
  }

  return out;
}

async function enrichFactRowsLevelNames(rows: DirectorFactRow[]): Promise<DirectorFactRow[]> {
  if (!Array.isArray(rows) || !rows.length) return rows;

  const levelCodes = Array.from(
    new Set(
      rows
        .map((r) => String(r?.level_name ?? "").trim())
        .filter((lv) => looksLikeLevelCode(lv))
        .map((lv) => lv.toUpperCase()),
    ),
  );
  if (!levelCodes.length) return rows;

  const byCode = await fetchLevelNamesByCode(levelCodes);
  if (!byCode.size) return rows;

  return rows.map((r) => {
    const raw = String(r?.level_name ?? "").trim();
    if (!raw || !looksLikeLevelCode(raw)) return r;
    const mapped = byCode.get(raw.toUpperCase());
    if (!mapped) return r;
    return { ...r, level_name: mapped };
  });
}

function parseFreeIssueContext(note: string | null | undefined): {
  objectName: string;
  workName: string;
  levelName: string;
} {
  const clean = (v: string): string => {
    const s = String(v ?? "").trim();
    if (!s) return "";
    // Cut diagnostic tails from free issue note to keep canonical object/work labels.
    return s
      .replace(/\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*/i, "")
      .trim();
  };

  const s = String(note ?? "");
  const objRaw = (s.match(/Объект:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const sysRaw =
    (s.match(/Система:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Контекст:\s*([^\n\r]+)/i)?.[1] || "").trim();
  const levelRaw =
    (s.match(/Этаж:\s*([^\n\r]+)/i)?.[1] || "").trim() ||
    (s.match(/Уровень:\s*([^\n\r]+)/i)?.[1] || "").trim();

  const obj = canonicalObjectName(clean(objRaw));
  const sys = clean(sysRaw) || WITHOUT_WORK;
  const level = clean(levelRaw) || WITHOUT_LEVEL;
  return { objectName: obj, workName: sys, levelName: level };
}

async function fetchIssueHeadsViaAccRpc(p: {
  from: string;
  to: string;
}): Promise<AccIssueHead[]> {
  const { data, error } = await supabase.rpc("acc_report_issues_v2" as any, {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
  } as any);
  if (error) throw error;
  return Array.isArray(data) ? (data as AccIssueHead[]) : [];
}

async function fetchIssueLinesViaAccRpc(issueIds: string[]): Promise<AccIssueLine[]> {
  const out: AccIssueLine[] = [];
  const ids = issueIds.filter(id => String(id || "").trim() !== "");
  if (!ids.length) return [];

  // Уменьшаем размер пачки для параллельного исполнения, чтобы не вешать сеть на телефоне
  const groups = chunk(ids, 20);

  for (const g of groups) {
    const settled = await Promise.all(
      g.map(async (id) => {
        try {
          const numId = Number(id);
          if (isNaN(numId)) return [] as AccIssueLine[];

          const { data, error } = await supabase.rpc("acc_report_issue_lines" as any, {
            p_issue_id: numId,
          } as any);
          if (error) {
            console.warn(`[fetchIssueLines] RPC Error for ${id}:`, error.message);
            return [] as AccIssueLine[];
          }
          return Array.isArray(data) ? (data as AccIssueLine[]) : [];
        } catch (e) {
          console.warn(`[fetchIssueLines] catch for ${id}:`, e);
          return [] as AccIssueLine[];
        }
      })
    );
    for (const arr of settled) if (arr) out.push(...arr);
  }
  return out;
}

async function fetchDirectorFactViaAccRpc(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const heads = await fetchIssueHeadsViaAccRpc({ from: p.from, to: p.to });
  if (!heads.length) return [];

  const requestIds = Array.from(
    new Set(
      heads
        .map((h) => String(h.request_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );

  const reqById = new Map<string, any>();
  for (const ids of chunk(requestIds, 100)) {
    try {
      const rows = await fetchRequestsRowsSafe(ids as any);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) reqById.set(id, r);
      }
    } catch {
      continue;
    }
  }

  const objectIds = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_id ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectNameById = new Map<string, string>();
  for (const ids of chunk(objectIds, 100)) {
    const { data, error } = await supabase
      .from("objects" as any)
      .select("id,name")
      .in("id", ids as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : []) {
      const id = String(r?.id ?? "").trim();
      const nm = String(r?.name ?? "").trim();
      if (id && nm) objectNameById.set(id, nm);
    }
  }

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.object_type_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const objectTypeNameByCode = new Map<string, string>();
  for (const codes of chunk(objectTypeCodes, 100)) {
    const { data, error } = await supabase
      .from("ref_object_types" as any)
      .select("code,name_human_ru,display_name,name")
      .in("code", codes as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : []) {
      const c = String(r?.code ?? "").trim();
      const nm = firstNonEmpty(r?.name_human_ru, r?.display_name, r?.name);
      if (c && nm) objectTypeNameByCode.set(c, nm);
    }
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(reqById.values())
        .map((r) => String(r?.system_code ?? "").trim())
        .filter(id => id !== ""),
    ),
  );
  const systemNameByCode = new Map<string, string>();
  for (const codes of chunk(systemCodes, 100)) {
    const { data, error } = await supabase
      .from("ref_systems" as any)
      .select("code,name_human_ru,display_name,alias_ru,name")
      .in("code", codes as any);
    if (error) continue;
    for (const r of Array.isArray(data) ? data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : []) {
      const c = String(r?.code ?? "").trim();
      const nm = firstNonEmpty(r?.name_human_ru, r?.display_name, r?.alias_ru, r?.name);
      if (c && nm) systemNameByCode.set(c, nm);
    }
  }

  const headCtxByIssueId = new Map<
    string,
    {
      issueId: string;
      issDate: string;
      objectName: string;
      workName: string;
      levelName: string;
      isWithoutRequest: boolean;
    }
  >();
  for (const h of heads) {
    const issueId = String(h?.issue_id ?? "").trim();
    if (!issueId) continue;
    const reqId = String(h?.request_id ?? "").trim();

    let objectName = WITHOUT_OBJECT;
    let workName = WITHOUT_WORK;
    let levelName = WITHOUT_LEVEL;
    let isWithoutRequest = true;

    if (reqId) {
      const r = reqById.get(reqId);
      objectName = firstNonEmpty(
        objectNameById.get(String(r?.object_id ?? "").trim()),
        r?.object_name,
        objectTypeNameByCode.get(String(r?.object_type_code ?? "").trim()),
      ) || WITHOUT_OBJECT;
      workName = firstNonEmpty(
        systemNameByCode.get(String(r?.system_code ?? "").trim()),
        r?.system_code,
      ) || WITHOUT_WORK;
      levelName = normLevelName(r?.level_code);
      isWithoutRequest = false;
    } else {
      const parsed = parseFreeIssueContext(h?.note ?? null);
      objectName = parsed.objectName || WITHOUT_OBJECT;
      workName = parsed.workName || WITHOUT_WORK;
      levelName = parsed.levelName || WITHOUT_LEVEL;
      isWithoutRequest = true;
    }

    if (p.objectName != null && objectName !== p.objectName) continue;

    headCtxByIssueId.set(issueId, {
      issueId,
      issDate: String(h?.event_dt ?? ""),
      objectName,
      workName,
      levelName,
      isWithoutRequest,
    });
  }

  if (!headCtxByIssueId.size) return [];

  const issueIds = Array.from(headCtxByIssueId.keys());
  const lines = await fetchIssueLinesViaAccRpc(issueIds);
  if (!lines.length) return [];

  const out: DirectorFactRow[] = [];
  for (const ln of lines) {
    const issueId = String(ln?.issue_id ?? "").trim();
    const ctx = headCtxByIssueId.get(issueId);
    if (!ctx) continue;
    const code = String(ln?.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;
    out.push({
      issue_id: issueId,
      iss_date: ctx.issDate,
      object_name: ctx.objectName,
      work_name: ctx.workName,
      level_name: ctx.levelName,
      rik_code: code,
      material_name_ru: firstNonEmpty(ln?.name_human, code),
      uom: String(ln?.uom ?? "").trim(),
      qty: toNum(ln?.qty_total),
      is_without_request: ctx.isWithoutRequest,
    });
  }

  return out;
}

async function fetchAllFactRowsFromView(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const pageSize = 1000;
  const out: DirectorFactRow[] = [];
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("v_director_issued_fact_rows" as any)
      .select("issue_id,iss_date,object_name,work_name,rik_code,material_name_ru,uom,qty,is_without_request")
    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? (data as unknown as DirectorFactRow[]) : [];
    out.push(...rows);
    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  return out;
}

async function fetchViaLegacyRpc(p: {
  from: string;
  to: string;
  objectId: string | null;
  objectName: string | null;
}): Promise<DirectorReportPayload> {
  const [summaryRes, materialsRes, byObjRes] = await Promise.all([
    supabase.rpc("wh_report_issued_summary_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
    supabase.rpc("wh_report_issued_materials_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
    supabase.rpc("wh_report_issued_by_object_fast" as any, {
      p_from: p.from,
      p_to: p.to,
      p_object_id: p.objectId,
    } as any),
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (materialsRes.error) throw materialsRes.error;
  if (byObjRes.error) throw byObjRes.error;

  const summary = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
  const matRows = Array.isArray(materialsRes.data) ? (materialsRes.data as any[]) : [];
  const objRows = Array.isArray(byObjRes.data) ? (byObjRes.data as any[]) : [];

  const rows: DirectorReportRow[] = matRows
    .map((r: any) => ({
      rik_code: String(r?.material_code ?? "").trim().toUpperCase(),
      name_human_ru: String(r?.material_name ?? "").trim() || String(r?.material_code ?? "").trim(),
      uom: String(r?.uom ?? ""),
      qty_total: toNum(r?.sum_total),
      docs_cnt: Math.round(toNum(r?.docs_cnt)),
      qty_without_request: toNum(r?.sum_free),
      docs_without_request: Math.round(toNum(r?.docs_free)),
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const disciplineAgg = new Map<string, number>();
  for (const r of objRows) {
    const who = normWorkName(r?.work_name);
    disciplineAgg.set(who, (disciplineAgg.get(who) || 0) + Math.round(toNum(r?.lines_cnt)));
  }
  const discipline_who: DirectorReportWho[] = Array.from(disciplineAgg.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);
  const reportOptions = buildReportOptionsFromByObjRows(objRows);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: Math.round(toNum(summary?.docs_total)),
      issues_without_object: objRows
        .filter((r: any) => normObjectName(r?.object_name) === WITHOUT_OBJECT)
        .reduce((acc: number, r: any) => acc + Math.round(toNum(r?.docs_cnt)), 0),
      items_total: matRows.reduce((acc: number, r: any) => acc + Math.round(toNum(r?.lines_cnt)), 0),
      items_without_request: matRows.reduce((acc: number, r: any) => acc + Math.round(toNum(r?.lines_free)), 0),
    },
    rows,
    discipline_who,
    report_options: reportOptions,
  };
}

async function fetchAllFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const tTotal = nowMs();
  const issuesById = new Map<string, any>();
  const pageSize = 2500;
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("warehouse_issues" as any)
      .select("id,iss_date,object_name,work_name,request_id,status,note,target_object_id")
      .eq("status", "Подтверждено");

    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      if (!id) continue;
      issuesById.set(id, r);
    }

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }
  logTiming("discipline.rows.tables.issues_scan", tTotal);

  if (!issuesById.size) return [];

  const issueIds = Array.from(issuesById.keys()).filter(id => id !== "");
  if (!issueIds.length) return [];

  const issueItems: any[] = [];
  const tIssueItems = nowMs();
  await forEachChunkParallel(issueIds, 500, 6, async (ids) => {
    const { data, error } = await supabase
      .from("warehouse_issue_items" as any)
      .select("issue_id,rik_code,uom_id,qty,request_item_id")
      .in("issue_id", ids as any);
    if (error) throw error;
    if (Array.isArray(data)) issueItems.push(...data);
  });
  logTiming("discipline.rows.tables.issue_items", tIssueItems);

  if (!issueItems.length) return [];

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .map((x) => String(x?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );

  const requestIdByRequestItem = new Map<string, string>();
  if (!DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    const tReqItems = nowMs();
    await forEachChunkParallel(requestItemIds, 500, 6, async (ids) => {
      const { data, error } = await supabase
        .from("request_items" as any)
        .select("id,request_id")
        .in("id", ids as any);
      if (error) throw error;

      const rows = Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : [];
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        const reqId = String(r?.request_id ?? "").trim();
        if (id && reqId) requestIdByRequestItem.set(id, reqId);
      }
    });
    logTiming("discipline.rows.tables.request_items", tReqItems);
  }

  const requestIds = Array.from(
    new Set(
      [
        ...issueItems.map((it) => {
          const rid = String(it?.request_item_id ?? "").trim();
          return rid ? requestIdByRequestItem.get(rid) ?? "" : "";
        }),
        ...Array.from(issuesById.values()).map((iss) => String(iss?.request_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, any>();
  if (!DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsRowsSafe(ids as any);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) requestById.set(id, r);
      }
    });
    logTiming("discipline.rows.tables.requests", tReq);
  }

  const objectIds = Array.from(
    new Set(
      [
        ...Array.from(issuesById.values()).map((iss) => String(iss?.target_object_id ?? "").trim()),
        ...Array.from(requestById.values()).map((req) => String(req?.object_id ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const objectNameById = new Map<string, string>();
  const tObjects = nowMs();
  await forEachChunkParallel(objectIds, 500, 4, async (ids) => {
    const { data, error } = await supabase
      .from("objects" as any)
      .select("id,name")
      .in("id", ids as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      const name = String(r?.name ?? "").trim();
      if (id && name) objectNameById.set(id, name);
    }
  });
  logTiming("discipline.rows.tables.objects", tObjects);

  const objectTypeCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.object_type_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const objectTypeNameByCode = new Map<string, string>();
  const tObjTypes = nowMs();
  await forEachChunkParallel(objectTypeCodes, 500, 4, async (codes) => {
    const { data, error } = await supabase
      .from("ref_object_types" as any)
      .select("code,name_human_ru,display_name,name")
      .in("code", codes as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : [];
    for (const r of rows) {
      const code = String(r?.code ?? "").trim();
      const name =
        String(r?.name_human_ru ?? "").trim() ||
        String(r?.display_name ?? "").trim() ||
        String(r?.name ?? "").trim();
      if (code && name) objectTypeNameByCode.set(code, name);
    }
  });
  logTiming("discipline.rows.tables.object_types", tObjTypes);

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.system_code ?? "").trim())
        .filter(Boolean),
    ),
  );

  const systemNameByCode = new Map<string, string>();
  const tSystems = nowMs();
  await forEachChunkParallel(systemCodes, 500, 4, async (codes) => {
    const { data, error } = await supabase
      .from("ref_systems" as any)
      .select("code,name_human_ru,display_name,alias_ru,name")
      .in("code", codes as any);
    if (error) throw error;
    const rows = Array.isArray(data) ? data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : [];
    for (const r of rows) {
      const code = String(r?.code ?? "").trim();
      const name =
        String(r?.name_human_ru ?? "").trim() ||
        String(r?.display_name ?? "").trim() ||
        String(r?.alias_ru ?? "").trim() ||
        String(r?.name ?? "").trim();
      if (code && name) systemNameByCode.set(code, name);
    }
  });
  logTiming("discipline.rows.tables.systems", tSystems);

  const codes = Array.from(
    new Set(
      issueItems
        .map((it) => String(it?.rik_code ?? "").trim().toUpperCase())
        .filter(code => code !== ""),
    ),
  );

  const nameRuByCode = new Map<string, string>();
  if (codes.length) {
    const probe = await probeNameSources();
    const canUseVrr = probe.vrr;

    const tNames = nowMs();
    if (canUseVrr) {
      try {
        await forEachChunkParallel(codes, 500, 6, async (part) => {
          const vrrRes = await supabase
            .from("v_rik_names_ru" as any)
            .select("code,name_ru")
            .in("code", part as any);
          if (vrrRes.error) throw vrrRes.error;
          for (const r of Array.isArray(vrrRes.data) ? vrrRes.data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : []) {
            const c = String(r?.code ?? "").trim().toUpperCase();
            const n = String(r?.name_ru ?? "").trim();
            if (c && n && !nameRuByCode.has(c)) nameRuByCode.set(c, n);
          }
        });
      } catch (e: any) {
        console.warn("[director_reports] disable v_rik_names_ru:", e?.message ?? e);
      }
    }
    logTiming("discipline.rows.tables.name_resolve", tNames);
  }

  const out: DirectorFactRow[] = [];
  for (const it of issueItems) {
    const issueId = String(it?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(it?.request_item_id ?? "").trim();
    const issueReqId = String(issue?.request_id ?? "").trim();
    const reqId =
      (reqItemId ? requestIdByRequestItem.get(reqItemId) : null) ??
      (issueReqId || null);
    const req = reqId ? requestById.get(reqId) : null;

    const issueObjectById = objectNameById.get(String(issue?.target_object_id ?? "").trim()) || "";
    const reqObjectById = objectNameById.get(String(req?.object_id ?? "").trim()) || "";
    const reqObjectByName = String(req?.object_name ?? "").trim();
    const issueObjectByName = String(issue?.object_name ?? "").trim();
    const reqObjectTypeCode = String(req?.object_type_code ?? "").trim();
    const reqObjectTypeName =
      (reqObjectTypeCode && objectTypeNameByCode.get(reqObjectTypeCode)) || reqObjectTypeCode;

    const objectName = req
      ? reqObjectById || reqObjectByName || reqObjectTypeName || issueObjectById || issueObjectByName || WITHOUT_OBJECT
      : issueObjectById || issueObjectByName || reqObjectById || reqObjectByName || reqObjectTypeName || WITHOUT_OBJECT;

    if (p.objectName != null && objectName !== p.objectName) continue;

    const reqSystemCode = String(req?.system_code ?? "").trim();
    const reqSystemName = (reqSystemCode && systemNameByCode.get(reqSystemCode)) || reqSystemCode;
    const workName =
      String(issue?.work_name ?? "").trim() ||
      reqSystemName ||
      WITHOUT_WORK;
    const freeCtx = parseFreeIssueContext(issue?.note ?? null);
    const levelName = req ? normLevelName(req?.level_code) : normLevelName(freeCtx.levelName);

    const code = String(it?.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;

    out.push({
      issue_id: issueId,
      iss_date: String(issue?.iss_date ?? ""),
      object_name: objectName,
      work_name: workName,
      level_name: levelName,
      request_item_id: reqItemId || null,
      rik_code: code,
      material_name_ru: nameRuByCode.get(code) || code,
      uom: String(it?.uom_id ?? "").trim(),
      qty: toNum(it?.qty),
      is_without_request: !reqItemId,
    });
  }

  logTiming("discipline.rows.tables.total", tTotal);
  return out;
}

async function fetchDisciplineFactRowsFromTables(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorFactRow[]> {
  const tTotal = nowMs();
  const tryJoinedIssueItemsPath = async (): Promise<DirectorFactRow[] | null> => {
    const tJoined = nowMs();
    try {
      const out: DirectorFactRow[] = [];
      const pageSize = 3000;
      let fromIdx = 0;
      let totalIssueItems = 0;
      while (true) {
        let q = supabase
          .from("warehouse_issue_items" as any)
          .select("id,issue_id,rik_code,uom_id,qty,request_item_id,warehouse_issues!inner(id,iss_date,object_name,work_name,status,note)")
          .eq("warehouse_issues.status", "Подтверждено");
        if (p.from) q = q.gte("warehouse_issues.iss_date", toRangeStart(p.from));
        if (p.to) q = q.lte("warehouse_issues.iss_date", toRangeEnd(p.to));
        if (p.objectName != null) q = q.eq("warehouse_issues.object_name", p.objectName);
        q = q.order("issue_id", { ascending: false }).range(fromIdx, fromIdx + pageSize - 1);

        const { data, error } = await q;
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) break;
        totalIssueItems += rows.length;
        const seenIssueItemIds = new Set<string>();

        for (const it of rows) {
          const issueItemId = String((it as any)?.id ?? "").trim();
          if (issueItemId) {
            if (seenIssueItemIds.has(issueItemId)) continue;
            seenIssueItemIds.add(issueItemId);
          }
          const issue: any = Array.isArray((it as any)?.warehouse_issues)
            ? ((it as any).warehouse_issues[0] ?? null)
            : ((it as any)?.warehouse_issues ?? null);
          if (!issue) continue;
          const issueId = String((it as any)?.issue_id ?? issue?.id ?? "").trim();
          const code = String((it as any)?.rik_code ?? "").trim().toUpperCase();
          if (!issueId || !code) continue;

          const issueWorkName = String(issue?.work_name ?? "").trim();
          const freeCtx = parseFreeIssueContext(issue?.note ?? null);
          const workName = issueWorkName || freeCtx.workName || WITHOUT_WORK;
          const levelName = issueWorkName ? WITHOUT_LEVEL : normLevelName(freeCtx.levelName);
          const objectName = String(issue?.object_name ?? "").trim() || WITHOUT_OBJECT;

          out.push({
            issue_id: issueId,
            iss_date: String(issue?.iss_date ?? ""),
            object_name: objectName,
            work_name: workName,
            level_name: levelName,
            request_item_id: String((it as any)?.request_item_id ?? "").trim() || null,
            rik_code: code,
            material_name_ru: code,
            uom: String((it as any)?.uom_id ?? "").trim(),
            qty: toNum((it as any)?.qty),
            is_without_request: !String((it as any)?.request_item_id ?? "").trim(),
          });
        }

        if (rows.length < pageSize) break;
        fromIdx += pageSize;
        if (fromIdx > 500000) break;
      }

      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.rows.light.counts(joined): issue_items=${totalIssueItems} final_rows=${out.length}`);
      }
      logTiming("discipline.rows.light.joined.total", tJoined);
      return out;
    } catch (e: any) {
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.rows.light.joined.failed: ${e?.message ?? e}`);
      }
      return null;
    }
  };

  const joinedRows = await tryJoinedIssueItemsPath();
  if (joinedRows && joinedRows.length) {
    logTiming("discipline.rows.light.total", tTotal);
    return joinedRows;
  }

  const issuesById = new Map<string, any>();
  const pageSize = 2500;
  let fromIdx = 0;

  while (true) {
    let q = supabase
      .from("warehouse_issues" as any)
      .select("id,iss_date,object_name,work_name,request_id,status,note")
      .eq("status", "Подтверждено");

    if (p.from) q = q.gte("iss_date", toRangeStart(p.from));
    if (p.to) q = q.lte("iss_date", toRangeEnd(p.to));
    if (p.objectName != null) q = q.eq("object_name", p.objectName);

    q = q.order("iss_date", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);

    const { data, error } = await q;
    if (error) throw error;

    const rows = Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : [];
    for (const r of rows) {
      const id = String(r?.id ?? "").trim();
      if (!id) continue;
      issuesById.set(id, r);
    }

    if (rows.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }
  logTiming("discipline.rows.light.issues_scan", tTotal);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: issues=${issuesById.size}`);

  if (!issuesById.size) return [];
  const issueIds = Array.from(issuesById.keys());
  if (!issueIds.length) return [];

  const issueItems: any[] = [];
  const tIssueItems = nowMs();
  await forEachChunkParallel(issueIds, 500, 6, async (ids) => {
    const { data, error } = await supabase
      .from("warehouse_issue_items" as any)
      .select("id,issue_id,rik_code,uom_id,qty,request_item_id")
      .in("issue_id", ids as any);
    if (error) throw error;
    if (Array.isArray(data)) issueItems.push(...data);
  });
  logTiming("discipline.rows.light.issue_items", tIssueItems);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: issue_items=${issueItems.length}`);
  if (!issueItems.length) return [];

  const issuesMissingWork = new Set<string>();
  for (const [id, issue] of issuesById.entries()) {
    const w = String(issue?.work_name ?? "").trim();
    if (!w) issuesMissingWork.add(id);
  }

  const requestItemIds = Array.from(
    new Set(
      issueItems
        .filter((x) => {
          const issueId = String((x as any)?.issue_id ?? "").trim();
          const issue = issuesById.get(issueId);
          if (!issue) return false;
          const issueReqId = String(issue?.request_id ?? "").trim();
          return !issueReqId && issuesMissingWork.has(issueId);
        })
        .map((x) => String(x?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const requestIdByRequestItem = new Map<string, string>();
  if (requestItemIds.length && !DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    const tReqItems = nowMs();
    await forEachChunkParallel(requestItemIds, 500, 6, async (ids) => {
      const { data, error } = await supabase
        .from("request_items" as any)
        .select("id,request_id")
        .in("id", ids as any);
      if (error) throw error;
      const rows = Array.isArray(data) ? data.map(normalizeIdObjectRow).filter((row): row is IdObjectRow => !!row) : [];
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        const reqId = String(r?.request_id ?? "").trim();
        if (id && reqId) requestIdByRequestItem.set(id, reqId);
      }
    });
    logTiming("discipline.rows.light.request_items", tReqItems);
    if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: request_items=${requestItemIds.length}`);
  }

  const requestIds = Array.from(
    new Set(
      [
        ...Array.from(issuesById.entries())
          .filter(([issueId]) => issuesMissingWork.has(issueId))
          .map(([, iss]) => String(iss?.request_id ?? "").trim()),
        ...Array.from(requestIdByRequestItem.values())
          .map((rid) => String(rid ?? "").trim()),
      ].filter(Boolean),
    ),
  );

  const requestById = new Map<string, any>();
  if (requestIds.length && !DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    const tReq = nowMs();
    await forEachChunkParallel(requestIds, 500, 4, async (ids) => {
      const rows = await fetchRequestsDisciplineRowsSafe(ids as any);
      for (const r of rows) {
        const id = String(r?.id ?? "").trim();
        if (id) requestById.set(id, r);
      }
    });
    logTiming("discipline.rows.light.requests", tReq);
    if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: requests=${requestIds.length}`);
  }

  const systemCodes = Array.from(
    new Set(
      Array.from(requestById.values())
        .map((req) => String(req?.system_code ?? "").trim())
        .filter(Boolean),
    ),
  );
  const systemNameByCode = new Map<string, string>();
  if (systemCodes.length) {
    const tSystems = nowMs();
    await forEachChunkParallel(systemCodes, 500, 4, async (codes) => {
      const { data, error } = await supabase
        .from("ref_systems" as any)
        .select("code,name_human_ru,display_name,alias_ru,name")
        .in("code", codes as any);
      if (error) throw error;
      const rows = Array.isArray(data) ? data.map(normalizeCodeNameRow).filter((row): row is CodeNameRow => !!row) : [];
      for (const r of rows) {
        const code = String(r?.code ?? "").trim();
        const name =
          String(r?.name_human_ru ?? "").trim() ||
          String(r?.display_name ?? "").trim() ||
          String(r?.alias_ru ?? "").trim() ||
          String(r?.name ?? "").trim();
        if (code && name) systemNameByCode.set(code, name);
      }
    });
    logTiming("discipline.rows.light.systems", tSystems);
  }

  const out: DirectorFactRow[] = [];
  const seenIssueItemIds = new Set<string>();
  const tBuild = nowMs();
  for (const it of issueItems) {
    const issueItemId = String((it as any)?.id ?? "").trim();
    if (issueItemId) {
      if (seenIssueItemIds.has(issueItemId)) continue;
      seenIssueItemIds.add(issueItemId);
    }
    const issueId = String(it?.issue_id ?? "").trim();
    const issue = issuesById.get(issueId);
    if (!issue) continue;

    const reqItemId = String(it?.request_item_id ?? "").trim();
    const issueReqId = String(issue?.request_id ?? "").trim();
    const issueWorkName = String(issue?.work_name ?? "").trim();
    const reqId =
      issueWorkName
        ? (issueReqId || null)
        : ((reqItemId ? requestIdByRequestItem.get(reqItemId) : null) ?? (issueReqId || null));
    const req = reqId ? requestById.get(reqId) : null;

    const objectName = String(issue?.object_name ?? "").trim() || WITHOUT_OBJECT;
    if (p.objectName != null && objectName !== p.objectName) continue;

    const reqSystemCode = String(req?.system_code ?? "").trim();
    const reqSystemName = (reqSystemCode && systemNameByCode.get(reqSystemCode)) || reqSystemCode;
    const workName =
      issueWorkName ||
      reqSystemName ||
      WITHOUT_WORK;
    const freeCtx = parseFreeIssueContext(issue?.note ?? null);
    const levelName = req ? normLevelName(req?.level_code) : normLevelName(freeCtx.levelName);

    const code = String(it?.rik_code ?? "").trim().toUpperCase();
    if (!code) continue;

    out.push({
      issue_id: issueId,
      iss_date: String(issue?.iss_date ?? ""),
      object_name: objectName,
      work_name: workName,
      level_name: levelName,
      request_item_id: reqItemId || null,
      rik_code: code,
      material_name_ru: code,
      uom: String(it?.uom_id ?? "").trim(),
      qty: toNum(it?.qty),
      is_without_request: !reqItemId,
    });
  }
  logTiming("discipline.rows.light.build", tBuild);
  if (REPORTS_TIMING) console.info(`[director_reports] discipline.rows.light.counts: final_rows=${out.length}`);
  logTiming("discipline.rows.light.total", tTotal);
  return out;
}

export async function fetchDirectorWarehouseReportOptions(p: {
  from: string;
  to: string;
}): Promise<DirectorReportOptions> {
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");

  // Production-first path: use optimized RPC immediately, keep old heavy paths as fallback.
  {
    const t0 = nowMs();
    try {
      const { data, error } = await supabase.rpc("wh_report_issued_by_object_fast" as any, {
        p_from: pFrom,
        p_to: pTo,
        p_object_id: null,
      } as any);
      if (!error) {
        const rpcRows = Array.isArray(data) ? data : [];
        const base = buildReportOptionsFromByObjRows(rpcRows);
        const enriched = await enrichObjectIdsForOptions({ from: pFrom, to: pTo }, base);
        logTiming("options.fast_rpc", t0);
        return enriched;
      }
    } catch { }
    logTiming("options.fast_rpc_failed_fallback", t0);
  }

  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName: null });
  } catch { }
  if (!rows.length) {
    try {
      rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName: null });
    } catch { }
  }

  if (!rows.length) {
    return { objects: [], objectIdByName: {} };
  }

  const objectIdByName: Record<string, string | null> = {};
  for (const r of rows) {
    const name = normObjectName(r?.object_name);
    if (!(name in objectIdByName)) objectIdByName[name] = null;
  }
  const objects = Object.keys(objectIdByName).sort((a, b) => a.localeCompare(b, "ru"));
  return { objects, objectIdByName };
}

function buildPayloadFromFactRows(p: {
  from: string;
  to: string;
  objectName: string | null;
  rows: DirectorFactRow[];
}): DirectorReportPayload {
  const issueIds = new Set<string>();
  const issueIdsWithoutObject = new Set<string>();
  let itemsTotal = 0;
  let itemsWithoutRequest = 0;

  const byMaterial = new Map<
    string,
    {
      rik_code: string;
      name_human_ru: string;
      uom: string;
      qty_total: number;
      qty_without_request: number;
      docs_ids: Set<string>;
      docs_without_request_ids: Set<string>;
    }
  >();

  const byWork = new Map<string, number>();

  for (const r of p.rows) {
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;

    const objectName = normObjectName(r?.object_name);
    const workName = normWorkName(r?.work_name);
    const code = String(r?.rik_code ?? "").trim().toUpperCase();
    const qty = toNum(r?.qty);
    const uom = String(r?.uom ?? "").trim();
    const nameRu = String(r?.material_name_ru ?? "").trim();
    const isWithoutRequest = !!r?.is_without_request;

    issueIds.add(issueId);
    if (objectName === WITHOUT_OBJECT) issueIdsWithoutObject.add(issueId);

    itemsTotal += 1;
    if (isWithoutRequest) itemsWithoutRequest += 1;
    byWork.set(workName, (byWork.get(workName) || 0) + 1);

    const key = `${code}::${uom}`;
    const prev =
      byMaterial.get(key) ??
      {
        rik_code: code,
        name_human_ru: nameRu || code || DASH,
        uom,
        qty_total: 0,
        qty_without_request: 0,
        docs_ids: new Set<string>(),
        docs_without_request_ids: new Set<string>(),
      };

    prev.qty_total += qty;
    prev.docs_ids.add(issueId);
    if (isWithoutRequest) {
      prev.qty_without_request += qty;
      prev.docs_without_request_ids.add(issueId);
    }
    byMaterial.set(key, prev);
  }

  const materialRows: DirectorReportRow[] = Array.from(byMaterial.values())
    .map((x) => ({
      rik_code: x.rik_code,
      name_human_ru: x.name_human_ru,
      uom: x.uom,
      qty_total: x.qty_total,
      docs_cnt: x.docs_ids.size,
      qty_without_request: x.qty_without_request,
      docs_without_request: x.docs_without_request_ids.size,
    }))
    .sort((a, b) => b.qty_total - a.qty_total);

  const discipline_who: DirectorReportWho[] = Array.from(byWork.entries())
    .map(([who, items_cnt]) => ({ who, items_cnt }))
    .sort((a, b) => b.items_cnt - a.items_cnt);

  return {
    meta: { from: p.from, to: p.to, object_name: p.objectName },
    kpi: {
      issues_total: issueIds.size,
      issues_without_object: issueIdsWithoutObject.size,
      items_total: itemsTotal,
      items_without_request: itemsWithoutRequest,
    },
    rows: materialRows,
    discipline_who,
    report_options: {
      objects: Array.from(
        new Set(
          p.rows.map((r) => normObjectName(r?.object_name)).filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "ru")),
      objectIdByName: Object.fromEntries(
        Array.from(
          new Set(
            p.rows.map((r) => normObjectName(r?.object_name)).filter(Boolean),
          ),
        ).map((name) => [name, null]),
      ),
    },
  };
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 10000) / 100;
}

async function fetchIssuePriceMapByCode(opts?: {
  skipPurchaseItems?: boolean;
  codes?: string[];
}): Promise<Map<string, number>> {
  const weighted = new Map<string, { sum: number; w: number }>();
  const scopedCodes = Array.from(
    new Set((opts?.codes ?? []).map((x) => String(x ?? "").trim().toUpperCase()).filter(Boolean)),
  );
  const hasScopedCodes = scopedCodes.length > 0;

  const push = (codeRaw: any, priceRaw: any, qtyRaw: any) => {
    const code = String(codeRaw ?? "").trim().toUpperCase();
    const price = toNum(priceRaw);
    if (!code || !(price > 0)) return;
    const qty = Math.max(1, toNum(qtyRaw));
    const prev = weighted.get(code) ?? { sum: 0, w: 0 };
    prev.sum += price * qty;
    prev.w += qty;
    weighted.set(code, prev);
  };

  if (!opts?.skipPurchaseItems) {
    try {
      if (hasScopedCodes) {
        for (const part of chunk(scopedCodes, 500)) {
          const q = await supabase
            .from("purchase_items" as any)
            .select("rik_code,code,price,qty")
            .in("rik_code", part as any)
            .limit(50000);
          if (!q.error && Array.isArray(q.data)) {
            for (const r of q.data) {
              push((r as any)?.rik_code ?? (r as any)?.code, (r as any)?.price, (r as any)?.qty);
            }
          }
        }
      } else {
        const q = await supabase
          .from("purchase_items" as any)
          .select("rik_code,code,price,qty")
          .limit(50000);
        if (!q.error && Array.isArray(q.data)) {
          for (const r of q.data) {
            push((r as any)?.rik_code ?? (r as any)?.code, (r as any)?.price, (r as any)?.qty);
          }
        }
      }
    } catch { }
  }

  if (!weighted.size && !DIRECTOR_REPORTS_STRICT_FACT_SOURCES) {
    try {
      if (hasScopedCodes) {
        for (const part of chunk(scopedCodes, 500)) {
          const q2 = await supabase
            .from("proposal_items" as any)
            .select("rik_code,price,qty")
            .in("rik_code", part as any)
            .limit(50000);
          if (!q2.error && Array.isArray(q2.data)) {
            for (const r of q2.data) {
              push((r as any)?.rik_code, (r as any)?.price, (r as any)?.qty);
            }
          }
        }
      } else {
        const q2 = await supabase
          .from("proposal_items" as any)
          .select("rik_code,price,qty")
          .limit(50000);
        if (!q2.error && Array.isArray(q2.data)) {
          for (const r of q2.data) push((r as any)?.rik_code, (r as any)?.price, (r as any)?.qty);
        }
      }
    } catch { }
  }

  const out = new Map<string, number>();
  for (const [code, a] of weighted.entries()) {
    out.set(code, a.w > 0 ? a.sum / a.w : 0);
  }
  return out;
}

const unwrapRpcPayload = (data: any): any => {
  if (Array.isArray(data)) {
    if (!data.length) return null;
    const first = data[0];
    if (first && typeof first === "object" && "payload" in first) return (first as any).payload ?? null;
    return first ?? null;
  }
  return data ?? null;
};

const canonicalKey = (mode: "materials" | "works", from: string, to: string, objectName: string | null) =>
  `${mode}|${from}|${to}|${String(objectName ?? "")}`;

const maybeLogDivergence = (key: string, details: Record<string, any>) => {
  if (!DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG) return;
  const seenAt = divergenceLogSeen.get(key) ?? 0;
  if (Date.now() - seenAt < DIVERGENCE_LOG_TTL_MS) return;
  divergenceLogSeen.set(key, Date.now());
  console.warn("[director_reports] canonical_divergence", { key, ...details });
};

const adaptCanonicalMaterialsPayload = (payloadRaw: any): DirectorReportPayload | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? payloadRaw : null;
  if (!p) return null;
  const rows = Array.isArray((p as any).rows) ? (p as any).rows : [];
  const kpi = (p as any).kpi && typeof (p as any).kpi === "object" ? (p as any).kpi : {};
  const report_options =
    (p as any).report_options && typeof (p as any).report_options === "object"
      ? (p as any).report_options
      : { objects: [], objectIdByName: {} };
  return {
    ...p,
    rows,
    kpi: {
      issues_total: toNum((kpi as any).issues_total),
      issues_without_object: toNum((kpi as any).issues_without_object),
      items_total: toNum((kpi as any).items_total),
      items_without_request: toNum((kpi as any).items_without_request),
    },
    report_options: {
      objects: Array.isArray((report_options as any).objects) ? (report_options as any).objects : [],
      objectIdByName:
        (report_options as any).objectIdByName && typeof (report_options as any).objectIdByName === "object"
          ? (report_options as any).objectIdByName
          : {},
    },
  } as DirectorReportPayload;
};

const adaptCanonicalWorksPayload = (payloadRaw: any): DirectorDisciplinePayload | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? payloadRaw : null;
  if (!p) return null;
  const summary = (p as any).summary && typeof (p as any).summary === "object" ? (p as any).summary : null;
  const works = Array.isArray((p as any).works) ? (p as any).works : null;
  if (!summary || !works) return null;
  return p as DirectorDisciplinePayload;
};

const adaptCanonicalSummaryPayload = (payloadRaw: any): {
  issue_cost_total: number;
  purchase_cost_total: number;
  unevaluated_ratio: number;
  base_ready: boolean;
} | null => {
  const p = payloadRaw && typeof payloadRaw === "object" ? payloadRaw : null;
  if (!p) return null;
  return {
    issue_cost_total: toNum((p as any).issue_cost_total),
    purchase_cost_total: toNum((p as any).purchase_cost_total),
    unevaluated_ratio: toNum((p as any).unevaluated_ratio),
    base_ready: !!(p as any).base_ready,
  };
};

const materialSnapshotFromPayload = (payload: DirectorReportPayload | null | undefined) => {
  const kpi: any = (payload as any)?.kpi ?? {};
  const rowsCount = Array.isArray((payload as any)?.rows) ? (payload as any).rows.length : 0;
  return {
    kpi: {
      items_total: toNum(kpi?.items_total),
      items_without_request: toNum(kpi?.items_without_request),
    },
    rows_count: rowsCount,
  };
};

const worksSnapshotFromPayload = (payload: DirectorDisciplinePayload | null | undefined) => {
  const s: any = (payload as any)?.summary ?? {};
  const works = Array.isArray((payload as any)?.works) ? (payload as any).works : [];
  const reqPositions = works.reduce((acc: number, w: any) => acc + toNum(w?.req_positions), 0);
  const freePositions = works.reduce((acc: number, w: any) => acc + toNum(w?.free_positions), 0);
  return {
    summary: {
      total_positions: toNum(s?.total_positions),
      req_positions: reqPositions,
      free_positions: freePositions,
      issue_cost_total: toNum(s?.issue_cost_total),
      purchase_cost_total: toNum(s?.purchase_cost_total),
      unpriced_issue_pct: toNum(s?.unpriced_issue_pct),
    },
    works_count: works.length,
  };
};

async function fetchDirectorReportCanonicalMaterials(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<DirectorReportPayload | null> {
  const { data, error } = await supabase.rpc("director_report_fetch_materials_v1" as any, {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
  } as any);
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  const adapted = adaptCanonicalMaterialsPayload(payload);
  if (!adapted || !Array.isArray(adapted.rows) || !adapted.rows.length) return adapted;

  const codesToResolve = Array.from(
    new Set(
      adapted.rows
        .filter((r) => {
          const code = String((r as any)?.rik_code ?? "").trim().toUpperCase();
          if (!code) return false;
          const nm = String((r as any)?.name_human_ru ?? "").trim();
          return !nm || looksLikeMaterialCode(nm);
        })
        .map((r) => String((r as any)?.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );
  if (!codesToResolve.length) return adapted;

  try {
    const nameByCode = await fetchBestMaterialNamesByCode(codesToResolve);
    if (!nameByCode.size) return adapted;
    return {
      ...adapted,
      rows: adapted.rows.map((r) => {
        const code = String((r as any)?.rik_code ?? "").trim().toUpperCase();
        const best = nameByCode.get(code);
        if (!best) return r;
        const curr = String((r as any)?.name_human_ru ?? "").trim();
        if (curr && !looksLikeMaterialCode(curr)) return r;
        return { ...r, name_human_ru: best } as any;
      }),
    } as DirectorReportPayload;
  } catch {
    return adapted;
  }
}

async function fetchDirectorReportCanonicalWorks(p: {
  from: string;
  to: string;
  objectName: string | null;
  includeCosts: boolean;
}): Promise<DirectorDisciplinePayload | null> {
  const { data, error } = await supabase.rpc("director_report_fetch_works_v1" as any, {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
    p_include_costs: !!p.includeCosts,
  } as any);
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalWorksPayload(payload);
}

async function fetchDirectorReportCanonicalSummary(p: {
  from: string;
  to: string;
  objectName: string | null;
}): Promise<{
  issue_cost_total: number;
  purchase_cost_total: number;
  unevaluated_ratio: number;
  base_ready: boolean;
} | null> {
  const { data, error } = await supabase.rpc("director_report_fetch_summary_v1" as any, {
    p_from: p.from || "1970-01-01",
    p_to: p.to || "2099-12-31",
    p_object_name: p.objectName ?? null,
  } as any);
  if (error) throw error;
  const payload = unwrapRpcPayload(data);
  return adaptCanonicalSummaryPayload(payload);
}

async function fetchPriceByRequestItemId(requestItemIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = Array.from(new Set((requestItemIds || []).map((x) => String(x || "").trim()).filter(Boolean)));
  if (!ids.length) return out;

  for (const part of chunk(ids, 500)) {
    try {
      const q = await supabase
        .from("purchase_items" as any)
        .select("request_item_id,price,qty")
        .in("request_item_id", part as any);
      if (q.error || !Array.isArray(q.data)) continue;

      const agg = new Map<string, { sum: number; w: number }>();
      for (const r of q.data) {
        const id = String((r as any)?.request_item_id ?? "").trim();
        const price = toNum((r as any)?.price);
        if (!id || !(price > 0)) continue;
        const w = Math.max(1, toNum((r as any)?.qty));
        const prev = agg.get(id) ?? { sum: 0, w: 0 };
        prev.sum += price * w;
        prev.w += w;
        agg.set(id, prev);
      }
      for (const [id, v] of agg.entries()) {
        if (v.w > 0) out.set(id, v.sum / v.w);
      }
    } catch { }
  }

  return out;
}

async function fetchPurchaseCostInPeriodScoped(args: {
  from: string;
  to: string;
  objectName: string | null;
  codePrice: Map<string, number>;
}): Promise<number> {
  const { from, to, objectName, codePrice } = args;

  const incomingRows: Array<{ purchase_item_id: string; code: string; qty: number }> = [];
  const pageSize = 2000;
  let fromIdx = 0;
  while (true) {
    let q = supabase
      .from("wh_ledger" as any)
      .select("purchase_item_id,code,qty,moved_at,direction")
      .eq("direction", "in")
      .order("moved_at", { ascending: false })
      .range(fromIdx, fromIdx + pageSize - 1);
    if (from) q = q.gte("moved_at", toRangeStart(from));
    if (to) q = q.lte("moved_at", toRangeEnd(to));

    const { data, error } = await q;
    if (error || !Array.isArray(data) || !data.length) break;
    for (const r of data) {
      const pid = String((r as any)?.purchase_item_id ?? "").trim();
      if (!pid) continue;
      incomingRows.push({
        purchase_item_id: pid,
        code: String((r as any)?.code ?? "").trim().toUpperCase(),
        qty: toNum((r as any)?.qty),
      });
    }
    if (data.length < pageSize) break;
    fromIdx += pageSize;
    if (fromIdx > 500000) break;
  }

  if (!incomingRows.length) return 0;

  const purchaseItemIds = Array.from(new Set(incomingRows.map((x) => x.purchase_item_id)));
  const piById = new Map<string, { purchase_id: string | null; code: string; price: number }>();
  for (const part of chunk(purchaseItemIds, 500)) {
    try {
      const q = await supabase
        .from("purchase_items" as any)
          .select("id,purchase_id,rik_code,code,price")
        .in("id", part as any);
      if (q.error || !Array.isArray(q.data)) continue;
      for (const r of q.data) {
        const id = String((r as any)?.id ?? "").trim();
        if (!id) continue;
        const code = String((r as any)?.rik_code ?? (r as any)?.code ?? "").trim().toUpperCase();
        const price = toNum((r as any)?.price);
        const purchase_id = String((r as any)?.purchase_id ?? "").trim() || null;
        piById.set(id, { purchase_id, code, price });
      }
    } catch { }
  }

  let allowedPurchaseIds: Set<string> | null = null;
  if (objectName != null) {
    const purchaseIds = Array.from(
      new Set(
        Array.from(piById.values())
          .map((x) => String(x.purchase_id ?? "").trim())
          .filter(Boolean),
      ),
    );
    const targetObject = canonicalObjectName(objectName);
    const matched = new Set<string>();
    for (const part of chunk(purchaseIds, 500)) {
      try {
        const q = await supabase
          .from("purchases" as any)
          .select("id,object_name")
          .in("id", part as any);
        if (q.error || !Array.isArray(q.data)) continue;
        for (const r of q.data) {
          const id = String((r as any)?.id ?? "").trim();
          const onm = canonicalObjectName((r as any)?.object_name);
          if (id && onm === targetObject) matched.add(id);
        }
      } catch { }
    }
    allowedPurchaseIds = matched;
  }

  let total = 0;
  for (const r of incomingRows) {
    const pi = piById.get(r.purchase_item_id);
    if (!pi) continue;

    if (allowedPurchaseIds != null) {
      const pid = String(pi.purchase_id ?? "").trim();
      if (!pid || !allowedPurchaseIds.has(pid)) continue;
    }

    const code = pi.code || r.code;
    const price = pi.price > 0 ? pi.price : toNum(codePrice.get(code) ?? 0);
    if (!(price > 0) || !(r.qty > 0)) continue;
    total += r.qty * price;
  }

  return total;
}

function buildDisciplinePayloadFromFactRows(
  rows: DirectorFactRow[],
  cost?: {
    issue_cost_total?: number;
    purchase_cost_total?: number;
    issue_to_purchase_pct?: number;
    unpriced_issue_pct?: number;
    price_by_code?: Map<string, number>;
    price_by_request_item?: Map<string, number>;
  },
): DirectorDisciplinePayload {
  const docsAll = new Set<string>();
  let totalQty = 0;
  let totalPositions = 0;
  let qtyWithoutWork = 0;
  let qtyWithoutLevel = 0;
  let positionsWithoutReq = 0;

  const byWork = new Map<
    string,
    {
      work_type_name: string;
      total_qty: number;
      docs: Set<string>;
      total_positions: number;
      req_positions: number;
      free_positions: number;
      levels: Map<
        string,
        {
          level_name: string;
          total_qty: number;
          docs: Set<string>;
          total_positions: number;
          req_positions: number;
          free_positions: number;
          materials: Map<
            string,
            {
              material_name: string;
              rik_code: string;
              uom: string;
              qty_sum: number;
              amount_sum: number;
              docs: Set<string>;
            }
          >;
        }
      >;
    }
  >();

  for (const r of rows) {
    const issueId = String(r?.issue_id ?? "").trim();
    if (!issueId) continue;
    const workName = normWorkName(r?.work_name);
    const levelName = normLevelName(r?.level_name);
    const code = String(r?.rik_code ?? "").trim().toUpperCase() || DASH;
    const uom = String(r?.uom ?? "").trim();
    const materialName = String(r?.material_name_ru ?? "").trim() || code;
    const qty = toNum(r?.qty);
    const reqItemId = String(r?.request_item_id ?? "").trim();
    const price = reqItemId
      ? toNum(cost?.price_by_request_item?.get(reqItemId) ?? cost?.price_by_code?.get(code) ?? 0)
      : toNum(cost?.price_by_code?.get(code) ?? 0);
    const amount = price > 0 ? qty * price : 0;
    const isWithoutReq = !!r?.is_without_request;

    docsAll.add(issueId);
    totalQty += qty;
    totalPositions += 1;
    if (workName === WITHOUT_WORK) qtyWithoutWork += qty;
    if (levelName === WITHOUT_LEVEL) qtyWithoutLevel += qty;
    if (isWithoutReq) positionsWithoutReq += 1;

    const workEntry =
      byWork.get(workName) ??
      {
        work_type_name: workName,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        levels: new Map(),
      };
    workEntry.total_qty += qty;
    workEntry.docs.add(issueId);
    workEntry.total_positions += 1;
    if (isWithoutReq) workEntry.free_positions += 1;
    else workEntry.req_positions += 1;

    const levelEntry =
      workEntry.levels.get(levelName) ??
      {
        level_name: levelName,
        total_qty: 0,
        docs: new Set<string>(),
        total_positions: 0,
        req_positions: 0,
        free_positions: 0,
        materials: new Map(),
      };
    levelEntry.total_qty += qty;
    levelEntry.docs.add(issueId);
    levelEntry.total_positions += 1;
    if (isWithoutReq) levelEntry.free_positions += 1;
    else levelEntry.req_positions += 1;

    const mKey = `${code}::${uom}`;
    const mEntry =
      levelEntry.materials.get(mKey) ??
      {
        material_name: materialName,
        rik_code: code,
        uom,
        qty_sum: 0,
        amount_sum: 0,
        docs: new Set<string>(),
      };
    mEntry.qty_sum += qty;
    mEntry.amount_sum += amount;
    mEntry.docs.add(issueId);
    levelEntry.materials.set(mKey, mEntry);

    workEntry.levels.set(levelName, levelEntry);
    byWork.set(workName, workEntry);
  }

  const works: DirectorDisciplineWork[] = Array.from(byWork.values())
    .map((w) => {
      const levels: DirectorDisciplineLevel[] = Array.from(w.levels.values())
        .map((lv) => {
          const materials: DirectorDisciplineMaterial[] = Array.from(lv.materials.values())
            .map((m) => ({
              material_name: m.material_name,
              rik_code: m.rik_code,
              uom: m.uom,
              qty_sum: m.qty_sum,
              docs_count: m.docs.size,
              unit_price: m.qty_sum > 0 ? m.amount_sum / m.qty_sum : 0,
              amount_sum: m.amount_sum,
            }))
            .sort((a, b) => (b.amount_sum ?? 0) - (a.amount_sum ?? 0) || b.qty_sum - a.qty_sum);
          return {
            id: `${w.work_type_name}::${lv.level_name}`,
            level_name: lv.level_name,
            total_qty: lv.total_qty,
            total_docs: lv.docs.size,
            total_positions: lv.total_positions,
            share_in_work_pct: pct(lv.total_qty, w.total_qty),
            req_positions: lv.req_positions,
            free_positions: lv.free_positions,
            materials,
          };
        })
        .sort((a, b) => b.total_qty - a.total_qty);
      return {
        id: w.work_type_name,
        work_type_name: w.work_type_name,
        total_qty: w.total_qty,
        total_docs: w.docs.size,
        total_positions: w.total_positions,
        share_total_pct: pct(w.total_qty, totalQty),
        req_positions: w.req_positions,
        free_positions: w.free_positions,
        levels,
      };
    })
    .sort((a, b) => b.total_qty - a.total_qty);

  return {
    summary: {
      total_qty: totalQty,
      total_docs: docsAll.size,
      total_positions: totalPositions,
      pct_without_work: pct(qtyWithoutWork, totalQty),
      pct_without_level: pct(qtyWithoutLevel, totalQty),
      pct_without_request: pct(positionsWithoutReq, totalPositions),
      issue_cost_total: Number(cost?.issue_cost_total ?? 0),
      purchase_cost_total: Number(cost?.purchase_cost_total ?? 0),
      issue_to_purchase_pct: Number(cost?.issue_to_purchase_pct ?? 0),
      unpriced_issue_pct: Number(cost?.unpriced_issue_pct ?? 0),
    },
    works,
  };
}

type DisciplineRowsSource = "tables" | "acc_rpc" | "view" | "none";

async function fetchFactRowsForDiscipline(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<{ rows: DirectorFactRow[]; source: DisciplineRowsSource }> {
  const objectName = p.objectName ?? null;
  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchDirectorFactViaAccRpc({ from: p.from, to: p.to, objectName });
    if (rows.length) return { rows, source: "acc_rpc" };
  } catch { }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: p.from, to: p.to, objectName });
      if (rows.length) return { rows, source: "view" };
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchDisciplineFactRowsFromTables({ from: p.from, to: p.to, objectName });
      if (rows.length) return { rows, source: "tables" };
    } catch { }
  }
  return { rows: [], source: "none" };
}

export async function fetchDirectorWarehouseReport(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): Promise<DirectorReportPayload> {
  const objectName = p.objectName ?? null;
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const selectedObjectId = objectName == null ? null : (p.objectIdByName[objectName] ?? null);
  const cKey = canonicalKey("materials", pFrom, pTo, objectName);

  if (canUseCanonicalRpc("materials")) {
    const tCanonical = nowMs();
    try {
      const canonical = await fetchDirectorReportCanonicalMaterials({
        from: pFrom,
        to: pTo,
        objectName,
      });
      if (canonical) {
        markCanonicalRpcStatus("materials", "available");
        const legacySnap = legacyMaterialsSnapshotCache.get(cKey);
        if (legacySnap && Date.now() - legacySnap.ts <= DIVERGENCE_LOG_TTL_MS) {
          const canSnap = materialSnapshotFromPayload(canonical);
          const mismatch =
            canSnap.rows_count !== legacySnap.rows_count ||
            canSnap.kpi.items_total !== legacySnap.kpi.items_total ||
            canSnap.kpi.items_without_request !== legacySnap.kpi.items_without_request;
          if (mismatch) {
            maybeLogDivergence(cKey, {
              mode: "materials",
              canonical: canSnap,
              legacy: legacySnap,
            });
          }
        }
        logTiming("report.canonical_materials", tCanonical);
        return canonical;
      }
    } catch (e: any) {
      if (isMissingCanonicalRpcError(e, "director_report_fetch_materials_v1")) {
        markCanonicalRpcStatus("materials", "missing");
      } else {
        markCanonicalRpcStatus("materials", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] report.canonical_materials.failed: ${e?.message ?? e}`);
      }
    }
    logTiming("report.canonical_materials_fallback", tCanonical);
  }

  // Production-first path: try optimized RPC first.
  // For object filter we need a real object_id; if absent, preserve old behavior and use detailed paths.
  if (objectName == null || selectedObjectId != null) {
    const t0 = nowMs();
    try {
      const fast = await fetchViaLegacyRpc({
        from: pFrom,
        to: pTo,
        objectId: selectedObjectId,
        objectName,
      });
      legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(fast) });
      logTiming("report.fast_rpc", t0);
      return fast;
    } catch {
      logTiming("report.fast_rpc_failed_fallback", t0);
    }
  }

  let rows: DirectorFactRow[] = [];
  try {
    rows = await fetchDirectorFactViaAccRpc({ from: pFrom, to: pTo, objectName });
  } catch { }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromView({ from: pFrom, to: pTo, objectName });
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchDisciplineFactRowsFromTables({ from: pFrom, to: pTo, objectName });
    } catch { }
  }
  if (!rows.length) {
    try {
      rows = await fetchAllFactRowsFromTables({ from: pFrom, to: pTo, objectName });
    } catch { }
  }

  if (rows.length) {
    try {
      rows = await enrichFactRowsMaterialNames(rows);
    } catch { }
    try {
      rows = await enrichFactRowsLevelNames(rows);
    } catch { }
    const payload = buildPayloadFromFactRows({
      from: pFrom,
      to: pTo,
      objectName,
      rows,
    });
    payload.discipline = buildDisciplinePayloadFromFactRows(rows);
    legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(payload) });
    return payload;
  }

  const fallback = await fetchViaLegacyRpc({
    from: pFrom,
    to: pTo,
    objectId: selectedObjectId,
    objectName,
  });
  legacyMaterialsSnapshotCache.set(cKey, { ts: Date.now(), ...materialSnapshotFromPayload(fallback) });
  return fallback;
}

export async function fetchDirectorWarehouseReportDiscipline(p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}, opts?: { skipPrices?: boolean }): Promise<DirectorDisciplinePayload> {
  const tTotal = nowMs();
  const pFrom = rpcDate(p.from, "1970-01-01");
  const pTo = rpcDate(p.to, "2099-12-31");
  const cKey = canonicalKey("works", pFrom, pTo, p.objectName ?? null);

  if (canUseCanonicalRpc("works")) {
    const tCanonical = nowMs();
    try {
      let canonical = await fetchDirectorReportCanonicalWorks({
        from: pFrom,
        to: pTo,
        objectName: p.objectName ?? null,
        includeCosts: !opts?.skipPrices,
      });
      if (canonical) {
        if (REPORTS_TIMING) {
          const worksCount = Array.isArray((canonical as any)?.works) ? (canonical as any).works.length : 0;
          const hasDetailLevels =
            worksCount > 0 &&
            (canonical as any).works.some((w: any) => Array.isArray(w?.levels) && w.levels.length > 0);
          if (!hasDetailLevels) {
            console.info("[director_reports] discipline.canonical_works.accepted_without_levels");
          }
        }
        if (!opts?.skipPrices && canUseCanonicalRpc("summary")) {
          try {
            const sm = await fetchDirectorReportCanonicalSummary({
              from: pFrom,
              to: pTo,
              objectName: p.objectName ?? null,
            });
            if (sm?.base_ready) {
              canonical = {
                ...canonical,
                summary: {
                  ...canonical.summary,
                  issue_cost_total: sm.issue_cost_total,
                  purchase_cost_total: sm.purchase_cost_total,
                  unpriced_issue_pct: toNum(sm.unevaluated_ratio) * 100,
                },
              };
              markCanonicalRpcStatus("summary", "available");
            }
          } catch (e: any) {
            if (isMissingCanonicalRpcError(e, "director_report_fetch_summary_v1")) {
              markCanonicalRpcStatus("summary", "missing");
            } else {
              markCanonicalRpcStatus("summary", "failed");
            }
          }
        }
        markCanonicalRpcStatus("works", "available");
        const legacySnap = legacyWorksSnapshotCache.get(cKey);
        if (legacySnap && Date.now() - legacySnap.ts <= DIVERGENCE_LOG_TTL_MS) {
          const canSnap = worksSnapshotFromPayload(canonical);
          const mismatch =
            canSnap.summary.total_positions !== legacySnap.summary.total_positions ||
            canSnap.summary.req_positions !== legacySnap.summary.req_positions ||
            canSnap.summary.free_positions !== legacySnap.summary.free_positions ||
            canSnap.summary.issue_cost_total !== legacySnap.summary.issue_cost_total ||
            canSnap.summary.purchase_cost_total !== legacySnap.summary.purchase_cost_total ||
            canSnap.works_count !== legacySnap.works_count;
          if (mismatch) {
            maybeLogDivergence(cKey, {
              mode: "works",
              canonical: canSnap,
              legacy: legacySnap,
            });
          }
        }
        logTiming("discipline.canonical_works", tCanonical);
        return canonical;
      }
    } catch (e: any) {
      if (isMissingCanonicalRpcError(e, "director_report_fetch_works_v1")) {
        markCanonicalRpcStatus("works", "missing");
      } else {
        markCanonicalRpcStatus("works", "failed");
      }
      if (REPORTS_TIMING) {
        console.info(`[director_reports] discipline.canonical_works.failed: ${e?.message ?? e}`);
      }
    }
    logTiming("discipline.canonical_works_fallback", tCanonical);
  }

  const rowsKey = buildDisciplineRowsCacheKey({
    from: pFrom,
    to: pTo,
    objectName: p.objectName ?? null,
    objectIdByName: p.objectIdByName ?? {},
  });
  let rowsResult: { rows: DirectorFactRow[]; source: DisciplineRowsSource } | null = null;
  const cachedRows = disciplineRowsCache.get(rowsKey);
  if (cachedRows && Date.now() - cachedRows.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
    rowsResult = { rows: cachedRows.rows, source: cachedRows.source };
  } else if (cachedRows) {
    disciplineRowsCache.delete(rowsKey);
  }
  if (!rowsResult && p.objectName != null) {
    const baseRowsKey = buildDisciplineRowsCacheKey({
      from: pFrom,
      to: pTo,
      objectName: null,
      objectIdByName: p.objectIdByName ?? {},
    });
    const baseCachedRows = disciplineRowsCache.get(baseRowsKey);
    if (baseCachedRows && Date.now() - baseCachedRows.ts <= DISCIPLINE_ROWS_CACHE_TTL_MS) {
      const slicedRows = filterDisciplineRowsByObject(baseCachedRows.rows, p.objectName);
      rowsResult = { rows: slicedRows, source: baseCachedRows.source };
      disciplineRowsCache.set(rowsKey, { ts: Date.now(), rows: slicedRows, source: baseCachedRows.source });
      if (REPORTS_TIMING) {
        console.info(
          `[director_reports] discipline.rows.cache_slice: object=${String(p.objectName)} rows=${slicedRows.length}`,
        );
      }
    }
  }
  const tRows = nowMs();
  if (!rowsResult) {
    rowsResult = await fetchFactRowsForDiscipline({
      from: pFrom,
      to: pTo,
      objectName: p.objectName ?? null,
      objectIdByName: p.objectIdByName ?? {},
    });
    disciplineRowsCache.set(rowsKey, { ts: Date.now(), rows: rowsResult.rows, source: rowsResult.source });
  }
  let rows = rowsResult.rows;
  logTiming("discipline.fetch_rows", tRows);
  if (REPORTS_TIMING) {
    console.info(`[director_reports] discipline.rows_source: ${rowsResult.source} rows=${rows.length}`);
  }
  try {
    // Table path already resolves names by code during row materialization.
    // Skip expensive cross-source enrichment here to keep works first paint fast.
    if (rowsResult.source !== "tables") {
      const tNames = nowMs();
      rows = await enrichFactRowsMaterialNames(rows);
      logTiming("discipline.enrich_material_names", tNames);
    } else if (REPORTS_TIMING) {
      console.info("[director_reports] discipline.enrich_material_names: skipped_for_tables_source");
    }
  } catch { }
  try {
    if (!opts?.skipPrices) {
      const tLevels = nowMs();
      rows = await enrichFactRowsLevelNames(rows);
      logTiming("discipline.enrich_level_names", tLevels);
    } else if (REPORTS_TIMING) {
      console.info("[director_reports] discipline.enrich_level_names: skipped_in_first_stage");
    }
  } catch { }

  if (opts?.skipPrices) {
    const payload = buildDisciplinePayloadFromFactRows(rows, {
      issue_cost_total: 0,
      purchase_cost_total: 0,
      issue_to_purchase_pct: 0,
      unpriced_issue_pct: 0,
      price_by_code: new Map(),
      price_by_request_item: new Map(),
    });
    legacyWorksSnapshotCache.set(cKey, { ts: Date.now(), ...worksSnapshotFromPayload(payload) });
    logTiming("discipline.total", tTotal);
    return payload;
  }

  const requestItemIds = Array.from(
    new Set(
      rows
        .map((r) => String(r?.request_item_id ?? "").trim())
        .filter(Boolean),
    ),
  );
  const rowCodes = Array.from(
    new Set(
      rows
        .map((r) => String(r?.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  );

  const tPrices = nowMs();
  const [priceByCode, priceByRequestItem] = await Promise.all([
    // Works mode should not depend on purchase/ledger sources for first paint.
    // Use proposal-based prices only here to avoid invalid material-only requests.
    fetchIssuePriceMapByCode({ skipPurchaseItems: true, codes: rowCodes }),
    fetchPriceByRequestItemId(requestItemIds),
  ]);
  logTiming("discipline.fetch_prices", tPrices);

  const tCost = nowMs();
  let issueCostTotal = 0;
  let issuePositions = 0;
  let unpricedIssuePositions = 0;
  for (const r of rows) {
    const code = String(r?.rik_code ?? "").trim().toUpperCase();
    const qty = toNum(r?.qty);
    if (!code || qty <= 0) continue;
    issuePositions += 1;
    const reqItemId = String(r?.request_item_id ?? "").trim();
    const price = reqItemId
      ? toNum(priceByRequestItem.get(reqItemId) ?? priceByCode.get(code) ?? 0)
      : toNum(priceByCode.get(code) ?? 0);
    if (price > 0) issueCostTotal += qty * price;
    else unpricedIssuePositions += 1;
  }
  logTiming("discipline.compute_cost", tCost);

  // Keep purchase-cost branch out of works first-load path.
  // In installations where purchase/ledger views are unavailable this avoids 400s
  // without changing core discipline metrics (positions/req/free breakdown).
  const purchaseCostTotal = 0;

  const issueToPurchasePct = pct(issueCostTotal, purchaseCostTotal);
  const unpricedIssuePct = pct(unpricedIssuePositions, issuePositions);

  const payload = buildDisciplinePayloadFromFactRows(rows, {
    issue_cost_total: issueCostTotal,
    purchase_cost_total: purchaseCostTotal,
    issue_to_purchase_pct: issueToPurchasePct,
    unpriced_issue_pct: unpricedIssuePct,
    price_by_code: priceByCode,
    price_by_request_item: priceByRequestItem,
  });
  legacyWorksSnapshotCache.set(cKey, { ts: Date.now(), ...worksSnapshotFromPayload(payload) });
  logTiming("discipline.total", tTotal);
  return payload;
}


