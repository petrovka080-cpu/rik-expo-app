import type { BffResponseEnvelope } from "../../src/shared/scale/bffContracts";
import type { CachePolicyRoute } from "../../src/shared/scale/cachePolicies";
import { getInvalidationTagsForOperation } from "../../src/shared/scale/cacheInvalidation";
import {
  evaluateCacheShadowRead,
  runCacheSyntheticShadowCanary,
  type CacheShadowMonitor,
  type CacheShadowMonitorSnapshot,
  type CacheShadowRuntimeConfig,
  type CacheSyntheticShadowCanaryResult,
} from "../../src/shared/scale/cacheShadowRuntime";
import type { CacheAdapter } from "../../src/shared/scale/cacheAdapters";
import type { IdempotencyPolicyOperation } from "../../src/shared/scale/idempotencyPolicies";
import { getIdempotencyPolicyForBffMutationOperation } from "../../src/shared/scale/idempotencyPolicies";
import type { JobType } from "../../src/shared/scale/jobPolicies";
import { getJobPolicyForBffMutationOperation } from "../../src/shared/scale/jobPolicies";
import type { RateLimitEnforcementOperation } from "../../src/shared/scale/rateLimitPolicies";
import {
  getRateEnforcementPolicyForBffMutationOperation,
  getRateEnforcementPolicyForBffReadOperation,
} from "../../src/shared/scale/rateLimitPolicies";
import {
  observeRateLimitPrivateSmokeInShadowMonitor,
  runRateLimitSyntheticEnforcementCanary,
  type RateLimitShadowMonitor,
  type RateLimitShadowMonitorSnapshot,
  type RateLimitPrivateSmokeRunner,
  type RateLimitPrivateSmokeResult,
  type RateLimitSyntheticEnforcementCanaryResult,
  type RuntimeRateEnforcementProvider,
} from "../../src/shared/scale/rateLimitAdapters";
import type { RateLimitKeyInput } from "../../src/shared/scale/rateLimitKeySafety";
import {
  BFF_OBSERVABILITY_METADATA,
  type BffObservabilityMetadata,
} from "../../src/shared/scale/scaleObservabilityEvents";
import {
  BFF_MUTATION_HANDLER_OPERATIONS,
  handleAccountantPaymentApply,
  handleDirectorApprovalApply,
  handleProposalSubmit,
  handleRequestItemUpdate,
  handleWarehouseReceiveApply,
  type BffMutationInput,
  type BffMutationOperation,
} from "../../src/shared/scale/bffMutationHandlers";
import type { BffMutationPorts } from "../../src/shared/scale/bffMutationPorts";
import {
  BFF_READ_HANDLER_OPERATIONS,
  handleAccountantInvoiceList,
  handleDirectorPendingList,
  handleMarketplaceCatalogSearch,
  handleRequestProposalList,
  handleWarehouseLedgerList,
  type BffReadInput,
  type BffReadOperation,
} from "../../src/shared/scale/bffReadHandlers";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";
import { buildBffError } from "../../src/shared/scale/bffSafety";
import {
  BFF_SHADOW_MUTATION_PAYLOAD,
  createBffShadowFixturePorts,
} from "../../src/shared/scale/bffShadowFixtures";

export type BffStagingRouteKind = "health" | "readiness" | "read" | "mutation" | "monitor" | "diagnostic";

export type BffStagingRouteDefinition = {
  operation:
    | BffReadOperation
    | BffMutationOperation
    | "health"
    | "readiness"
    | "cache.shadow_monitor"
    | "cache.shadow_canary"
    | "rate_limit.shadow_monitor"
    | "rate_limit.private_smoke";
  kind: BffStagingRouteKind;
  method: "GET" | "POST";
  path: string;
  enabledByDefault: boolean;
  requiresIdempotencyMetadata: boolean;
  requiresRateLimitMetadata: boolean;
  cachePolicyRoute?: CachePolicyRoute;
  cachePolicyDefaultEnabled?: false;
  invalidationTags?: readonly string[];
  jobPolicyType?: JobType;
  jobPolicyDefaultEnabled?: false;
  jobExecutionEnabledByDefault?: false;
  idempotencyPolicyOperation?: IdempotencyPolicyOperation;
  idempotencyPolicyDefaultEnabled?: false;
  idempotencyPersistenceEnabledByDefault?: false;
  rateLimitPolicyOperation?: RateLimitEnforcementOperation;
  rateLimitPolicyDefaultEnabled?: false;
  rateLimitEnforcementEnabledByDefault?: false;
  observability?: BffObservabilityMetadata;
  observabilityExternalExportEnabledByDefault?: false;
};

export type BffStagingServerConfig = {
  mutationRoutesEnabled?: boolean;
  serverAuthConfigured?: boolean;
  idempotencyMetadataRequired?: boolean;
  rateLimitMetadataRequired?: boolean;
};

export type BffStagingRateLimitShadowDeps = {
  provider: RuntimeRateEnforcementProvider;
  monitor: RateLimitShadowMonitor;
};

