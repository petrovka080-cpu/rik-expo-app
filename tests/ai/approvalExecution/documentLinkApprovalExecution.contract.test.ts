import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("document link approval execution", () => {
  it("requires document service review for final link", () => {
    expect(getAiExecutionServiceDefinition("document_final_link")).toMatchObject({
      serviceName: "document_service",
      allowedAfterApprovalOnly: true,
    });
  });
});
