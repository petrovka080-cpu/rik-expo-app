import type { BffResponseEnvelope } from "../../src/shared/scale/bffContracts";
import type { CachePolicyRoute } from "../../src/shared/scale/cachePolicies";
import { getInvalidationTagsForOperation } from "../../src/shared/scale/cacheInvalidation";
import {
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  evaluateCacheShadowRead,
  isCacheReadThroughV1RouteAllowed,
  runCacheSyntheticShadowCanary,
  validateCacheShadowRouteMetricsOutput,
  buildCacheReadThroughReadinessDiagnostics,
  resolveCacheReadThroughV1FlagState,
  type CacheShadowDecision,
  type CacheShadowMonitor,
  type CacheShadowMonitorSnapshot,
  type CacheShadowRuntimeConfig,
  type CacheSyntheticShadowCanaryResult,
  type CacheReadThroughReadinessDiagnostics,
  type CacheCanonicalEnvValueClass,
  type CacheReadThroughV1FlagState,
} from "../../src/shared/scale/cacheShadowRuntime";
import type { CacheAdapter } from "../../src/shared/scale/cacheAdapters";
import { buildSafeCacheKey } from "../../src/shared/scale/cacheKeySafety";
import { getCachePolicy } from "../../src/shared/scale/cachePolicies";
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
  handleCatalogRequestItemCancel,
  handleCatalogRequestMetaUpdate,
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
import {
  handleDirectorFinanceBffRpcScope,
  type DirectorFinanceBffRpcPort,
} from "../../src/screens/director/director.finance.bff.handler";
import {
  DIRECTOR_FINANCE_BFF_CONTRACT,
  type DirectorFinanceBffRouteOperation,
} from "../../src/screens/director/director.finance.bff.contract";
import {
  handleWarehouseApiBffReadScope,
  type WarehouseApiBffReadPort,
} from "../../src/screens/warehouse/warehouse.api.bff.handler";
import {
  WAREHOUSE_API_BFF_CONTRACT,
  type WarehouseApiBffRouteOperation,
} from "../../src/screens/warehouse/warehouse.api.bff.contract";
import {
  handleCatalogTransportBffReadScope,
  type CatalogTransportBffReadPort,
} from "../../src/lib/catalog/catalog.bff.handler";
import {
  CATALOG_TRANSPORT_BFF_CONTRACT,
  type CatalogTransportBffRouteOperation,
} from "../../src/lib/catalog/catalog.bff.contract";
import {
  handleAssistantStoreReadBffScope,
  type AssistantStoreReadBffPort,
} from "../../src/lib/assistant_store_read.bff.handler";
import {
  ASSISTANT_STORE_READ_BFF_CONTRACT,
  type AssistantStoreReadBffRouteOperation,
} from "../../src/lib/assistant_store_read.bff.contract";
import { buildBffError } from "../../src/shared/scale/bffSafety";
import {
  BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD,
  BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD,
  BFF_SHADOW_MUTATION_PAYLOAD,
  createBffShadowFixturePorts,
} from "../../src/shared/scale/bffShadowFixtures";

export type BffStagingRouteKind =
  | "health"
  | "readiness"
  | "read"
  | "read_rpc"
  | "mutation"
  | "monitor"
  | "diagnostic";

export type BffStagingRouteDefinition = {
  operation:
    | BffReadOperation
    | DirectorFinanceBffRouteOperation
    | WarehouseApiBffRouteOperation
    | CatalogTransportBffRouteOperation
    | AssistantStoreReadBffRouteOperation
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
  mutationRouteScope?: BffMutationRouteScopeConfig;
  serverAuthConfigured?: boolean;
  idempotencyMetadataRequired?: boolean;
  rateLimitMetadataRequired?: boolean;
};

export type BffMutationRouteScopeKey =
  | "catalog.request.updateMeta"
  | "catalog.request.itemUpdateQty"
  | "catalog.request.itemCancel";

export type BffMutationRouteScopeConfig = {
  status: "disabled" | "enabled" | "invalid";
  enabledOperations: readonly BffMutationOperation[];
  enabledRouteKeys: readonly BffMutationRouteScopeKey[];
  enabledOperationCount: number;
  invalidRouteKeyCount: number;
  wildcardRejected: boolean;
  emptyAllowlist: boolean;
  valuesPrinted: false;
  secretsPrinted: false;
};

export const BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME = "BFF_MUTATION_ROUTE_ALLOWLIST";

