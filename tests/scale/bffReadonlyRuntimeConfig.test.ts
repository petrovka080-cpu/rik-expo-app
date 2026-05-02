import fs from "node:fs";
import path from "node:path";

import {
  BFF_FORBIDDEN_PRODUCTION_BASE_URLS,
  BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES,
  BFF_READONLY_RUNTIME_ENV_NAMES,
  BFF_READONLY_RUNTIME_ENV_NAMES_BY_ENVIRONMENT,
  BFF_READONLY_STAGING_RUNTIME_ENV_NAMES,
  BFF_READONLY_MOBILE_ROUTE_PATHS,
  buildBffRequestPlan,
  callBffReadonlyMobile,
  resolveBffReadonlyRuntimeConfig,
} from "../../src/shared/scale/bffClient";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("BFF readonly runtime config", () => {
  it("documents the exact staging mobile env names", () => {
    expect(BFF_READONLY_STAGING_RUNTIME_ENV_NAMES).toEqual({
      enabled: "EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED",
      trafficPercent: "EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT",
      baseUrl: "EXPO_PUBLIC_BFF_STAGING_BASE_URL",
      shadowOnly: "EXPO_PUBLIC_BFF_SHADOW_ONLY_ENABLED",
    });
    expect(BFF_READONLY_RUNTIME_ENV_NAMES).toBe(BFF_READONLY_STAGING_RUNTIME_ENV_NAMES);
    expect(BFF_READONLY_MOBILE_ROUTE_PATHS).toEqual({
      "request.proposal.list": "/api/staging-bff/read/request-proposal-list",
      "marketplace.catalog.search": "/api/staging-bff/read/marketplace-catalog-search",
      "warehouse.ledger.list": "/api/staging-bff/read/warehouse-ledger-list",
      "accountant.invoice.list": "/api/staging-bff/read/accountant-invoice-list",
      "director.pending.list": "/api/staging-bff/read/director-pending-list",
    });
  });

  it("documents production runtime env names without enabling production by default", () => {
    expect(BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES).toEqual({
      enabled: "EXPO_PUBLIC_BFF_READONLY_PRODUCTION_ENABLED",
      trafficPercent: "EXPO_PUBLIC_BFF_READONLY_PRODUCTION_TRAFFIC_PERCENT",
      baseUrl: "EXPO_PUBLIC_BFF_PRODUCTION_BASE_URL",
      shadowOnly: "EXPO_PUBLIC_BFF_PRODUCTION_SHADOW_ONLY_ENABLED",
    });
    expect(BFF_READONLY_RUNTIME_ENV_NAMES_BY_ENVIRONMENT).toEqual({
      staging: BFF_READONLY_STAGING_RUNTIME_ENV_NAMES,
      production: BFF_READONLY_PRODUCTION_RUNTIME_ENV_NAMES,
    });
    expect(BFF_FORBIDDEN_PRODUCTION_BASE_URLS).toContain("https://gox-build-staging-bff.onrender.com");

    expect(resolveBffReadonlyRuntimeConfig({}, { runtimeEnvironment: "production" })).toEqual({
      clientConfig: {
        enabled: false,
        baseUrl: null,
        readOnly: true,
        runtimeEnvironment: "production",
        trafficPercent: 0,
        shadowOnly: true,
        mutationRoutesEnabled: false,
        productionGuard: false,
      },
      trafficPercent: 0,
      mobileRuntimeBffEnabled: false,
      shadowOnlySupported: true,
      shadowOnly: true,
      networkExecutionAllowed: false,
      envStatus: {
        enabledFlag: "missing",
        baseUrl: "missing",
        trafficPercent: "missing",
        shadowOnly: "missing",
        runtimeEnvironment: "production",
      },
    });
  });

  it("stays disabled and shadow-only when env is missing", () => {
    expect(resolveBffReadonlyRuntimeConfig({})).toEqual({
      clientConfig: {
        enabled: false,
        baseUrl: null,
        readOnly: true,
        runtimeEnvironment: "unknown",
        trafficPercent: 0,
        shadowOnly: true,
        mutationRoutesEnabled: false,
        productionGuard: true,
      },
      trafficPercent: 0,
      mobileRuntimeBffEnabled: false,
      shadowOnlySupported: true,
      shadowOnly: true,
      networkExecutionAllowed: false,
      envStatus: {
        enabledFlag: "missing",
        baseUrl: "missing",
        trafficPercent: "missing",
        shadowOnly: "missing",
        runtimeEnvironment: "unknown",
      },
    });
  });

  it("requires both the explicit flag and a valid HTTPS base URL", () => {
    expect(
      resolveBffReadonlyRuntimeConfig({
        EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED: "true",
      }),
    ).toEqual(
      expect.objectContaining({
        clientConfig: expect.objectContaining({ enabled: true, baseUrl: null }),
        mobileRuntimeBffEnabled: false,
        networkExecutionAllowed: false,
      }),
    );

    expect(
      resolveBffReadonlyRuntimeConfig({
        EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED: "true",
        EXPO_PUBLIC_BFF_STAGING_BASE_URL: "http://gox-build-staging-bff.onrender.com",
        EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT: "1",
      }),
    ).toEqual(
      expect.objectContaining({
        clientConfig: expect.objectContaining({ enabled: true, baseUrl: null }),
        mobileRuntimeBffEnabled: false,
        networkExecutionAllowed: false,
        envStatus: expect.objectContaining({ baseUrl: "present_invalid" }),
      }),
    );

    expect(
      resolveBffReadonlyRuntimeConfig(
        {
          EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED: "true",
          EXPO_PUBLIC_BFF_STAGING_BASE_URL: "https://gox-build-staging-bff.onrender.com/path",
        },
        { runtimeEnvironment: "staging" },
      ),
    ).toEqual(
      expect.objectContaining({
        clientConfig: expect.objectContaining({
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com",
          runtimeEnvironment: "staging",
        }),
        mobileRuntimeBffEnabled: true,
        shadowOnly: true,
        networkExecutionAllowed: false,
      }),
    );
  });

  it("keeps traffic at 0 by default while allowing the next staging-only read plan to be eligible", () => {
    expect(
      resolveBffReadonlyRuntimeConfig(
        {
          EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED: "1",
          EXPO_PUBLIC_BFF_STAGING_BASE_URL: "https://gox-build-staging-bff.onrender.com",
          EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT: "0",
        },
        { runtimeEnvironment: "staging" },
      ),
    ).toEqual(
      expect.objectContaining({
        trafficPercent: 0,
        mobileRuntimeBffEnabled: true,
        shadowOnly: true,
        networkExecutionAllowed: false,
      }),
    );

    expect(
      buildBffRequestPlan(
        {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com",
          readOnly: true,
          runtimeEnvironment: "staging",
          trafficPercent: 1,
          mutationRoutesEnabled: false,
          productionGuard: true,
        },
        "proposal.list",
      ),
    ).toEqual(
      expect.objectContaining({
        enabled: true,
        baseUrlConfigured: true,
        networkExecutionAllowed: true,
      }),
    );
  });

  it("keeps production and mutation-enabled plans fail-safe", () => {
    const baseConfig = {
      enabled: true,
      baseUrl: "https://gox-build-staging-bff.onrender.com",
      readOnly: true,
      trafficPercent: 1,
      productionGuard: true,
    };

    expect(buildBffRequestPlan({ ...baseConfig, runtimeEnvironment: "production" }, "proposal.list")).toEqual(
      expect.objectContaining({ networkExecutionAllowed: false }),
    );
    expect(
      buildBffRequestPlan(
        { ...baseConfig, runtimeEnvironment: "staging", mutationRoutesEnabled: true },
        "proposal.list",
      ),
    ).toEqual(expect.objectContaining({ networkExecutionAllowed: false }));
  });

  it("uses production-specific flags only with a dedicated non-staging HTTPS base URL", () => {
    const productionRuntime = resolveBffReadonlyRuntimeConfig(
      {
        EXPO_PUBLIC_BFF_READONLY_PRODUCTION_ENABLED: "true",
        EXPO_PUBLIC_BFF_READONLY_PRODUCTION_TRAFFIC_PERCENT: "1",
        EXPO_PUBLIC_BFF_PRODUCTION_BASE_URL: "https://production-bff.example.invalid/path",
        EXPO_PUBLIC_BFF_PRODUCTION_SHADOW_ONLY_ENABLED: "false",
        EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED: "false",
        EXPO_PUBLIC_BFF_STAGING_BASE_URL: "https://gox-build-staging-bff.onrender.com",
      },
      { runtimeEnvironment: "production" },
    );

    expect(productionRuntime).toEqual(
      expect.objectContaining({
        trafficPercent: 1,
        mobileRuntimeBffEnabled: true,
        shadowOnly: false,
        networkExecutionAllowed: true,
        envStatus: expect.objectContaining({
          enabledFlag: "enabled",
          baseUrl: "present_valid",
          trafficPercent: "present_valid",
          shadowOnly: "disabled",
          runtimeEnvironment: "production",
        }),
      }),
    );
    expect(productionRuntime.clientConfig).toEqual(
      expect.objectContaining({
        baseUrl: "https://production-bff.example.invalid",
        productionGuard: false,
        runtimeEnvironment: "production",
      }),
    );
  });

  it("blocks production runtime when the production base URL points at staging", () => {
    const productionRuntime = resolveBffReadonlyRuntimeConfig(
      {
        EXPO_PUBLIC_BFF_READONLY_PRODUCTION_ENABLED: "true",
        EXPO_PUBLIC_BFF_READONLY_PRODUCTION_TRAFFIC_PERCENT: "1",
        EXPO_PUBLIC_BFF_PRODUCTION_BASE_URL: "https://gox-build-staging-bff.onrender.com",
        EXPO_PUBLIC_BFF_PRODUCTION_SHADOW_ONLY_ENABLED: "false",
      },
      { runtimeEnvironment: "production" },
    );

    expect(productionRuntime.clientConfig).toEqual(
      expect.objectContaining({
        enabled: true,
        baseUrl: "https://gox-build-staging-bff.onrender.com",
        runtimeEnvironment: "production",
      }),
    );
    expect(productionRuntime.mobileRuntimeBffEnabled).toBe(true);
    expect(productionRuntime.networkExecutionAllowed).toBe(false);
    expect(
      buildBffRequestPlan(
        {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com",
          readOnly: true,
          runtimeEnvironment: "production",
          trafficPercent: 1,
          shadowOnly: false,
          mutationRoutesEnabled: false,
          productionGuard: false,
        },
        "proposal.list",
      ),
    ).toEqual(expect.objectContaining({ networkExecutionAllowed: false }));
  });

  it("keeps mobile Supabase JWT calls contract-only until staging traffic is approved", async () => {
    const getAccessToken = jest.fn(async () => "mobile-session-token");
    const fetchImpl = jest.fn();

    await expect(
      callBffReadonlyMobile({
        config: {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com",
          readOnly: true,
          runtimeEnvironment: "staging",
          trafficPercent: 0,
          mutationRoutesEnabled: false,
          productionGuard: true,
        },
        operation: "request.proposal.list",
        getAccessToken,
        fetchImpl,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "BFF_CONTRACT_ONLY",
        message: "Server API boundary contract exists but traffic migration is disabled",
      },
    });

    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends a Supabase user JWT only for approved staging readonly calls", async () => {
    const getAccessToken = jest.fn(async () => "mobile-session-token");
    const fetchImpl = jest.fn(async () => ({
      json: async () => ({
        ok: true,
        data: [{ id: "redacted-row" }],
        metadata: { readOnly: true },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    await expect(
      callBffReadonlyMobile({
        config: {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com/ignored-path",
          readOnly: true,
          runtimeEnvironment: "staging",
          trafficPercent: 1,
          mutationRoutesEnabled: false,
          productionGuard: true,
        },
        operation: "warehouse.ledger.list",
        input: { page: 0, pageSize: 5 },
        getAccessToken,
        fetchImpl,
      }),
    ).resolves.toEqual({
      ok: true,
      data: [{ id: "redacted-row" }],
      metadata: { readOnly: true },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://gox-build-staging-bff.onrender.com/api/staging-bff/read/warehouse-ledger-list",
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer mobile-session-token",
          "content-type": "application/json",
        }),
        body: JSON.stringify({
          input: { page: 0, pageSize: 5 },
          metadata: {
            mobileAuth: "supabase_user_jwt_present_redacted",
          },
        }),
      }),
    );
  });

  it("fails closed without a mobile session token and redacts returned BFF errors", async () => {
    const missingTokenFetch = jest.fn();
    await expect(
      callBffReadonlyMobile({
        config: {
          enabled: true,
          baseUrl: "https://gox-build-staging-bff.onrender.com",
          readOnly: true,
          runtimeEnvironment: "staging",
          trafficPercent: 1,
          mutationRoutesEnabled: false,
          productionGuard: true,
        },
        operation: "accountant.invoice.list",
        getAccessToken: async () => "",
        fetchImpl: missingTokenFetch,
      }),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "BFF_MOBILE_AUTH_SESSION_REQUIRED",
        message: "Mobile auth session is required for read-only BFF access",
      },
    });
    expect(missingTokenFetch).not.toHaveBeenCalled();

    const leakyFetch = jest.fn(async () => ({
      json: async () => ({
        ok: false,
        error: {
          code: "leaky error",
          message: "failed for Bearer mobile-session-token and token=unsafe",
        },
      }),
    })) as unknown as jest.MockedFunction<typeof fetch>;

    const response = await callBffReadonlyMobile({
      config: {
        enabled: true,
        baseUrl: "https://gox-build-staging-bff.onrender.com",
        readOnly: true,
        runtimeEnvironment: "staging",
        trafficPercent: 1,
        mutationRoutesEnabled: false,
        productionGuard: true,
      },
      operation: "director.pending.list",
      getAccessToken: async () => "mobile-session-token",
      fetchImpl: leakyFetch,
    });

    expect(JSON.stringify(response)).not.toContain("mobile-session-token");
    expect(JSON.stringify(response)).not.toContain("unsafe");
    expect(response).toEqual({
      ok: false,
      error: {
        code: "LEAKY_ERROR",
        message: "failed for Bearer [redacted] and [redacted]",
      },
    });
  });

  it("clamps invalid traffic values fail-safe", () => {
    expect(
      resolveBffReadonlyRuntimeConfig({
        EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT: "not-a-number",
      }),
    ).toEqual(
      expect.objectContaining({
        trafficPercent: 0,
        shadowOnly: true,
        envStatus: expect.objectContaining({ trafficPercent: "present_invalid" }),
      }),
    );

    expect(
      resolveBffReadonlyRuntimeConfig({
        EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT: "250",
      }).trafficPercent,
    ).toBe(100);
  });

  it("does not read server-only BFF credentials from the mobile runtime adapter", () => {
    const source = readProjectFile("src/shared/scale/bffClient.ts");
    const httpServerSource = readProjectFile("scripts/server/stagingBffHttpServer.ts");

    expect(httpServerSource).toContain("BFF_SERVER_AUTH_SECRET");
    expect(source).not.toContain("BFF_SERVER_AUTH_SECRET");
    expect(source).not.toContain("BFF_DATABASE_READONLY_URL");
    expect(source).not.toContain("RENDER_DEPLOY_HOOK_URL");
    expect(source).not.toContain("EXPO_PUBLIC_BFF_SERVER_AUTH_SECRET");
  });
});
