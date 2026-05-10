import type { CacheAdapter, CacheAdapterProbeStatus, CacheAdapterStatus } from "./cacheAdapters";
import { buildSafeCacheKey } from "./cacheKeySafety";
import type { CachePolicyRoute } from "./cachePolicies";
import { getCachePolicy } from "./cachePolicies";

export type CacheShadowMode = "disabled" | "shadow_readonly" | "synthetic_canary_only" | "read_through";

export type CacheShadowRuntimeEnv = Record<string, string | undefined>;

export type CacheShadowRuntimeConfig = {
  enabled: boolean;
  mode: CacheShadowMode;
  readThroughV1Enabled: boolean;
  routeAllowlist: readonly CachePolicyRoute[];
  percent: number;
  productionEnabledFlagTruthy: boolean;
  envKeyPresence: {
    productionEnabled: boolean;
    mode: boolean;
    readThroughV1Enabled: boolean;
    routeAllowlist: boolean;
    percent: boolean;
    url: boolean;
    namespace: boolean;
    commandTimeout: boolean;
  };
};

export type CacheShadowDecisionStatus =
  | "disabled"
  | "skipped"
  | "hit"
  | "miss"
  | "unsafe_key"
  | "adapter_unavailable"
  | "error";

export type CacheShadowDecision = {
  status: CacheShadowDecisionStatus;
  route: CachePolicyRoute;
  mode: CacheShadowMode;
  shadowReadAttempted: boolean;
  cacheHit: boolean;
  responseChanged: false;
  syntheticIdentityUsed: boolean;
  realUserPayloadUsed: false;
  rawKeyReturned: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
};

export type CacheShadowMonitorSnapshot = {
  observedDecisionCount: number;
  shadowReadAttemptedCount: number;
  hitCount: number;
  missCount: number;
  readThroughCount: number;
  dryRunDecisionCount: number;
  wouldCacheRead: number;
  wouldCacheHit: number;
  wouldCacheMiss: number;
  wouldCacheBypassReason: readonly CacheShadowDryRunBypassReasonSnapshot[];
  skippedCount: number;
  unsafeKeyCount: number;
  errorCount: number;
  routeMetrics: readonly CacheShadowRouteMetricSnapshot[];
  responseChanged: false;
  realUserPayloadStored: false;
  rawKeysStored: false;
  rawKeysPrinted: false;
  rawPayloadLogged: false;
  piiLogged: false;
};

export type CacheShadowRouteMetricSnapshot = {
  route: CachePolicyRoute;
  observedDecisionCount: number;
  shadowReadAttemptedCount: number;
  hitCount: number;
  missCount: number;
  readThroughCount: number;
  skippedCount: number;
  unsafeKeyCount: number;
  errorCount: number;
  redacted: true;
};

export type CacheShadowDryRunBypassReasonSnapshot = {
  reasonCode: string;
  count: number;
  redacted: true;
};

export type CacheShadowMonitor = {
  observe(decision: CacheShadowDecision): Promise<void>;
  snapshot(): CacheShadowMonitorSnapshot;
};

export type CacheSyntheticShadowCanaryResult = {
  status: "ready" | "disabled" | "adapter_unavailable" | "unsafe_key" | "error";
  route: CachePolicyRoute;
  providerKind: CacheAdapterStatus["kind"];
  providerEnabled: boolean;
  externalNetworkEnabled: boolean;
  mode: CacheShadowMode;
  syntheticIdentityUsed: true;
  realUserPayloadUsed: false;
  shadowReadAttempted: boolean;
  cacheHitVerified: boolean;
  responseChanged: false;
  cacheWriteSyntheticOnly: boolean;
  cleanupAttempted: boolean;
  cleanupOk: boolean;
  ttlBounded: boolean;
  rawKeyReturned: false;
  rawPayloadLogged: false;
  piiLogged: false;
  reason: string;
  commandProbeAttempted: boolean;
  commandProbeStatus: CacheAdapterProbeStatus | "not_supported";
  commandSetAttempted: boolean;
  commandSetOk: boolean;
  commandGetAttempted: boolean;
  commandGetOk: boolean;
  commandValueMatched: boolean;
  commandDeleteAttempted: boolean;
  commandDeleteOk: boolean;
  decision?: CacheShadowDecision;
};

