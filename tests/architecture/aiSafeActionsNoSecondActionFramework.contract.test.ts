import { getAiSafeActionExistingApprovalLedgerContract, scanAiSafeActionPatchPatterns } from "../../src/lib/ai/safeActions";

describe("AI safe actions no second action framework", () => {
  it("uses the existing approval ledger contract and no standalone action runtime", () => {
    expect(getAiSafeActionExistingApprovalLedgerContract()).toMatchObject({
      submitEndpoint: "POST /agent/action/submit-for-approval",
      finalExecution: false,
      directDomainMutation: false,
    });
    expect(scanAiSafeActionPatchPatterns().secondActionFrameworkFound).toBe(0);
  });
});
