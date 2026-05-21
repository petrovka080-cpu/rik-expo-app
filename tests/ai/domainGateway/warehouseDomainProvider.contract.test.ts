import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("warehouseDomainProvider", () => {
  it("traces GKL issue, remaining stock and shortage", async () => {
    const result = await getDomainGatewayProvider("warehouse").execute(createDomainGatewayTestQuery("warehouse"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "gkl_required", value: 80 }),
      expect.objectContaining({ key: "gkl_issued", value: 20 }),
      expect.objectContaining({ key: "gkl_remaining", value: 0 }),
      expect.objectContaining({ key: "gkl_shortage", value: 60 }),
    ]));
    expect(result.summaryRu).toContain("недостача 60");
  });
});
