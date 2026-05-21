import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("contractorDomainProvider", () => {
  it("returns only contractor own-scope facts", async () => {
    const result = await getDomainGatewayProvider("contractors").execute(createDomainGatewayTestQuery("contractors"));
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "contractor_open_works", value: 4 }),
      expect.objectContaining({ key: "contractor_needs_photo", value: 2 }),
      expect.objectContaining({ key: "contractor_needs_act", value: 1 }),
    ]));
    expect(result.summaryRu).toContain("4 открытые работы");
  });
});
