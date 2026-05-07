import { config as loadDotenv } from "dotenv";

import {
  BFF_STAGING_ASSISTANT_STORE_READ_ROUTE,
  BFF_STAGING_CATALOG_TRANSPORT_READ_ROUTE,
  BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE,
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_WAREHOUSE_API_READ_ROUTE,
  type BffStagingRouteDefinition,
} from "../server/stagingBffServerBoundary";
import {
  CATALOG_TRANSPORT_BFF_CONTRACT,
  CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS,
  type CatalogTransportBffRequestDto,
} from "../../src/lib/catalog/catalog.bff.contract";
import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS,
  type DirectorFinanceBffRequestDto,
} from "../../src/screens/director/director.finance.bff.contract";
import {
  WAREHOUSE_API_BFF_CONTRACT,
  WAREHOUSE_API_BFF_OPERATION_CONTRACTS,
  type WarehouseApiBffRequestDto,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";
import {
  ASSISTANT_STORE_READ_BFF_CONTRACT,
  ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS,
  type AssistantStoreReadBffRequestDto,
} from "../../src/lib/assistant_store_read.bff.contract";

export type ProductionBusinessReadonlyCanaryRouteClass =
  | "catalog_readonly_search_preview"
  | "director_finance_readonly_rpc"
  | "warehouse_readonly_rpc"
  | "assistant_store_readonly";

export type ProductionBusinessReadonlyCanaryCandidate = {
  id: string;
  routeClass: ProductionBusinessReadonlyCanaryRouteClass;
  method: "GET" | "POST";
  path: string;
  routeOperation: string;
  semanticKind: "read_rpc" | "read" | "mutation" | "write";
  typedBffContractExists: boolean;
  clientContractExists: boolean;
  serverHandlerPresent: boolean;
  readonlyDbPortUsed: boolean;
  readonlyOperationContractProven: boolean;
  mutationKey: boolean;
  dbWritePossible: boolean;
  writeAdapterPresent: boolean;
  rawPayloadLogging: boolean;
  rawRowsLogging: boolean;
  metricsStatusLatencyCountOnly: boolean;
  syntheticInputApproved: boolean;
  requiresUserCompanyIdentifiersInInput: boolean;
  canaryRequestEnvelope: unknown;
};

export type ProductionBusinessReadonlyCanaryClassification = {
  id: string;
  routeClass: ProductionBusinessReadonlyCanaryRouteClass;
  method: "GET" | "POST";
  readonlyContractProven: boolean;
  clientContractExists: boolean;
  serverHandlerPresent: boolean;
  readonlyDbPortUsed: boolean;
  mutationKey: boolean;
  dbWritePossible: boolean;
  rawPayloadLogging: boolean;
  rawRowsLogging: boolean;
  postReadRpcAllowed: boolean;
  safeForCanary: boolean;
  reasonsIfFalse: string[];
};

export type ProductionBusinessReadonlyCanarySafeRoute = {
  id: string;
  routeClass: ProductionBusinessReadonlyCanaryRouteClass;
  method: "GET" | "POST";
  path: string;
  canaryRequestEnvelope: unknown;
};

export type ProductionBusinessReadonlyCanaryMetric = {
  routeClass: ProductionBusinessReadonlyCanaryRouteClass;
  statusClass: string;
  latencyMs: number | null;
  errorCategory: string | null;
};

export type ProductionBusinessReadonlyCanaryErrorCategory =
  | "auth_category"
  | "dto_validation_category"
  | "route_not_live_category"
  | "readonly_route_disabled_category"
  | "readonly_upstream_category"
  | "other_safe_error_category"
  | "error_code_unavailable";

export type ProductionBusinessReadonlyCanaryAuthSource =
  | "render_api_in_memory"
  | "local_env"
  | "missing";

export type ProductionBusinessReadonlyCanaryAuthResolution = {
  source: ProductionBusinessReadonlyCanaryAuthSource;
  status:
    | "present"
    | "render_api_not_configured"
    | "render_api_unreadable"
    | "render_secret_missing"
    | "local_secret_present"
    | "missing";
  secret: string;
  secretPrinted: false;
  secretWritten: false;
};

export type ProductionBusinessReadonlyCanaryMetricsSummary = {
  totalRequestsAttempted: number;
  totalRequestsCompleted: number;
  statusClassCounts: Record<string, number>;
  latencyP50: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  observedErrorRate: number;
  errorCategoryCounts: Record<string, number>;
};

export type ProductionBusinessReadonlyCanaryAbortDecision = {
  abort: boolean;
  reasons: string[];
};

export type ProductionBusinessReadonlyCanaryRunResult = {
  canaryStarted: boolean;
  productionBusinessReadonlyCallsMade: boolean;
  whitelistRouteCount: number;
  whitelistRouteClasses: ProductionBusinessReadonlyCanaryRouteClass[];
  serverAuthSource: ProductionBusinessReadonlyCanaryAuthSource;
  serverAuthResolutionStatus: ProductionBusinessReadonlyCanaryAuthResolution["status"];
  totalRequestsAttempted: number;
  totalRequestsCompleted: number;
  statusClassCounts: Record<string, number>;
  latencyP50: number | null;
  latencyP95: number | null;
  latencyP99: number | null;
  observedErrorRate: number;
  abortTriggered: boolean;
  abortReason: string | null;
  errorCategoryCounts: Record<string, number>;
};

const catalogPreviewRequest: CatalogTransportBffRequestDto = {
  operation: "catalog.items.search.preview",
  args: {
    searchTerm: "cement",
    kind: "material",
    pageSize: 1,
  },
};

const directorFinanceCanaryRequest: DirectorFinanceBffRequestDto = {
  operation: "director.finance.panel_scope.v1",
  args: {
    p_from: "2026-01-01",
    p_to: "2026-01-02",
    p_due_days: 30,
    p_critical_days: 7,
  },
};

const warehouseIncomingCanaryRequest: WarehouseApiBffRequestDto = {
  operation: "warehouse.api.report.incoming_v2",
  args: {
    p_from: "2026-01-01",
    p_to: "2026-01-02",
  },
};

const assistantStoreCanaryRequest: AssistantStoreReadBffRequestDto = {
  operation: "assistant.market.active_listings",
  args: {
    pageSize: 1,
  },
};

const hasReadonlyOperation = (
  contracts: readonly { operation: string; readOnly: true }[],
  operation: string,
): boolean => contracts.some((contract) => contract.operation === operation && contract.readOnly === true);

const buildReadRpcCandidate = (params: {
  id: string;
  routeClass: ProductionBusinessReadonlyCanaryRouteClass;
  route: BffStagingRouteDefinition;
  contractReadOnly: boolean;
  operationContractProven: boolean;
  clientContractExists: boolean;
  readonlyDbPortUsed: boolean;
  syntheticInputApproved: boolean;
  requiresUserCompanyIdentifiersInInput: boolean;
  canaryRequestEnvelope: unknown;
}): ProductionBusinessReadonlyCanaryCandidate => ({
  id: params.id,
  routeClass: params.routeClass,
  method: params.route.method,
  path: params.route.path,
  routeOperation: params.route.operation,
  semanticKind: params.route.kind === "read_rpc" ? "read_rpc" : "read",
  typedBffContractExists: params.contractReadOnly,
  clientContractExists: params.clientContractExists,
  serverHandlerPresent: params.route.kind === "read_rpc" && params.route.enabledByDefault === true,
  readonlyDbPortUsed: params.readonlyDbPortUsed,
  readonlyOperationContractProven: params.operationContractProven,
  mutationKey: false,
  dbWritePossible: false,
  writeAdapterPresent: false,
  rawPayloadLogging: false,
  rawRowsLogging: false,
  metricsStatusLatencyCountOnly: true,
  syntheticInputApproved: params.syntheticInputApproved,
  requiresUserCompanyIdentifiersInInput: params.requiresUserCompanyIdentifiersInInput,
  canaryRequestEnvelope: params.canaryRequestEnvelope,
});

export const PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES: readonly ProductionBusinessReadonlyCanaryCandidate[] =
  Object.freeze([
    buildReadRpcCandidate({
      id: "catalog_items_search_preview_post_read_rpc",
      routeClass: "catalog_readonly_search_preview",
      route: BFF_STAGING_CATALOG_TRANSPORT_READ_ROUTE,
      contractReadOnly: CATALOG_TRANSPORT_BFF_CONTRACT.readOnly,
      operationContractProven: hasReadonlyOperation(
        CATALOG_TRANSPORT_BFF_OPERATION_CONTRACTS,
        catalogPreviewRequest.operation,
      ),
      clientContractExists: CATALOG_TRANSPORT_BFF_CONTRACT.callsSupabaseDirectlyFromClient === false,
      readonlyDbPortUsed: true,
      syntheticInputApproved: true,
      requiresUserCompanyIdentifiersInInput: false,
      canaryRequestEnvelope: {
        input: catalogPreviewRequest,
        metadata: { canary: "present_redacted" },
      },
    }),
    buildReadRpcCandidate({
      id: "director_finance_post_read_rpc_candidate",
      routeClass: "director_finance_readonly_rpc",
      route: BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE,
      contractReadOnly: DIRECTOR_FINANCE_BFF_CONTRACT.readOnly,
      operationContractProven: hasReadonlyOperation(
        DIRECTOR_FINANCE_BFF_OPERATION_CONTRACTS,
        directorFinanceCanaryRequest.operation,
      ),
      clientContractExists: DIRECTOR_FINANCE_BFF_CONTRACT.callsSupabaseDirectlyFromClient === false,
      readonlyDbPortUsed: true,
      syntheticInputApproved: true,
      requiresUserCompanyIdentifiersInInput: false,
      canaryRequestEnvelope: {
        input: directorFinanceCanaryRequest,
        metadata: { canary: "present_redacted" },
      },
    }),
    buildReadRpcCandidate({
      id: "warehouse_api_post_read_rpc_candidate",
      routeClass: "warehouse_readonly_rpc",
      route: BFF_STAGING_WAREHOUSE_API_READ_ROUTE,
      contractReadOnly: WAREHOUSE_API_BFF_CONTRACT.readOnly,
      operationContractProven: hasReadonlyOperation(
        WAREHOUSE_API_BFF_OPERATION_CONTRACTS,
        warehouseIncomingCanaryRequest.operation,
      ),
      clientContractExists: WAREHOUSE_API_BFF_CONTRACT.callsSupabaseDirectlyFromClient === false,
      readonlyDbPortUsed: true,
      syntheticInputApproved: true,
      requiresUserCompanyIdentifiersInInput: false,
      canaryRequestEnvelope: {
        input: warehouseIncomingCanaryRequest,
        metadata: { canary: "present_redacted" },
      },
    }),
    buildReadRpcCandidate({
      id: "assistant_store_post_read_rpc_candidate",
      routeClass: "assistant_store_readonly",
      route: BFF_STAGING_ASSISTANT_STORE_READ_ROUTE,
      contractReadOnly: ASSISTANT_STORE_READ_BFF_CONTRACT.readOnly,
      operationContractProven: hasReadonlyOperation(
        ASSISTANT_STORE_READ_BFF_OPERATION_CONTRACTS,
        assistantStoreCanaryRequest.operation,
      ),
      clientContractExists: ASSISTANT_STORE_READ_BFF_CONTRACT.callsSupabaseDirectlyFromClient === false,
      readonlyDbPortUsed: true,
      syntheticInputApproved: true,
      requiresUserCompanyIdentifiersInInput: false,
      canaryRequestEnvelope: {
        input: assistantStoreCanaryRequest,
        metadata: { canary: "present_redacted" },
      },
    }),
  ]);

export const PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS = Object.freeze([
  "catalog.request.meta.update",
  "catalog.request.item.update",
  "request.item.update",
  "catalog.request.item.cancel",
  "proposal.submit",
  "warehouse.receive.apply",
  "accountant.payment.apply",
  "director.approval.apply",
] as const);

export function classifyProductionBusinessReadonlyCanaryRoute(
  candidate: ProductionBusinessReadonlyCanaryCandidate,
  params: { postReadRpcApproved: boolean },
): ProductionBusinessReadonlyCanaryClassification {
  const reasonsIfFalse: string[] = [];
  const postReadRpcAllowed =
    candidate.method !== "POST" ||
    (params.postReadRpcApproved && candidate.semanticKind === "read_rpc");
  const readonlyContractProven =
    candidate.typedBffContractExists &&
    candidate.readonlyOperationContractProven &&
    candidate.semanticKind === "read_rpc";

  if (!postReadRpcAllowed) reasonsIfFalse.push("post_read_rpc_not_approved");
  if (!readonlyContractProven) reasonsIfFalse.push("readonly_contract_not_proven");
  if (!candidate.clientContractExists) reasonsIfFalse.push("client_contract_missing");
  if (!candidate.serverHandlerPresent) reasonsIfFalse.push("server_handler_missing");
  if (!candidate.readonlyDbPortUsed) reasonsIfFalse.push("readonly_db_port_not_proven");
  if (candidate.mutationKey) reasonsIfFalse.push("mutation_route_key_present");
  if (candidate.dbWritePossible || candidate.writeAdapterPresent) {
    reasonsIfFalse.push("write_semantics_detected");
  }
  if (candidate.rawPayloadLogging || candidate.rawRowsLogging) reasonsIfFalse.push("redaction_unsafe");
  if (!candidate.metricsStatusLatencyCountOnly) reasonsIfFalse.push("metrics_not_redacted");
  if (!candidate.syntheticInputApproved) reasonsIfFalse.push("synthetic_non_identifying_input_missing");
  if (candidate.requiresUserCompanyIdentifiersInInput) reasonsIfFalse.push("requires_user_or_company_identifier");
  if (!candidate.canaryRequestEnvelope) reasonsIfFalse.push("canary_request_not_defined");

  return {
    id: candidate.id,
    routeClass: candidate.routeClass,
    method: candidate.method,
    readonlyContractProven,
    clientContractExists: candidate.clientContractExists,
    serverHandlerPresent: candidate.serverHandlerPresent,
    readonlyDbPortUsed: candidate.readonlyDbPortUsed,
    mutationKey: candidate.mutationKey,
    dbWritePossible: candidate.dbWritePossible || candidate.writeAdapterPresent,
    rawPayloadLogging: candidate.rawPayloadLogging,
    rawRowsLogging: candidate.rawRowsLogging,
    postReadRpcAllowed,
    safeForCanary: reasonsIfFalse.length === 0,
    reasonsIfFalse,
  };
}

export function buildProductionBusinessReadonlyCanaryWhitelist(params: {
  postReadRpcApproved: boolean;
  candidates?: readonly ProductionBusinessReadonlyCanaryCandidate[];
}): {
  classifications: ProductionBusinessReadonlyCanaryClassification[];
  whitelist: ProductionBusinessReadonlyCanarySafeRoute[];
} {
  const candidates = params.candidates ?? PRODUCTION_BUSINESS_READONLY_CANARY_CANDIDATES;
  const classifications = candidates.map((candidate) =>
    classifyProductionBusinessReadonlyCanaryRoute(candidate, {
      postReadRpcApproved: params.postReadRpcApproved,
    }),
  );
  const whitelist = candidates
    .filter((candidate, index) => classifications[index]?.safeForCanary === true)
    .map((candidate) => ({
      id: candidate.id,
      routeClass: candidate.routeClass,
      method: candidate.method,
      path: candidate.path,
      canaryRequestEnvelope: candidate.canaryRequestEnvelope,
    }));
  return { classifications, whitelist };
}

export function validateProductionBusinessReadonlyCanaryRegistry(params: {
  classifications: readonly ProductionBusinessReadonlyCanaryClassification[];
}): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const operation of BFF_STAGING_MUTATION_ROUTES.map((route) => route.operation)) {
    if (!PRODUCTION_BUSINESS_READONLY_FORBIDDEN_MUTATION_OPERATIONS.includes(operation as never)) {
      errors.push(`unexpected_mutation_operation:${operation}`);
    }
  }
  for (const classification of params.classifications) {
    if (classification.safeForCanary && classification.mutationKey) {
      errors.push(`mutation_candidate_marked_safe:${classification.id}`);
    }
    if (classification.safeForCanary && classification.dbWritePossible) {
      errors.push(`write_candidate_marked_safe:${classification.id}`);
    }
  }
  return { passed: errors.length === 0, errors };
}

