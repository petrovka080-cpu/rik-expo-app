import type { CacheAdapter, CacheAdapterStatus, RedisCommand, RedisCommandExecutor } from "../../src/shared/scale/cacheAdapters";
import { RedisUrlCacheAdapter } from "../../src/shared/scale/cacheAdapters";
import { getCachePolicy, type CachePolicy, type CachePolicyRoute } from "../../src/shared/scale/cachePolicies";
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
  companyId: "company-cache-read-through-opaque",
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
      namespace: "rik-cache-read-through-contract",
      commandImpl,
    }),
    advance: (ms: number) => {
      now += ms;
    },
    commands,
  };
};

const readThroughConfig = (enabled: boolean) => {
  const env: Record<string, string | undefined> = {
    SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
    SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
    SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
    SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
  };
  if (enabled) env.SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED = "true";
  return resolveCacheShadowRuntimeConfig(env);
};

const createThrowingReadCacheAdapter = (): CacheAdapter => ({
  async get<T>(_key: string): Promise<T | null> {
    throw new Error("cache read failed");
  },
  async set<T>(_key: string, _value: T): Promise<void> {
    throw new Error("cache write failed");
  },
  async delete(_key: string): Promise<void> {
    return;
  },
  async invalidateByTag(_tag: string): Promise<number> {
    return 0;
  },
  getStatus(): CacheAdapterStatus {
    return {
      kind: "external_contract",
      enabled: true,
      externalNetworkEnabled: true,
    };
  },
});

describe("S-AUDIT-NIGHT-BATTLE-141 cache read-through canary codepath", () => {
  it("keeps exact provider behavior when read-through mode is set but the v1 flag is off", async () => {
    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    let version = 0;
    const searchCatalog = jest.fn(async () => {
      version += 1;
      return [{ id: `provider-${version}` }];
    });
    const request = readRequest(MARKETPLACE_OPERATION, marketplaceInput());
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config: readThroughConfig(false), monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config: readThroughConfig(false), monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-2" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(2);
    expect(redis.commands).toHaveLength(0);
    await waitFor(() => monitor.snapshot().skippedCount === 2);
  });

  it("serves marketplace from cache on the second read when the v1 flag is on", async () => {
    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    let version = 0;
    const searchCatalog = jest.fn(async () => {
      version += 1;
      return [{ id: `provider-${version}` }];
    });
    const request = readRequest(MARKETPLACE_OPERATION, marketplaceInput());
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };
    const config = readThroughConfig(true);

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: true }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);
    await waitFor(() => monitor.snapshot().missCount === 1 && monitor.snapshot().hitCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        readThroughCount: 1,
        responseChanged: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
  });

  it("preserves provider error semantics under the read-through v1 flag", async () => {
    const request = readRequest(MARKETPLACE_OPERATION, marketplaceInput());
    const baselineFixture = createBffShadowFixturePorts();
    const cachedFixture = createBffShadowFixturePorts();
    const baselineSearchCatalog = jest.fn(async () => {
      throw new Error("provider failure");
    });
    const cachedSearchCatalog = jest.fn(async () => {
      throw new Error("provider failure");
    });

    const baseline = await handleBffStagingServerRequest(request, {
      readPorts: {
        ...baselineFixture.read,
        marketplaceCatalog: { searchCatalog: baselineSearchCatalog },
      },
    });

    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const cached = await handleBffStagingServerRequest(request, {
      readPorts: {
        ...cachedFixture.read,
        marketplaceCatalog: { searchCatalog: cachedSearchCatalog },
      },
      cacheShadow: { adapter: redis.adapter, config: readThroughConfig(true), monitor },
    });

    expect(cached.status).toBe(baseline.status);
    expect(cached.body).toEqual(baseline.body);
    expect(baselineSearchCatalog).toHaveBeenCalledTimes(1);
    expect(cachedSearchCatalog).toHaveBeenCalledTimes(1);
    expect(redis.commands.some((command) => String(command[0]).toUpperCase() === "SET")).toBe(false);
  });

  it("falls back to the provider when the cache read path errors", async () => {
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [{ id: "provider-after-cache-error" }]);

    const response = await handleBffStagingServerRequest(
      readRequest(MARKETPLACE_OPERATION, marketplaceInput()),
      {
        readPorts: {
          ...fixture.read,
          marketplaceCatalog: { searchCatalog },
        },
        cacheShadow: {
          adapter: createThrowingReadCacheAdapter(),
          config: readThroughConfig(true),
          monitor,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-after-cache-error" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);
    await waitFor(() => monitor.snapshot().errorCount === 1);
  });

  it("expires marketplace read-through entries at the policy TTL", async () => {
    const policy = policyFor(MARKETPLACE_OPERATION);
    const redis = createRedisCacheAdapterFixture();
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    let version = 0;
    const searchCatalog = jest.fn(async () => {
      version += 1;
      return [{ id: `provider-${version}` }];
    });
    const request = readRequest(MARKETPLACE_OPERATION, marketplaceInput());
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };
    const config = readThroughConfig(true);

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });
    redis.advance(policy.ttlMs + 1);
    const third = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });

    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: true }),
      }),
    );
    expect(third.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "provider-2" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(2);

    await waitFor(() => monitor.snapshot().missCount === 2 && monitor.snapshot().hitCount === 1);
    const setCommands = redis.commands.filter((command) => String(command[0]).toUpperCase() === "SET");
    expect(setCommands).toHaveLength(2);
    expect(setCommands.every((command) => command.includes(policy.ttlMs))).toBe(true);
    expect(setCommands.some((command) => command.includes(policy.ttlMs + policy.staleWhileRevalidateMs))).toBe(false);
  });
});
