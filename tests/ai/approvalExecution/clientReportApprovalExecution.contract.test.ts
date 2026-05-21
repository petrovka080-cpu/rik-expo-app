import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("client report approval execution", () => {
  it("requires client report service", () => {
    expect(getAiExecutionServiceDefinition("client_report_publish")).toMatchObject({
      serviceName: "client_report_service",
      requiresIdempotencyKey: true,
    });
  });
});
