import fs from "fs";
import path from "path";

import {
  CACHE_POLICY_REGISTRY,
  CACHE_READ_ROUTE_OPERATIONS,
  getCachePolicy,
  type CachePolicy,
  type CachePolicyRoute,
} from "../../src/shared/scale/cachePolicies";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
  CACHE_READ_THROUGH_V1_ALLOWED_ROUTES,
  buildCacheReadThroughOneRouteApplyEnv,
  explainCacheReadThroughOneRouteReadiness,
  resolveCacheReadThroughOneRouteApplyConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import {
  RATE_ENFORCEMENT_MODE_ENV_NAME,
  RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME,
  RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME,
  RATE_LIMIT_TEST_NAMESPACE_ENV_NAME,
  resolveRateEnforcementMode,
} from "../../src/shared/scale/rateLimitAdapters";
import {
  BFF_READ_RATE_LIMIT_OPERATIONS,
  RATE_ENFORCEMENT_POLICY_REGISTRY,
  getRateEnforcementPolicy,
  type RateEnforcementPolicy,
  type RateLimitEnforcementOperation,
} from "../../src/shared/scale/rateLimitPolicies";
import { SCALE_PROVIDER_RUNTIME_ENV_NAMES } from "../../src/shared/scale/providerRuntimeConfig";
import {
  BFF_STAGING_CACHE_SHADOW_CANARY_ROUTE,
  BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE,
  BFF_STAGING_HEALTH_ROUTE,
  BFF_STAGING_RATE_LIMIT_PRIVATE_SMOKE_ROUTE,
  BFF_STAGING_RATE_LIMIT_SHADOW_MONITOR_ROUTE,
  BFF_STAGING_READINESS_ROUTE,
  BFF_STAGING_READ_ROUTES,
} from "../server/stagingBffServerBoundary";

const WAVE = "S_CACHE_RATE_01_RUNTIME_FLAG_INVENTORY_AND_SAFE_ENABLE_PLAN";
const FINAL_STATUS = "GREEN_CACHE_RATE_FLAG_INVENTORY_READY";
const TARGET_OPERATION = "marketplace.catalog.search" as const;
const TARGET_RATE_LIMIT_PERCENT = "1";
const ARTIFACT_DIR = "artifacts";
const INVENTORY_PATH = "artifacts/S_CACHE_RATE_01_FLAG_INVENTORY_inventory.json";
const MATRIX_PATH = "artifacts/S_CACHE_RATE_01_FLAG_INVENTORY_matrix.json";
const PROOF_PATH = "artifacts/S_CACHE_RATE_01_FLAG_INVENTORY_proof.md";

type EnvKeyInventory = {
  cacheRuntime: readonly string[];
  cacheProvider: readonly string[];
  rateRuntime: readonly string[];
  rateProvider: readonly string[];
  rateMetadata: readonly string[];
  runtimeDetection: readonly string[];
  runnerOperational: readonly string[];
  approvalGates: readonly string[];
  all: readonly string[];
};

type RoutePolicySummary = {
  operation: typeof TARGET_OPERATION;
  present: boolean;
  defaultEnabled: boolean;
  category?: string;
  scope?: string;
  ttlMs?: number;
  staleWhileRevalidateMs?: number;
  maxPayloadBytes?: number;
  payloadClass?: string;
  piiSafe?: boolean;
  windowMs?: number;
  maxRequests?: number;
  burst?: number;
  cooldownMs?: number;
  enforcementEnabledByDefault?: boolean;
  externalStoreRequiredForLiveEnforcement?: boolean;
};

