import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildStagingLoadHarnessPlan,
  buildStagingLoadMatrix,
  countRowsFromRpcData,
  createEnvMissingResult,
  createNotRunResult,
  payloadBytes,
  renderStagingLoadProof,
  resolveStagingLoadEnvStatus,
  resolveStagingLoadProofStatus,
  summarizeTargetResult,
} from "../../scripts/load/stagingLoadCore";

describe("S-LOAD-1 staging load core", () => {
  it("requires explicit staging env and does not allow production fallback", () => {
    const missing = resolveStagingLoadEnvStatus({});
    expect(missing).toEqual({
      canRunLive: false,
      missingKeys: ["STAGING_SUPABASE_URL", "STAGING_SUPABASE_READONLY_KEY"],
      presentKeys: [],
    });

    const present = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
      PROD_SUPABASE_URL: "https://prod.example.supabase.co",
    });
    expect(present.canRunLive).toBe(true);
    expect(present.presentKeys).toEqual([
      "STAGING_SUPABASE_URL",
      "STAGING_SUPABASE_READONLY_KEY",
    ]);
  });

  it("keeps the default target set bounded and read-only", () => {
    expect(DEFAULT_STAGING_LOAD_TARGETS).toHaveLength(5);
    expect(DEFAULT_STAGING_LOAD_TARGETS.every((target) => target.readOnly)).toBe(true);
    expect(
      DEFAULT_STAGING_LOAD_TARGETS.every(
        (target) => target.expectedMaxRows == null || target.expectedMaxRows <= 60,
      ),
    ).toBe(true);
    expect(DEFAULT_STAGING_LOAD_TARGETS.map((target) => target.id)).toEqual([
      "warehouse_issue_queue_page_25",
      "warehouse_incoming_queue_page_30",
      "warehouse_stock_page_60",
      "buyer_summary_inbox_page_25",
      "buyer_summary_buckets_fixed_scope",
    ]);
  });

  it("builds a bounded 1K plan with ramp and hard stop conditions but blocks live run without approval and limits", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const plan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-1k",
      planOnly: true,
      operatorApproved: false,
      supabaseLimitsConfirmed: false,
    });

    expect(plan.profile).toBe("bounded-1k");
    expect(plan.targetConcurrency).toBe(1000);
    expect(plan.rampSteps).toEqual([5, 10, 15, 20, 25, 50, 100, 250, 500, 750, 1000]);
    expect(plan.stopConditions).toMatchObject({
      requestTimeoutMs: 8000,
      maxTotalRequests: 1000,
      maxP95LatencyMs: 1500,
      stopOnSqlstate57014: true,
      stopOnHttp429Or5xx: true,
    });
    expect(plan.safeToRunLive).toBe(false);
    expect(plan.blockers).toEqual(
      expect.arrayContaining(["operator_approval_missing", "supabase_limits_unconfirmed"]),
    );
  });

  it("allows bounded 1K live only after env, operator approval, and Supabase limits are present", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const plan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-1k",
      operatorApproved: true,
      supabaseLimitsConfirmed: true,
    });

    expect(plan.safeToRunLive).toBe(true);
    expect(plan.blockers).toEqual([]);
  });

  it("summarizes latency, payload, row count, and recommendation", () => {
    const target = DEFAULT_STAGING_LOAD_TARGETS[0]!;
    const result = summarizeTargetResult(target, [
      { latencyMs: 100, payloadBytes: 10_000, rowCount: 25 },
      { latencyMs: 120, payloadBytes: 12_000, rowCount: 25 },
      { latencyMs: 80, payloadBytes: 8_000, rowCount: 25 },
    ]);

    expect(result.medianLatencyMs).toBe(100);
    expect(result.maxLatencyMs).toBe(120);
    expect(result.medianPayloadBytes).toBe(10_000);
    expect(result.maxPayloadBytes).toBe(12_000);
    expect(result.maxRowCount).toBe(25);
    expect(result.recommendation).toBe("safe_now");
  });

  it("flags oversized payloads or row overruns for optimization", () => {
    const target = DEFAULT_STAGING_LOAD_TARGETS[0]!;
    expect(
      summarizeTargetResult(target, [
        { latencyMs: 120, payloadBytes: 10_000, rowCount: 26 },
      ]).recommendation,
    ).toBe("optimize_next");

    expect(
      summarizeTargetResult(target, [
        { latencyMs: 1_600, payloadBytes: 10_000, rowCount: 25 },
      ]).recommendation,
    ).toBe("optimize_next");
  });

  it("counts rows from common RPC response shapes", () => {
    expect(countRowsFromRpcData([{ id: 1 }, { id: 2 }])).toBe(2);
    expect(countRowsFromRpcData({ rows: [{ id: 1 }] })).toBe(1);
    expect(
      countRowsFromRpcData({
        pending: [{ id: 1 }],
        approved: [{ id: 2 }, { id: 3 }],
        rejected: [],
      }),
    ).toBe(3);
    expect(countRowsFromRpcData(null)).toBe(0);
  });

  it("computes payload bytes without logging payload contents", () => {
    expect(payloadBytes({ token: "secret-token-value" })).toBeGreaterThan(0);
  });

  it("renders env-missing proof without secret values and with production fallback disabled", () => {
    const envStatus = resolveStagingLoadEnvStatus({});
    const matrix = buildStagingLoadMatrix({
      generatedAt: "2026-04-28T00:00:00.000Z",
      envStatus,
      targets: DEFAULT_STAGING_LOAD_TARGETS.map((target) =>
        createEnvMissingResult(target, envStatus.missingKeys),
      ),
    });
    const proof = renderStagingLoadProof(matrix);

    expect(matrix.liveRun).toBe("not_run_env_missing");
    expect(matrix.environment.productionFallbackUsed).toBe(false);
    expect(matrix.environment.secretsPrinted).toBe(false);
    expect(proof).toContain("GREEN_IMPLEMENTATION_LIVE_NOT_RUN");
    expect(proof).toContain("production touched: NO");
    expect(proof).not.toContain("secret-token-value");
  });

  it("records plan-only load matrices without pretending the live load ran", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const harnessPlan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-1k",
      planOnly: true,
      operatorApproved: false,
      supabaseLimitsConfirmed: false,
    });
    const matrix = buildStagingLoadMatrix({
      generatedAt: "2026-04-30T00:00:00.000Z",
      envStatus,
      harnessPlan,
      targets: DEFAULT_STAGING_LOAD_TARGETS.map((target) =>
        createNotRunResult(target, "not_run_plan_only", harnessPlan.blockers),
      ),
    });
    const proof = renderStagingLoadProof(matrix);

    expect(matrix.liveRun).toBe("not_run_plan_only");
    expect(matrix.wave).toBe("S-LOAD-10");
    expect(resolveStagingLoadProofStatus(matrix)).toBe("BLOCKED_1K_LOAD_REQUIRES_LIMIT_CONFIRMATION");
    expect(proof).toContain("S-LOAD-10 1K Concurrency Preflight Proof");
    expect(proof).toContain("BLOCKED_1K_LOAD_REQUIRES_LIMIT_CONFIRMATION");
    expect(proof).toContain("target concurrency: 1000");
    expect(proof).toContain("stop on SQLSTATE 57014: YES");
    expect(proof).toContain("Supabase limits confirmed: NO");
  });
});
