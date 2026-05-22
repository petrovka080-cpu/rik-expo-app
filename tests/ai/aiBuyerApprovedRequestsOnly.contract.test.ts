import { buildAiDomainGatewayContextBudgetReport } from "../../scripts/e2e/aiDomainGatewayContextBudget.shared";

describe("AI buyer context", () => {
  it("uses approved procurement-facing domains without finance or office leakage", async () => {
    const report = await buildAiDomainGatewayContextBudgetReport();
    const buyer = report.roleFacts.find((snapshot) => snapshot.role === "buyer");

    expect(buyer).toBeDefined();
    expect(buyer?.returned_domains).toEqual(["procurement", "warehouse", "marketplace", "documents"]);
    expect(buyer?.returned_domains).not.toContain("finance");
    expect(buyer?.returned_domains).not.toContain("office");
    expect(report.matrix.buyer_approved_requests_only).toBe(true);
  });
});
