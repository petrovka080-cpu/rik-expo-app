import {
  RedisUrlCacheAdapter,
  type RedisCommand,
  type RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import { buildSafeCacheKey } from "../../src/shared/scale/cacheKeySafety";
import {
  CACHE_POLICY_REGISTRY,
  getCachePolicy,
  type CachePolicyRoute,
} from "../../src/shared/scale/cachePolicies";
import {
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import type { BffReadOperation } from "../../src/shared/scale/bffReadHandlers";
import type { BffShadowFixturePortCall } from "../../src/shared/scale/bffShadowPorts";
import {
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_ROUTE_REGISTRY,
  handleBffStagingServerRequest,
  type BffStagingRequestEnvelope,
  type BffStagingRouteDefinition,
} from "../../scripts/server/stagingBffServerBoundary";

const MARKETPLACE_OPERATION: BffReadOperation = "marketplace.catalog.search";
const NON_PUBLIC_READ_OPERATIONS: readonly BffReadOperation[] = Object.freeze([
  "request.proposal.list",
  "warehouse.ledger.list",
  "accountant.invoice.list",
  "director.pending.list",
]);

const PORT_BY_OPERATION: Readonly<Record<BffReadOperation, BffShadowFixturePortCall["port"]>> = Object.freeze({
  "request.proposal.list": "requestProposal",
  "marketplace.catalog.search": "marketplaceCatalog",
  "warehouse.ledger.list": "warehouseLedger",
  "accountant.invoice.list": "accountantInvoice",
  "director.pending.list": "directorPending",
});

const routeByOperation = (operation: BffReadOperation): BffStagingRouteDefinition => {
  const route = BFF_STAGING_ROUTE_REGISTRY.find((entry) => entry.operation === operation);
  if (!route) throw new Error(`Missing BFF staging read route for ${operation}`);
  return route;
};

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

const createRedisCacheAdapterFixture = () => {
  const values = new Map<string, string>();
  const commandImpl: RedisCommandExecutor = async (command: RedisCommand) => {
    const operation = String(command[0] ?? "").toUpperCase();
    if (operation === "SET" && typeof command[1] === "string" && typeof command[2] === "string") {
      values.set(command[1], command[2]);
      return "OK";
    }
    if (operation === "GET" && typeof command[1] === "string") {
      return values.get(command[1]) ?? null;
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

  return new RedisUrlCacheAdapter({
    redisUrl: "rediss://red-render-kv.example.invalid:6379",
    namespace: "rik-production-cache-shadow",
    commandImpl,
  });
};

const hashForCacheReadThroughPercent = (value: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const selectMarketplaceInputForOnePercent = (): Record<string, unknown> => {
  const policy = getCachePolicy(MARKETPLACE_OPERATION);
  if (!policy) throw new Error("Missing marketplace cache policy");

  for (let index = 0; index < 10_000; index += 1) {
    const input: Record<string, unknown> = {
      companyId: "company-cache-canary-opaque",
      query: `cement-${index}`,
      category: "materials",
      page: 1,
      pageSize: 5,
    };
    const keyResult = buildSafeCacheKey(policy, input);
    if (keyResult.ok && hashForCacheReadThroughPercent(keyResult.key) % 100 < 1) {
      return input;
    }
  }

  throw new Error("Could not find deterministic one-percent marketplace cache key");
};

const buildReadRequest = (
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

const countCallsForOperation = (
  calls: readonly BffShadowFixturePortCall[],
  operation: BffReadOperation,
): number => calls.filter((call) => call.port === PORT_BY_OPERATION[operation]).length;

describe("S-AUDIT-NIGHT-BATTLE-139 marketplace cache shadow canary contract", () => {
  it("keeps marketplace catalog as the only current read-through eligible cache policy", () => {
    const publicCatalogRoutes = CACHE_POLICY_REGISTRY
      .filter((policy) => policy.payloadClass === "public_catalog")
      .map((policy) => policy.route);
    const bffReadCachePolicyRoutes = BFF_STAGING_READ_ROUTES
      .map((route) => route.cachePolicyRoute)
      .filter((route): route is CachePolicyRoute => route !== undefined);
    const bffReadThroughEligibleRoutes = bffReadCachePolicyRoutes.filter(
      (route) => getCachePolicy(route)?.payloadClass === "public_catalog",
    );

    expect(publicCatalogRoutes).toEqual([MARKETPLACE_OPERATION]);
    expect(bffReadThroughEligibleRoutes).toEqual([MARKETPLACE_OPERATION]);
    expect(CACHE_POLICY_REGISTRY.every((policy) => policy.defaultEnabled === false)).toBe(true);
    expect(BFF_STAGING_READ_ROUTES.every((route) => route.cachePolicyDefaultEnabled === false)).toBe(true);
  });

  it("serves one-percent marketplace read-through only for the selected route key", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "1",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const marketplaceInput = selectMarketplaceInputForOnePercent();
    const request = buildReadRequest(MARKETPLACE_OPERATION, marketplaceInput);

    const first = await handleBffStagingServerRequest(request, {
      readPorts: fixture.read,
      cacheShadow: { adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts: fixture.read,
      cacheShadow: { adapter, config, monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        serverTiming: expect.objectContaining({ cacheHit: true }),
      }),
    );
    expect(countCallsForOperation(fixture.calls, MARKETPLACE_OPERATION)).toBe(1);

    await waitFor(() => monitor.snapshot().missCount === 1 && monitor.snapshot().hitCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 2,
        hitCount: 1,
        missCount: 1,
        readThroughCount: 1,
        skippedCount: 0,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    const output = JSON.stringify({ first, second, monitor: monitor.snapshot() });
    expect(output).not.toContain("cache:v1:");
    expect(output).not.toContain("company-cache-canary-opaque");
    expect(output).not.toContain('"query":"cement-');
  });

  it("keeps tenant, finance, and stock routes on the live port path under read-through mode", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: NON_PUBLIC_READ_OPERATIONS.join(","),
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const input: Record<string, unknown> = {
      companyId: "company-cache-canary-opaque",
      role: "fixture-role-redacted",
      warehouseIdHash: "warehouse-cache-scope",
      filtersHash: "stable-filter-scope",
      page: 1,
      pageSize: 5,
    };

    for (const operation of NON_PUBLIC_READ_OPERATIONS) {
      const request = buildReadRequest(operation, input);
      const first = await handleBffStagingServerRequest(request, {
        readPorts: fixture.read,
        cacheShadow: { adapter, config, monitor },
      });
      const second = await handleBffStagingServerRequest(request, {
        readPorts: fixture.read,
        cacheShadow: { adapter, config, monitor },
      });

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(countCallsForOperation(fixture.calls, operation)).toBe(2);
    }

    await waitFor(() => monitor.snapshot().skippedCount === NON_PUBLIC_READ_OPERATIONS.length * 2);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: NON_PUBLIC_READ_OPERATIONS.length * 2,
        shadowReadAttemptedCount: 0,
        hitCount: 0,
        missCount: 0,
        readThroughCount: 0,
        skippedCount: NON_PUBLIC_READ_OPERATIONS.length * 2,
        rawKeysStored: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
  });

  it("keeps marketplace uncached when the production shadow flag is disabled", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "false",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const request = buildReadRequest(MARKETPLACE_OPERATION, {
      companyId: "company-cache-canary-opaque",
      query: "cement",
      category: "materials",
      page: 1,
      pageSize: 5,
    });

    const first = await handleBffStagingServerRequest(request, {
      readPorts: fixture.read,
      cacheShadow: { adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts: fixture.read,
      cacheShadow: { adapter, config, monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body).toEqual(
      expect.objectContaining({
        ok: true,
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(countCallsForOperation(fixture.calls, MARKETPLACE_OPERATION)).toBe(2);
    await waitFor(() => monitor.snapshot().observedDecisionCount === 2);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 0,
        hitCount: 0,
        missCount: 0,
        readThroughCount: 0,
        skippedCount: 2,
      }),
    );
  });
});
