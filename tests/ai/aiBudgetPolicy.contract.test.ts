import {
  enforceAiBudgetPolicy,
  resolveAiBudgetPolicyForActionKind,
  verifyAiBudgetPolicyCoverage,
} from "../../src/features/ai/observability/aiBudgetPolicy";
import { listAiRolePermissionActionMatrixEntries } from "../../src/features/ai/security/aiRolePermissionActionMatrix";

describe("AI budget policy", () => {
  it("covers every audited action with bounded cards, evidence, provider payload, timeout, and retry policy", () => {
    const entries = listAiRolePermissionActionMatrixEntries();
    const summary = verifyAiBudgetPolicyCoverage(entries);

    expect(entries).toHaveLength(112);
    expect(summary.coverageComplete).toBe(true);
    expect(summary.coveredActions).toBe(112);
    expect(summary.missingBudgetActions).toEqual([]);
    expect(summary.unsafeBudgetActions).toEqual([]);
    expect(summary.policies.every((policy) => policy.timeoutMs <= 6000)).toBe(true);
    expect(summary.policies.every((policy) => policy.retryPolicy.maxAttempts <= 2)).toBe(true);
    expect(summary.policies.every((policy) => policy.rawProviderPayloadStorageAllowed === false)).toBe(true);
  });

  it("keeps forbidden actions on a zero-card, no-provider budget", () => {
    const policy = resolveAiBudgetPolicyForActionKind("forbidden");

    expect(policy).toMatchObject({
      actionKind: "forbidden",
      maxCards: 0,
      maxProviderPayloadBytes: 0,
      timeoutMs: 0,
      rawPromptLoggingAllowed: false,
      rawProviderPayloadStorageAllowed: false,
      rawDbRowsAllowed: false,
      dbWritesAllowed: false,
    });
  });

  it("clamps requested output and reports provider payload overages", () => {
    const decision = enforceAiBudgetPolicy({
      actionKind: "approval_required",
      requestedCards: 10,
      requestedEvidenceItems: 20,
      providerPayloadBytes: 4096,
    });

    expect(decision.acceptedCards).toBe(3);
    expect(decision.acceptedEvidenceItems).toBe(12);
    expect(decision.providerPayloadWithinBudget).toBe(false);
    expect(decision.withinBudget).toBe(false);
    expect(decision.violations).toEqual(
      expect.arrayContaining([
        "cards_exceed_budget",
        "evidence_items_exceed_budget",
        "provider_payload_exceeds_budget",
      ]),
    );
  });
});