export type BffStagingCacheShadowDeps = {
  adapter: CacheAdapter;
  config: CacheShadowRuntimeConfig;
  monitor: CacheShadowMonitor;
};

export type BffStagingCacheShadowRuntimeState = {
  status: "configured" | "disabled" | "adapter_unavailable";
  enabled: boolean;
  productionEnabledFlagTruthy: boolean;
  mode: CacheShadowRuntimeConfig["mode"];
  percent: number;
  routeAllowlistCount: number;
  envKeyPresence: CacheShadowRuntimeConfig["envKeyPresence"];
  providerKind: ReturnType<CacheAdapter["getStatus"]>["kind"] | "not_configured";
  providerEnabled: boolean;
  externalNetworkEnabled: boolean;
  reason:
    | "configured"
    | "config_not_supplied"
    | "production_flag_disabled"
    | "mode_disabled"
    | "adapter_not_configured"
    | "adapter_unavailable";
  secretsExposed: false;
  envValuesExposed: false;
};

export type BffStagingServerDeps = {
  readPorts?: BffReadPorts;
  mutationPorts?: BffMutationPorts;
  cacheShadow?: BffStagingCacheShadowDeps | null;
  cacheShadowRuntime?: BffStagingCacheShadowRuntimeState | null;
  rateLimitShadow?: BffStagingRateLimitShadowDeps | null;
  rateLimitPrivateSmoke?: RateLimitPrivateSmokeRunner | null;
  config?: BffStagingServerConfig;
};

export type BffStagingRequestEnvelope = {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  headers?: Record<string, unknown> | null;
};

export type BffStagingBoundaryResponse = {
  status: number;
  body: BffResponseEnvelope<unknown>;
  headers: {
    "content-type": "application/json";
    "cache-control": "no-store";
  };
};

export type BffStagingRequestPayload = {
  input: Record<string, unknown>;
  metadata: Record<string, unknown>;
};

export type BffStagingShadowSummary = {
  status: "run" | "not_run";
  matches: number;
  mismatches: number;
  trafficMigrated: false;
  productionTouched: false;
  stagingWrites: false;
  networkUsed: false;
};

export const BFF_STAGING_HEALTH_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "health",
  kind: "health",
  method: "GET",
  path: "/health",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_READINESS_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "readiness",
  kind: "readiness",
  method: "GET",
  path: "/ready",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_RATE_LIMIT_SHADOW_MONITOR_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "rate_limit.shadow_monitor",
  kind: "monitor",
  method: "GET",
  path: "/api/staging-bff/monitor/rate-limit-shadow",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_RATE_LIMIT_PRIVATE_SMOKE_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "rate_limit.private_smoke",
  kind: "diagnostic",
  method: "POST",
  path: "/api/staging-bff/diagnostics/rate-limit-private-smoke",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "cache.shadow_monitor",
  kind: "monitor",
  method: "GET",
  path: "/api/staging-bff/monitor/cache-shadow",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_CACHE_SHADOW_CANARY_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "cache.shadow_canary",
  kind: "diagnostic",
  method: "POST",
  path: "/api/staging-bff/diagnostics/cache-shadow-canary",
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
});