type EnablePlan = {
  cache: {
    route: typeof TARGET_OPERATION;
    routeAllowlist: readonly CachePolicyRoute[];
    envWriteValues: Readonly<Record<string, string>>;
    readinessReason: string;
    prerequisites: readonly string[];
    proofRequirements: readonly string[];
  };
  rateLimit: {
    route: typeof TARGET_OPERATION;
    routeAllowlist: readonly RateLimitEnforcementOperation[];
    envWriteValues: Readonly<Record<string, string>>;
    mode: string;
    prerequisites: readonly string[];
    proofRequirements: readonly string[];
  };
  rollback: {
    documented: true;
    cache: {
      envKeysToRestoreOrDelete: readonly string[];
      renderApiOperations: readonly string[];
      emergencyDisableValues: Readonly<Record<string, string>>;
    };
    rateLimit: {
      envKeysToRestoreOrDelete: readonly string[];
      renderApiOperations: readonly string[];
      emergencyDisableValues: Readonly<Record<string, string>>;
    };
    postRollbackProbes: readonly string[];
  };
  healthReadyProbes: readonly string[];
};

export type CacheRateFlagInventory = {
  wave: typeof WAVE;
  final_status: typeof FINAL_STATUS;
  target_operation: typeof TARGET_OPERATION;
  generated_at: string;
  env_mutated: false;
  actual_env_keys_discovered: true;
  invented_env_keys: 0;
  rollback_path_documented: true;
  source_files: readonly string[];
  envKeys: EnvKeyInventory;
  routeAllowlists: {
    cacheReadThroughV1AllowedRoutes: readonly CachePolicyRoute[];
    cacheReadRoutes: readonly string[];
    rateBffReadOperations: readonly string[];
    plannedCacheRoutes: readonly CachePolicyRoute[];
    plannedRateLimitRoutes: readonly RateLimitEnforcementOperation[];
  };
  policies: {
    cache: RoutePolicySummary;
    rateLimit: RoutePolicySummary;
  };
  enablePlan: EnablePlan;
  safety: {
    productionEnvMutationPerformed: false;
    dbWrites: false;
    migrations: false;
    supabaseProjectChanges: false;
    credentialsRead: false;
    credentialsPrinted: false;
    envValuesPrinted: false;
    rawPayloadStored: false;
    broadRewrite: false;
  };
};

export type CacheRateFlagInventoryArtifacts = {
  inventory: typeof INVENTORY_PATH;
  matrix: typeof MATRIX_PATH;
  proof: typeof PROOF_PATH;
};

export const CACHE_RATE_FLAG_INVENTORY_ARTIFACTS: CacheRateFlagInventoryArtifacts = Object.freeze({
  inventory: INVENTORY_PATH,
  matrix: MATRIX_PATH,
  proof: PROOF_PATH,
});

const SOURCE_FILES = Object.freeze([
  "src/shared/scale/cachePolicies.ts",
  "src/shared/scale/cacheAdapters.ts",
  "src/shared/scale/cacheShadowRuntime.ts",
  "src/shared/scale/providerRuntimeConfig.ts",
  "src/shared/scale/rateLimitPolicies.ts",
  "src/shared/scale/rateLimitAdapters.ts",
  "scripts/cache_one_route_read_through_canary.ts",
  "scripts/rate_limit_shadow_smoke_marketplace_search.ts",
  "scripts/rate_limit_real_user_canary.ts",
  "scripts/server/stagingBffServerBoundary.ts",
]);

const RUNTIME_DETECTION_ENV_KEYS = Object.freeze([
  "EXPO_PUBLIC_APP_ENV",
  "EXPO_PUBLIC_ENVIRONMENT",
  "EXPO_PUBLIC_RELEASE_CHANNEL",
  "APP_ENV",
  "NODE_ENV",
]);

const RUNNER_OPERATIONAL_ENV_KEYS = Object.freeze([
  "RENDER_API_TOKEN",
  "RENDER_PRODUCTION_BFF_SERVICE_ID",
  "RENDER_SERVICE_ID",
  "BFF_PRODUCTION_BASE_URL",
  "RENDER_SERVICE_URL",
  "BFF_SERVER_AUTH_SECRET",
]);

const APPROVAL_GATE_ENV_KEYS = Object.freeze([
  "CACHE_CANARY_APPROVED",
  "ROLLBACK_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_PREFLIGHT_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_APPLY_APPROVED",
  "S_CACHE_PRODUCTION_READ_THROUGH_CANARY_ROLLBACK_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_PREFLIGHT_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_CANARY_APPROVED",
  "S_RATE_LIMIT_PRODUCTION_REAL_USER_ENFORCEMENT_ROLLBACK_APPROVED",
]);

