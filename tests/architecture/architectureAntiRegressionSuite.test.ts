import {
  buildDirectSupabaseExceptionRegistry,
  evaluateCacheRateScopeGuardrail,
  evaluateDirectSupabaseGuardrail,
  evaluateDirectSupabaseExceptionGuardrail,
  evaluateProductionReadonlyCanaryGuardrail,
  scanComponentDebtSource,
  scanDirectSupabaseSource,
} from "../../scripts/architecture_anti_regression_suite";

describe("architecture anti-regression suite", () => {
  it("classifies direct Supabase service bypasses and enforces the budget", () => {
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
        classification: "service_bypass",
      }),
      expect.objectContaining({
        file: "src/screens/example/example.service.ts",
        line: 2,
        operation: "rpc",
        callTarget: "rpc:request_update_v1",
        classification: "service_bypass",
      }),
    ]);

    expect(evaluateDirectSupabaseGuardrail(findings, 1).check).toEqual({
      name: "direct_supabase_service_bypass_budget",
      status: "fail",
      errors: ["service_bypass_budget_exceeded:2>1"],
    });
    expect(evaluateDirectSupabaseGuardrail(findings, 2).check.status).toBe("pass");
  });

  it("keeps transport-controlled Supabase calls out of the service-bypass budget", () => {
    const findings = scanDirectSupabaseSource({
      filePath: "src/lib/catalog/catalog.transport.supabase.ts",
      source: 'return await supabase.rpc("rik_quick_search", args);',
    });
    const summary = evaluateDirectSupabaseGuardrail(findings, 0).summary;

    expect(findings[0]).toEqual(
      expect.objectContaining({
        classification: "transport_controlled",
        operation: "rpc",
      }),
    );
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
