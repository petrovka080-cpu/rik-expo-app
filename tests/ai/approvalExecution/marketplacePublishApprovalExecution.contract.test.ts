import { getAiExecutionServiceDefinition } from "../../../src/lib/ai/approvalExecutionBoundary";

describe("marketplace publish approval execution", () => {
  it("requires marketplace moderation service", () => {
    expect(getAiExecutionServiceDefinition("marketplace_product_publish")).toMatchObject({
      serviceName: "marketplace_service",
      requiresLedgerEntry: true,
    });
  });
});
