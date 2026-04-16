import { supabase } from "../supabaseClient";
import {
  applySupabaseAbortSignal,
  isAbortError,
  throwIfAborted,
} from "../requestCancellation";
import { type DirectorReportFetchMeta } from "./director_reports";
import {
  adaptCanonicalMaterialsPayload,
  adaptCanonicalOptionsPayload,
  adaptCanonicalWorksPayload,
} from "./director_reports.adapters";
import type {
  DirectorDisciplinePayload,
  DirectorReportOptions,
  DirectorReportPayload,
} from "./director_reports.shared";
import { trimMap } from "./director_reports.cache";
import { trackRpcLatency } from "../observability/rpcLatencyMetrics";
import {
  shouldRejectScopedEmptyMaterialsPayload,
  shouldRejectTransportScopeDisciplinePayload,
} from "./director_reports.fallbacks";

const DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_V1_MODE_RAW = String(
  process.env.EXPO_PUBLIC_DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_V1 ?? "",
)
  .trim()
  .toLowerCase();

type DirectorReportTransportScopeRpcMode = "force_on" | "force_off" | "auto";
type DirectorReportTransportScopeRpcAvailability = "unknown" | "available" | "missing";
type DirectorReportTransportScopeFallbackReason =
  | "disabled"
  | "rpc_error"
  | "invalid_payload";

type DirectorReportTransportScopeEnvelopeV1 = {
  document_type: "director_report_transport_scope";
  version: "v1";
  options_payload: unknown;
  report_payload: unknown;
  discipline_payload?: unknown | null;
  canonical_summary?: unknown;
  canonical_diagnostics?: unknown;
  priced_stage?: "base" | "priced" | null;
};

export type DirectorReportTransportScopeResult = {
  options: DirectorReportOptions;
  report: DirectorReportPayload | null;
  discipline: DirectorDisciplinePayload | null;
  canonicalSummaryPayload: unknown;
  canonicalDiagnosticsPayload: unknown;
  optionsMeta: DirectorReportFetchMeta;
  reportMeta: DirectorReportFetchMeta;
  disciplineMeta: DirectorReportFetchMeta | null;
  source: string;
  branchMeta: {
    transportBranch: "rpc_scope_v1";
    fallbackReason?: DirectorReportTransportScopeFallbackReason;
    rpcVersion?: "v1";
    pricedStage?: "base" | "priced" | null;
  };
  fromCache: boolean;
};

type DirectorReportTransportScopeCacheEntry = {
  ts: number;
  value: Omit<DirectorReportTransportScopeResult, "fromCache">;
};

const DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE: DirectorReportTransportScopeRpcMode = (() => {
  if (["1", "true", "on", "enabled", "yes"].includes(DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_V1_MODE_RAW)) {
    return "force_on";
  }
  if (["0", "false", "off", "disabled", "no"].includes(DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_V1_MODE_RAW)) {
    return "force_off";
  }
  return "auto";
})();

let directorReportTransportScopeRpcAvailability: DirectorReportTransportScopeRpcAvailability = "unknown";
let directorReportTransportScopeLastErrorMessage: string | null = null;
const DIRECTOR_REPORT_TRANSPORT_SCOPE_CACHE_TTL_MS = 5 * 60 * 1000;
const DIRECTOR_REPORT_TRANSPORT_SCOPE_CACHE_MAX = 40;
const directorReportTransportScopeCache = new Map<string, DirectorReportTransportScopeCacheEntry>();
const directorReportTransportScopeInFlight = new Map<string, Promise<Omit<DirectorReportTransportScopeResult, "fromCache">>>();

class DirectorReportTransportScopeRpcError extends Error {
  disableForSession: boolean;

  constructor(message: string, options?: { disableForSession?: boolean }) {
    super(message);
    this.name = "DirectorReportTransportScopeRpcError";
    this.disableForSession = options?.disableForSession === true;
  }
}

class DirectorReportTransportScopeValidationError extends Error {}

