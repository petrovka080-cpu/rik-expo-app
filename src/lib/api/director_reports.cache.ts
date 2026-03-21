import type { DirectorFactRow, DisciplineRowsSource, RequestLookupRow } from "./director_reports.shared";
import { asRecord, matchesDirectorObjectIdentity, resolveDirectorObjectIdentity } from "./director_reports.shared";

const REPORTS_TIMING = typeof __DEV__ !== "undefined" ? __DEV__ : false;
const DISCIPLINE_ROWS_CACHE_TTL_MS = 2 * 60 * 1000;
const DIRECTOR_REPORTS_LOOKUP_TTL_MS = 5 * 60 * 1000;
type RuntimeProcessEnv = { process?: { env?: Record<string, unknown> } };
const readRuntimeEnvFlag = (key: string, fallback: string): string =>
  String(((globalThis as unknown as RuntimeProcessEnv).process?.env ?? {})[key] ?? fallback).trim();
const DIRECTOR_REPORTS_CANONICAL_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL", "1") !== "0";
const DIRECTOR_REPORTS_CANONICAL_MATERIALS_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_MATERIALS", "") !== "0";
const DIRECTOR_REPORTS_CANONICAL_WORKS_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_WORKS", "") !== "0";
const DIRECTOR_REPORTS_CANONICAL_SUMMARY_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_SUMMARY", "") !== "0";
const DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG", "0") === "1";
const DIRECTOR_REPORTS_STRICT_FACT_SOURCES =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_STRICT_FACT_SOURCES", "0") !== "0";
const DIRECTOR_REPORTS_SOURCE_RPC_ENABLED =
  readRuntimeEnvFlag("EXPO_PUBLIC_DIRECTOR_REPORTS_DISCIPLINE_SOURCE_RPC", "1") !== "0";
