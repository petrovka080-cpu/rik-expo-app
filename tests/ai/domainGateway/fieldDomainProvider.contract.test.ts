import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("fieldDomainProvider", () => {
  it("returns the first-floor GKL work blocker", async () => {
    const result = await getDomainGatewayProvider("field").execute(createDomainGatewayTestQuery("field"));
    expect(result.summaryRu).toContain("Дом 1, этаж 1");
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "gkl_shortage", value: 60 }),
      expect.objectContaining({ key: "needs_photo", value: 2 }),
      expect.objectContaining({ key: "needs_act", value: 1 }),
    ]));
  });
});
