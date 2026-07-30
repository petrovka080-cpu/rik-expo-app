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
      "m3_h",
      "m3_day",
      "pcs",
      "kg",
      "l",
      "pack",
      "m_drilling_depth",
      "kg_rebar",
    ]));
    expect(normalizeCanonicalProfessionalBoqUnit("linear_meter")).toBe("lm");
    expect(normalizeCanonicalProfessionalBoqUnit("linear_m")).toBe("lm");
    expect(normalizeCanonicalProfessionalBoqUnit("piece")).toBe("pcs");
    expect(normalizeCanonicalProfessionalBoqUnit("liter")).toBe("l");
    expect(normalizeCanonicalProfessionalBoqUnit("ton")).toBe("t");
    expect(normalizeCanonicalProfessionalBoqUnit("package")).toBe("pack");
    expect(normalizeCanonicalProfessionalBoqUnit("\u0443\u043f\u0430\u043a\u043e\u0432\u043a\u0430")).toBe("pack");
    expect(normalizeCanonicalProfessionalBoqUnit("m3/h")).toBe("m3_h");
    expect(normalizeCanonicalProfessionalBoqUnit("\u043c\u00b3/\u0447")).toBe("m3_h");
    expect(normalizeCanonicalProfessionalBoqUnit("m3/day")).toBe("m3_day");
    expect(normalizeCanonicalProfessionalBoqUnit("\u043c\u00b3/\u0441\u0443\u0442")).toBe("m3_day");
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

  it("does not reject valid labor, equipment, and bedding units by keyword alone", () => {
    expect(validateProfessionalBoqUnit({
      unit: "hour",
      rowLabel: "Монтаж фасадного остекления",
      rowKind: "work",
    }).blocking_reasons).not.toContain("GLAZING_WRONG_UNIT");
    expect(validateProfessionalBoqUnit({
      unit: "shift",
      rowLabel: "Кран / подъем стеклопакетов",
      rowKind: "equipment",
    }).blocking_reasons).not.toContain("GLAZING_WRONG_UNIT");
    expect(validateProfessionalBoqUnit({
      unit: "m3",
      rowLabel: "Песчаное основание и обсыпка трубы",
      rowKind: "material",
    }).blocking_reasons).not.toContain("LINEAR_SYSTEM_WRONG_UNIT");
  });
});
