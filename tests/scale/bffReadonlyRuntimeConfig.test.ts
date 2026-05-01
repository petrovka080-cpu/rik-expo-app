import fs from "node:fs";
import path from "node:path";

import {
  BFF_READONLY_RUNTIME_ENV_NAMES,
  buildBffRequestPlan,
  resolveBffReadonlyRuntimeConfig,
} from "../../src/shared/scale/bffClient";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

describe("BFF readonly runtime config", () => {
  it("documents the exact staging mobile env names", () => {
    expect(BFF_READONLY_RUNTIME_ENV_NAMES).toEqual({
      enabled: "EXPO_PUBLIC_BFF_READONLY_STAGING_ENABLED",
      trafficPercent: "EXPO_PUBLIC_BFF_READONLY_STAGING_TRAFFIC_PERCENT",
      baseUrl: "EXPO_PUBLIC_BFF_STAGING_BASE_URL",
      shadowOnly: "EXPO_PUBLIC_BFF_SHADOW_ONLY_ENABLED",
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
  });
});
