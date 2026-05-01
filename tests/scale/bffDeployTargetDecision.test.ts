import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(
    readProjectFile("artifacts/S_BFF_STAGING_DEPLOY_TARGET_DECISION_1_matrix.json"),
  ) as {
    status: string;
    bffBoundaryInspection: {
      runtimeType: string;
      serverEntrypoint: {
        path: string;
        export: string;
        httpListenerPresent: boolean;
      };
      healthEndpoint: { path: string; confirmed: boolean };
      readinessEndpoint: { path: string; confirmed: boolean };
      shadowMode: { localFixtureShadowSupported: boolean; trafficRoutedToBff: boolean };
      mobileBffFlag: { enabledByDefault: boolean; networkExecutionAllowed: boolean };
      routes: { readRoutes: number; mutationRoutes: number; mutationRoutesEnabledByDefault: boolean };
    };
    requiredEnvNames: string[];
    currentEnvPresence: Record<string, string | boolean>;
    providerComparison: Array<{
      provider: string;
      compatibility: string;
      requiresRepoHttpWrapper?: boolean;
      officialDocs?: string[];
    }>;
    recommendation: {
      provider: string;
      targetType: string;
      status: string;
      humanProviderChoiceRequired: boolean;
      deployNow: boolean;
    };
    exactSetupChecklist: string[];
    decisionOutputs: {
      stagingBffBaseUrlInvented: boolean;
      stagingBffBaseUrlStatus: string;
      mobileTrafficEnabled: boolean;
    };
    safety: Record<string, boolean>;
  };

describe("S-BFF-STAGING-DEPLOY-TARGET-DECISION-1", () => {
  it("selects Render Web Service as the concrete staging BFF target without deploying", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("GREEN_BFF_DEPLOY_TARGET_DECISION_READY");
    expect(matrix.recommendation).toEqual(
      expect.objectContaining({
        provider: "Render",
        targetType: "Web Service",
        status: "selected_for_next_setup",
        humanProviderChoiceRequired: false,
        deployNow: false,
      }),
    );
    expect(matrix.providerComparison.find((entry) => entry.provider === "Render")).toEqual(
      expect.objectContaining({
        compatibility: "recommended",
        requiresRepoHttpWrapper: true,
      }),
    );
    expect(matrix.providerComparison.find((entry) => entry.provider === "Supabase Edge Functions")).toEqual(
      expect.objectContaining({
        compatibility: "not_recommended_for_current_boundary",
      }),
    );
  });

  it("records the real repo boundary and does not pretend an HTTP listener already exists", () => {
    const matrix = readMatrix();

    expect(matrix.bffBoundaryInspection.runtimeType).toBe("Node.js TypeScript server-boundary module");
    expect(matrix.bffBoundaryInspection.serverEntrypoint).toEqual({
      path: "scripts/server/stagingBffServerBoundary.ts",
      export: "handleBffStagingServerRequest",
      httpListenerPresent: false,
      note: "The repo has a request handler boundary, not a deployable HTTP listener yet.",
    });
    expect(matrix.bffBoundaryInspection.healthEndpoint).toEqual({ method: "GET", path: "/health", confirmed: true });
    expect(matrix.bffBoundaryInspection.readinessEndpoint).toEqual({ method: "GET", path: "/ready", confirmed: true });
    expect(matrix.bffBoundaryInspection.routes).toEqual(
      expect.objectContaining({
        readRoutes: 5,
        mutationRoutes: 5,
        mutationRoutesEnabledByDefault: false,
      }),
    );
    expect(matrix.bffBoundaryInspection.shadowMode).toEqual(
      expect.objectContaining({
        localFixtureShadowSupported: true,
        trafficRoutedToBff: false,
      }),
    );
    expect(matrix.bffBoundaryInspection.mobileBffFlag).toEqual(
      expect.objectContaining({
        enabledByDefault: false,
        networkExecutionAllowed: false,
      }),
    );
  });

  it("keeps env values missing/redacted and requires the setup checklist before URL creation", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_BFF_STAGING_DEPLOY_TARGET_DECISION_1_proof.md");

    expect(matrix.requiredEnvNames).toEqual([
      "STAGING_BFF_BASE_URL",
      "BFF_SERVER_AUTH_SECRET",
      "BFF_DATABASE_READONLY_URL",
      "BFF_MUTATION_ENABLED",
      "BFF_IDEMPOTENCY_METADATA_ENABLED",
      "BFF_RATE_LIMIT_METADATA_ENABLED",
    ]);
    expect(matrix.currentEnvPresence.STAGING_BFF_BASE_URL).toBe("missing");
    expect(matrix.currentEnvPresence.valuesPrinted).toBe(false);
    expect(matrix.decisionOutputs).toEqual(
      expect.objectContaining({
        stagingBffBaseUrlInvented: false,
        stagingBffBaseUrlStatus: "missing",
        mobileTrafficEnabled: false,
      }),
    );
    expect(matrix.exactSetupChecklist).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Do not deploy in this wave"),
        expect.stringContaining("add a thin Node HTTP wrapper"),
        expect.stringContaining("Create a Render Web Service"),
        expect.stringContaining("STAGING_BFF_BASE_URL"),
      ]),
    );
    expect(proof).toContain("Recommended target: Render Web Service.");
    expect(proof).toContain("BFF URL invented: NO");
  });

  it("records no production, deploy, provider, mobile traffic, raw payload, or secret side effects", () => {
    const matrix = readMatrix();

    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        bffDeployed: false,
        stagingBffBaseUrlInvented: false,
        liveBffHealthCheckRun: false,
        liveBffReadinessCheckRun: false,
        mobileTrafficRoutedToBff: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
        fiftyKLoadRun: false,
        secretsPrinted: false,
        envValuesPrinted: false,
        rawPayloadsPrinted: false,
      }),
    );
  });
});