export const BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS = Object.freeze([
  "catalog.request.updateMeta",
  "catalog.request.itemUpdateQty",
  "catalog.request.itemCancel",
] satisfies readonly BffMutationRouteScopeKey[]);

export const BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS = Object.freeze([
  "catalog.request.meta.update",
  "request.item.update",
  "catalog.request.item.cancel",
] satisfies readonly BffMutationOperation[]);

const BFF_MUTATION_ROUTE_SCOPE_KEY_TO_OPERATION: Readonly<Record<BffMutationRouteScopeKey, BffMutationOperation>> =
  Object.freeze({
    "catalog.request.updateMeta": "catalog.request.meta.update",
    "catalog.request.itemUpdateQty": "request.item.update",
    "catalog.request.itemCancel": "catalog.request.item.cancel",
  });

const BFF_FORBIDDEN_MUTATION_ROUTE_SCOPE_TOKENS = new Set(["*", "all", "any", "true"]);

export const BFF_MUTATION_ROUTE_SCOPE_DISABLED: BffMutationRouteScopeConfig = Object.freeze({
  status: "disabled",
  enabledOperations: Object.freeze([]),
  enabledRouteKeys: Object.freeze([]),
  enabledOperationCount: 0,
  invalidRouteKeyCount: 0,
  wildcardRejected: false,
  emptyAllowlist: true,
  valuesPrinted: false,
  secretsPrinted: false,
});

const buildMutationRouteScopeConfig = (
  params: Pick<
    BffMutationRouteScopeConfig,
    "status" | "enabledOperations" | "enabledRouteKeys" | "invalidRouteKeyCount" | "wildcardRejected" | "emptyAllowlist"
  >,
): BffMutationRouteScopeConfig =>
  Object.freeze({
    ...params,
    enabledOperationCount: params.enabledOperations.length,
    valuesPrinted: false,
    secretsPrinted: false,
  });

export function buildBffMutationRouteScopeForOperations(
  operations: readonly BffMutationOperation[],
): BffMutationRouteScopeConfig {
  const unique = [...new Set(operations)];
  return buildMutationRouteScopeConfig({
    status: unique.length > 0 ? "enabled" : "disabled",
    enabledOperations: Object.freeze(unique),
    enabledRouteKeys: Object.freeze(
      BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS.filter((key) =>
        unique.includes(BFF_MUTATION_ROUTE_SCOPE_KEY_TO_OPERATION[key]),
      ),
    ),
    invalidRouteKeyCount: 0,
    wildcardRejected: false,
    emptyAllowlist: unique.length === 0,
  });
}

export function parseBffMutationRouteAllowlist(value: string | null | undefined): BffMutationRouteScopeConfig {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return BFF_MUTATION_ROUTE_SCOPE_DISABLED;

  const enabledRouteKeys: BffMutationRouteScopeKey[] = [];
  const enabledOperations: BffMutationOperation[] = [];
  let invalidRouteKeyCount = 0;
  let wildcardRejected = false;

  for (const token of raw.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean)) {
    if (BFF_FORBIDDEN_MUTATION_ROUTE_SCOPE_TOKENS.has(token.toLowerCase())) {
      wildcardRejected = true;
      continue;
    }

    if (BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS.includes(token as BffMutationRouteScopeKey)) {
      const key = token as BffMutationRouteScopeKey;
      if (!enabledRouteKeys.includes(key)) enabledRouteKeys.push(key);
      const operation = BFF_MUTATION_ROUTE_SCOPE_KEY_TO_OPERATION[key];
      if (!enabledOperations.includes(operation)) enabledOperations.push(operation);
      continue;
    }

    invalidRouteKeyCount += 1;
  }

  if (wildcardRejected || invalidRouteKeyCount > 0) {
    return buildMutationRouteScopeConfig({
      status: "invalid",
      enabledOperations: Object.freeze([]),
      enabledRouteKeys: Object.freeze([]),
      invalidRouteKeyCount,
      wildcardRejected,
      emptyAllowlist: false,
    });
  }

  return buildMutationRouteScopeConfig({
    status: enabledOperations.length > 0 ? "enabled" : "disabled",
    enabledOperations: Object.freeze(enabledOperations),
    enabledRouteKeys: Object.freeze(enabledRouteKeys),
    invalidRouteKeyCount: 0,
    wildcardRejected: false,
    emptyAllowlist: enabledOperations.length === 0,
  });
}

