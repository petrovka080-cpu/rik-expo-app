import { createDomainGatewayTestQuery, getDomainGatewayProvider } from "./domainGatewayTestFixtures";

describe("clientDomainProvider", () => {
  it("returns client-visible progress without finance details", async () => {
    const result = await getDomainGatewayProvider("client").execute(createDomainGatewayTestQuery("client"));
    expect(result.summaryRu).toContain("без раскрытия внутренних финансов");
    expect(result.numericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "client_completed_tasks", value: 5 }),
      expect.objectContaining({ key: "client_delayed_tasks", value: 2 }),
    ]));
  });
});
