import { createPurchaseApprovalScenario } from "./approvalExecutionTestFixtures";

describe("ai approval impact diff", () => {
  it("shows what will be created and what AI will not do", () => {
    const { request } = createPurchaseApprovalScenario();
    expect(request.impactDiff.willCreate[0].fieldsRu.some((field) => field.valueRu.includes("60"))).toBe(true);
    expect(request.impactDiff.willNotDo.join("\n")).toContain("AI не выполняет финальное действие");
  });
});
