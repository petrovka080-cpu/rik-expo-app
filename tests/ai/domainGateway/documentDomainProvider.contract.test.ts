import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("documentDomainProvider", () => {
  it("returns invoice №45 PDF evidence and missing act", async () => {
    const result = await getDomainGatewayProvider("documents").execute(createDomainGatewayTestQuery("documents"));
    expect(result.summaryRu).toContain("PDF счета №45");
    expect(result.summaryRu).toContain("ОсОО \"СтройМат\"");
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "invoice_45_amount", value: 125000 }),
      expect.objectContaining({ key: "payment_77_amount", value: 125000 }),
    ]));
    expect(result.missingData).toContain("акт по счету №45");
  });
});