const truthyValues = new Set(["1", "true", "yes", "on", "enabled"]);
const CACHE_SHADOW_ALLOWED_MODES = new Set<CacheShadowMode>([
  "disabled",
  "shadow_readonly",
  "synthetic_canary_only",
  "read_through",
]);

const DEFAULT_CACHE_SHADOW_ROUTE: CachePolicyRoute = "marketplace.catalog.search";
const DEFAULT_CACHE_SHADOW_PERCENT = 0;
const MAX_CACHE_SHADOW_PERCENT = 100;
const SYNTHETIC_CANARY_TTL_MS = 30_000;
export const CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME = "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED";
export const CACHE_READ_THROUGH_V1_ALLOWED_ROUTES: readonly CachePolicyRoute[] = Object.freeze([
  "marketplace.catalog.search",
]);

export const isCacheReadThroughV1RouteAllowed = (route: CachePolicyRoute): boolean =>
  CACHE_READ_THROUGH_V1_ALLOWED_ROUTES.includes(route);

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseTruthy = (value: unknown): boolean => truthyValues.has(normalizeText(value).toLowerCase());

const hasEnvKey = (env: CacheShadowRuntimeEnv, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(env, key);

const parseMode = (value: unknown): CacheShadowMode => {
  const mode = normalizeText(value).toLowerCase();
  return CACHE_SHADOW_ALLOWED_MODES.has(mode as CacheShadowMode) ? (mode as CacheShadowMode) : "disabled";
};

const parsePercent = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_CACHE_SHADOW_PERCENT;
  return Math.min(Math.max(Math.trunc(parsed), 0), MAX_CACHE_SHADOW_PERCENT);
};

const parseRouteAllowlist = (value: unknown): readonly CachePolicyRoute[] => {
  const routes = normalizeText(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const validRoutes: CachePolicyRoute[] = [];
  for (const route of routes) {
    if (getCachePolicy(route as CachePolicyRoute)) validRoutes.push(route as CachePolicyRoute);
  }
  return Array.from(new Set(validRoutes));
};

const fnv1a = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const routeAllowed = (config: CacheShadowRuntimeConfig, route: CachePolicyRoute): boolean =>
  config.routeAllowlist.length === 0 || config.routeAllowlist.includes(route);

const selectedByPercent = (key: string, percent: number): boolean => {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return fnv1a(key) % 100 < percent;
};

const disabledDecision = (
  route: CachePolicyRoute,
  mode: CacheShadowMode,
  reason: string,
  status: CacheShadowDecisionStatus = "skipped",
  syntheticIdentityUsed = false,
): CacheShadowDecision => ({
  status,
  route,
  mode,
  shadowReadAttempted: false,
  cacheHit: false,
  responseChanged: false,
  syntheticIdentityUsed,
  realUserPayloadUsed: false,
  rawKeyReturned: false,
  rawPayloadLogged: false,
  piiLogged: false,
  reason,
});

const createEmptyRouteMetric = (route: CachePolicyRoute): CacheShadowRouteMetricSnapshot => ({
  route,
  observedDecisionCount: 0,
  shadowReadAttemptedCount: 0,
  hitCount: 0,
  missCount: 0,
  readThroughCount: 0,
  skippedCount: 0,
  unsafeKeyCount: 0,
  errorCount: 0,
  redacted: true,
});

const observeCacheDecisionCounts = (
  snapshot: Omit<CacheShadowMonitorSnapshot, "routeMetrics"> | CacheShadowRouteMetricSnapshot,
  decision: CacheShadowDecision,
): void => {
  snapshot.observedDecisionCount += 1;
  if (decision.shadowReadAttempted) snapshot.shadowReadAttemptedCount += 1;
  if (decision.status === "hit") snapshot.hitCount += 1;
  if (decision.status === "miss") snapshot.missCount += 1;
  if (decision.mode === "read_through" && decision.status === "miss") snapshot.readThroughCount += 1;
  if (decision.status === "skipped" || decision.status === "disabled") snapshot.skippedCount += 1;
  if (decision.status === "unsafe_key") snapshot.unsafeKeyCount += 1;
  if (decision.status === "error" || decision.status === "adapter_unavailable") snapshot.errorCount += 1;
};

const CACHE_DRY_RUN_BYPASS_REASON_PATTERN = /[^a-z0-9_.:-]/gi;

const normalizeCacheDryRunBypassReason = (reason: string): string => {
  const normalized = reason
    .trim()
    .replace(CACHE_DRY_RUN_BYPASS_REASON_PATTERN, "_")
    .slice(0, 80);
  return normalized || "unknown";
};

const buildCacheDryRunBypassReasonSnapshot = (
  reasons: ReadonlyMap<string, number>,
): readonly CacheShadowDryRunBypassReasonSnapshot[] =>
  Array.from(reasons.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reasonCode, count]) => ({
      reasonCode,
      count,
      redacted: true,
    }));

