import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval idempotency", () => {
  it("prevents duplicate execution on repeated click", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.repeatedExecutionResult?.status).toBe("already_executed");
    expect(scenario.guard?.idempotencyPassed).toBe(true);
  });
});