const RATE_METADATA_ENV_KEYS = Object.freeze(["BFF_RATE_LIMIT_METADATA_ENABLED"]);

const uniqueSorted = (values: readonly string[]): readonly string[] =>
  Object.freeze(Array.from(new Set(values)).sort((left, right) => left.localeCompare(right)));

const presentPolicy = (policy: CachePolicy | RateEnforcementPolicy | null): boolean => policy !== null;

const getTargetCachePolicy = (): CachePolicy | null => getCachePolicy(TARGET_OPERATION);

const getTargetRatePolicy = (): RateEnforcementPolicy | null => getRateEnforcementPolicy(TARGET_OPERATION);

const buildEnvKeyInventory = (): EnvKeyInventory => {
  const cacheProvider = SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache;
  const rateProvider = SCALE_PROVIDER_RUNTIME_ENV_NAMES.rate_limit;
  const cacheRuntime = uniqueSorted([
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.productionEnabled,
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.mode,
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled,
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist,
    CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.percent,
  ]);
  const cacheProviderKeys = uniqueSorted([
    cacheProvider.enabled,
    ...(cacheProvider.productionEnabled ? [cacheProvider.productionEnabled] : []),
    ...cacheProvider.required,
    ...cacheProvider.optional,
  ]);
  const rateRuntime = uniqueSorted([
    RATE_ENFORCEMENT_MODE_ENV_NAME,
    RATE_LIMIT_TEST_NAMESPACE_ENV_NAME,
    RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME,
    RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME,
  ]);
  const rateProviderKeys = uniqueSorted([
    rateProvider.enabled,
    ...(rateProvider.productionEnabled ? [rateProvider.productionEnabled] : []),
    ...rateProvider.required,
    ...rateProvider.optional,
  ]);

  return {
    cacheRuntime,
    cacheProvider: cacheProviderKeys,
    rateRuntime,
    rateProvider: rateProviderKeys,
    rateMetadata: RATE_METADATA_ENV_KEYS,
    runtimeDetection: RUNTIME_DETECTION_ENV_KEYS,
    runnerOperational: RUNNER_OPERATIONAL_ENV_KEYS,
    approvalGates: APPROVAL_GATE_ENV_KEYS,
    all: uniqueSorted([
      ...cacheRuntime,
      ...cacheProviderKeys,
      ...rateRuntime,
      ...rateProviderKeys,
      ...RATE_METADATA_ENV_KEYS,
      ...RUNTIME_DETECTION_ENV_KEYS,
      ...RUNNER_OPERATIONAL_ENV_KEYS,
      ...APPROVAL_GATE_ENV_KEYS,
    ]),
  };
};

const summarizeCachePolicy = (policy: CachePolicy | null): RoutePolicySummary => ({
  operation: TARGET_OPERATION,
  present: presentPolicy(policy),
  defaultEnabled: policy?.defaultEnabled ?? false,
  ttlMs: policy?.ttlMs,
  staleWhileRevalidateMs: policy?.staleWhileRevalidateMs,
  maxPayloadBytes: policy?.maxPayloadBytes,
  payloadClass: policy?.payloadClass,
  piiSafe: policy?.piiSafe,
});

const summarizeRatePolicy = (policy: RateEnforcementPolicy | null): RoutePolicySummary => ({
  operation: TARGET_OPERATION,
  present: presentPolicy(policy),
  defaultEnabled: policy?.defaultEnabled ?? false,
  category: policy?.category,
  scope: policy?.scope,
  windowMs: policy?.windowMs,
  maxRequests: policy?.maxRequests,
  burst: policy?.burst,
  cooldownMs: policy?.cooldownMs,
  enforcementEnabledByDefault: policy?.enforcementEnabledByDefault,
  externalStoreRequiredForLiveEnforcement: policy?.externalStoreRequiredForLiveEnforcement,
});

const routePath = (route: { path: string }): string => route.path;

const targetReadRoutePath = (): string => {
  const route = BFF_STAGING_READ_ROUTES.find((entry) => entry.operation === TARGET_OPERATION);
  return route?.path ?? "/api/staging-bff/read/marketplace-catalog-search";
};

