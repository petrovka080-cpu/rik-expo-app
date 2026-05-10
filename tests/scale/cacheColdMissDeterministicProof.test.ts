import {
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
  CACHE_READ_THROUGH_V1_ALLOWED_ROUTES,
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import { isCacheInvalidationExecutionEnabled } from "../../src/shared/scale/cacheInvalidation";
import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import type { BffReadOperation } from "../../src/shared/scale/bffReadHandlers";
import {
  BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_ROUTE_REGISTRY,
  handleBffStagingServerRequest,
  type BffStagingRequestEnvelope,
  type BffStagingRouteDefinition,
} from "../../scripts/server/stagingBffServerBoundary";

const MARKETPLACE_OPERATION: BffReadOperation = "marketplace.catalog.search";
const ROUTE_SCOPE_SKIP_OPERATION: BffReadOperation = "request.proposal.list";
const PROOF_NAMESPACE = "rik-s-cache-01-cold-proof";
const PROOF_NONCE = "s-cache-01-cold-miss-proof-v1";
const UTF8_QUERY = "\u0446\u0435\u043c\u0435\u043d\u0442 \u0411\u0438\u0448\u043a\u0435\u043a s-cache-01-cold-miss-proof-v1";
const UTF8_TITLE = "\u0446\u0435\u043c\u0435\u043d\u0442 \u0411\u0438\u0448\u043a\u0435\u043a";
const UTF8_CATEGORY = "\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b";

type RedisEntry = {
  value: string;
  expiresAt: number | null;
};

type RedisSetEntry = {
  members: Set<string>;
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

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

const createIsolatedRedisCacheAdapterFixture = (namespace = PROOF_NAMESPACE) => {
  let now = 0;
  const values = new Map<string, RedisEntry>();
  const sets = new Map<string, RedisSetEntry>();
  const commands: RedisCommand[] = [];

  const purgeExpired = (): void => {
    for (const [key, entry] of values.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) values.delete(key);
    }
    for (const [key, entry] of sets.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) sets.delete(key);
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
        if (typeof key !== "string") continue;
        if (values.delete(key)) deleted += 1;
        if (sets.delete(key)) deleted += 1;
      }
      return deleted;
    }

    if (operation === "SADD" && typeof command[1] === "string") {
      const set = sets.get(command[1]) ?? { members: new Set<string>(), expiresAt: null };
      for (const member of command.slice(2)) {
        if (typeof member === "string") set.members.add(member);
      }
      sets.set(command[1], set);
      return set.members.size;
    }

    if (operation === "PEXPIRE" && typeof command[1] === "string") {
      const ttlMs = Number(command[2]);
      const set = sets.get(command[1]);
      if (set && Number.isFinite(ttlMs) && ttlMs > 0) {
        set.expiresAt = now + ttlMs;
        return 1;
      }
      return 0;
    }

    if (operation === "SMEMBERS" && typeof command[1] === "string") {
      return Array.from(sets.get(command[1])?.members ?? []);
    }

    return null;
  };

  return {
    adapter: new RedisUrlCacheAdapter({
      redisUrl: "rediss://red-render-kv.example.invalid:6379",
      namespace,
      commandImpl,
    }),
    advance: (ms: number) => {
      now += ms;
    },
    commands,
  };
};

const deterministicMarketplaceInput = (): Record<string, unknown> => ({
  companyId: "company-s-cache-01-cold-proof",
  query: UTF8_QUERY,
  category: "materials",
  page: 1,
  pageSize: 5,
  locale: "ru-KG",
  filters: {
    kind: "material",
    scope: "public",
    sort: "price",
    direction: "asc",
    proofNonce: PROOF_NONCE,
  },
});

const routeScopeSkipInput = (): Record<string, unknown> => ({
  companyId: "company-s-night-cache-08-route-skip",
  actorIdHash: "actor-s-night-cache-08-route-skip",
  role: "buyer",
  page: 1,
  pageSize: 5,
  filters: {
    status: "submitted",
    scope: "proof",
  },
});

const redisCommandNames = (commands: readonly RedisCommand[]): readonly string[] =>
  commands.map((command) => String(command[0]).toUpperCase());

