import { supabase } from "../supabaseClient";
import {
  fetchDirectorWarehouseReportDisciplineTracked,
  fetchDirectorWarehouseReportOptionsTracked,
  fetchDirectorWarehouseReportTracked,
  type DirectorReportFetchMeta,
} from "./director_reports";
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
  priced_stage?: "base" | "priced" | null;
};

export type DirectorReportTransportScopeResult = {
  options: DirectorReportOptions;
  report: DirectorReportPayload | null;
  discipline: DirectorDisciplinePayload | null;
  optionsMeta: DirectorReportFetchMeta;
  reportMeta: DirectorReportFetchMeta;
  disciplineMeta: DirectorReportFetchMeta | null;
  source: string;
  branchMeta: {
    transportBranch: "rpc_scope_v1" | "legacy_scope_fallback";
    fallbackReason?: DirectorReportTransportScopeFallbackReason;
    rpcVersion?: "v1";
    pricedStage?: "base" | "priced" | null;
  };
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
  if (!__DEV__) return;
  console.info("[director-report-transport]", {
    source: result.source,
    transportBranch: result.branchMeta.transportBranch,
    fallbackReason: result.branchMeta.fallbackReason ?? null,
    rpcVersion: result.branchMeta.rpcVersion ?? null,
    pricedStage: result.branchMeta.pricedStage ?? null,
    optionsObjects: result.options.objects.length,
    reportRows: result.report?.rows?.length ?? 0,
    disciplineWorks: result.discipline?.works?.length ?? 0,
    lastError: directorReportTransportScopeLastErrorMessage,
    ...extra,
  });
};

async function fetchDirectorReportTransportScopeViaRpc(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
}): Promise<DirectorReportTransportScopeResult> {
  const { data, error } = await supabase.rpc("director_report_transport_scope_v1", {
    p_from: args.from || null,
    p_to: args.to || null,
    p_object_name: args.objectName ?? null,
    p_include_discipline: args.includeDiscipline,
    p_include_costs: args.includeDiscipline ? !args.skipDisciplinePrices : false,
  });

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

  const pricedStage =
    args.includeDiscipline
      ? (envelope.priced_stage ?? (args.skipDisciplinePrices ? "base" : "priced"))
      : null;

  const result: DirectorReportTransportScopeResult = {
    options,
    report,
    discipline,
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
  return result;
}

async function buildDirectorReportTransportScopeFallback(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  legacyObjectIdByName?: Record<string, string | null>;
  fallbackReason: DirectorReportTransportScopeFallbackReason;
}): Promise<DirectorReportTransportScopeResult> {
  const optionsResult = await fetchDirectorWarehouseReportOptionsTracked({
    from: args.from,
    to: args.to,
  });
  const options = optionsResult.payload;
  const objectIdByName = {
    ...(options.objectIdByName ?? {}),
    ...(args.legacyObjectIdByName ?? {}),
  };
  const [reportResult, disciplineResult] = await Promise.all([
    fetchDirectorWarehouseReportTracked({
      from: args.from,
      to: args.to,
      objectName: args.objectName,
      objectIdByName,
    }),
    args.includeDiscipline
      ? fetchDirectorWarehouseReportDisciplineTracked(
        {
          from: args.from,
          to: args.to,
          objectName: args.objectName,
          objectIdByName,
        },
        { skipPrices: args.skipDisciplinePrices },
      )
      : Promise.resolve(null),
  ]);

  return {
    options,
    report: reportResult.payload,
    discipline: disciplineResult?.payload ?? null,
    optionsMeta: optionsResult.meta,
    reportMeta: reportResult.meta,
    disciplineMeta: disciplineResult?.meta ?? null,
    source: "transport:director_report_legacy_service",
    branchMeta: {
      transportBranch: "legacy_scope_fallback",
      fallbackReason: args.fallbackReason,
      pricedStage: disciplineResult?.meta?.pricedStage ?? null,
    },
  };
}

export async function loadDirectorReportTransportScope(args: {
  from: string;
  to: string;
  objectName: string | null;
  includeDiscipline: boolean;
  skipDisciplinePrices: boolean;
  legacyObjectIdByName?: Record<string, string | null>;
}): Promise<DirectorReportTransportScopeResult> {
  if (DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "force_off") {
    const fallback = await buildDirectorReportTransportScopeFallback({
      ...args,
      fallbackReason: "disabled",
    });
    logDirectorReportTransportScope(fallback, {
      from: args.from,
      to: args.to,
      objectName: args.objectName ?? null,
    });
    return fallback;
  }

  if (
    DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto" &&
    directorReportTransportScopeRpcAvailability === "missing"
  ) {
    const fallback = await buildDirectorReportTransportScopeFallback({
      ...args,
      fallbackReason: "disabled",
    });
    logDirectorReportTransportScope(fallback, {
      from: args.from,
      to: args.to,
      objectName: args.objectName ?? null,
    });
    return fallback;
  }

  try {
    const rpcResult = await fetchDirectorReportTransportScopeViaRpc(args);
    if (DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto") {
      directorReportTransportScopeRpcAvailability = "available";
      directorReportTransportScopeLastErrorMessage = null;
    }
    logDirectorReportTransportScope(rpcResult, {
      from: args.from,
      to: args.to,
      objectName: args.objectName ?? null,
    });
    return rpcResult;
  } catch (error) {
    const fallbackReason =
      error instanceof DirectorReportTransportScopeValidationError ? "invalid_payload" : "rpc_error";
    if (
      DIRECTOR_REPORT_TRANSPORT_SCOPE_RPC_MODE === "auto" &&
      error instanceof DirectorReportTransportScopeRpcError &&
      error.disableForSession
    ) {
      directorReportTransportScopeRpcAvailability = "missing";
      directorReportTransportScopeLastErrorMessage = error.message;
    }
    if (__DEV__) {
      console.warn("[director-report-transport] scope rpc fallback", {
        fallbackReason,
        errorMessage: error instanceof Error ? error.message : String(error),
        from: args.from,
        to: args.to,
        objectName: args.objectName ?? null,
      });
    }
    const fallback = await buildDirectorReportTransportScopeFallback({
      ...args,
      fallbackReason,
    });
    logDirectorReportTransportScope(fallback, {
      from: args.from,
      to: args.to,
      objectName: args.objectName ?? null,
    });
    return fallback;
  }
}