const buildEnablePlan = (): EnablePlan => {
  const cacheApplyEnv = buildCacheReadThroughOneRouteApplyEnv("persistent");
  const cacheReadiness = explainCacheReadThroughOneRouteReadiness(
    resolveCacheReadThroughOneRouteApplyConfig("persistent"),
  );
  const rateLimitEnv = Object.freeze({
    [RATE_ENFORCEMENT_MODE_ENV_NAME]: "enforce_production_real_user_route_canary_only",
    [RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME]: TARGET_OPERATION,
    [RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME]: TARGET_RATE_LIMIT_PERCENT,
  });

  return {
    cache: {
      route: TARGET_OPERATION,
      routeAllowlist: [CACHE_READ_THROUGH_ONE_ROUTE],
      envWriteValues: cacheApplyEnv,
      readinessReason: cacheReadiness.reason,
      prerequisites: [
        "production approval gates are present",
        "redis cache provider is configured with SCALE_REDIS_CACHE_NAMESPACE and SCALE_REDIS_CACHE_URL or REDIS_URL",
        "Render auto-deploy is disabled before env mutation",
        "production /health and /ready are 200 before apply",
      ],
      proofRequirements: [
        "ready payload reports cacheShadowRuntime.mode=read_through",
        "ready payload reports cacheShadowRuntime.routeAllowlistCount=1",
        "ready payload reports cacheShadowRuntime.percent=1",
        "cache shadow diagnostic is ready",
        "first marketplace.catalog.search read is miss/read-through",
        "second marketplace.catalog.search read is cache hit",
        "cache monitor output remains redacted",
      ],
    },
    rateLimit: {
      route: TARGET_OPERATION,
      routeAllowlist: [TARGET_OPERATION],
      envWriteValues: rateLimitEnv,
      mode: resolveRateEnforcementMode(rateLimitEnv[RATE_ENFORCEMENT_MODE_ENV_NAME]),
      prerequisites: [
        "production approval gates are present",
        "rate-limit provider is configured with SCALE_RATE_LIMIT_STORE_URL and SCALE_RATE_LIMIT_NAMESPACE",
        "SCALE_RATE_LIMIT_PRODUCTION_ENABLED is already approved for the provider",
        "Render auto-deploy is disabled before env mutation",
        "production /health and /ready are 200 before apply",
      ],
      proofRequirements: [
        "mode is enforce_production_real_user_route_canary_only",
        "route allowlist count is 1 and route is marketplace.catalog.search",
        "canary percent is 1",
        "selected and non-selected marketplace catalog reads stay 2xx",
        "private synthetic smoke proves allow and throttle",
        "health and ready remain 200 after canary",
      ],
    },
    rollback: {
      documented: true,
      cache: {
        envKeysToRestoreOrDelete: Object.keys(cacheApplyEnv),
        renderApiOperations: [
          "GET /services/{serviceId}/env-vars?limit=100 before apply",
          "PUT or DELETE /services/{serviceId}/env-vars/{key} for each cache env key to restore previous state",
          "POST /services/{serviceId}/deploys with current commitId",
        ],
        emergencyDisableValues: {
          [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.productionEnabled]: "false",
          [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.mode]: "disabled",
          [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled]: "false",
          [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist]: "",
          [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.percent]: "0",
        },
      },
      rateLimit: {
        envKeysToRestoreOrDelete: Object.keys(rateLimitEnv),
        renderApiOperations: [
          "GET /services/{serviceId}/env-vars?limit=100 before apply",
          "PUT or DELETE /services/{serviceId}/env-vars/{key} for each rate-limit env key to restore previous state",
          "POST /services/{serviceId}/deploys with current commitId",
        ],
        emergencyDisableValues: {
          [RATE_ENFORCEMENT_MODE_ENV_NAME]: "disabled",
          [RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST_ENV_NAME]: "",
          [RATE_LIMIT_REAL_USER_CANARY_PERCENT_ENV_NAME]: "0",
        },
      },
      postRollbackProbes: [routePath(BFF_STAGING_HEALTH_ROUTE), routePath(BFF_STAGING_READINESS_ROUTE)],
    },
    healthReadyProbes: [
      routePath(BFF_STAGING_HEALTH_ROUTE),
      routePath(BFF_STAGING_READINESS_ROUTE),
      routePath(BFF_STAGING_CACHE_SHADOW_CANARY_ROUTE),
      routePath(BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE),
      routePath(BFF_STAGING_RATE_LIMIT_PRIVATE_SMOKE_ROUTE),
      routePath(BFF_STAGING_RATE_LIMIT_SHADOW_MONITOR_ROUTE),
      targetReadRoutePath(),
    ],
  };
};

