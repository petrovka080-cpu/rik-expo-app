import {
  NoopCacheAdapter,
  RedisUrlCacheAdapter,
  type RedisCommand,
  type RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import { buildSafeCacheKey } from "../../src/shared/scale/cacheKeySafety";
import {
  getCachePolicy,
  type CachePolicy,
  type CachePolicyRoute,
} from "../../src/shared/scale/cachePolicies";
import {
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import type { BffReadOperation } from "../../src/shared/scale/bffReadHandlers";
import {
  BFF_STAGING_ROUTE_REGISTRY,
  handleBffStagingServerRequest,
  type BffStagingRequestEnvelope,
  type BffStagingRouteDefinition,
} from "../../scripts/server/stagingBffServerBoundary";

const MARKETPLACE_OPERATION: BffReadOperation = "marketplace.catalog.search";

type RedisEntry = {
  value: string;
  expiresAt: number | null;
};

const policyFor = (route: CachePolicyRoute): CachePolicy => {
  const policy = getCachePolicy(route);
  if (!policy) throw new Error(`Missing cache policy for ${route}`);
  return policy;
};

const keyFor = (route: CachePolicyRoute, input: Record<string, unknown>): string => {
  const result = buildSafeCacheKey(policyFor(route), input);
  if (!result.ok) throw new Error(`Cache key rejected for ${route}: ${result.reason}`);
  return result.key;
};

const routeByOperation = (operation: BffReadOperation): BffStagingRouteDefinition => {
  const route = BFF_STAGING_ROUTE_REGISTRY.find((entry) => entry.operation === operation);
  if (!route) throw new Error(`Missing BFF staging read route for ${operation}`);
  return route;
};

const readRequest = (
  operation: BffReadOperation,
  input: Record<string, unknown>,
): BffStagingRequestEnvelope => ({
  method: "POST",
  path: routeByOperation(operation).path,
  body: {
    input,
    metadata: {},
  },
});

const marketplaceInput = (): Record<string, unknown> => ({
  companyId: "company-cache-dry-run-opaque",
  query: "cement",
  category: "materials",
  page: 1,
  pageSize: 5,
  locale: "ru-KG",
  filters: {
    kind: "material",
    scope: "public",
    sort: "price",
    direction: "asc",
  },
});

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

const createRedisCacheAdapterFixture = () => {
  let now = 0;
  const values = new Map<string, RedisEntry>();
  const commands: RedisCommand[] = [];

  const purgeExpired = (): void => {
    for (const [key, entry] of values.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) values.delete(key);
    }
  };

  const commandImpl: RedisCommandExecutor = async (command) => {
    purgeExpired();
    commands.push([...command]);
    const operation = String(command[0] ?? "").toUpperCase();

    if (operation === "SET" && typeof command[1] === "string" && typeof command[2] === "string") {
      const ttlIndex = command.findIndex((part) => String(part).toUpperCase() === "PX");
      const ttlMs = ttlIndex >= 0 ? Number(command[ttlIndex + 1]) : 0;
      values.set(command[1], {
        value: command[2],
        expiresAt: Number.isFinite(ttlMs) && ttlMs > 0 ? now + ttlMs : null,
      });
      return "OK";
    }

    if (operation === "GET" && typeof command[1] === "string") {
      return values.get(command[1])?.value ?? null;
    }

    if (operation === "DEL") {
      let deleted = 0;
      for (const key of command.slice(1)) {
        if (typeof key === "string" && values.delete(key)) deleted += 1;
      }
      return deleted;
    }

    return null;
  };

  return {
    adapter: new RedisUrlCacheAdapter({
      redisUrl: "rediss://red-render-kv.example.invalid:6379",
      namespace: "rik-cache-dry-run-contract",
      commandImpl,
    }),
    advance: (ms: number) => {
      now += ms;
    },
    commands,
  };
};

const shadowReadonlyConfig = () =>
  resolveCacheShadowRuntimeConfig({
    SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
    SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
    SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
    SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
  });

describe("S-AUDIT-NIGHT-BATTLE-140 cache dry-run metrics", () => {
  it("emits would-hit dry-run metrics while returning the original provider result", async () => {
    const redis = createRedisCacheAdapterFixture();
    const input = marketplaceInput();
    const policy = policyFor(MARKETPLACE_OPERATION);
    await redis.adapter.set(
      keyFor(MARKETPLACE_OPERATION, input),
      { ok: true, data: [{ id: "cached-catalog-row" }] },
      { ttlMs: policy.ttlMs, tags: policy.tags },
    );
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [{ id: "live-catalog-row" }]);

    const response = await handleBffStagingServerRequest(readRequest(MARKETPLACE_OPERATION, input), {
      readPorts: {
        ...fixture.read,
        marketplaceCatalog: { searchCatalog },
      },
      cacheShadow: {
        adapter: redis.adapter,
        config: shadowReadonlyConfig(),
        monitor,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "live-catalog-row" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().wouldCacheHit === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        dryRunDecisionCount: 1,
        wouldCacheRead: 1,
        wouldCacheHit: 1,
        wouldCacheMiss: 0,
        hitCount: 1,
        missCount: 0,
        readThroughCount: 0,
        responseChanged: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    expect(monitor.snapshot().wouldCacheBypassReason).toEqual([]);
  });

  it("emits would-miss dry-run metrics while returning the live provider result", async () => {
    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [{ id: "live-miss-row" }]);

    const response = await handleBffStagingServerRequest(readRequest(MARKETPLACE_OPERATION, marketplaceInput()), {
      readPorts: {
        ...fixture.read,
        marketplaceCatalog: { searchCatalog },
      },
      cacheShadow: {
        adapter: redis.adapter,
        config: shadowReadonlyConfig(),
        monitor,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "live-miss-row" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().wouldCacheMiss === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        dryRunDecisionCount: 1,
        wouldCacheRead: 1,
        wouldCacheHit: 0,
        wouldCacheMiss: 1,
        hitCount: 0,
        missCount: 1,
        readThroughCount: 0,
      }),
    );
  });

  it("does not mask provider errors when dry-run would hit", async () => {
    const redis = createRedisCacheAdapterFixture();
    const input = marketplaceInput();
    const policy = policyFor(MARKETPLACE_OPERATION);
    await redis.adapter.set(
      keyFor(MARKETPLACE_OPERATION, input),
      { ok: true, data: [{ id: "cached-catalog-row" }] },
      { ttlMs: policy.ttlMs, tags: policy.tags },
    );
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => {
      throw new Error("provider failure");
    });

    const response = await handleBffStagingServerRequest(readRequest(MARKETPLACE_OPERATION, input), {
      readPorts: {
        ...fixture.read,
        marketplaceCatalog: { searchCatalog },
      },
      cacheShadow: {
        adapter: redis.adapter,
        config: shadowReadonlyConfig(),
        monitor,
      },
    });

    expect(response.status).toBe(500);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "BFF_MARKETPLACE_CATALOG_SEARCH_ERROR",
        }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().wouldCacheHit === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        dryRunDecisionCount: 1,
        wouldCacheRead: 1,
        wouldCacheHit: 1,
        wouldCacheMiss: 0,
        responseChanged: false,
      }),
    );
  });

  it("preserves live provider success when the dry-run cache adapter is unavailable", async () => {
    const adapter = new NoopCacheAdapter();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [{ id: "live-after-cache-unavailable" }]);

    const response = await handleBffStagingServerRequest(readRequest(MARKETPLACE_OPERATION, marketplaceInput()), {
      readPorts: {
        ...fixture.read,
        marketplaceCatalog: { searchCatalog },
      },
      cacheShadow: {
        adapter,
        config: shadowReadonlyConfig(),
        monitor,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "live-after-cache-unavailable" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().errorCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        dryRunDecisionCount: 1,
        wouldCacheRead: 0,
        wouldCacheHit: 0,
        wouldCacheMiss: 0,
        errorCount: 1,
        responseChanged: false,
      }),
    );
    expect(monitor.snapshot().wouldCacheBypassReason).toEqual([
      {
        reasonCode: "adapter_unavailable",
        count: 1,
        redacted: true,
      },
    ]);
  });

  it("keeps disabled dry-run at minimal telemetry without changing the provider result", async () => {
    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [{ id: "live-disabled-row" }]);
    const disabledConfig = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "false",
      SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });

    const response = await handleBffStagingServerRequest(readRequest(MARKETPLACE_OPERATION, marketplaceInput()), {
      readPorts: {
        ...fixture.read,
        marketplaceCatalog: { searchCatalog },
      },
      cacheShadow: {
        adapter: redis.adapter,
        config: disabledConfig,
        monitor,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "live-disabled-row" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().skippedCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        dryRunDecisionCount: 1,
        wouldCacheRead: 0,
        wouldCacheHit: 0,
        wouldCacheMiss: 0,
        skippedCount: 1,
        responseChanged: false,
      }),
    );
    expect(monitor.snapshot().wouldCacheBypassReason).toEqual([
      {
        reasonCode: "cache_shadow_disabled",
        count: 1,
        redacted: true,
      },
    ]);
  });
});
