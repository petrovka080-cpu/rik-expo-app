import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a formwork contact area real quantity", () => {
  it("uses source-backed formwork rows in m2", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_formwork_form_standard",
      quantity: 20,
      countryCode: "KG",
    });
    const rows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("formwork_contact_area")
    );

    expect(20 * 0.6 * 2).toBe(24);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.unit === "m2" && row.quantity > 0)).toBe(true);
  });
});
