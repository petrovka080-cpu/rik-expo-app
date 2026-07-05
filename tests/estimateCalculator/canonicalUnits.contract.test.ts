import {
  CANONICAL_PROFESSIONAL_BOQ_UNITS,
  normalizeCanonicalProfessionalBoqUnit,
  validateProfessionalBoqUnit,
} from "../../src/lib/estimate/canonicalUnits";

describe("canonical professional BOQ units", () => {
  it("normalizes supported unit synonyms", () => {
    expect(CANONICAL_PROFESSIONAL_BOQ_UNITS).toEqual(expect.arrayContaining([
      "m",
      "lm",
      "m2",
      "m3",
      "pcs",
      "kg",
      "l",
      "m_drilling_depth",
      "kg_rebar",
    ]));
    expect(normalizeCanonicalProfessionalBoqUnit("linear_meter")).toBe("lm");
    expect(normalizeCanonicalProfessionalBoqUnit("linear_m")).toBe("lm");
    expect(normalizeCanonicalProfessionalBoqUnit("piece")).toBe("pcs");
    expect(normalizeCanonicalProfessionalBoqUnit("liter")).toBe("l");
    expect(normalizeCanonicalProfessionalBoqUnit("ton")).toBe("t");
  });

  it("rejects unknown and semantically wrong units", () => {
    expect(validateProfessionalBoqUnit({ unit: "mystery_unit" }).blocking_reasons).toContain("UNKNOWN_UNIT");
    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "diamond drilling concrete holes",
      rowKind: "work",
    }).blocking_reasons).toContain("DIAMOND_DRILLING_WRONG_M2_UNIT");
    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "rebar A500C",
      rowKind: "material",
    }).blocking_reasons).toContain("REBAR_MATERIAL_WRONG_M2_UNIT");
    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "primer material",
      rowKind: "material",
    }).blocking_reasons).toContain("CONSUMABLE_MATERIAL_WRONG_M2_UNIT");
  });
});