const CACHE_SHADOW_ROUTE_METRIC_ALLOWED_KEYS = new Set([
  "route",
  "observedDecisionCount",
  "shadowReadAttemptedCount",
  "hitCount",
  "missCount",
  "readThroughCount",
  "skippedCount",
  "unsafeKeyCount",
  "errorCount",
  "redacted",
]);

const CACHE_SHADOW_FORBIDDEN_METRIC_KEY_PATTERN =
  /(url|uri|token|secret|authorization|cookie|body|payload|user|company)/i;
const CACHE_SHADOW_FORBIDDEN_METRIC_VALUE_PATTERN =
  /(https?:\/\/|bearer\s+|postgres(?:ql)?:\/\/|redis:\/\/|rediss:\/\/|token=|secret=)/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function validateCacheShadowRouteMetricsOutput(value: unknown): {
  passed: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const metrics = Array.isArray(value) ? value : [value];
  for (const [index, metric] of metrics.entries()) {
    if (!isRecord(metric)) {
      errors.push(`route_metric_${index}:not_object`);
      continue;
    }
    for (const [key, item] of Object.entries(metric)) {
      if (!CACHE_SHADOW_ROUTE_METRIC_ALLOWED_KEYS.has(key)) {
        errors.push(`route_metric_${index}:forbidden_metric_key:${key}`);
      }
      if (CACHE_SHADOW_FORBIDDEN_METRIC_KEY_PATTERN.test(key)) {
        errors.push(`route_metric_${index}:forbidden_metric_key:${key}`);
      }
      if (typeof item === "string" && CACHE_SHADOW_FORBIDDEN_METRIC_VALUE_PATTERN.test(item)) {
        errors.push(`route_metric_${index}:forbidden_metric_value:${key}`);
      }
    }
  }
  return { passed: errors.length === 0, errors };
}

