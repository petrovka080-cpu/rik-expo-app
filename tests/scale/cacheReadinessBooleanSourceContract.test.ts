import type { CacheAdapter, CacheSetOptions } from "../../src/shared/scale/cacheAdapters";
import {
  CACHE_READ_THROUGH_ONE_ROUTE,
  CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES,
  CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
  CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
  buildCacheReadThroughOneRouteApplyEnv,
  buildCacheReadThroughReadinessDiagnostics,
  explainCacheReadThroughOneRouteReadiness,
  resolveCacheReadThroughV1FlagState,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import {
  buildBffReadyRuntimeDiagnostics,
  buildCacheShadowRuntimeState,
  handleBffStagingServerRequest,
} from "../../scripts/server/stagingBffServerBoundary";

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

const baseReadThroughEnv = (): Record<string, string> => ({
  [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.productionEnabled]: "true",
  [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.mode]: CACHE_READ_THROUGH_ONE_ROUTE_MODE,
  [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.routeAllowlist]: CACHE_READ_THROUGH_ONE_ROUTE,
  [CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.percent]: CACHE_READ_THROUGH_ONE_ROUTE_PERCENT,
});

describe("WAVES 39-41 cache readiness boolean source contract", () => {
  it.each([
    ["true", true, "truthy"],
    ["TRUE", true, "truthy"],
    ["1", true, "truthy"],
    ["false", false, "falsey"],
    [undefined, false, "absent"],
  ] as const)(
    "classifies read-through v1 env value %s without exposing the raw value",
    (rawValue, expectedEnabled, expectedClass) => {
      const env: Record<string, string | undefined> = {};
      if (rawValue !== undefined) env[CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME] = rawValue;

      const flag = resolveCacheReadThroughV1FlagState(env);

      expect(flag).toEqual(
        expect.objectContaining({
          keyName: CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
          present: rawValue !== undefined,
          valueClass: expectedClass,
          enabled: expectedEnabled,
        }),
      );
      if (rawValue === "TRUE") {
        expect(JSON.stringify(flag)).not.toContain(rawValue);
      }
    },
  );

  it("derives readiness diagnostics and runtime enabled from the same canonical helper", () => {
    const env = buildCacheReadThroughOneRouteApplyEnv("persistent");
    const config = resolveCacheShadowRuntimeConfig(env);
    const diagnostics = buildCacheReadThroughReadinessDiagnostics(config);
    const runtime = buildCacheShadowRuntimeState(config, createCacheAdapterFixture());

    expect(env[CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME]).toBe("true");
    expect(diagnostics).toEqual(
      expect.objectContaining({
        readThroughV1EnabledFlagPresent: true,
        readThroughV1EnvRawPresent: true,
        readThroughV1EnvValueClass: "truthy",
        cacheCanonicalKeyName: CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
        cacheCanonicalKeyPresence: true,
        cacheCanonicalKeyValueClass: "truthy",
        cacheRuntimeSource: "process_env",
        routeAllowlistSource: "process_env",
        readinessReason: "ready",
      }),
    );
    expect(runtime.readThroughV1Enabled).toBe(true);
    expect(runtime.readThroughV1FlagState).toEqual(config.readThroughV1FlagState);
    expect(runtime.cacheCanonicalKeyPresence).toBe(true);
    expect(runtime.cacheCanonicalKeyValueClass).toBe("truthy");
  });

  it("reproduces the W34 shape-correct failure when the v1 flag is absent", () => {
    const config = resolveCacheShadowRuntimeConfig(baseReadThroughEnv());
    const readiness = explainCacheReadThroughOneRouteReadiness(config);
    const runtime = buildCacheShadowRuntimeState(config, createCacheAdapterFixture());

    expect(config.enabled).toBe(true);
    expect(config.mode).toBe("read_through");
    expect(config.routeAllowlist).toEqual([CACHE_READ_THROUGH_ONE_ROUTE]);
    expect(config.percent).toBe(1);
    expect(config.readThroughV1Enabled).toBe(false);
    expect(readiness).toEqual({
      ready: false,
      reason: "read_through_v1_missing_or_false",
    });
    expect(runtime.readinessDiagnostics).toEqual(
      expect.objectContaining({
        readThroughV1EnabledFlagPresent: false,
        readThroughV1EnvValueClass: "absent",
        readinessReason: "read_through_v1_missing_or_false",
      }),
    );
  });

  it("passes readiness with the same fixture when the canonical v1 flag is true", () => {
    const config = resolveCacheShadowRuntimeConfig({
      ...baseReadThroughEnv(),
      [CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME]: "true",
    });

    expect(explainCacheReadThroughOneRouteReadiness(config)).toEqual({
      ready: true,
      reason: "ready",
    });
  });

  it("exposes only redacted /ready diagnostics for runtime commit and cache env classes", async () => {
    const config = resolveCacheShadowRuntimeConfig({
      ...buildCacheReadThroughOneRouteApplyEnv("persistent"),
      SCALE_REDIS_CACHE_URL: "rediss://token:secret@example.invalid/0",
      SCALE_REDIS_CACHE_NAMESPACE: "private-company-namespace",
    });
    const response = await handleBffStagingServerRequest(
      { method: "GET", path: "/ready" },
      {
        cacheShadowRuntime: buildCacheShadowRuntimeState(config, createCacheAdapterFixture()),
        runtimeDiagnostics: buildBffReadyRuntimeDiagnostics({
          RENDER_GIT_COMMIT: "abcdef1234567890",
          RENDER_SERVICE_ID: "srv-sensitive-runtime-id",
          APP_ENV: "production",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    const data = response.body.ok ? (response.body.data as Record<string, unknown>) : {};
    const runtime = data.cacheShadowRuntime as Record<string, unknown>;

    expect(data).toEqual(
      expect.objectContaining({
        runtimeCommitShort: "abcdef123456",
        runtimeServiceIdClass: "present_redacted",
        runtimeEnvClass: "production",
        appEnv: "production",
      }),
    );
    expect(runtime).toEqual(
      expect.objectContaining({
        cacheCanonicalKeyPresence: true,
        cacheCanonicalKeyValueClass: "truthy",
        cacheRuntimeSource: "process_env",
        routeAllowlistSource: "process_env",
      }),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toMatch(/rediss?:\/\//i);
    expect(serialized).not.toMatch(/token:secret|private-company|example\.invalid|srv-sensitive-runtime-id/i);
  });
});
