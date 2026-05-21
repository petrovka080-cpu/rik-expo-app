import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("request124 cross-domain chain", () => {
  it("connects request №124 to work, warehouse and document facts", async () => {
    const bundle = await getDomainGatewayTestBundle();
    const chainText = bundle.crossDomainChain.map((step) => step.stepRu).join("\n");

    expect(chainText).toContain("Заявка №124");
    expect(chainText).toContain("Склад выдал 20");
    expect(chainText).toContain("Недостача по заявке: 60");
  });
});
