import { client } from "./_core";
import { loadRequestsSubmittedAtCapability } from "../assistant_store_read.low_risk.transport";
import { recordPlatformObservability } from "../observability/platformObservability";

type RequestsCapabilityCacheMode = "positive" | "negative";
type RequestsSubmittedAtCacheEntry = {
  value: boolean;
  ts: number;
  mode: RequestsCapabilityCacheMode;
};
type RequestsReadableColumnsCacheEntry = {
  value: Set<string>;
  ts: number;
  mode: RequestsCapabilityCacheMode;
};

const REQUESTS_READ_CAPABILITY_POSITIVE_TTL_MS = 5 * 60 * 1000;
const REQUESTS_READ_CAPABILITY_NEGATIVE_TTL_MS = 60 * 1000;

let requestsSubmittedAtSupportedCache: RequestsSubmittedAtCacheEntry | null = null;
let requestsReadableColumnsCache: RequestsReadableColumnsCacheEntry | null = null;
let requestsReadableColumnsInFlight: Promise<Set<string>> | null = null;

const getErrorMessage = (value: unknown): string => {
  if (value != null && typeof value === "object" && "message" in value && typeof (value as { message?: unknown }).message === "string") {
    return (value as { message: string }).message;
  }
  return String(value ?? "");
};

const capabilityTtl = (mode: RequestsCapabilityCacheMode) =>
  mode === "positive" ? REQUESTS_READ_CAPABILITY_POSITIVE_TTL_MS : REQUESTS_READ_CAPABILITY_NEGATIVE_TTL_MS;

const isCapabilityCacheFresh = (entry: { ts: number; mode: RequestsCapabilityCacheMode } | null) =>
  !!entry && Date.now() - entry.ts < capabilityTtl(entry.mode);

export function invalidateRequestsReadCapabilitiesCache() {
  requestsSubmittedAtSupportedCache = null;
  requestsReadableColumnsCache = null;
  requestsReadableColumnsInFlight = null;
  recordPlatformObservability({
    screen: "request",
    surface: "read_capabilities",
    category: "reload",
    event: "invalidate_requests_capabilities_cache",
    result: "success",
    sourceKind: "manual_invalidation",
  });
}

export async function resolveRequestsReadableColumns(): Promise<Set<string>> {
  if (isCapabilityCacheFresh(requestsReadableColumnsCache)) {
    recordPlatformObservability({
      screen: "request",
      surface: "read_capabilities",
      category: "fetch",
      event: "resolve_readable_columns",
      result: "cache_hit",
      sourceKind: "schema_probe",
      fallbackUsed: requestsReadableColumnsCache?.mode === "negative",
      extra: {
        cacheMode: requestsReadableColumnsCache?.mode ?? "unknown",
      },
    });
    return requestsReadableColumnsCache!.value;
  }
  if (requestsReadableColumnsInFlight) return requestsReadableColumnsInFlight;

  requestsReadableColumnsInFlight = (async () => {
    try {
      const q = await client.from("requests").select("*").limit(1);
      if (q.error) throw q.error;
      const first =
        Array.isArray(q.data) && q.data.length ? (q.data[0] as Record<string, unknown>) : null;
      const cols = new Set<string>(first ? Object.keys(first) : ["id", "status", "display_no", "created_at"]);
      requestsReadableColumnsCache = {
        value: cols,
        ts: Date.now(),
        mode: "positive",
      };
      recordPlatformObservability({
        screen: "request",
        surface: "read_capabilities",
        category: "fetch",
        event: "resolve_readable_columns",
        result: "success",
        sourceKind: "schema_probe",
        fallbackUsed: false,
        extra: {
          cacheMode: "positive",
          columnCount: cols.size,
        },
      });
      return cols;
    } catch (error) {
      const fallback = new Set<string>(["id", "status", "display_no", "created_at"]);
      requestsReadableColumnsCache = {
        value: fallback,
        ts: Date.now(),
        mode: "negative",
      };
      recordPlatformObservability({
        screen: "request",
        surface: "read_capabilities",
        category: "fetch",
        event: "resolve_readable_columns",
        result: "error",
        sourceKind: "schema_probe",
        fallbackUsed: true,
        errorStage: "readable_columns_probe",
        errorClass: error instanceof Error ? error.name : undefined,
        errorMessage: getErrorMessage(error),
        extra: {
          cacheMode: "negative",
          columnCount: fallback.size,
        },
      });
      return fallback;
    } finally {
      requestsReadableColumnsInFlight = null;
    }
  })();

  return requestsReadableColumnsInFlight;
}

export async function buildRequestSelectSchemaSafe(): Promise<string> {
  const desired = [
    "id",
    "status",
    "display_no",
    "foreman_name",
    "need_by",
    "comment",
    "object_type_code",
    "level_code",
    "system_code",
    "zone_code",
    "created_at",
    "year",
    "seq",
  ];
  const cols = await resolveRequestsReadableColumns();
  const filtered = desired.filter((c) => cols.has(c));
  return filtered.length ? filtered.join(", ") : "id,status,created_at";
}

export async function requestsSupportsSubmittedAt(): Promise<boolean> {
  if (isCapabilityCacheFresh(requestsSubmittedAtSupportedCache)) {
    recordPlatformObservability({
      screen: "request",
      surface: "read_capabilities",
      category: "fetch",
      event: "resolve_submitted_at_capability",
      result: "cache_hit",
      sourceKind: "schema_probe",
      fallbackUsed: requestsSubmittedAtSupportedCache?.mode === "negative",
      extra: {
        cacheMode: requestsSubmittedAtSupportedCache?.mode ?? "unknown",
      },
    });
    return requestsSubmittedAtSupportedCache!.value;
  }
  try {
    await loadRequestsSubmittedAtCapability();
    requestsSubmittedAtSupportedCache = {
      value: true,
      ts: Date.now(),
      mode: "positive",
    };
    recordPlatformObservability({
      screen: "request",
      surface: "read_capabilities",
      category: "fetch",
      event: "resolve_submitted_at_capability",
      result: "success",
      sourceKind: "schema_probe",
      fallbackUsed: false,
      extra: {
        cacheMode: "positive",
      },
    });
    return true;
  } catch (e) {
    const msg = getErrorMessage(e).toLowerCase();
    if (msg.includes("submitted_at") || msg.includes("column") || msg.includes("does not exist")) {
      requestsSubmittedAtSupportedCache = {
        value: false,
        ts: Date.now(),
        mode: "negative",
      };
      recordPlatformObservability({
        screen: "request",
        surface: "read_capabilities",
        category: "fetch",
        event: "resolve_submitted_at_capability",
        result: "error",
        sourceKind: "schema_probe",
        fallbackUsed: true,
        errorStage: "submitted_at_probe",
        errorClass: e instanceof Error ? e.name : undefined,
        errorMessage: getErrorMessage(e),
        extra: {
          cacheMode: "negative",
        },
      });
      return false;
    }
    requestsSubmittedAtSupportedCache = {
      value: true,
      ts: Date.now(),
      mode: "positive",
    };
    recordPlatformObservability({
      screen: "request",
      surface: "read_capabilities",
      category: "fetch",
      event: "resolve_submitted_at_capability",
      result: "success",
      sourceKind: "schema_probe",
      fallbackUsed: false,
      extra: {
        cacheMode: "positive_from_unknown_error",
      },
    });
    return true;
  }
}
