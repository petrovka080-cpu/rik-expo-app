import {
  buildDirectSupabaseExceptionRegistry,
  classifyDirectSupabaseTransportOwner,
  evaluateCacheColdMissProofGuardrail,
  evaluateCacheRateScopeGuardrail,
  evaluateDirectSupabaseGuardrail,
  evaluateDirectSupabaseExceptionGuardrail,
  evaluateProductionRawLoopGuardrail,
  evaluateProductionReadonlyCanaryGuardrail,
  evaluateRateLimitMarketplace5PctCanaryProofGuardrail,
  evaluateRateLimitMarketplaceCanaryProofGuardrail,
  evaluateUnboundedSelectRatchetGuardrail,
  evaluateUnsafeCastRatchetGuardrail,
  formatDirectSupabaseServiceBypassFailure,
  scanComponentDebtSource,
  scanDirectSupabaseSource,
  scanProductionRawLoopSource,
  scanProductionRawLoops,
  scanUnboundedSelectRatchetSource,
  scanUnsafeCastSource,
  type UnboundedSelectAllowlistEntry,
  type UnsafeCastPattern,
} from "../../scripts/architecture_anti_regression_suite";

describe("architecture anti-regression suite", () => {
  it("blocks direct Supabase service bypasses with readable owner failures", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/screens/example/example.service.ts",
      source: [
        'await supabase.from("requests").select("*");',
        'await supabase.rpc("request_update_v1", payload);',
      ].join("\n"),
    });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/screens/example/example.service.ts",
        line: 1,
        operation: "read",
        callTarget: "table:requests",
        matchedCall: "supabase.from (table:requests)",
        classification: "service_bypass",
        transportOwner: "none",
      }),
      expect.objectContaining({
        file: "src/screens/example/example.service.ts",
        line: 2,
        operation: "rpc",
        callTarget: "rpc:request_update_v1",
        matchedCall: "supabase.rpc (rpc:request_update_v1)",
        classification: "service_bypass",
        transportOwner: "none",
      }),
    ]);

    const guardrail = evaluateDirectSupabaseGuardrail(findings);
    expect(guardrail.summary.serviceBypassBudget).toBe(0);
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "direct_supabase_service_bypass_budget",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "direct_supabase_service_bypass:file=src/screens/example/example.service.ts:line=1:matched_call=supabase.from (table:requests):expected_transport_owner=src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)",
        "direct_supabase_service_bypass:file=src/screens/example/example.service.ts:line=2:matched_call=supabase.rpc (rpc:request_update_v1):expected_transport_owner=src/lib/supabaseClient.ts root client or transport-owned file (*.transport.*, *.bff.*, /server/)",
        "service_bypass_budget_exceeded:2>0",
      ]),
    );
    expect(formatDirectSupabaseServiceBypassFailure(findings[0])).toContain("expected_transport_owner=");
    expect(evaluateDirectSupabaseGuardrail(findings, 2).check.status).toBe("fail");
  });

  it("keeps new transport-owned Supabase calls out of service bypass", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/lib/catalog/catalog.transport.supabase.ts",
      source: [
        'return await supabase.rpc("rik_quick_search", args);',
        "await supabase.realtime.setAuth(accessToken);",
        "return supabase.auth.onAuthStateChange(callback);",
      ].join("\n"),
    });
    const summary = evaluateDirectSupabaseGuardrail(findings, 0).summary;

    expect(findings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "rpc",
        callTarget: "rpc:rik_quick_search",
        transportOwner: "transport_file",
        expectedTransportOwner: "transport-owned file (*.transport.*)",
      }),
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "realtime",
        callTarget: "realtime:setAuth",
        transportOwner: "transport_file",
      }),
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "auth",
        callTarget: "auth:onAuthStateChange",
        transportOwner: "transport_file",
      }),
    ]);
    expect(summary.serviceBypassFindings).toBe(0);
    expect(summary.transportControlledFindings).toBe(3);
  });

  it("classifies the Supabase root client as root client owner, not bypass", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/lib/supabaseClient.ts",
      source: "return Promise.resolve(supabase.auth.getSession());",
    });
    const summary = evaluateDirectSupabaseGuardrail(findings).summary;

    expect(classifyDirectSupabaseTransportOwner("src/lib/supabaseClient.ts")).toBe("root_client");
    expect(findings).toEqual([
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "auth",
        callTarget: "auth:getSession",
        transportOwner: "root_client",
        expectedTransportOwner: "root client initializer src/lib/supabaseClient.ts",
      }),
    ]);
    expect(summary.serviceBypassFindings).toBe(0);
    expect(summary.transportControlledFindings).toBe(1);
  });

  it("contains known direct Supabase exceptions and fails new unclassified calls", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/screens/example/example.service.ts",
      source: [
        "await supabase.auth.getSession();",
        'await supabase.from("requests").select("*");',
      ].join("\n"),
    });
    const registry = buildDirectSupabaseExceptionRegistry({
      findings,
      generatedAtLocal: "2026-05-08T00:00:00.000Z",
    });

    expect(registry.summary).toEqual(
      expect.objectContaining({
        totalExceptions: 2,
        allowedExceptions: 2,
      }),
    );
    expect(registry.exceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "auth",
          callTarget: "auth:getSession",
          category: "must_stay_direct_for_now",
          allowed: true,
        }),
        expect.objectContaining({
          operation: "read",
          callTarget: "table:requests",
          category: "can_be_migrated_later",
          allowed: true,
        }),
      ]),
    );
    expect(evaluateDirectSupabaseExceptionGuardrail({ findings, registry }).check.status).toBe("pass");

    const newFindings = [
      ...findings,
      ...scanDirectSupabaseSource({
        filePath: "src/screens/example/example.service.ts",
        source: 'await supabase.rpc("new_unclassified_rpc");',
      }),
    ];

    expect(evaluateDirectSupabaseExceptionGuardrail({ findings: newFindings, registry }).check).toEqual(
      expect.objectContaining({
        name: "direct_supabase_exception_registry",
        status: "fail",
      }),
    );
  });

  it("proves the production readonly canary whitelist, blacklist, and redaction contract", () => {
    const result = evaluateProductionReadonlyCanaryGuardrail();

    expect(result.check).toEqual({
      name: "production_readonly_canary_contract",
      status: "pass",
      errors: [],
    });
    expect(result.summary.whitelistRouteCount).toBeGreaterThan(0);
    expect(result.summary.forbiddenMutationOperationCount).toBeGreaterThan(0);
    expect(result.summary.redactionForbiddenKeysEnforced).toBe(true);
  });

  it("fails if cache or rate-limit canary scope broadens", () => {
    const passing = evaluateCacheRateScopeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/rate_limit_real_user_canary.ts") {
          return 'const CANARY_ROUTE = "marketplace.catalog.search" as const;\nconst CANARY_PERCENT = "1";\n';
        }
        if (relativePath === "scripts/cache_one_route_read_through_canary.ts") {
          return 'const CACHE_ENV_WRITE_VALUES = buildCacheReadThroughOneRouteApplyEnv("canary");';
        }
        if (relativePath === "scripts/server/stagingBffServerBoundary.ts") {
          return [
            "buildCacheReadThroughReadinessDiagnostics(config)",
            "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled",
          ].join("\n");
        }
        if (relativePath === "src/shared/scale/providerRuntimeConfig.ts") {
          return "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled";
        }
        return [
              'const DEFAULT_CACHE_SHADOW_ROUTE: CachePolicyRoute = "marketplace.catalog.search";',
              "CACHE_SHADOW_RUNTIME_ENV_NAMES",
              'export const CACHE_READ_THROUGH_APPLY_PATHS = ["canary", "persistent"] as const;',
              "export const buildCacheReadThroughOneRouteApplyEnv = () => ({})",
              "CACHE_READ_THROUGH_ONE_ROUTE_ENV_NAMES.readThroughV1Enabled",
              "const routeAllowed = () => config.routeAllowlist.includes(route);",
              "parseRouteAllowlist(env.SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST);",
              "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST",
              "SCALE_REDIS_CACHE_READ_THROUGH_V1_ENABLED",
              "CACHE_READ_THROUGH_V1_ALLOWED_ROUTES",
              "isCacheReadThroughV1RouteAllowed",
            ].join("\n");
      },
    });

    expect(passing.check.status).toBe("pass");

    const failing = evaluateCacheRateScopeGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath === "scripts/rate_limit_real_user_canary.ts"
          ? 'const CANARY_ROUTE = "proposal.submit" as const;\nconst CANARY_PERCENT = "25";\n'
          : "const routeAllowed = () => true;",
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "cache_canary_not_route_scoped",
        "cache_persistent_readiness_contract_drifted",
        "rate_limit_canary_route_changed:proposal.submit",
        "rate_limit_canary_percent_changed:25",
      ]),
    );
  });

  it("ratchets S_RATE_01 marketplace 1 percent canary proof artifacts", () => {
    const passingMatrix = {
      final_status: "GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS",
      env_snapshot_captured: true,
      env_snapshot_redacted: Object.fromEntries(
        [
          "SCALE_RATE_ENFORCEMENT_MODE",
          "SCALE_RATE_LIMIT_REAL_USER_CANARY_ROUTE_ALLOWLIST",
          "SCALE_RATE_LIMIT_REAL_USER_CANARY_PERCENT",
          "SCALE_RATE_LIMIT_PRODUCTION_ENABLED",
          "SCALE_RATE_LIMIT_STORE_URL",
          "SCALE_RATE_LIMIT_NAMESPACE",
          "BFF_RATE_LIMIT_METADATA_ENABLED",
        ].map((key) => [key, { present: true, valueClass: "present_redacted" }]),
      ),
      route: "marketplace.catalog.search",
      canary_route_class: "marketplace.catalog.search",
      route_allowlist_count: 1,
      route_scoped_enforcement: true,
      global_real_user_enforcement: false,
      canary_percent: 1,
      broad_mutation_route_enforcement: false,
      second_route_enabled: false,
      selected_subject_proof: "selected_redacted",
      selected_canary_request_status_class: "2xx",
      selected_error_category: "none",
      non_selected_subject_proof: "non_selected_redacted",
      non_selected_allow_request_status_class: "2xx",
      non_selected_error_category: "none",
      private_in_service_smoke_green: true,
      synthetic_private_smoke_status_class: "2xx",
      synthetic_private_smoke_error_category: "none",
      synthetic_throttle_still_works: true,
      health_ready_stable: true,
      production_health_before: 200,
      production_ready_before: 200,
      production_health_after_deploy: 200,
      production_ready_after_deploy: 200,
      production_health_after_canary: 200,
      production_ready_after_canary: 200,
      redaction_enabled: true,
      raw_keys_printed: false,
      jwt_printed: false,
      ip_user_company_printed: false,
      secrets_printed: false,
      urls_printed: false,
      raw_payloads_printed: false,
      raw_db_rows_printed: false,
      business_rows_printed: false,
      db_writes: false,
      migrations_applied: false,
      cache_changes: false,
      canary_retained: true,
      rollback_triggered: false,
      rollback_succeeded: false,
    };
    const passingProof = [
      "final_status: GREEN_RATE_LIMIT_1_PERCENT_MARKETPLACE_CANARY_PASS",
      "- route: marketplace.catalog.search",
      "- canary_percent: 1",
      "- selected_subject_proof: selected_redacted",
      "- non_selected_subject_proof: non_selected_redacted",
      "- private_smoke_green: true",
    ].join("\n");
    const passing = evaluateRateLimitMarketplaceCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath.endsWith("_matrix.json") ? JSON.stringify(passingMatrix) : passingProof,
    });

    expect(passing.check).toEqual({
      name: "rate_limit_marketplace_1_percent_canary_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary.routeScoped).toBe(true);
    expect(passing.summary.selectedSubjectProof).toBe(true);
    expect(passing.summary.nonSelectedSubjectProof).toBe(true);
    expect(passing.summary.privateSmokeProof).toBe(true);

    const failing = evaluateRateLimitMarketplaceCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) =>
        relativePath.endsWith("_matrix.json")
          ? JSON.stringify({
              ...passingMatrix,
              route_allowlist_count: 2,
              canary_percent: 5,
              selected_subject_proof: "raw_subject_leaked",
              private_in_service_smoke_green: false,
              secrets_printed: true,
            })
          : "stale proof",
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "rate_limit_marketplace_canary_proof_missing_or_stale",
        "rate_limit_marketplace_canary_scope_not_locked",
        "rate_limit_marketplace_selected_subject_not_proven",
        "rate_limit_marketplace_private_smoke_not_green",
        "rate_limit_marketplace_redaction_or_safety_not_proven",
      ]),
    );
  });

  it("ratchets Wave 27B and 28 marketplace 5 percent proof artifacts", () => {
    const passingMatrix = {
      final_status: "GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE",
      route: "marketplace.catalog.search",
      percent: 5,
      route_allowlist_count: 1,
      retained: true,
      negative_confirmations: {
        all_routes: false,
        ten_percent: false,
        cache_changes: false,
        db_writes: false,
        production_mutations: false,
        raw_subject_user_token_values_printed: false,
      },
      health_ready: {
        before: { health: 200, ready: 200 },
        after_deploy: { health: 200, ready: 200 },
        after: { health: 200, ready: 200 },
      },
      verification: {
        selected_subject_proof: "selected_redacted",
        non_selected_subject_proof: "non_selected_redacted",
        selected_status_class: "2xx",
        non_selected_status_class: "2xx",
        private_smoke_2xx: true,
        wouldAllow: true,
        wouldThrottle: true,
        false_positive_count: 0,
        health_after: 200,
        ready_after: 200,
        metrics_redacted: true,
      },
    };
    const passingMonitor = {
      final_status: "GREEN_RATE_LIMIT_5PCT_MONITOR_WINDOW_STABLE",
      route: "marketplace.catalog.search",
      route_count: 1,
      percent: 5,
      health_after: 200,
      ready_after: 200,
      metrics_redacted: true,
      non_selected_blocked: false,
      private_smoke_2xx: true,
      negative_confirmations: {
        cache_changes: false,
        db_writes: false,
        production_mutations: false,
        raw_subject_user_token_values_printed: false,
      },
    };
    const passingMetrics = {
      sample_size: 10,
      allowed_count: 10,
      throttled_count: 0,
      selected_subject_count: 5,
      non_selected_subject_count: 5,
      selected_blocked_count: 0,
      non_selected_blocked_count: 0,
      false_positive_count: 0,
      private_smoke_status_class: "2xx",
      wouldAllow: true,
      wouldThrottle: true,
    };
    const passingProof = [
      "final_status: GREEN_RATE_LIMIT_5PCT_MARKETPLACE_RAMP_STABLE",
      "- route: marketplace.catalog.search",
      "- percent: 5",
      "- false_positive_count: 0",
    ].join("\n");
    const passing = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("RAMP_RETRY_matrix.json")) return JSON.stringify(passingMatrix);
        if (relativePath.endsWith("MONITOR_WINDOW_matrix.json")) return JSON.stringify(passingMonitor);
        if (relativePath.endsWith("MONITOR_WINDOW_metrics.json")) return JSON.stringify(passingMetrics);
        return passingProof;
      },
    });

    expect(passing.check).toEqual({
      name: "rate_limit_marketplace_5pct_canary_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary.routeScoped).toBe(true);
    expect(passing.summary.falsePositiveCountZero).toBe(true);
    expect(passing.summary.monitorStable).toBe(true);

    const failing = evaluateRateLimitMarketplace5PctCanaryProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("RAMP_RETRY_matrix.json")) {
          return JSON.stringify({
            ...passingMatrix,
            percent: 10,
            route_allowlist_count: 2,
            retained: false,
            negative_confirmations: {
              ...passingMatrix.negative_confirmations,
              ten_percent: true,
              raw_subject_user_token_values_printed: true,
            },
            verification: {
              ...passingMatrix.verification,
              selected_subject_proof: "raw_subject_leaked",
              false_positive_count: 1,
              private_smoke_2xx: false,
            },
          });
        }
        if (relativePath.endsWith("MONITOR_WINDOW_matrix.json")) {
          return JSON.stringify({
            ...passingMonitor,
            non_selected_blocked: true,
            negative_confirmations: {
              ...passingMonitor.negative_confirmations,
              cache_changes: true,
            },
          });
        }
        if (relativePath.endsWith("MONITOR_WINDOW_metrics.json")) {
          return JSON.stringify({
            ...passingMetrics,
            false_positive_count: 1,
            non_selected_blocked_count: 1,
          });
        }
        return "stale proof";
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "rate_limit_marketplace_5pct_proof_missing_or_stale",
        "rate_limit_marketplace_5pct_scope_not_locked",
        "rate_limit_marketplace_5pct_selected_subject_not_proven",
        "rate_limit_marketplace_5pct_false_positive_nonzero",
        "rate_limit_marketplace_5pct_redaction_or_safety_not_proven",
        "rate_limit_marketplace_5pct_monitor_not_stable",
      ]),
    );
  });

  it("ratchets deterministic cache cold-miss proof artifacts and invariants", () => {
    const passing = evaluateCacheColdMissProofGuardrail({ projectRoot: process.cwd() });

    expect(passing.check).toEqual({
      name: "cache_cold_miss_deterministic_proof",
      status: "pass",
      errors: [],
    });
    expect(passing.summary).toEqual(
      expect.objectContaining({
        proofTestPresent: true,
        matrixArtifactPresent: true,
        proofArtifactPresent: true,
        matrixStatus: "GREEN_CACHE_COLD_MISS_DETERMINISTIC_PROOF_READY",
        deterministicProofReady: true,
        knownEmptyKeyProof: true,
        firstMissSecondHitProof: true,
        utf8SafeProof: true,
        metricsRedactedProof: true,
        routeScopeUnchanged: true,
        rollbackSafeProof: true,
        productionCacheStillDisabled: true,
      }),
    );

    const failing = evaluateCacheColdMissProofGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "tests/scale/cacheColdMissDeterministicProof.test.ts") {
          return "describe('S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF', () => undefined);";
        }
        if (relativePath === "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_proof.md") {
          return "# weakened proof";
        }
        if (relativePath === "artifacts/S_CACHE_01_COLD_MISS_DETERMINISTIC_PROOF_matrix.json") {
          return JSON.stringify({
            status: "BLOCKED_NO_SAFE_COLD_MISS_PROOF",
            baseline: {
              productionCacheEnabled: false,
              readThroughV1DefaultEnabled: false,
              cachePoliciesDefaultEnabled: false,
            },
            proofStrategy: {
              knownEmptyBeforeFirstRequest: false,
              utf8Safe: false,
              metricsRedacted: false,
              routeMetricsRedactionSafe: false,
              rawCacheKeyReturned: true,
              rawPayloadLogged: true,
              piiLogged: true,
            },
            routeScope: {
              readThroughAllowedRoutes: ["marketplace.catalog.search", "request.proposal.list"],
              publicCatalogReadThroughRoutes: ["marketplace.catalog.search"],
              routeExpansion: true,
              readRoutesCacheDefaultEnabled: true,
            },
            rollbackAndInvalidation: {
              cacheInvalidationExecutionEnabledByDefault: true,
              rollbackDeletedEntries: 0,
              postRollbackReadNull: false,
              dbWrites: true,
            },
            beforeAfterMetrics: {
              after: {
                deterministicColdMissProof: false,
                knownEmptyKeyProof: false,
                firstMissSecondHitProof: false,
                utf8SafeProof: false,
                rollbackSafeProof: false,
                missCount: 0,
                hitCount: 0,
                readThroughCount: 0,
                providerCalls: 2,
              },
            },
            safety: {
              productionCacheEnabled: false,
              cacheLeftEnabled: false,
              broadCacheConfigChange: false,
            },
          });
        }
        throw new Error(`Unexpected file ${relativePath}`);
      },
    });

    expect(failing.check.status).toBe("fail");
    expect(failing.check.errors).toEqual(
      expect.arrayContaining([
        "cache_cold_miss_proof_test_missing_or_weakened",
        "cache_cold_miss_proof_artifact_missing_or_weakened",
        "cache_cold_miss_status_not_ready:BLOCKED_NO_SAFE_COLD_MISS_PROOF",
        "cache_cold_miss_known_empty_key_not_proven",
        "cache_cold_miss_first_miss_second_hit_not_proven",
        "cache_cold_miss_utf8_not_proven",
        "cache_cold_miss_metrics_not_redaction_safe",
        "cache_cold_miss_route_scope_changed",
        "cache_cold_miss_rollback_not_safe",
      ]),
    );
  });

  it("blocks raw production infinite loops with readable owner failures", () => {
    const findings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: [
        "export async function runExampleWorker() {",
        "  while (true) {",
        "    await doWork();",
        "  }",
        "}",
        "export function spin() { for (;;) break; }",
      ].join("\n"),
    });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/workers/exampleWorker.ts",
        line: 2,
        pattern: "while_true",
        matchedLoop: "while (true)",
        allowlisted: false,
        owner: null,
      }),
      expect.objectContaining({
        file: "src/workers/exampleWorker.ts",
        line: 6,
        pattern: "for_ever",
        matchedLoop: "for (;;)",
        allowlisted: false,
        owner: null,
      }),
    ]);

    const guardrail = evaluateProductionRawLoopGuardrail({ findings });
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "production_raw_loop_boundary",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "production_raw_loop:file=src/workers/exampleWorker.ts:line=2:matched_loop=while (true):expected=cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage",
        "production_raw_loop:file=src/workers/exampleWorker.ts:line=6:matched_loop=for (;;):expected=cancellable worker loop primitive or explicit allowlist with reason, owner, and test coverage",
        "production_raw_loop_budget_exceeded:2>0",
      ]),
    );
  });

  it("requires reason, owner, and test coverage for any explicit raw-loop allowlist", () => {
    const allowlist = [
      {
        file: "src/workers/exampleWorker.ts",
        line: 1,
        pattern: "while_true" as const,
        reason: "bounded by external blocking read and abort signal",
        owner: "platform-workers",
        testCoverage: "tests/workers/exampleWorker.contract.test.ts",
      },
    ];
    const findings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: "while (true) await next();",
      allowlist,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        allowlisted: true,
        reason: "bounded by external blocking read and abort signal",
        owner: "platform-workers",
        testCoverage: "tests/workers/exampleWorker.contract.test.ts",
      }),
    ]);
    expect(evaluateProductionRawLoopGuardrail({ findings, allowlist }).check.status).toBe("pass");

    const invalidAllowlist = [{ ...allowlist[0], owner: "" }];
    const invalidFindings = scanProductionRawLoopSource({
      file: "src/workers/exampleWorker.ts",
      source: "while (true) await next();",
      allowlist: invalidAllowlist,
    });

    expect(evaluateProductionRawLoopGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "production_raw_loop_allowlist_missing_metadata:file=src/workers/exampleWorker.ts:line=1:pattern=while_true",
      ]),
    );
  });

  it("keeps production src raw infinite loop inventory at zero", () => {
    const findings = scanProductionRawLoops(process.cwd());
    const guardrail = evaluateProductionRawLoopGuardrail({ findings });

    expect(findings).toEqual([]);
    expect(guardrail.summary).toMatchObject({
      rawLoopBudget: 0,
      totalFindings: 0,
      unapprovedFindings: 0,
      allowlistedFindings: 0,
      allowlistEntries: 0,
    });
    expect(guardrail.check.status).toBe("pass");
  });

  it("fails on new unbounded runtime list selects", () => {
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/api/example.transport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist: [],
    });
    const guardrail = evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist: [] });

    expect(findings).toEqual([
      expect.objectContaining({
        file: "src/lib/api/example.transport.ts",
        queryType: "list",
        action: "fix_now",
        selectStar: false,
      }),
    ]);
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "unbounded_select_ratchet",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("unbounded_select:file=src/lib/api/example.transport.ts:line=1:action=fix_now"),
        "unbounded_select_budget_exceeded:1>0",
      ]),
    );
  });

  it("allows documented export allowlist entries and rejects missing metadata", () => {
    const allowlist: UnboundedSelectAllowlistEntry[] = [
      {
        file: "src/lib/pdf/exampleReport.ts",
        line: 1,
        queryString: "id, title",
        action: "export_allowlist",
        owner: "report export owner",
        reason: "Report export needs the selected rows to preserve document output.",
        migrationPath: "Move the report export behind a typed RPC/view contract.",
      },
    ];
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/pdf/exampleReport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist,
    });

    expect(findings).toEqual([
      expect.objectContaining({
        action: "export_allowlist",
        allowlisted: true,
        owner: "report export owner",
        migrationPath: "Move the report export behind a typed RPC/view contract.",
      }),
    ]);
    expect(evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist }).check).toEqual({
      name: "unbounded_select_ratchet",
      status: "pass",
      errors: [],
    });

    const invalidAllowlist = [{ ...allowlist[0], owner: "" }];
    const invalidFindings = scanUnboundedSelectRatchetSource({
      file: "src/lib/pdf/exampleReport.ts",
      source: 'await supabase.from("requests").select("id, title").order("created_at");',
      allowlist: invalidAllowlist,
    });

    expect(evaluateUnboundedSelectRatchetGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "unbounded_select_allowlist_missing_metadata:file=src/lib/pdf/exampleReport.ts:line=1:action=export_allowlist",
      ]),
    );
  });

  it("fails on undocumented select-star projections even when otherwise bounded", () => {
    const findings = scanUnboundedSelectRatchetSource({
      file: "src/lib/api/example.transport.ts",
      source: 'await supabase.from("requests").select("*").limit(1);',
      allowlist: [],
    });
    const guardrail = evaluateUnboundedSelectRatchetGuardrail({ findings, allowlist: [] });

    expect(findings).toEqual([
      expect.objectContaining({
        action: "already_bounded",
        selectStar: true,
      }),
    ]);
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("select_star:file=src/lib/api/example.transport.ts:line=1:action=already_bounded"),
        "select_star_budget_exceeded:1>0",
      ]),
    );
  });

  it("blocks unsafe casts with readable ratchet and critical-folder failures", () => {
    const asAnyText = ["as", "any"].join(" ");
    const tsIgnoreText = ["@ts", "ignore"].join("-");
    const silentCatchText = ["catch", "{}"].join(" ");
    const unknownAsText = ["unknown", "as"].join(" ");
    const findings = scanUnsafeCastSource({
      file: "src/lib/workers/exampleWorker.ts",
      source: [
        `const value = payload ${asAnyText};`,
        tsIgnoreText,
        `try { runWorker(); } ${silentCatchText}`,
        `const row = payload ${unknownAsText} WorkerRow;`,
      ].join("\n"),
    });
    const baseline = {
      total: 0,
      productionSource: 0,
      testSource: 0,
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      productionByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      testByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      criticalFolderByPattern: [
        {
          folder: "src/lib/workers",
          byPattern: {
            as_any: 0,
            ts_ignore: 0,
            silent_catch: 0,
            unsafe_unknown_as: 0,
          },
        },
      ],
    };
    const guardrail = evaluateUnsafeCastRatchetGuardrail({ findings, baseline });

    expect(findings).toHaveLength(4);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          file: "src/lib/workers/exampleWorker.ts",
          line: 1,
          pattern: "as_any",
          matchedText: asAnyText,
          scope: "production_source",
          criticalFolder: "src/lib/workers",
        }),
        expect.objectContaining({
          line: 2,
          pattern: "ts_ignore",
          matchedText: tsIgnoreText,
        }),
        expect.objectContaining({
          line: 3,
          pattern: "silent_catch",
          matchedText: silentCatchText,
        }),
        expect.objectContaining({
          line: 4,
          pattern: "unsafe_unknown_as",
          matchedText: unknownAsText,
        }),
      ]),
    );
    expect(guardrail.check).toEqual(
      expect.objectContaining({
        name: "unsafe_cast_ratchet_contract",
        status: "fail",
      }),
    );
    expect(guardrail.check.errors).toEqual(
      expect.arrayContaining([
        "unsafe_cast_total_ratchet_exceeded:4>0",
        expect.stringContaining("unsafe_cast_critical_folder_violation:file=src/lib/workers/exampleWorker.ts:line=1"),
        expect.stringContaining(`matched=${asAnyText}`),
      ]),
    );
  });

  it("requires reason, owner, and expiration or migration wave for unsafe-cast allowlists", () => {
    const unknownAsText = ["unknown", "as"].join(" ");
    const pattern: UnsafeCastPattern = "unsafe_unknown_as";
    const allowlist = [
      {
        file: "src/lib/api/example.ts",
        line: 1,
        pattern,
        reason: "legacy provider payload narrowed in wave follow-up",
        owner: "api-transport",
        migrationWave: "S_AUDIT_NIGHT_BATTLE_138",
      },
    ];
    const findings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const row = payload ${unknownAsText} ExampleRow;`,
      allowlist,
    });
    const baseline = {
      total: 1,
      productionSource: 1,
      testSource: 0,
      byPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 1,
      },
      productionByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 1,
      },
      testByPattern: {
        as_any: 0,
        ts_ignore: 0,
        silent_catch: 0,
        unsafe_unknown_as: 0,
      },
      criticalFolderByPattern: [
        {
          folder: "src/lib/api",
          byPattern: {
            as_any: 0,
            ts_ignore: 0,
            silent_catch: 0,
            unsafe_unknown_as: 1,
          },
        },
      ],
    };

    expect(findings).toEqual([
      expect.objectContaining({
        allowlisted: true,
        reason: "legacy provider payload narrowed in wave follow-up",
        owner: "api-transport",
        migrationWave: "S_AUDIT_NIGHT_BATTLE_138",
      }),
    ]);
    expect(evaluateUnsafeCastRatchetGuardrail({ findings, allowlist, baseline }).check.status).toBe("pass");

    const invalidAllowlist = [{ ...allowlist[0], owner: "", migrationWave: "" }];
    const invalidFindings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const row = payload ${unknownAsText} ExampleRow;`,
      allowlist: invalidAllowlist,
    });

    expect(evaluateUnsafeCastRatchetGuardrail({
      findings: invalidFindings,
      allowlist: invalidAllowlist,
      baseline,
    }).check.errors).toEqual(
      expect.arrayContaining([
        "unsafe_cast_allowlist_missing_metadata:file=src/lib/api/example.ts:line=1:pattern=unsafe_unknown_as",
      ]),
    );
  });

  it("separates test findings from production findings and ignores guarded unknown casts", () => {
    const asAnyText = ["as", "any"].join(" ");
    const unknownAsText = ["unknown", "as"].join(" ");
    const testFindings = scanUnsafeCastSource({
      file: "tests/example/example.contract.test.ts",
      source: `const value = payload ${asAnyText};`,
    });
    const guardedFindings = scanUnsafeCastSource({
      file: "src/lib/api/example.ts",
      source: `const query = createGuardedPagedQuery(payload ${unknownAsText} Query, isExampleRow, "example");`,
    });

    expect(testFindings).toEqual([
      expect.objectContaining({
        pattern: "as_any",
        scope: "test_source",
        criticalFolder: null,
      }),
    ]);
    expect(guardedFindings).toEqual([]);
  });

  it("reports component line and hook pressure without failing the build", () => {
    const entry = scanComponentDebtSource({
      file: "src/screens/example/LargeScreen.tsx",
      source: [
        "export function LargeScreen() {",
        "  useEffect(() => undefined, []);",
        "  useMemo(() => 1, []);",
        "  return null;",
        "}",
      ].join("\n"),
    });

    expect(entry).toEqual({
      file: "src/screens/example/LargeScreen.tsx",
      lineCount: 5,
      hookCount: 2,
    });
  });
});