describe("S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF", () => {
  it("proves a deterministic isolated cold miss followed by a second-call hit without enabling production cache", async () => {
    const redis = createIsolatedRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [
      {
        id: "catalog-cold-proof-1",
        title: UTF8_TITLE,
        category: UTF8_CATEGORY,
      },
    ]);
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };
    const input = deterministicMarketplaceInput();
    const proofKey = keyFor(MARKETPLACE_OPERATION, input);
    const request = readRequest(MARKETPLACE_OPERATION, input);
    const deps = {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    };

    expect(await redis.adapter.get(proofKey)).toBeNull();

    const healthBefore = await handleBffStagingServerRequest(
      { method: "GET", path: "/health" },
      deps,
    );
    const readinessBefore = await handleBffStagingServerRequest(
      { method: "GET", path: "/ready" },
      deps,
    );
    const first = await handleBffStagingServerRequest(request, deps);
    const commandNamesAfterFirst = redisCommandNames(redis.commands);
    const second = await handleBffStagingServerRequest(request, deps);
    const monitorResponse = await handleBffStagingServerRequest(
      { method: BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE.method, path: BFF_STAGING_CACHE_SHADOW_MONITOR_ROUTE.path },
      deps,
    );
    const rollbackDeleted = await redis.adapter.invalidateByTag("marketplace");
    const postRollbackRead = await redis.adapter.get(proofKey);
    const readinessAfter = await handleBffStagingServerRequest(
      { method: "GET", path: "/ready" },
      deps,
    );
    const healthAfter = await handleBffStagingServerRequest(
      { method: "GET", path: "/health" },
      deps,
    );

    expect(healthBefore.status).toBe(200);
    expect(readinessBefore.status).toBe(200);
    expect(readinessAfter.status).toBe(200);
    expect(healthAfter.status).toBe(200);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [
          expect.objectContaining({
            id: "catalog-cold-proof-1",
            title: UTF8_TITLE,
            category: UTF8_CATEGORY,
          }),
        ],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [
          expect.objectContaining({
            id: "catalog-cold-proof-1",
            title: UTF8_TITLE,
            category: UTF8_CATEGORY,
          }),
        ],
        serverTiming: expect.objectContaining({ cacheHit: true }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);
    expect(commandNamesAfterFirst).toEqual(expect.arrayContaining(["GET", "SET", "SADD", "PEXPIRE"]));
    expect(commandNamesAfterFirst.filter((name) => name === "SET")).toHaveLength(1);

    await waitFor(() => monitor.snapshot().missCount === 1 && monitor.snapshot().hitCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 2,
        hitCount: 1,
        missCount: 1,
        readThroughCount: 1,
        responseChanged: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    expect(monitor.snapshot().routeMetrics).toEqual([
      expect.objectContaining({
        route: MARKETPLACE_OPERATION,
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 2,
        hitCount: 1,
        missCount: 1,
        readThroughCount: 1,
        errorCount: 0,
        redacted: true,
      }),
    ]);
    expect(monitorResponse.status).toBe(200);
    expect(monitorResponse.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          routeMetricsRedactionSafe: true,
          hitCount: 1,
          missCount: 1,
          readThroughCount: 1,
        }),
      }),
    );

    expect(rollbackDeleted).toBe(1);
    expect(postRollbackRead).toBeNull();
    expect(isCacheInvalidationExecutionEnabled({ enabled: true })).toBe(false);
    expect(resolveCacheShadowRuntimeConfig({}).enabled).toBe(false);
    expect(policyFor(MARKETPLACE_OPERATION).defaultEnabled).toBe(false);

    const namespacedProofKey = `${PROOF_NAMESPACE}:${proofKey}`;
    const proofKeyCommands = redis.commands.filter((command) => command.includes(namespacedProofKey));
    expect(proofKeyCommands.map((command) => String(command[0]).toUpperCase())).toEqual([
      "GET",
      "GET",
      "SET",
      "SADD",
      "SADD",
      "SADD",
      "GET",
      "DEL",
      "GET",
    ]);

    const metricsOutput = JSON.stringify(monitorResponse.body);
    expect(metricsOutput).not.toContain("cache:v1:");
    expect(metricsOutput).not.toContain(PROOF_NAMESPACE);
    expect(metricsOutput).not.toContain("company-s-cache-01-cold-proof");
    expect(metricsOutput).not.toContain(PROOF_NONCE);
    expect(metricsOutput).not.toContain(UTF8_QUERY);
    expect(metricsOutput).not.toContain("token");
    expect(metricsOutput).not.toContain("secret");
  });

  it("proves non-marketplace routes skip cache and keep provider fallback under read-through config", async () => {
    const redis = createIsolatedRedisCacheAdapterFixture("rik-s-night-cache-08-route-skip");
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    let providerVersion = 0;
    const listRequestProposals = jest.fn(async () => {
      providerVersion += 1;
      return [{ id: `proposal-provider-${providerVersion}` }];
    });
    const readPorts = {
      ...fixture.read,
      requestProposal: { listRequestProposals },
    };
    const request = readRequest(ROUTE_SCOPE_SKIP_OPERATION, routeScopeSkipInput());
    const deps = {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    };

    const first = await handleBffStagingServerRequest(request, deps);
    const second = await handleBffStagingServerRequest(request, deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "proposal-provider-1" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "proposal-provider-2" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(listRequestProposals).toHaveBeenCalledTimes(2);
    expect(redis.commands).toHaveLength(0);

    await waitFor(() => monitor.snapshot().skippedCount === 2);
    expect(monitor.snapshot().routeMetrics).toEqual([
      expect.objectContaining({
        route: ROUTE_SCOPE_SKIP_OPERATION,
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 0,
        hitCount: 0,
        missCount: 0,
        readThroughCount: 0,
        skippedCount: 2,
        redacted: true,
      }),
    ]);
  });

  it("keeps read-through route scope unchanged and all cache defaults disabled", () => {
    const publicReadThroughRoutes = BFF_STAGING_READ_ROUTES
      .filter((route) => {
        const cacheRoute = route.cachePolicyRoute;
        return cacheRoute ? getCachePolicy(cacheRoute)?.payloadClass === "public_catalog" : false;
      })
      .map((route) => route.cachePolicyRoute);

    expect(CACHE_READ_THROUGH_V1_ALLOWED_ROUTES).toEqual([MARKETPLACE_OPERATION]);
    expect(publicReadThroughRoutes).toEqual([MARKETPLACE_OPERATION]);
    expect(BFF_STAGING_READ_ROUTES.every((route) => route.cachePolicyDefaultEnabled === false)).toBe(true);
  });
});
