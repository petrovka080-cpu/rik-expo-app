import { resolveAiDirectorCrossDomainEvidence } from "../../src/features/ai/director/aiDirectorCrossDomainEvidence";
import { scoreAiDirectorRiskPriority } from "../../src/features/ai/director/aiDirectorRiskPriorityScoring";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("AI director risk priority scoring", () => {
  it("scores procurement, warehouse, finance, and foreman next actions deterministically", () => {
    const evidence = resolveAiDirectorCrossDomainEvidence({
      auth: directorAuth,
      screenId: "ai.command_center",
    });
    const scoring = scoreAiDirectorRiskPriority(evidence);

    expect(scoring.status).toBe("scored");
    expect(scoring.riskPriorityScored).toBe(true);
    expect(scoring.evidenceBacked).toBe(true);
    expect(scoring.domainScores).toHaveLength(4);
    expect(scoring.domainScores.map((score) => score.domain).sort()).toEqual([
      "finance",
      "foreman",
      "procurement",
      "warehouse",
    ]);
    expect(scoring.domainScores.map((score) => score.priorityScore)).toEqual(
      [...scoring.domainScores.map((score) => score.priorityScore)].sort((left, right) => right - left),
    );
    expect(scoring.topDomain).not.toBeNull();
    expect(scoring.highRiskDomains.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps every risk signal evidence-backed and approval-only", () => {
    const evidence = resolveAiDirectorCrossDomainEvidence({
      auth: directorAuth,
      screenId: "director.dashboard",
    });
    const scoring = scoreAiDirectorRiskPriority(evidence);
    const signals = scoring.domainScores.flatMap((score) => score.signals);

    expect(signals.length).toBeGreaterThanOrEqual(4);
    expect(signals.every((signal) => signal.evidenceRefs.length > 0)).toBe(true);
    expect(signals.every((signal) => signal.approvalRequired)).toBe(true);
    expect(signals.every((signal) => signal.directExecuteAllowed === false)).toBe(true);
    expect(scoring.noDirectExecute).toBe(true);
    expect(scoring.noDirectFinanceProcurementWarehouseMutation).toBe(true);
    expect(scoring.providerCalled).toBe(false);
    expect(scoring.mutationCount).toBe(0);
  });
});