const sortedFinite = (values: number[]): number[] =>
  values.filter(Number.isFinite).sort((left, right) => left - right);

export function percentile(values: number[], fraction: number): number | null {
  const sorted = sortedFinite(values);
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index] ?? null;
}

const increment = (record: Record<string, number>, key: string): void => {
  record[key] = (record[key] ?? 0) + 1;
};

export function summarizeProductionBusinessReadonlyCanaryMetrics(
  metrics: readonly ProductionBusinessReadonlyCanaryMetric[],
): ProductionBusinessReadonlyCanaryMetricsSummary {
  const statusClassCounts: Record<string, number> = {};
  const errorCategoryCounts: Record<string, number> = {};
  for (const metric of metrics) {
    increment(statusClassCounts, metric.statusClass);
    if (metric.errorCategory) increment(errorCategoryCounts, metric.errorCategory);
  }
  const completed = metrics.filter((metric) => metric.statusClass === "2xx").length;
  const attempted = metrics.length;
  const latencies = metrics.map((metric) => metric.latencyMs).filter(Number.isFinite) as number[];
  return {
    totalRequestsAttempted: attempted,
    totalRequestsCompleted: completed,
    statusClassCounts,
    latencyP50: percentile(latencies, 0.5),
    latencyP95: percentile(latencies, 0.95),
    latencyP99: percentile(latencies, 0.99),
    observedErrorRate: attempted > 0 ? (attempted - completed) / attempted : 1,
    errorCategoryCounts,
  };
}

