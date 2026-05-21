import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval audit trail", () => {
  it("contains request, decision and execution ledger events", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.ledger.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["approval_requested", "approval_approved", "execution_started", "execution_completed"]),
    );
  });
});
