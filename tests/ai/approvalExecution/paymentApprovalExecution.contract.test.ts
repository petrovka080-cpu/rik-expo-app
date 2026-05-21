import { createPaymentApprovalScenario } from "./approvalExecutionTestFixtures";

describe("payment approval execution", () => {
  it("blocks payment execution while required docs/review are missing", () => {
    const scenario = createPaymentApprovalScenario();
    expect(scenario.request.actionKind).toBe("payment_prepare_or_post");
    expect(scenario.executionResult?.status).not.toBe("executed");
  });
});
