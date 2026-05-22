import { requiresMoreTaxPrecision, resolveGlobalLocalization } from "../../src/lib/ai/globalEstimate";

describe("global localization core", () => {
  it("resolves locale, currency, units, and tax mode without assuming a US state", () => {
    const unknown = resolveGlobalLocalization({ text: "need estimate for flooring" });
    expect(unknown.countryCode).toBe("XX");
    expect(unknown.taxMode).toBe("unknown");
    expect(unknown.confidence).toBe("low");

    const texas = resolveGlobalLocalization({ text: "Need laminate installation for 1000 sq ft in Texas" });
    expect(texas.countryCode).toBe("US");
    expect(texas.stateOrRegion).toBe("TX");
    expect(texas.unitSystem).toBe("imperial");
    expect(requiresMoreTaxPrecision(texas)).toBe(true);
  });
});
