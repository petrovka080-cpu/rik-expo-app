import fs from "fs";
import path from "path";

import type { CacheAdapter, CacheSetOptions } from "../../src/shared/scale/cacheAdapters";
import {
  CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
  CACHE_SHADOW_RUNTIME_ENV_NAMES,
  buildCacheReadThroughOneRouteApplyEnv,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import { SCALE_PROVIDER_RUNTIME_ENV_NAMES } from "../../src/shared/scale/providerRuntimeConfig";
import {
  BFF_STAGING_SERVER_ENV_NAMES,
  buildCacheShadowRuntimeState,
  handleBffStagingServerRequest,
} from "../../scripts/server/stagingBffServerBoundary";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readJsonRecord = (relativePath: string): Record<string, unknown> =>
  JSON.parse(readProjectFile(relativePath)) as Record<string, unknown>;

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

describe("WAVE 23 cache runtime readiness flag RCA", () => {
  it("uses one canonical read-through v1 flag name across apply, runtime, readiness, provider inventory, and Render snapshots", () => {
    const runnerSource = readProjectFile("scripts/cache_one_route_read_through_canary.ts");
    const runtimeSource = readProjectFile("src/shared/scale/cacheShadowRuntime.ts");
    const readinessSource = readProjectFile("scripts/server/stagingBffServerBoundary.ts");
    const providerSource = readProjectFile("src/shared/scale/providerRuntimeConfig.ts");
    const contractSource = runtimeSource;

    expect(CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME).toBe("SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED");
    expect(CACHE_SHADOW_RUNTIME_ENV_NAMES.readThroughV1Enabled).toBe(CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME);
    expect(BFF_STAGING_SERVER_ENV_NAMES).toContain(CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME);
    expect(SCALE_PROVIDER_RUNTIME_ENV_NAMES.redis_cache.optional).toContain(CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME);
    expect(buildCacheReadThroughOneRouteApplyEnv("canary")).toEqual(
      buildCacheReadThroughOneRouteApplyEnv("persistent"),
    );

    expect(runnerSource).toContain("CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME");
    expect(runnerSource).toContain('buildCacheReadThroughOneRouteApplyEnv("canary")');
    expect(runnerSource).toContain("CACHE_ENV_SNAPSHOT_KEYS");
    expect(runnerSource).not.toContain('SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true"');

    expect(runtimeSource).toContain("CACHE_SHADOW_RUNTIME_ENV_NAMES");
    expect(runtimeSource).toContain("resolveCacheReadThroughV1FlagState");
    expect(readinessSource).toContain("buildCacheReadThroughReadinessDiagnostics");
    expect(contractSource).toContain("readThroughV1EnabledFlagPresent");
    expect(providerSource).toContain("CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES");
    expect(contractSource).toContain("CACHE_READ_THROUGH_APPLY_PATHS");
    expect(contractSource).toContain('"persistent"');
  });

  it("reports redacted readiness diagnostics for the enabled flag presence and one-route scope", async () => {
    const config = resolveCacheShadowRuntimeConfig({
      [CACHE_SHADOW_RUNTIME_ENV_NAMES.productionEnabled]: "true",
      [CACHE_SHADOW_RUNTIME_ENV_NAMES.mode]: "read_through",
      [CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME]: "true",
      [CACHE_SHADOW_RUNTIME_ENV_NAMES.routeAllowlist]: "marketplace.catalog.search",
      [CACHE_SHADOW_RUNTIME_ENV_NAMES.percent]: "1",
    });

    const response = await handleBffStagingServerRequest(
      { method: "GET", path: "/ready" },
      {
        cacheShadowRuntime: buildCacheShadowRuntimeState(config, createCacheAdapterFixture()),
      },
    );

    expect(response.body.ok).toBe(true);
    const data = response.body.ok ? (response.body.data as Record<string, unknown>) : {};
    const runtime = data.cacheShadowRuntime as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(runtime).toEqual(
      expect.objectContaining({
        readThroughV1Enabled: true,
        routeAllowlistCount: 1,
        percent: 1,
        mode: "read_through",
        readinessDiagnostics: expect.objectContaining({
          enabledFlagPresent: true,
          readThroughV1EnabledFlagName: CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
          readThroughV1EnabledFlagPresent: true,
          readThroughV1EnvRawPresent: true,
          readThroughV1EnvValueClass: "truthy",
          cacheCanonicalKeyName: CACHE_READ_THROUGH_V1_ENABLED_ENV_NAME,
          cacheCanonicalKeyPresence: true,
          cacheCanonicalKeyValueClass: "truthy",
          cacheRuntimeSource: "process_env",
          routeAllowlistSource: "process_env",
          routeAllowlistCount: 1,
          routeName: "marketplace.catalog.search",
          percent: 1,
          mode: "read_through",
          readinessReason: "ready",
          redacted: true,
          secretsExposed: false,
          envValuesExposed: false,
        }),
      }),
    );

    const serialized = JSON.stringify(response);
    expect(serialized).not.toMatch(/rediss?:\/\//i);
    expect(serialized).not.toMatch(/bearer\s+/i);
    expect(serialized).not.toContain("BFF_SERVER_AUTH_SECRET");
  });

  it("captures the Wave 09 mismatch that the Wave 23 RCA addresses", () => {
    const wave09 = readJsonRecord("artifacts/S_NIGHT_CACHE_09_ONE_ROUTE_CANARY_APPLY_matrix.json");
    const sourceLifecycle = readJsonRecord("artifacts/S_CACHE_02_ONE_ROUTE_READ_THROUGH_CANARY_matrix.json");

    expect(wave09.status).toBe("BLOCKED_CACHE_CANARY_FAILED_ROLLED_BACK");
    expect((wave09.runtime as Record<string, unknown>).mode).toBe("read_through");
    expect((wave09.runtime as Record<string, unknown>).readThroughV1Enabled).toBe(false);
    expect((wave09.runtime as Record<string, unknown>).routeAllowlistCount).toBe(1);

    expect(sourceLifecycle.runtime_read_through_v1_enabled).toBe(false);
    expect(sourceLifecycle.runtime_route_allowlist_count).toBe(1);
    expect(sourceLifecycle.blocked_reason).toBe("runtime_not_scoped_to_one_route");
  });
});
