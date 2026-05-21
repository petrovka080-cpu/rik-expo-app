import { composeAiExecutionResultRu } from "../../../src/lib/ai/approvalExecutionBoundary";
import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai execution result", () => {
  it("reports approved service result without duplicate execution", () => {
    const scenario = createPurchaseApprovalScenario();
    expect(composeAiExecutionResultRu(scenario.executionResult!)).toContain("procurement_service");
    expect(composeAiExecutionResultRu(scenario.repeatedExecutionResult!)).toContain("не создал дубликат");
  });
});
