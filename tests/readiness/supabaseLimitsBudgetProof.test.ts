import fs from "fs";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const readProjectFile = (relativePath: string): string =>
  fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

const readMatrix = () =>
  JSON.parse(
    readProjectFile("artifacts/S_LIMITS_1_supabase_account_limits_and_1k_budget_matrix.json"),
  ) as {
    status: string;
    decision: {
      S_LOAD_11_ALLOWED: boolean;
      exactCommandIfAllowedLater: string;
    };
    supabase_project_confirmed: boolean;
    production_project_selected: boolean;
    account_tier_confirmed: boolean;
    pooler_limits_confirmed: boolean;
    connection_limits_confirmed: boolean;
    api_rate_limits_confirmed: boolean;
    statement_timeout_confirmed: boolean;
    disk_io_status_confirmed: boolean;
    backup_pitr_status_confirmed: boolean;
    bounded_1k_harness_present: boolean;
    operator_budget_defined: boolean;
    operator_budget_approved: boolean;
    s_load_11_allowed: boolean;
    missing_human_actions: string[];
    operatorBudget: {
      maxConcurrency: number;
      rampSteps: number[];
      rampDurationMs: number;
      maxTotalRequests: number;
      maxTestDurationMs: number;
      perRequestTimeoutMs: number;
      cooldownMs: number;
      abortConditions: {
        sqlstate57014: boolean;
        http429: boolean;
        http5xxSpike: boolean;
        errorRateThreshold: number;
        latencyThresholdMs: number;
      };
      readOnlyTargetsOnly: boolean;
      liveRunApproved: boolean;
    };
    safety: Record<string, boolean>;
    secrets_printed: boolean;
    production_touched: boolean;
  };

describe("S-LIMITS-1 Supabase limits and 1K budget proof", () => {
  it("blocks S-LOAD-11 until Supabase account limits and operator approval are confirmed", () => {
    const matrix = readMatrix();

    expect(matrix.status).toBe("BLOCKED_SUPABASE_LIMITS_NEED_HUMAN_CONFIRMATION");
    expect(matrix.decision.S_LOAD_11_ALLOWED).toBe(false);
    expect(matrix.s_load_11_allowed).toBe(false);
    expect(matrix.supabase_project_confirmed).toBe(true);
    expect(matrix.production_project_selected).toBe(false);
    expect(matrix.account_tier_confirmed).toBe(false);
    expect(matrix.pooler_limits_confirmed).toBe(false);
    expect(matrix.connection_limits_confirmed).toBe(false);
    expect(matrix.api_rate_limits_confirmed).toBe(false);
    expect(matrix.statement_timeout_confirmed).toBe(false);
    expect(matrix.disk_io_status_confirmed).toBe(false);
    expect(matrix.backup_pitr_status_confirmed).toBe(false);
    expect(matrix.bounded_1k_harness_present).toBe(true);
    expect(matrix.operator_budget_defined).toBe(true);
    expect(matrix.operator_budget_approved).toBe(false);
  });

  it("records a concrete bounded 1K budget without running it", () => {
    const matrix = readMatrix();

    expect(matrix.operatorBudget).toEqual(
      expect.objectContaining({
        maxConcurrency: 1000,
        rampSteps: [25, 50, 100, 250, 500, 750, 1000],
        rampDurationMs: 900000,
        maxTotalRequests: 1000,
        maxTestDurationMs: 900000,
        perRequestTimeoutMs: 8000,
        cooldownMs: 500,
        readOnlyTargetsOnly: true,
        liveRunApproved: false,
      }),
    );
    expect(matrix.operatorBudget.abortConditions).toEqual({
      sqlstate57014: true,
      http429: true,
      http5xxSpike: true,
      errorRateThreshold: 0.02,
      latencyThresholdMs: 1500,
    });
    expect(matrix.decision.exactCommandIfAllowedLater).toContain("--profile bounded-1k --allow-live");
    expect(matrix.decision.exactCommandIfAllowedLater).toContain("STAGING_SUPABASE_LIMITS_CONFIRMED");
    expect(matrix.decision.exactCommandIfAllowedLater).toContain("STAGING_LOAD_OPERATOR_APPROVED");
  });

  it("lists exact missing human confirmations instead of faking account-limit readiness", () => {
    const matrix = readMatrix();
    const proof = readProjectFile("artifacts/S_LIMITS_1_supabase_account_limits_and_1k_budget_proof.md");

    expect(matrix.missing_human_actions).toEqual(
      expect.arrayContaining([
        expect.stringContaining("project tier/status"),
        expect.stringContaining("pooler mode"),
        expect.stringContaining("max_connections"),
        expect.stringContaining("API/PostgREST request rate limits"),
        expect.stringContaining("statement_timeout"),
        expect.stringContaining("backup/PITR"),
      ]),
    );
    expect(proof).toContain("Status: `BLOCKED_SUPABASE_LIMITS_NEED_HUMAN_CONFIRMATION`.");
    expect(proof).toContain("`S_LOAD_11_ALLOWED=false`.");
    expect(proof).toContain("does not fake account-limit readiness");
    expect(proof).not.toContain("S_LOAD_11_ALLOWED=true");
  });

  it("records no production, provider, migration, live-load, raw payload, or secret side effects", () => {
    const matrix = readMatrix();

    expect(matrix.production_touched).toBe(false);
    expect(matrix.secrets_printed).toBe(false);
    expect(matrix.safety).toEqual(
      expect.objectContaining({
        productionTouched: false,
        productionAccessed: false,
        productionMutated: false,
        oneKLoadRunByThisWave: false,
        fiftyKLoadRun: false,
        bffDeployed: false,
        redisCacheEnabled: false,
        queueEnabled: false,
        idempotencyEnabled: false,
        rateEnforcementEnabled: false,
        externalObservabilityEnabled: false,
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
