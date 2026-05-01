import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(
    readProjectFile("artifacts/S_BFF_RENDER_DEPLOY_CONFIG_1_matrix.json"),
  ) as {
    status: string;
    bffEntrypoint: {
      boundaryModule: string;
      httpWrapper: string;
      httpListenerPresent: boolean;
      healthEndpoint: { path: string; confirmed: boolean };
      readinessEndpoint: { path: string; confirmed: boolean };
    };
    renderConfig: {
      renderName: string;
      rootDirectory: string;
      rootDirectoryRequired: boolean;
      buildCommand: string;
      startCommand: string;
      healthCheckPath: string;
      readinessPath: string;
      instanceType: string;
      autoDeploy: string;
    };
    renderEnvVarNames: string[];
    envNotes: Record<string, boolean | string>;
    safety: Record<string, boolean>;
  };

describe("S-BFF-RENDER-DEPLOY-CONFIG-1", () => {
  it("records the real BFF HTTP wrapper and endpoint paths for Render", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("GREEN_RENDER_BFF_DEPLOY_CONFIG_READY");
    expect(matrix.bffEntrypoint).toEqual(
      expect.objectContaining({
        boundaryModule: "scripts/server/stagingBffServerBoundary.ts",
        httpWrapper: "scripts/server/stagingBffHttpServer.ts",
        httpListenerPresent: true,
      }),
    );
    expect(matrix.bffEntrypoint.healthEndpoint).toEqual({ method: "GET", path: "/health", confirmed: true });
    expect(matrix.bffEntrypoint.readinessEndpoint).toEqual({ method: "GET", path: "/ready", confirmed: true });
  });

  it("provides copy-paste-ready Render commands and avoids Expo entrypoint autofill", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_BFF_RENDER_DEPLOY_CONFIG_1_proof.md");

    expect(matrix.renderConfig.renderName).toBe("gox-build-staging-bff");
    expect(matrix.renderConfig.rootDirectory).toBe("");
    expect(matrix.renderConfig.rootDirectoryRequired).toBe(false);
    expect(matrix.renderConfig.buildCommand).toContain("npm ci --include=dev");
    expect(matrix.renderConfig.buildCommand).toContain("tests/scale/bffStagingHttpServer.test.ts");
    expect(matrix.renderConfig.startCommand).toBe("npx --no-install tsx scripts/server/stagingBffHttpServer.ts");
    expect(matrix.renderConfig.startCommand).not.toContain("expo-router/entry");
    expect(matrix.renderConfig.healthCheckPath).toBe("/health");
    expect(matrix.renderConfig.readinessPath).toBe("/ready");
    expect(matrix.renderConfig.instanceType).toBe("Starter");
    expect(matrix.renderConfig.autoDeploy).toBe("No");
    expect(proof).toContain("node expo-router/entry");
    expect(proof).toContain("npx --no-install tsx scripts/server/stagingBffHttpServer.ts");
  });

  it("lists only env names and keeps URL/secrets absent from artifacts", () => {
    const matrix = readMatrix();

    expect(matrix.renderEnvVarNames).toEqual([
      "NODE_ENV",
      "BFF_SERVER_AUTH_SECRET",
      "BFF_DATABASE_READONLY_URL",
      "BFF_MUTATION_ENABLED",
      "BFF_IDEMPOTENCY_METADATA_ENABLED",
      "BFF_RATE_LIMIT_METADATA_ENABLED",
      "STAGING_BFF_BASE_URL",
    ]);
    expect(matrix.envNotes).toEqual(
      expect.objectContaining({
        valuesPrinted: false,
        secretsPrinted: false,
        stagingBffBaseUrlInvented: false,
        portSetByRender: true,
      }),
    );
  });

  it("records no deploy, production, provider enablement, load, traffic, payload, or secret side effects", () => {
    const matrix = readMatrix();

    expect(matrix.safety).toEqual(
      expect.objectContaining({
        deployed: false,
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        stagingBffBaseUrlInvented: false,
        secretsPrinted: false,
        envValuesPrinted: false,
        rawPayloadsPrinted: false,
        mobileTrafficRoutedToBff: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
        live1kLoadRun: false,
        fiftyKLoadRun: false,
      }),
    );
  });
});
