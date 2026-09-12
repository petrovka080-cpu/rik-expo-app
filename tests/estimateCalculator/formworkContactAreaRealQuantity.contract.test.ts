import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("wave2a formwork contact area real quantity", () => {
  it("keeps contact-area geometry but rejects the unsupported m2-per-m3 seed", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "concrete_foundation_interior_formwork_form_standard",
      quantity: 20,
      countryCode: "KG",
    });
    const rows = compiled.rows.filter((row) =>
      isProfessionalNormPackSourceId(row.normSourceId) &&
      row.normSourceId.includes("formwork_rics_nrm2")
    );

    expect(20 * 0.6 * 2).toBe(24);
    expect(rows).toEqual([]);
    expect(compiled.rows.some((row) => row.normSourceId.includes("formwork_contact_area_m2_m3"))).toBe(false);
  });
});
