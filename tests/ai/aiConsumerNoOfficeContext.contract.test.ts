import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI consumer context isolation", () => {
  it("does not include Office or internal company domains in consumer context", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const consumer = report.roleFacts.find((snapshot) => snapshot.role === "consumer");

    expect(consumer).toBeDefined();
    expect(consumer?.allowed_domains).toEqual(["consumer_repair", "marketplace"]);
    expect(consumer?.returned_domains).toEqual(["consumer_repair", "marketplace"]);
    expect(report.matrix.consumer_office_context_found).toBe(false);
  });
});