const makeTransportMeta = (
  stage: DirectorReportFetchMeta["stage"],
  pricedStage?: "base" | "priced" | null,
): DirectorReportFetchMeta => ({
  stage,
  branch: "transport_rpc",
  chain: ["transport_rpc", "canonical_rpc"],
  cacheLayer: "none",
  pricedStage: stage === "discipline" ? (pricedStage ?? undefined) : undefined,
});

const isMissingScopeRpcError = (error: unknown) => {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const message = String(record.message ?? error ?? "").toLowerCase();
  const details = String(record.details ?? "").toLowerCase();
  const hint = String(record.hint ?? "").toLowerCase();
  const code = String(record.code ?? "").toLowerCase();
  const text = `${message} ${details} ${hint}`;
  return (
    text.includes("director_report_transport_scope_v1") &&
    (text.includes("function public.") || text.includes("could not find the function")) ||
    code === "pgrst202"
  );
};

const requireRecord = (value: unknown, field: string) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DirectorReportTransportScopeValidationError(`director_report_transport_scope_v1 missing ${field}`);
  }
  return value as Record<string, unknown>;
};

const requireText = (value: unknown, field: string) => {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new DirectorReportTransportScopeValidationError(`director_report_transport_scope_v1 missing ${field}`);
  }
  return text;
};

const validateScopeEnvelopeV1 = (value: unknown): DirectorReportTransportScopeEnvelopeV1 => {
  const root = requireRecord(value, "root");
  const documentType = requireText(root.document_type, "document_type");
  const version = requireText(root.version, "version");
  if (documentType !== "director_report_transport_scope") {
    throw new DirectorReportTransportScopeValidationError(
      `director_report_transport_scope_v1 invalid document_type: ${documentType}`,
    );
  }
  if (version !== "v1") {
    throw new DirectorReportTransportScopeValidationError(
      `director_report_transport_scope_v1 invalid version: ${version}`,
    );
  }
  return {
    document_type: "director_report_transport_scope",
    version: "v1",
    options_payload: root.options_payload,
    report_payload: root.report_payload,
    discipline_payload: root.discipline_payload ?? null,
    canonical_summary: root.canonical_summary,
    canonical_diagnostics: root.canonical_diagnostics,
    priced_stage:
      root.priced_stage === "base" || root.priced_stage === "priced"
        ? root.priced_stage
        : null,
  };
};

const logDirectorReportTransportScope = (
  result: DirectorReportTransportScopeResult,
  extra?: Record<string, unknown>,
) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  console.info("[director-report-transport]", {
    source: result.source,
    transportBranch: result.branchMeta.transportBranch,
    rpcVersion: result.branchMeta.rpcVersion ?? null,
    pricedStage: result.branchMeta.pricedStage ?? null,
    fromCache: result.fromCache,
    optionsObjects: result.options.objects.length,
    reportRows: result.report?.rows?.length ?? 0,
    disciplineWorks: result.discipline?.works?.length ?? 0,
    lastError: directorReportTransportScopeLastErrorMessage,
    ...extra,
  });
};

const buildDirectorReportTransportScopeCacheKey = (args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
}) =>
  [
    String(args.from || ""),
    String(args.to || ""),
    String(args.objectName ?? ""),
    args.includeDiscipline ? "discipline" : "report",
    args.skipDisciplinePrices ? "base" : "priced",
  ].join("|");

const getCachedDirectorReportTransportScope = (
  key: string,
): Omit<DirectorReportTransportScopeResult, "fromCache"> | null => {
  const hit = directorReportTransportScopeCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > DIRECTOR_REPORT_TRANSPORT_SCOPE_CACHE_TTL_MS) {
    directorReportTransportScopeCache.delete(key);
    return null;
  }
  directorReportTransportScopeCache.delete(key);
  directorReportTransportScopeCache.set(key, hit);
  return hit.value;
};