const resolveMutationRouteScope = (config: BffStagingServerConfig): BffMutationRouteScopeConfig =>
  config.mutationRouteScope ?? BFF_MUTATION_ROUTE_SCOPE_DISABLED;

const isMutationRouteScopeEnabledForOperation = (
  operation: BffMutationOperation,
  scope: BffMutationRouteScopeConfig,
): boolean => scope.status === "enabled" && scope.enabledOperations.includes(operation);

export type BffStagingRateLimitShadowDeps = {
  provider: RuntimeRateEnforcementProvider;
  monitor: RateLimitShadowMonitor;
};

export type BffStagingCacheShadowDeps = {
  adapter: CacheAdapter;
  config: CacheShadowRuntimeConfig;
  monitor: CacheShadowMonitor;
};

export type BffStagingCacheShadowReadinessDiagnostics = CacheReadThroughReadinessDiagnostics;

export type BffStagingCacheShadowRuntimeState = {
  status: "configured" | "disabled" | "adapter_unavailable";
  enabled: boolean;
  productionEnabledFlagTruthy: boolean;
  mode: CacheShadowRuntimeConfig["mode"];
  readThroughV1Enabled: boolean;
  readThroughV1FlagState: CacheReadThroughV1FlagState;
  cacheCanonicalKeyPresence: boolean;
  cacheCanonicalKeyValueClass: CacheCanonicalEnvValueClass;
  cacheRuntimeSource: "process_env";
  routeAllowlistSource: "process_env";
  percent: number;
  routeAllowlistCount: number;
  envKeyPresence: CacheShadowRuntimeConfig["envKeyPresence"];
  readinessDiagnostics: BffStagingCacheShadowReadinessDiagnostics;
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

export type BffStagingReadyRuntimeDiagnostics = {
  runtimeCommitShort: string;
  runtimeCommitPresent: boolean;
  runtimeServiceIdClass: "present_redacted" | "absent";
  runtimeEnvClass: "production" | "staging" | "development" | "test" | "unknown" | "absent";
  appEnv: string;
  redacted: true;
  secretsExposed: false;
  envValuesExposed: false;
};

export type BffStagingServerDeps = {
  readPorts?: BffReadPorts;
  directorFinanceRpcPort?: DirectorFinanceBffRpcPort;
  warehouseApiReadPort?: WarehouseApiBffReadPort;
  catalogTransportReadPort?: CatalogTransportBffReadPort;
  assistantStoreReadPort?: AssistantStoreReadBffPort;
  mutationPorts?: BffMutationPorts;
  cacheShadow?: BffStagingCacheShadowDeps | null;
  cacheShadowRuntime?: BffStagingCacheShadowRuntimeState | null;
  rateLimitShadow?: BffStagingRateLimitShadowDeps | null;
  rateLimitPrivateSmoke?: RateLimitPrivateSmokeRunner | null;
  runtimeDiagnostics?: BffStagingReadyRuntimeDiagnostics;
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

export const BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "director.finance.rpc.scope",
  kind: "read_rpc",
  method: "POST",
  path: DIRECTOR_FINANCE_BFF_CONTRACT.endpoint.replace(/^POST\s+/, ""),
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
  observability: BFF_OBSERVABILITY_METADATA,
  observabilityExternalExportEnabledByDefault: false,
});

export const BFF_STAGING_WAREHOUSE_API_READ_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "warehouse.api.read.scope",
  kind: "read_rpc",
  method: "POST",
  path: WAREHOUSE_API_BFF_CONTRACT.endpoint.replace(/^POST\s+/, ""),
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
  observability: BFF_OBSERVABILITY_METADATA,
  observabilityExternalExportEnabledByDefault: false,
});

export const BFF_STAGING_CATALOG_TRANSPORT_READ_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "catalog.transport.read.scope",
  kind: "read_rpc",
  method: "POST",
  path: CATALOG_TRANSPORT_BFF_CONTRACT.endpoint.replace(/^POST\s+/, ""),
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
  observability: BFF_OBSERVABILITY_METADATA,
  observabilityExternalExportEnabledByDefault: false,
});

