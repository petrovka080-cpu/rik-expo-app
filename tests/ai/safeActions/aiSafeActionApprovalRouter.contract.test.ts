import { getAiSafeActionExistingApprovalLedgerContract, routeAiSafeActionApproval } from "../../../src/lib/ai/safeActions";

describe("AI safe action approval router", () => {
  it("routes approval-required drafts through the existing ledger contract", () => {
    expect(routeAiSafeActionApproval("procurement_purchase_draft")).toMatchObject({
      required: true,
      approvalType: "director_approval",
      ledgerRequired: true,
      canBypass: false,
    });
    expect(getAiSafeActionExistingApprovalLedgerContract()).toMatchObject({
      submitEndpoint: "POST /agent/action/submit-for-approval",
      finalExecution: false,
      directDomainMutation: false,
    });
  });
});