const setCachedDirectorReportTransportScope = (
  key: string,
  value: Omit<DirectorReportTransportScopeResult, "fromCache">,
) => {
  if (directorReportTransportScopeCache.has(key)) {
    directorReportTransportScopeCache.delete(key);
  }
  directorReportTransportScopeCache.set(key, {
    ts: Date.now(),
    value,
  });
  trimMap(directorReportTransportScopeCache, DIRECTOR_REPORT_TRANSPORT_SCOPE_CACHE_MAX);
};

async function fetchDirectorReportTransportScopeViaRpc(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  signal?: AbortSignal | null;
}): Promise<Omit<DirectorReportTransportScopeResult, "fromCache">> {
  throwIfAborted(args.signal);
  const startedAt = Date.now();

  try {
    const { data, error } = await applySupabaseAbortSignal(
      supabase.rpc("director_report_transport_scope_v1", {
        p_from: args.from || null,
        p_to: args.to || null,
        p_object_name: args.objectName ?? null,
        p_include_discipline: args.includeDiscipline,
        p_include_costs: args.includeDiscipline ? !args.skipDisciplinePrices : false,
      }),
      args.signal,
    );
    throwIfAborted(args.signal);

    if (error) {
      throw new DirectorReportTransportScopeRpcError(
        `director_report_transport_scope_v1 failed: ${error.message}`,
        { disableForSession: isMissingScopeRpcError(error) },
      );
    }

    const envelope = validateScopeEnvelopeV1(data);
    const options = adaptCanonicalOptionsPayload(envelope.options_payload);
    const report = adaptCanonicalMaterialsPayload(envelope.report_payload);
    const discipline =
      envelope.discipline_payload == null ? null : adaptCanonicalWorksPayload(envelope.discipline_payload);

    if (!options || !report || (args.includeDiscipline && !discipline)) {
      throw new DirectorReportTransportScopeValidationError(
        "director_report_transport_scope_v1 payload adaptation failed",
      );
    }
    if (shouldRejectScopedEmptyMaterialsPayload(report, args.objectName, options)) {
      throw new DirectorReportTransportScopeValidationError(
        "director_report_transport_scope_v1 scoped payload empty for canonical object",
      );
    }
    if (
      args.includeDiscipline &&
      shouldRejectTransportScopeDisciplinePayload(discipline, report)
    ) {
      throw new DirectorReportTransportScopeValidationError(
        "director_report_transport_scope_v1 discipline payload lost linked detail levels",
      );
    }

    const pricedStage =
      args.includeDiscipline
        ? (envelope.priced_stage ?? (args.skipDisciplinePrices ? "base" : "priced"))
        : null;

    const result: Omit<DirectorReportTransportScopeResult, "fromCache"> = {
      options,
      report,
      discipline,
      canonicalSummaryPayload: envelope.canonical_summary,
      canonicalDiagnosticsPayload: envelope.canonical_diagnostics,
      optionsMeta: makeTransportMeta("options"),
      reportMeta: makeTransportMeta("report"),
      disciplineMeta: args.includeDiscipline ? makeTransportMeta("discipline", pricedStage) : null,
      source: "transport:director_report_scope_rpc_v1",
      branchMeta: {
        transportBranch: "rpc_scope_v1",
        rpcVersion: "v1",
        pricedStage,
      },
    };
    trackRpcLatency({
      name: "director_report_transport_scope_v1",
      screen: "director",
      surface: "reports_transport",
      durationMs: Date.now() - startedAt,
      status: "success",
      rowCount: (result.report?.rows?.length ?? 0) + (result.discipline?.works?.length ?? 0),
      extra: {
        includeDiscipline: args.includeDiscipline,
        includeCosts: args.includeDiscipline ? !args.skipDisciplinePrices : false,
        objectScoped: Boolean(args.objectName),
      },
    });
    return result;
  } catch (error) {
    trackRpcLatency({
      name: "director_report_transport_scope_v1",
      screen: "director",
      surface: "reports_transport",
      durationMs: Date.now() - startedAt,
      status: "error",
      error,
      extra: {
        includeDiscipline: args.includeDiscipline,
        objectScoped: Boolean(args.objectName),
      },
    });
    throw error;
  }
}