export function resolveCacheShadowRuntimeConfig(
  env: CacheShadowRuntimeEnv = typeof process !== "undefined" ? process.env : {},
): CacheShadowRuntimeConfig {
  const productionEnabledFlagTruthy = parseTruthy(env.SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED);
  const mode = productionEnabledFlagTruthy ? parseMode(env.SCALE_REDIS_CACHE_SHADOW_MODE) : "disabled";
  const readThroughV1Enabled = parseTruthy(env[CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME]);
  return {
    enabled: productionEnabledFlagTruthy && mode !== "disabled",
    mode,
    readThroughV1Enabled,
    routeAllowlist: parseRouteAllowlist(env.SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST),
    percent: parsePercent(env.SCALE_REDIS_CACHE_SHADOW_PERCENT),
    productionEnabledFlagTruthy,
    envKeyPresence: {
      productionEnabled: hasEnvKey(env, "SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED"),
      mode: hasEnvKey(env, "SCALE_REDIS_CACHE_SHADOW_MODE"),
      readThroughV1Enabled: hasEnvKey(env, CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME),
      routeAllowlist: hasEnvKey(env, "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST"),
      percent: hasEnvKey(env, "SCALE_REDIS_CACHE_SHADOW_PERCENT"),
      url: hasEnvKey(env, "SCALE_REDIS_CACHE_URL") || hasEnvKey(env, "REDIS_URL"),
      namespace: hasEnvKey(env, "SCALE_REDIS_CACHE_NAMESPACE"),
      commandTimeout: hasEnvKey(env, "SCALE_REDIS_CACHE_COMMAND_TIMEOUT_MS"),
    },
  };
}

export function createCacheShadowMonitor(): CacheShadowMonitor {
  const snapshot: CacheShadowMonitorSnapshot = {
    observedDecisionCount: 0,
    shadowReadAttemptedCount: 0,
    hitCount: 0,
    missCount: 0,
    readThroughCount: 0,
    dryRunDecisionCount: 0,
    wouldCacheRead: 0,
    wouldCacheHit: 0,
    wouldCacheMiss: 0,
    wouldCacheBypassReason: [],
    skippedCount: 0,
    unsafeKeyCount: 0,
    errorCount: 0,
    routeMetrics: [],
    responseChanged: false,
    realUserPayloadStored: false,
    rawKeysStored: false,
    rawKeysPrinted: false,
    rawPayloadLogged: false,
    piiLogged: false,
  };
  const routeMetrics = new Map<CachePolicyRoute, CacheShadowRouteMetricSnapshot>();
  const dryRunBypassReasons = new Map<string, number>();

  return {
    async observe(decision) {
      observeCacheDecisionCounts(snapshot, decision);
      if (decision.mode !== "read_through") {
        snapshot.dryRunDecisionCount += 1;
        if (decision.shadowReadAttempted) {
          snapshot.wouldCacheRead += 1;
          if (decision.cacheHit) snapshot.wouldCacheHit += 1;
          if (!decision.cacheHit) snapshot.wouldCacheMiss += 1;
        } else {
          const reason = normalizeCacheDryRunBypassReason(decision.reason);
          dryRunBypassReasons.set(reason, (dryRunBypassReasons.get(reason) ?? 0) + 1);
        }
      }
      const routeMetric = routeMetrics.get(decision.route) ?? createEmptyRouteMetric(decision.route);
      observeCacheDecisionCounts(routeMetric, decision);
      routeMetrics.set(decision.route, routeMetric);
    },
    snapshot() {
      return {
        ...snapshot,
        wouldCacheBypassReason: buildCacheDryRunBypassReasonSnapshot(dryRunBypassReasons),
        routeMetrics: Array.from(routeMetrics.values())
          .sort((left, right) => left.route.localeCompare(right.route))
          .map((metric) => ({ ...metric })),
      };
    },
  };
}

