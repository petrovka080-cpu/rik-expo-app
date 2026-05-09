import {
  buildDirectSupabaseExceptionRegistry,
  classifyDirectSupabaseTransportOwner,
  evaluateCacheRateScopeGuardrail,
  evaluateDirectSupabaseGuardrail,
  evaluateDirectSupabaseExceptionGuardrail,
  evaluateProductionRawLoopGuardrail,
  evaluateProductionReadonlyCanaryGuardrail,
  formatDirectSupabaseServiceBypassFailure,
  scanComponentDebtSource,
  scanDirectSupabaseSource,
  scanProductionRawLoopSource,
  scanProductionRawLoops,
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
      readFile: (relativePath) =>
        relativePath === "scripts/rate_limit_real_user_canary.ts"
          ? 'const CANARY_ROUTE = "marketplace.catalog.search" as const;\nconst CANARY_PERCENT = "1";\n'
          : [
              'const DEFAULT_CACHE_SHADOW_ROUTE: CachePolicyRoute = "marketplace.catalog.search";',
              "const routeAllowed = () => config.routeAllowlist.includes(route);",
              "parseRouteAllowlist(env.SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST);",
              "SCALE_REDIS_CACHE_SHADOW_ROUTE_ALLOWLIST",
            ].join("\n"),
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
        "rate_limit_canary_route_changed:proposal.submit",
        "rate_limit_canary_percent_changed:25",
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
