import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("approvalDomainProvider", () => {
  it("returns decision context without performing approval", async () => {
    const result = await getDomainGatewayProvider("approvals").execute(createDomainGatewayTestQuery("approvals"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "director_decisions_count", value: 6 }),
      expect.objectContaining({ key: "payment_risk_sum", value: 125000 }),
    ]));
    expect(result.summaryRu).toContain("AI не approve/reject");
    expect(result.safety.finalSubmit).toBe(false);
  });
});