export async function evaluateCacheShadowRead(params: {
  adapter: CacheAdapter;
  config: CacheShadowRuntimeConfig;
  route: CachePolicyRoute;
  input: Record<string, unknown>;
  syntheticCanary?: boolean;
}): Promise<CacheShadowDecision> {
  const syntheticCanary = params.syntheticCanary === true;
  const policy = getCachePolicy(params.route);
  if (!policy) {
    return disabledDecision(params.route, params.config.mode, "invalid_policy", "unsafe_key", syntheticCanary);
  }
  if (!params.config.enabled) {
    return disabledDecision(params.route, params.config.mode, "cache_shadow_disabled", "disabled", syntheticCanary);
  }
  if (params.config.mode === "synthetic_canary_only" && !syntheticCanary) {
    return disabledDecision(params.route, params.config.mode, "non_synthetic_request_skipped");
  }
  if (!routeAllowed(params.config, params.route)) {
    return disabledDecision(params.route, params.config.mode, "route_not_allowlisted", "skipped", syntheticCanary);
  }

  const keyResult = buildSafeCacheKey(policy, params.input);
  if (!keyResult.ok) {
    return disabledDecision(params.route, params.config.mode, keyResult.reason, "unsafe_key", syntheticCanary);
  }
  if (!syntheticCanary && !selectedByPercent(keyResult.key, params.config.percent)) {
    return disabledDecision(params.route, params.config.mode, "not_selected_by_percent");
  }

  const adapterStatus = params.adapter.getStatus();
  if (!adapterStatus.enabled || !adapterStatus.externalNetworkEnabled) {
    return disabledDecision(params.route, params.config.mode, "adapter_unavailable", "adapter_unavailable", syntheticCanary);
  }

  try {
    const value = await params.adapter.get<unknown>(keyResult.key);
    const cacheHit = value !== null;
    return {
      status: cacheHit ? "hit" : "miss",
      route: params.route,
      mode: params.config.mode,
      shadowReadAttempted: true,
      cacheHit,
      responseChanged: false,
      syntheticIdentityUsed: syntheticCanary,
      realUserPayloadUsed: false,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: cacheHit ? "cache_shadow_hit" : "cache_shadow_miss",
    };
  } catch {
    return disabledDecision(params.route, params.config.mode, "cache_shadow_error", "error", syntheticCanary);
  }
}

