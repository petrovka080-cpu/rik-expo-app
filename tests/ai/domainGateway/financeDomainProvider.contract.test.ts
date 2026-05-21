import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("financeDomainProvider", () => {
  it("returns missing-document payments and payment №77 amount", async () => {
    const result = await getDomainGatewayProvider("finance").execute(createDomainGatewayTestQuery("finance"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "payments_missing_docs_count", value: 3 }),
      expect.objectContaining({ key: "payments_missing_docs_sum", value: 245000 }),
      expect.objectContaining({ key: "payment_77_amount", value: 125000 }),
    ]));
    expect(result.missingData).toContain("акт по платежу №77");
  });
});
