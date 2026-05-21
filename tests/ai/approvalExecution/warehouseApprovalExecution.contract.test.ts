import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("warehouse approval execution", () => {
  it("requires warehouse approved service for stock mutations", () => {
    expect(getAiExecutionServiceDefinition("warehouse_discrepancy_confirm")).toMatchObject({
      serviceName: "warehouse_service",
      allowedAfterApprovalOnly: true,
      canBeCalledByAiDirectly: false,
    });
  });
});