export function evaluateProductionBusinessReadonlyCanaryAbortCriteria(params: {
  healthStatus: number | null;
  readyStatus: number | null;
  observedErrorRate: number;
  maxErrorRate: number;
  unexpectedWriteRouteDetected: boolean;
  redactionUnsafe: boolean;
}): ProductionBusinessReadonlyCanaryAbortDecision {
  const reasons: string[] = [];
  if (params.healthStatus !== 200) reasons.push("health_failure");
  if (params.readyStatus !== 200) reasons.push("ready_failure");
  if (params.observedErrorRate > params.maxErrorRate) reasons.push("error_rate_exceeded");
  if (params.unexpectedWriteRouteDetected) reasons.push("unexpected_write_route");
  if (params.redactionUnsafe) reasons.push("redaction_unsafe");
  return { abort: reasons.length > 0, reasons };
}

export function validateProductionBusinessReadonlyCanaryMetricLog(value: unknown): {
  passed: boolean;
  errors: string[];
} {
  const allowedKeys = new Set([
    "routeClass",
    "statusClass",
    "latencyP50",
    "latencyP95",
    "latencyP99",
    "errorCategory",
    "requestCount",
    "successCount",
    "failureCount",
  ]);
  const forbiddenPattern =
    /(url|uri|token|secret|authorization|cookie|env|payload|body|response|requestBody|responseBody|row|rows|db|redis|user|company|identifier|id)$/i;
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { passed: false, errors: ["metric_log_not_object"] };
  }
  for (const [key, item] of Object.entries(value)) {
    if (!allowedKeys.has(key)) errors.push(`forbidden_metric_key:${key}`);
    if (forbiddenPattern.test(key)) errors.push(`forbidden_metric_key:${key}`);
    if (typeof item === "string" && /(https?:\/\/|bearer\s+|postgres(?:ql)?:\/\/|redis:\/\/)/i.test(item)) {
      errors.push(`forbidden_metric_value:${key}`);
    }
  }
  return { passed: errors.length === 0, errors };
}

