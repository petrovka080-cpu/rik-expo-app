import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

import { isBffEnabled } from "../../src/shared/scale/bffSafety";
import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import {
  BFF_STAGING_MUTATION_ROUTES,
  BFF_STAGING_READ_ROUTES,
  BFF_STAGING_ROUTE_REGISTRY,
  BFF_STAGING_SERVER_BOUNDARY_CONTRACT,
  buildBffStagingDeploymentReadiness,
  handleBffStagingServerRequest,
  isBffStagingResponseEnvelope,
  parseBffStagingRequestPayload,
  runLocalBffStagingBoundaryShadow,
} from "../../scripts/server/stagingBffServerBoundary";

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
