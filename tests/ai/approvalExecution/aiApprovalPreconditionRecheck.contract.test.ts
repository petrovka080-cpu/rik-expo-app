import { createPaymentApprovalScenario, createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval precondition recheck", () => {
  it("must pass before execution and resolve human fields", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.guard?.preconditionRecheckPassed).toBe(true);
    expect(scenario.executionResult?.status).toBe("executed");
  });

  it("blocks stale or unresolved payment execution", () => {
    const payment = createPaymentApprovalScenario();
    expect(payment.executionResult?.status).not.toBe("executed");
  });
});
