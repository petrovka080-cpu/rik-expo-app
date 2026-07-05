import { validateProfessionalBoqUnit } from "../../src/lib/estimate/canonicalUnits";
import {
  normalizeEstimateUnit,
  requireKnownEstimateUnit,
} from "../../src/lib/estimate/normalizeEstimateUnits";

describe("unit normalization by family", () => {
  it("normalizes Russian and professional BOQ unit synonyms", () => {
    const cases: [string, string][] = [
      ["linear_meter", "lm"],
      ["\u043c.\u043f.", "lm"],
      ["\u043c\u00b2", "m2"],
      ["\u043c\u00b3", "m3"],
      ["\u043a\u0433", "kg"],
      ["\u0442\u043e\u043d\u043d\u0430", "t"],
      ["\u043b\u0438\u0442\u0440", "l"],
      ["\u0440\u0443\u043b\u043e\u043d", "roll"],
      ["\u043c\u0435\u0448\u043e\u043a", "bag"],
      ["\u0434\u0435\u043d\u044c", "day"],
      ["\u0440\u0435\u0439\u0441", "trip"],
      ["\u0447\u0435\u043b_\u0447\u0430\u0441", "man_hour"],
      ["\u043c\u0430\u0448_\u0447\u0430\u0441", "machine_hour"],
    ];

    for (const [input, canonicalUnit] of cases) {
      expect(normalizeEstimateUnit(input)).toEqual({
        rawUnit: input,
        canonicalUnit,
        known: true,
      });
      expect(requireKnownEstimateUnit(input)).toBe(canonicalUnit);
    }
  });

  it("uses direct norm-source signals when rejecting consumable material rows forced to m2", () => {
    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "generic material",
      rowKind: "material",
      normSourceId: "src_professional_norm_pack_paint_ceresit_ct54_silicate_two_coats_v1",
    }).blocking_reasons).toContain("CONSUMABLE_MATERIAL_WRONG_M2_UNIT");

    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "generic material",
      rowKind: "material",
      normSourceId: "src_professional_norm_pack_primer_ceresit_ct17_deep_primer_v1",
    }).blocking_reasons).toContain("CONSUMABLE_MATERIAL_WRONG_M2_UNIT");

    expect(validateProfessionalBoqUnit({
      unit: "m2",
      rowLabel: "\u0437\u0430\u0449\u0438\u0442\u043d\u0430\u044f \u043f\u043b\u0435\u043d\u043a\u0430 \u0434\u043b\u044f \u0448\u043f\u0430\u043a\u043b\u0435\u0432\u043a\u0438 \u0441\u0442\u0435\u043d",
      rowKind: "material",
      normSourceId: "src_professional_norm_pack_catalog_paint_material_materials_m2_v1",
    }).blocking_reasons).not.toContain("CONSUMABLE_MATERIAL_WRONG_M2_UNIT");
  });
});
