import {
  DEFAULT_STAGING_LOAD_TARGETS,
  buildStagingLoadRampBatches,
  buildStagingLoadTargetExecutionPlan,
  buildLoadRunnerReadonlySafetyConfig,
  buildStagingLoadHarnessPlan,
  buildStagingLoadMatrix,
  countStagingLoadTargetExecutionPlanRequests,
  countRowsFromRpcData,
  createLoadRunnerEmulatorAdapter,
  createEnvMissingResult,
  createNotRunResult,
  evaluateStagingLoadLiveThresholds,
  evaluateLoadRunnerAbortCriteria,
  payloadBytes,
  renderStagingLoadProof,
  runLoadRunnerEmulatorDryRun,
  resolveStagingLoadEnvStatus,
  resolveStagingLoadProofStatus,
  sanitizeLoadRunnerLogEvent,
  validateLoadRunnerLogEvent,
  validateLoadRunnerReadOnlyScenarios,
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

  it("builds a bounded 5K plan as plan-only by default and requires enterprise approval", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const plan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-5k",
      planOnly: true,
      operatorApproved: false,
      supabaseLimitsConfirmed: false,
      enterpriseLoadApproved: false,
    });

    expect(plan.profile).toBe("bounded-5k");
    expect(plan.targetConcurrency).toBe(5000);
    expect(plan.rampSteps).toEqual([
      5,
      10,
      15,
      20,
      25,
      50,
      100,
      250,
      500,
      750,
      1000,
      1500,
      2000,
      3000,
      4000,
      5000,
    ]);
    expect(plan.stopConditions).toMatchObject({
      maxTotalRequests: 5000,
      maxP95LatencyMs: 1500,
      stopOnSqlstate57014: true,
      stopOnHttp429Or5xx: true,
    });
    expect(plan.enterpriseLoadApprovalRequired).toBe(true);
    expect(plan.safeToRunLive).toBe(false);
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        "operator_approval_missing",
        "supabase_limits_unconfirmed",
        "enterprise_5k_load_approval_missing",
      ]),
    );
  });

  it("builds a bounded 10K plan as plan-only by default and requires enterprise approval", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const plan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-10k",
      planOnly: true,
      operatorApproved: false,
      supabaseLimitsConfirmed: false,
      enterpriseLoadApproved: false,
    });

    expect(plan.profile).toBe("bounded-10k");
    expect(plan.targetConcurrency).toBe(10000);
    expect(plan.rampSteps).toEqual([
      5,
      10,
      15,
      20,
      25,
      50,
      100,
      250,
      500,
      750,
      1000,
      1500,
      2000,
      3000,
      4000,
      5000,
      6000,
      7500,
      10000,
    ]);
    expect(plan.stopConditions).toMatchObject({
      maxTotalRequests: 10000,
      maxP95LatencyMs: 1500,
      stopOnSqlstate57014: true,
      stopOnHttp429Or5xx: true,
    });
    expect(plan.enterpriseLoadApprovalRequired).toBe(true);
    expect(plan.safeToRunLive).toBe(false);
    expect(plan.blockers).toEqual(
      expect.arrayContaining([
        "operator_approval_missing",
        "supabase_limits_unconfirmed",
        "enterprise_10k_load_approval_missing",
      ]),
    );
  });

  it("expands bounded 5K live proof into exactly 5000 read-only target executions", () => {
    const plan = buildStagingLoadTargetExecutionPlan(DEFAULT_STAGING_LOAD_TARGETS, 5000);

    expect(plan).toHaveLength(DEFAULT_STAGING_LOAD_TARGETS.length);
    expect(countStagingLoadTargetExecutionPlanRequests(plan)).toBe(5000);
    expect(plan.every((item) => item.target.readOnly)).toBe(true);
    expect(plan.map((item) => item.runs)).toEqual([1000, 1000, 1000, 1000, 1000]);
  });

  it("splits bounded live requests into ramp batches before reaching the full queue", () => {
    const requests = Array.from({ length: 5000 }, (_, index) => index);
    const batches = buildStagingLoadRampBatches(
      requests,
      [5, 10, 15, 20, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000],
      5000,
    );

    expect(batches[0]).toMatchObject({ rampStep: 5, concurrency: 5 });
    expect(batches.flatMap((batch) => batch.items)).toEqual(requests);
    expect(batches.reduce((sum, batch) => sum + batch.items.length, 0)).toBe(5000);
    expect(Math.max(...batches.map((batch) => batch.concurrency))).toBeLessThan(5000);
  });

  it("keeps ramp batches bounded when custom ramp input is sparse or out of order", () => {
    const requests = Array.from({ length: 7 }, (_, index) => index);
    const batches = buildStagingLoadRampBatches(requests, [5, 1, 50, 5], 5);

    expect(batches.map((batch) => batch.rampStep)).toEqual([1, 5, 5]);
    expect(batches.map((batch) => batch.concurrency)).toEqual([1, 5, 1]);
    expect(batches.flatMap((batch) => batch.items)).toEqual(requests);
  });

  it("expands bounded 10K preflight into exactly 10000 read-only target executions", () => {
    const plan = buildStagingLoadTargetExecutionPlan(DEFAULT_STAGING_LOAD_TARGETS, 10000);

    expect(plan).toHaveLength(DEFAULT_STAGING_LOAD_TARGETS.length);
    expect(countStagingLoadTargetExecutionPlanRequests(plan)).toBe(10000);
    expect(plan.every((item) => item.target.readOnly)).toBe(true);
    expect(plan.map((item) => item.runs)).toEqual([2000, 2000, 2000, 2000, 2000]);
  });

  it("uses error-budget exit semantics unless full completion is explicitly required", () => {
    expect(
      evaluateStagingLoadLiveThresholds({
        totalRequestsPlanned: 5000,
        totalRequestsAttempted: 5000,
        totalRequestsCompleted: 4976,
        observedErrorRate: 0.0048,
        maxErrorRate: 0.02,
        abortTriggered: false,
      }),
    ).toEqual({
      passed: true,
      hardFailure: false,
      reasons: [],
      completionPolicy: "error_budget",
    });

    expect(
      evaluateStagingLoadLiveThresholds({
        totalRequestsPlanned: 5000,
        totalRequestsAttempted: 5000,
        totalRequestsCompleted: 4976,
        observedErrorRate: 0.0048,
        maxErrorRate: 0.02,
        abortTriggered: false,
        requireFullCompletion: true,
      }).reasons,
    ).toContain("completed_below_attempted");

    expect(
      evaluateStagingLoadLiveThresholds({
        totalRequestsPlanned: 5000,
        totalRequestsAttempted: 5000,
        totalRequestsCompleted: 4800,
        observedErrorRate: 0.04,
        maxErrorRate: 0.02,
        abortTriggered: false,
      }).reasons,
    ).toContain("error_rate_exceeded");
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

  it("records 5K harness readiness separately from a 5K live load proof", () => {
    const envStatus = resolveStagingLoadEnvStatus({
      STAGING_SUPABASE_URL: "https://staging.example.supabase.co",
      STAGING_SUPABASE_READONLY_KEY: "readonly",
    });
    const harnessPlan = buildStagingLoadHarnessPlan({
      envStatus,
      profile: "bounded-5k",
      planOnly: true,
      operatorApproved: false,
      supabaseLimitsConfirmed: false,
      enterpriseLoadApproved: false,
    });
    const matrix = buildStagingLoadMatrix({
      generatedAt: "2026-05-04T00:00:00.000Z",
      envStatus,
      harnessPlan,
      targets: DEFAULT_STAGING_LOAD_TARGETS.map((target) =>
        createNotRunResult(target, "not_run_plan_only", harnessPlan.blockers),
      ),
    });
    const proof = renderStagingLoadProof(matrix);

    expect(matrix.liveRun).toBe("not_run_plan_only");
    expect(matrix.wave).toBe("S-LOAD-STAGING-5K-READONLY-HARNESS-PREFLIGHT-1");
    expect(resolveStagingLoadProofStatus(matrix)).toBe(
      "GREEN_5K_HARNESS_READY_LIVE_BLOCKED_BY_APPROVALS_OR_ENV",
    );
    expect(proof).toContain("S-LOAD-STAGING-5K Readonly Harness Preflight Proof");
    expect(proof).toContain("target concurrency: 5000");
    expect(proof).toContain("Enterprise load approval required: YES");
    expect(proof).toContain("Enterprise load approved: NO");
  });

  it("defines only permanent read-only load runner scenarios for safety hardening", () => {
    const config = buildLoadRunnerReadonlySafetyConfig();
    const validation = validateLoadRunnerReadOnlyScenarios(config.scenarios);

    expect(validation.passed).toBe(true);
    expect(validation.readOnlyScenarioCount).toBe(config.scenarios.length);
    expect(validation.mutationScenarioCount).toBe(0);
    expect(validation.categories).toEqual(
      expect.arrayContaining([
        "catalog_readonly",
        "director_reports_readonly",
        "warehouse_readonly",
        "bff_health_ready_probe",
        "bff_readonly_probe",
      ]),
    );
  });

  it("rejects mutation or business-write load scenarios before execution", () => {
    const config = buildLoadRunnerReadonlySafetyConfig();
    const validation = validateLoadRunnerReadOnlyScenarios([
      ...config.scenarios,
      {
        id: "proposal_submit_mutation",
        category: "bff_readonly_probe",
        endpointCategoryName: "proposal.submit",
        transport: "bff_read",
        method: "POST",
        operation: "proposal.submit.mutation",
        readOnly: false,
        businessMutation: true,
        maxRows: null,
      },
    ]);

    expect(validation.passed).toBe(false);
    expect(validation.errors).toContain("mutation_or_write_scenario_rejected:proposal_submit_mutation");
  });

  it("keeps load runner logs status-only and rejects URLs, tokens, payloads, and business rows", () => {
    const sanitized = sanitizeLoadRunnerLogEvent({
      statusClass: "ok",
      count: 3,
      latencyMs: [10, 20, 30],
      endpointCategoryName: "warehouse.readonly",
      errorCategory: null,
    });

    expect(validateLoadRunnerLogEvent(sanitized).passed).toBe(true);
    expect(sanitized).toEqual({
      statusClass: "ok",
      count: 3,
      latencyPercentiles: { p50: 20, p95: 30, p99: 30 },
      endpointCategoryName: "warehouse.readonly",
      errorCategory: null,
    });

    const unsafe = validateLoadRunnerLogEvent({
      statusClass: "error",
      endpointCategoryName: "warehouse.readonly",
      url: "https://staging.example.invalid/rest/v1/business_rows",
      token: "secret-token-value",
      rawPayload: { companyId: "company-1" },
      rawRows: [{ id: "row-1" }],
    });

    expect(unsafe.passed).toBe(false);
    expect(unsafe.errors).toEqual(
      expect.arrayContaining([
        "event.url:forbidden_key",
        "event.url:forbidden_value",
        "event.token:forbidden_key",
        "event.rawPayload:forbidden_key",
        "event.rawRows:forbidden_key",
      ]),
    );
  });

  it("triggers abort criteria for health, ready, error-rate, and unexpected write route failures", () => {
    const { rails } = buildLoadRunnerReadonlySafetyConfig();

    expect(
      evaluateLoadRunnerAbortCriteria(
        {
          healthStatus: 503,
          readyStatus: 200,
          totalRequests: 100,
          errorCount: 0,
          unexpectedWriteRouteDetected: false,
        },
        rails,
      ),
    ).toEqual({ abort: true, reasons: ["health_failure"] });

    expect(
      evaluateLoadRunnerAbortCriteria(
        {
          healthStatus: 200,
          readyStatus: 503,
          totalRequests: 100,
          errorCount: 0,
          unexpectedWriteRouteDetected: false,
        },
        rails,
      ).reasons,
    ).toContain("ready_failure");

    expect(
      evaluateLoadRunnerAbortCriteria(
        {
          healthStatus: 200,
          readyStatus: 200,
          totalRequests: 100,
          errorCount: 3,
          unexpectedWriteRouteDetected: true,
        },
        rails,
      ).reasons,
    ).toEqual(expect.arrayContaining(["error_rate_exceeded", "unexpected_write_route"]));
  });

  it("runs emulator dry-run without staging or production calls and respects maxConcurrency", async () => {
    const config = buildLoadRunnerReadonlySafetyConfig({ rails: { maxConcurrency: 2 } });
    const result = await runLoadRunnerEmulatorDryRun(config);

    expect(result.status).toBe("passed");
    expect(result.realNetworkCallsMade).toBe(false);
    expect(result.stagingCallsMade).toBe(false);
    expect(result.productionCallsMade).toBe(false);
    expect(result.maxObservedConcurrency).toBeLessThanOrEqual(2);
    expect(result.maxConcurrencyRespected).toBe(true);
    expect(result.readOnlyScenariosDefined).toBe(true);
    expect(result.mutationScenariosRejected).toBe(true);
    expect(result.abortCriteriaValidated).toBe(true);
    expect(result.redactionPassed).toBe(true);
  });

  it("handles emulator timeout results as categorized status without raw payload logging", async () => {
    const config = buildLoadRunnerReadonlySafetyConfig({ rails: { maxConcurrency: 1, requestTimeoutMs: 10 } });
    const adapter = createLoadRunnerEmulatorAdapter({
      catalog_items_search_preview_readonly: {
        statusClass: "timeout",
        latencyMs: 11,
        errorCategory: "timeout",
      },
    });
    const result = await runLoadRunnerEmulatorDryRun(config, adapter);

    expect(result.status).toBe("passed");
    expect(result.timeoutHandlingPassed).toBe(true);
    expect(result.logs.find((log) => log.errorCategory === "timeout")).toEqual(
      expect.objectContaining({
        statusClass: "timeout",
        endpointCategoryName: "catalog.readonly",
      }),
    );
    expect(result.logs.every((log) => validateLoadRunnerLogEvent(log).passed)).toBe(true);
  });
});