export const BFF_STAGING_ASSISTANT_STORE_READ_ROUTE: BffStagingRouteDefinition = Object.freeze({
  operation: "assistant.store.read.scope",
  kind: "read_rpc",
  method: "POST",
  path: ASSISTANT_STORE_READ_BFF_CONTRACT.endpoint.replace(/^POST\s+/, ""),
  enabledByDefault: true,
  requiresIdempotencyMetadata: false,
  requiresRateLimitMetadata: false,
  observability: BFF_OBSERVABILITY_METADATA,
  observabilityExternalExportEnabledByDefault: false,
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
  {
    operation: "catalog.request.meta.update",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/catalog-request-meta-update",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("catalog.request.meta.update"),
    jobPolicyType: getMutationJobPolicyType("catalog.request.meta.update"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("catalog.request.meta.update"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("catalog.request.meta.update"),
    rateLimitPolicyDefaultEnabled: false,
    rateLimitEnforcementEnabledByDefault: false,
    observability: BFF_OBSERVABILITY_METADATA,
    observabilityExternalExportEnabledByDefault: false,
  },
  {
    operation: "catalog.request.item.cancel",
    kind: "mutation",
    method: "POST",
    path: "/api/staging-bff/mutation/catalog-request-item-cancel",
    enabledByDefault: false,
    requiresIdempotencyMetadata: true,
    requiresRateLimitMetadata: true,
    invalidationTags: getInvalidationTagsForOperation("catalog.request.item.cancel"),
    jobPolicyType: getMutationJobPolicyType("catalog.request.item.cancel"),
    jobPolicyDefaultEnabled: false,
    jobExecutionEnabledByDefault: false,
    idempotencyPolicyOperation: getMutationIdempotencyPolicyOperation("catalog.request.item.cancel"),
    idempotencyPolicyDefaultEnabled: false,
    idempotencyPersistenceEnabledByDefault: false,
    rateLimitPolicyOperation: getMutationRateLimitPolicyOperation("catalog.request.item.cancel"),
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
  BFF_STAGING_DIRECTOR_FINANCE_RPC_ROUTE,
  BFF_STAGING_WAREHOUSE_API_READ_ROUTE,
  BFF_STAGING_CATALOG_TRANSPORT_READ_ROUTE,
  BFF_STAGING_ASSISTANT_STORE_READ_ROUTE,
  ...BFF_STAGING_READ_ROUTES,
  ...BFF_STAGING_MUTATION_ROUTES,
]);

export const BFF_STAGING_SERVER_ENV_NAMES = Object.freeze([
  "STAGING_BFF_BASE_URL",
  "BFF_SERVER_AUTH_SECRET",
  "BFF_DATABASE_READONLY_URL",
  "BFF_DATABASE_WRITE_URL",
  "BFF_MUTATION_ENABLED",
  BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME,
  "BFF_IDEMPOTENCY_METADATA_ENABLED",
  "BFF_RATE_LIMIT_METADATA_ENABLED",
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.productionEnabled,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.mode,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.percent,
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

const buildSafeRateLimitRouteClassKey = (operation: BffStagingRouteDefinition["operation"]): string => {
  const normalized = String(operation)
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return normalized || "unknown_route";
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
    routeKey: buildSafeRateLimitRouteClassKey(params.route.operation),
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

async function evaluateBffStagingReadRateLimitCanary(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  headers?: Record<string, unknown> | null;
  rateLimitShadow?: BffStagingRateLimitShadowDeps | null;
}): Promise<BffStagingBoundaryResponse | null> {
  const operation = params.route.rateLimitPolicyOperation;
  if (!operation || !params.rateLimitShadow) return null;

  const keyInput = buildBffStagingRateLimitKeyInput({
    route: params.route,
    payload: params.payload,
    headers: params.headers,
  });
  const shadow = params.rateLimitShadow;
  try {
    const decision = await shadow.provider.evaluate({ operation, keyInput });
    await shadow.monitor.observe(decision).catch(() => undefined);
    if (decision.action === "block" && decision.blocked) {
      return buildErrorResponse(
        429,
        "BFF_RATE_LIMITED",
        "Rate limit canary threshold exceeded",
      );
    }
  } catch {
    return null;
  }

  return null;
}

function observeBffStagingCacheShadow(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  cacheShadow?: BffStagingCacheShadowDeps | null;
}): void {
  const route = params.route.cachePolicyRoute;
  if (!route || !params.cacheShadow) return;
  const cacheShadow = params.cacheShadow;
  if (cacheShadow.config.mode === "read_through") return;
  void evaluateCacheShadowRead({
    adapter: cacheShadow.adapter,
    config: cacheShadow.config,
    route,
    input: params.payload.input,
  })
    .then((decision) => cacheShadow.monitor.observe(decision))
    .catch(() => undefined);
}

const hashForCacheReadThroughPercent = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const selectedForCacheReadThrough = (key: string, percent: number): boolean => {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return hashForCacheReadThroughPercent(key) % 100 < percent;
};

const buildCacheReadThroughDecision = (params: {
  status: CacheShadowDecision["status"];
  route: CachePolicyRoute;
  cacheHit: boolean;
  shadowReadAttempted: boolean;
  reason: string;
}): CacheShadowDecision => ({
  status: params.status,
  route: params.route,
  mode: "read_through",
  shadowReadAttempted: params.shadowReadAttempted,
  cacheHit: params.cacheHit,
  responseChanged: false,
  syntheticIdentityUsed: false,
  realUserPayloadUsed: false,
  rawKeyReturned: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason: params.reason,
});

const withCacheHitTiming = (
  body: BffResponseEnvelope<unknown>,
  cacheHit: boolean,
): BffResponseEnvelope<unknown> => {
  if (body.ok !== true) return body;
  return {
    ...body,
    serverTiming: {
      ...(isRecord((body as { serverTiming?: unknown }).serverTiming)
        ? ((body as { serverTiming?: Record<string, unknown> }).serverTiming ?? {})
        : {}),
      cacheHit,
    },
  };
};

async function invokeReadRouteWithCacheReadThrough(params: {
  route: BffStagingRouteDefinition;
  payload: BffStagingRequestPayload;
  cacheShadow?: BffStagingCacheShadowDeps | null;
  invoke: () => Promise<BffResponseEnvelope<unknown>>;
}): Promise<BffResponseEnvelope<unknown>> {
  const route = params.route.cachePolicyRoute;
  const cacheShadow = params.cacheShadow;
  const config = cacheShadow?.config;
  const policy = route ? getCachePolicy(route) : null;
  if (!route || !cacheShadow || !config || config.mode !== "read_through" || !policy) {
    return params.invoke();
  }

  const observe = (decision: CacheShadowDecision): void => {
    void cacheShadow.monitor.observe(decision).catch(() => undefined);
  };

  if (!config.enabled) {
    observe(buildCacheReadThroughDecision({
      status: "disabled",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "cache_read_through_disabled",
    }));
    return params.invoke();
  }
  if (!config.readThroughV1Enabled) {
    observe(buildCacheReadThroughDecision({
      status: "disabled",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "cache_read_through_v1_flag_disabled",
    }));
    return params.invoke();
  }
  if (!isCacheReadThroughV1RouteAllowed(route)) {
    observe(buildCacheReadThroughDecision({
      status: "skipped",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "route_not_approved_for_read_through_v1",
    }));
    return params.invoke();
  }
  if (policy.payloadClass !== "public_catalog") {
    observe(buildCacheReadThroughDecision({
      status: "skipped",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "payload_class_not_allowlisted_for_read_through",
    }));
    return params.invoke();
  }
  if (config.routeAllowlist.length === 0 || !config.routeAllowlist.includes(route)) {
    observe(buildCacheReadThroughDecision({
      status: "skipped",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "route_not_allowlisted",
    }));
    return params.invoke();
  }

  const keyResult = buildSafeCacheKey(policy, params.payload.input);
  if (!keyResult.ok) {
    observe(buildCacheReadThroughDecision({
      status: "unsafe_key",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: keyResult.reason,
    }));
    return params.invoke();
  }
  if (!selectedForCacheReadThrough(keyResult.key, config.percent)) {
    observe(buildCacheReadThroughDecision({
      status: "skipped",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "not_selected_by_percent",
    }));
    return params.invoke();
  }

  const provider = cacheShadow.adapter.getStatus();
  if (!provider.enabled || !provider.externalNetworkEnabled) {
    observe(buildCacheReadThroughDecision({
      status: "adapter_unavailable",
      route,
      cacheHit: false,
      shadowReadAttempted: false,
      reason: "adapter_unavailable",
    }));
    return params.invoke();
  }

  let cached: unknown | null = null;
  try {
    cached = await cacheShadow.adapter.get<unknown>(keyResult.key);
  } catch (_error: unknown) {
    observe(buildCacheReadThroughDecision({
      status: "error",
      route,
      cacheHit: false,
      shadowReadAttempted: true,
      reason: "cache_read_through_error",
    }));
    return params.invoke();
  }

  if (isBffStagingResponseEnvelope(cached) && cached.ok === true) {
    observe(buildCacheReadThroughDecision({
      status: "hit",
      route,
      cacheHit: true,
      shadowReadAttempted: true,
      reason: "cache_read_through_hit",
    }));
    return withCacheHitTiming(cached, true);
  }

  const body = await params.invoke();
  observe(buildCacheReadThroughDecision({
    status: "miss",
    route,
    cacheHit: false,
    shadowReadAttempted: true,
    reason: "cache_read_through_miss",
  }));
  if (body.ok === true) {
    try {
      await cacheShadow.adapter.set(keyResult.key, withCacheHitTiming(body, false), {
        ttlMs: policy.ttlMs,
        tags: policy.tags,
      });
    } catch (_error: unknown) {
      observe(buildCacheReadThroughDecision({
        status: "error",
        route,
        cacheHit: false,
        shadowReadAttempted: true,
        reason: "cache_read_through_error",
      }));
    }
  }
  return withCacheHitTiming(body, false);
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
  readThroughCount: snapshot.readThroughCount,
  dryRunDecisionCount: snapshot.dryRunDecisionCount,
  wouldCacheRead: snapshot.wouldCacheRead,
  wouldCacheHit: snapshot.wouldCacheHit,
  wouldCacheMiss: snapshot.wouldCacheMiss,
  wouldCacheBypassReason: snapshot.wouldCacheBypassReason,
  skippedCount: snapshot.skippedCount,
  unsafeKeyCount: snapshot.unsafeKeyCount,
  errorCount: snapshot.errorCount,
  routeMetrics: snapshot.routeMetrics,
  routeMetricsRedactionSafe: validateCacheShadowRouteMetricsOutput(snapshot.routeMetrics).passed,
  responseChanged: false,
  realUserPayloadStored: false,
  rawKeysStored: false,
  rawKeysPrinted: false,
  rawPayloadLogged: false,
  piiLogged: false,
});

const normalizeRuntimeDiagnosticToken = (value: unknown): string => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-z0-9_.:-]/gi, "_")
    .slice(0, 60);
  return normalized || "absent";
};

