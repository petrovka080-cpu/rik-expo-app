import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(readProjectFile("artifacts/S_50K_READINESS_MASTER_MATRIX_1.json")) as {
    status: string;
    greenStatusClaimed: boolean;
    tenK: {
      latestLoadProofStatus: { status: string; source: string };
      latestOneKProofStatus: {
        status: string;
        preflightStatus: string;
        loadRun: boolean;
        boundedHarnessPlanExists: boolean;
        currentBlockingInputs: string[];
      };
    };
    fiftyK: {
      scoreEstimate: { score: number; platformPreparationScore: number };
      bffDeployStatus: {
        sourceStatus: string;
        stagingBffBaseUrl: string;
        repoStatus: string;
        live: boolean;
      };
      redisCacheStatus: { sourceStatus: string; repoStatus: string };
      queueBullMqStatus: { sourceStatus: string; repoStatus: string };
      dbIdempotencyStatus: { sourceStatus: string; repoStatus: string };
      rateEnforcementStatus: { sourceStatus: string; repoStatus: string; globalEnforcementEnabled: boolean };
      observabilityExportStatus: { sourceStatus: string; repoStatus: string; externalTelemetrySent: boolean };
      supabaseLimitsAccountStatus: { status: string };
      fiftyKLoadProofStatus: { status: string; loadRun: boolean; readinessClaimed: boolean };
      exactBlockedHumanActions: string[];
    };
    safety: Record<string, boolean>;
  };

describe("S-50K readiness master truth layer", () => {
  it("keeps the master matrix green only as a complete proof surface", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("GREEN_MASTER_READINESS_MATRIX_COMPLETE");
    expect(matrix.greenStatusClaimed).toBe(true);
    expect(matrix.tenK.latestLoadProofStatus).toEqual({
      status: "GREEN_LOAD_VERIFIED",
      source: "S-LOAD-8",
      warehouseIssueQueuePage25: "watch",
      warehouseIssueMovedOutOfOptimizeNext: true,
      timeout57014: false,
      boundedRowsPass: true,
      noMajorTargetRegression: true,
    });
    expect(matrix.tenK.latestOneKProofStatus).toEqual({
      status: "BLOCKED_BY_STAGING_LIMITS",
      source: "S-LOAD-11",
      preflightStatus: "BLOCKED_1K_LOAD_REQUIRES_LIMIT_CONFIRMATION",
      loadRun: false,
      currentBlockingInputs: ["operator_approval_missing", "supabase_limits_unconfirmed"],
      boundedHarnessPlanExists: true,
    });
  });

  it("does not mark missing 50K infrastructure as live", () => {
    const matrix = readMatrix();

    expect(matrix.fiftyK.scoreEstimate.score).toBeLessThan(matrix.fiftyK.scoreEstimate.platformPreparationScore);
    expect(matrix.fiftyK.bffDeployStatus).toEqual(
      expect.objectContaining({
        sourceStatus: "BLOCKED_BFF_DEPLOY_TARGET_MISSING",
        stagingBffBaseUrl: "missing",
        repoStatus: "repo_ready_disabled",
        live: false,
      }),
    );
    expect(matrix.fiftyK.redisCacheStatus).toEqual(
      expect.objectContaining({ sourceStatus: "BLOCKED_CACHE_PROVIDER_ENV_MISSING", repoStatus: "repo_ready_disabled" }),
    );
    expect(matrix.fiftyK.queueBullMqStatus).toEqual(
      expect.objectContaining({ sourceStatus: "BLOCKED_QUEUE_PROVIDER_ENV_MISSING", repoStatus: "repo_ready_disabled" }),
    );
    expect(matrix.fiftyK.dbIdempotencyStatus).toEqual(
      expect.objectContaining({
        sourceStatus: "BLOCKED_IDEMPOTENCY_DB_ENV_OR_TABLE_MISSING",
        repoStatus: "repo_ready_disabled",
      }),
    );
    expect(matrix.fiftyK.rateEnforcementStatus).toEqual(
      expect.objectContaining({
        sourceStatus: "BLOCKED_RATE_PROVIDER_ENV_MISSING",
        repoStatus: "repo_ready_disabled",
        globalEnforcementEnabled: false,
      }),
    );
    expect(matrix.fiftyK.observabilityExportStatus).toEqual(
      expect.objectContaining({
        sourceStatus: "BLOCKED_OBS_EXPORT_ENV_MISSING",
        repoStatus: "repo_ready_disabled",
        externalTelemetrySent: false,
      }),
    );
    expect(matrix.fiftyK.supabaseLimitsAccountStatus.status).toBe("unconfirmed");
    expect(matrix.fiftyK.fiftyKLoadProofStatus).toEqual(
      expect.objectContaining({ status: "not_run", loadRun: false, readinessClaimed: false }),
    );
  });

  it("keeps blocked actions aligned with the existing bounded 1K harness", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_50K_READINESS_MASTER_MATRIX_1_proof.md");

    expect(matrix.fiftyK.exactBlockedHumanActions).toContain(
      "Approve the existing bounded 1K harness live run only after Supabase/account limits and the operator-owned concurrency budget are confirmed.",
    );
    expect(proof).toContain("bounded 1K harness mode already exists");
    expect(proof).not.toContain("Approve or add a 1K concurrency harness mode");
  });

  it("records no production, provider, deploy, migration, raw payload, or secret side effects", () => {
    const matrix = readMatrix();

    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        bffDeployed: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
        oneKLoadRunByThisWave: false,
        fiftyKLoadRun: false,
        migrationsApplied: false,
        sqlRpcRlsStorageChanged: false,
        secretsPrinted: false,
        envValuesPrinted: false,
        rawPayloadsPrinted: false,
        rawRowsPrinted: false,
      }),
    );
  });
});