async function loadDirectorReportTransportScopeLive(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  signal?: AbortSignal | null;
}): Promise<Omit<DirectorReportTransportScopeResult, "fromCache">> {
  if (DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "force_off") {
    const message =
      "director_report_transport_scope_v1 is force_off but transport fallback branches were removed";
    directorReportTransportScopeLastErrorMessage = message;
    throw new DirectorReportTransportScopeRpcError(message);
  }

  if (
    DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto" &&
    directorReportTransportScopeRpcAvailability === "missing"
  ) {
    throw new DirectorReportTransportScopeRpcError(
      directorReportTransportScopeLastErrorMessage ??
        "director_report_transport_scope_v1 unavailable in this session and fallback branches were removed",
    );
  }

  try {
    throwIfAborted(args.signal);
    const rpcResult = await fetchDirectorReportTransportScopeViaRpc(args);
    throwIfAborted(args.signal);
    if (DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto") {
      directorReportTransportScopeRpcAvailability = "available";
      directorReportTransportScopeLastErrorMessage = null;
    }
    return rpcResult;
  } catch (error) {
    if (isAbortError(error)) throw error;
    directorReportTransportScopeLastErrorMessage =
      error instanceof Error ? error.message : String(error);
    if (
      DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto" &&
      error instanceof DirectorReportTransportScopeRpcError &&
      error.disableForSession
    ) {
      directorReportTransportScopeRpcAvailability = "missing";
      directorReportTransportScopeLastErrorMessage = error.message;
    }
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("[director-report-transport] scope rpc failed", {
        errorMessage: error instanceof Error ? error.message : String(error),
        from: args.from,
        to: args.to,
        objectName: args.objectName ?? null,
      });
    }
    throw error;
  }
}

export async function loadDirectorReportTransportScope(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  bypassCache?: boolean;
  signal?: AbortSignal | null;
}): Promise<DirectorReportTransportScopeResult> {
  const cacheKey = buildDirectorReportTransportScopeCacheKey(args);
  if (!args.bypassCache) {
    const cached = getCachedDirectorReportTransportScope(cacheKey);
    if (cached) {
      throwIfAborted(args.signal);
      const cachedResult: DirectorReportTransportScopeResult = {
        ...cached,
        fromCache: true,
      };
      logDirectorReportTransportScope(cachedResult, {
        from: args.from,
        to: args.to,
        objectName: args.objectName ?? null,
      });
      return cachedResult;
    }
    const inFlight = args.signal ? null : directorReportTransportScopeInFlight.get(cacheKey);
    if (inFlight) {
      const joined = await inFlight;
      const result: DirectorReportTransportScopeResult = {
        ...joined,
        fromCache: false,
      };
      logDirectorReportTransportScope(result, {
        from: args.from,
        to: args.to,
        objectName: args.objectName ?? null,
        joinedInFlight: true,
      });
      return result;
    }
  }

  const task = loadDirectorReportTransportScopeLive(args);
  if (!args.signal) {
    directorReportTransportScopeInFlight.set(cacheKey, task);
  }
  try {
    const live = await task;
    throwIfAborted(args.signal);
    setCachedDirectorReportTransportScope(cacheKey, live);
    const result: DirectorReportTransportScopeResult = {
      ...live,
      fromCache: false,
    };
    logDirectorReportTransportScope(result, {
      from: args.from,
      to: args.to,
      objectName: args.objectName ?? null,
    });
    return result;
  } finally {
    if (!args.signal) {
      const activeTask = directorReportTransportScopeInFlight.get(cacheKey);
      if (activeTask === task) {
        directorReportTransportScopeInFlight.delete(cacheKey);
      }
    }
  }
}
