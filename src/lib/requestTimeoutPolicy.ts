import { beginPlatformObservability } from "./observability/platformObservability";

type PlatformObservabilityInput = Parameters<typeof beginPlatformObservability>[0];
type PlatformScreen = PlatformObservabilityInput["screen"];

export type RequestTimeoutClass =
  | "lightweight_lookup"
  | "ui_scope_load"
  | "heavy_report_or_pdf_or_storage"
  | "mutation_request";

export type RequestTimeoutEndpointKind =
  | "supabase_rpc"
  | "supabase_rest"
  | "supabase_storage"
  | "supabase_function"
  | "supabase_auth"
  | "direct_fetch";

export type RequestTimeoutPolicyRecord = Record<RequestTimeoutClass, number>;

export const REQUEST_TIMEOUT_POLICY_MS: Readonly<RequestTimeoutPolicyRecord> = Object.freeze({
  lightweight_lookup: 8_000,
  ui_scope_load: 20_000,
  heavy_report_or_pdf_or_storage: 60_000,
  mutation_request: 30_000,
});

export const REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS: RequestTimeoutClass = "ui_scope_load";

const LIGHTWEIGHT_RPC_NAMES = new Set([
  "ensure_my_profile",
  "get_my_role",
  "resolve_catalog_synonym_v1",
  "resolve_packaging_v1",
  "rik_quick_ru",
  "rik_quick_search",
  "rik_quick_search_typed",
  "suppliers_list",
  "request_display",
  "request_display_no",
  "request_label",
]);

const HEAVY_RPC_PATTERNS = [
  /^pdf_/i,
  /^acc_report_/i,
  /^wh_report_/i,
  /^director_.*report/i,
  /^warehouse_.*report/i,
];

const UI_SCOPE_RPC_PATTERNS = [
  /_scope(_v\d+)?$/i,
  /^list_/i,
  /_window(_v\d+)?$/i,
  /_summary(_v\d+)?$/i,
  /_source(_v\d+)?$/i,
  /^request_items_by_request$/i,
  /^proposal_attachments_list$/i,
  /^proposal_attachment_evidence_scope_v1$/i,
  /^resolve_req_pr_map$/i,
  /^marketplace_item_scope_detail_v1$/i,
];

const MUTATION_RPC_PATTERNS = [
  /(^|_)(submit|create|add|set|update|delete|remove|approve|reject|return|publish|commit|apply|mark|seed|sync|issue|receive|send|claim|recover|attach|upload)(_|$)/i,
];

const HEAVY_FUNCTION_PATTERNS = [/pdf/i, /report/i, /storage/i];

export const REQUEST_TIMEOUT_CLASS_MAP = Object.freeze({
  compatibilityDefault: {
    requestClass: REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS,
    timeoutMs: REQUEST_TIMEOUT_POLICY_MS[REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS],
    reason: "fallback when no stricter request-class rule matches",
  },
  classes: {
    lightweight_lookup: {
      timeoutMs: REQUEST_TIMEOUT_POLICY_MS.lightweight_lookup,
      owners: [
        "supabase rpc exact lightweight lookups",
        "supabase auth GET session/profile probes",
      ],
      ruleExamples: [
        "rpc:get_my_role",
        "rpc:ensure_my_profile",
        "rpc:rik_quick_search_typed",
      ],
    },
    ui_scope_load: {
      timeoutMs: REQUEST_TIMEOUT_POLICY_MS.ui_scope_load,
      owners: [
        "supabase rest GET reads",
        "scope/list/window/source RPC reads",
      ],
      ruleExamples: [
        "rest:get",
        "rpc:director_pending_proposals_scope_v1",
        "rpc:accountant_inbox_scope_v1",
      ],
    },
    heavy_report_or_pdf_or_storage: {
      timeoutMs: REQUEST_TIMEOUT_POLICY_MS.heavy_report_or_pdf_or_storage,
      owners: [
        "pdf/report source RPCs",
        "storage upload/download/signed-url flows",
        "direct PDF backend fetches",
      ],
      ruleExamples: [
        "rpc:pdf_payment_source_v1",
        "functions:director-production-report-pdf",
        "storage:/storage/v1/object/*",
      ],
    },
    mutation_request: {
      timeoutMs: REQUEST_TIMEOUT_POLICY_MS.mutation_request,
      owners: [
        "write RPCs and non-GET rest mutations",
        "auth POST flows",
      ],
      ruleExamples: [
        "rpc:request_submit",
        "rpc:proposal_send_to_accountant_min",
        "rest:post",
      ],
    },
  },
});