const loadCanaryDotenv = (): void => {
  loadDotenv({ path: ".env.agent.staging.local", override: false });
  loadDotenv({ path: ".env.staging.local", override: false });
  loadDotenv({ path: ".env.local", override: false });
  loadDotenv({ path: ".env", override: false });
};

const readEnv = (...keys: string[]): string =>
  keys.map((key) => String(process.env[key] ?? "").trim()).find(Boolean) ?? "";

export function classifyProductionBusinessReadonlyCanaryErrorCode(
  code: unknown,
): ProductionBusinessReadonlyCanaryErrorCategory {
  if (typeof code !== "string" || code.length === 0) return "error_code_unavailable";
  if (code.includes("AUTH")) return "auth_category";
  if (code.includes("INVALID_REQUEST") || code.includes("INVALID_OPERATION")) {
    return "dto_validation_category";
  }
  if (code.includes("ROUTE_NOT_FOUND")) return "route_not_live_category";
  if (code.includes("PORT_UNAVAILABLE")) return "readonly_route_disabled_category";
  if (code.includes("UPSTREAM")) return "readonly_upstream_category";
  return "other_safe_error_category";
}

const readBffErrorCode = async (response: Response): Promise<string | null> => {
  if (response.ok) {
    await response.text().catch(() => undefined);
    return null;
  }
  const text = await response.text().catch(() => "");
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      "ok" in parsed &&
      parsed.ok === false &&
      "error" in parsed &&
      parsed.error &&
      typeof parsed.error === "object" &&
      "code" in parsed.error &&
      typeof parsed.error.code === "string"
    ) {
      return parsed.error.code;
    }
  } catch {
    // Keep diagnostics category-only; never surface the raw response body.
  }
  return null;
};

