import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { isBffEnabled } from "../../src/shared/scale/bffSafety";
import {
  BFF_SHADOW_MUTATION_PAYLOAD,
  createBffShadowFixturePorts,
} from "../../src/shared/scale/bffShadowFixtures";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_ROUTE_REGISTRY,
  BFF_STAGING_SERVER_BOUNDARY_CONTRACT,
  buildBffStagingRateLimitKeyInput,
  buildBffStagingDeploymentReadiness,
  handleBffStagingServerRequest,
  isBffStagingResponseEnvelope,
  parseBffStagingRequestPayload,
  runLocalBffStagingBoundaryShadow,
} from "../../scripts/server/stagingBffServerBoundary";
import {
  createRateLimitShadowMonitor,
  InMemoryRateLimitAdapter,
  RuntimeRateEnforcementProvider,
  type RateLimitPrivateSmokeResult,
} from "../../src/shared/scale/rateLimitAdapters";

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

const waitFor = async (predicate: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(predicate()).toBe(true);
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
            mutationRoutes: 5,
            mutationRoutesEnabledByDefault: false,
            appRuntimeBffEnabled: false,
          }),
        }),
      }),
    );
  });

  it("registers five read routes and five disabled mutation routes", () => {
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
    ]);
    expect(BFF_STAGING_MUTATION_ROUTES.every((route) => route.enabledByDefault === false)).toBe(true);
    expect(BFF_STAGING_SERVER_BOUNDARY_CONTRACT).toEqual(
      expect.objectContaining({
        healthEndpointContract: true,
        readinessEndpointContract: true,
        rateLimitShadowMonitorEndpointContract: true,
        readRoutes: 5,
        mutationRoutes: 5,
        mutationRoutesEnabledByDefault: false,
        requestEnvelopeValidation: true,
        responseEnvelopeValidation: true,
        redactedErrors: true,
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

  it("keeps mutation routes disabled by default and requires safety metadata when explicitly enabled", async () => {
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
        config: { mutationRoutesEnabled: true },
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
        config: { mutationRoutesEnabled: true },
      },
    );

    expect(enabled.status).toBe(200);
    expect(enabled.body.ok).toBe(true);
    expect(JSON.stringify(enabled)).not.toContain("person@example.test");
    expect(JSON.stringify(enabled)).not.toContain("not logged");
  });

  it("runs local fixture shadow through the staging boundary without network or traffic migration", async () => {
    const summary = await runLocalBffStagingBoundaryShadow();

    expect(summary).toEqual({
      status: "run",
      matches: 10,
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
