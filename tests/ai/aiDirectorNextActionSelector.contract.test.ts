import { resolveAiDirectorCrossDomainEvidence } from "../../src/features/ai/director/aiDirectorCrossDomainEvidence";
import { selectAiDirectorNextActions } from "../../src/features/ai/director/aiDirectorNextActionSelector";
import { scoreAiDirectorRiskPriority } from "../../src/features/ai/director/aiDirectorRiskPriorityScoring";

const directorAuth = { userId: "director-user", role: "director" } as const;

function select() {
  const evidence = resolveAiDirectorCrossDomainEvidence({
    auth: directorAuth,
    screenId: "ai.command_center",
  });
  const scoring = scoreAiDirectorRiskPriority(evidence);
  return selectAiDirectorNextActions({ auth: directorAuth, evidence, scoring, limit: 4 });
}

describe("AI director next action selector", () => {
  it("returns approval-required next actions across procurement, warehouse, finance, and foreman", () => {
    const selector = select();

    expect(selector.status).toBe("selected");
    expect(selector.cards).toHaveLength(4);
    expect(selector.coversProcurement).toBe(true);
    expect(selector.coversWarehouse).toBe(true);
    expect(selector.coversFinance).toBe(true);
    expect(selector.coversForeman).toBe(true);
    expect([...selector.selectedDomains].sort()).toEqual([
      "finance",
      "foreman",
      "procurement",
      "warehouse",
    ]);
    expect(selector.approvalActionIds).toEqual(
      expect.arrayContaining([
        "ai.command_center.approval",
        "director.finance.approval",
        "director.reports.approval",
      ]),
    );
  });

  it("routes every next action through approval candidates with no direct execution", () => {
    const selector = select();

    expect(selector.allCardsHaveEvidence).toBe(true);
    expect(selector.allCardsHaveApprovalCandidates).toBe(true);
    expect(selector.cards.every((card) => card.suggestedMode === "approval_required")).toBe(true);
    expect(selector.cards.every((card) => card.approvalCandidate.status === "ready")).toBe(true);
    expect(selector.cards.every((card) => card.approvalCandidate.route?.routeStatus === "ready")).toBe(true);
    expect(selector.cards.every((card) => card.approvalCandidate.executeOnlyAfterApprovedStatus)).toBe(true);
    expect(selector.cards.every((card) => card.directExecuteAllowed === false)).toBe(true);
    expect(selector.cards.every((card) => card.directMutationAllowed === false)).toBe(true);
    expect(selector.noDirectExecute).toBe(true);
    expect(selector.noDirectFinanceProcurementWarehouseMutation).toBe(true);
    expect(selector.finalExecution).toBe(0);
    expect(selector.mutationCount).toBe(0);
  });
});
