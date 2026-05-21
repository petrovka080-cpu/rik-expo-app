import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("office reminder approval execution", () => {
  it("requires office service and human confirmation", () => {
    expect(getAiExecutionServiceDefinition("office_reminder_send")).toMatchObject({
      serviceName: "office_service",
      allowedAfterApprovalOnly: true,
    });
  });
});