const getRenderServiceId = (): string => readEnv("RENDER_PRODUCTION_BFF_SERVICE_ID", "RENDER_SERVICE_ID");

const extractRenderEnvVarValue = (body: unknown, key: string): string => {
  const bodyRecord = body && typeof body === "object" ? (body as { envVars?: unknown }) : null;
  const items = Array.isArray(body)
    ? body
    : bodyRecord && Array.isArray(bodyRecord.envVars)
      ? bodyRecord.envVars
      : [];
  for (const item of items) {
    const envVar =
      item && typeof item === "object" && "envVar" in item && item.envVar && typeof item.envVar === "object"
        ? item.envVar
        : item;
    if (
      envVar &&
      typeof envVar === "object" &&
      "key" in envVar &&
      envVar.key === key &&
      "value" in envVar &&
      typeof envVar.value === "string" &&
      envVar.value.length > 0
    ) {
      return envVar.value;
    }
  }
  return "";
};

export async function resolveProductionBusinessReadonlyCanaryServerAuthSecret(params: {
  env?: Partial<NodeJS.ProcessEnv>;
  fetchImpl?: typeof fetch;
  preferRenderApi?: boolean;
} = {}): Promise<ProductionBusinessReadonlyCanaryAuthResolution> {
  const originalEnv = process.env;
  if (params.env) process.env = { ...process.env, ...params.env };
  try {
    const localSecret = readEnv("BFF_SERVER_AUTH_SECRET");
    const renderToken = readEnv("RENDER_API_TOKEN");
    const renderServiceId = getRenderServiceId();
    const fetchImpl = params.fetchImpl ?? fetch;
    const preferRenderApi = params.preferRenderApi ?? true;

    if (preferRenderApi && renderToken && renderServiceId) {
      try {
        const response = await fetchImpl(
          `https://api.render.com/v1/services/${encodeURIComponent(renderServiceId)}/env-vars?limit=100`,
          {
            method: "GET",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${renderToken}`,
            },
          },
        );
        if (response.ok) {
          const body = await response.json().catch(() => null);
          const renderSecret = extractRenderEnvVarValue(body, "BFF_SERVER_AUTH_SECRET");
          if (renderSecret) {
            return {
              source: "render_api_in_memory",
              status: "present",
              secret: renderSecret,
              secretPrinted: false,
              secretWritten: false,
            };
          }
          return localSecret
            ? {
                source: "local_env",
                status: "render_secret_missing",
                secret: localSecret,
                secretPrinted: false,
                secretWritten: false,
              }
            : {
                source: "missing",
                status: "render_secret_missing",
                secret: "",
                secretPrinted: false,
                secretWritten: false,
              };
        }
        return localSecret
          ? {
              source: "local_env",
              status: "render_api_unreadable",
              secret: localSecret,
              secretPrinted: false,
              secretWritten: false,
            }
          : {
              source: "missing",
              status: "render_api_unreadable",
              secret: "",
              secretPrinted: false,
              secretWritten: false,
            };
      } catch {
        return localSecret
          ? {
              source: "local_env",
              status: "render_api_unreadable",
              secret: localSecret,
              secretPrinted: false,
              secretWritten: false,
            }
          : {
              source: "missing",
              status: "render_api_unreadable",
              secret: "",
              secretPrinted: false,
              secretWritten: false,
            };
      }
    }

    if (localSecret) {
      return {
        source: "local_env",
        status: preferRenderApi ? "render_api_not_configured" : "local_secret_present",
        secret: localSecret,
        secretPrinted: false,
        secretWritten: false,
      };
    }
    return {
      source: "missing",
      status: "missing",
      secret: "",
      secretPrinted: false,
      secretWritten: false,
    };
  } finally {
    process.env = originalEnv;
  }
}

const statusClass = (status: number | null): string =>
  status == null ? "error" : `${Math.floor(status / 100)}xx`;

const timeoutFetch = async (
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const probeProductionBff = async (
  baseUrl: string,
  pathName: "/health" | "/ready",
  timeoutMs: number,
): Promise<{
  status: number | null;
  readPortsConfigured: boolean | null;
  mutationRoutesEnabled: boolean | null;
}> => {
  try {
    const response = await timeoutFetch(
      new URL(pathName, baseUrl).toString(),
      { method: "GET", headers: { accept: "application/json" } },
      timeoutMs,
    );
    let readPortsConfigured: boolean | null = null;
    let mutationRoutesEnabled: boolean | null = null;
    if (pathName === "/ready") {
      const body = await response.json().catch(() => null);
      const data =
        body && typeof body === "object" && "data" in body && typeof body.data === "object"
          ? (body.data as Record<string, unknown>)
          : {};
      readPortsConfigured = data.readPortsConfigured === true;
      mutationRoutesEnabled = data.mutationRoutesEnabled === true;
    }
    return { status: response.status, readPortsConfigured, mutationRoutesEnabled };
  } catch {
    return { status: null, readPortsConfigured: null, mutationRoutesEnabled: null };
  }
};

export async function runProductionBusinessReadonlyCanary(params: {
  maxRequests?: number;
  requestTimeoutMs?: number;
  maxErrorRate?: number;
  whitelist?: readonly ProductionBusinessReadonlyCanarySafeRoute[];
} = {}): Promise<ProductionBusinessReadonlyCanaryRunResult & {
  productionHealthBefore: number | null;
  productionReadyBefore: number | null;
  productionHealthAfter: number | null;
  productionReadyAfter: number | null;
  readPortsConfigured: boolean | null;
  mutationRoutesEnabled: boolean | null;
}> {
  loadCanaryDotenv();
  const baseUrl = readEnv(
    "BFF_PRODUCTION_BASE_URL",
    "EXPO_PUBLIC_BFF_PRODUCTION_BASE_URL",
    "PRODUCTION_BFF_BASE_URL",
    "PROD_BFF_BASE_URL",
  );
  const auth = await resolveProductionBusinessReadonlyCanaryServerAuthSecret();
  const requestTimeoutMs = params.requestTimeoutMs ?? 8_000;
  const maxErrorRate = params.maxErrorRate ?? 0;
  const { whitelist } =
    params.whitelist == null
      ? buildProductionBusinessReadonlyCanaryWhitelist({ postReadRpcApproved: true })
      : { whitelist: params.whitelist };
  const maxRequests = Math.max(0, Math.min(params.maxRequests ?? whitelist.length, whitelist.length));
  const routes = whitelist.slice(0, maxRequests);
  const healthBefore = baseUrl
    ? await probeProductionBff(baseUrl, "/health", requestTimeoutMs)
    : { status: null, readPortsConfigured: null, mutationRoutesEnabled: null };
  const readyBefore = baseUrl
    ? await probeProductionBff(baseUrl, "/ready", requestTimeoutMs)
    : { status: null, readPortsConfigured: null, mutationRoutesEnabled: null };

  const preAbort = evaluateProductionBusinessReadonlyCanaryAbortCriteria({
    healthStatus: healthBefore.status,
    readyStatus: readyBefore.status,
    observedErrorRate: 0,
    maxErrorRate,
    unexpectedWriteRouteDetected: false,
    redactionUnsafe: false,
  });
  const metrics: ProductionBusinessReadonlyCanaryMetric[] = [];
  let abortTriggered = preAbort.abort;
  let abortReason = preAbort.reasons[0] ?? null;

  if (!abortTriggered && baseUrl && auth.secret) {
    for (const route of routes) {
      const startedAt = Date.now();
      try {
        const response = await timeoutFetch(
          new URL(route.path, baseUrl).toString(),
          {
            method: route.method,
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              authorization: `Bearer ${auth.secret}`,
            },
            body: route.method === "POST" ? JSON.stringify(route.canaryRequestEnvelope) : undefined,
          },
          requestTimeoutMs,
        );
        const errorCode = await readBffErrorCode(response);
        const safeErrorCategory = classifyProductionBusinessReadonlyCanaryErrorCode(errorCode);
        metrics.push({
          routeClass: route.routeClass,
          statusClass: statusClass(response.status),
          latencyMs: Date.now() - startedAt,
          errorCategory: response.ok ? null : safeErrorCategory,
        });
      } catch (error) {
        metrics.push({
          routeClass: route.routeClass,
          statusClass: "error",
          latencyMs: null,
          errorCategory: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
        });
      }
      const summary = summarizeProductionBusinessReadonlyCanaryMetrics(metrics);
      const decision = evaluateProductionBusinessReadonlyCanaryAbortCriteria({
        healthStatus: healthBefore.status,
        readyStatus: readyBefore.status,
        observedErrorRate: summary.observedErrorRate,
        maxErrorRate,
        unexpectedWriteRouteDetected: false,
        redactionUnsafe: false,
      });
      if (decision.abort) {
        abortTriggered = true;
        abortReason = decision.reasons[0] ?? "abort_triggered";
        break;
      }
    }
  } else if (!abortTriggered) {
    abortTriggered = true;
    abortReason = baseUrl ? "server_auth_missing" : "production_base_url_missing";
  }

  const healthAfter = baseUrl
    ? await probeProductionBff(baseUrl, "/health", requestTimeoutMs)
    : { status: null, readPortsConfigured: null, mutationRoutesEnabled: null };
  const readyAfter = baseUrl
    ? await probeProductionBff(baseUrl, "/ready", requestTimeoutMs)
    : { status: null, readPortsConfigured: null, mutationRoutesEnabled: null };
  const summary = summarizeProductionBusinessReadonlyCanaryMetrics(metrics);
  return {
    canaryStarted: routes.length > 0 && !preAbort.abort && Boolean(baseUrl) && Boolean(auth.secret),
    productionBusinessReadonlyCallsMade: summary.totalRequestsAttempted > 0,
    whitelistRouteCount: whitelist.length,
    whitelistRouteClasses: whitelist.map((route) => route.routeClass),
    serverAuthSource: auth.source,
    serverAuthResolutionStatus: auth.status,
    totalRequestsAttempted: summary.totalRequestsAttempted,
    totalRequestsCompleted: summary.totalRequestsCompleted,
    statusClassCounts: summary.statusClassCounts,
    latencyP50: summary.latencyP50,
    latencyP95: summary.latencyP95,
    latencyP99: summary.latencyP99,
    observedErrorRate: summary.observedErrorRate,
    abortTriggered,
    abortReason,
    errorCategoryCounts: summary.errorCategoryCounts,
    productionHealthBefore: healthBefore.status,
    productionReadyBefore: readyBefore.status,
    productionHealthAfter: healthAfter.status,
    productionReadyAfter: readyAfter.status,
    readPortsConfigured: readyAfter.readPortsConfigured,
    mutationRoutesEnabled: readyAfter.mutationRoutesEnabled,
  };
}