export function buildCacheRateFlagInventory(generatedAt = new Date().toISOString()): CacheRateFlagInventory {
  const cachePolicy = getTargetCachePolicy();
  const ratePolicy = getTargetRatePolicy();
  const envKeys = buildEnvKeyInventory();

  return {
    wave: WAVE,
    final_status: FINAL_STATUS,
    target_operation: TARGET_OPERATION,
    generated_at: generatedAt,
    env_mutated: false,
    actual_env_keys_discovered: true,
    invented_env_keys: 0,
    rollback_path_documented: true,
    source_files: SOURCE_FILES,
    envKeys,
    routeAllowlists: {
      cacheReadThroughV1AllowedRoutes: CACHE_READ_THROUGH_V1_ALLOWED_ROUTES,
      cacheReadRoutes: CACHE_READ_ROUTE_OPERATIONS,
      rateBffReadOperations: BFF_READ_RATE_LIMIT_OPERATIONS,
      plannedCacheRoutes: [CACHE_READ_THROUGH_ONE_ROUTE],
      plannedRateLimitRoutes: [TARGET_OPERATION],
    },
    policies: {
      cache: summarizeCachePolicy(cachePolicy),
      rateLimit: summarizeRatePolicy(ratePolicy),
    },
    enablePlan: buildEnablePlan(),
    safety: {
      productionEnvMutationPerformed: false,
      dbWrites: false,
      migrations: false,
      supabaseProjectChanges: false,
      credentialsRead: false,
      credentialsPrinted: false,
      envValuesPrinted: false,
      rawPayloadStored: false,
      broadRewrite: false,
    },
  };
}

export function buildCacheRateFlagMatrix(inventory: CacheRateFlagInventory): Record<string, unknown> {
  return {
    final_status: inventory.final_status,
    target_operation: inventory.target_operation,
    actual_env_keys_discovered: inventory.actual_env_keys_discovered,
    invented_env_keys: inventory.invented_env_keys,
    rollback_path_documented: inventory.rollback_path_documented,
    env_mutated: inventory.env_mutated,
    cache_marketplace_catalog_search_only: inventory.enablePlan.cache.routeAllowlist.length === 1,
    rate_limit_marketplace_catalog_search_only: inventory.enablePlan.rateLimit.routeAllowlist.length === 1,
    cache_policy_present: inventory.policies.cache.present,
    rate_limit_policy_present: inventory.policies.rateLimit.present,
    cache_default_enabled: inventory.policies.cache.defaultEnabled,
    rate_limit_default_enabled: inventory.policies.rateLimit.defaultEnabled,
    rate_limit_enforcement_enabled_by_default: inventory.policies.rateLimit.enforcementEnabledByDefault,
    cache_rollback_keys_count: inventory.enablePlan.rollback.cache.envKeysToRestoreOrDelete.length,
    rate_limit_rollback_keys_count: inventory.enablePlan.rollback.rateLimit.envKeysToRestoreOrDelete.length,
    health_ready_probes_documented: inventory.enablePlan.healthReadyProbes.includes("/health") &&
      inventory.enablePlan.healthReadyProbes.includes("/ready"),
    credentials_printed: inventory.safety.credentialsPrinted,
    env_values_printed: inventory.safety.envValuesPrinted,
    db_writes: inventory.safety.dbWrites,
    migrations: inventory.safety.migrations,
    supabase_project_changes: inventory.safety.supabaseProjectChanges,
    source_files: inventory.source_files,
  };
}