const firstPresentEnvValue = (
  env: Record<string, string | undefined>,
  names: readonly string[],
): string => {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
};

const runtimeEnvironmentClass = (
  value: string,
): BffStagingReadyRuntimeDiagnostics["runtimeEnvClass"] => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "absent";
  if (normalized.includes("prod")) return "production";
  if (normalized.includes("stag")) return "staging";
  if (normalized.includes("dev")) return "development";
  if (normalized.includes("test")) return "test";
  return "unknown";
};

export const buildBffReadyRuntimeDiagnostics = (
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
): BffStagingReadyRuntimeDiagnostics => {
  const commit = firstPresentEnvValue(env, [
    "RENDER_GIT_COMMIT",
    "RENDER_COMMIT",
    "GIT_COMMIT",
    "SOURCE_VERSION",
    "COMMIT_SHA",
  ]);
  const runtimeEnv = firstPresentEnvValue(env, [
    "APP_ENV",
    "EXPO_PUBLIC_APP_ENV",
    "EXPO_PUBLIC_ENVIRONMENT",
    "NODE_ENV",
  ]);
  const serviceId = firstPresentEnvValue(env, [
    "RENDER_PRODUCTION_BFF_SERVICE_ID",
    "RENDER_SERVICE_ID",
  ]);

  return {
    runtimeCommitShort: commit ? commit.slice(0, 12) : "absent",
    runtimeCommitPresent: Boolean(commit),
    runtimeServiceIdClass: serviceId ? "present_redacted" : "absent",
    runtimeEnvClass: runtimeEnvironmentClass(runtimeEnv),
    appEnv: normalizeRuntimeDiagnosticToken(runtimeEnv),
    redacted: true,
    secretsExposed: false,
    envValuesExposed: false,
  };
};

