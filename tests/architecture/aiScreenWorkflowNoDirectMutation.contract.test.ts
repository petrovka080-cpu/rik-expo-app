import { verifyAiScreenWorkflowButtonContract } from "../../src/features/ai/screenWorkflows/aiScreenWorkflowButtonContract";

describe("AI screen workflows have no direct dangerous mutation", () => {
  it("keeps every action non-direct and approval routes ledger-backed", () => {
    const summary = verifyAiScreenWorkflowButtonContract();

    expect(summary.ok).toBe(true);
    expect(summary.directDangerousMutationPathsFound).toBe(0);
    expect(summary.approvalRequiredActionsRouteToLedger).toBe(true);
  });
});
