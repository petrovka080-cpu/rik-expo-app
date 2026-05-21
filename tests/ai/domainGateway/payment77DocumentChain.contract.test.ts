import { getDomainGatewayTestBundle } from "./domainGatewayTestFixtures";

describe("payment77 document chain", () => {
  it("connects payment №77 to invoice PDF and missing act", async () => {
    const bundle = await getDomainGatewayTestBundle();
    const text = JSON.stringify(bundle);

    expect(text).toContain("Платеж №77");
    expect(text).toContain("PDF счета №45");
    expect(text).toContain("акт");
    expect(bundle.mergedNumericFacts).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "payment_77_amount", value: 125000 }),
    ]));
  });
});