export const buildCacheShadowRuntimeState = (
  config: CacheShadowRuntimeConfig | null | undefined,
  adapter?: CacheAdapter | null,
): BffStagingCacheShadowRuntimeState => {
  const adapterStatus = adapter?.getStatus();
  const routeAllowlistCount = config?.routeAllowlist.length ?? 0;
  const readinessDiagnostics = buildCacheReadThroughReadinessDiagnostics(config);
  const readThroughV1FlagState = config?.readThroughV1FlagState ?? resolveCacheReadThroughV1FlagState({});
  const base = {
    enabled: config?.enabled ?? false,
    productionEnabledFlagTruthy: config?.productionEnabledFlagTruthy ?? false,
    mode: config?.mode ?? "disabled",
    readThroughV1Enabled: config?.readThroughV1Enabled ?? false,
    readThroughV1FlagState,
    cacheCanonicalKeyPresence: readThroughV1FlagState.present,
    cacheCanonicalKeyValueClass: readThroughV1FlagState.valueClass,
    cacheRuntimeSource: "process_env",
    routeAllowlistSource: "process_env",
    percent: config?.percent ?? 0,
    routeAllowlistCount,
    envKeyPresence: config?.envKeyPresence ?? {
      productionEnabled: false,
      mode: false,
      readThroughV1Enabled: false,
      routeAllowlist: false,
      percent: false,
      url: false,
      namespace: false,
      commandTimeout: false,
    },
    readinessDiagnostics,
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
    case "catalog.request.meta.update":
      return handleCatalogRequestMetaUpdate(ports, input);
    case "catalog.request.item.cancel":
      return handleCatalogRequestItemCancel(ports, input);
  }
};