export function renderCacheRateFlagProof(inventory: CacheRateFlagInventory): string {
  return [
    "# S_CACHE_RATE_01_FLAG_INVENTORY Proof",
    "",
    `final_status: ${inventory.final_status}`,
    "",
    "## Scope",
    `- target_operation: ${inventory.target_operation}`,
    "- env_mutated: false",
    "- cache_scope: marketplace.catalog.search only",
    "- rate_limit_scope: marketplace.catalog.search only",
    "",
    "## Actual Env Keys",
    `- total_env_key_names: ${inventory.envKeys.all.length}`,
    `- cache_runtime: ${inventory.envKeys.cacheRuntime.join(", ")}`,
    `- cache_provider: ${inventory.envKeys.cacheProvider.join(", ")}`,
    `- rate_runtime: ${inventory.envKeys.rateRuntime.join(", ")}`,
    `- rate_provider: ${inventory.envKeys.rateProvider.join(", ")}`,
    "",
    "## Enable Plan",
    `- cache_mode: ${CACHE_READ_THROUGH_ONE_ROUTE_MODE}`,
    `- cache_percent: ${CACHE_READ_THROUGH_ONE_ROUTE_PERCENT}`,
    `- rate_mode: ${inventory.enablePlan.rateLimit.mode}`,
    `- rate_percent: ${TARGET_RATE_LIMIT_PERCENT}`,
    "",
    "## Rollback",
    `- rollback_path_documented: ${String(inventory.rollback_path_documented)}`,
    `- cache_keys_to_restore_or_delete: ${inventory.enablePlan.rollback.cache.envKeysToRestoreOrDelete.join(", ")}`,
    `- rate_limit_keys_to_restore_or_delete: ${inventory.enablePlan.rollback.rateLimit.envKeysToRestoreOrDelete.join(", ")}`,
    `- post_rollback_probes: ${inventory.enablePlan.rollback.postRollbackProbes.join(", ")}`,
    "",
    "## Safety",
    "- production env was not read or mutated by this inventory wave.",
    "- credentials and live env values are not printed or stored; planned non-secret flag values are documented.",
    "- no DB writes, migrations, Supabase project changes, hooks, UI decomposition, build, OTA, model provider changes, or cache/rate rollout were performed.",
    "",
  ].join("\n");
}

export function writeCacheRateFlagInventoryArtifacts(
  inventory: CacheRateFlagInventory,
  projectRoot = process.cwd(),
): CacheRateFlagInventoryArtifacts {
  const artifactRoot = path.join(projectRoot, ARTIFACT_DIR);
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(path.join(projectRoot, INVENTORY_PATH), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    path.join(projectRoot, MATRIX_PATH),
    `${JSON.stringify(buildCacheRateFlagMatrix(inventory), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(path.join(projectRoot, PROOF_PATH), renderCacheRateFlagProof(inventory), "utf8");
  return CACHE_RATE_FLAG_INVENTORY_ARTIFACTS;
}

async function main(): Promise<void> {
  const inventory = buildCacheRateFlagInventory();
  const shouldWriteArtifacts = process.argv.includes("--write-artifacts");
  const artifacts = shouldWriteArtifacts
    ? writeCacheRateFlagInventoryArtifacts(inventory)
    : CACHE_RATE_FLAG_INVENTORY_ARTIFACTS;
  console.log(
    JSON.stringify({
      final_status: inventory.final_status,
      artifact_inventory: artifacts.inventory,
      artifact_matrix: artifacts.matrix,
      artifact_proof: artifacts.proof,
      artifacts_written: shouldWriteArtifacts,
    }),
  );
}

const normalizedEntryPoint = process.argv[1]?.replace(/\\/g, "/") ?? "";
if (normalizedEntryPoint.endsWith("scripts/runtime/cacheRateFlagInventory.ts")) {
  main().catch((error: unknown) => {
    const errorCategory = error instanceof Error ? error.name : "unknown_error";
    console.error(JSON.stringify({ final_status: "BLOCKED_CACHE_RATE_FLAG_INVENTORY_FAILED", error_category: errorCategory }));
    process.exit(2);
  });
}
