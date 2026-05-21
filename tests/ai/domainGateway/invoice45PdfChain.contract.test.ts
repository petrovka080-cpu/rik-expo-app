import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("invoice45 PDF chain", () => {
  it("returns invoice amount, company, payment and request links", async () => {
    const bundle = await getDomainGatewayTestBundle();
    const text = JSON.stringify(bundle);

    expect(text).toContain("ОсОО");
    expect(text).toContain("СтройМат");
    expect(text).toContain("Заявка №124");
    expect(bundle.mergedNumericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "invoice_45_amount", value: 125000 }),
    ]));
  });
});
