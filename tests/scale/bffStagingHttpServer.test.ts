import http from "http";

import {
  createBffStagingHttpServer,
  resolveBffStagingHttpConfig,
} from "../../scripts/server/stagingBffHttpServer";
import {
  BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS,
  BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
  BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  RedisUrlCacheAdapter,
  type RedisCommand,
  type RedisCommandExecutor,
} from "../../src/shared/scale/cacheAdapters";
import {
  createCacheShadowMonitor,
  resolveCacheShadowRuntimeConfig,
} from "../../src/shared/scale/cacheShadowRuntime";
import type { BffReadPorts } from "../../src/shared/scale/bffReadPorts";
import {
  createRateLimitShadowMonitor,
  InMemoryRateLimitAdapter,
  RuntimeRateEnforcementProvider,
} from "../../src/shared/scale/rateLimitAdapters";

const listen = (server: http.Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address === "object" && address) resolve(address.port);
    });
  });

const close = (server: http.Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const requestJson = async (
  port: number,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; authorization?: string } = {},
): Promise<{ status: number; body: unknown; headers: Headers }> => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.authorization ? { authorization: init.authorization } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
};

const createReadPorts = (): BffReadPorts => ({
  requestProposal: {
    async listRequestProposals() {
      return [{ id: "proposal-redacted", submitted_at: "present_redacted" }];
    },
  },
  marketplaceCatalog: {
    async searchCatalog() {
      return [{ id: "catalog-redacted", title: "present_redacted" }];
    },
  },
  warehouseLedger: {
    async listWarehouseLedger() {
      return [{ code: "warehouse-redacted", qty: "present_redacted" }];
    },
  },
  accountantInvoice: {
    async listAccountantInvoices() {
      return [{ proposal_id: "invoice-redacted", status: "present_redacted" }];
    },
  },
  directorPending: {
    async listDirectorPending() {
      return [{ request_item_id: "pending-redacted", status: "present_redacted" }];
    },
  },
});

const createRedisCacheAdapterFixture = () => {
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
  });
};

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
};