export async function runCacheSyntheticShadowCanary(params: {
  adapter: CacheAdapter;
  config: CacheShadowRuntimeConfig;
  route?: CachePolicyRoute;
}): Promise<CacheSyntheticShadowCanaryResult> {
  const route = params.route ?? DEFAULT_CACHE_SHADOW_ROUTE;
  const provider = params.adapter.getStatus();
  if (!params.config.enabled) {
    return buildCacheSyntheticResult("disabled", route, provider, params.config, "cache_shadow_disabled");
  }
  if (!provider.enabled || !provider.externalNetworkEnabled) {
    return buildCacheSyntheticResult("adapter_unavailable", route, provider, params.config, "adapter_unavailable");
  }

  const policy = getCachePolicy(route);
  const syntheticInput = {
    companyId: "company-cache-canary-opaque",
    query: "cement",
    category: "materials",
    page: 1,
    pageSize: 5,
  };
  const keyResult = buildSafeCacheKey(policy, syntheticInput);
  if (!keyResult.ok) {
    return buildCacheSyntheticResult("unsafe_key", route, provider, params.config, keyResult.reason);
  }

  const value = { kind: "cache-shadow-canary", version: 1 };
  const options = {
    ttlMs: Math.min(policy?.ttlMs ?? SYNTHETIC_CANARY_TTL_MS, SYNTHETIC_CANARY_TTL_MS),
    tags: ["cache_canary"],
  };

  if (params.adapter.probeSetGetDelete) {
    const probe = await params.adapter.probeSetGetDelete(keyResult.key, value, options);
    const status: CacheSyntheticShadowCanaryResult["status"] =
      probe.status === "ready"
        ? "ready"
        : probe.status === "disabled"
          ? "adapter_unavailable"
          : probe.status === "unsafe_key"
            ? "unsafe_key"
            : "error";
    const decision: CacheShadowDecision | undefined =
      probe.status === "ready"
        ? {
            status: "hit",
            route,
            mode: params.config.mode,
            shadowReadAttempted: true,
            cacheHit: true,
            responseChanged: false,
            syntheticIdentityUsed: true,
            realUserPayloadUsed: false,
            rawKeyReturned: false,
            rawPayloadLogged: false,
            piiLogged: false,
            reason: "cache_shadow_hit",
          }
        : undefined;

    return {
      status,
      route,
      providerKind: provider.kind,
      providerEnabled: provider.enabled,
      externalNetworkEnabled: provider.externalNetworkEnabled,
      mode: params.config.mode,
      syntheticIdentityUsed: true,
      realUserPayloadUsed: false,
      shadowReadAttempted: probe.getAttempted,
      cacheHitVerified: probe.status === "ready" && probe.valueMatched,
      responseChanged: false,
      cacheWriteSyntheticOnly: probe.setAttempted,
      cleanupAttempted: probe.deleteAttempted,
      cleanupOk: probe.deleteOk,
      ttlBounded: probe.ttlBounded,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: probe.reason,
      commandProbeAttempted: true,
      commandProbeStatus: probe.status,
      commandSetAttempted: probe.setAttempted,
      commandSetOk: probe.setOk,
      commandGetAttempted: probe.getAttempted,
      commandGetOk: probe.getOk,
      commandValueMatched: probe.valueMatched,
      commandDeleteAttempted: probe.deleteAttempted,
      commandDeleteOk: probe.deleteOk,
      decision,
    };
  }

  let cleanupOk = false;
  try {
    await params.adapter.set(keyResult.key, value, options);
    const decision = await evaluateCacheShadowRead({
      adapter: params.adapter,
      config: {
        ...params.config,
        percent: 100,
      },
      route,
      input: syntheticInput,
      syntheticCanary: true,
    });
    await params.adapter.delete(keyResult.key);
    cleanupOk = true;
    return {
      status: decision.status === "hit" ? "ready" : "error",
      route,
      providerKind: provider.kind,
      providerEnabled: provider.enabled,
      externalNetworkEnabled: provider.externalNetworkEnabled,
      mode: params.config.mode,
      syntheticIdentityUsed: true,
      realUserPayloadUsed: false,
      shadowReadAttempted: decision.shadowReadAttempted,
      cacheHitVerified: decision.cacheHit,
      responseChanged: false,
      cacheWriteSyntheticOnly: true,
      cleanupAttempted: true,
      cleanupOk,
      ttlBounded: true,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: decision.reason,
      commandProbeAttempted: false,
      commandProbeStatus: "not_supported",
      commandSetAttempted: false,
      commandSetOk: false,
      commandGetAttempted: false,
      commandGetOk: false,
      commandValueMatched: false,
      commandDeleteAttempted: false,
      commandDeleteOk: false,
      decision,
    };
  } catch {
    try {
      await params.adapter.delete(keyResult.key);
      cleanupOk = true;
    } catch {
      cleanupOk = false;
    }
    return {
      ...buildCacheSyntheticResult("error", route, provider, params.config, "cache_shadow_canary_error"),
      cleanupAttempted: true,
      cleanupOk,
      ttlBounded: true,
    };
  }
}

function buildCacheSyntheticResult(
  status: CacheSyntheticShadowCanaryResult["status"],
  route: CachePolicyRoute,
  provider: CacheAdapterStatus,
  config: CacheShadowRuntimeConfig,
  reason: string,
): CacheSyntheticShadowCanaryResult {
  return {
    status,
    route,
    providerKind: provider.kind,
    providerEnabled: provider.enabled,
    externalNetworkEnabled: provider.externalNetworkEnabled,
    mode: config.mode,
    syntheticIdentityUsed: true,
    realUserPayloadUsed: false,
    shadowReadAttempted: false,
    cacheHitVerified: false,
    responseChanged: false,
    cacheWriteSyntheticOnly: false,
    cleanupAttempted: false,
    cleanupOk: false,
    ttlBounded: false,
    rawKeyReturned: false,
    rawPayloadLogged: false,
    piiLogged: false,
    reason,
    commandProbeAttempted: false,
    commandProbeStatus: "not_supported",
    commandSetAttempted: false,
    commandSetOk: false,
    commandGetAttempted: false,
    commandGetOk: false,
    commandValueMatched: false,
    commandDeleteAttempted: false,
    commandDeleteOk: false,
  };
}
