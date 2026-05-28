import { resolveCountryRegionCity, resolveTaxPolicy, validateTaxPolicy } from "../../src/lib/ai/globalLocalContext";

describe("global local tax policy", () => {
  it("returns a warning instead of inventing tax when location is missing", () => {
    const context = resolveCountryRegionCity({ prompt: "смета на фундамент 48 метров" });
    const tax = resolveTaxPolicy(context);

    expect(tax.status).toBe("TAX_UNKNOWN_REGION_REQUIRED");
    expect(tax.warning).toContain("Регион не указан");
    expect(validateTaxPolicy(tax).valid).toBe(true);
  });

  it("requires source/date for included tax status", () => {
    expect(validateTaxPolicy({
      status: "TAX_INCLUDED_WITH_SOURCE",
      label: "VAT",
      sourceId: "tax:de:vat",
    }).failures).toContain("TAX_SOURCE_AND_DATE_REQUIRED");
  });
});
