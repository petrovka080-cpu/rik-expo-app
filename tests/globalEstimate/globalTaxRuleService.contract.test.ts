import { resolveGlobalLocaleContext, resolveGlobalTaxRule } from "../../src/lib/ai/globalEstimate";

describe("global tax rule service", () => {
  it("does not calculate US sales tax from country/state alone", () => {
    const stateOnly = resolveGlobalLocaleContext({ text: "Need laminate installation for 1000 sq ft in Texas" });
    const blocked = resolveGlobalTaxRule(stateOnly);
    expect(blocked.rule).toBeUndefined();
    expect(blocked.requiresLocationPrecision).toBe(true);
    expect(blocked.requiredPrecision).toBe("postal_code");

    const zip = resolveGlobalLocaleContext({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    expect(resolveGlobalTaxRule(zip).rule?.taxType).toBe("sales_tax");
  });
});