describe("staging BFF HTTP server wrapper", () => {
  it("resolves Render-safe defaults without enabling mutation routes", () => {
    expect(resolveBffStagingHttpConfig({})).toEqual({
      port: 3000,
      serverAuthSecretConfigured: false,
      mobileReadonlyAuthEnabled: false,
      mobileReadonlyAuthConfigured: false,
      mutationRoutesEnabled: false,
      mutationRoutesGlobalGateEnabled: false,
      mutationRouteScope: expect.objectContaining({
        status: "disabled",
        enabledOperationCount: 0,
        valuesPrinted: false,
        secretsPrinted: false,
      }),
      idempotencyMetadataRequired: true,
      rateLimitMetadataRequired: true,
    });
    expect(
      resolveBffStagingHttpConfig({
        PORT: "10000",
        BFF_SERVER_AUTH_SECRET: "secret",
        BFF_MUTATION_ENABLED: "true",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "false",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
      }),
    ).toEqual(
      expect.objectContaining({
        port: 10000,
        serverAuthSecretConfigured: true,
        mobileReadonlyAuthEnabled: false,
        mobileReadonlyAuthConfigured: false,
        mutationRoutesGlobalGateEnabled: false,
        mutationRoutesEnabled: false,
      }),
    );
  });

  it("requires a catalog route allowlist before enabling mutation routes", () => {
    expect(
      resolveBffStagingHttpConfig({
        BFF_MUTATION_ENABLED: "true",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
      }),
    ).toEqual(
      expect.objectContaining({
        mutationRoutesGlobalGateEnabled: true,
        mutationRoutesEnabled: false,
        mutationRouteScope: expect.objectContaining({
          status: "disabled",
          enabledOperationCount: 0,
        }),
      }),
    );

    expect(
      resolveBffStagingHttpConfig({
        BFF_MUTATION_ENABLED: "true",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
        [BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME]: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_KEYS.join(","),
      }),
    ).toEqual(
      expect.objectContaining({
        mutationRoutesGlobalGateEnabled: true,
        mutationRoutesEnabled: true,
        mutationRouteScope: expect.objectContaining({
          status: "enabled",
          enabledOperations: BFF_CATALOG_REQUEST_MUTATION_ROUTE_SCOPE_OPERATIONS,
          enabledOperationCount: 3,
          valuesPrinted: false,
          secretsPrinted: false,
        }),
      }),
    );

    expect(
      resolveBffStagingHttpConfig({
        BFF_MUTATION_ENABLED: "true",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
        [BFF_MUTATION_ROUTE_ALLOWLIST_ENV_NAME]: "all",
      }),
    ).toEqual(
      expect.objectContaining({
        mutationRoutesGlobalGateEnabled: true,
        mutationRoutesEnabled: false,
        mutationRouteScope: expect.objectContaining({
          status: "invalid",
          enabledOperationCount: 0,
          wildcardRejected: true,
        }),
      }),
    );
  });

  it("keeps readonly mobile auth disabled unless the explicit staging server env is configured", () => {
    expect(
      resolveBffStagingHttpConfig({
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      }),
    ).toEqual(
      expect.objectContaining({
        mobileReadonlyAuthEnabled: true,
        mobileReadonlyAuthConfigured: false,
      }),
    );

    expect(
      resolveBffStagingHttpConfig({
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
        STAGING_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual(
      expect.objectContaining({
        mobileReadonlyAuthEnabled: true,
        mobileReadonlyAuthConfigured: true,
        mutationRoutesEnabled: false,
      }),
    );
  });

  it("serves health and readiness without requiring a secret for Render checks", async () => {
    const server = createBffStagingHttpServer({});
    const port = await listen(server);

    try {
      const health = await requestJson(port, "/health");
      expect(health.status).toBe(200);
      expect(health.headers.get("cache-control")).toBe("no-store");
      expect(health.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({ status: "ok", productionTouched: false }),
        }),
      );

      const ready = await requestJson(port, "/ready");
      expect(ready.status).toBe(200);
      expect(ready.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            mutationRoutesEnabledByDefault: false,
            appRuntimeBffEnabled: false,
          }),
        }),
      );
    } finally {
      await close(server);
    }
  });

  it("requires server auth for API routes and does not log or return raw credentials", async () => {
    const server = createBffStagingHttpServer({ BFF_SERVER_AUTH_SECRET: "server-secret" });
    const port = await listen(server);

    try {
      const unauthorized = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        body: { input: { pageSize: 25 } },
      });
      expect(unauthorized.status).toBe(401);
      expect(JSON.stringify(unauthorized.body)).not.toContain("server-secret");

      const noPorts = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: { input: { pageSize: 25 } },
      });
      expect(noPorts.status).toBe(503);
      expect(noPorts.body).toEqual({
        ok: false,
        error: {
          code: "BFF_READ_PORTS_UNAVAILABLE",
          message: "Read ports are not configured",
        },
      });
    } finally {
      await close(server);
    }
  });

  it("does not accept mobile bearer tokens while readonly mobile auth is disabled", async () => {
    const mobileReadonlyAuthVerifier = jest.fn(async () => true);
    const server = createBffStagingHttpServer(
      {
        BFF_SERVER_AUTH_SECRET: "server-secret",
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "false",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
        STAGING_SUPABASE_ANON_KEY: "anon-key",
      },
      { mobileReadonlyAuthVerifier },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer mobile-access-token",
        body: { input: { pageSize: 25 } },
      });

      expect(response.status).toBe(401);
      expect(JSON.stringify(response.body)).not.toContain("mobile-access-token");
      expect(JSON.stringify(response.body)).not.toContain("server-secret");
      expect(mobileReadonlyAuthVerifier).not.toHaveBeenCalled();
    } finally {
      await close(server);
    }
  });

  it("accepts verified staging mobile auth only for readonly routes", async () => {
    const readPorts = createReadPorts();
    const mobileReadonlyAuthVerifier = jest.fn(async (token: string) => token === "mobile-access-token");
    const server = createBffStagingHttpServer(
      {
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
        STAGING_SUPABASE_ANON_KEY: "anon-key",
        BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
      },
      {
        readPortsFactory: () => readPorts,
        mobileReadonlyAuthVerifier,
      },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer mobile-access-token",
        body: { input: { page: 0, pageSize: 5 } },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: [{ id: "proposal-redacted", submitted_at: "present_redacted" }],
          metadata: expect.objectContaining({
            operation: "request.proposal.list",
            readOnly: true,
            enabledInAppRuntime: false,
          }),
        }),
      );
      expect(mobileReadonlyAuthVerifier).toHaveBeenCalledWith(
        "mobile-access-token",
        expect.objectContaining({
          BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        }),
      );
      const output = JSON.stringify(response.body);
      expect(output).not.toContain("mobile-access-token");
      expect(output).not.toContain("anon-key");
      expect(output).not.toContain("postgres://");
    } finally {
      await close(server);
    }
  });

  it("rejects invalid mobile auth without leaking the bearer token", async () => {
    const mobileReadonlyAuthVerifier = jest.fn(async () => false);
    const server = createBffStagingHttpServer(
      {
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
        STAGING_SUPABASE_ANON_KEY: "anon-key",
      },
      { mobileReadonlyAuthVerifier },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer invalid-mobile-access-token",
        body: { input: { pageSize: 25 } },
      });

      expect(response.status).toBe(401);
      expect(JSON.stringify(response.body)).not.toContain("invalid-mobile-access-token");
      expect(mobileReadonlyAuthVerifier).toHaveBeenCalledWith(
        "invalid-mobile-access-token",
        expect.objectContaining({
          BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        }),
      );
    } finally {
      await close(server);
    }
  });

  it("does not use mobile auth for mutation routes", async () => {
    const mobileReadonlyAuthVerifier = jest.fn(async () => true);
    const server = createBffStagingHttpServer(
      {
        BFF_READONLY_MOBILE_AUTH_STAGING_ENABLED: "true",
        STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
        STAGING_SUPABASE_ANON_KEY: "anon-key",
      },
      { mobileReadonlyAuthVerifier },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/mutation/proposal-submit", {
        method: "POST",
        authorization: "Bearer mobile-access-token",
        body: {
          input: {
            idempotencyKey: "opaque-key",
            payload: { token: "secret-token-value" },
          },
        },
      });

      expect(response.status).toBe(401);
      expect(JSON.stringify(response.body)).not.toContain("mobile-access-token");
      expect(JSON.stringify(response.body)).not.toContain("secret-token-value");
      expect(mobileReadonlyAuthVerifier).not.toHaveBeenCalled();
    } finally {
      await close(server);
    }
  });

  it("wires read ports when the readonly database URL is configured", async () => {
    const readPorts = createReadPorts();
    const readPortsFactory = jest.fn(() => readPorts);
    const server = createBffStagingHttpServer(
      {
        BFF_SERVER_AUTH_SECRET: "server-secret",
        BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
      },
      { readPortsFactory },
    );
    const port = await listen(server);

    try {
      const ready = await requestJson(port, "/ready");
      expect(ready.status).toBe(200);
      expect(ready.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            readPortsConfigured: true,
            mutationRoutesEnabled: false,
            appRuntimeBffEnabled: false,
          }),
        }),
      );

      const response = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: { input: { page: 0, pageSize: 5 } },
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: [{ id: "proposal-redacted", submitted_at: "present_redacted" }],
          metadata: expect.objectContaining({
            operation: "request.proposal.list",
            readOnly: true,
            enabledInAppRuntime: false,
          }),
        }),
      );
      expect(JSON.stringify(response.body)).not.toContain("server-secret");
      expect(JSON.stringify(response.body)).not.toContain("postgres://");
      expect(readPortsFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          BFF_DATABASE_READONLY_URL: expect.any(String),
        }),
      );
    } finally {
      await close(server);
    }
  });

  it("exposes observe-only rate-limit shadow monitor state only through server-authenticated redacted aggregate data", async () => {
    const readPorts = createReadPorts();
    const monitor = createRateLimitShadowMonitor();
    const provider = new RuntimeRateEnforcementProvider({
      mode: "observe_only",
      runtimeEnvironment: "staging",
      adapter: new InMemoryRateLimitAdapter({ now: () => 120_000 }),
      namespace: "rik-staging",
    });
    const server = createBffStagingHttpServer(
      {
        BFF_SERVER_AUTH_SECRET: "server-secret",
        BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
      },
      {
        readPortsFactory: () => readPorts,
        rateLimitShadow: { provider, monitor },
      },
    );
    const port = await listen(server);

    try {
      const unauthorized = await requestJson(port, "/api/staging-bff/monitor/rate-limit-shadow");
      expect(unauthorized.status).toBe(401);
      expect(JSON.stringify(unauthorized.body)).not.toContain("server-secret");

      const readResponse = await requestJson(port, "/api/staging-bff/read/marketplace-catalog-search", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: {
          input: { query: "cement" },
          metadata: {
            rateLimitKeyStatus: "present_redacted",
            rateLimitIpOrDeviceKey: "rl-subject-a",
          },
        },
      });
      expect(readResponse.status).toBe(200);
      await waitFor(() => monitor.snapshot().observedDecisionCount === 1);

      const monitorResponse = await requestJson(port, "/api/staging-bff/monitor/rate-limit-shadow", {
        authorization: "Bearer server-secret",
      });
      expect(monitorResponse.status).toBe(200);
      expect(monitorResponse.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            wouldAllowCount: 1,
            wouldThrottleCount: 0,
            keyCardinalityRedacted: 1,
            rawKeysStored: false,
            rawKeysPrinted: false,
            realUsersBlocked: false,
          }),
        }),
      );

      const output = JSON.stringify({ readResponse, monitorResponse });
      expect(output).not.toContain("rl-subject-a");
      expect(output).not.toContain("server-secret");
      expect(output).not.toContain("postgres://");
    } finally {
      await close(server);
    }
  });

  it("exposes private rate-limit smoke only through server-authenticated synthetic diagnostics", async () => {
    const runner = {
      run: jest.fn(async () => ({
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
    const server = createBffStagingHttpServer(
      { BFF_SERVER_AUTH_SECRET: "server-secret" },
      { rateLimitPrivateSmoke: runner },
    );
    const port = await listen(server);

    try {
      const unauthorized = await requestJson(port, "/api/staging-bff/diagnostics/rate-limit-private-smoke", {
        method: "POST",
      });
      expect(unauthorized.status).toBe(401);
      expect(JSON.stringify(unauthorized.body)).not.toContain("server-secret");

      const response = await requestJson(port, "/api/staging-bff/diagnostics/rate-limit-private-smoke", {
        method: "POST",
        authorization: "Bearer server-secret",
      });
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            syntheticIdentityUsed: true,
            realUserIdentityUsed: false,
            wouldAllowVerified: true,
            wouldThrottleVerified: true,
            enforcementEnabled: false,
            productionUserBlocked: false,
            rawKeyReturned: false,
          }),
        }),
      );
      expect(runner.run).toHaveBeenCalledTimes(1);
      const output = JSON.stringify(response.body);
      expect(output).not.toContain("server-secret");
      expect(output).not.toContain("rate:v1:");
      expect(output).not.toContain("synthetic-rate-smoke");
    } finally {
      await close(server);
    }
  });

  it("exposes cache shadow canary and monitor only through server-authenticated diagnostics", async () => {
    const monitor = createCacheShadowMonitor();
    const server = createBffStagingHttpServer(
      { BFF_SERVER_AUTH_SECRET: "server-secret" },
      {
        cacheShadow: {
          adapter: createRedisCacheAdapterFixture(),
          config: resolveCacheShadowRuntimeConfig({
            SCALE_REDIS_CACHE_PRODUCTION_SHADOW_ENABLED: "true",
            SCALE_REDIS_CACHE_SHADOW_MODE: "shadow_readonly",
            SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST: "marketplace.catalog.search",
            SCALE_REDIS_CACHE_SHADOW_PERCENT: "100",
          }),
          monitor,
        },
      },
    );
    const port = await listen(server);

    try {
      const unauthorized = await requestJson(port, "/api/staging-bff/diagnostics/cache-shadow-canary", {
        method: "POST",
      });
      expect(unauthorized.status).toBe(401);
      expect(JSON.stringify(unauthorized.body)).not.toContain("server-secret");

      const canary = await requestJson(port, "/api/staging-bff/diagnostics/cache-shadow-canary", {
        method: "POST",
        authorization: "Bearer server-secret",
      });
      expect(canary.status).toBe(200);
      expect(canary.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            status: "ready",
            syntheticIdentityUsed: true,
            realUserPayloadUsed: false,
            cacheHitVerified: true,
            responseChanged: false,
            cacheWriteSyntheticOnly: true,
            cleanupOk: true,
            commandProbeAttempted: true,
            commandProbeStatus: "ready",
            commandSetOk: true,
            commandGetOk: true,
            commandValueMatched: true,
            commandDeleteOk: true,
            rawKeyReturned: false,
          }),
        }),
      );

      const monitorResponse = await requestJson(port, "/api/staging-bff/monitor/cache-shadow", {
        authorization: "Bearer server-secret",
      });
      expect(monitorResponse.status).toBe(200);
      expect(monitorResponse.body).toEqual(
        expect.objectContaining({
          ok: true,
          data: expect.objectContaining({
            observedDecisionCount: 1,
            shadowReadAttemptedCount: 1,
            hitCount: 1,
            responseChanged: false,
            realUserPayloadStored: false,
            rawKeysStored: false,
            rawPayloadLogged: false,
          }),
        }),
      );
      const output = JSON.stringify({ canary, monitorResponse });
      expect(output).not.toContain("server-secret");
      expect(output).not.toContain("cache:v1:");
    } finally {
      await close(server);
    }
  });

  it("redacts read port failures when readonly ports are wired", async () => {
    const server = createBffStagingHttpServer(
      {
        BFF_SERVER_AUTH_SECRET: "server-secret",
        BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
      },
      {
        readPortsFactory: () => ({
          ...createReadPorts(),
          requestProposal: {
            async listRequestProposals() {
              throw new Error("database failure token=unsafe-value user@example.test postgres://leak");
            },
          },
        }),
      },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/read/request-proposal-list", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: { input: { page: 0, pageSize: 5 } },
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          ok: false,
          error: {
            code: "BFF_REQUEST_PROPOSAL_LIST_ERROR",
            message: "Unable to load list",
          },
        }),
      );
      const output = JSON.stringify(response.body);
      expect(output).not.toContain("unsafe-value");
      expect(output).not.toContain("user@example.test");
      expect(output).not.toContain("postgres://");
    } finally {
      await close(server);
    }
  });

  it("keeps mutation routes disabled unless all safety flags are explicitly enabled", async () => {
    const server = createBffStagingHttpServer({
      BFF_SERVER_AUTH_SECRET: "server-secret",
      BFF_MUTATION_ENABLED: "true",
      BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
      BFF_RATE_LIMIT_METADATA_ENABLED: "false",
    });
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/mutation/proposal-submit", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: {
          input: {
            idempotencyKey: "opaque-key",
            payload: { email: "person@example.test", token: "secret-token-value" },
          },
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        ok: false,
        error: {
          code: "BFF_MUTATION_ROUTES_DISABLED",
          message: "Mutation routes are disabled by default",
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("person@example.test");
      expect(JSON.stringify(response.body)).not.toContain("secret-token-value");
    } finally {
      await close(server);
    }
  });

  it("keeps mutation routes disabled even when read ports are wired", async () => {
    const server = createBffStagingHttpServer(
      {
        BFF_SERVER_AUTH_SECRET: "server-secret",
        BFF_DATABASE_READONLY_URL: "postgres://readonly:secret@example.invalid/db",
        BFF_MUTATION_ENABLED: "false",
        BFF_IDEMPOTENCY_METADATA_ENABLED: "true",
        BFF_RATE_LIMIT_METADATA_ENABLED: "true",
      },
      { readPortsFactory: () => createReadPorts() },
    );
    const port = await listen(server);

    try {
      const response = await requestJson(port, "/api/staging-bff/mutation/proposal-submit", {
        method: "POST",
        authorization: "Bearer server-secret",
        body: {
          input: {
            idempotencyKey: "opaque-key",
            payload: { token: "secret-token-value" },
          },
          metadata: {
            idempotencyKeyStatus: "present_redacted",
            rateLimitKeyStatus: "present_redacted",
          },
        },
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        ok: false,
        error: {
          code: "BFF_MUTATION_ROUTES_DISABLED",
          message: "Mutation routes are disabled by default",
        },
      });
      expect(JSON.stringify(response.body)).not.toContain("secret-token-value");
    } finally {
      await close(server);
    }
  });
});