export const BFF_STAGING_READ_ROUTES: readonly BffStagingRouteDefinition[] = Object.freeze([
  {
    operation: "request.proposal.list",
    kind: "read",
    method: "POST",
    path: "/api/staging-bff/read/request-proposal-list",
    enabledByDefault: true,
    requiresIdempotencyMetadata: false,
    requiresRateLimitMetadata: false,
    cachePolicyRoute: "request.proposal.list",
    cachePolicyDefaultEnabled: false,
    rateLimitPolicyOperation: getRateEnforcementPolicyForBffReadOperation("request.proposal.list")?.operation,
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "marketplace.catalog.search",
    kind: "read",
    method: "POST",
    path: "/api/staging-bff/read/marketplace-catalog-search",
    enabledByDefault: true,
    requiresIdempotencyMetadata: false,
    requiresRateLimitMetadata: false,
    cachePolicyRoute: "marketplace.catalog.search",
    cachePolicyDefaultEnabled: false,
    rateLimitPolicyOperation: getRateEnforcementPolicyForBffReadOperation("marketplace.catalog.search")?.operation,
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "warehouse.ledger.list",
    kind: "read",
    method: "POST",
    path: "/api/staging-bff/read/warehouse-ledger-list",
    enabledByDefault: true,
    requiresIdempotencyMetadata: false,
    requiresRateLimitMetadata: false,
    cachePolicyRoute: "warehouse.ledger.list",
    cachePolicyDefaultEnabled: false,
    rateLimitPolicyOperation: getRateEnforcementPolicyForBffReadOperation("warehouse.ledger.list")?.operation,
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "accountant.invoice.list",
    kind: "read",
    method: "POST",
    path: "/api/staging-bff/read/accountant-invoice-list",
    enabledByDefault: true,
    requiresIdempotencyMetadata: false,
    requiresRateLimitMetadata: false,
    cachePolicyRoute: "accountant.invoice.list",
    cachePolicyDefaultEnabled: false,
    rateLimitPolicyOperation: getRateEnforcementPolicyForBffReadOperation("accountant.invoice.list")?.operation,
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "director.pending.list",
    kind: "read",
    method: "POST",
    path: "/api/staging-bff/read/director-pending-list",
    enabledByDefault: true,
    requiresIdempotencyMetadata: false,
    requiresRateLimitMetadata: false,
    cachePolicyRoute: "director.pending.list",
    cachePolicyDefaultEnabled: false,
    rateLimitPolicyOperation: getRateEnforcementPolicyForBffReadOperation("director.pending.list")?.operation,
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
]);

const getMutationJobPolicyType = (operation: BffMutationOperation): JobType | undefined =>
  getJobPolicyForBffMutationOperation(operation)?.jobType;

const getMutationIdempotencyPolicyOperation = (
  operation: BffMutationOperation,
): IdempotencyPolicyOperation | undefined =>
  getIdempotencyPolicyForBffMutationOperation(operation)?.operation;

const getMutationRateLimitPolicyOperation = (
  operation: BffMutationOperation,
): RateLimitEnforcementOperation | undefined =>
  getRateEnforcementPolicyForBffMutationOperation(operation)?.operation;

export const BFF_STAGING_MUTATION_ROUTES: readonly BffStagingRouteDefinition[] = Object.freeze([
  {
    operation: "proposal.submit",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/proposal-submit",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("proposal.submit"),
    jobPolicyType: getMutationJobPolicyType("proposal.submit"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("proposal.submit"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("proposal.submit"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "warehouse.receive.apply",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/warehouse-receive-apply",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("warehouse.receive.apply"),
    jobPolicyType: getMutationJobPolicyType("warehouse.receive.apply"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("warehouse.receive.apply"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("warehouse.receive.apply"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "accountant.payment.apply",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/accountant-payment-apply",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("accountant.payment.apply"),
    jobPolicyType: getMutationJobPolicyType("accountant.payment.apply"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("accountant.payment.apply"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("accountant.payment.apply"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "director.approval.apply",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/director-approval-apply",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("director.approval.apply"),
    jobPolicyType: getMutationJobPolicyType("director.approval.apply"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("director.approval.apply"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("director.approval.apply"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "request.item.update",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/request-item-update",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("request.item.update"),
    jobPolicyType: getMutationJobPolicyType("request.item.update"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("request.item.update"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("request.item.update"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
]);

export const BFF_STAGING_ROUTE_REGISTRY: readonly BffStagingRouteDefinition[] = Object.freeze([
  BFF_STAGING_HEALTH_ROUTE,
  BFF_STAGING_READINESS_ROUTE,
  BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE,
  BFF_STAGING_CACHE_SHADOW_CANARY_ROUTE,
  BFF_STAGING_RATE_LIMIT_SHADOW_MONITOR_ROUTE,
  BFF_STAGING_RATE_LIMIT_PRIVATE_SMOKE_ROUTE,
  ...BFF_STAGING_READ_ROUTES,
  ...BFF_STAGING_MUTATION_ROUTES,
]);

export const BFF_STAGING_SERVER_ENV_NAMES = Object.freeze([
  "STAGING_BFF_BASE_URL",
  "BFF_SERVER_AUTH_SECRET",
  "BFF_DATABASE_READONLY_URL",
  "BFF_MUTATION_ENABLED",
  "BFF_IDEMPOTENCY_METADATA_ENABLED",
  "BFF_RATE_LIMIT_METADATA_ENABLED",
  "SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED",
  "SCALE_REDIS_CACHE_SHADOW_MODE",
  "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST",
  "SCALE_REDIS_CACHE_SHADOW_PERCENT",
]);

const RESPONSE_HEADERS = Object.freeze({
  "content-type": "application/json",
  "cache-control": "no-store",
} as const);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const buildResponse = (
  status: number,
  body: BffResponseEnvelope<unknown>,
): BffStagingBoundaryResponse => ({
  status,
  body,
  headers: { ...RESPONSE_HEADERS },
});

const buildErrorResponse = (
  status: number,
  code: string,
  message: unknown,
): BffStagingBoundaryResponse =>
  buildResponse(status, {
    ok: false,
    error: buildBffError(code, message),
  });

export function isBffStagingResponseEnvelope(value: unknown): value is BffResponseEnvelope<unknown> {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;
  if (value.ok === true) return Object.prototype.hasOwnProperty.call(value, "data");
  if (!isRecord(value.error)) return false;
  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

export function parseBffStagingRequestPayload(body: unknown): BffStagingRequestPayload | null {
  if (body == null) {
    return { input: {}, metadata: {} };
  }

  if (!isRecord(body)) return null;

  const input = Object.prototype.hasOwnProperty.call(body, "input")
    ? body.input
    : {};
  const metadata = Object.prototype.hasOwnProperty.call(body, "metadata")
    ? body.metadata
    : {};

  if (!isRecord(input) || !isRecord(metadata)) return null;

  return {
    input,
    metadata,
  };
}

export function extractBffStagingAuthContext(
  headers: Record<string, unknown> | null | undefined,
  config: BffStagingServerConfig = {},
): {
  authConfigured: boolean;
  authHeader: "present_redacted" | "missing";
  accepted: boolean;
} {
  const authHeader = typeof headers?.authorization === "string" && headers.authorization.trim()
    ? "present_redacted"
    : "missing";
  const authConfigured = config.serverAuthConfigured === true;

  return {
    authConfigured,
    authHeader,
    accepted: authConfigured ? authHeader === "present_redacted" : true,
  };
}

const findRoute = (request: BffStagingRequestEnvelope): BffStagingRouteDefinition | undefined =>
  BFF_STAGING_ROUTE_REGISTRY.find(
    (route) => route.method === request.method && route.path === request.path,
  );

const hasPresentMetadata = (metadata: Record<string, unknown>, key: string): boolean =>
  metadata[key] === "present_redacted" || metadata[key] === true;

const getTextRecordValue = (
  record: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
};

const getHeaderText = (
  headers: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined => {
  const lowerKey = key.toLowerCase();
  const value = headers?.[lowerKey] ?? headers?.[key];
  const normalized = Array.isArray(value) ? value[0] : value;
  if (typeof normalized !== "string") return undefined;
  const trimmed = normalized.trim();
  return trimmed ? trimmed : undefined;
};

export function buildBffStagingRateLimitKeyInput(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  headers?: Record<string, unknown> | null;
}): RateLimitKeyInput {
  const metadata = params.payload.metadata;
  const input = params.payload.input;
  return {
    actorId: getTextRecordValue(metadata, "rateLimitActorKey"),
    companyId: getTextRecordValue(metadata, "rateLimitCompanyKey"),
    routeKey: params.route.operation,
    ipOrDeviceKey:
      getTextRecordValue(metadata, "rateLimitIpOrDeviceKey") ??
      getHeaderText(params.headers, "x-bff-rate-limit-device-key"),
    idempotencyKey:
      getTextRecordValue(metadata, "rateLimitIdempotencyKey") ??
      getTextRecordValue(input, "idempotencyKey"),
  };
}

function observeBffStagingRateLimitShadow(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  headers?: Record<string, unknown> | null;
  rateLimitShadow?: BffStagingRateLimitShadowDeps | null;
}): void {
  const operation = params.route.rateLimitPolicyOperation;
  if (!operation || !params.rateLimitShadow) return;

  const keyInput = buildBffStagingRateLimitKeyInput({
    route: params.route,
    payload: params.payload,
    headers: params.headers,
  });
  const shadow = params.rateLimitShadow;
  void shadow.provider
    .evaluate({ operation, keyInput })
    .then((decision) => shadow.monitor.observe(decision))
    .catch(() => undefined);
}

function observeBffStagingCacheShadow(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  cacheShadow?: BffStagingCacheShadowDeps | null;
}): void {
  const route = params.route.cachePolicyRoute;
  if (!route || !params.cacheShadow) return;
  const cacheShadow = params.cacheShadow;
  void evaluateCacheShadowRead({
    adapter: cacheShadow.adapter,
    config: cacheShadow.config,
    route,
    input: params.payload.input,
  })
    .then((decision) => cacheShadow.monitor.observe(decision))
    .catch(() => undefined);
}

const buildRateLimitShadowMonitorEnvelope = (
  snapshot: RateLimitShadowMonitorSnapshot,
): Record<string, unknown> => ({
  status: "ready",
  wouldAllowCount: snapshot.wouldAllowCount,
  wouldThrottleCount: snapshot.wouldThrottleCount,
  keyCardinalityRedacted: snapshot.keyCardinalityRedacted,
  observedDecisionCount: snapshot.observedDecisionCount,
  invalidDecisionCount: snapshot.invalidDecisionCount,
  aggregateEventsRecorded: snapshot.aggregateEventsRecorded,
  aggregateMetricsRecorded: snapshot.aggregateMetricsRecorded,
  blockedDecisionsObserved: snapshot.blockedDecisionsObserved,
  realUsersBlocked: false,
  rawKeysStored: false,
  rawKeysPrinted: false,
  rawPayloadLogged: false,
  piiLogged: false,
});

const buildCacheShadowMonitorEnvelope = (
  snapshot: CacheShadowMonitorSnapshot,
): Record<string, unknown> => ({
  status: "ready",
  observedDecisionCount: snapshot.observedDecisionCount,
  shadowReadAttemptedCount: snapshot.shadowReadAttemptedCount,
  hitCount: snapshot.hitCount,
  missCount: snapshot.missCount,
  skippedCount: snapshot.skippedCount,
  unsafeKeyCount: snapshot.unsafeKeyCount,
  errorCount: snapshot.errorCount,
  responseChanged: false,
  realUserPayloadStored: false,
  rawKeysStored: false,
  rawKeysPrinted: false,
  rawPayloadLogged: false,
  piiLogged: false,
});

export const buildCacheShadowRuntimeState = (
  config: CacheShadowRuntimeConfig | null | undefined,
  adapter?: CacheAdapter | null,
): BffStagingCacheShadowRuntimeState => {
  const adapterStatus = adapter?.getStatus();
  const base = {
    enabled: config?.enabled ?? false,
    productionEnabledFlagTruthy: config?.productionEnabledFlagTruthy ?? false,
    mode: config?.mode ?? "disabled",
    percent: config?.percent ?? 0,
    routeAllowlistCount: config?.routeAllowlist.length ?? 0,
    envKeyPresence: config?.envKeyPresence ?? {
      productionEnabled: false,
      mode: false,
      routeAllowlist: false,
      percent: false,
      url: false,
      namespace: false,
      commandTimeout: false,
    },
    providerKind: adapterStatus?.kind ?? "not_configured",
    providerEnabled: adapterStatus?.enabled ?? false,
    externalNetworkEnabled: adapterStatus?.externalNetworkEnabled ?? false,
    secretsExposed: false,
    envValuesExposed: false,
  } as const;

  if (!config) {
    return {
      ...base,
      status: "disabled",
      reason: "config_not_supplied",
    };
  }
  if (!config.productionEnabledFlagTruthy) {
    return {
      ...base,
      status: "disabled",
      reason: "production_flag_disabled",
    };
  }
  if (config.mode === "disabled" || !config.enabled) {
    return {
      ...base,
      status: "disabled",
      reason: "mode_disabled",
    };
  }
  if (!adapter) {
    return {
      ...base,
      status: "adapter_unavailable",
      reason: "adapter_not_configured",
    };
  }
  if (!adapterStatus?.enabled || !adapterStatus.externalNetworkEnabled) {
    return {
      ...base,
      status: "adapter_unavailable",
      reason: "adapter_unavailable",
    };
  }
  return {
    ...base,
    status: "configured",
    reason: "configured",
  };
};

const buildRateLimitPrivateSmokeEnvelope = (
  result: RateLimitPrivateSmokeResult,
  enforcementCanary?: RateLimitSyntheticEnforcementCanaryResult | null,
): Record<string, unknown> => ({
  status: result.status,
  operation: result.operation,
  providerKind: result.providerKind,
  providerEnabled: result.providerEnabled,
  externalNetworkEnabled: result.externalNetworkEnabled,
  namespacePresent: result.namespacePresent,
  syntheticIdentityUsed: result.syntheticIdentityUsed,
  realUserIdentityUsed: result.realUserIdentityUsed,
  wouldAllowVerified: result.wouldAllowVerified,
  wouldThrottleVerified: result.wouldThrottleVerified,
  cleanupAttempted: result.cleanupAttempted,
  cleanupOk: result.cleanupOk,
  ttlBounded: result.ttlBounded,
  enforcementEnabled: result.enforcementEnabled,
  productionUserBlocked: result.productionUserBlocked,
  rawKeyReturned: result.rawKeyReturned,
  rawPayloadLogged: result.rawPayloadLogged,
  piiLogged: result.piiLogged,
  reason: result.reason,
  enforcementCanaryAttempted: enforcementCanary?.attempted ?? false,
  enforcementCanaryMode: enforcementCanary?.mode ?? "disabled",
  enforcementCanaryAction: enforcementCanary?.action ?? "disabled",
  enforcementCanaryProviderState: enforcementCanary?.providerState ?? "disabled",
  enforcementCanaryBlockedVerified: enforcementCanary?.blockedVerified ?? false,
  enforcementCanarySyntheticIdentityUsed: enforcementCanary?.syntheticIdentityUsed ?? false,
  enforcementCanaryRealUserIdentityUsed: enforcementCanary?.realUserIdentityUsed ?? false,
  enforcementCanaryProductionUserBlocked: enforcementCanary?.productionUserBlocked ?? false,
  enforcementCanaryRawKeyReturned: enforcementCanary?.rawKeyReturned ?? false,
  enforcementCanaryRawPayloadLogged: enforcementCanary?.rawPayloadLogged ?? false,
  enforcementCanaryPiiLogged: enforcementCanary?.piiLogged ?? false,
  enforcementCanaryReason: enforcementCanary?.reason ?? "not_attempted",
});

const buildCacheShadowCanaryEnvelope = (
  result: CacheSyntheticShadowCanaryResult,
): Record<string, unknown> => ({
  status: result.status,
  route: result.route,
  providerKind: result.providerKind,
  providerEnabled: result.providerEnabled,
  externalNetworkEnabled: result.externalNetworkEnabled,
  mode: result.mode,
  syntheticIdentityUsed: result.syntheticIdentityUsed,
  realUserPayloadUsed: result.realUserPayloadUsed,
  shadowReadAttempted: result.shadowReadAttempted,
  cacheHitVerified: result.cacheHitVerified,
  responseChanged: result.responseChanged,
  cacheWriteSyntheticOnly: result.cacheWriteSyntheticOnly,
  cleanupAttempted: result.cleanupAttempted,
  cleanupOk: result.cleanupOk,
  ttlBounded: result.ttlBounded,
  rawKeyReturned: result.rawKeyReturned,
  rawPayloadLogged: result.rawPayloadLogged,
  piiLogged: result.piiLogged,
  reason: result.reason,
  commandProbeAttempted: result.commandProbeAttempted,
  commandProbeStatus: result.commandProbeStatus,
  commandSetAttempted: result.commandSetAttempted,
  commandSetOk: result.commandSetOk,
  commandGetAttempted: result.commandGetAttempted,
  commandGetOk: result.commandGetOk,
  commandValueMatched: result.commandValueMatched,
  commandDeleteAttempted: result.commandDeleteAttempted,
  commandDeleteOk: result.commandDeleteOk,
});

const invokeReadRoute = async (
  operation: BffReadOperation,
  ports: BffReadPorts,
  input: BffReadInput,
): Promise<BffResponseEnvelope<unknown>> => {
  switch (operation) {
    case "request.proposal.list":
      return handleRequestProposalList(ports, input);
    case "marketplace.catalog.search":
      return handleMarketplaceCatalogSearch(ports, input);
    case "warehouse.ledger.list":
      return handleWarehouseLedgerList(ports, input);
    case "accountant.invoice.list":
      return handleAccountantInvoiceList(ports, input);
    case "director.pending.list":
      return handleDirectorPendingList(ports, input);
  }
};

const invokeMutationRoute = async (
  operation: BffMutationOperation,
  ports: BffMutationPorts,
  input: BffMutationInput,
): Promise<BffResponseEnvelope<unknown>> => {
  switch (operation) {
    case "proposal.submit":
      return handleProposalSubmit(ports, input);
    case "warehouse.receive.apply":
      return handleWarehouseReceiveApply(ports, input);
    case "accountant.payment.apply":
      return handleAccountantPaymentApply(ports, input);
    case "director.approval.apply":
      return handleDirectorApprovalApply(ports, input);
    case "request.item.update":
      return handleRequestItemUpdate(ports, input);
  }
};

export async function handleBffStagingServerRequest(
  request: BffStagingRequestEnvelope,
  deps: BffStagingServerDeps = {},
): Promise<BffStagingBoundaryResponse> {
  const route = findRoute(request);
  const config = deps.config ?? {};

  if (!route) {
    return buildErrorResponse(404, "BFF_ROUTE_NOT_FOUND", "Unknown staging BFF route");
  }

  const auth = extractBffStagingAuthContext(request.headers, config);
  if (!auth.accepted) {
    return buildErrorResponse(401, "BFF_AUTH_REQUIRED", "Authentication envelope is required");
  }

  if (route.kind === "health") {
    return buildResponse(200, {
      ok: true,
      data: {
        status: "ok",
        serverBoundaryReady: true,
        productionTouched: false,
      },
    });
  }

  if (route.kind === "readiness") {
    const cacheShadowRuntime =
      deps.cacheShadowRuntime ?? buildCacheShadowRuntimeState(deps.cacheShadow?.config, deps.cacheShadow?.adapter);
    return buildResponse(200, {
      ok: true,
      data: {
        status: "ready",
        readRoutes: BFF_STAGING_READ_ROUTES.length,
        mutationRoutes: BFF_STAGING_MUTATION_ROUTES.length,
        readPortsConfigured: Boolean(deps.readPorts),
        mutationRoutesEnabledByDefault: false,
        mutationRoutesEnabled: config.mutationRoutesEnabled === true,
        requestEnvelopeValidation: true,
        responseEnvelopeValidation: true,
        redactedErrors: true,
        appRuntimeBffEnabled: false,
        cacheShadowMonitorConfigured: Boolean(deps.cacheShadow),
        cacheShadowRuntime,
        rateLimitShadowMonitorConfigured: Boolean(deps.rateLimitShadow),
      },
    });
  }

  if (route.kind === "monitor") {
    if (route.operation === "cache.shadow_monitor") {
      if (!deps.cacheShadow) {
        return buildErrorResponse(
          503,
          "BFF_CACHE_SHADOW_MONITOR_UNAVAILABLE",
          "Cache shadow monitor is not configured",
        );
      }
      return buildResponse(200, {
        ok: true,
        data: buildCacheShadowMonitorEnvelope(deps.cacheShadow.monitor.snapshot()),
      });
    }
    if (!deps.rateLimitShadow) {
      return buildErrorResponse(
        503,
        "BFF_RATE_LIMIT_SHADOW_MONITOR_UNAVAILABLE",
        "Rate limit shadow monitor is not configured",
      );
    }
    return buildResponse(200, {
      ok: true,
      data: buildRateLimitShadowMonitorEnvelope(deps.rateLimitShadow.monitor.snapshot()),
    });
  }

  if (route.kind === "diagnostic") {
    if (route.operation === "cache.shadow_canary") {
      if (!deps.cacheShadow) {
        return buildErrorResponse(
          503,
          "BFF_CACHE_SHADOW_CANARY_UNAVAILABLE",
          "Cache shadow canary is not configured",
        );
      }
      const result = await runCacheSyntheticShadowCanary({
        adapter: deps.cacheShadow.adapter,
        config: deps.cacheShadow.config,
      });
      if (result.status !== "ready") {
        return buildErrorResponse(503, "BFF_CACHE_SHADOW_CANARY_NOT_READY", result.reason);
      }
      if (result.decision) {
        await deps.cacheShadow.monitor.observe(result.decision).catch(() => undefined);
      }
      return buildResponse(200, {
        ok: true,
        data: buildCacheShadowCanaryEnvelope(result),
      });
    }
    if (route.operation !== "rate_limit.private_smoke") {
      return buildErrorResponse(404, "BFF_ROUTE_NOT_FOUND", "Unknown staging BFF diagnostic route");
    }
    if (!deps.rateLimitPrivateSmoke) {
      return buildErrorResponse(
        503,
        "BFF_RATE_LIMIT_PRIVATE_SMOKE_UNAVAILABLE",
        "Rate limit private smoke is not configured",
      );
    }
    const result = await deps.rateLimitPrivateSmoke.run();
    if (result.status !== "ready") {
      return buildErrorResponse(503, "BFF_RATE_LIMIT_PRIVATE_SMOKE_NOT_READY", result.reason);
    }
    let enforcementCanary: RateLimitSyntheticEnforcementCanaryResult | null = null;
    if (deps.rateLimitShadow) {
      await observeRateLimitPrivateSmokeInShadowMonitor({
        monitor: deps.rateLimitShadow.monitor,
        result,
      }).catch(() => undefined);
      enforcementCanary = await runRateLimitSyntheticEnforcementCanary({
        provider: deps.rateLimitShadow.provider,
      }).catch(() => null);
      if (enforcementCanary?.decision) {
        await deps.rateLimitShadow.monitor
          .observe(enforcementCanary.decision)
          .catch(() => undefined);
      }
    }
    return buildResponse(200, {
      ok: true,
      data: buildRateLimitPrivateSmokeEnvelope(result, enforcementCanary),
    });
  }

  const payload = parseBffStagingRequestPayload(request.body);
  if (!payload) {
    return buildErrorResponse(400, "BFF_INVALID_REQUEST_ENVELOPE", "Invalid request envelope");
  }

  if (route.kind === "read") {
    observeBffStagingCacheShadow({
      route,
      payload,
      cacheShadow: deps.cacheShadow,
    });
    observeBffStagingRateLimitShadow({
      route,
      payload,
      headers: request.headers,
      rateLimitShadow: deps.rateLimitShadow,
    });

    if (!deps.readPorts) {
      return buildErrorResponse(503, "BFF_READ_PORTS_UNAVAILABLE", "Read ports are not configured");
    }

    const body = await invokeReadRoute(route.operation as BffReadOperation, deps.readPorts, payload.input);
    if (!isBffStagingResponseEnvelope(body)) {
      return buildErrorResponse(502, "BFF_INVALID_RESPONSE_ENVELOPE", "Invalid response envelope");
    }
    return buildResponse(body.ok ? 200 : 500, body);
  }

  if (config.mutationRoutesEnabled !== true) {
    return buildErrorResponse(403, "BFF_MUTATION_ROUTES_DISABLED", "Mutation routes are disabled by default");
  }

  if (
    config.idempotencyMetadataRequired !== false &&
    !hasPresentMetadata(payload.metadata, "idempotencyKeyStatus")
  ) {
    return buildErrorResponse(400, "BFF_IDEMPOTENCY_METADATA_REQUIRED", "Idempotency metadata is required");
  }

  if (
    config.rateLimitMetadataRequired !== false &&
    !hasPresentMetadata(payload.metadata, "rateLimitKeyStatus")
  ) {
    return buildErrorResponse(400, "BFF_RATE_LIMIT_METADATA_REQUIRED", "Rate limit metadata is required");
  }

  observeBffStagingRateLimitShadow({
    route,
    payload,
    headers: request.headers,
    rateLimitShadow: deps.rateLimitShadow,
  });

  if (!deps.mutationPorts) {
    return buildErrorResponse(503, "BFF_MUTATION_PORTS_UNAVAILABLE", "Mutation ports are not configured");
  }

  const body = await invokeMutationRoute(
    route.operation as BffMutationOperation,
    deps.mutationPorts,
    payload.input,
  );
  if (!isBffStagingResponseEnvelope(body)) {
    return buildErrorResponse(502, "BFF_INVALID_RESPONSE_ENVELOPE", "Invalid response envelope");
  }
  return buildResponse(body.ok ? 200 : 500, body);
}

export function buildBffStagingDeploymentReadiness(params: {
  stagingBffBaseUrl?: string | null;
}): {
  status: "GREEN_BFF_STAGING_DEPLOY_PREFLIGHT_READY" | "BLOCKED_BFF_DEPLOY_TARGET_MISSING";
  repoStatus: "repo_ready_disabled";
  stagingBffBaseUrl: "present_redacted" | "missing";
  stagingLive: "missing" | "not_checked";
  liveCheckRun: false;
  liveCheckReason: string;
  serverBoundaryReady: true;
  stagingShadowRun: "not_run";
  trafficMigrated: false;
} {
  const baseUrlPresent = typeof params.stagingBffBaseUrl === "string" && params.stagingBffBaseUrl.trim().length > 0;

  return {
    status: baseUrlPresent
      ? "GREEN_BFF_STAGING_DEPLOY_PREFLIGHT_READY"
      : "BLOCKED_BFF_DEPLOY_TARGET_MISSING",
    repoStatus: "repo_ready_disabled",
    stagingBffBaseUrl: baseUrlPresent ? "present_redacted" : "missing",
    stagingLive: baseUrlPresent ? "not_checked" : "missing",
    liveCheckRun: false,
    liveCheckReason: baseUrlPresent
      ? "Live BFF health/readiness checks require an explicit staging wave."
      : "STAGING_BFF_BASE_URL is missing; do not invent a URL.",
    serverBoundaryReady: true,
    stagingShadowRun: "not_run",
    trafficMigrated: false,
  };
}

export async function runLocalBffStagingBoundaryShadow(): Promise<BffStagingShadowSummary> {
  const fixturePorts = createBffShadowFixturePorts();
  const deps: BffStagingServerDeps = {
    readPorts: fixturePorts.read,
    mutationPorts: fixturePorts.mutation,
    config: {
      mutationRoutesEnabled: true,
      idempotencyMetadataRequired: true,
      rateLimitMetadataRequired: true,
    },
  };

  let matches = 0;
  let mismatches = 0;

  for (const route of BFF_STAGING_READ_ROUTES) {
    const response = await handleBffStagingServerRequest(
      {
        method: route.method,
        path: route.path,
        body: {
          input: {
            page: -1,
            pageSize: 250,
            query: "local shadow query token=fixture-token-value",
            filters: { status: "pending", scope: "test-company-redacted" },
          },
        },
      },
      deps,
    );
    if (response.status === 200 && response.body.ok) matches += 1;
    else mismatches += 1;
  }

  for (const route of BFF_STAGING_MUTATION_ROUTES) {
    const response = await handleBffStagingServerRequest(
      {
        method: route.method,
        path: route.path,
        body: {
          input: {
            idempotencyKey: "opaque-key-v1",
            payload: BFF_SHADOW_MUTATION_PAYLOAD,
            context: {
              actorRole: "unknown",
              idempotencyKeyStatus: "present_redacted",
            },
          },
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      },
      deps,
    );
    if (response.status === 200 && response.body.ok) matches += 1;
    else mismatches += 1;
  }

  return {
    status: "run",
    matches,
    mismatches,
    trafficMigrated: false,
    productionTouched: false,
    stagingWrites: false,
    networkUsed: false,
  };
}

export const BFF_STAGING_SERVER_BOUNDARY_CONTRACT = Object.freeze({
  healthEndpointContract: true,
  readinessEndpointContract: true,
  cacheShadowMonitorEndpointContract: true,
  cacheShadowCanaryEndpointContract: true,
  rateLimitShadowMonitorEndpointContract: true,
  rateLimitPrivateSmokeEndpointContract: true,
  readRoutes: BFF_STAGING_READ_ROUTES.length,
  mutationRoutes: BFF_STAGING_MUTATION_ROUTES.length,
  mutationRoutesEnabledByDefault: BFF_STAGING_MUTATION_ROUTES.some((route) => route.enabledByDefault),
  requestEnvelopeValidation: true,
  responseEnvelopeValidation: true,
  redactedErrors: true,
  mutationRoutesWithJobMetadata: BFF_STAGING_MUTATION_ROUTES.filter((route) => route.jobPolicyType).length,
  jobExecutionEnabledByDefault: BFF_STAGING_MUTATION_ROUTES.some((route) => route.jobExecutionEnabledByDefault),
  mutationRoutesWithIdempotencyMetadata: BFF_STAGING_MUTATION_ROUTES.filter((route) => route.idempotencyPolicyOperation).length,
  idempotencyPersistenceEnabledByDefault: BFF_STAGING_MUTATION_ROUTES.some(
    (route) => route.idempotencyPersistenceEnabledByDefault,
  ),
  readRoutesWithRateLimitMetadata: BFF_STAGING_READ_ROUTES.filter((route) => route.rateLimitPolicyOperation).length,
  mutationRoutesWithRateLimitMetadata: BFF_STAGING_MUTATION_ROUTES.filter((route) => route.rateLimitPolicyOperation).length,
  rateLimitEnforcementEnabledByDefault: BFF_STAGING_ROUTE_REGISTRY.some(
    (route) => route.rateLimitEnforcementEnabledByDefault,
  ),
  readRoutesWithObservabilityMetadata: BFF_STAGING_READ_ROUTES.filter((route) => route.observability).length,
  mutationRoutesWithObservabilityMetadata: BFF_STAGING_MUTATION_ROUTES.filter((route) => route.observability).length,
  observabilityExternalExportEnabledByDefault: BFF_STAGING_ROUTE_REGISTRY.some(
    (route) => route.observabilityExternalExportEnabledByDefault,
  ),
  knownReadOperations: BFF_READ_HANDLER_OPERATIONS,
  knownMutationOperations: BFF_MUTATION_HANDLER_OPERATIONS,
});
