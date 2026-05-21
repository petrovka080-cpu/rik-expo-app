import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("mediaDomainProvider", () => {
  it("returns media as review-required evidence suggestions", async () => {
    const result = await getDomainGatewayProvider("media").execute(createDomainGatewayTestQuery("media"));
    expect(result.summaryRu).toContain("доказательства-кандидаты");
    expect(result.facts[0]).toMatchObject({ status: "draft" });
    expect(result.safety.changedData).toBe(false);
  });
});
