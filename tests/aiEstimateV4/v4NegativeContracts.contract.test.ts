import { listProfessionalWorkPassportTemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildProfessionalWorkPassportV2 } from "../../src/lib/estimate/buildProfessionalWorkPassportV2";
import { CANONICAL_PROFESSIONAL_BOQ_UNITS } from "../../src/lib/estimate/canonicalUnits";
import {
  adaptProfessionalWorkPassportV2ToV4,
  canonicalEngineeringUnitIdV4,
  convertEngineeringUnitV4,
  ENGINEERING_UNIT_REGISTRY_V4,
  validateCategoryUnitV4,
  validateEngineeringUnitRegistryV4,
  validateFormulaDimensionsV4,
  validateProfessionalEstimatePassportV4,
} from "../../src/lib/estimate/v4";

describe("V4 negative contracts", () => {
  test("unit registry rejects incompatible conversions, duplicates and unknown units", () => {
    expect(convertEngineeringUnitV4(1, "m", "kg")).toBeNull();
    expect(canonicalEngineeringUnitIdV4("unknown_professional_unit")).toBeNull();
    const duplicate = { ...ENGINEERING_UNIT_REGISTRY_V4[0] };
    const validation = validateEngineeringUnitRegistryV4([...ENGINEERING_UNIT_REGISTRY_V4, duplicate]);
    expect(validation.ok).toBe(false);
    expect(validation.duplicate_unit_ids).toContain(duplicate.unit_id);
    expect(validateEngineeringUnitRegistryV4().ok).toBe(true);
  });

  test("V4 registry is an explicit superset bridge for every legacy canonical unit", () => {
    expect(CANONICAL_PROFESSIONAL_BOQ_UNITS.filter((unit) => !canonicalEngineeringUnitIdV4(unit))).toEqual([]);
  });

  test("category-unit validation rejects semantic and dimensional category errors", () => {
    expect(validateCategoryUnitV4({ category: "material", unit_id: "m2", professional_name_ru: "Геодезическая разбивка" }).ok).toBe(false);
    expect(validateCategoryUnitV4({ category: "labor", unit_id: "m2" }).ok).toBe(false);
    expect(validateCategoryUnitV4({ category: "machinery", unit_id: "m3" }).ok).toBe(false);
    expect(validateCategoryUnitV4({ category: "documentation", unit_id: "t" }).ok).toBe(false);
  });

  test("formula validator rejects dimensional errors and pseudo-formulas", () => {
    expect(validateFormulaDimensionsV4({
      expression: "length_m * width_m",
      input_unit_ids: { length_m: "m", width_m: "m" },
      output_unit_id: "m3",
    }).blockers).toContain("FORMULA_DIMENSION_MISMATCH");
    expect(validateFormulaDimensionsV4({
      expression: "area_m2 * thickness_m",
      input_unit_ids: { area_m2: "m2", thickness_m: "m" },
      output_unit_id: "t",
    }).blockers).toContain("FORMULA_DIMENSION_MISMATCH");
    expect(validateFormulaDimensionsV4({
      expression: "pipe length by area",
      input_unit_ids: {},
      output_unit_id: "m",
    }).blockers).toContain("FORMULA_INPUT_DIMENSION_UNKNOWN");
    expect(validateFormulaDimensionsV4({
      expression: "q * normFactor",
      input_unit_ids: { q: "m2", normFactor: null },
      output_unit_id: "m2",
    }).blockers).toEqual(expect.arrayContaining(["PARAMETER_UNIT_MISSING", "FORMULA_INPUT_DIMENSION_UNKNOWN"]));
    expect(validateFormulaDimensionsV4({
      expression: "area_m2 * unknown_depth",
      input_unit_ids: { area_m2: "m2", unknown_depth: "unknown_unit" },
      output_unit_id: "m3",
    }).blockers).toEqual(expect.arrayContaining(["PARAMETER_UNIT_NOT_ALLOWED", "FORMULA_INPUT_DIMENSION_UNKNOWN"]));
  });

  test("passport validator rejects internal labels, padding, formula-free rows and missing owner", () => {
    const v2 = buildProfessionalWorkPassportV2(listProfessionalWorkPassportTemplateIds()[0]);
    const internalName = adaptProfessionalWorkPassportV2ToV4(v2!);
    internalName.identity.professional_name_ru = "asphalt_concrete_pavement";
    expect(validateProfessionalEstimatePassportV4(internalName).blockers).toContain("INTERNAL_WORK_SLUG_EXPOSED");

    const levelLabel = adaptProfessionalWorkPassportV2ToV4(v2!);
    levelLabel.identity.professional_name_ru = "PRELIMINARY_BOQ";
    expect(validateProfessionalEstimatePassportV4(levelLabel).blockers).toContain("INTERNAL_ESTIMATE_LEVEL_EXPOSED");

    const padding = adaptProfessionalWorkPassportV2ToV4(v2!);
    padding.boq_rows[0].professional_name_ru = "Резерв профессионального добора";
    expect(validateProfessionalEstimatePassportV4(padding).blockers).toContain(`PADDING_ROW:${padding.boq_rows[0].row_id}`);

    const formulaFree = adaptProfessionalWorkPassportV2ToV4(v2!);
    formulaFree.boq_rows[0].formula_id = null;
    expect(validateProfessionalEstimatePassportV4(formulaFree).blockers).toContain(`FORMULA_FREE_QUANTITY:${formulaFree.boq_rows[0].row_id}`);

    const missingOwner = adaptProfessionalWorkPassportV2ToV4(v2!);
    missingOwner.parameter_schema.owner_work_id = "";
    expect(validateProfessionalEstimatePassportV4(missingOwner).blockers).toEqual(expect.arrayContaining([
      "MISSING_WORK_SPECIFIC_OWNER",
      "PARAMETER_SCHEMA_WORK_OWNER_MISMATCH",
    ]));
  });
});
