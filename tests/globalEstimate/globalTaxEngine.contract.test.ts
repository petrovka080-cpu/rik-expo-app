import { calculateGlobalConstructionEstimate } from "../../src/lib/ai/globalEstimate";

describe("global tax engine", () => {
  it("calculates configured VAT/GST only through backend tax rules", async () => {
    const de = await calculateGlobalConstructionEstimate({ text: "Laminat verlegen 50 Quadratmeter in Deutschland" });
    expect(de.tax.taxType).toBe("vat");
    expect(de.tax.included).toBe(true);
    expect(de.sources.some((source) => /VAT|tax/i.test(source.label))).toBe(true);

    const sg = await calculateGlobalConstructionEstimate({ text: "Drywall installation 500 sq ft in Singapore" });
    expect(sg.tax.taxType).toBe("gst");
    expect(sg.tax.taxAmount).toBeGreaterThan(0);
  });
});