type RequestTimeoutParams = {
  requestClass?: RequestTimeoutClass;
  timeoutMsOverride?: number;
  owner?: string;
  operation?: string;
  screen?: PlatformScreen;
  surface?: string;
  sourceKind?: string;
  fetchImpl?: typeof fetch;
};

export type ResolvedRequestTimeoutContext = {
  requestClass: RequestTimeoutClass;
  timeoutMs: number;
  owner: string;
  operation: string;
  screen: PlatformScreen;
  surface: string;
  sourceKind: string;
  endpointKind: RequestTimeoutEndpointKind;
  method: string;
  urlPath: string;
  ruleId: string;
};

export class RequestTimeoutError extends Error {
  readonly requestClass: RequestTimeoutClass;
  readonly timeoutMs: number;
  readonly owner: string;
  readonly operation: string;
  readonly elapsedMs: number;
  readonly urlPath: string;

  constructor(params: {
    requestClass: RequestTimeoutClass;
    timeoutMs: number;
    owner: string;
    operation: string;
    elapsedMs: number;
    urlPath: string;
  }) {
    super(
      `${params.owner}.${params.operation} request timed out after ${params.timeoutMs}ms`,
    );
    this.name = "RequestTimeoutError";
    this.requestClass = params.requestClass;
    this.timeoutMs = params.timeoutMs;
    this.owner = params.owner;
    this.operation = params.operation;
    this.elapsedMs = params.elapsedMs;
    this.urlPath = params.urlPath;
  }
}

const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};

const trimText = (value: unknown) => String(value ?? "").trim();

const normalizeMethod = (value: unknown) => trimText(value).toUpperCase() || "GET";

const getInputUrl = (input: Parameters<typeof fetch>[0]) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input instanceof Request) return input.url;
  return String(input ?? "");
};

const getRequestMethod = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => normalizeMethod(init?.method ?? (input instanceof Request ? input.method : ""));

const safeUrl = (rawUrl: string) => {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
};

const getEndpointKind = (pathname: string): RequestTimeoutEndpointKind => {
  if (pathname.includes("/rpc/")) return "supabase_rpc";
  if (pathname.includes("/rest/v1/")) return "supabase_rest";
  if (pathname.includes("/storage/v1/")) return "supabase_storage";
  if (pathname.includes("/functions/v1/")) return "supabase_function";
  if (pathname.includes("/auth/v1/")) return "supabase_auth";
  return "direct_fetch";
};

const extractOperationName = (endpointKind: RequestTimeoutEndpointKind, pathname: string) => {
  const cleanPath = pathname.split("?")[0];
  const parts = cleanPath.split("/").filter(Boolean);
  if (endpointKind === "supabase_rpc") return parts[parts.length - 1] ?? "rpc";
  if (endpointKind === "supabase_rest") return parts[parts.length - 1] ?? "rest";
  if (endpointKind === "supabase_storage") {
    if (parts.includes("object")) return parts.slice(parts.indexOf("object")).join("/") || "storage_object";
    return parts[parts.length - 1] ?? "storage";
  }
  if (endpointKind === "supabase_function") return parts[parts.length - 1] ?? "function";
  if (endpointKind === "supabase_auth") return parts[parts.length - 1] ?? "auth";
  return parts[parts.length - 1] ?? "fetch";
};

const matchesAny = (value: string, patterns: readonly RegExp[]) =>
  patterns.some((pattern) => pattern.test(value));

const classifyRpcRequest = (operation: string): { requestClass: RequestTimeoutClass; ruleId: string } => {
  const name = trimText(operation).toLowerCase();
  if (LIGHTWEIGHT_RPC_NAMES.has(name)) {
    return {
      requestClass: "lightweight_lookup",
      ruleId: `rpc_exact:${name}`,
    };
  }
  if (matchesAny(name, HEAVY_RPC_PATTERNS)) {
    return {
      requestClass: "heavy_report_or_pdf_or_storage",
      ruleId: `rpc_heavy:${name}`,
    };
  }
  if (matchesAny(name, UI_SCOPE_RPC_PATTERNS)) {
    return {
      requestClass: "ui_scope_load",
      ruleId: `rpc_ui:${name}`,
    };
  }
  if (matchesAny(name, MUTATION_RPC_PATTERNS)) {
    return {
      requestClass: "mutation_request",
      ruleId: `rpc_mutation:${name}`,
    };
  }
  return {
    requestClass: REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS,
    ruleId: "rpc_default:ui_scope_load",
  };
};

