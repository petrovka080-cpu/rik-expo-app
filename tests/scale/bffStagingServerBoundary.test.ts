import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { isBffEnabled } from "../../src/shared/scale/bffSafety";
import {
  RedisUrlCacheAdapter,
  type RedisCommand,
  type RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import {
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import {
  BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD,
  BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD,
  BFF_SHADOW_MUTATION_PAYLOAD,
  createBffShadowFixturePorts,
} from "../../src/shared/scale/bffShadowFixtures";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_ROUTE_REGISTRY,
  BFF_STAGING_SERVER_BOUNDARY_CONTRACT,
  BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS,
  BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
  buildBffMutationRouteScopeForOperations,
  buildCacheShadowRuntimeState,
  buildBffStagingRateLimitKeyInput,
  buildBffStagingDeploymentReadiness,
  handleBffStagingServerRequest,
  isBffStagingResponseEnvelope,
  parseBffMutationRouteAllowlist,
  parseBffStagingRequestPayload,
  runLocalBffStagingBoundaryShadow,
} from "../../scripts/server/stagingBffServerBoundary";
import { BFF_MUTATION_HANDLER_OPERATIONS } from "../../src/shared/scale/bffMutationHandlers";
import {
  createRateLimitShadowMonitor,
  InMemoryRateLimitAdapter,
  RuntimeRateEnforcementProvider,
  type RateLimitPrivateSmokeResult,
} from "../../src/shared/scale/rateLimitAdapters";
import type { WarehouseApiBffPayloadDto } from "../../src/screens/warehouse/warehouse.api.bff.contract";
import type { WarehouseApiBffReadPort } from "../../src/screens/warehouse/warehouse.api.bff.handler";
import type { CatalogTransportBffReadResultDto } from "../../src/lib/catalog/catalog.bff.contract";
import type { CatalogTransportBffReadPort } from "../../src/lib/catalog/catalog.bff.handler";
import type { AssistantStoreReadBffReadResultDto } from "../../src/lib/assistant_store_read.bff.contract";
import type { AssistantStoreReadBffPort } from "../../src/lib/assistant_store_read.bff.handler";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const changedFiles = () =>
  execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const routeByOperation = (operation: string) =>
  BFF_STAGING_ROUTE_REGISTRY.find((route) => route.operation === operation);

const catalogMutationPayloadForOperation = (operation: string) => {
  if (operation === "catalog.request.meta.update") return BFF_SHADOW_CATALOG_REQUEST_META_PAYLOAD;
  if (operation === "catalog.request.item.cancel") return BFF_SHADOW_CATALOG_REQUEST_CANCEL_PAYLOAD;
  return BFF_SHADOW_MUTATION_PAYLOAD;
};

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

const createRedisCacheAdapterFixture = (options: { maxValueBytes?: number } = {}) => {
  const values = new Map<string, string>();
  const commandMock = jest.fn(async (command: RedisCommand) => {
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
  }) as jest.MockedFunction<RedisCommandExecutor>;

  return new RedisUrlCacheAdapter({
    redisUrl: "rediss://red-render-kv.example.invalid:6379",
    namespace: "rik-production-cache-shadow",
    commandImpl: commandMock,
    maxValueBytes: options.maxValueBytes,
  });
};

describe("S-50K-BFF-STAGING-DEPLOY-1 server boundary", () => {
  it("serves health and readiness contracts without ports or env values", async () => {
    await expect(
      handleBffStagingServerRequest({ method: "GET", path: "/health" }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 200,
        body: expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ok",
            serverBoundaryReady: true,
            productionTouched: false,
          }),
        }),
      }),
    );

    await expect(
      handleBffStagingServerRequest({ method: "GET", path: "/ready" }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 200,
        body: expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            readRoutes: 5,
            readRpcRoutes: 4,
            mutationRoutes: 7,
            mutationRoutesEnabledByDefault: false,
            mutationRoutesEnabled: false,
            mutationRouteScopeStatus: "disabled",
            enabledMutationRoutes: 0,
            catalogRequestMutationRoutesSupported: 3,
            mutationRouteScopeValuesPrinted: false,
            appRuntimeBffEnabled: false,
          }),
        }),
      }),
    );
  });

  it("registers five read routes and disabled mutation routes", () => {
    expect(BFF_STAGING_READ_ROUTES.map((route) => route.operation)).toEqual([
      "request.proposal.list",
      "marketplace.catalog.search",
      "warehouse.ledger.list",
      "accountant.invoice.list",
      "director.pending.list",
    ]);
    expect(BFF_STAGING_MUTATION_ROUTES.map((route) => route.operation)).toEqual([
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
      "catalog.request.meta.update",
      "catalog.request.item.cancel",
    ]);
    expect(BFF_STAGING_MUTATION_ROUTES.every((route) => route.enabledByDefault === false)).toBe(true);
    expect(BFF_STAGING_SERVER_BOUNDARY_CONTRACT).toEqual(
      expect.objectContaining({
        healthEndpointContract: true,
        readinessEndpointContract: true,
        cacheShadowMonitorEndpointContract: true,
        cacheShadowCanaryEndpointContract: true,
        rateLimitShadowMonitorEndpointContract: true,
        rateLimitPrivateSmokeEndpointContract: true,
        readRoutes: 5,
        readRpcRoutes: 4,
        mutationRoutes: 7,
        warehouseApiReadRouteContract: true,
        catalogTransportReadRouteContract: true,
        assistantStoreReadRouteContract: true,
        mutationRoutesEnabledByDefault: false,
        routeScopedMutationEnablement: true,
        catalogRequestMutationRouteScopeKeys: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS,
        catalogRequestMutationRouteScopeOperations: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
        wildcardMutationRouteEnablementAllowed: false,
        requestEnvelopeValidation: true,
        responseEnvelopeValidation: true,
        redactedErrors: true,
      }),
    );
  });

  it("reports cache shadow runtime visibility in readiness without exposing env values", async () => {
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "0",
    });
    const response = await handleBffStagingServerRequest(
      { method: "GET", path: "/ready" },
      {
        cacheShadowRuntime: buildCacheShadowRuntimeState(config, createRedisCacheAdapterFixture()),
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          cacheShadowRuntime: expect.objectContaining({
            status: "configured",
            enabled: true,
            productionEnabledFlagTruthy: true,
            mode: "shadow_readonly",
            percent: 0,
            routeAllowlistCount: 1,
            envKeyPresence: {
              productionEnabled: true,
              mode: true,
              routeAllowlist: true,
              percent: true,
              url: false,
              namespace: false,
              commandTimeout: false,
            },
            providerKind: "redis_url",
            providerEnabled: true,
            externalNetworkEnabled: true,
            reason: "configured",
            secretsExposed: false,
            envValuesExposed: false,
          }),
        }),
      }),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("red-render-kv");
    expect(serialized).not.toContain("rik-production-cache-shadow:cache:v1:");
  });

  it("runs cache shadow/read-only canary through server-authenticated permanent diagnostics", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();

    const missing = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/cache-shadow-canary",
        headers: { authorization: "Bearer server-secret" },
      },
      { config: { serverAuthConfigured: true } },
    );
    expect(missing.status).toBe(503);
    expect(JSON.stringify(missing)).not.toContain("server-secret");

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/cache-shadow-canary",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        cacheShadow: { adapter, config, monitor },
        config: { serverAuthConfigured: true },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          status: "ready",
          route: "marketplace.catalog.search",
          mode: "shadow_readonly",
          syntheticIdentityUsed: true,
          realUserPayloadUsed: false,
          shadowReadAttempted: true,
          cacheHitVerified: true,
          responseChanged: false,
          cacheWriteSyntheticOnly: true,
          cleanupOk: true,
          ttlBounded: true,
          commandProbeAttempted: true,
          commandProbeStatus: "ready",
          commandSetOk: true,
          commandGetOk: true,
          commandValueMatched: true,
          commandDeleteOk: true,
          rawKeyReturned: false,
          rawPayloadLogged: false,
          piiLogged: false,
        }),
      }),
    );

    const monitorResponse = await handleBffStagingServerRequest(
      {
        method: "GET",
        path: "/api/staging-bff/monitor/cache-shadow",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        cacheShadow: { adapter, config, monitor },
        config: { serverAuthConfigured: true },
      },
    );
    expect(monitorResponse.status).toBe(200);
    expect(monitorResponse.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          status: "ready",
          observedDecisionCount: 1,
          shadowReadAttemptedCount: 1,
          hitCount: 1,
          responseChanged: false,
          realUserPayloadStored: false,
          rawKeysStored: false,
          rawKeysPrinted: false,
          rawPayloadLogged: false,
          piiLogged: false,
        }),
      }),
    );

    const output = JSON.stringify({ response, monitorResponse });
    expect(output).not.toContain("server-secret");
    expect(output).not.toContain("cache:v1:");
    expect(output).not.toContain("cache-shadow-canary");
  });

  it("serves route-scoped public catalog cache read-through without raw cache output", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          query: "cement",
          category: "materials",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };

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
    expect(fixture.calls.filter((call) => call.port === "marketplaceCatalog")).toHaveLength(1);

    await waitFor(() => monitor.snapshot().missCount === 1 && monitor.snapshot().hitCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 2,
        hitCount: 1,
        missCount: 1,
        responseChanged: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    const output = JSON.stringify({ first, second, monitor: monitor.snapshot() });
    expect(output).not.toContain("cache:v1:");
    expect(output).not.toContain("company-cache-canary-opaque");
    expect(output).not.toContain('"query":"cement"');
  });

  it("serves UTF-8 public catalog read-through on the second identical request", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [
      { title: "цемент", category: "материалы" },
    ]);
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          query: "cement",
          category: "materials",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
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
    expect(searchCatalog).toHaveBeenCalledTimes(1);

    await waitFor(() => monitor.snapshot().missCount === 1 && monitor.snapshot().hitCount === 1);
    const output = JSON.stringify({ first, second, monitor: monitor.snapshot() });
    expect(output).not.toContain("cache:v1:");
    expect(output).not.toContain("company-cache-canary-opaque");
    expect(output).not.toContain('"query":"cement"');
  });

  it("serves cacheable empty public catalog results on the second identical request", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => []);
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          query: "no-results",
          category: "materials",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter, config, monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((first.body as { data?: unknown }).data).toEqual([]);
    expect((second.body as { data?: unknown }).data).toEqual([]);
    expect((first.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(false);
    expect((second.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(true);
    expect(searchCatalog).toHaveBeenCalledTimes(1);
  });

  it("fail-closes oversized read-through values without raw cache output", async () => {
    const adapter = createRedisCacheAdapterFixture({ maxValueBytes: 128 });
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const searchCatalog = jest.fn(async () => [
      { title: "oversized-public-catalog", blob: "x".repeat(512) },
    ]);
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          query: "oversized",
          category: "materials",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };
    const readPorts = {
      ...fixture.read,
      marketplaceCatalog: { searchCatalog },
    };

    const first = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter, config, monitor },
    });
    const second = await handleBffStagingServerRequest(request, {
      readPorts,
      cacheShadow: { adapter, config, monitor },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((first.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(false);
    expect((second.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(false);
    expect(searchCatalog).toHaveBeenCalledTimes(2);

    await waitFor(() => monitor.snapshot().missCount === 2);
    const output = JSON.stringify({ first, second, monitor: monitor.snapshot() });
    expect(output).not.toContain("cache:v1:");
    expect(output).not.toContain("company-cache-canary-opaque");
    expect(output).not.toContain('"query":"oversized"');
  });

  it("keeps shadow_readonly mode from serving cached read-through responses", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          query: "cement",
          category: "materials",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };

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
    expect((first.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(false);
    expect((second.body as { serverTiming?: { cacheHit?: boolean } }).serverTiming?.cacheHit).toBe(false);
    expect(fixture.calls.filter((call) => call.port === "marketplaceCatalog")).toHaveLength(2);
  });

  it("keeps read-through serving route scoped and rejects non-public payload classes", async () => {
    const adapter = createRedisCacheAdapterFixture();
    const config = resolveCacheShadowRuntimeConfig({
      SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
      SCALE_REDIS_CACHE_SHADOW_MODE: "read_through",
      SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "request.proposal.list",
      SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
    });
    const monitor = createCacheShadowMonitor();
    const fixture = createBffShadowFixturePorts();
    const route = routeByOperation("request.proposal.list");
    expect(route).toBeDefined();
    const request = {
      method: "POST" as const,
      path: route!.path,
      body: {
        input: {
          companyId: "company-cache-canary-opaque",
          page: 1,
          pageSize: 5,
        },
        metadata: {},
      },
    };

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
    expect(first.body).toEqual(expect.objectContaining({ ok: true }));
    expect(second.body).toEqual(expect.objectContaining({ ok: true }));
    expect(fixture.calls.filter((call) => call.port === "requestProposal")).toHaveLength(2);

    await waitFor(() => monitor.snapshot().skippedCount === 2);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        observedDecisionCount: 2,
        shadowReadAttemptedCount: 0,
        hitCount: 0,
        missCount: 0,
        skippedCount: 2,
        responseChanged: false,
        rawKeysStored: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
  });

  it("rejects unknown routes and invalid request envelopes with redacted errors", async () => {
    await expect(
      handleBffStagingServerRequest({
        method: "POST",
        path: "/api/staging-bff/unknown?token=secretvalue",
        body: { payload: { raw: true } },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 404,
        body: {
          ok: false,
          error: {
            code: "BFF_ROUTE_NOT_FOUND",
            message: "Unknown staging BFF route",
          },
        },
      }),
    );

    const readRoute = routeByOperation("request.proposal.list");
    expect(readRoute).toBeDefined();

    const invalid = await handleBffStagingServerRequest({
      method: "POST",
      path: readRoute?.path ?? "",
      body: "raw payload token=secretvalue user@example.test",
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({
      ok: false,
      error: {
        code: "BFF_INVALID_REQUEST_ENVELOPE",
        message: "Invalid request envelope",
      },
    });
    expect(JSON.stringify(invalid)).not.toContain("secretvalue");
    expect(JSON.stringify(invalid)).not.toContain("user@example.test");
  });

  it("validates request and response envelope shapes", () => {
    expect(parseBffStagingRequestPayload({ input: { pageSize: 25 }, metadata: {} })).toEqual({
      input: { pageSize: 25 },
      metadata: {},
    });
    expect(parseBffStagingRequestPayload({ input: "bad" })).toBeNull();
    expect(isBffStagingResponseEnvelope({ ok: true, data: [] })).toBe(true);
    expect(
      isBffStagingResponseEnvelope({
        ok: false,
        error: { code: "BFF_ERROR", message: "safe" },
      }),
    ).toBe(true);
    expect(isBffStagingResponseEnvelope({ ok: false, error: { code: "BFF_ERROR" } })).toBe(false);
  });

  it("invokes read routes through fixture ports only", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            page: -1,
            pageSize: 250,
            query: "cement user@example.test token=secretvalue",
            filters: { category: "materials", unsafe: "ignored" },
          },
        },
      },
      { readPorts: fixturePorts.read },
    );

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(fixturePorts.calls).toEqual([
      expect.objectContaining({
        flow: "marketplace.catalog.search",
        page: 0,
        pageSize: 100,
      }),
    ]);
    expect(JSON.stringify(response)).not.toContain("secretvalue");
    expect(JSON.stringify(response)).not.toContain("user@example.test");
  });

  it("invokes the warehouse API read-RPC route through its typed port only", async () => {
    const route = routeByOperation("warehouse.api.read.scope");
    const warehouseApiReadPort: WarehouseApiBffReadPort = {
      runWarehouseApiRead: jest.fn(async (): Promise<WarehouseApiBffPayloadDto> => ({
        kind: "single",
        result: { data: [{ row: "warehouse-api" }], error: null },
      })),
    };

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            operation: "warehouse.api.report.incoming_v2",
            args: { p_from: null, p_to: null },
          },
        },
      },
      { warehouseApiReadPort },
    );

    expect(route).toEqual(
      expect.objectContaining({
        kind: "read_rpc",
        method: "POST",
        enabledByDefault: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(warehouseApiReadPort.runWarehouseApiRead).toHaveBeenCalledWith({
      operation: "warehouse.api.report.incoming_v2",
      args: { p_from: null, p_to: null },
    });
  });

  it("invokes the catalog transport read-RPC route through its typed port only", async () => {
    const route = routeByOperation("catalog.transport.read.scope");
    const catalogTransportReadPort: CatalogTransportBffReadPort = {
      runCatalogTransportRead: jest.fn(async (): Promise<CatalogTransportBffReadResultDto> => ({
        data: [{ row: "catalog-transport" }],
        error: null,
      })),
    };

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            operation: "catalog.groups.list",
            args: {},
          },
        },
      },
      { catalogTransportReadPort },
    );

    expect(route).toEqual(
      expect.objectContaining({
        kind: "read_rpc",
        method: "POST",
        enabledByDefault: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(catalogTransportReadPort.runCatalogTransportRead).toHaveBeenCalledWith({
      operation: "catalog.groups.list",
      args: {},
    });
  });

  it("invokes the assistant/store read-RPC route through its typed port only", async () => {
    const route = routeByOperation("assistant.store.read.scope");
    const assistantStoreReadPort: AssistantStoreReadBffPort = {
      runAssistantStoreRead: jest.fn(async (): Promise<AssistantStoreReadBffReadResultDto> => ({
        data: [{ row: "assistant-store-read" }],
        error: null,
      })),
    };

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            operation: "store.director_inbox.list",
            args: {},
          },
        },
      },
      { assistantStoreReadPort },
    );

    expect(route).toEqual(
      expect.objectContaining({
        kind: "read_rpc",
        method: "POST",
        enabledByDefault: true,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(assistantStoreReadPort.runAssistantStoreRead).toHaveBeenCalledWith({
      operation: "store.director_inbox.list",
      args: {},
    });
  });

  it("keeps mutation routes disabled by default and requires route scope before safety metadata", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const route = routeByOperation("proposal.submit");
    expect(route).toBeDefined();

    const disabled = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            idempotencyKey: "opaque-key-v1",
            payload: { raw: "not logged" },
          },
        },
      },
      { mutationPorts: fixturePorts.mutation },
    );
    expect(disabled.status).toBe(403);
    expect(disabled.body).toEqual({
      ok: false,
      error: {
        code: "BFF_MUTATION_ROUTES_DISABLED",
        message: "Mutation routes are disabled by default",
      },
    });
    expect(fixturePorts.calls).toHaveLength(0);

    const globalGateOnly = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            idempotencyKey: "opaque-key-v1",
            payload: { raw: "not logged" },
          },
        },
      },
      {
        mutationPorts: fixturePorts.mutation,
        config: { mutationRoutesEnabled: true },
      },
    );
    expect(globalGateOnly.status).toBe(403);
    expect(globalGateOnly.body).toEqual({
      ok: false,
      error: {
        code: "BFF_MUTATION_ROUTE_DISABLED",
        message: "Mutation route is not enabled",
      },
    });

    const missingMetadata = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            idempotencyKey: "opaque-key-v1",
            payload: { raw: "not logged" },
          },
        },
      },
      {
        mutationPorts: fixturePorts.mutation,
        config: {
          mutationRoutesEnabled: true,
          mutationRouteScope: buildBffMutationRouteScopeForOperations(["proposal.submit"]),
        },
      },
    );
    expect(missingMetadata.status).toBe(400);
    expect(missingMetadata.body).toEqual({
      ok: false,
      error: {
        code: "BFF_IDEMPOTENCY_METADATA_REQUIRED",
        message: "Idempotency metadata is required",
      },
    });

    const enabled = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route?.path ?? "",
        body: {
          input: {
            idempotencyKey: "opaque-key-v1",
            payload: { raw: "not logged", email: "person@example.test" },
          },
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      },
      {
        mutationPorts: fixturePorts.mutation,
        config: {
          mutationRoutesEnabled: true,
          mutationRouteScope: buildBffMutationRouteScopeForOperations(["proposal.submit"]),
        },
      },
    );

    expect(enabled.status).toBe(200);
    expect(enabled.body.ok).toBe(true);
    expect(JSON.stringify(enabled)).not.toContain("person@example.test");
    expect(JSON.stringify(enabled)).not.toContain("not logged");
  });

  it("parses catalog-only route-scoped mutation enablement without allowing wildcard or unknown routes", () => {
    expect(parseBffMutationRouteAllowlist(undefined)).toEqual(
      expect.objectContaining({
        status: "disabled",
        enabledOperations: [],
        enabledOperationCount: 0,
        emptyAllowlist: true,
        valuesPrinted: false,
        secretsPrinted: false,
      }),
    );

    expect(parseBffMutationRouteAllowlist(BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS.join(","))).toEqual(
      expect.objectContaining({
        status: "enabled",
        enabledRouteKeys: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS,
        enabledOperations: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
        enabledOperationCount: 3,
        invalidRouteKeyCount: 0,
        wildcardRejected: false,
        valuesPrinted: false,
        secretsPrinted: false,
      }),
    );

    expect(parseBffMutationRouteAllowlist("all")).toEqual(
      expect.objectContaining({
        status: "invalid",
        enabledOperations: [],
        invalidRouteKeyCount: 0,
        wildcardRejected: true,
        valuesPrinted: false,
        secretsPrinted: false,
      }),
    );

    expect(parseBffMutationRouteAllowlist("proposal.submit")).toEqual(
      expect.objectContaining({
        status: "invalid",
        enabledOperations: [],
        invalidRouteKeyCount: 1,
        wildcardRejected: false,
        valuesPrinted: false,
        secretsPrinted: false,
      }),
    );
  });

  it("allows only catalog request mutations when catalog route scope is enabled", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const catalogScope = parseBffMutationRouteAllowlist(BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS.join(","));
    const metadata = {
      idempotencyKeyStatus: "present_redacted",
      rateLimitKeyStatus: "present_redacted",
    };

    for (const operation of BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS) {
      const route = routeByOperation(operation);
      expect(route).toBeDefined();
      const response = await handleBffStagingServerRequest(
        {
          method: "POST",
          path: route?.path ?? "",
          body: {
            input: {
              idempotencyKey: "opaque-key-v1",
              payload: catalogMutationPayloadForOperation(operation),
              context: {
                actorRole: "unknown",
                companyScope: "present_redacted",
                idempotencyKeyStatus: "present_redacted",
                requestScope: "present_redacted",
              },
            },
            metadata,
          },
        },
        {
          mutationPorts: fixturePorts.mutation,
          config: {
            mutationRoutesEnabled: true,
            mutationRouteScope: catalogScope,
          },
        },
      );
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    }

    const catalogOperations = new Set<string>(BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS);
    for (const operation of BFF_MUTATION_HANDLER_OPERATIONS.filter((entry) => !catalogOperations.has(entry))) {
      const route = routeByOperation(operation);
      expect(route).toBeDefined();
      const response = await handleBffStagingServerRequest(
        {
          method: "POST",
          path: route?.path ?? "",
          body: {
            input: {
              idempotencyKey: "opaque-key-v1",
              payload: BFF_SHADOW_MUTATION_PAYLOAD,
            },
            metadata,
          },
        },
        {
          mutationPorts: fixturePorts.mutation,
          config: {
            mutationRoutesEnabled: true,
            mutationRouteScope: catalogScope,
          },
        },
      );
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        ok: false,
        error: {
          code: "BFF_MUTATION_ROUTE_DISABLED",
          message: "Mutation route is not enabled",
        },
      });
    }
  });

  it("runs local fixture shadow through the staging boundary without network or traffic migration", async () => {
    const summary = await runLocalBffStagingBoundaryShadow();

    expect(summary).toEqual({
      status: "run",
      matches: 12,
      mismatches: 0,
      trafficMigrated: false,
      productionTouched: false,
      stagingWrites: false,
      networkUsed: false,
    });
  });

  it("keeps ignored rate-limit shadow read routes from changing counters or responses", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const route = routeByOperation("marketplace.catalog.search");
    expect(route).toBeDefined();
    if (!route) return;

    const monitor = createRateLimitShadowMonitor();
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 110_000 }),
      namespace: "rik-staging",
    });

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: route.path,
        headers: { authorization: "Bearer server-secret" },
        body: {
          input: {
            query: "cement",
          },
          metadata: {
            rateLimitKeyStatus: "present_redacted",
            rateLimitIpOrDeviceKey: "device-opaque",
          },
        },
      },
      {
        readPorts: fixturePorts.read,
        rateLimitShadow: { provider, monitor },
        config: { serverAuthConfigured: true },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    await waitFor(() => monitor.snapshot().observedDecisionCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 0,
        wouldThrottleCount: 0,
        keyCardinalityRedacted: 0,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );

    const monitorResponse = await handleBffStagingServerRequest(
      {
        method: "GET",
        path: "/api/staging-bff/monitor/rate-limit-shadow",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        rateLimitShadow: { provider, monitor },
        config: { serverAuthConfigured: true },
      },
    );

    expect(monitorResponse.status).toBe(200);
    expect(monitorResponse.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          status: "ready",
          wouldAllowCount: 0,
          wouldThrottleCount: 0,
          keyCardinalityRedacted: 0,
          rawKeysStored: false,
          rawKeysPrinted: false,
          realUsersBlocked: false,
        }),
      }),
    );
    const serialized = JSON.stringify({ response, monitorResponse });
    expect(serialized).not.toContain("device-opaque");
    expect(serialized).not.toContain("server-secret");
  });

  it("counts active existing mutation policies in observe-only shadow mode without changing responses", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const route = routeByOperation("proposal.submit");
    expect(route).toBeDefined();
    if (!route) return;

    const monitor = createRateLimitShadowMonitor();
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 115_000 }),
      namespace: "rik-staging",
    });
    const body = {
      input: {
        idempotencyKey: "idem-opaque",
        payload: BFF_SHADOW_MUTATION_PAYLOAD,
      },
      metadata: {
        idempotencyKeyStatus: "present_redacted",
        rateLimitKeyStatus: "present_redacted",
        rateLimitActorKey: "actor-opaque",
        rateLimitCompanyKey: "company-opaque",
      },
    };
    const deps = {
      mutationPorts: fixturePorts.mutation,
      rateLimitShadow: { provider, monitor },
      config: {
        mutationRoutesEnabled: true,
        mutationRouteScope: buildBffMutationRouteScopeForOperations(["proposal.submit"]),
        idempotencyMetadataRequired: true,
        rateLimitMetadataRequired: true,
      },
    };

    const firstResponse = await handleBffStagingServerRequest(
      { method: "POST", path: route.path, body },
      deps,
    );
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.ok).toBe(true);
    await waitFor(() => monitor.snapshot().wouldAllowCount === 1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 1,
        wouldThrottleCount: 0,
        keyCardinalityRedacted: 1,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
      }),
    );

    for (let index = 0; index < 25; index += 1) {
      const response = await handleBffStagingServerRequest(
        { method: "POST", path: route.path, body },
        deps,
      );
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    }

    await waitFor(() => monitor.snapshot().wouldThrottleCount > 0);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: expect.any(Number),
        wouldThrottleCount: expect.any(Number),
        keyCardinalityRedacted: 1,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    expect(monitor.snapshot().wouldThrottleCount).toBeGreaterThan(0);

    const serialized = JSON.stringify({
      firstResponse,
      monitor: monitor.snapshot(),
    });
    expect(serialized).not.toContain("actor-opaque");
    expect(serialized).not.toContain("company-opaque");
    expect(serialized).not.toContain("idem-opaque");
  });

  it("runs private rate-limit smoke only through a configured synthetic diagnostic runner", async () => {
    const runner = {
      run: jest.fn<Promise<RateLimitPrivateSmokeResult>, []>(async () => ({
        status: "ready" as const,
        operation: "proposal.submit" as const,
        providerKind: "redis_url" as const,
        providerEnabled: true,
        externalNetworkEnabled: true,
        namespacePresent: true,
        syntheticIdentityUsed: true,
        realUserIdentityUsed: false as const,
        wouldAllowVerified: true,
        wouldThrottleVerified: true,
        cleanupAttempted: true,
        cleanupOk: true,
        ttlBounded: true,
        enforcementEnabled: false as const,
        productionUserBlocked: false as const,
        rawKeyReturned: false as const,
        rawPayloadLogged: false as const,
        piiLogged: false as const,
        reason: "synthetic_private_smoke_ready",
      })),
    };
    const monitor = createRateLimitShadowMonitor();

    const missing = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/rate-limit-private-smoke",
        headers: { authorization: "Bearer server-secret" },
      },
      { config: { serverAuthConfigured: true } },
    );
    expect(missing.status).toBe(503);
    expect(JSON.stringify(missing)).not.toContain("server-secret");

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/rate-limit-private-smoke",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        rateLimitPrivateSmoke: runner,
        rateLimitShadow: {
          provider: new RuntimeRateEnforcementProvider(),
          monitor,
        },
        config: { serverAuthConfigured: true },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          status: "ready",
          operation: "proposal.submit",
          providerKind: "redis_url",
          syntheticIdentityUsed: true,
          realUserIdentityUsed: false,
          wouldAllowVerified: true,
          wouldThrottleVerified: true,
          cleanupOk: true,
          ttlBounded: true,
          enforcementEnabled: false,
          productionUserBlocked: false,
          rawKeyReturned: false,
          rawPayloadLogged: false,
          piiLogged: false,
          enforcementCanaryAttempted: false,
          enforcementCanaryBlockedVerified: false,
          enforcementCanaryProductionUserBlocked: false,
        }),
      }),
    );
    expect(runner.run).toHaveBeenCalledTimes(1);
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 1,
        wouldThrottleCount: 1,
        keyCardinalityRedacted: 1,
        observedDecisionCount: 2,
        blockedDecisionsObserved: 0,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain("server-secret");
    expect(serialized).not.toContain("rate:v1:");
    expect(serialized).not.toContain("synthetic-rate-smoke");

    runner.run.mockResolvedValueOnce({
      status: "adapter_unavailable",
      operation: "proposal.submit",
      providerKind: "redis_url",
      providerEnabled: false,
      externalNetworkEnabled: false,
      namespacePresent: true,
      syntheticIdentityUsed: true,
      realUserIdentityUsed: false,
      wouldAllowVerified: false,
      wouldThrottleVerified: false,
      cleanupAttempted: false,
      cleanupOk: false,
      ttlBounded: false,
      enforcementEnabled: false,
      productionUserBlocked: false,
      rawKeyReturned: false,
      rawPayloadLogged: false,
      piiLogged: false,
      reason: "adapter_unavailable",
    });
    const unavailable = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/rate-limit-private-smoke",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        rateLimitPrivateSmoke: runner,
        config: { serverAuthConfigured: true },
      },
    );
    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({
          code: "BFF_RATE_LIMIT_PRIVATE_SMOKE_NOT_READY",
          message: "adapter_unavailable",
        }),
      }),
    );
  });

  it("runs production synthetic enforcement canary through private smoke without real-user blocking", async () => {
    const runner = {
      run: jest.fn<Promise<RateLimitPrivateSmokeResult>, []>(async () => ({
        status: "ready" as const,
        operation: "proposal.submit" as const,
        providerKind: "redis_url" as const,
        providerEnabled: true,
        externalNetworkEnabled: true,
        namespacePresent: true,
        syntheticIdentityUsed: true,
        realUserIdentityUsed: false as const,
        wouldAllowVerified: true,
        wouldThrottleVerified: true,
        cleanupAttempted: true,
        cleanupOk: true,
        ttlBounded: true,
        enforcementEnabled: false as const,
        productionUserBlocked: false as const,
        rawKeyReturned: false as const,
        rawPayloadLogged: false as const,
        piiLogged: false as const,
        reason: "synthetic_private_smoke_ready",
      })),
    };
    const monitor = createRateLimitShadowMonitor();
    const provider = new RuntimeRateEnforcementProvider({
      mode: "enforce_production_synthetic_canary_only",
      runtimeEnvironment: "production",
      adapter: new InMemoryRateLimitAdapter({ now: () => 125_000 }),
      namespace: "rik-production",
    });

    const response = await handleBffStagingServerRequest(
      {
        method: "POST",
        path: "/api/staging-bff/diagnostics/rate-limit-private-smoke",
        headers: { authorization: "Bearer server-secret" },
      },
      {
        rateLimitPrivateSmoke: runner,
        rateLimitShadow: { provider, monitor },
        config: { serverAuthConfigured: true },
      },
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        ok: true,
        data: expect.objectContaining({
          status: "ready",
          enforcementCanaryAttempted: true,
          enforcementCanaryMode: "enforce_production_synthetic_canary_only",
          enforcementCanaryAction: "block",
          enforcementCanaryProviderState: "hard_limited",
          enforcementCanaryBlockedVerified: true,
          enforcementCanarySyntheticIdentityUsed: true,
          enforcementCanaryRealUserIdentityUsed: false,
          enforcementCanaryProductionUserBlocked: false,
          enforcementCanaryRawKeyReturned: false,
          enforcementCanaryRawPayloadLogged: false,
          enforcementCanaryPiiLogged: false,
        }),
      }),
    );
    expect(monitor.snapshot()).toEqual(
      expect.objectContaining({
        wouldAllowCount: 1,
        wouldThrottleCount: 2,
        keyCardinalityRedacted: 2,
        observedDecisionCount: 3,
        blockedDecisionsObserved: 1,
        realUsersBlocked: false,
        rawKeysStored: false,
        rawKeysPrinted: false,
        rawPayloadLogged: false,
        piiLogged: false,
      }),
    );
    const serialized = JSON.stringify({ response, monitor: monitor.snapshot() });
    expect(serialized).not.toContain("server-secret");
    expect(serialized).not.toContain("rate:v1:");
    expect(serialized).not.toContain("synthetic-rate-smoke");
  });

  it("builds rate-limit shadow key input only from explicit opaque metadata and route context", () => {
    const route = routeByOperation("proposal.submit");
    expect(route).toBeDefined();
    if (!route) return;

    const keyInput = buildBffStagingRateLimitKeyInput({
      route,
      payload: {
        input: { idempotencyKey: "idem-opaque" },
        metadata: {
          rateLimitActorKey: "actor-opaque",
          rateLimitCompanyKey: "company-opaque",
        },
      },
      headers: { authorization: "Bearer server-secret" },
    });

    expect(keyInput).toEqual({
      actorId: "actor-opaque",
      companyId: "company-opaque",
      routeKey: "proposal.submit",
      ipOrDeviceKey: undefined,
      idempotencyKey: "idem-opaque",
    });
  });

  it("marks the boundary deploy-ready while redacting staging base URL presence", () => {
    expect(buildBffStagingDeploymentReadiness({ stagingBffBaseUrl: "" })).toEqual({
      status: "BLOCKED_BFF_DEPLOY_TARGET_MISSING",
      repoStatus: "repo_ready_disabled",
      stagingBffBaseUrl: "missing",
      stagingLive: "missing",
      liveCheckRun: false,
      liveCheckReason: "STAGING_BFF_BASE_URL is missing; do not invent a URL.",
      serverBoundaryReady: true,
      stagingShadowRun: "not_run",
      trafficMigrated: false,
    });
    expect(buildBffStagingDeploymentReadiness({ stagingBffBaseUrl: "https://staging-bff.example.invalid" })).toEqual(
      expect.objectContaining({
        status: "GREEN_BFF_STAGING_DEPLOY_PREFLIGHT_READY",
        repoStatus: "repo_ready_disabled",
        stagingBffBaseUrl: "present_redacted",
        stagingLive: "not_checked",
        liveCheckRun: false,
      }),
    );
  });

  it("keeps service admin credentials out of client/mobile files and BFF disabled by default", () => {
    expect(isBffEnabled({ enabled: false })).toBe(false);
    expect(isBffEnabled({ enabled: true, baseUrl: "" })).toBe(false);

    const forbidden = [
      ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"),
      ["service", "role"].join("_"),
      "server_admin_database",
    ];
    const roots = ["app", "src/screens", "src/components", "src/features", "src/lib/api"];
    const hits: string[] = [];

    const walk = (relativeDir: string) => {
      const fullDir = path.join(PROJECT_ROOT, relativeDir);
      if (!fs.existsSync(fullDir)) return;
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        const relativePath = path.join(relativeDir, entry.name);
        if (entry.isDirectory()) {
          walk(relativePath);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
          continue;
        }
        const source = readProjectFile(relativePath);
        if (forbidden.some((marker) => source.includes(marker))) {
          hits.push(relativePath.replace(/\\/g, "/"));
        }
      }
    };

    roots.forEach(walk);
    expect(hits).toEqual([]);
  });

  it("does not change package/native/SQL/RPC/RLS/storage files and keeps artifacts valid JSON", () => {
    expect(changedFiles()).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^(package\.json|package-lock\.json|app\.json|eas\.json)$/),
        expect.stringMatching(/^(android\/|ios\/|supabase\/migrations\/)/),
      ]),
    );

    const matrix = JSON.parse(readProjectFile("artifacts/S_50K_BFF_STAGING_DEPLOY_1_matrix.json"));
    expect(matrix.wave).toBe("S-50K-BFF-STAGING-DEPLOY-1");
    expect(matrix.status).toBe("BLOCKED_BFF_DEPLOY_TARGET_MISSING");
    expect(matrix.repoStatus).toBe("repo_ready_disabled");
    expect(matrix.stagingLive).toBe("missing");
    expect(matrix.serverBoundary.readRoutes).toBe(5);
    expect(matrix.serverBoundary.mutationRoutes).toBe(5);
    expect(matrix.safety.appRuntimeBffEnabled).toBe(false);
    expect(matrix.safety.packageNativeChanged).toBe(false);
  });
});
