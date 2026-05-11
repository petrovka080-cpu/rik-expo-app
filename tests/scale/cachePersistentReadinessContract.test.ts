import type { CacheAdapter, CacheSetOptions } from "../../src/shared/scale/cacheAdapters";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
  CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
  assertCacheReadThroughOneRouteApplyEnv,
  buildCacheReadThroughOneRouteApplyEnv,
  buildCacheReadThroughReadinessDiagnostics,
  isCacheReadThroughOneRouteApplyConfigReady,
  resolveCacheReadThroughOneRouteApplyConfig,
  isCacheReadThroughV1RouteAllowed,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import { buildCacheShadowRuntimeState } from "../../scripts/server/stagingBffServerBoundary";

const createCacheAdapterFixture = (): CacheAdapter => ({
  async get<T>(_key: string): Promise<T | null> {
    return null;
  },
  async set<T>(_key: string, _value: T, _options: CacheSetOptions): Promise<void> {
    return;
  },
  async delete(_key: string): Promise<void> {
    return;
  },
  async invalidateByTag(_tag: string): Promise<number> {
    return 0;
  },
  getStatus() {
    return {
      kind: "external_contract" as const,
      enabled: true,
      externalNetworkEnabled: true,
    };
  },
});

describe("WAVE 33 cache persistent readiness contract", () => {
  it.each(["canary", "persistent"] as const)("%s apply path resolves readiness true with canonical keys", (path) => {
    const env = buildCacheReadThroughOneRouteApplyEnv(path);
    const config = resolveCacheReadThroughOneRouteApplyConfig(path);
    const runtime = buildCacheShadowRuntimeState(config, createCacheAdapterFixture());

    expect(env).toEqual({
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.productionEnabled]: "true",
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.mode]: CACHE_READ_THROUGH_ONE_ROUTE_MODE,
      [CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME]: "true",
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist]: CACHE_READ_THROUGH_ONE_ROUTE,
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.percent]: CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
    });
    expect(isCacheReadThroughOneRouteApplyConfigReady(config)).toBe(true);
    expect(runtime).toEqual(
      expect.objectContaining({
        status: "configured",
        enabled: true,
        mode: CACHE_READ_THROUGH_ONE_ROUTE_MODE,
        readThroughV1Enabled: true,
        routeAllowlistCount: 1,
        percent: Number(CACHE_READ_THROUGH_ONE_ROUTE_PERCENT),
        readinessDiagnostics: expect.objectContaining({
          enabledFlagPresent: true,
          readThroughV1EnabledFlagName: CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
          readThroughV1EnabledFlagPresent: true,
          routeAllowlistCount: 1,
          routeName: CACHE_READ_THROUGH_ONE_ROUTE,
          percent: Number(CACHE_READ_THROUGH_ONE_ROUTE_PERCENT),
          mode: CACHE_READ_THROUGH_ONE_ROUTE_MODE,
          redacted: true,
          secretsExposed: false,
          envValuesExposed: false,
        }),
      }),
    );
  });

  it("keeps unapproved routes out of read-through readiness", () => {
    const env = {
      ...buildCacheReadThroughOneRouteApplyEnv("persistent"),
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist]: "warehouse.ledger.list",
    };
    const config = resolveCacheShadowRuntimeConfig(env);

    expect(config.readThroughV1Enabled).toBe(true);
    expect(config.routeAllowlist).toEqual(["warehouse.ledger.list"]);
    expect(isCacheReadThroughV1RouteAllowed(config.routeAllowlist[0])).toBe(false);
    expect(isCacheReadThroughOneRouteApplyConfigReady(config)).toBe(false);
    expect(() => assertCacheReadThroughOneRouteApplyEnv(env)).toThrow(
      "cache_read_through_one_route_apply_env_not_ready",
    );
  });

  it("rejects route expansion in persistent readiness config", () => {
    const env = {
      ...buildCacheReadThroughOneRouteApplyEnv("persistent"),
      [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist]: `${CACHE_READ_THROUGH_ONE_ROUTE},warehouse.ledger.list`,
    };
    const config = resolveCacheShadowRuntimeConfig(env);

    expect(config.routeAllowlist).toHaveLength(2);
    expect(isCacheReadThroughOneRouteApplyConfigReady(config)).toBe(false);
    expect(() => assertCacheReadThroughOneRouteApplyEnv(env)).toThrow(
      "cache_read_through_one_route_apply_env_not_ready",
    );
  });

  it("keeps readiness diagnostics redacted while reporting presence and scope", () => {
    const config = resolveCacheShadowRuntimeConfig({
      ...buildCacheReadThroughOneRouteApplyEnv("persistent"),
      SCALE_REDIS_CACHE_URL: "rediss://token:secret@example.invalid/0",
      SCALE_REDIS_CACHE_NAMESPACE: "private-company-namespace",
    });
    const diagnostics = buildCacheReadThroughReadinessDiagnostics(config);
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toEqual(
      expect.objectContaining({
        enabledFlagPresent: true,
        readThroughV1EnabledFlagPresent: true,
        routeAllowlistCount: 1,
        routeName: CACHE_READ_THROUGH_ONE_ROUTE,
        percent: 1,
        mode: "read_through",
        redacted: true,
        secretsExposed: false,
        envValuesExposed: false,
      }),
    );
    expect(serialized).not.toMatch(/rediss?:\/\//i);
    expect(serialized).not.toMatch(/token:secret|private-company|example\.invalid/i);
  });
});
