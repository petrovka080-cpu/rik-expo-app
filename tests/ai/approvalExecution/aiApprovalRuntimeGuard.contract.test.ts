import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval runtime guard", () => {
  it("requires ledger, decision, recheck, boundary and approved service", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.guard).toMatchObject({
      passed: true,
      ledgerEntryFound: true,
      approvalDecisionFound: true,
      requesterDidNotApproveOwnRequest: true,
      preconditionRecheckPassed: true,
      usedExecutionBoundary: true,
      usedApprovedBusinessService: true,
      directDbMutationFound: false,
    });
  });
});
