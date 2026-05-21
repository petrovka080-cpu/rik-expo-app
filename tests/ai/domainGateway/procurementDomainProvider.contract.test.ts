import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("procurementDomainProvider", () => {
  it("returns request №124 with May request counts and source refs", async () => {
    const result = await getDomainGatewayProvider("procurement").execute(createDomainGatewayTestQuery("procurement"));
    expect(result.status).toBe("found");
    expect(result.summaryRu).toContain("14 заявок");
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "may_2026_requests_total", value: 14 }),
      expect.objectContaining({ key: "request_124_required_gkl", value: 80 }),
    ]));
    expect(result.openLinks.some((link) => link.labelRu === "Заявка №124")).toBe(true);
  });
});
