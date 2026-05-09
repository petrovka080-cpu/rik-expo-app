import {
  RedisUrlCacheAdapter,
  type RedisCommand,
  type RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import {
  getCachePolicy,
  type CachePolicy,
  type CachePolicyRoute,
} from "../../src/shared/scale/cachePolicies";
import {
  getInvalidationTagsForOperation,
  isCacheInvalidationExecutionEnabled,
  type CacheInvalidationOperation,
} from "../../src/shared/scale/cacheInvalidation";
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

const NON_PUBLIC_READ_OPERATIONS = Object.freeze([
  "request.proposal.list",
  "warehouse.ledger.list",
  "accountant.invoice.list",
  "director.pending.list",
] satisfies readonly BffReadOperation[]);

const PORT_BY_OPERATION: Readonly<Record<BffReadOperation, string>> = Object.freeze({
  "request.proposal.list": "requestProposal",
  "marketplace.catalog.search": "marketplaceCatalog",
  "warehouse.ledger.list": "warehouseLedger",
  "accountant.invoice.list": "accountantInvoice",
  "director.pending.list": "directorPending",
});

type RedisValueEntry = {
  value: string;
  expiresAt: number | null;
};

type RedisSetEntry = {
  members: Set<string>;
  expiresAt: number | null;
};

type InvalidationCoverage = {
  route: CachePolicyRoute;
  operation: CacheInvalidationOperation;
  tags: readonly string[];
};

const STALE_SENSITIVE_INVALIDATION_COVERAGE = Object.freeze([
  {
    route: "request.proposal.list",
    operation: "proposal.submit",
    tags: ["request", "proposal", "director_pending"],
  },
  {
    route: "director.pending.list",
    operation: "director.approval.apply",
    tags: ["director", "approval", "proposal"],
  },
  {
    route: "accountant.invoice.list",
    operation: "accountant.payment.apply",
    tags: ["accountant", "invoice", "payment"],
  },
  {
    route: "warehouse.ledger.list",
    operation: "warehouse.receive.apply",
    tags: ["warehouse", "ledger", "stock"],
  },
] satisfies readonly InvalidationCoverage[]);

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

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

const createExpiringRedisCacheAdapterFixture = () => {
  let now = 0;
  const values = new Map<string, RedisValueEntry>();
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
      namespace: "rik-cache-stale-contract",
      commandImpl,
    }),
    advance: (ms: number) => {
      now += ms;
    },
    commands,
  };
};

const marketplaceInput = (): Record<string, unknown> => ({
  companyId: "company-cache-stale-opaque",
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

const sensitiveInput = (): Record<string, unknown> => ({
  companyId: "company-cache-stale-opaque",
  actorId: "actor-cache-stale-opaque",
  role: "director",
  warehouseId: "warehouse-cache-stale-opaque",
  page: 1,
  pageSize: 5,
  filters: {
    status: "pending",
    scope: "team",
    sort: "submitted_at",
    direction: "desc",
  },
});

const countCallsForOperation = (
  calls: ReturnType<typeof createBffShadowFixturePorts>["calls"],
  operation: BffReadOperation,
): number => calls.filter((call) => call.port === PORT_BY_OPERATION[operation]).length;

describe("S-AUDIT-NIGHT-BATTLE-140 cache stale data contracts", () => {
  it("expires marketplace read-through at policy TTL and does not serve stale-window data", async () => {
    const policy = policyFor(MARKETPLACE_OPERATION);
    const redis = createExpiringRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: MARKETPLACE_OPERATION,
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    let version = 0;
    const searchCatalog = jest.fn(async () => {
      version += 1;
      return [{ id: `catalog-${version}`, title: `catalog version ${version}` }];
    });
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };
    const request = readRequest(MARKETPLACE_OPERATION, marketplaceInput());

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
        data: [expect.objectContaining({ id: "catalog-1" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(second.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "catalog-1" })],
        serverTiming: expect.objectContaining({ cacheHit: true }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    redis.advance(policy.ttlMs + 1);
    const third = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter: redis.adapter, config, monitor },
    });

    expect(third.status).toBe(200);
    expect(third.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: [expect.objectContaining({ id: "catalog-2" })],
        serverTiming: expect.objectContaining({ cacheHit: false }),
      }),
    );
    expect(searchCatalog).toHaveBeenCalledTimes(2);

    await waitFor(() => monitor.snapshot().missCount === 2 && monitor.snapshot().hitCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 3,
        shadowReadAttemptedCount: 3,
        hitCount: 1,
        missCount: 2,
        readThroughCount: 2,
        responseChanged: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );

    const setCommands = redis.commands.filter((command) => String(command[0]).toUpperCase() === "SET");
    expect(setCommands).toHaveLength(2);
    expect(setCommands.every((command) => command.includes(policy.ttlMs))).toBe(true);
    expect(setCommands.some((command) => command.includes(policy.ttlMs + policy.staleWhileRevalidateMs))).toBe(false);
  });

  it("keeps tenant, finance, and stock routes on live ports under read-through mode", async () => {
    const redis = createExpiringRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: NON_PUBLIC_READ_OPERATIONS.join(","),
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();

    for (const operation of NON_PUBLIC_READ_OPERATIONS) {
      const request = readRequest(operation, sensitiveInput());
      const first = await handleBffStagingServerRequest(request, {
        readPorts: fixture.read,
        cacheShadow: { adapter: redis.adapter, config, monitor },
      });
      const second = await handleBffStagingServerRequest(request, {
        readPorts: fixture.read,
        cacheShadow: { adapter: redis.adapter, config, monitor },
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
        responseChanged: false,
        rawKeysStored: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    expect(redis.commands.filter((command) => String(command[0]).toUpperCase() === "SET")).toHaveLength(0);
  });

  it("locks stale-sensitive mutation tags while invalidation execution remains disabled", () => {
    expect(isCacheInvalidationExecutionEnabled({ enabled: true })).toBe(false);

    for (const coverage of STALE_SENSITIVE_INVALIDATION_COVERAGE) {
      const policy = policyFor(coverage.route);
      const mutationTags = getInvalidationTagsForOperation(coverage.operation);

      expect(policy.defaultEnabled).toBe(false);
      expect(policy.tags).toEqual(expect.arrayContaining(coverage.tags));
      expect(mutationTags).toEqual(expect.arrayContaining(coverage.tags));
    }

    expect(policyFor(MARKETPLACE_OPERATION)).toEqual(
      expect.objectContaining({
        payloadClass: "public_catalog",
        ttlMs: 120_000,
        staleWhileRevalidateMs: 300_000,
        defaultEnabled: false,
      }),
    );
  });
});
