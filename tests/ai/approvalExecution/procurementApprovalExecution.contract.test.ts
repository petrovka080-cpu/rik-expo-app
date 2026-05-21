import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("procurement approval execution", () => {
  it("executes 60 GKL purchase only after human approval", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(scenario.blockedWithoutApproval.status).toBe("blocked");
    expect(scenario.executionResult).toMatchObject({ status: "executed", executedByService: "procurement_service" });
    expect(scenario.request.impactDiff.willCreate[0].fieldsRu.map((field) => field.valueRu).join(" ")).toContain("60");
  });
});