const CANONICAL_FAILED_COOLDOWN_MS = 10 * 60 * 1000;
const DIVERGENCE_LOG_TTL_MS = 10 * 60 * 1000;
type CanonicalRpcStatus = "unknown" | "available" | "missing" | "failed";
type CanonicalRpcKind = "materials" | "works" | "summary";
type DisciplineSourceRpcStatus = "unknown" | "available" | "missing" | "failed";
type OptionsRpcStatus = "unknown" | "available" | "missing" | "failed";
type CanonicalRpcMeta = { status: CanonicalRpcStatus; updatedAt: number };
const canonicalRpcMeta: Record<CanonicalRpcKind, CanonicalRpcMeta> = {
  materials: { status: "unknown", updatedAt: 0 },
  works: { status: "unknown", updatedAt: 0 },
  summary: { status: "unknown", updatedAt: 0 },
};
const disciplineSourceRpcMeta: { status: DisciplineSourceRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const optionsRpcMeta: { status: OptionsRpcStatus; updatedAt: number } = {
  status: "unknown",
  updatedAt: 0,
};
const legacyMaterialsSnapshotCache = new Map<string, { ts: number; kpi: { items_total: number; items_without_request: number }; rows_count: number }>();
const legacyWorksSnapshotCache = new Map<string, { ts: number; summary: { total_positions: number; req_positions: number; free_positions: number; issue_cost_total: number; purchase_cost_total: number; unpriced_issue_pct: number }; works_count: number }>();
const divergenceLogSeen = new Map<string, number>();

const isMissingCanonicalRpcError = (error: unknown, fnName: string): boolean => {
  const errorRecord = asRecord(error);
  const message = String(errorRecord.message ?? error ?? "").toLowerCase();
  const details = String(errorRecord.details ?? "").toLowerCase();
  const hint = String(errorRecord.hint ?? "").toLowerCase();
  const code = String(errorRecord.code ?? "").toLowerCase();
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

const markDisciplineSourceRpcStatus = (status: DisciplineSourceRpcStatus) => {
  disciplineSourceRpcMeta.status = status;
  disciplineSourceRpcMeta.updatedAt = Date.now();
};

const markOptionsRpcStatus = (status: OptionsRpcStatus) => {
  optionsRpcMeta.status = status;
  optionsRpcMeta.updatedAt = Date.now();
};

const canUseDisciplineSourceRpc = (): boolean => {
  if (!DIRECTOR_REPORTS_SOURCE_RPC_ENABLED) return false;
  if (disciplineSourceRpcMeta.status === "missing") return false;
  if (
    disciplineSourceRpcMeta.status === "failed" &&
    Date.now() - disciplineSourceRpcMeta.updatedAt < CANONICAL_FAILED_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
};

const canUseOptionsRpc = (): boolean => {
  if (optionsRpcMeta.status === "missing") return false;
  if (optionsRpcMeta.status === "failed" && Date.now() - optionsRpcMeta.updatedAt < CANONICAL_FAILED_COOLDOWN_MS) {
    return false;
  }
  return true;
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

const REQUESTS_SELECT_PLANS = [
  "id,object_id,object_name,object_type_code,system_code,level_code,zone_code,object",
  "id,object_id,object_name,system_code,level_code,zone_code,object",
  "id,object_id,object_name,object",
  "id,object_id,object_name",
  "id,object_name",
  "id",
] as const;

const REQUESTS_DISCIPLINE_SELECT_PLANS = [
  "id,level_code,system_code,zone_code",
  "id,level_code",
  "id,system_code",
  "id",
] as const;

const disciplineRowsCache = new Map<string, {
  ts: number;
  rows: DirectorFactRow[];
  source: DisciplineRowsSource;
  chain?: DisciplineRowsSource[];
}>();
const disciplineSourceRowsRpcCache = new Map<string, { ts: number; rows: DirectorFactRow[] }>();
const requestLookupCache = new Map<string, { ts: number; value: RequestLookupRow | null }>();
const requestLookupInFlight = new Map<string, Promise<RequestLookupRow[]>>();
const objectLookupCache = new Map<string, { ts: number; value: string | null }>();
const objectLookupInFlight = new Map<string, Promise<Map<string, string>>>();
const objectTypeLookupCache = new Map<string, { ts: number; value: string | null }>();
const objectTypeLookupInFlight = new Map<string, Promise<Map<string, string>>>();
const systemLookupCache = new Map<string, { ts: number; value: string | null }>();
const systemLookupInFlight = new Map<string, Promise<Map<string, string>>>();
const levelLookupCache = new Map<string, { ts: number; value: string | null }>();
const levelLookupInFlight = new Map<string, Promise<Map<string, string>>>();
const rikNameLookupCache = new Map<string, { ts: number; value: string | null }>();
const rikNameLookupInFlight = new Map<string, Promise<Map<string, string>>>();

const buildDisciplineRowsCacheKey = (p: {
  from: string;
  to: string;
  objectName: string | null;
  objectIdByName: Record<string, string | null>;
}): string => {
  const identity =
    p.objectName == null
      ? null
      : resolveDirectorObjectIdentity({ object_name_display: p.objectName });
  const objectKey = identity?.object_name_canonical ?? null;
  const objectId = objectKey == null ? null : (p.objectIdByName?.[objectKey] ?? null);
  return `${String(p.from || "")}|${String(p.to || "")}|${String(objectKey ?? "")}|${String(objectId ?? "")}`;
};

const buildDisciplineSourceRowsRpcCacheKey = (p: { from: string; to: string }): string =>
  `${String(p.from || "")}|${String(p.to || "")}`;

const filterDisciplineRowsByObject = (
  rows: DirectorFactRow[],
  objectName: string | null,
): DirectorFactRow[] => {
  return rows.filter((r) => matchesDirectorObjectIdentity(objectName, r));
};

const getFreshLookupValue = <T,>(
  cache: Map<string, { ts: number; value: T | null }>,
  key: string,
): T | null | undefined => {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > DIRECTOR_REPORTS_LOOKUP_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
};

const MAX_LOOKUP_CACHE_SIZE = 2000;
const trimMap = <K, V>(map: Map<K, V>, max = MAX_LOOKUP_CACHE_SIZE) => {
  if (map.size <= max) return;
  const excess = map.size - max;
  const iter = map.keys();
  for (let i = 0; i < excess; i++) {
    const k = iter.next().value;
    if (k !== undefined) map.delete(k);
  }
};

const setLookupValue = <T,>(
  cache: Map<string, { ts: number; value: T | null }>,
  key: string,
  value: T | null,
) => {
  cache.set(key, { ts: Date.now(), value });
  trimMap(cache);
};

const canonicalKey = (mode: "materials" | "works", from: string, to: string, objectName: string | null) =>
  `${mode}|${from}|${to}|${String(objectName ?? "")}`;

const maybeLogDivergence = (key: string, details: Record<string, unknown>) => {
  if (!DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG) return;
  const seenAt = divergenceLogSeen.get(key) ?? 0;
  if (Date.now() - seenAt < DIVERGENCE_LOG_TTL_MS) return;
  divergenceLogSeen.set(key, Date.now());
  trimMap(divergenceLogSeen);
  console.warn("[director_reports] canonical_divergence", { key, ...details });
};

export {
  REPORTS_TIMING,
  DISCIPLINE_ROWS_CACHE_TTL_MS,
  DIRECTOR_REPORTS_STRICT_FACT_SOURCES,
  DIVERGENCE_LOG_TTL_MS,
  legacyMaterialsSnapshotCache,
  legacyWorksSnapshotCache,
  isMissingCanonicalRpcError,
  markCanonicalRpcStatus,
  canUseCanonicalRpc,
  markDisciplineSourceRpcStatus,
  markOptionsRpcStatus,
  canUseDisciplineSourceRpc,
  canUseOptionsRpc,
  nowMs,
  logTiming,
  REQUESTS_SELECT_PLANS,
  REQUESTS_DISCIPLINE_SELECT_PLANS,
  disciplineRowsCache,
  disciplineSourceRowsRpcCache,
  requestLookupCache,
  requestLookupInFlight,
  objectLookupCache,
  objectLookupInFlight,
  objectTypeLookupCache,
  objectTypeLookupInFlight,
  systemLookupCache,
  systemLookupInFlight,
  levelLookupCache,
  levelLookupInFlight,
  rikNameLookupCache,
  rikNameLookupInFlight,
  buildDisciplineRowsCacheKey,
  buildDisciplineSourceRowsRpcCacheKey,
  filterDisciplineRowsByObject,
  getFreshLookupValue,
  trimMap,
  setLookupValue,
  canonicalKey,
  maybeLogDivergence,
};