const classifyFunctionRequest = (
  operation: string,
  method: string,
): { requestClass: RequestTimeoutClass; ruleId: string } => {
  const name = trimText(operation).toLowerCase();
  if (matchesAny(name, HEAVY_FUNCTION_PATTERNS)) {
    return {
      requestClass: "heavy_report_or_pdf_or_storage",
      ruleId: `function_heavy:${name}`,
    };
  }
  if (method !== "GET" && method !== "HEAD") {
    return {
      requestClass: "mutation_request",
      ruleId: `function_mutation:${name}`,
    };
  }
  return {
    requestClass: REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS,
    ruleId: "function_default:ui_scope_load",
  };
};

const classifyByEndpoint = (
  endpointKind: RequestTimeoutEndpointKind,
  operation: string,
  method: string,
): { requestClass: RequestTimeoutClass; ruleId: string } => {
  if (endpointKind === "supabase_rpc") return classifyRpcRequest(operation);
  if (endpointKind === "supabase_function") return classifyFunctionRequest(operation, method);
  if (endpointKind === "supabase_storage") {
    return {
      requestClass: "heavy_report_or_pdf_or_storage",
      ruleId: "storage:heavy_report_or_pdf_or_storage",
    };
  }
  if (endpointKind === "supabase_auth") {
    return {
      requestClass: method === "GET" || method === "HEAD" ? "lightweight_lookup" : "mutation_request",
      ruleId: method === "GET" || method === "HEAD" ? "auth:lightweight_lookup" : "auth:mutation_request",
    };
  }
  if (endpointKind === "supabase_rest") {
    return {
      requestClass: method === "GET" || method === "HEAD" ? "ui_scope_load" : "mutation_request",
      ruleId: method === "GET" || method === "HEAD" ? "rest:ui_scope_load" : "rest:mutation_request",
    };
  }
  return {
    requestClass: REQUEST_TIMEOUT_POLICY_COMPAT_DEFAULT_CLASS,
    ruleId: "direct_fetch_default:ui_scope_load",
  };
};

const inferOwner = (endpointKind: RequestTimeoutEndpointKind) => {
  if (endpointKind === "supabase_rpc") return "supabase_rpc";
  if (endpointKind === "supabase_rest") return "supabase_rest";
  if (endpointKind === "supabase_storage") return "supabase_storage";
  if (endpointKind === "supabase_function") return "supabase_function";
  if (endpointKind === "supabase_auth") return "supabase_auth";
  return "direct_fetch";
};

const getAbortReasonText = (reason: unknown) => {
  if (reason instanceof Error) return trimText(reason.message) || reason.name;
  if (typeof reason === "string") return trimText(reason);
  if (reason && typeof reason === "object" && "message" in reason) {
    return trimText((reason as { message?: unknown }).message);
  }
  return trimText(reason) || null;
};

function isSafeTimeoutReturnEndpoint(
  resolved: ResolvedRequestTimeoutContext,
): boolean {
  return resolved.endpointKind === "supabase_auth";
}

function createTimeoutResponse(): Response {
  return new Response(
    JSON.stringify({
      error: "network_timeout",
      message: "Network timeout",
    }),
    {
      status: 599,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

export function resolveRequestTimeoutContext(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  params?: Omit<RequestTimeoutParams, "fetchImpl">,
): ResolvedRequestTimeoutContext {
  const rawUrl = getInputUrl(input);
  const parsed = safeUrl(rawUrl);
  const urlPath = parsed?.pathname ?? rawUrl;
  const method = getRequestMethod(input, init);
  const endpointKind = getEndpointKind(urlPath);
  const inferredOperation = extractOperationName(endpointKind, urlPath);
  const classified = params?.requestClass
    ? {
        requestClass: params.requestClass,
        ruleId: "explicit_request_class",
      }
    : classifyByEndpoint(endpointKind, inferredOperation, method);
  const owner = trimText(params?.owner) || inferOwner(endpointKind);
  const operation = trimText(params?.operation) || inferredOperation;
  const requestClass = classified.requestClass;
  return {
    requestClass,
    timeoutMs: params?.timeoutMsOverride ?? REQUEST_TIMEOUT_POLICY_MS[requestClass],
    owner,
    operation,
    screen: params?.screen ?? "request",
    surface: params?.surface ?? "request_timeout",
    sourceKind:
      trimText(params?.sourceKind) ||
      `${endpointKind}:${classified.requestClass}`,
    endpointKind,
    method,
    urlPath,
    ruleId: classified.ruleId,
  };
}

function createTimeoutController(
  timeoutMs: number,
  upstreamSignal?: AbortSignal | null,
) {
  const controller = new AbortController();
  let timeoutFired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timeoutSignal: AbortSignal | null = null;

  const abortWithReason = (reason: unknown) => {
    if (controller.signal.aborted) return;
    controller.abort(reason);
  };

  const onUpstreamAbort = () => abortWithReason(upstreamSignal?.reason ?? new Error("request aborted"));

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      onUpstreamAbort();
    } else {
      upstreamSignal.addEventListener("abort", onUpstreamAbort, { once: true });
    }
  }

  const timeoutReason = new Error(`request timeout after ${timeoutMs}ms`);

  const onTimeoutAbort = () => {
    timeoutFired = true;
    abortWithReason(timeoutReason);
  };

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    timeoutSignal = AbortSignal.timeout(timeoutMs);
    if (timeoutSignal.aborted) {
      onTimeoutAbort();
    } else {
      timeoutSignal.addEventListener("abort", onTimeoutAbort, { once: true });
    }
  } else {
    timer = setTimeout(onTimeoutAbort, timeoutMs);
  }

  return {
    signal: controller.signal,
    didTimeout() {
      return timeoutFired;
    },
    cleanup() {
      if (timer) clearTimeout(timer);
      if (upstreamSignal) upstreamSignal.removeEventListener("abort", onUpstreamAbort);
      if (timeoutSignal) timeoutSignal.removeEventListener("abort", onTimeoutAbort);
    },
  };
}

