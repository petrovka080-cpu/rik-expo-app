import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("marketplaceDomainProvider", () => {
  it("checks internal marketplace and supplier history before external web", async () => {
    const result = await getDomainGatewayProvider("marketplace").execute(createDomainGatewayTestQuery("marketplace"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "internal_marketplace_options", value: 2 }),
      expect.objectContaining({ key: "supplier_history_options", value: 1 }),
    ]));
    expect(result.checkedSources.map((source) => source.sourceRu)).toEqual([
      "internal marketplace",
      "supplier history",
    ]);
  });
});
