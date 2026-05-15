import {
  AI_DIRECTOR_EXECUTIVE_DOMAINS,
  AI_DIRECTOR_EXECUTIVE_SCREEN_IDS,
  resolveAiDirectorCrossDomainEvidence,
} from "../../src/features/ai/director/aiDirectorCrossDomainEvidence";

const directorAuth = { userId: "director-user", role: "director" } as const;

describe("AI director cross-domain evidence", () => {
  it("covers executive screens and all required operational domains from audited evidence", () => {
    const evidence = resolveAiDirectorCrossDomainEvidence({
      auth: directorAuth,
      screenId: "ai.command_center",
    });

    expect(evidence.status).toBe("loaded");
    expect(evidence.coveredExecutiveScreens).toEqual(AI_DIRECTOR_EXECUTIVE_SCREEN_IDS);
    expect(evidence.domainSummaries.map((summary) => summary.domain).sort()).toEqual(
      [...AI_DIRECTOR_EXECUTIVE_DOMAINS].sort(),
    );
    expect(evidence.coversDirectorDashboard).toBe(true);
    expect(evidence.coversDirectorFinance).toBe(true);
    expect(evidence.coversDirectorReports).toBe(true);
    expect(evidence.coversAiCommandCenter).toBe(true);
    expect(evidence.coversProcurement).toBe(true);
    expect(evidence.coversWarehouse).toBe(true);
    expect(evidence.coversFinance).toBe(true);
    expect(evidence.coversForeman).toBe(true);
    expect(evidence.evidenceBacked).toBe(true);
    expect(evidence.domainSummaries.every((summary) => summary.safeReadReady)).toBe(true);
    expect(evidence.domainSummaries.every((summary) => summary.approvalReady)).toBe(true);
    expect(evidence.domainSummaries.every((summary) => summary.evidenceRefs.length > 0)).toBe(true);
  });

  it("keeps evidence redacted, read-only, and non-mutating", () => {
    const evidence = resolveAiDirectorCrossDomainEvidence({
      auth: directorAuth,
      screenId: "director.dashboard",
    });

    expect(evidence.safeReadOnly).toBe(true);
    expect(evidence.approvalRequiredOnly).toBe(true);
    expect(evidence.noDirectExecute).toBe(true);
    expect(evidence.noDirectFinanceProcurementWarehouseMutation).toBe(true);
    expect(evidence.directExecuteAllowed).toBe(false);
    expect(evidence.directMutationAllowed).toBe(false);
    expect(evidence.mutationCount).toBe(0);
    expect(evidence.dbWrites).toBe(0);
    expect(evidence.providerCalled).toBe(false);
    expect(evidence.rawRowsReturned).toBe(false);
    expect(evidence.rawPromptReturned).toBe(false);
    expect(evidence.rawProviderPayloadReturned).toBe(false);
    expect(evidence.evidenceRefs.every((ref) => ref.redacted && !ref.rawRowsReturned)).toBe(true);
  });

  it("blocks non-director roles instead of leaking executive evidence", () => {
    const blocked = resolveAiDirectorCrossDomainEvidence({
      auth: { userId: "buyer-user", role: "buyer" },
      screenId: "director.finance",
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.exactReason).toContain("director or control");
    expect(blocked.directExecuteAllowed).toBe(false);
    expect(blocked.mutationCount).toBe(0);
  });
});
