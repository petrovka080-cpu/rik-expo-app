import type { CacheAdapter, CacheAdapterStatus } from "./cacheAdapters";
import { buildSafeCacheKey } from "./cacheKeySafety";
import type { CachePolicyRoute } from "./cachePolicies";
import { getCachePolicy } from "./cachePolicies";

export type CacheShadowMode = "disabled" | "shadow_readonly" | "synthetic_canary_only";

export type CacheShadowRuntimeEnv = Record<string, string | undefined>;

export type CacheShadowRuntimeConfig = {
  enabled: boolean;
  mode: CacheShadowMode;
  routeAllowlist: readonly CachePolicyRoute[];
  percent: number;
  productionEnabledFlagTruthy: boolean;
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
  skippedCount: number;
  unsafeKeyCount: number;
  errorCount: number;
  responseChanged: false;
  realUserPayloadStored: false;
  rawKeysStored: false;
  rawKeysPrinted: false;
  rawPayloadLogged: false;
  piiLogged: false;
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
  decision?: CacheShadowDecision;
};

const truthyValues = new Set(["1", "true", "yes", "on", "enabled"]);
const CACHE_SHADOW_ALLOWED_MODES = new Set<CacheShadowMode>([
  "disabled",
  "shadow_readonly",
  "synthetic_canary_only",
]);

const DEFAULT_CACHE_SHADOW_ROUTE: CachePolicyRoute = "marketplace.catalog.search";
const DEFAULT_CACHE_SHADOW_PERCENT = 0;
const MAX_CACHE_SHADOW_PERCENT = 100;
const SYNTHETIC_CANARY_TTL_MS = 30_000;

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseTruthy = (value: unknown): boolean => truthyValues.has(normalizeText(value).toLowerCase());

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

export function resolveCacheShadowRuntimeConfig(
  env: CacheShadowRuntimeEnv = typeof process !== "undefined" ? process.env : {},
): CacheShadowRuntimeConfig {
  const productionEnabledFlagTruthy = parseTruthy(env.SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED);
  const mode = productionEnabledFlagTruthy ? parseMode(env.SCALE_REDIS_CACHE_SHADOW_MODE) : "disabled";
  return {
    enabled: productionEnabledFlagTruthy && mode !== "disabled",
    mode,
    routeAllowlist: parseRouteAllowlist(env.SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST),
    percent: parsePercent(env.SCALE_REDIS_CACHE_SHADOW_PERCENT),
    productionEnabledFlagTruthy,
  };
}

export function createCacheShadowMonitor(): CacheShadowMonitor {
  const snapshot: CacheShadowMonitorSnapshot = {
    observedDecisionCount: 0,
    shadowReadAttemptedCount: 0,
    hitCount: 0,
    missCount: 0,
    skippedCount: 0,
    unsafeKeyCount: 0,
    errorCount: 0,
    responseChanged: false,
    realUserPayloadStored: false,
    rawKeysStored: false,
    rawKeysPrinted: false,
    rawPayloadLogged: false,
    piiLogged: false,
  };

  return {
    async observe(decision) {
      snapshot.observedDecisionCount += 1;
      if (decision.shadowReadAttempted) snapshot.shadowReadAttemptedCount += 1;
      if (decision.status === "hit") snapshot.hitCount += 1;
      if (decision.status === "miss") snapshot.missCount += 1;
      if (decision.status === "skipped" || decision.status === "disabled") snapshot.skippedCount += 1;
      if (decision.status === "unsafe_key") snapshot.unsafeKeyCount += 1;
      if (decision.status === "error" || decision.status === "adapter_unavailable") snapshot.errorCount += 1;
    },
    snapshot() {
      return { ...snapshot };
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

  let cleanupOk = false;
  try {
    await params.adapter.set(
      keyResult.key,
      { kind: "cache-shadow-canary", version: 1 },
      { ttlMs: Math.min(policy?.ttlMs ?? SYNTHETIC_CANARY_TTL_MS, SYNTHETIC_CANARY_TTL_MS), tags: ["cache_canary"] },
    );
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
  };
}
