import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readJson = <T>(relativePath: string): T =>
  JSON.parse(readProjectFile(relativePath)) as T;

type TenKReadinessMatrix = {
  status: string;
  conclusion: {
    tenKDbLoadBlockerClosed: boolean;
    tenKFullReadinessClaimed: boolean;
    fiftyKProven: boolean;
  };
  tenK: {
    latestLoadProof: {
      status: string;
      source: string;
      warehouseIssueMovedOutOfOptimizeNext: boolean;
      timeout57014: boolean;
      boundedRowsPass: boolean;
      noMajorTargetRegression: boolean;
    };
    loadBlocker: { status: string; stagingProofOnly: boolean };
    oneKConcurrency: {
      status: string;
      boundedHarnessPlanExists: boolean;
      loadRun: boolean;
      blockingInputs: string[];
    };
  };
  fiftyKContext: {
    bffStaging: { status: string; stagingBffBaseUrl: string; live: boolean };
    redisCache: { status: string; live: boolean };
    queueBullMq: { status: string; live: boolean };
    dbIdempotency: { status: string; live: boolean };
    rateEnforcement: { status: string; enabled: boolean };
    observabilityExport: { status: string; externalTelemetrySent: boolean };
    fiftyKLoadProof: { status: string; loadRun: boolean; readinessClaimed: boolean };
  };
  staleBlockersRetired: Array<{ oldBlocker: string }>;
  safety: Record<string, boolean>;
};

describe("S-READINESS-10K-PROOF truth refresh", () => {
  it("marks only the 10K DB/load blocker green and keeps full readiness unclaimed", () => {
    const matrix = readJson<TenKReadinessMatrix>("artifacts/S_READINESS_10K_PROOF_matrix.json");

    expect(matrix.status).toBe("GREEN_10K_DB_LOAD_BLOCKER_CLOSED");
    expect(matrix.conclusion).toEqual(
      expect.objectContaining({
        tenKDbLoadBlockerClosed: true,
        tenKFullReadinessClaimed: false,
        fiftyKProven: false,
      }),
    );
    expect(matrix.tenK.latestLoadProof).toEqual({
      status: "GREEN_LOAD_VERIFIED",
      source: "S-LOAD-8",
      warehouseIssueQueuePage25: "watch",
      warehouseIssueMovedOutOfOptimizeNext: true,
      timeout57014: false,
      boundedRowsPass: true,
      noMajorTargetRegression: true,
    });
    expect(matrix.tenK.loadBlocker).toEqual({
      status: "GREEN_10K_LOAD_BLOCKER_CLOSED",
      source: "S-10K-LOAD-CLOSEOUT-1",
      stagingProofOnly: true,
    });
  });

  it("keeps 1K and 50K gates blocked unless external inputs exist", () => {
    const matrix = readJson<TenKReadinessMatrix>("artifacts/S_READINESS_10K_PROOF_matrix.json");

    expect(matrix.tenK.oneKConcurrency).toEqual({
      status: "BLOCKED_BY_STAGING_LIMITS",
      preflightStatus: "BLOCKED_1K_LOAD_REQUIRES_LIMIT_CONFIRMATION",
      boundedHarnessPlanExists: true,
      loadRun: false,
      blockingInputs: ["operator_approval_missing", "supabase_limits_unconfirmed"],
    });
    expect(matrix.fiftyKContext.bffStaging).toEqual(
      expect.objectContaining({
        status: "BLOCKED_BFF_DEPLOY_TARGET_MISSING",
        stagingBffBaseUrl: "missing",
        live: false,
      }),
    );
    expect(matrix.fiftyKContext.redisCache).toEqual(
      expect.objectContaining({ status: "BLOCKED_CACHE_PROVIDER_ENV_MISSING", live: false }),
    );
    expect(matrix.fiftyKContext.queueBullMq).toEqual(
      expect.objectContaining({ status: "BLOCKED_QUEUE_PROVIDER_ENV_MISSING", live: false }),
    );
    expect(matrix.fiftyKContext.dbIdempotency).toEqual(
      expect.objectContaining({ status: "BLOCKED_IDEMPOTENCY_DB_ENV_OR_TABLE_MISSING", live: false }),
    );
    expect(matrix.fiftyKContext.rateEnforcement).toEqual(
      expect.objectContaining({ status: "BLOCKED_RATE_PROVIDER_ENV_MISSING", enabled: false }),
    );
    expect(matrix.fiftyKContext.observabilityExport).toEqual(
      expect.objectContaining({ status: "BLOCKED_OBS_EXPORT_ENV_MISSING", externalTelemetrySent: false }),
    );
    expect(matrix.fiftyKContext.fiftyKLoadProof).toEqual({
      status: "not_run",
      loadRun: false,
      readinessClaimed: false,
    });
  });

  it("retires stale pre-Fix-6 blockers from the current DB/load proof scope", () => {
    const matrix = readJson<TenKReadinessMatrix>("artifacts/S_READINESS_10K_PROOF_matrix.json");
    const proof = readProjectFile("artifacts/S_READINESS_10K_PROOF_proof.md");
    const retired = matrix.staleBlockersRetired.map((entry) => entry.oldBlocker);

    expect(retired).toEqual(
      expect.arrayContaining(["load_hotspot_db_rpc_followup", "production_monitoring_snapshot", "production_indexes"]),
    );
    expect(proof).toContain("Status: `GREEN_10K_DB_LOAD_BLOCKER_CLOSED`.");
    expect(proof).toContain("This is a production-safe truth refresh for the 10K DB/load blocker.");
    expect(proof).not.toContain("PARTIAL_NOT_PROVEN_LIVE_GATES_REMAIN");
    expect(proof).not.toContain("S-LOAD-FIX-1");
  });

  it("records no production, provider, deploy, load, migration, secret, or raw payload side effects", () => {
    const matrix = readJson<TenKReadinessMatrix>("artifacts/S_READINESS_10K_PROOF_matrix.json");

    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        stagingLoadRunByThisWave: false,
        stagingWrites: false,
        businessLogicChanged: false,
        appBehaviorChanged: false,
        sqlRpcChanged: false,
        rlsStorageChanged: false,
        packageNativeChanged: false,
        bffDeployed: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
        oneKLoadRunByThisWave: false,
        fiftyKLoadRun: false,
        secretsPrinted: false,
        envValuesPrinted: false,
        rawPayloadsPrinted: false,
        rawRowsPrinted: false,
      }),
    );
  });
});