const getLocalShadowMutationPayload = (operation: BffMutationOperation): unknown => {
  if (operation === "catalog.request.meta.update") return BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD;
  if (operation === "catalog.request.item.cancel") return BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD;
  return BFF_SHADOW_MUTATION_PAYLOAD;
};

export async function handleBffStagingServerRequest(
  request: BffStagingRequestEnvelope,
  deps: BffStagingServerDeps = {},
): Promise<BffStagingBoundaryResponse> {
  const route = findRoute(request);
  const config = deps.config ?? {};
  const mutationRouteScope = resolveMutationRouteScope(config);

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
    const runtimeDiagnostics = deps.runtimeDiagnostics ?? buildBffReadyRuntimeDiagnostics();
    return buildResponse(200, {
      ok: true,
      data: {
        status: "ready",
        runtimeCommitShort: runtimeDiagnostics.runtimeCommitShort,
        runtimeServiceIdClass: runtimeDiagnostics.runtimeServiceIdClass,
        runtimeEnvClass: runtimeDiagnostics.runtimeEnvClass,
        appEnv: runtimeDiagnostics.appEnv,
        runtimeDiagnostics,
        readRoutes: BFF_STAGING_READ_ROUTES.length,
        readRpcRoutes: 4,
        mutationRoutes: BFF_STAGING_MUTATION_ROUTES.length,
        readPortsConfigured: Boolean(deps.readPorts),
        directorFinanceRpcPortConfigured: Boolean(deps.directorFinanceRpcPort),
        warehouseApiReadPortConfigured: Boolean(deps.warehouseApiReadPort),
        catalogTransportReadPortConfigured: Boolean(deps.catalogTransportReadPort),
        assistantStoreReadPortConfigured: Boolean(deps.assistantStoreReadPort),
        mutationRoutesEnabledByDefault: false,
        mutationRoutesEnabled:
          config.mutationRoutesEnabled === true &&
          mutationRouteScope.status === "enabled" &&
          mutationRouteScope.enabledOperationCount > 0,
        mutationRouteScopeStatus: mutationRouteScope.status,
        enabledMutationRoutes: mutationRouteScope.enabledOperationCount,
        catalogRequestMutationRoutesSupported: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS.length,
        mutationRouteScopeValuesPrinted: false,
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
    const rateLimitResponse = await evaluateBffStagingReadRateLimitCanary({
      route,
      payload,
      headers: request.headers,
      rateLimitShadow: deps.rateLimitShadow,
    });
    if (rateLimitResponse) return rateLimitResponse;

    observeBffStagingCacheShadow({
      route,
      payload,
      cacheShadow: deps.cacheShadow,
    });

    if (!deps.readPorts) {
      return buildErrorResponse(503, "BFF_READ_PORTS_UNAVAILABLE", "Read ports are not configured");
    }

    const body = await invokeReadRouteWithCacheReadThrough({
      route,
      payload,
      cacheShadow: deps.cacheShadow,
      invoke: () => invokeReadRoute(route.operation as BffReadOperation, deps.readPorts!, payload.input),
    });
    if (!isBffStagingResponseEnvelope(body)) {
      return buildErrorResponse(502, "BFF_INVALID_RESPONSE_ENVELOPE", "Invalid response envelope");
    }
    return buildResponse(body.ok ? 200 : 500, body);
  }

  if (route.kind === "read_rpc") {
    const body =
      route.operation === "director.finance.rpc.scope"
        ? deps.directorFinanceRpcPort
          ? await handleDirectorFinanceBffRpcScope(
              deps.directorFinanceRpcPort,
              payload.input,
            )
          : null
        : route.operation === "warehouse.api.read.scope" && deps.warehouseApiReadPort
          ? await handleWarehouseApiBffReadScope(
              deps.warehouseApiReadPort,
              payload.input,
            )
          : route.operation === "catalog.transport.read.scope" && deps.catalogTransportReadPort
            ? await handleCatalogTransportBffReadScope(
                deps.catalogTransportReadPort,
                payload.input,
              )
            : route.operation === "assistant.store.read.scope" && deps.assistantStoreReadPort
              ? await handleAssistantStoreReadBffScope(
                  deps.assistantStoreReadPort,
                  payload.input,
                )
              : null;
    if (!body) {
      return route.operation === "director.finance.rpc.scope"
        ? buildErrorResponse(
            503,
            "BFF_DIRECTOR_FINANCE_RPC_PORT_UNAVAILABLE",
            "Director finance RPC port is not configured",
          )
        : route.operation === "warehouse.api.read.scope"
          ? buildErrorResponse(
              503,
              "BFF_WAREHOUSE_API_READ_PORT_UNAVAILABLE",
              "Warehouse API read port is not configured",
            )
          : route.operation === "catalog.transport.read.scope"
            ? buildErrorResponse(
                503,
                "BFF_CATALOG_TRANSPORT_READ_PORT_UNAVAILABLE",
                "Catalog transport read port is not configured",
              )
            : route.operation === "assistant.store.read.scope"
              ? buildErrorResponse(
                  503,
                  "BFF_ASSISTANT_STORE_READ_PORT_UNAVAILABLE",
                  "Assistant/store read port is not configured",
                )
              : buildErrorResponse(404, "BFF_ROUTE_NOT_FOUND", "Unknown staging BFF read RPC route");
    }
    if (!isBffStagingResponseEnvelope(body)) {
      return buildErrorResponse(502, "BFF_INVALID_RESPONSE_ENVELOPE", "Invalid response envelope");
    }
    const status = body.ok
      ? 200
      : body.error.code === "DIRECTOR_FINANCE_BFF_INVALID_OPERATION" ||
          body.error.code === "WAREHOUSE_API_BFF_INVALID_OPERATION" ||
          body.error.code === "CATALOG_TRANSPORT_BFF_INVALID_OPERATION" ||
          body.error.code === "ASSISTANT_STORE_READ_BFF_INVALID_OPERATION"
        ? 400
        : 502;
    return buildResponse(status, body);
  }

  if (config.mutationRoutesEnabled !== true) {
    return buildErrorResponse(403, "BFF_MUTATION_ROUTES_DISABLED", "Mutation routes are disabled by default");
  }

  if (mutationRouteScope.status === "invalid") {
    return buildErrorResponse(
      403,
      "BFF_MUTATION_ROUTE_SCOPE_INVALID",
      "Mutation route scope is invalid",
    );
  }

  if (!isMutationRouteScopeEnabledForOperation(route.operation as BffMutationOperation, mutationRouteScope)) {
    return buildErrorResponse(
      403,
      "BFF_MUTATION_ROUTE_DISABLED",
      "Mutation route is not enabled",
    );
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
      mutationRouteScope: buildBffMutationRouteScopeForOperations(BFF_MUTATION_HANDLER_OPERATIONS),
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
            payload: getLocalShadowMutationPayload(route.operation as BffMutationOperation),
            context: {
              actorRole: "unknown",
              companyScope: "present_redacted",
              idempotencyKeyStatus: "present_redacted",
              requestScope: "present_redacted",
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
  readRpcRoutes: 4,
  directorFinanceRpcRouteContract: true,
  warehouseApiReadRouteContract: true,
  catalogTransportReadRouteContract: true,
  assistantStoreReadRouteContract: true,
  mutationRoutes: BFF_STAGING_MUTATION_ROUTES.length,
  mutationRoutesEnabledByDefault: BFF_STAGING_MUTATION_ROUTES.some((route) => route.enabledByDefault),
  routeScopedMutationEnablement: true,
  catalogRequestMutationRouteScopeKeys: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS,
  catalogRequestMutationRouteScopeOperations: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
  wildcardMutationRouteEnablementAllowed: false,
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
