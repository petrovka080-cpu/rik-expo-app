import {
  SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY,
  getRateEnforcementPolicy,
  validateRateEnforcementPolicy,
} from "../../src/shared/scale/rateLimitPolicies";
import {
  GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY,
  verifySupabaseRpcRateLimitDiscipline,
} from "../../scripts/architecture/verifySupabaseRpcRateLimitDiscipline";

describe("architecture: Supabase RPC rate-limit discipline", () => {
  it("classifies every production RPC entrypoint without findings", () => {
    const verification = verifySupabaseRpcRateLimitDiscipline(process.cwd());

    expect(verification.final_status).toBe(
      GREEN_SCALE_RPC_RATE_LIMIT_DISCIPLINE_READY,
    );
    expect(verification.findings).toEqual([]);
    expect(verification.metrics.directSupabaseRpcCalls).toBeGreaterThan(0);
    expect(verification.metrics.wrapperRpcEntrypoints).toBeGreaterThan(0);
    expect(verification.metrics.remainingUnclassifiedRpcNames).toEqual([]);
    expect(verification.metrics.remainingUnclassifiedDynamicRpcCalls).toEqual(
      [],
    );
    expect(verification.metrics.literalRpcNamesClassified).toBe(
      verification.metrics.uniqueLiteralRpcNames,
    );
  });

  it("requires every list-like RPC entrypoint to map to a valid rate policy", () => {
    const verification = verifySupabaseRpcRateLimitDiscipline(process.cwd());
    const listLikeEntries = verification.classifiedEntries.filter((entry) =>
      [
        "bounded_list",
        "bounded_search",
        "legacy_list_migration_guard",
        "parent_scoped_read",
        "aggregate_read",
      ].includes(entry.policy.classification),
    );

    expect(listLikeEntries.length).toBeGreaterThan(0);
    expect(verification.metrics.listLikeRpcWithRatePolicy).toBe(
      listLikeEntries.length,
    );
    for (const entry of listLikeEntries) {
      expect(entry.policy.rateEnforcementOperation).not.toBeNull();
      const policy = getRateEnforcementPolicy(
        entry.policy.rateEnforcementOperation!,
      );
      expect(policy).not.toBeNull();
      expect(validateRateEnforcementPolicy(policy!)).toBe(true);
    }
  });

  it("keeps unbounded legacy and parent-scoped reads explicit with migration targets", () => {
    const verification = verifySupabaseRpcRateLimitDiscipline(process.cwd());
    const guardedReads = verification.classifiedEntries.filter(
      (entry) =>
        [
          "legacy_list_migration_guard",
          "parent_scoped_read",
          "aggregate_read",
        ].includes(entry.policy.classification) &&
        !entry.policy.boundedArgsRequired,
    );

    expect(guardedReads.length).toBeGreaterThan(0);
    for (const entry of guardedReads) {
      expect(entry.policy.migrationTarget).toEqual(expect.any(String));
      expect(entry.policy.reason.length).toBeGreaterThanOrEqual(24);
      expect(entry.policy.reason).not.toMatch(/whitelist|ignore entire file/i);
    }
  });

  it("uses exact dynamic boundary classifications instead of broad whitelists", () => {
    const verification = verifySupabaseRpcRateLimitDiscipline(process.cwd());
    const dynamicBoundaries = [
      ...verification.dynamicDirectBoundaries,
      ...verification.dynamicWrapperBoundaries,
    ];

    expect(dynamicBoundaries.length).toBe(
      verification.metrics.dynamicRpcCallsClassified,
    );
    for (const boundary of dynamicBoundaries) {
      expect(boundary.file).toMatch(/^src\//);
      expect(boundary.line).toBeGreaterThan(0);
      expect(boundary.reason.length).toBeGreaterThanOrEqual(24);
      expect(boundary.owner).not.toMatch(/\b(?:all|any|wildcard|broad)\b/i);
      if (boundary.classification !== "compat_transport") {
        expect(boundary.possibleRpcNames.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the RPC rate-limit registry disabled-by-default and tied to existing policies", () => {
    const rpcNames = SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY.map(
      (entry) => entry.rpcName,
    );

    expect(new Set(rpcNames).size).toBe(rpcNames.length);
    for (const entry of SUPABASE_RPC_RATE_LIMIT_POLICY_REGISTRY) {
      expect(entry.defaultEnabled).toBe(false);
      expect(entry.enforcementEnabledByDefault).toBe(false);
      if (entry.rateEnforcementOperation) {
        const policy = getRateEnforcementPolicy(entry.rateEnforcementOperation);
        expect(policy).not.toBeNull();
        expect(validateRateEnforcementPolicy(policy!)).toBe(true);
      }
    }
  });
});
