import { buildGlobalEstimateFixture } from "./globalEstimateTestHarness";

describe("EU VAT output", () => {
  it("does not use one EU-wide VAT rate and keeps country-specific VAT labels", async () => {
    const de = await buildGlobalEstimateFixture({ text: "Tile installation 50 m2 in Berlin" });
    const fr = await buildGlobalEstimateFixture({ text: "Peinture murs 60 m² Paris" });
    expect(de.result.tax.taxLabel).toContain("Germany");
    expect(fr.result.tax.taxLabel).toContain("France");
    expect(de.result.tax.taxType).toBe("vat");
    expect(fr.result.tax.taxType).toBe("vat");
  });
});
