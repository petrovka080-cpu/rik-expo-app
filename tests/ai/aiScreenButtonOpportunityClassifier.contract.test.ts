import {
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";
import {
  classifyAiScreenButtonOpportunity,
  isApprovalRequiredDirectExecutionBlocked,
  isDraftOnlyFinalSubmitBlocked,
} from "../../src/features/ai/screenAudit/aiScreenButtonOpportunityClassifier";

describe("AI screen button opportunity classifier", () => {
  const entries = listAiScreenButtonRoleActionEntries();

  it("classifies safe-read actions as evidence-backed and non-mutating", () => {
    const safeRead = entries.find((entry) => entry.actionKind === "safe_read");
    expect(safeRead).toBeDefined();

    const classification = classifyAiScreenButtonOpportunity(safeRead!);
    expect(classification).toMatchObject({
      actionKind: "safe_read",
      mutationRisk: "none",
      canExecuteDirectly: false,
      requiresEvidence: true,
      requiresApprovalLedger: false,
    });
  });

  it("keeps draft-only actions from final submit", () => {
    const draft = entries.find((entry) => entry.actionKind === "draft_only");
    expect(draft).toBeDefined();

    const classification = classifyAiScreenButtonOpportunity(draft!);
    expect(classification.canExecuteDirectly).toBe(false);
    expect(classification.mutationRisk).toBe("draft");
    expect(isDraftOnlyFinalSubmitBlocked(draft!)).toBe(true);
  });

  it("keeps approval-required actions behind ledger/BFF route coverage", () => {
    const approval = entries.find((entry) => entry.actionKind === "approval_required");
    expect(approval).toBeDefined();

    const classification = classifyAiScreenButtonOpportunity(approval!);
    expect(classification).toMatchObject({
      actionKind: "approval_required",
      canExecuteDirectly: false,
      requiresApprovalLedger: true,
    });
    expect(isApprovalRequiredDirectExecutionBlocked(approval!)).toBe(true);
  });

  it("marks forbidden actions as no-opportunity direct execution blockers", () => {
    const forbidden = entries.find((entry) => entry.actionKind === "forbidden");
    expect(forbidden).toBeDefined();

    const classification = classifyAiScreenButtonOpportunity(forbidden!);
    expect(classification).toMatchObject({
      actionKind: "forbidden",
      aiOpportunity: "none",
      mutationRisk: "forbidden_direct_mutation",
      canExecuteDirectly: false,
    });
    expect(classification.exactReason).toBeTruthy();
  });
});
