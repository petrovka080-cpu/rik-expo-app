import { verifyAiScreenWorkflowButtonContract } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowButtonContract";

describe("AI screen workflow button coverage", () => {
  it("checks every workflow button against audit, BFF blockers and approval ledger", () => {
    const summary = verifyAiScreenWorkflowButtonContract();

    expect(summary.ok).toBe(true);
    expect(summary.screensChecked).toBe(28);
    expect(summary.buttonsChecked).toBeGreaterThanOrEqual(112);
    expect(summary.safeReadButtons).toBeGreaterThan(0);
    expect(summary.draftOnlyButtons).toBeGreaterThan(0);
    expect(summary.approvalRequiredButtons).toBeGreaterThan(0);
    expect(summary.forbiddenButtons).toBeGreaterThan(0);
    expect(summary.issues).toEqual([]);
  });
});