export async function fetchWithRequestTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
  params?: RequestTimeoutParams,
): Promise<Response> {
  const resolved = resolveRequestTimeoutContext(input, init, params);
  const fetchImpl = params?.fetchImpl ?? fetch;
  const startedAt = nowMs();
  const controller = createTimeoutController(resolved.timeoutMs, init?.signal ?? null);
  const observation = beginPlatformObservability({
    screen: resolved.screen,
    surface: resolved.surface,
    category: "fetch",
    event: "request_timeout_discipline",
    sourceKind: resolved.sourceKind,
    trigger: "request",
    extra: {
      requestClass: resolved.requestClass,
      timeoutMs: resolved.timeoutMs,
      owner: resolved.owner,
      operation: resolved.operation,
      method: resolved.method,
      urlPath: resolved.urlPath,
      endpointKind: resolved.endpointKind,
      ruleId: resolved.ruleId,
    },
  });

  try {
    const response = await fetchImpl(input, {
      ...(init ?? {}),
      signal: controller.signal,
    });
    observation.success({
      extra: {
        requestClass: resolved.requestClass,
        timeoutMs: resolved.timeoutMs,
        owner: resolved.owner,
        operation: resolved.operation,
        method: resolved.method,
        urlPath: resolved.urlPath,
        endpointKind: resolved.endpointKind,
        ruleId: resolved.ruleId,
        timeoutFired: false,
        abortReason: null,
        httpStatus: response.status,
      },
    });
    return response;
  } catch (error) {
    const elapsedMs = Math.max(0, Math.round(nowMs() - startedAt));
    if (controller.didTimeout()) {
      const timeoutError = new RequestTimeoutError({
        requestClass: resolved.requestClass,
        timeoutMs: resolved.timeoutMs,
        owner: resolved.owner,
        operation: resolved.operation,
        elapsedMs,
        urlPath: resolved.urlPath,
      });
      observation.error(timeoutError, {
        errorStage: "timeout",
        extra: {
          requestClass: resolved.requestClass,
          timeoutMs: resolved.timeoutMs,
          owner: resolved.owner,
          operation: resolved.operation,
          method: resolved.method,
          urlPath: resolved.urlPath,
          endpointKind: resolved.endpointKind,
          ruleId: resolved.ruleId,
          timeoutFired: true,
          abortReason: "timeout",
          elapsedMs,
        },
      });

      if (isSafeTimeoutReturnEndpoint(resolved)) {
        return createTimeoutResponse();
      }

      throw timeoutError;
    }

    observation.error(error, {
      errorStage: controller.signal.aborted ? "abort" : "fetch",
      extra: {
        requestClass: resolved.requestClass,
        timeoutMs: resolved.timeoutMs,
        owner: resolved.owner,
        operation: resolved.operation,
        method: resolved.method,
        urlPath: resolved.urlPath,
        endpointKind: resolved.endpointKind,
        ruleId: resolved.ruleId,
        timeoutFired: false,
        abortReason: getAbortReasonText(controller.signal.reason),
        elapsedMs,
      },
    });
    throw error;
  } finally {
    controller.cleanup();
  }
}
